import { useState, useRef, useEffect, useCallback } from "react";
import { getStorageItem, setStorageItem, SK } from "@/lib/storage";
import { speechSvc, speakText, stopSpeaking } from "@/lib/speech";
import { callAI } from "@/lib/aiDirect";
import { db } from "@/lib/localDB";
import { useToast } from "@/hooks/use-toast";
import ComunicacoesProcessuais from "./ComunicacoesProcessuais";
import ExtractorJuridico from "./ExtractorJuridico";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMsg { role: "user" | "ai"; content: string; mode?: string; ts: number; }
interface CustomMode { id: string; label: string; prompt: string; icon: string; }
interface Session { id: string; name: string; messages: ChatMsg[]; created: number; }

// ─── LegalText renderer (formatação ABNT forense brasileira) ─────────────────
function LegalText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: "13.5px", lineHeight: "2", color: "#e5e7eb" }}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const lines = trimmed.split("\n");
        const isSingleLine = lines.length === 1;
        const isTitle = isSingleLine && trimmed === trimmed.toUpperCase() && trimmed.length > 2
          && /[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ]/.test(trimmed) && !/^\d+\./.test(trimmed);
        const isListItem = /^\d+[.)]\s/.test(trimmed) || /^[a-z]\)/.test(trimmed) || /^[-–]\s/.test(trimmed) || /^[IVX]+[–-]\s/.test(trimmed);
        const isQuote = (trimmed.startsWith('"') || trimmed.startsWith('\u201c')) && trimmed.length > 60;
        const renderLines = (arr: string[]) => arr.map((l, j) => j === 0 ? l : <span key={j}><br />{l}</span>);
        if (isTitle)    return <p key={i} style={{ textAlign: "center", fontWeight: "bold", margin: "10px 0 4px", textIndent: "0", textTransform: "uppercase", fontSize: "13.5px" }}>{trimmed}</p>;
        if (isListItem) return <p key={i} style={{ textAlign: "justify", margin: "2px 0", paddingLeft: "1.5cm", textIndent: "0" }}>{renderLines(lines)}</p>;
        if (isQuote)    return <p key={i} style={{ textAlign: "justify", margin: "4px 0", paddingLeft: "4cm", fontSize: "12px", fontStyle: "italic" }}>{renderLines(lines)}</p>;
        return <p key={i} style={{ textIndent: "3cm", textAlign: "justify", margin: "0" }}>{renderLines(lines)}</p>;
      })}
    </div>
  );
}

// ─── Effort labels ────────────────────────────────────────────────────────────
const EFFORT_LABELS: Record<number, { label: string; color: string; tokens: number }> = {
  1: { label: "Rápido",    color: "#60a5fa", tokens: 1024 },
  2: { label: "Básico",    color: "#34d399", tokens: 2048 },
  3: { label: "Detalhado", color: "#fbbf24", tokens: 4096 },
  4: { label: "Profundo",  color: "#f97316", tokens: 6144 },
  5: { label: "Exaustivo", color: "#a78bfa", tokens: 8192 },
};

// ─── Top tabs ────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: "tramitacao", label: "Tramitação", icon: "⚙" },
  { id: "codigos", label: "Códigos", icon: "</>" },
  { id: "filtrador", label: "Filtrador", icon: "⚗" },
  { id: "previdenciario", label: "Previdenciário", icon: "📋" },
  { id: "templates", label: "Templates", icon: "📄" },
  { id: "colaborar", label: "Colaborar", icon: "👥" },
  { id: "livre", label: "Livre", icon: "📖" },
  { id: "atualizar", label: "Atualizar", icon: "🔄" },
  { id: "pdpj", label: "PDPJ", icon: "⚖" },
  { id: "comunicacoes", label: "Comunicações", icon: "📨" },
  { id: "playground", label: "Extrator", icon: "🔍" },
];

// ─── 3 modos principais (destaque) ───────────────────────────────────────────
const MODOS_PRINCIPAIS = [
  { id: "corrigir",  label: "✓ Corrigir Texto",   desc: "Corrige gramática e estilo forense",  color: "#1e3a5f", border: "#3b82f6" },
  { id: "redacao",   label: "✨ Redação Jurídica", desc: "Reescreve em linguagem formal TJMG",  color: "#2d1b4e", border: "#8b5cf6" },
  { id: "lacunas",   label: "🔍 Verificar Lacunas",desc: "Identifica riscos e pontos faltantes", color: "#1f2d1a", border: "#4a5c2f" },
];

