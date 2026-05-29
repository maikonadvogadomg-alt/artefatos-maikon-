import { useState, useEffect } from "react";
import { getStorageItem, setStorageItem, SK } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";


const MODELS = [
  // Groq — grátis
  { value: "llama-3.3-70b-versatile",      label: "🟣 Groq — Llama 3.3 70B (GRÁTIS ⚡)", provider: "groq" },
  { value: "llama3-8b-8192",               label: "🟣 Groq — Llama 3 8B (GRÁTIS ⚡ rápido)", provider: "groq" },
  { value: "gemma2-9b-it",                 label: "🟣 Groq — Gemma 2 9B (GRÁTIS ⚡)", provider: "groq" },
  { value: "mixtral-8x7b-32768",           label: "🟣 Groq — Mixtral 8x7B (GRÁTIS ⚡)", provider: "groq" },
  // OpenAI
  { value: "gpt-4o-mini",                  label: "🟢 OpenAI GPT-4o Mini (barato)", provider: "openai" },
  { value: "gpt-4o",                       label: "🟢 OpenAI GPT-4o (avançado)", provider: "openai" },
  { value: "gpt-3.5-turbo",               label: "🟢 OpenAI GPT-3.5 Turbo (econômico)", provider: "openai" },
  // Google Gemini
  { value: "gemini-2.0-flash",             label: "🔵 Gemini 2.0 Flash (rápido)", provider: "google" },
  { value: "gemini-1.5-pro",               label: "🔵 Gemini 1.5 Pro (avançado)", provider: "google" },
  { value: "gemini-1.5-flash",             label: "🔵 Gemini 1.5 Flash (econômico)", provider: "google" },
  // Perplexity — pesquisa web
  { value: "llama-3.1-sonar-large-128k-online", label: "🟡 Perplexity Sonar Large (web)", provider: "perplexity" },
  { value: "sonar",                        label: "🟡 Perplexity Sonar (web)", provider: "perplexity" },
];

const PROVIDER_HINT: Record<string, string> = {
  groq:       "Começa com gsk_... — GRÁTIS em console.groq.com",
  openai:     "Começa com sk-... de platform.openai.com",
  google:     "Começa com AIza... de aistudio.google.com",
  perplexity: "Começa com pplx-... de perplexity.ai/settings/api",
};

type TestStatus = "idle" | "testing" | "ok" | "err";

