import { useState, useRef, useCallback, useEffect } from "react";
import {
  Scale, Eye, EyeOff, Save, Key, X, Settings,
  Mic, MicOff, Volume2, VolumeX, Download, Copy, Check,
  Loader2, StopCircle, Trash2, FileText,
  ChevronDown, ChevronUp, MessageSquare, Send,
  BookOpen, Clock, Plus, Pencil, Search,
  SlidersHorizontal, ArrowLeft,
} from "lucide-react";
import { speak, stopSpeaking, loadTTSConfig, saveTTSConfig, getAvailableVoices, cleanForSpeech, type TTSConfig } from "@/lib/tts-service";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ementa { id: string; titulo: string; categoria: string; texto: string; criadoEm: string; }
interface HistoryEntry { id: string; acao: string; inputSnippet: string; resultado: string; timestamp: string; }
interface CustomAction { id: string; label: string; descricao: string; prompt: string; }
interface SavedKey { id: string; label: string; key: string; url: string; model: string; provider: string; }
interface ChatMsg { role: "user" | "assistant"; content: string; }

// ─── LegalText renderer (formatação ABNT forense) ─────────────────────────────
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
        const isListItem = /^\d+[.)]\s/.test(trimmed) || /^[a-z]\)/.test(trimmed)
          || /^[-–]\s/.test(trimmed) || /^[IVX]+[–-]\s/.test(trimmed);
        const isQuote = (trimmed.startsWith('"') || trimmed.startsWith('\u201c')) && trimmed.length > 60;
        const renderLines = (arr: string[]) => arr.map((l, j) => j === 0 ? l : <span key={j}><br />{l}</span>);
        if (isTitle)    return <p key={i} style={{ textAlign: "center", fontWeight: "bold", margin: "10px 0 4px", textIndent: "0", textTransform: "uppercase" }}>{trimmed}</p>;
        if (isListItem) return <p key={i} style={{ textAlign: "justify", margin: "2px 0", paddingLeft: "1.5cm", textIndent: "0" }}>{renderLines(lines)}</p>;
        if (isQuote)    return <p key={i} style={{ textAlign: "justify", margin: "4px 0", paddingLeft: "4cm", fontSize: "12px", fontStyle: "italic" }}>{renderLines(lines)}</p>;
        return <p key={i} style={{ textIndent: "3cm", textAlign: "justify", margin: "0" }}>{renderLines(lines)}</p>;
      })}
    </div>
  );
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const EFFORT_LABELS: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: "Rápido",    color: "#60a5fa", desc: "Resposta direta e concisa" },
  2: { label: "Básico",    color: "#34d399", desc: "Pontos principais" },
  3: { label: "Detalhado", color: "#fbbf24", desc: "Análise completa" },
  4: { label: "Profundo",  color: "#f97316", desc: "Fundamentação robusta" },
  5: { label: "Exaustivo", color: "#a78bfa", desc: "Máximo esforço possível" },
};

const MODES = [
  { id: "modo-estrito",    label: "✓ Corrigir Texto",    color: "#1e3a5f", border: "#3b82f6" },
  { id: "modo-redacao",    label: "✨ Redação Jurídica",  color: "#2d1b4e", border: "#8b5cf6" },
  { id: "modo-interativo", label: "🔍 Verificar Lacunas", color: "#1a2d1e", border: "#22c55e" },
];

const ACTIONS = [
  { id: "resumir",          label: "📄 Resumir" },
  { id: "revisar",          label: "✓ Revisar" },
  { id: "refinar",          label: "✨ Refinar" },
  { id: "simplificar",      label: "📖 Linguagem Simples" },
  { id: "minuta",           label: "🔨 Gerar Minuta" },
  { id: "analisar",         label: "🔎 Analisar" },
  { id: "pesquisa",         label: "🌐 Pesquisa Jurídica" },
  { id: "precedentes",      label: "⚖ Precedentes" },
];

const CATEGORIAS_SUGERIDAS = [
  "STF", "STJ", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6",
  "TRT", "TJMG", "TJSP", "TJRJ", "TJRS", "Súmula", "Doutrina",
];

const AUTO_DETECT: [string, string, string][] = [
  ["gsk_",   "https://api.groq.com/openai/v1",                          "llama-3.3-70b-versatile"],
  ["sk-or-", "https://openrouter.ai/api/v1",                             "openai/gpt-4o-mini"],
  ["pplx-",  "https://api.perplexity.ai",                               "sonar-pro"],
  ["AIza",   "https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash"],
  ["xai-",   "https://api.x.ai/v1",                                     "grok-2-latest"],
  ["sk-ant", "https://api.anthropic.com/v1",                             "claude-haiku-4-20250514"],
  ["sk-",    "https://api.openai.com/v1",                               "gpt-4o-mini"],
];