// ─── Ações secundárias ────────────────────────────────────────────────────────
const ACOES = [
  { id: "resumir",          label: "📄 Resumir" },
  { id: "revisar",          label: "✓ Revisar" },
  { id: "refinar",          label: "✨ Refinar" },
  { id: "gerar_minuta",     label: "🔨 Minuta" },
  { id: "analisar",         label: "🔍 Analisar" },
  { id: "precedentes",      label: "⚖ Precedentes" },
  { id: "linguagem_simples",label: "📖 Simplificar" },
  { id: "chat",             label: "💬 Chat Livre" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function Assistente() {
  const { toast } = useToast();

  // UI state
  const [activeTab, setActiveTab] = useState("tramitacao");
  const [activeSubTab, setActiveSubTab] = useState("pro");
  const [showFerramentas, setShowFerramentas] = useState(false);
  const [showTTS, setShowTTS] = useState(false);
  const [showNewMode, setShowNewMode] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  // Text state
  const [inputText, setInputText] = useState("");
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [effortLevel, setEffortLevel] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("aj_effort") || "3", 10) || 3; } catch { return 3; }
  });

  // Chat history
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>(() =>
    getStorageItem<ChatMsg[]>(SK.CHAT, [])
  );
  const [sessions, setSessions] = useState<Session[]>(() =>
    getStorageItem<Session[]>(SK.SESSIONS, [])
  );
  const [sessionCount, setSessionCount] = useState(0);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => getStorageItem(SK.VOICE, false));
  const [ttsSpeed, setTtsSpeed] = useState(() => getStorageItem(SK.TTS_SPEED, 1.0));
  const [ttsPitch, setTtsPitch] = useState(() => getStorageItem(SK.TTS_PITCH, 1.0));

  // Custom modes
  const [customModes, setCustomModes] = useState<CustomMode[]>(() =>
    getStorageItem<CustomMode[]>(SK.CUSTOM_MODES, [])
  );
  const [newModeLabel, setNewModeLabel] = useState("");
  const [newModePrompt, setNewModePrompt] = useState("");

  // Chat mode extras
  const [chatInput, setChatInput] = useState("");
  const [extractUrl, setExtractUrl] = useState("");
  const [showUrlExtractor, setShowUrlExtractor] = useState(false);

  // Extractor panel (left column)
  const [showExtractor, setShowExtractor] = useState(false);
  const [extractorUrl, setExtractorUrl] = useState("");
  const [extractorLoading, setExtractorLoading] = useState(false);
  const [extractorError, setExtractorError] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const ferramentasRef = useRef<HTMLDivElement>(null);

  const isChatMode = activeMode === "chat" || (chatHistory.length > 0 && activeTab === "livre");

  // Persist chat
  useEffect(() => {
    setStorageItem(SK.CHAT, chatHistory);
    setSessionCount(chatHistory.length);
  }, [chatHistory]);

  // Persist voice prefs
  useEffect(() => { setStorageItem(SK.VOICE, voiceEnabled); }, [voiceEnabled]);
  useEffect(() => { setStorageItem(SK.TTS_SPEED, ttsSpeed); }, [ttsSpeed]);
  useEffect(() => { setStorageItem(SK.TTS_PITCH, ttsPitch); }, [ttsPitch]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Close ferramentas on outside click OR touch (Android fix)
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ferramentasRef.current && !ferramentasRef.current.contains(e.target as Node)) {
        setShowFerramentas(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const getConfig = () => {
    const model = (() => { try { const raw = localStorage.getItem(SK.MODEL); const v = raw ? JSON.parse(raw) as string : "gpt-4o"; return v === "demo" ? "gpt-4o" : v; } catch { return "gpt-4o"; } })();
    const isPerplexity = model.startsWith("sonar") || model.startsWith("llama") || model.startsWith("mixtral");
    const isGemini = model.startsWith("gemini");
    let apiKey = getStorageItem(SK.API_KEY, "");
    if (isPerplexity) {
      const pplxKey = localStorage.getItem("sk_perplexity_key") || "";
      if (pplxKey.trim()) apiKey = pplxKey.trim();
    } else if (isGemini) {
      const geminiKey = localStorage.getItem("sk_gemini_key") || getStorageItem(SK.API_KEY, "");
      if (geminiKey.trim()) apiKey = geminiKey.trim();
    }
    return { apiKey, model };
  };

  const addToChat = (role: "user" | "ai", content: string, mode?: string) => {
    setChatHistory(prev => [...prev, { role, content, mode, ts: Date.now() }]);
  };

  const handleProcess = useCallback(async (mode: string) => {
    const text = mode === "chat" ? chatInput || inputText : inputText;
    if (!text.trim()) {
      toast({ title: "⚠ Atenção", description: "Insira um texto para processar.", variant: "destructive" });
      return;
    }
    const { apiKey, model } = getConfig();
    const customMode = customModes.find(m => m.id === mode);
    setActiveMode(mode);
    setIsProcessing(true);

    if (mode === "chat") {
      addToChat("user", text);
      setChatInput("");
    }

    try {
      const result = await callAI(text, mode, apiKey, model, customMode?.prompt ?? null);
      addToChat("ai", result, mode);
      if (voiceEnabled) speakText(result, ttsSpeed, ttsPitch);
    } catch (err: any) {
      toast({ title: "Erro ao processar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      if (mode !== "chat") setActiveMode(null);
    }
  }, [inputText, chatInput, voiceEnabled, ttsSpeed, ttsPitch, customModes]);

  const handleVoiceToggle = () => {
    if (isListening) {
      speechSvc.stop();
      setIsListening(false);
    } else {
      speechSvc.start(
        (text, isFinal) => { if (isFinal) setInputText(prev => prev + (prev ? " " : "") + text); },
        (msg) => { toast({ title: "Microfone", description: msg, variant: "destructive" }); setIsListening(false); }
      );
      setIsListening(true);
    }
  };

  const handleSaveDoc = () => {
    const last = chatHistory.filter(m => m.role === "ai").pop();
    if (!last) { toast({ title: "Nada para salvar", variant: "destructive" }); return; }
    db.documentos.create({
      titulo: `Doc IA – ${new Date().toLocaleString("pt-BR")}`,
      tipo: last.mode || "ia",
      conteudo: last.content,
    });
    toast({ title: "✓ Salvo", description: "Documento salvo localmente." });
  };

  const handleDownload = () => {
    const last = chatHistory.filter(m => m.role === "ai").pop();
    if (!last) return;
    const blob = new Blob([last.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resultado_${Date.now()}.txt`;
    a.click();
  };

  const handleSaveSession = () => {
    const sess: Session = { id: crypto.randomUUID(), name: `Sessão ${sessions.length + 1}`, messages: [...chatHistory], created: Date.now() };
    const next = [...sessions, sess];
    setSessions(next);
    setStorageItem(SK.SESSIONS, next);
    toast({ title: "✓ Sessão salva" });
  };

  const handleExtractSite = async () => {
    if (!extractUrl.trim()) return;
    let u = extractUrl.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    toast({ title: "Extraindo site...", description: u });
    const proxies = [
      (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];
    let html = "";
    for (let i = 0; i < proxies.length; i++) {
      try {
        const r = await fetch(proxies[i](u), { signal: AbortSignal.timeout(14000) });
        if (!r.ok) continue;
        let d: any;
        try { d = await r.json(); } catch { html = await r.text(); break; }
        const h = d.contents ?? d.data ?? d;
        if (typeof h === "string" && h.length > 80) { html = h; break; }
      } catch {}
    }
    if (html) {
      setInputText(html.slice(0, 8000));
      toast({ title: "✓ Conteúdo extraído", description: "Texto carregado no campo acima." });
    } else {
      toast({ title: "Erro ao extrair", description: "Verifique a URL ou tente outra.", variant: "destructive" });
    }
    setShowUrlExtractor(false);
    setExtractUrl("");
  };

  const handleAddCustomMode = () => {
    if (!newModeLabel.trim() || !newModePrompt.trim()) return;
    const mode: CustomMode = { id: `custom_${Date.now()}`, label: newModeLabel, prompt: newModePrompt, icon: "⚡" };
    const next = [...customModes, mode];
    setCustomModes(next);
    setStorageItem(SK.CUSTOM_MODES, next);
    setNewModeLabel("");
    setNewModePrompt("");
    setShowNewMode(false);
    toast({ title: "✓ Modo criado" });
  };

  const handleClearAll = () => {
    setChatHistory([]);
    setInputText("");
    setActiveMode(null);
    toast({ title: "✓ Tudo limpo" });
  };

  const handleExtractPanel = async () => {
    let u = extractorUrl.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    setExtractorError("");
    setExtractorLoading(true);
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const r = await fetch(`${base}/api/proxy/extract?url=${encodeURIComponent(u)}`, {
        signal: AbortSignal.timeout(30000),
      });
      const data = await r.json() as { text?: string; error?: string; details?: string[]; chars?: number; proxy?: string };
      if (!r.ok || !data.text) {
        setExtractorError(data.error || "Falha ao extrair conteúdo.");
      } else {
        setInputText(data.text.slice(0, 8000));
        setShowExtractor(false);
        setExtractorUrl("");
        toast({ title: "✓ Texto extraído", description: `${data.chars ?? data.text.length} caracteres via ${data.proxy ?? "proxy"}` });
      }
    } catch (err: unknown) {
      setExtractorError(err instanceof Error ? err.message : "Erro de rede. Tente novamente.");
    } finally {
      setExtractorLoading(false);
    }
  };

  // ─── Special tab views ────────────────────────────────────────────────────
  if (activeTab === "comunicacoes") {
    return <ComunicacoesProcessuais onBack={() => setActiveTab("tramitacao")} />;
  }
  if (activeTab === "playground") {
    return (
      <ExtractorJuridico
        onBack={() => setActiveTab("tramitacao")}
        onSendToAssistente={(text) => {
          setInputText(text);
          setActiveTab("tramitacao");
          setActiveMode("analisar");
        }}
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", background: "#1a1f0f", color: "hsl(55 25% 88%)", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #3a4a24", background: "#1a1f0f", minHeight: 52, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚖</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#7aad3e" }}>Assistente Jurídico</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            style={{ background: "none", border: "none", color: voiceEnabled ? "#22c55e" : "hsl(85 10% 52%)", cursor: "pointer", fontSize: 18, padding: "2px 4px", display: "flex", alignItems: "center" }}
            title={voiceEnabled ? "Voz ativa" : "Voz desligada"}
          >
            {voiceEnabled ? "🔊" : "🔇"}
          </button>
          <span style={{ border: "1.5px solid hsl(45 70% 55%)", color: "hsl(45 70% 65%)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>✨ Pro</span>

          {/* Ferramentas ⋮ */}
          <div ref={ferramentasRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowFerramentas(v => !v)}
              style={{ background: "none", border: "none", color: "hsl(55 25% 75%)", cursor: "pointer", fontSize: 20, padding: "2px 6px", lineHeight: 1 }}
              title="Ferramentas"
            >⋮</button>
            {showFerramentas && (
              <div style={{ position: "absolute", right: 0, top: "110%", background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 10, minWidth: 220, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: "6px 0" }}>
                <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 700, color: "hsl(85 10% 52%)", letterSpacing: 1, textTransform: "uppercase" }}>Ferramentas</div>
                {[
                  { icon: "📄", label: "Modelos de Prompt", action: () => { toast({ title: "Modelos de Prompt", description: "Em breve" }); setShowFerramentas(false); } },
                  { icon: "📋", label: "Templates de Documento", action: () => { toast({ title: "Templates", description: "Em breve" }); setShowFerramentas(false); } },
                  { icon: "📊", label: "Biblioteca / Ementas", action: () => { toast({ title: "Biblioteca", description: "Em breve" }); setShowFerramentas(false); } },
                  { icon: "🕐", label: "Histórico IA", action: () => { setShowSessions(true); setShowFerramentas(false); } },
                  { icon: "📁", label: "Enviar ao Drive", action: () => { toast({ title: "Drive", description: "Conecte sua conta nas Configurações" }); setShowFerramentas(false); } },
                  { icon: "🧮", label: "Calculadora de Tokens", action: () => { const count = Math.round((inputText.length + (chatHistory.map(m => m.content).join("").length)) / 4); toast({ title: `~${count.toLocaleString()} tokens estimados` }); setShowFerramentas(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 16px", background: "none", border: "none", color: "hsl(55 25% 88%)", cursor: "pointer", fontSize: 14, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#2f3a1a")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}
                <div style={{ margin: "4px 0", borderTop: "1px solid #3a4a24" }} />
                <button onClick={() => { handleClearAll(); setShowFerramentas(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 16px", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "hsl(0 30% 14%)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <span>🗑</span> Limpar tudo
                </button>
              </div>
            )}
          </div>

          <button
            style={{ background: "none", border: "none", color: "hsl(55 25% 75%)", cursor: "pointer", fontSize: 18, padding: "2px 4px" }}
            title="Configurações"
            onClick={() => window.location.href = `${import.meta.env.BASE_URL}configuracoes`}
          >☀</button>
        </div>
      </header>

      {/* ── TOP TABS ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 12px 4px", borderBottom: "1px solid #3a4a24", flexShrink: 0, scrollbarWidth: "none" }}>
        {TOP_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 20, border: "1px solid",
              borderColor: activeTab === tab.id ? "#4a5c2f" : "#3a4a24",
              background: activeTab === tab.id ? "rgba(74,92,47,0.2)" : "#252d14",
              color: activeTab === tab.id ? "#9acc55" : "hsl(55 20% 65%)",
              fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── SUB TABS ── */}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px 4px", flexShrink: 0 }}>
        {[
          { id: "pro", label: "⚙ Pro" },
          { id: "arquivo", label: "📤 Arquivo" },
          { id: "audio", label: "📎 Áudio" },
        ].map(st => (
          <button key={st.id} onClick={() => setActiveSubTab(st.id)}
            style={{
              padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
              borderColor: activeSubTab === st.id ? "#4a5c2f" : "#3a4a24",
              background: activeSubTab === st.id ? "rgba(74,92,47,0.2)" : "transparent",
              color: activeSubTab === st.id ? "#9acc55" : "hsl(55 20% 60%)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            {st.label}
          </button>
        ))}
      </div>

      {/* ── MAIN SCROLL AREA ── */}
      <div className="app-main-area">
       {/* ── LEFT COLUMN: input + modes ── */}
       <div className="app-left-col">

        {/* INPUT SECTION */}
        <div style={{ padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "hsl(55 20% 70%)", fontWeight: 500 }}>Entrada de texto:</span>
            <button
              onClick={handleVoiceToggle}
              style={{
                background: isListening ? "#ef4444" : "#4a5c2f", color: "#e8f0d8",
                border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                animation: isListening ? "pulse 1s infinite" : "none",
              }}
            >
              <span>🎤</span>{isListening ? "GRAVANDO..." : "DITAR"}
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onInput={e => setInputText((e.target as HTMLTextAreaElement).value)}
            onPaste={e => {
              const pasted = e.clipboardData?.getData("text") ?? "";
              if (pasted) {
                e.preventDefault();
                const el = e.target as HTMLTextAreaElement;
                const start = el.selectionStart ?? 0;
                const end = el.selectionEnd ?? 0;
                const next = inputText.slice(0, start) + pasted + inputText.slice(end);
                setInputText(next);
                setTimeout(() => { el.selectionStart = el.selectionEnd = start + pasted.length; }, 0);
              }
            }}
            placeholder="Cole aqui o texto do documento, petição, sentença, contrato ou qualquer outro texto jurídico que deseja processar..."
            style={{
              width: "100%", minHeight: 260, maxHeight: 520, resize: "vertical",
              background: "#1e2810", border: "1px solid #3a4a24",
              borderRadius: 10, padding: "12px 14px", color: "hsl(55 25% 88%)",
              fontSize: 14, lineHeight: 1.7, fontFamily: "'Inter', sans-serif",
              boxSizing: "border-box", outline: "none",
            }}
            onFocus={e => { e.target.style.borderColor = "#4a5c2f"; e.target.style.boxShadow = "0 0 0 2px rgba(74,92,47,0.35)"; }}
            onBlur={e => { e.target.style.borderColor = "#3a4a24"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* MODES GRID 1 */}
        <div style={{ padding: "0 12px" }}>
          <div style={{ fontSize: 12, color: "hsl(85 10% 52%)", marginBottom: 6, fontWeight: 500 }}>Modos de operação:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 6 }}>
            {MODES_1.map(m => (
              <ModeBtn key={m.id} icon={m.icon} label={m.label}
                active={activeMode === m.id}
                loading={isProcessing && activeMode === m.id}
                onClick={() => { setActiveMode(m.id); if (m.id !== "chat") handleProcess(m.id); }}
              />
            ))}
          </div>
        </div>

        {/* MODES GRID 2 */}
        <div style={{ padding: "0 12px" }}>
          <div style={{ fontSize: 12, color: "hsl(85 10% 52%)", marginBottom: 6, fontWeight: 500 }}>Outras ações:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 6 }}>
            {MODES_2.map(m => (
              <ModeBtn key={m.id} icon={m.icon} label={m.label}
                active={activeMode === m.id}
                loading={isProcessing && activeMode === m.id}
                onClick={() => { setActiveMode(m.id); handleProcess(m.id); }}
              />
            ))}
            {customModes.map(m => (
              <ModeBtn key={m.id} icon={m.icon} label={m.label}
                active={activeMode === m.id}
                loading={isProcessing && activeMode === m.id}
                onClick={() => { setActiveMode(m.id); handleProcess(m.id); }}
              />
            ))}
          </div>
          <button onClick={() => setShowNewMode(true)}
            style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px dashed #4a5c2f", background: "none", color: "#7aad3e", fontSize: 13, cursor: "pointer", marginBottom: 4 }}>
            + Novo Modelo
          </button>
        </div>

        {/* ── EXTRATOR JURÍDICO (collapsible) ── */}
        <div style={{ padding: "0 12px 12px" }}>
          <button
            onClick={() => { setShowExtractor(v => !v); setExtractorError(""); }}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${showExtractor ? "#4a5c2f" : "#3a4a24"}`,
              background: showExtractor ? "rgba(74,92,47,0.15)" : "#252d14",
              color: showExtractor ? "#9acc55" : "hsl(55 20% 70%)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>🔍 Extrator Jurídico</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{showExtractor ? "▲ recolher" : "▼ expandir"}</span>
          </button>

          {showExtractor && (
            <div style={{ background: "#1e2810", border: "1px solid #3a4a24", borderTop: "none", borderRadius: "0 0 8px 8px", padding: 12 }}>
              {/* URL input */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  value={extractorUrl}
                  onChange={e => setExtractorUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleExtractPanel()}
                  placeholder="Cole a URL do tribunal ou processo…"
                  style={{
                    flex: 1, background: "#252d14", border: "1px solid #3a4a24",
                    borderRadius: 7, padding: "7px 10px", color: "hsl(55 25% 88%)",
                    fontSize: 13, outline: "none",
                  }}
                />
                <button
                  onClick={handleExtractPanel}
                  disabled={extractorLoading}
                  style={{
                    background: extractorLoading ? "#2f3a1a" : "#4a7c3f",
                    color: extractorLoading ? "#7aad3e" : "#fff",
                    border: "none", borderRadius: 7, padding: "7px 14px",
                    fontSize: 13, fontWeight: 700, cursor: extractorLoading ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {extractorLoading
                    ? <><span style={{ display: "inline-block", animation: "spin 0.7s linear infinite" }}>⟳</span> Buscando…</>
                    : "⬇ Extrair"}
                </button>
              </div>

              {/* Tribunal shortcuts */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {[
                  { label: "JusBrasil", url: "https://www.jusbrasil.com.br" },
                  { label: "TJSP",      url: "https://esaj.tjsp.jus.br" },
                  { label: "STJ",       url: "https://www.stj.jus.br" },
                  { label: "TRF1",      url: "https://portal.trf1.jus.br" },
                  { label: "TRT",       url: "https://www.trt3.jus.br" },
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => setExtractorUrl(s.url)}
                    style={{
                      padding: "4px 10px", borderRadius: 14,
                      border: "1px solid rgba(74,92,47,0.5)",
                      background: "rgba(74,92,47,0.08)",
                      color: "#7aad3e", fontSize: 11, cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Status / error */}
              {extractorLoading && (
                <div style={{ fontSize: 11, color: "#7aad3e", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", animation: "spin 0.7s linear infinite" }}>⟳</span>
                  Tentando proxies em cascata (allorigins → corsproxy → thingproxy)…
                </div>
              )}
              {extractorError && (
                <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "7px 10px" }}>
                  ⚠ {extractorError}
                </div>
              )}

              <div style={{ fontSize: 10, color: "hsl(85 10% 45%)", marginTop: 6 }}>
                O texto extraído aparecerá no campo de entrada acima para análise com IA.
              </div>
            </div>
          )}
        </div>

       </div>{/* end app-left-col */}
       {/* ── RIGHT COLUMN: result + chat ── */}
       <div className="app-right-col">

        {/* RESULT / CHAT AREA */}
        <div style={{ padding: "4px 12px 0" }}>
          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #3a4a24", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(55 20% 75%)", flex: 1 }}>Resultado aqui</span>
            <button onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) stopSpeaking(); }}
              style={{ background: "none", border: "none", color: voiceEnabled ? "#7aad3e" : "hsl(85 10% 52%)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <span>🔊</span> Voz {voiceEnabled ? "ON" : "OFF"}
            </button>
            <button onClick={() => setShowTTS(v => !v)}
              style={{ background: "none", border: "none", color: "hsl(55 20% 65%)", cursor: "pointer", fontSize: 16 }} title="Config. Voz TTS">
              ⚌
            </button>
            <button onClick={() => { const last = chatHistory.filter(m => m.role === "ai").pop(); if (last) { navigator.clipboard.writeText(last.content); toast({ title: "✓ Copiado" }); } }}
              style={{ background: "none", border: "none", color: "hsl(55 20% 65%)", cursor: "pointer", fontSize: 14 }} title="Copiar">
              📋
            </button>
            <button onClick={handleDownload} style={{ background: "none", border: "none", color: "hsl(55 20% 65%)", cursor: "pointer", fontSize: 14 }} title="Download">⬇</button>
            <button onClick={handleSaveDoc} style={{ background: "none", border: "none", color: "#4a7c3f", cursor: "pointer", fontSize: 14 }} title="Salvar documento">💾</button>
            <button onClick={() => window.location.href = `${import.meta.env.BASE_URL}configuracoes`}
              style={{ background: "none", border: "none", color: "hsl(55 20% 65%)", cursor: "pointer", fontSize: 14 }} title="Configurações">⚙</button>
          </div>

          {/* TTS PANEL */}
          {showTTS && (
            <div style={{ background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 10, padding: "14px", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Configurações de Voz (TTS)</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>Velocidade</span>
                  <span style={{ fontSize: 13, color: "#7aad3e" }}>{ttsSpeed.toFixed(2)}x</span>
                </div>
                <input type="range" min="0.5" max="2" step="0.05" value={ttsSpeed}
                  onChange={e => setTtsSpeed(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#4a5c2f" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "hsl(85 10% 52%)" }}>
                  <span>Lenta</span><span>Normal</span><span>Rápida</span>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>Tom (Pitch)</span>
                  <span style={{ fontSize: 13, color: "#7aad3e" }}>{ttsPitch.toFixed(2)}</span>
                </div>
                <input type="range" min="0.5" max="2" step="0.05" value={ttsPitch}
                  onChange={e => setTtsPitch(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#4a5c2f" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "hsl(85 10% 52%)" }}>
                  <span>Grave</span><span>Normal</span><span>Agudo</span>
                </div>
              </div>
              <button onClick={() => { setTtsSpeed(1); setTtsPitch(1); }}
                style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#2f3a1a", border: "1px solid #3a4a24", color: "hsl(55 25% 88%)", cursor: "pointer", fontSize: 13 }}>
                Restaurar padrão
              </button>
            </div>
          )}

          {/* CHAT HISTORY */}
          {chatHistory.length === 0 && !isProcessing && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", color: "hsl(85 10% 45%)", gap: 8 }}>
              <span style={{ fontSize: 32, opacity: 0.4 }}>⚒</span>
              <span style={{ fontSize: 13, textAlign: "center" }}>Cole o texto no campo acima e escolha uma ação para começar</span>
            </div>
          )}
          {isProcessing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "#7aad3e" }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              <span style={{ fontSize: 13 }}>Processando com IA...</span>
            </div>
          )}
          <div>
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ background: msg.role === "ai" ? "#1e2810" : "#252d14", border: `1px solid ${msg.role === "ai" ? "#4a5c2f" : "#3a4a24"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: msg.role === "ai" ? "#7aad3e" : "#9acc55", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {msg.role === "ai" ? (msg.mode ? `⚖ IA – ${msg.mode.toUpperCase()}` : "⚖ IA") : "👤 VOCÊ"}
                  </span>
                  {msg.role === "ai" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => { navigator.clipboard.writeText(msg.content); }}
                        title="Copiar texto"
                        style={{ background: "none", border: "1px solid #3a4a24", borderRadius: 6, color: "#7aad3e", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
                        📋 Copiar
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([msg.content], { type: "text/plain;charset=utf-8" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `juridico-${msg.mode || "ia"}-${Date.now()}.txt`;
                          a.click(); URL.revokeObjectURL(url);
                        }}
                        title="Baixar como .txt"
                        style={{ background: "none", border: "1px solid #3a4a24", borderRadius: 6, color: "#9acc55", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
                        ⬇ .txt
                      </button>
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap",
                  fontFamily: msg.role === "ai" ? "'Georgia', 'Times New Roman', serif" : "'Inter', sans-serif",
                  color: msg.role === "ai" ? "hsl(55 30% 90%)" : "hsl(55 20% 80%)",
                  letterSpacing: msg.role === "ai" ? "0.01em" : "normal",
                }}>{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* CHAT MODE: chat action bar */}
          {activeMode === "chat" && (
            <div style={{ marginTop: 8 }}>
              {/* URL extractor */}
              {showUrlExtractor && (
                <div style={{ background: "#1e2810", border: "1px solid rgba(74,92,47,0.5)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#7aad3e", marginBottom: 6 }}>🌐 Extrair código-fonte de um site</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={extractUrl} onChange={e => setExtractUrl(e.target.value)}
                      placeholder="https://exemplo.com.br — cole a URL do site"
                      style={{ flex: 1, background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 8, padding: "7px 10px", color: "hsl(55 25% 88%)", fontSize: 13 }}
                    />
                    <button onClick={handleExtractSite}
                      style={{ background: "#4a5c2f", color: "#e8f0d8", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ⬇ Extrair
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(85 10% 52%)", marginTop: 4 }}>Extrai HTML, CSS, JS, APIs e meta-tags.</div>
                </div>
              )}
              {/* Chat action bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "3px 8px", background: "#2f3a1a", borderRadius: 20, color: "hsl(55 20% 65%)", border: "1px solid #3a4a24" }}>
                  Premium (clique para trocar)
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {[
                  { icon: "💾", label: "Salvar", action: handleSaveSession },
                  { icon: "📋", label: `Sessões (${sessions.length})`, action: () => setShowSessions(v => !v) },
                  { icon: "⬇", label: "Baixar", action: handleDownload },
                  { icon: "🌐", label: "Extrair Site", action: () => setShowUrlExtractor(v => !v), highlight: true },
                  { icon: "🔨", label: "Construir Minuta", action: () => handleProcess("gerar_minuta") },
                  { icon: "+", label: "Expandir", action: () => handleProcess("refinar") },
                  { icon: "✨", label: "Melhorar", action: () => handleProcess("refinar") },
                  { icon: "🔍", label: "Lacunas", action: () => handleProcess("lacunas") },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    style={{
                      padding: "5px 12px", borderRadius: 8,
                      background: btn.highlight ? "#4a5c2f" : "#252d14",
                      border: "1px solid #3a4a24",
                      color: btn.highlight ? "#111" : "hsl(55 25% 88%)",
                      fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: btn.highlight ? 700 : 400
                    }}>
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>
              {/* Chat input */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button onClick={handleVoiceToggle}
                  style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: isListening ? "#ef4444" : "hsl(55 20% 65%)", flexShrink: 0 }}>
                  🎤
                </button>
                <span style={{ fontSize: 18, cursor: "pointer", color: "hsl(55 20% 65%)", flexShrink: 0 }}>📎</span>
                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleProcess("chat"); } }}
                    placeholder={`Conversa (${sessionCount} ajustes) — a IA lembra das mensagens anteriores`}
                    rows={2}
                    style={{
                      width: "100%", background: "#1e2810", border: "1px solid #3a4a24",
                      borderRadius: 10, padding: "8px 40px 8px 10px", color: "hsl(55 25% 88%)",
                      fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button onClick={() => handleProcess("chat")}
                    style={{ position: "absolute", right: 8, bottom: 8, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#7aad3e" }}>
                    ➤
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
       </div>{/* end app-right-col */}
      </div>{/* end app-main-area */}

      {/* ── BOTTOM BAR ── */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid #3a4a24", background: "#1a1f0f", flexShrink: 0 }}>
        <button
          onClick={handleVoiceToggle}
          style={{
            flex: 1, background: isListening ? "#ef4444" : "#4a7c3f",
            color: isListening ? "#fff" : "#111", border: "none", borderRadius: 10,
            padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            animation: isListening ? "pulse 1s infinite" : "none",
          }}
        >
          <span>🎤</span>{isListening ? "⏹ PARAR" : "DITAR POR VOZ"}
        </button>
        <button
          onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) stopSpeaking(); }}
          style={{
            background: voiceEnabled ? "#2f3a1a" : "#252d14",
            color: voiceEnabled ? "#7aad3e" : "hsl(85 10% 52%)",
            border: "1px solid #3a4a24",
            borderRadius: 10, padding: "14px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}
        >
          🔊 {voiceEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* ── NEW MODE MODAL ── */}
      {showNewMode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 14, padding: 20, width: "100%", maxWidth: 420 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#7aad3e" }}>+ Novo Modo de Operação</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "hsl(85 10% 55%)", display: "block", marginBottom: 4 }}>Nome do modo</label>
              <input value={newModeLabel} onChange={e => setNewModeLabel(e.target.value)} placeholder="Ex: Checar LGPD"
                style={{ width: "100%", background: "#252d14", border: "1px solid #3a4a24", borderRadius: 8, padding: "8px 10px", color: "hsl(55 25% 88%)", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "hsl(85 10% 55%)", display: "block", marginBottom: 4 }}>Prompt do sistema</label>
              <textarea value={newModePrompt} onChange={e => setNewModePrompt(e.target.value)}
                placeholder="Ex: Analise o texto e identifique violações da LGPD, explicando cada ponto..."
                rows={4}
                style={{ width: "100%", background: "#252d14", border: "1px solid #3a4a24", borderRadius: 8, padding: "8px 10px", color: "hsl(55 25% 88%)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowNewMode(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, background: "#2f3a1a", border: "1px solid #3a4a24", color: "hsl(55 25% 88%)", cursor: "pointer", fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={handleAddCustomMode}
                style={{ flex: 1, padding: "10px", borderRadius: 8, background: "#4a7c3f", border: "none", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                ✓ Criar Modo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSIONS MODAL ── */}
      {showSessions && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 14, padding: 20, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#7aad3e" }}>📋 Sessões Salvas</span>
              <button onClick={() => setShowSessions(false)} style={{ background: "none", border: "none", color: "hsl(55 25% 88%)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            {sessions.length === 0 ? (
              <div style={{ color: "hsl(85 10% 52%)", textAlign: "center", padding: "20px 0" }}>Nenhuma sessão salva ainda</div>
            ) : sessions.map(s => (
              <div key={s.id} style={{ background: "#252d14", border: "1px solid #3a4a24", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "hsl(85 10% 52%)" }}>{new Date(s.created).toLocaleString("pt-BR")} · {s.messages.length} mensagens</div>
                <button onClick={() => { setChatHistory(s.messages); setShowSessions(false); toast({ title: `Sessão "${s.name}" carregada` }); }}
                  style={{ marginTop: 8, padding: "5px 12px", borderRadius: 8, background: "#4a5c2f", color: "#e8f0d8", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  Carregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ─── Mode button sub-component ────────────────────────────────────────────────
function ModeBtn({ icon, label, active, loading, onClick }: { icon: string; label: string; active: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? "rgba(74,92,47,0.25)" : "#252d14",
        border: `1px solid ${active ? "#4a5c2f" : "#3a4a24"}`,
        color: active ? "#9acc55" : "hsl(55 25% 82%)",
        borderRadius: 8, padding: "9px 8px", fontSize: 12, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        textAlign: "center", minHeight: 60, justifyContent: "center", lineHeight: 1.2, transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#2f3a1a"; e.currentTarget.style.borderColor = "rgba(74,92,47,0.6)"; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "#252d14"; e.currentTarget.style.borderColor = "#3a4a24"; } }}
    >
      <span style={{ fontSize: 16 }}>{loading ? "⟳" : icon}</span>
      <span style={{ fontSize: 11 }}>{label}</span>
    </button>
  );
}
