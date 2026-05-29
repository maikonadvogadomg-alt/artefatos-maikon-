/**
 * SK Jurídico v1.6.0 — Modo Colaborativo
 * Múltiplos advogados editam o mesmo documento em tempo real via SSE + REST.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TipTapEditor } from "@/components/tiptap-editor";
import {
  ArrowLeft, Users, Plus, Copy, Wifi, WifiOff, Clock,
  UserPlus, LogOut, RefreshCw, Share2, Loader2
} from "lucide-react";

const API = "/api";

interface Room { id: string; name: string; version: number; userCount: number; updatedAt: string; }
interface CollabUser { id: string; name: string; color: string; }

export default function ColaborativoPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const editorRef = useRef<any>(null);

  // Estado de salas
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Estado de sessão colaborativa
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState(() => localStorage.getItem("sk-collab-name") || "Advogado");
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([]);
  const [docContent, setDocContent] = useState("");
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState(0);
  const [joining, setJoining] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // ── Carregar salas ──────────────────────────────────────────────────────────

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${API}/collab/rooms`);
      if (res.ok) setRooms(await res.json());
    } catch {}
    setLoadingRooms(false);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // ── Criar sala ──────────────────────────────────────────────────────────────

  async function createRoom() {
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(`${API}/collab/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (res.ok) {
        const room = await res.json();
        toast({ title: "Sala criada!", description: `ID: ${room.id}` });
        setNewRoomName("");
        loadRooms();
        joinRoom(room.id, room.name);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível criar a sala.", variant: "destructive" });
    }
  }

  // ── Entrar na sala ──────────────────────────────────────────────────────────

  async function joinRoom(roomId: string, roomName: string) {
    if (myUserId) leaveRoom();
    setJoining(true);
    try {
      const res = await fetch(`${API}/collab/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName }),
      });
      if (!res.ok) throw new Error("Falha ao entrar na sala");
      const data = await res.json();

      setMyUserId(data.userId);
      setDocContent(data.doc || "");
      setVersion(data.version);
      setCurrentRoom({ id: roomId, name: roomName, version: data.version, userCount: 1, updatedAt: new Date().toISOString() });
      localStorage.setItem("sk-collab-name", myName);

      // Conecta SSE
      connectSSE(roomId, data.userId);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setJoining(false);
  }

  function connectSSE(roomId: string, userId: string) {
    if (sseRef.current) sseRef.current.close();

    const sse = new EventSource(`${API}/collab/rooms/${roomId}/events?userId=${userId}`);
    sseRef.current = sse;

    sse.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      setActiveUsers(data.users || []);
      setConnected(true);
    });

    sse.addEventListener("doc-updated", (e) => {
      const data = JSON.parse(e.data);
      setVersion(data.version);
      isRemoteUpdateRef.current = true;
      setDocContent(data.html);
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
    });

    sse.addEventListener("user-joined", (e) => {
      const data = JSON.parse(e.data);
      setActiveUsers(prev => {
        if (prev.find(u => u.id === data.userId)) return prev;
        return [...prev, { id: data.userId, name: data.userName, color: data.color }];
      });
      toast({ title: `${data.userName} entrou na sala`, duration: 2000 });
    });

    sse.addEventListener("user-left", (e) => {
      const data = JSON.parse(e.data);
      setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
      toast({ title: `${data.userName} saiu da sala`, duration: 2000 });
    });

    sse.onerror = () => setConnected(false);
    sse.onopen = () => setConnected(true);
  }

  // ── Sair da sala ────────────────────────────────────────────────────────────

  function leaveRoom() {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    if (currentRoom && myUserId) {
      fetch(`${API}/collab/rooms/${currentRoom.id}/leave`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myUserId }),
      }).catch(() => {});
    }
    setCurrentRoom(null);
    setMyUserId(null);
    setActiveUsers([]);
    setDocContent("");
    setConnected(false);
    loadRooms();
  }

  // ── Enviar atualização do documento ─────────────────────────────────────────

  function handleDocChange(html: string) {
    if (isRemoteUpdateRef.current) return;
    setDocContent(html);

    if (updateTimeout.current !== null) clearTimeout(updateTimeout.current);
    updateTimeout.current = setTimeout(async () => {
      if (!currentRoom || !myUserId) return;
      try {
        await fetch(`${API}/collab/rooms/${currentRoom.id}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: myUserId, html }),
        });
      } catch {}
    }, 500);
  }

  // ── Copiar link da sala ──────────────────────────────────────────────────────

  function copiarLinkSala() {
    if (!currentRoom) return;
    const url = `${window.location.origin}/colaborativo?sala=${currentRoom.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "Compartilhe com outros advogados." });
  }

  function copiarIdSala() {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id);
    toast({ title: "ID copiado!", description: currentRoom.id });
  }

  // ── Entrar por ID ────────────────────────────────────────────────────────────

  const [joinId, setJoinId] = useState("");

  async function joinById() {
    if (!joinId.trim()) return;
    try {
      const res = await fetch(`${API}/collab/rooms/${joinId.trim()}`);
      if (!res.ok) throw new Error("Sala não encontrada");
      const room = await res.json();
      joinRoom(room.id, room.name);
      setJoinId("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  }

  // Entrar pela URL se veio com ?sala=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaId = params.get("sala");
    if (salaId && !currentRoom) {
      fetch(`${API}/collab/rooms/${salaId}`)
        .then(r => r.ok ? r.json() : null)
        .then(r => { if (r) joinRoom(r.id, r.name); })
        .catch(() => {});
    }
  }, []);

  // ── UI ───────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 bg-card">
        <Button variant="ghost" size="icon" onClick={() => currentRoom ? leaveRoom() : setLocation("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Modo Colaborativo
            {currentRoom && <span className="text-muted-foreground font-normal">— {currentRoom.name}</span>}
          </h1>
          {currentRoom && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-xs text-muted-foreground">
                {connected ? "Conectado" : "Reconectando..."}
              </span>
              <span className="text-xs text-muted-foreground">· v{version}</span>
            </div>
          )}
        </div>
        {currentRoom && (
          <div className="flex items-center gap-2">
            {/* Avatares dos usuários ativos */}
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 5).map(u => (
                <div
                  key={u.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-card"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {activeUsers.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-card">
                  +{activeUsers.length - 5}
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copiarLinkSala}>
              <Share2 className="h-3 w-3" /> Compartilhar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-400 border-red-700" onClick={leaveRoom}>
              <LogOut className="h-3 w-3" /> Sair
            </Button>
          </div>
        )}
      </header>

      {!currentRoom ? (
        /* ── Tela de entrada ── */
        <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
          {/* Nome do usuário */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Seu nome na sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={myName}
                  onChange={e => setMyName(e.target.value)}
                  placeholder="Dr. João Silva"
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={() => localStorage.setItem("sk-collab-name", myName)}>
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Criar nova sala */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova sala colaborativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="Ex: Peça cível — Cliente ABC"
                  onKeyDown={e => e.key === "Enter" && createRoom()}
                />
                <Button onClick={createRoom} disabled={!newRoomName.trim()}>
                  Criar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Entrar por ID */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Entrar em sala existente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={joinId}
                  onChange={e => setJoinId(e.target.value)}
                  placeholder="ID da sala (ex: a1b2c3d4)"
                  onKeyDown={e => e.key === "Enter" && joinById()}
                />
                <Button onClick={joinById} disabled={!joinId.trim() || joining}>
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de salas ativas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Salas ativas</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadRooms}>
                <RefreshCw className={`h-3 w-3 ${loadingRooms ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma sala ativa. Crie uma acima.
                </p>
              ) : (
                <div className="space-y-2">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{room.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] h-4">
                            <Users className="h-2.5 w-2.5 mr-1" />{room.userCount} online
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">ID: {room.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => navigator.clipboard.writeText(room.id)}
                          title="Copiar ID"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => joinRoom(room.id, room.name)}
                          disabled={joining}
                        >
                          {joining ? <Loader2 className="h-3 w-3 animate-spin" /> : "Entrar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── Editor colaborativo ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de colaboradores */}
          <div className="border-b border-border px-4 py-2 bg-card flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>{activeUsers.length} editor{activeUsers.length !== 1 ? "es" : ""} online</span>
            </div>
            <div className="flex items-center gap-2">
              {activeUsers.map(u => (
                <span key={u.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
                  {u.name}
                </span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Salvo automaticamente · versão {version}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copiarIdSala} title="Copiar ID da sala">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* TipTap Editor */}
          <div className="flex-1 overflow-auto p-4">
            <TipTapEditor
              content={docContent}
              onChange={handleDocChange}
              onReady={(editor) => { editorRef.current = editor; }}
              className="min-h-[calc(100vh-200px)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