function detectProvider(key: string): { url: string; model: string; name: string } | null {
  const k = (key || "").trim();
  for (const [prefix, url, model] of AUTO_DETECT) {
    if (k.startsWith(prefix)) return { url, model, name: prefix };
  }
  return null;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
function loadLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── System prompts por ação e esforço ───────────────────────────────────────
const FORMATO = `
FORMATAÇÃO OBRIGATÓRIA — PADRÃO FORENSE BRASILEIRO:
- Texto puro, sem markdown (sem # ## **). Use MAIÚSCULAS para títulos de seção.
- Parágrafos separados por linha em branco. Recuo de início de parágrafo (padrão ABNT).
- Numeração: I – II – III ou 1. 2. 3. conforme tipo de documento.
- Fundamentos legais: cite artigo completo. Ex: "nos termos do art. 5º, LV, CF/88".
- Encerramento formal: "Termos em que, Pede deferimento."
- Linguagem formal forense (padrão TJMG, STJ, STF).
`;

function buildSystemPrompt(action: string, effortLevel: number, jurisText?: string): string {
  const effortDesc = EFFORT_LABELS[effortLevel]?.desc || "Análise completa";
  const effortInstr = `Nível de esforço: ${EFFORT_LABELS[effortLevel]?.label} (${effortDesc}). ${effortLevel >= 4 ? "Seja exaustivo, cite legislação e jurisprudência." : effortLevel >= 3 ? "Seja detalhado e fundamentado." : "Seja direto e conciso."}`;

  const jurisPart = jurisText?.trim() ? `\n\nJURISPRUDÊNCIA/EMENTAS SELECIONADAS (use como fundamento):\n${jurisText}` : "";

  const base: Record<string, string> = {
    "modo-estrito": `Você é revisor forense (OAB/MG). Corrija o texto: erros gramaticais, ortográficos, concordância e estilo forense. Retorne APENAS o texto corrigido, pronto para protocolo. ${effortInstr}`,
    "modo-redacao": `Você é advogado sênior (padrão TJMG/STJ). Reescreva em linguagem jurídica formal, técnica e persuasiva. Retorne texto completo pronto para protocolo. ${effortInstr}`,
    "modo-interativo": `Você é advogado (OAB/MG). Identifique:\n1. LACUNAS: informações faltantes\n2. INCONSISTÊNCIAS: contradições\n3. RISCOS: pontos vulneráveis\n4. SUGESTÕES: o que incluir\n${effortInstr}`,
    "resumir": `Você é assistente jurídico forense. Faça resumo estruturado:\n\nIDENTIFICAÇÃO DO DOCUMENTO:\nFATOS PRINCIPAIS:\nPEDIDOS:\nDECISÃO/RESULTADO (se houver):\nPRAZOS/PROVIDÊNCIAS:\n\n${effortInstr}`,
    "revisar": `Você é revisor jurídico sênior (padrão STJ). Aponte:\n1. ERROS TÉCNICO-JURÍDICOS\n2. ERROS DE ARGUMENTAÇÃO\n3. ERROS FORMAIS\n4. SUGESTÕES\nPara cada: trecho → erro → correção. ${effortInstr}`,
    "refinar": `Você é advogado sênior (20 anos, TJMG/STJ). Refine: torne mais persuasivo, adicione fundamentos legais, melhore estrutura lógica. Retorne texto completo. ${effortInstr}`,
    "simplificar": `Você é comunicador jurídico. Reescreva em linguagem simples para leigos:\n- Substitua termos técnicos\n- Frases curtas\n- Estrutura: O QUE É → O QUE DIZ → O QUE SIGNIFICA\n${effortInstr}`,
    "minuta": `Você é advogado (padrão TJMG). Gere minuta COMPLETA:\n- Cabeçalho com qualificação das partes\n- FATOS\n- FUNDAMENTOS JURÍDICOS (com artigos)\n- PEDIDOS numerados\n- Encerramento formal\n${effortInstr}`,
    "analisar": `Você é analista jurídico estratégico. Estrutura OBRIGATÓRIA:\n\nQUALIFICAÇÃO DO CASO:\nFUNDAMENTOS LEGAIS:\nJURISPRUDÊNCIA (STF/STJ/TJMG):\nPONTOS FORTES:\nPONTOS VULNERÁVEIS:\nESTRATÉGIA:\nPROBABILIDADE DE ÊXITO:\n${effortInstr}`,
    "pesquisa": `Você é pesquisador jurídico. Pesquise:\n\nLEGISLAÇÃO APLICÁVEL:\nJURISPRUDÊNCIA SUPERIOR (STF/STJ):\nJURISPRUDÊNCIA REGIONAL (TJMG/TRT):\nDOUTRINA:\nTENDÊNCIA ATUAL:\n${effortInstr}`,
    "precedentes": `Você é especialista em jurisprudência. Levante:\n\nSÚMULAS APLICÁVEIS (número e texto):\nLEADING CASES STF:\nLEADING CASES STJ:\nPRECEDENTES TJMG:\nTESE PREDOMINANTE:\nCOMO USAR:\n${effortInstr}`,
  };

  return (base[action] || base["refinar"]) + FORMATO + jurisPart;
}

// ─── Chamada direta à API (sem servidor) ─────────────────────────────────────
async function callDirectAPI(
  systemPrompt: string,
  userText: string,
  apiKey: string,
  apiUrl: string,
  apiModel: string,
  effortLevel: number,
  signal: AbortSignal,
): Promise<string> {
  const maxTokens = [1024, 2048, 4096, 6144, 8192][effortLevel - 1] || 4096;

  const isGemini = apiModel.startsWith("gemini") || apiUrl.includes("generativelanguage");
  const isAnthropic = apiKey.startsWith("sk-ant");

  if (isGemini) {
    const url = apiUrl.includes("openai")
      ? `${apiUrl.replace(/\/$/, "")}/chat/completions`
      : `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
    if (!apiUrl.includes("openai")) {
      const r = await fetch(url, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
        }),
      });
      const d = await r.json() as any;
      if (!r.ok) throw new Error(d.error?.message || `Erro ${r.status}`);
      return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
  }

  if (isAnthropic) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: apiModel || "claude-haiku-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userText }],
      }),
    });
    const d = await r.json() as any;
    if (!r.ok) throw new Error(d.error?.message || `Erro ${r.status}`);
    return d.content?.[0]?.text || "";
  }

  // OpenAI-compatible (Groq, OpenRouter, xAI, OpenAI, Perplexity)
  const prov = detectProvider(apiKey);
  const baseUrl = apiUrl?.trim() || prov?.url || "https://api.openai.com/v1";
  const model   = apiModel?.trim() || prov?.model || "gpt-4o-mini";

  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });
  const d = await r.json() as any;
  if (!r.ok) throw new Error(d.error?.message || `Erro ${r.status}`);
  return d.choices?.[0]?.message?.content || "";
}

// ─── Component ────────────────────────────────────────────────────────────────
type Tab = "processar" | "ementas" | "historico" | "acoes";

export default function JuridicoPro() {
  const [tab, setTab] = useState<Tab>("processar");

  // Chave de API
  const [apiKey,   setApiKey]   = useState(() =>
    localStorage.getItem("aj_api_key") ||
    localStorage.getItem("sk_groq_key") ||
    localStorage.getItem("sk_api_key") || "");
  const [apiUrl,   setApiUrl]   = useState(() => localStorage.getItem("aj_api_url")   || "");
  const [apiModel, setApiModel] = useState(() => localStorage.getItem("aj_api_model") || "");
  const [showKey,  setShowKey]  = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showSavedKeys, setShowSavedKeys] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>(() => loadLS("aj_saved_keys", []));

  // Esforço
  const [effortLevel, setEffortLevel] = useState<number>(() => loadLS("aj_effort", 3));

  // Texto e resultado
  const [inputText, setInputText] = useState("");
  const [jurisText, setJurisText] = useState("");
  const [showJuris, setShowJuris] = useState(false);
  const [result,   setResult]    = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  // TTS
  const [ttsOn,          setTtsOn]          = useState(() => loadTTSConfig().enabled);
  const [ttsConfig,      setTtsConfig]      = useState<TTSConfig>(() => loadTTSConfig());
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [voiceList,      setVoiceList]      = useState<SpeechSynthesisVoice[]>([]);
  const [isListening,    setIsListening]    = useState(false);

  const [copied, setCopied] = useState(false);

  // Chat de refinamento
  const [chatInput,   setChatInput]   = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat,    setShowChat]    = useState(false);

  // Ementas
  const [ementas,         setEmentas]         = useState<Ementa[]>(() => loadLS("aj_ementas", []));
  const [selectedEmentas, setSelectedEmentas] = useState<Set<string>>(new Set());
  const [showEmentaForm,  setShowEmentaForm]  = useState(false);
  const [editingEmenta,   setEditingEmenta]   = useState<Ementa | null>(null);
  const [eTitulo,         setETitulo]         = useState("");
  const [eCategoria,      setECategoria]      = useState("");
  const [eTexto,          setETexto]          = useState("");
  const [ementaSearch,    setEmentaSearch]    = useState("");

  // Histórico
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadLS("aj_history", []));

  // Ações customizadas
  const [customActions,  setCustomActions]  = useState<CustomAction[]>(() => loadLS("aj_custom_actions", []));
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustom,  setEditingCustom]  = useState<CustomAction | null>(null);
  const [caLabel,  setCaLabel]  = useState("");
  const [caDesc,   setCaDesc]   = useState("");
  const [caPrompt, setCaPrompt] = useState("");

  const abortRef    = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const resultRef   = useRef<HTMLDivElement>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);

  // Persistência
  useEffect(() => { if (apiKey) localStorage.setItem("aj_api_key", apiKey); }, [apiKey]);
  useEffect(() => { if (apiUrl) localStorage.setItem("aj_api_url", apiUrl); }, [apiUrl]);
  useEffect(() => { if (apiModel) localStorage.setItem("aj_api_model", apiModel); }, [apiModel]);
  useEffect(() => { saveLS("aj_effort",         effortLevel);   }, [effortLevel]);
  useEffect(() => { saveLS("aj_saved_keys",     savedKeys);     }, [savedKeys]);
  useEffect(() => { saveLS("aj_ementas",        ementas);       }, [ementas]);
  useEffect(() => { saveLS("aj_history",        history);       }, [history]);
  useEffect(() => { saveLS("aj_custom_actions", customActions); }, [customActions]);
  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [result]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  // Vozes TTS
  useEffect(() => {
    const load = () => { const v = window.speechSynthesis?.getVoices() ?? []; if (v.length) setVoiceList(v); };
    load(); window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  const applyTTS = (patch: Partial<TTSConfig>) => {
    setTtsConfig(prev => { const n = { ...prev, ...patch }; saveTTSConfig(n); return n; });
  };

  // Chave
  const saveCurrentKey = () => {
    if (!apiKey.trim() || savedKeys.some(s => s.key === apiKey.trim())) return;
    const prov = detectProvider(apiKey)?.name || "Custom";
    setSavedKeys(prev => [...prev, { id: Date.now().toString(), label: keyLabel.trim() || prov, key: apiKey.trim(), url: apiUrl, model: apiModel, provider: prov }]);
    setKeyLabel("");
  };

  // ─── Ação principal ───────────────────────────────────────────────────────
  const runAction = useCallback(async (actionId: string, customPrompt?: string) => {
    const text = inputText.trim();
    if (!text) { alert("Cole o texto do documento antes de escolher uma ação."); return; }
    if (isLoading) return;

    const cleanKey = apiKey.trim() ||
      localStorage.getItem("sk_groq_key") ||
      localStorage.getItem("sk_api_key") || "";

    if (!cleanKey) {
      alert("Configure uma chave de API em ⚙ Configurações (ou clique na chave 🔑).\n\nGroq é gratuito: console.groq.com");
      return;
    }

    const selectedEmentaTexts = ementas
      .filter(e => selectedEmentas.has(e.id))
      .map(e => `[${e.titulo} — ${e.categoria}]\n${e.texto}`)
      .join("\n\n");
    const jurisPart = [jurisText.trim(), selectedEmentaTexts].filter(Boolean).join("\n\n");

    setIsLoading(true); setResult(""); setActiveMode(actionId);
    setChatHistory([]); setShowChat(false);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const sysPrompt = customPrompt || buildSystemPrompt(actionId, effortLevel, jurisPart || undefined);
      const prov = detectProvider(cleanKey);
      const url   = apiUrl.trim()   || prov?.url   || "https://api.groq.com/openai/v1";
      const model = apiModel.trim() || prov?.model || "llama-3.3-70b-versatile";

      const res = await callDirectAPI(sysPrompt, text, cleanKey, url, model, effortLevel, controller.signal);

      if (res.trim()) {
        setResult(res);
        if (ttsOn) speak(cleanForSpeech(res), { ...ttsConfig, enabled: true });
        const label = customPrompt
          ? (customActions.find(a => a.id === actionId)?.label || "Ação Custom")
          : (ACTIONS.find(a => a.id === actionId)?.label || MODES.find(m => m.id === actionId)?.label || actionId);
        setHistory(prev => [{
          id: Date.now().toString(), acao: label,
          inputSnippet: text.substring(0, 120), resultado: res,
          timestamp: new Date().toLocaleString("pt-BR"),
        }, ...prev].slice(0, 15));
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setResult(`❌ Erro: ${err.message}`);
    } finally {
      setIsLoading(false); setActiveMode(null); abortRef.current = null;
    }
  }, [inputText, jurisText, selectedEmentas, ementas, isLoading, ttsOn, ttsConfig, effortLevel, apiKey, apiUrl, apiModel, customActions]);

  // ─── Chat de refinamento ──────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading || !result) return;
    const cleanKey = apiKey.trim() || localStorage.getItem("sk_groq_key") || "";
    if (!cleanKey) { alert("Configure uma chave de API primeiro."); return; }

    const newHistory: ChatMsg[] = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory); setChatInput(""); setChatLoading(true);
    const controller = new AbortController();
    try {
      const prov = detectProvider(cleanKey);
      const url   = apiUrl.trim()   || prov?.url   || "https://api.groq.com/openai/v1";
      const model = apiModel.trim() || prov?.model || "llama-3.3-70b-versatile";
      const sysPrompt = `Você é assistente jurídico. O resultado atual é:\n\n${result}\n\nRefine conforme a instrução do usuário, mantendo formatação forense brasileira.`;
      const messages = newHistory.map(m => ({ role: m.role, content: m.content }));
      const res = await callDirectAPI(sysPrompt, messages.map(m => `${m.role}: ${m.content}`).join("\n"), cleanKey, url, model, effortLevel, controller.signal);
      const updated: ChatMsg[] = [...newHistory, { role: "assistant", content: res }];
      setChatHistory(updated);
      if (res.length > result.length * 0.5) setResult(res);
    } catch (err: any) {
      if (err.name !== "AbortError") setChatHistory([...newHistory, { role: "assistant", content: `❌ ${err.message}` }]);
    } finally { setChatLoading(false); }
  }, [chatInput, chatLoading, result, chatHistory, effortLevel, apiKey, apiUrl, apiModel]);

  // ─── Voz ─────────────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome/Edge para ditar."); return; }
    const rec = new SR(); rec.lang = "pt-BR"; rec.continuous = true; rec.interimResults = true;
    let full = ""; let timer: any;
    const schedStop = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { try { rec.stop(); } catch {} }, 1800); };
    rec.onresult = (e: any) => {
      let f = ""; for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) f += e.results[i][0].transcript;
      full = f || full; if (full) schedStop();
    };
    rec.onend = () => {
      setIsListening(false);
      if (full.trim()) setInputText(prev => prev ? prev.trimEnd() + "\n\n" + full.trim() : full.trim());
    };
    rec.onerror = () => setIsListening(false);
    rec.start(); recognitionRef.current = rec; setIsListening(true);
  };

  // ─── Download ─────────────────────────────────────────────────────────────
  const downloadTxt = () => {
    if (!result) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([result], { type: "text/plain;charset=utf-8" }));
    a.download = `juridico-${Date.now()}.txt`; a.click();
  };

  const copyResult = () => {
    if (!result) return; navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ─── Ementa CRUD ──────────────────────────────────────────────────────────
  const saveEmenta = () => {
    if (!eTitulo.trim() || !eTexto.trim()) { alert("Preencha título e texto."); return; }
    if (editingEmenta) {
      setEmentas(prev => prev.map(e => e.id === editingEmenta.id ? { ...e, titulo: eTitulo, categoria: eCategoria, texto: eTexto } : e));
    } else {
      setEmentas(prev => [...prev, { id: Date.now().toString(), titulo: eTitulo, categoria: eCategoria, texto: eTexto, criadoEm: new Date().toLocaleDateString("pt-BR") }]);
    }
    setETitulo(""); setECategoria(""); setETexto(""); setEditingEmenta(null); setShowEmentaForm(false);
  };

  const editEmenta = (e: Ementa) => { setEditingEmenta(e); setETitulo(e.titulo); setECategoria(e.categoria); setETexto(e.texto); setShowEmentaForm(true); };
  const deleteEmenta = (id: string) => { if (confirm("Excluir ementa?")) setEmentas(prev => prev.filter(e => e.id !== id)); setSelectedEmentas(prev => { const n = new Set(prev); n.delete(id); return n; }); };
  const toggleEmenta = (id: string) => setSelectedEmentas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ─── Custom action CRUD ───────────────────────────────────────────────────
  const saveCustomAction = () => {
    if (!caLabel.trim() || !caPrompt.trim()) { alert("Preencha nome e prompt."); return; }
    if (editingCustom) {
      setCustomActions(prev => prev.map(a => a.id === editingCustom.id ? { ...a, label: caLabel, descricao: caDesc, prompt: caPrompt } : a));
    } else {
      setCustomActions(prev => [...prev, { id: Date.now().toString(), label: caLabel, descricao: caDesc, prompt: caPrompt }]);
    }
    setCaLabel(""); setCaDesc(""); setCaPrompt(""); setEditingCustom(null); setShowCustomForm(false);
  };

  // ─── Styles ───────────────────────────────────────────────────────────────
  const S = {
    page:    { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" as const },
    header:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #21262d", background: "#161b22", flexShrink: 0 as const },
    tabs:    { display: "flex", gap: 4, padding: "6px 12px", borderBottom: "1px solid #21262d", background: "#161b22", flexShrink: 0 as const, overflowX: "auto" as const },
    body:    { flex: 1, overflowY: "auto" as const, padding: 16, display: "flex", flexDirection: "column" as const, gap: 12 },
    card:    { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px" },
    btn:     (active?: boolean) => ({ padding: "6px 14px", borderRadius: 8, border: "1px solid #30363d", background: active ? "#238636" : "#21262d", color: active ? "#fff" : "#c9d1d9", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }),
    input:   { width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: "8px 12px", color: "#c9d1d9", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
    tabBtn:  (active: boolean) => ({ padding: "5px 12px", borderRadius: 6, border: "none", background: active ? "#238636" : "transparent", color: active ? "#fff" : "#8b949e", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }),
    modeBtn: (active: boolean, color: string, border: string) => ({ flex: 1, padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${active ? border : "#30363d"}`, background: active ? color : "#0d1117", color: active ? "#fff" : "#8b949e", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" as const, transition: "all 0.15s" }),
    actionBtn: (active: boolean) => ({ padding: "7px 10px", borderRadius: 8, border: `1px solid ${active ? "#238636" : "#30363d"}`, background: active ? "#0d4420" : "#161b22", color: active ? "#3fb950" : "#8b949e", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" as const }),
  };

  const effortInfo = EFFORT_LABELS[effortLevel];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* HEADER */}
      <div style={S.header}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <Scale size={18} color="#3fb950" />
        <span style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3" }}>Assistente Jurídico Pro</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#8b949e" }}>Maikon Caldeira — OAB/MG 183712</span>
        <button onClick={() => setShowConfig(v => !v)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }} title="Configurações de API">
          <Key size={16} />
        </button>
        <button onClick={() => { setTtsOn(v => !v); if (ttsOn) stopSpeaking(); }} style={{ background: "none", border: "none", color: ttsOn ? "#3fb950" : "#8b949e", cursor: "pointer" }}>
          {ttsOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button onClick={() => setShowVoicePanel(v => !v)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}>
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* CONFIG PANEL */}
      {showConfig && (
        <div style={{ ...S.card, margin: "8px 16px", borderColor: "#388bfd" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>🔑 Chave de API</span>
            <button onClick={() => setShowConfig(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={14} /></button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} type={showKey ? "text" : "password"}
                placeholder="gsk_... (Groq) · sk-... · AIza... (Gemini) · sk-or-... (OpenRouter)"
                style={S.input} />
            </div>
            <button onClick={() => setShowKey(v => !v)} style={S.btn()}>{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
          {detectProvider(apiKey) && (
            <div style={{ fontSize: 11, color: "#3fb950", marginBottom: 6 }}>
              ✅ Provedor detectado automaticamente
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="URL base (deixe em branco = automático)"
              style={{ ...S.input, flex: 1, fontSize: 12 }} />
            <input value={apiModel} onChange={e => setApiModel(e.target.value)} placeholder="Modelo (ex: llama-3.3-70b-versatile)"
              style={{ ...S.input, flex: 1, fontSize: 12 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="Apelido para salvar"
              style={{ ...S.input, flex: 1, fontSize: 12, minWidth: 100 }} />
            <button onClick={saveCurrentKey} style={S.btn()}><Save size={13} /> Salvar Chave</button>
            <button onClick={() => setShowSavedKeys(v => !v)} style={S.btn(showSavedKeys)}>
              {showSavedKeys ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Salvas ({savedKeys.length})
            </button>
          </div>
          {showSavedKeys && savedKeys.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {savedKeys.map(sk => (
                <div key={sk.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0d1117", borderRadius: 6, padding: "6px 10px" }}>
                  <span style={{ flex: 1, fontSize: 12 }}>{sk.label} <span style={{ color: "#8b949e" }}>({sk.provider})</span></span>
                  <button onClick={() => { setApiKey(sk.key); setApiUrl(sk.url); setApiModel(sk.model); setShowSavedKeys(false); }}
                    style={{ ...S.btn(), fontSize: 11, padding: "3px 8px" }}>Usar</button>
                  <button onClick={() => setSavedKeys(prev => prev.filter(s => s.id !== sk.id))}
                    style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: "#8b949e" }}>
            💡 Groq gratuito: <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: "#388bfd" }}>console.groq.com</a>
          </div>
        </div>
      )}

      {/* TTS PANEL */}
      {showVoicePanel && (
        <div style={{ ...S.card, margin: "4px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>🔊 Voz (TTS)</span>
            <button onClick={() => setShowVoicePanel(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={14} /></button>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>Velocidade: {ttsConfig.rate.toFixed(2)}x</div>
              <input type="range" min="0.5" max="2" step="0.05" value={ttsConfig.rate}
                onChange={e => applyTTS({ rate: parseFloat(e.target.value) })}
                style={{ width: "100%", accentColor: "#3fb950" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>Tom: {ttsConfig.pitch.toFixed(2)}</div>
              <input type="range" min="0.5" max="2" step="0.05" value={ttsConfig.pitch}
                onChange={e => applyTTS({ pitch: parseFloat(e.target.value) })}
                style={{ width: "100%", accentColor: "#3fb950" }} />
            </div>
          </div>
          {voiceList.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>Voz (pt-BR preferida):</div>
              <select value={ttsConfig.voiceName} onChange={e => applyTTS({ voiceName: e.target.value })}
                style={{ ...S.input, fontSize: 12 }}>
                <option value="">Automático</option>
                {voiceList.filter(v => v.lang.startsWith("pt")).map(v => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* TABS */}
      <div style={S.tabs}>
        {([
          ["processar", "⚖ Processar"],
          ["ementas",   `📚 Ementas (${ementas.length})`],
          ["historico", `🕐 Histórico (${history.length})`],
          ["acoes",     `⚡ Ações (${customActions.length})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} style={S.tabBtn(tab === t)} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      <div style={S.body}>

        {/* ══ ABA PROCESSAR ══ */}
        {tab === "processar" && (
          <>
            {/* ESFORÇO */}
            <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#8b949e" }}>Esforço:</span>
                <span style={{ fontWeight: 700, color: effortInfo.color, fontSize: 13 }}>
                  {effortInfo.label}
                </span>
                <span style={{ fontSize: 11, color: "#8b949e" }}>— {effortInfo.desc}</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={effortLevel}
                onChange={e => setEffortLevel(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: effortInfo.color }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8b949e", marginTop: 2 }}>
                <span>Rápido</span><span>Básico</span><span>Detalhado</span><span>Profundo</span><span>Exaustivo</span>
              </div>
            </div>

            {/* CAMPO DE TEXTO */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#8b949e" }}>Texto do documento:</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={toggleVoice}
                    style={{ ...S.btn(isListening), background: isListening ? "#f85149" : "#21262d", borderColor: isListening ? "#f85149" : "#30363d" }}>
                    {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                    {isListening ? "Parar" : "Ditar"}
                  </button>
                  {inputText && (
                    <button onClick={() => { if (confirm("Limpar texto?")) setInputText(""); }}
                      style={{ ...S.btn(), color: "#f85149", borderColor: "#f85149" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder="Cole aqui a petição, sentença, contrato, decisão ou qualquer texto jurídico para processar..."
                style={{ ...S.input, minHeight: 220, maxHeight: 480, resize: "vertical", lineHeight: 1.7 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#8b949e" }}>
                <span>{inputText.length.toLocaleString()} chars · {inputText.split(/\s+/).filter(Boolean).length} palavras</span>
                <button onClick={() => setShowJuris(v => !v)}
                  style={{ background: "none", border: "none", color: "#388bfd", cursor: "pointer", fontSize: 11 }}>
                  {showJuris ? "▲" : "▼"} Jurisprudência / Ementas
                </button>
              </div>

              {showJuris && (
                <textarea
                  value={jurisText} onChange={e => setJurisText(e.target.value)}
                  placeholder="Cole aqui jurisprudência, súmulas ou precedentes para usar como fundamento..."
                  style={{ ...S.input, marginTop: 8, minHeight: 100, resize: "vertical", fontSize: 13, borderColor: "#388bfd" }}
                />
              )}
            </div>

            {/* 3 MODOS PRINCIPAIS */}
            <div>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>Modos principais:</div>
              <div style={{ display: "flex", gap: 8 }}>
                {MODES.map(m => (
                  <button key={m.id}
                    onClick={() => !isLoading && runAction(m.id)}
                    disabled={isLoading}
                    style={S.modeBtn(activeMode === m.id, m.color, m.border)}>
                    {isLoading && activeMode === m.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} /> : null}
                    {" "}{m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AÇÕES RÁPIDAS */}
            <div>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>Ações rápidas:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ACTIONS.map(a => (
                  <button key={a.id} onClick={() => !isLoading && runAction(a.id)} disabled={isLoading}
                    style={S.actionBtn(activeMode === a.id)}>
                    {isLoading && activeMode === a.id ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} /> : null}
                    {a.label}
                  </button>
                ))}
                {customActions.map(a => (
                  <button key={a.id} onClick={() => !isLoading && runAction(a.id, a.prompt)} disabled={isLoading}
                    style={{ ...S.actionBtn(activeMode === a.id), borderColor: "#8b5cf6" }}>
                    ⚡ {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* EMENTAS SELECIONADAS */}
            {selectedEmentas.size > 0 && (
              <div style={{ ...S.card, borderColor: "#388bfd" }}>
                <div style={{ fontSize: 11, color: "#388bfd", marginBottom: 4 }}>
                  📚 {selectedEmentas.size} ementa(s) selecionada(s) como contexto jurisprudencial
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {ementas.filter(e => selectedEmentas.has(e.id)).map(e => (
                    <span key={e.id} style={{ background: "#0d2235", border: "1px solid #388bfd", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>
                      {e.titulo} <button onClick={() => toggleEmenta(e.id)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STOP */}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => { abortRef.current?.abort(); setIsLoading(false); setActiveMode(null); }}
                  style={{ ...S.btn(), background: "#3d1f1f", borderColor: "#f85149", color: "#f85149" }}>
                  <StopCircle size={14} /> Parar
                </button>
              </div>
            )}

            {/* RESULTADO */}
            {(result || isLoading) && (
              <div style={{ ...S.card, borderColor: "#3fb950" }} ref={resultRef}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#3fb950" }}>⚖ Resultado</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={copyResult} style={S.btn(copied)}>
                      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado!" : "Copiar"}
                    </button>
                    <button onClick={downloadTxt} style={S.btn()}>
                      <Download size={13} /> .txt
                    </button>
                    <button onClick={() => { setShowChat(v => !v); }} style={S.btn(showChat)}>
                      <MessageSquare size={13} /> Refinar
                    </button>
                    <button onClick={() => { if (ttsOn) stopSpeaking(); else { speak(cleanForSpeech(result), { ...ttsConfig, enabled: true }); } setTtsOn(v => !v); }}
                      style={{ ...S.btn(), color: ttsOn ? "#3fb950" : "#8b949e" }}>
                      {ttsOn ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                  </div>
                </div>
                {isLoading ? (
                  <div style={{ display: "flex", gap: 8, color: "#3fb950", alignItems: "center" }}>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 13 }}>Processando ({EFFORT_LABELS[effortLevel]?.label})...</span>
                  </div>
                ) : (
                  <LegalText text={result} />
                )}
              </div>
            )}

            {/* CHAT DE REFINAMENTO */}
            {showChat && result && (
              <div style={S.card}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                  <MessageSquare size={14} style={{ display: "inline", marginRight: 4 }} /> Refinar resultado
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {chatHistory.map((m, i) => (
                    <div key={i} style={{ background: m.role === "assistant" ? "#0d2218" : "#1a1f27", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: m.role === "assistant" ? "#3fb950" : "#8b949e", fontSize: 11 }}>
                        {m.role === "assistant" ? "⚖ IA" : "👤 Você"}
                      </span>
                      <div style={{ marginTop: 4, lineHeight: 1.6 }}>{m.content}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                    placeholder="Ex: Adicione mais fundamentos legais... Simplifique o segundo parágrafo..."
                    style={{ ...S.input, flex: 1 }} />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={S.btn()}>
                    {chatLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ ABA EMENTAS ══ */}
        {tab === "ementas" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8b949e" }} />
                <input value={ementaSearch} onChange={e => setEmentaSearch(e.target.value)}
                  placeholder="Buscar ementas..."
                  style={{ ...S.input, paddingLeft: 30 }} />
              </div>
              <button onClick={() => { setEditingEmenta(null); setETitulo(""); setECategoria(""); setETexto(""); setShowEmentaForm(v => !v); }}
                style={S.btn(showEmentaForm)}>
                <Plus size={13} /> Nova
              </button>
            </div>

            {showEmentaForm && (
              <div style={S.card}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{editingEmenta ? "Editar" : "Nova"} Ementa</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={eTitulo} onChange={e => setETitulo(e.target.value)} placeholder="Título (ex: STJ - Juros abusivos)"
                    style={{ ...S.input, flex: 2 }} />
                  <input value={eCategoria} onChange={e => setECategoria(e.target.value)} placeholder="Categoria"
                    style={{ ...S.input, flex: 1 }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {CATEGORIAS_SUGERIDAS.map(c => (
                    <button key={c} onClick={() => setECategoria(c)}
                      style={{ padding: "2px 8px", borderRadius: 20, border: "1px solid #30363d", background: eCategoria === c ? "#238636" : "transparent", color: eCategoria === c ? "#fff" : "#8b949e", fontSize: 11, cursor: "pointer" }}>
                      {c}
                    </button>
                  ))}
                </div>
                <textarea value={eTexto} onChange={e => setETexto(e.target.value)}
                  placeholder="Texto completo da ementa/jurisprudência..."
                  style={{ ...S.input, minHeight: 120, resize: "vertical", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveEmenta} style={S.btn(true)}><Save size={13} /> Salvar</button>
                  <button onClick={() => setShowEmentaForm(false)} style={S.btn()}><X size={13} /> Cancelar</button>
                </div>
              </div>
            )}

            {ementas.filter(e => !ementaSearch || e.titulo.toLowerCase().includes(ementaSearch.toLowerCase()) || e.texto.toLowerCase().includes(ementaSearch.toLowerCase())).length === 0 && (
              <div style={{ textAlign: "center", color: "#8b949e", padding: "32px 0", fontSize: 13 }}>
                <BookOpen size={32} style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                Nenhuma ementa. Clique em "+ Nova" para adicionar jurisprudência.
              </div>
            )}

            {ementas
              .filter(e => !ementaSearch || e.titulo.toLowerCase().includes(ementaSearch.toLowerCase()) || e.texto.toLowerCase().includes(ementaSearch.toLowerCase()))
              .map(e => (
                <div key={e.id} style={{ ...S.card, borderColor: selectedEmentas.has(e.id) ? "#388bfd" : "#30363d" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#e6edf3", marginBottom: 2 }}>{e.titulo}</div>
                      <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>{e.categoria} · {e.criadoEm}</div>
                      <div style={{ fontSize: 12, color: "#c9d1d9", lineHeight: 1.6, maxHeight: 80, overflow: "hidden" }}>{e.texto}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginLeft: 8, flexShrink: 0 }}>
                      <button onClick={() => toggleEmenta(e.id)}
                        style={{ ...S.btn(selectedEmentas.has(e.id)), fontSize: 11, padding: "4px 8px" }}>
                        {selectedEmentas.has(e.id) ? <Check size={12} /> : <Plus size={12} />}
                        {selectedEmentas.has(e.id) ? "Selecionada" : "Usar"}
                      </button>
                      <button onClick={() => editEmenta(e)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><Pencil size={14} /></button>
                      <button onClick={() => deleteEmenta(e.id)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {e.texto.length > 200 && (
                    <button onClick={() => setInputText(e.texto)}
                      style={{ marginTop: 6, background: "none", border: "none", color: "#388bfd", cursor: "pointer", fontSize: 11 }}>
                      → Enviar para processamento
                    </button>
                  )}
                </div>
              ))}
          </>
        )}

        {/* ══ ABA HISTÓRICO ══ */}
        {tab === "historico" && (
          <>
            {history.length === 0 && (
              <div style={{ textAlign: "center", color: "#8b949e", padding: "32px 0", fontSize: 13 }}>
                <Clock size={32} style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                Nenhum histórico ainda. Processe um documento para começar.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {history.length > 0 && (
                <button onClick={() => { if (confirm("Limpar todo o histórico?")) setHistory([]); }}
                  style={{ ...S.btn(), color: "#f85149", borderColor: "#f85149", fontSize: 12 }}>
                  <Trash2 size={12} /> Limpar Histórico
                </button>
              )}
            </div>
            {history.map(h => (
              <div key={h.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#3fb950" }}>{h.acao}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#8b949e" }}>{h.timestamp}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setInputText(h.resultado)} style={{ ...S.btn(), fontSize: 11, padding: "3px 8px" }}>
                      <FileText size={12} /> Usar resultado
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(h.resultado); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>
                  Entrada: <em>"{h.inputSnippet}{h.inputSnippet.length >= 120 ? "..." : ""}"</em>
                </div>
                <div style={{ fontSize: 12, color: "#c9d1d9", maxHeight: 100, overflow: "hidden", lineHeight: 1.6 }}>
                  {h.resultado.substring(0, 300)}{h.resultado.length > 300 ? "..." : ""}
                </div>
                <button onClick={() => { setResult(h.resultado); setTab("processar"); }}
                  style={{ marginTop: 6, background: "none", border: "none", color: "#388bfd", cursor: "pointer", fontSize: 11 }}>
                  → Ver resultado completo
                </button>
              </div>
            ))}
          </>
        )}

        {/* ══ ABA AÇÕES CUSTOMIZADAS ══ */}
        {tab === "acoes" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: 13, color: "#8b949e" }}>Crie ações personalizadas com seus próprios prompts</span>
              <button onClick={() => { setEditingCustom(null); setCaLabel(""); setCaDesc(""); setCaPrompt(""); setShowCustomForm(v => !v); }}
                style={S.btn(showCustomForm)}>
                <Plus size={13} /> Nova Ação
              </button>
            </div>

            {showCustomForm && (
              <div style={S.card}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{editingCustom ? "Editar" : "Nova"} Ação</div>
                <input value={caLabel} onChange={e => setCaLabel(e.target.value)} placeholder="Nome da ação (ex: Analisar Recurso)"
                  style={{ ...S.input, marginBottom: 6 }} />
                <input value={caDesc} onChange={e => setCaDesc(e.target.value)} placeholder="Descrição breve (opcional)"
                  style={{ ...S.input, marginBottom: 6, fontSize: 13 }} />
                <textarea value={caPrompt} onChange={e => setCaPrompt(e.target.value)}
                  placeholder="Prompt completo do sistema. Ex: 'Você é um especialista em recursos trabalhistas. Analise o texto e...'"
                  style={{ ...S.input, minHeight: 140, resize: "vertical", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveCustomAction} style={S.btn(true)}><Save size={13} /> Salvar</button>
                  <button onClick={() => setShowCustomForm(false)} style={S.btn()}><X size={13} /> Cancelar</button>
                </div>
              </div>
            )}

            {customActions.length === 0 && (
              <div style={{ textAlign: "center", color: "#8b949e", padding: "32px 0", fontSize: 13 }}>
                Nenhuma ação customizada. Crie uma com seu próprio prompt jurídico.
              </div>
            )}

            {customActions.map(a => (
              <div key={a.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#8b5cf6" }}>⚡ {a.label}</div>
                    {a.descricao && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{a.descricao}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setTab("processar"); runAction(a.id, a.prompt); }}
                      style={{ ...S.btn(), fontSize: 11 }}>▶ Executar</button>
                    <button onClick={() => { setEditingCustom(a); setCaLabel(a.label); setCaDesc(a.descricao); setCaPrompt(a.prompt); setShowCustomForm(true); }}
                      style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm("Excluir?")) setCustomActions(prev => prev.filter(x => x.id !== a.id)); }}
                      style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6, maxHeight: 60, overflow: "hidden" }}>
                  {a.prompt.substring(0, 200)}{a.prompt.length > 200 ? "..." : ""}
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}