export default function Configuracoes() {
  const { toast } = useToast();

  // ─── AI config ───────────────────────────────────────────────────────────────
  const [model, setModel] = useState(() => {
    const stored = localStorage.getItem(SK.MODEL);
    if (!stored) return "gpt-4o";
    try { const v = JSON.parse(stored) as string; return v === "demo" ? "gpt-4o" : v; } catch { return "gpt-4o"; }
  });
  const [apiKey, setApiKey] = useState(() => getStorageItem(SK.API_KEY, ""));
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(() => !!getStorageItem(SK.API_KEY, ""));
  const [keyTestStatus, setKeyTestStatus] = useState<TestStatus>("idle");
  const [keyTestMsg, setKeyTestMsg] = useState("");

  // ─── Perplexity key ───────────────────────────────────────────────────────────
  const [perplexityKey, setPerplexityKey] = useState(() => getStorageItem("sk_perplexity_key", ""));
  const [perplexityTestStatus, setPerplexityTestStatus] = useState<TestStatus>("idle");
  const [perplexityTestMsg, setPerplexityTestMsg] = useState("");

  // ─── Server status ────────────────────────────────────────────────────────────
  const [serverStatus, setServerStatus] = useState<{ openai: boolean; neon: boolean; perplexity: boolean; errors: Record<string, string> } | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(false);

  const currentModel = MODELS.find(m => m.value === model) ?? MODELS[0];

  // Auto-save model on change
  useEffect(() => { setStorageItem(SK.MODEL, model); }, [model]);

  const saveApiKey = () => {
    setStorageItem(SK.API_KEY, apiKey);
    setKeySaved(true);
    setKeyTestStatus("idle");
    toast({ title: "✓ Chave salva", description: "Chave de API salva com segurança." });
  };

  const clearApiKey = () => {
    setApiKey("");
    setStorageItem(SK.API_KEY, "");
    setKeySaved(false);
    setKeyTestStatus("idle");
    toast({ title: "✓ Chave removida" });
  };

  const testOpenAIKey = async () => {
    const keyToTest = apiKey || getStorageItem(SK.API_KEY, "");
    if (!keyToTest) {
      setKeyTestStatus("err");
      setKeyTestMsg("Digite uma chave antes de testar");
      return;
    }
    setKeyTestStatus("testing");
    setKeyTestMsg("Testando...");
    try {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (r.ok) {
        setKeyTestStatus("ok");
        setKeyTestMsg("Chave OpenAI válida! Conectado.");
      } else {
        const d = await r.json() as any;
        setKeyTestStatus("err");
        setKeyTestMsg(d.error?.message || "Chave inválida ou sem permissão");
      }
    } catch (e: any) {
      setKeyTestStatus("err");
      setKeyTestMsg(e?.message || "Erro de rede");
    }
  };

  const testPerplexityKey = async () => {
    if (!perplexityKey) {
      setPerplexityTestStatus("err");
      setPerplexityTestMsg("Digite uma chave antes de testar");
      return;
    }
    setPerplexityTestStatus("testing");
    setPerplexityTestMsg("Testando...");
    try {
      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${perplexityKey}` },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: "teste" }],
          max_tokens: 5,
        }),
      });
      if (r.ok || r.status === 400) {
        setPerplexityTestStatus("ok");
        setPerplexityTestMsg("Chave Perplexity válida! Conectado.");
        localStorage.setItem("sk_perplexity_key", perplexityKey);
      } else {
        const d = await r.json() as any;
        setPerplexityTestStatus("err");
        setPerplexityTestMsg(d.error?.message || "Chave inválida");
      }
    } catch (e: any) {
      setPerplexityTestStatus("err");
      setPerplexityTestMsg(e?.message || "Erro de rede");
    }
  };

  const checkServerStatus = async () => {
    setServerStatusLoading(true);
    try {
      const hasOpenAI = !!(getStorageItem(SK.API_KEY, "") || "").trim();
      const hasPerplexity = !!(localStorage.getItem("sk_perplexity_key") || "").trim();
      const hasNeon = !!(getStorageItem(SK.NEON_URL, "") || "").trim();
      setServerStatus({ openai: hasOpenAI, neon: hasNeon, perplexity: hasPerplexity, errors: {} });
    } catch (e: any) {
      toast({ title: "Erro ao verificar status", description: e?.message, variant: "destructive" });
    } finally {
      setServerStatusLoading(false);
    }
  };

  // ─── Neon DB ─────────────────────────────────────────────────────────────────
  const [neonUrl, setNeonUrl] = useState(() => getStorageItem(SK.NEON_URL, ""));
  const [neonStatus, setNeonStatus] = useState<"idle" | "ok" | "err">("idle");
  const [neonMsg, setNeonMsg] = useState("");
  const [sqlQuery, setSqlQuery] = useState("SELECT NOW() AS time, current_database() AS db;");
  const [sqlResult, setSqlResult] = useState<any>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [isCreatingTables, setIsCreatingTables] = useState(false);

  const saveNeonUrl = () => {
    setStorageItem(SK.NEON_URL, neonUrl);
    toast({ title: "✓ URL salva", description: "Connection string salva localmente." });
  };

  const runNeonSql = async (sql: string): Promise<any[]> => {
    const url = neonUrl.trim();
    if (!url) throw new Error("Cole a URL do Neon primeiro.");

    // Parse postgresql://user:pass@host/db
    let host = "";
    let authHeader = "";
    try {
      const u = new URL(url);
      host = u.hostname;
      const user = decodeURIComponent(u.username);
      const pass = decodeURIComponent(u.password);
      authHeader = "Basic " + btoa(`${user}:${pass}`);
    } catch {
      throw new Error("URL inválida. Use o formato: postgresql://user:pass@host/db");
    }

    // Neon HTTP SQL API — funciona direto do browser, sem servidor
    const res = await fetch(`https://${host}/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "Neon-Connection-String": url,
      },
      body: JSON.stringify({ query: sql }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.message || data.error || "Erro na consulta Neon");
    return data.rows ?? [];
  };

  const testConnection = async () => {
    if (!neonUrl.trim()) { toast({ title: "Insira a URL primeiro", variant: "destructive" }); return; }
    setNeonStatus("idle");
    setNeonMsg("Testando...");
    try {
      const rows = await runNeonSql("SELECT NOW() AS time");
      setNeonStatus("ok");
      setNeonMsg("Conectado! " + JSON.stringify(rows[0] ?? {}));
      toast({ title: "✓ Conexão OK", description: "Banco de dados acessível." });
    } catch (e: any) {
      setNeonStatus("err");
      setNeonMsg(e?.message ?? "Erro desconhecido");
      toast({ title: "✗ Falha na conexão", description: e?.message, variant: "destructive" });
    }
  };

  const createAllTables = async () => {
    toast({ title: "Criando tabelas...", description: "Aguarde." });
    setIsCreatingTables(true);
    const sql = `
CREATE TABLE IF NOT EXISTS clientes (id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, cpf VARCHAR(14), email VARCHAR(255), telefone VARCHAR(20), endereco TEXT, observacoes TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS processos (id SERIAL PRIMARY KEY, numero VARCHAR(50) NOT NULL UNIQUE, tipo VARCHAR(50), cliente_id INTEGER, tribunal VARCHAR(100), vara VARCHAR(100), status VARCHAR(50) DEFAULT 'ativo', descricao TEXT, valor_causa DECIMAL(15,2), created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS audiencias (id SERIAL PRIMARY KEY, processo_id INTEGER, data DATE, hora VARCHAR(10), local VARCHAR(255), tipo VARCHAR(100), status VARCHAR(50) DEFAULT 'agendada', notas TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS documentos (id SERIAL PRIMARY KEY, titulo VARCHAR(255) NOT NULL, tipo VARCHAR(100), conteudo TEXT, created_at TIMESTAMP DEFAULT NOW());
    `.trim();
    try {
      await runNeonSql(sql);
      toast({ title: "✓ Tabelas criadas no Neon!" });
    } catch (e: any) {
      toast({ title: "Erro ao criar tabelas", description: e?.message, variant: "destructive" });
    } finally {
      setIsCreatingTables(false);
    }
  };

  const createTablesOnNeon = createAllTables;

  const runSql = async () => {
    if (!neonUrl.trim() || !sqlQuery.trim()) return;
    setIsExecuting(true);
    try {
      const rows = await runNeonSql(sqlQuery);
      setSqlResult(rows);
      toast({ title: `✓ ${rows.length} linha(s)` });
    } catch (e: any) {
      toast({ title: "Erro SQL", description: e?.message, variant: "destructive" });
    } finally {
      setIsExecuting(false);
    }
  };

  const st = {
    page: { minHeight: "100dvh", background: "hsl(120 22% 7%)", color: "hsl(55 25% 88%)", fontFamily: "'Inter',sans-serif", padding: 0 },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid hsl(120 15% 16%)", background: "hsl(120 20% 9%)", position: "sticky" as const, top: 0, zIndex: 10 },
    section: { background: "hsl(120 20% 10%)", border: "1px solid hsl(120 15% 18%)", borderRadius: 12, padding: 18, marginBottom: 14 },
    sectionHighlight: { background: "hsl(120 20% 10%)", border: "2px solid hsl(45 70% 45% / 0.5)", borderRadius: 12, padding: 18, marginBottom: 14, boxShadow: "0 0 20px hsl(45 70% 55% / 0.08)" },
    label: { fontSize: 12, color: "hsl(120 8% 60%)", display: "block" as const, marginBottom: 5 },
    input: { width: "100%", background: "hsl(120 18% 13%)", border: "1px solid hsl(120 15% 22%)", borderRadius: 8, padding: "10px 12px", color: "hsl(55 25% 88%)", fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
    select: { width: "100%", background: "hsl(120 18% 13%)", border: "1px solid hsl(120 15% 22%)", borderRadius: 8, padding: "10px 12px", color: "hsl(55 25% 88%)", fontSize: 14, boxSizing: "border-box" as const },
    btnSave: { background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" } as const,
    btnAction: { background: "#4a7c3f", color: "#111", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" } as const,
    btnDanger: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" } as const,
    btnGhost: { background: "#2f3a1a", color: "hsl(55 25% 88%)", border: "1px solid #3a4a24", borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: "pointer" } as const,
    sectionTitle: { fontWeight: 700, fontSize: 15, color: "#7aad3e", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 } as const,
  };

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={st.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => window.history.back()}
            style={{ background: "none", border: "none", color: "hsl(55 25% 75%)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#7aad3e" }}>⚙ Configurações</span>
        </div>
        <span style={{ fontSize: 12, color: "hsl(85 10% 50%)" }}>SK Jurídico</span>
      </div>

      <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>

        {/* ── SEÇÃO IA ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>🤖 Modelo de IA</div>

          <label style={st.label}>Provedor e Modelo</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={{ ...st.select, marginBottom: 14 }}>
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <div>
              <label style={st.label}>
                Chave de API — {currentModel.provider === "openai" ? "OpenAI" : currentModel.provider === "google" ? "Google" : "Perplexity"}
                {keySaved && <span style={{ marginLeft: 8, color: "#4a7c3f", fontSize: 11 }}>✓ Configurada</span>}
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setKeySaved(false); setKeyTestStatus("idle"); }}
                    placeholder={PROVIDER_HINT[currentModel.provider] || "Cole sua chave de API"}
                    style={{ ...st.input, paddingRight: 42 }}
                  />
                  <button onClick={() => setShowKey(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "hsl(85 10% 55%)", cursor: "pointer", fontSize: 16 }}>
                    {showKey ? "🙈" : "👁"}
                  </button>
                </div>
                <button onClick={saveApiKey} style={st.btnSave}>✓ Salvar</button>
                <button onClick={clearApiKey} style={st.btnDanger}>Limpar</button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <button
                  onClick={testOpenAIKey}
                  disabled={keyTestStatus === "testing"}
                  style={{
                    background: keyTestStatus === "ok" ? "#22c55e" : keyTestStatus === "err" ? "#ef4444" : "#4a5c2f",
                    color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    opacity: keyTestStatus === "testing" ? 0.7 : 1,
                  }}
                >
                  {keyTestStatus === "testing" ? "⏳ Testando..." : keyTestStatus === "ok" ? "✅ Conectado" : keyTestStatus === "err" ? "❌ Falhou" : "🔌 Testar"}
                </button>
                {keyTestMsg && (
                  <span style={{ fontSize: 12, color: keyTestStatus === "ok" ? "#22c55e" : "#ef4444" }}>{keyTestMsg}</span>
                )}
              </div>
              {keySaved && (
                <div style={{ fontSize: 12, color: "#4a7c3f", display: "flex", alignItems: "center", gap: 4 }}>
                  ✓ Chave configurada e salva localmente (não enviada para servidores externos)
                </div>
              )}
            </div>
        </div>

        {/* ── PERPLEXITY KEY ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>🟡 Chave Perplexity (pesquisa web)</div>
          <label style={st.label}>Chave de API Perplexity — começa com pplx-...</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="password"
              value={perplexityKey}
              onChange={e => { setPerplexityKey(e.target.value); setPerplexityTestStatus("idle"); }}
              placeholder="pplx-..."
              style={{ ...st.input }}
            />
            <button onClick={() => { localStorage.setItem("sk_perplexity_key", perplexityKey); toast({ title: "✓ Chave Perplexity salva" }); }} style={st.btnSave}>✓ Salvar</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={testPerplexityKey}
              disabled={perplexityTestStatus === "testing"}
              style={{
                background: perplexityTestStatus === "ok" ? "#22c55e" : perplexityTestStatus === "err" ? "#ef4444" : "#4a5c2f",
                color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: perplexityTestStatus === "testing" ? 0.7 : 1,
              }}
            >
              {perplexityTestStatus === "testing" ? "⏳ Testando..." : perplexityTestStatus === "ok" ? "✅ Conectado" : perplexityTestStatus === "err" ? "❌ Falhou" : "🔌 Testar Perplexity"}
            </button>
            {perplexityTestMsg && (
              <span style={{ fontSize: 12, color: perplexityTestStatus === "ok" ? "#22c55e" : "#ef4444" }}>{perplexityTestMsg}</span>
            )}
          </div>
          {perplexityTestStatus === "err" && perplexityTestMsg.includes("não configurada") && (
            <div style={{ fontSize: 12, color: "hsl(85 10% 55%)", marginTop: 6 }}>
              Perplexity está fora do escopo desta versão. O botão mostrará ❌ até que uma chave seja fornecida.
            </div>
          )}
        </div>

        {/* ── STATUS LOCAL ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>🔍 Status das Configurações</div>
          <button onClick={checkServerStatus} disabled={serverStatusLoading}
            style={{ ...st.btnAction, opacity: serverStatusLoading ? 0.7 : 1, marginBottom: 12 }}>
            {serverStatusLoading ? "⏳ Verificando..." : "🔍 Verificar Status"}
          </button>
          {serverStatus && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "openai", label: "Chave OpenAI / Gemini configurada" },
                { key: "neon", label: "Banco Neon configurado" },
                { key: "perplexity", label: "Chave Perplexity configurada" },
              ].map(({ key, label }) => {
                const ok = serverStatus[key as keyof typeof serverStatus] as boolean;
                return (
                  <div key={key} style={{ padding: "8px 12px", borderRadius: 8, background: ok ? "#1a2e12" : "#2a1a1a", border: `1px solid ${ok ? "#4a7c3f44" : "#ef444433"}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{ok ? "✅" : "⚠️"}</span>
                    <div style={{ fontSize: 13, color: ok ? "#7aad3e" : "#f87171" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PIN DE ACESSO ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>🔐 PIN de Acesso</div>
          <div style={{ fontSize: 12, color: "hsl(85 10% 55%)", marginBottom: 12 }}>
            Proteja o app com um PIN de 4 dígitos. Será pedido ao abrir o aplicativo.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button onClick={() => { localStorage.removeItem("sk_pin"); toast({ title: "🔓 PIN removido", description: "App abrirá sem PIN." }); }}
              style={{ ...st.btnGhost, flex: 1 }}>🔓 Remover PIN</button>
            <button onClick={() => { localStorage.removeItem("sk_pin"); window.location.reload(); }}
              style={{ ...st.btnAction, flex: 1 }}>🔐 Redefinir PIN</button>
          </div>
        </div>

        {/* ── NEON DB ── */}
        <div style={st.sectionHighlight}>
          <div style={st.sectionTitle}>🗄 Banco de Dados — Neon / PostgreSQL</div>
          <div style={{ fontSize: 12, color: "hsl(85 10% 55%)", marginBottom: 12 }}>
            Cole a connection string do Neon (ou qualquer PostgreSQL). Formato: <code style={{ color: "#7aad3e", fontSize: 11 }}>postgresql://user:pass@host/db?sslmode=require</code>
          </div>

          <label style={st.label}>URL de Conexão (Connection String)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={neonUrl}
              onChange={e => setNeonUrl(e.target.value)}
              placeholder="postgresql://user:senha@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
              style={{ ...st.input, fontFamily: "monospace", fontSize: 12 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 10 }}>
            <button onClick={saveNeonUrl} style={st.btnSave}>✓ Salvar URL</button>
            <button onClick={testConnection} style={{
              ...( neonStatus === "ok" ? st.btnSave : st.btnAction ),
              transition: "background 0.3s, color 0.3s",
            }}>
              {neonStatus === "ok" ? "✅ Conectado!" : neonStatus === "err" ? "❌ Falhou — Testar de novo" : "🔌 Testar Conexão"}
            </button>
            {neonUrl && (
              <button onClick={() => { setNeonUrl(""); setStorageItem(SK.NEON_URL, ""); setNeonStatus("idle"); }}
                style={st.btnDanger}>Limpar</button>
            )}
          </div>

          {neonStatus !== "idle" && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: neonStatus === "ok" ? "hsl(142 30% 12%)" : "hsl(0 30% 12%)", border: `1px solid ${neonStatus === "ok" ? "#4a7c3f44" : "#ef444444"}`, fontSize: 13, color: neonStatus === "ok" ? "#4a7c3f" : "#ef4444", marginBottom: 8 }}>
              {neonStatus === "ok" ? "✓ " : "✗ "}{neonMsg}
            </div>
          )}

          {getStorageItem(SK.NEON_URL, "") && neonStatus === "idle" && (
            <div style={{ fontSize: 12, color: "#4a7c3f", marginBottom: 8 }}>✓ URL configurada</div>
          )}
        </div>

        {/* ── CRIAR TABELAS ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>📋 Criar Tabelas Jurídicas</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { icon: "👤", label: "Clientes + Usuários" },
              { icon: "📁", label: "Processos" },
              { icon: "📅", label: "Audiências + Prazos" },
              { icon: "📄", label: "Docs + Movimentações" },
            ].map(item => (
              <div key={item.label} style={{ background: "#252d14", border: "1px solid #3a4a24", borderRadius: 8, padding: "10px 12px", textAlign: "center" as const, fontSize: 13 }}>
                {item.icon} {item.label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button onClick={createAllTables} disabled={isCreatingTables}
              style={{ flex: 1, padding: "12px", background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: isCreatingTables ? 0.7 : 1 }}>
              {isCreatingTables ? "Criando..." : "⚖ Criar TODAS no Neon"}
            </button>
            <button onClick={createTablesOnNeon} disabled={isCreatingTables || !neonUrl}
              style={{ flex: 1, padding: "12px", background: neonUrl ? "#4a5c2f" : "#2f3a1a", color: neonUrl ? "#e8f0d8" : "hsl(85 10% 50%)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: neonUrl ? "pointer" : "not-allowed" }}>
              {isCreatingTables ? "Criando..." : "🗄 Criar TODAS no Neon"}
            </button>
          </div>
        </div>

        {/* ── SQL PERSONALIZADO ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>💻 SQL Personalizado</div>
          <div style={{ fontSize: 12, color: "hsl(85 10% 55%)", marginBottom: 10 }}>Requer URL Neon configurada acima.</div>
          <textarea
            value={sqlQuery}
            onChange={e => setSqlQuery(e.target.value)}
            rows={4}
            style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid #3a4a24", borderRadius: 8, padding: "10px 12px", color: "#4ade80", fontFamily: "monospace", fontSize: 13, resize: "vertical", boxSizing: "border-box" as const, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={runSql} disabled={isExecuting || !neonUrl}
              style={{ ...st.btnAction, opacity: !neonUrl ? 0.5 : 1, cursor: !neonUrl ? "not-allowed" : "pointer" }}>
              ▶ Executar SQL
            </button>
            <button onClick={() => setSqlResult(null)} style={st.btnGhost}>Limpar resultado</button>
          </div>
          {sqlResult && (
            <div style={{ marginTop: 10, maxHeight: 200, overflowY: "auto", background: "rgba(0,0,0,0.5)", border: "1px solid #3a4a24", borderRadius: 8, padding: 10 }}>
              <pre style={{ fontSize: 11, color: "hsl(55 20% 70%)", margin: 0 }}>{JSON.stringify(sqlResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* ── VOZES / TTS ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>🔊 Voz e TTS</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#252d14", borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Voz de saída automática</div>
              <div style={{ fontSize: 12, color: "hsl(85 10% 55%)", marginTop: 2 }}>Falar resultado após processar texto</div>
            </div>
            <button
              onClick={() => { const cur = getStorageItem(SK.VOICE, false); setStorageItem(SK.VOICE, !cur); window.location.reload(); }}
              style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: getStorageItem(SK.VOICE, false) ? "#22c55e" : "#3a4a24", position: "relative" as const, transition: "background 0.2s" }}>
              <span style={{ position: "absolute" as const, top: 2, left: getStorageItem(SK.VOICE, false) ? 24 : 2, width: 22, height: 22, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
            </button>
          </div>
        </div>

        {/* ── EXPORTAR / IMPORTAR CREDENCIAIS ── */}
        <div style={{ ...st.section, border: "2px solid #4a7c3f44", boxShadow: "0 0 20px #4a7c3f0a" }}>
          <div style={st.sectionTitle}>💾 Exportar / Importar Configurações</div>
          <div style={{ fontSize: 12, color: "hsl(85 10% 55%)", marginBottom: 14 }}>
            Salve todas as suas credenciais (chave de API, URL do Neon, modelo escolhido e configurações de voz) em um arquivo <code style={{ color: "#7aad3e" }}>.json</code> no seu computador.
            Para restaurar, importe o arquivo salvo.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {/* EXPORTAR */}
            <button
              onClick={() => {
                const cfg = {
                  _info: "SK Jurídico — arquivo de credenciais. Guarde com segurança.",
                  _data: new Date().toLocaleString("pt-BR"),
                  _versao: "1.0",
                  modelo: localStorage.getItem("sk_model") ?? "gpt-4o",
                  chave_api: localStorage.getItem("sk_api_key") ?? "",
                  neon_url: localStorage.getItem("sk_neon_url") ?? "",
                  voz_ativa: localStorage.getItem("sk_voice_enabled") ?? "false",
                  tts_velocidade: localStorage.getItem("sk_tts_speed") ?? "1",
                  tts_tom: localStorage.getItem("sk_tts_pitch") ?? "1",
                  modos_personalizados: localStorage.getItem("sk_custom_modes") ?? "[]",
                };
                const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `sk-juridico-config-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 5000);
                toast({ title: "✓ Arquivo exportado!", description: "Guarde o .json em local seguro." });
              }}
              style={{ ...st.btnSave, flex: 1, textAlign: "center" as const }}
            >
              ⬇ Exportar Credenciais (.json)
            </button>

            {/* IMPORTAR */}
            <label style={{ ...st.btnAction, flex: 1, textAlign: "center" as const, cursor: "pointer" }}>
              ⬆ Importar Credenciais (.json)
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  const inputEl = e.target;          // captura antes de qualquer await/async
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const raw = ev.target?.result;
                      if (typeof raw !== "string") throw new Error("vazio");
                      const cfg = JSON.parse(raw);
                      if (!cfg || typeof cfg !== "object") throw new Error("inválido");

                      if (cfg.modelo            != null) { localStorage.setItem("sk_model",           String(cfg.modelo));             setModel(String(cfg.modelo)); }
                      if (cfg.chave_api         != null) { localStorage.setItem("sk_api_key",          String(cfg.chave_api));          setApiKey(String(cfg.chave_api)); setKeySaved(!!cfg.chave_api); }
                      if (cfg.neon_url          != null) { localStorage.setItem("sk_neon_url",         String(cfg.neon_url));           setNeonUrl(String(cfg.neon_url)); setNeonStatus("idle"); }
                      if (cfg.voz_ativa         != null)   localStorage.setItem("sk_voice_enabled",   String(cfg.voz_ativa));
                      if (cfg.tts_velocidade    != null)   localStorage.setItem("sk_tts_speed",        String(cfg.tts_velocidade));
                      if (cfg.tts_tom           != null)   localStorage.setItem("sk_tts_pitch",        String(cfg.tts_tom));
                      if (cfg.modos_personalizados != null) localStorage.setItem("sk_custom_modes",    String(cfg.modos_personalizados));

                      const keys: string[] = [];
                      if (cfg.chave_api) keys.push("Chave API");
                      if (cfg.neon_url)  keys.push("Banco Neon");
                      toast({
                        title: "✓ Credenciais importadas!",
                        description: keys.length ? `Restaurados: ${keys.join(", ")}` : "Configurações aplicadas.",
                      });
                    } catch (err) {
                      toast({ title: "❌ Erro ao importar", description: "Arquivo .json inválido ou corrompido.", variant: "destructive" });
                    } finally {
                      try { inputEl.value = ""; } catch { /* ignore */ }
                    }
                  };
                  reader.onerror = () => {
                    toast({ title: "❌ Erro de leitura", description: "Não foi possível ler o arquivo.", variant: "destructive" });
                    try { inputEl.value = ""; } catch { /* ignore */ }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>

          {/* Resumo do que está salvo */}
          <div style={{ marginTop: 14, background: "#1e2810", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "hsl(85 10% 50%)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Status atual das credenciais</div>
            {[
              { label: "Modelo de IA",       val: localStorage.getItem("sk_model") || "gpt-4o",                       ok: true },
              { label: "Chave de API",        val: localStorage.getItem("sk_api_key") ? "✓ Configurada" : "— não configurada",   ok: !!localStorage.getItem("sk_api_key") },
              { label: "Banco Neon (URL)",    val: localStorage.getItem("sk_neon_url") ? "✓ Configurada" : "— não configurada",  ok: !!localStorage.getItem("sk_neon_url") },
              { label: "Voz automática",      val: localStorage.getItem("sk_voice_enabled") === '"true"' ? "Ativada" : "Desativada", ok: true },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: "hsl(85 10% 60%)" }}>{r.label}</span>
                <span style={{ color: r.ok && r.val.startsWith("✓") ? "#22c55e" : "hsl(55 25% 75%)", fontFamily: "monospace", fontSize: 11 }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── NAV LINKS ── */}
        <div style={st.section}>
          <div style={st.sectionTitle}>📂 Módulos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "⚖ Assistente IA", href: "/" },
              { label: "👤 Clientes", href: "/clientes" },
              { label: "📁 Processos", href: "/processos" },
              { label: "📅 Audiências", href: "/audiencias" },
              { label: "📄 Documentos", href: "/documentos" },
            ].map(link => (
              <a key={link.href} href={link.href}
                style={{ display: "block", padding: "10px 14px", background: "#252d14", border: "1px solid #3a4a24", borderRadius: 8, color: "hsl(55 25% 88%)", textDecoration: "none", fontSize: 14 }}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
