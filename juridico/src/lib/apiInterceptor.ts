/**
 * Interceptor offline — captura fetch("/api/...") e serve respostas locais.
 * IA chama OpenAI/Gemini/Perplexity/Custom diretamente do browser.
 * Timeout: 2 minutos (120s).
 */

const TIMEOUT_MS = 120_000;

const SYSTEM_PROMPTS: Record<string, string> = {
  corrigir: "Você é um revisor jurídico especializado no direito brasileiro. Corrija o texto mantendo o sentido jurídico original, corrigindo erros gramaticais, ortográficos e de estilo. Retorne apenas o texto corrigido, sem explicações.",
  redacao: "Você é um advogado experiente especializado no direito brasileiro. Reescreva o texto com linguagem jurídica formal, técnica e precisa, adequada para petições e documentos oficiais.",
  lacunas: "Você é um advogado especialista em análise contratual. Analise o texto jurídico e identifique lacunas, inconsistências, cláusulas ambíguas e possíveis riscos jurídicos. Liste cada problema encontrado com explicação detalhada.",
  resumir: "Você é um assistente jurídico. Faça um resumo executivo conciso do texto, destacando: partes envolvidas, pedidos principais, fundamentos legais e decisões relevantes.",
  revisar: "Você é um revisor jurídico sênior. Revise o texto apontando problemas técnico-jurídicos, inconsistências processuais e sugestões de melhoria com fundamento legal.",
  analisar: "Você é um analista jurídico sênior. Faça uma análise profunda identificando: fundamentos legais aplicáveis, jurisprudência relevante, pontos fortes e fracos, e estratégias recomendadas.",
  gerar_minuta: "Você é um advogado especialista. Com base nas informações fornecidas, gere uma minuta jurídica completa, formal e tecnicamente precisa, seguindo as normas do direito brasileiro.",
  linguagem_simples: "Você é um comunicador jurídico. Reescreva o texto jurídico em linguagem simples e acessível para leigos, mantendo a precisão das informações.",
  refinar: "Você é um advogado experiente. Refine o texto tornando-o mais persuasivo, técnico e juridicamente sólido, sem alterar o sentido original.",
  chat: "Você é um assistente jurídico especializado no direito brasileiro. Responda de forma clara, precisa e bem fundamentada. Cite legislação e jurisprudência quando relevante.",
  jurisprudencia: "Você é um pesquisador jurídico especializado em jurisprudência brasileira. Busque e analise precedentes relevantes, citando tribunais, números de processos quando conhecidos, e teses jurídicas aplicáveis.",
  previdenciario: "Você é um especialista em direito previdenciário brasileiro. Analise o caso com base na legislação da Previdência Social, INSS, aposentadoria e benefícios.",
  trabalhista: "Você é um especialista em direito trabalhista brasileiro (CLT, TST). Analise o caso com base na legislação trabalhista vigente.",
  default: "Você é um assistente jurídico especializado no direito brasileiro com amplo conhecimento em legislação, jurisprudência e doutrina. Responda de forma técnica e precisa.",
};

function getSystemPrompt(action?: string): string {
  if (!action) return SYSTEM_PROMPTS.default;
  const key = action.toLowerCase().replace(/[^a-z_]/g, "");
  return SYSTEM_PROMPTS[key] || SYSTEM_PROMPTS.default;
}

function getStoredKeys() {
  return {
    openaiKey: localStorage.getItem("sk_api_key") || localStorage.getItem("openai_api_key") || "",
    geminiKey: localStorage.getItem("sk_gemini_key") || localStorage.getItem("gemini_api_key") || "",
    perplexityKey: localStorage.getItem("sk_perplexity_key") || localStorage.getItem("perplexity_api_key") || "",
    customKey: localStorage.getItem("custom_api_key") || "",
    customUrl: localStorage.getItem("custom_api_url") || "",
    customModel: localStorage.getItem("custom_api_model") || "",
    model: localStorage.getItem("legal_model_choice") || localStorage.getItem("sk_model") || "gpt-4o",
  };
}

function isGeminiModel(m: string) { return m.startsWith("gemini"); }
function isPerplexityModel(m: string) { return m.startsWith("sonar") || m.startsWith("llama") || m.startsWith("pplx"); }
function isPremiumModel(m: string) { return m === "premium"; }
function isCustomModel(m: string) { return m === "custom" || m === "demo"; }

async function callAI(
  text: string,
  systemPrompt: string,
  payload: Record<string, unknown>,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  const stored = getStoredKeys();

  // Resolve modelo e chave
  let model = (payload.customModel as string) || stored.model;
  let apiKey = "";
  let baseUrl = "";

  // Custom/Groq/OpenRouter
  if (isCustomModel(model) || payload.customKey) {
    apiKey = (payload.customKey as string) || stored.customKey;
    baseUrl = (payload.customUrl as string) || stored.customUrl || "https://api.openai.com/v1";
    model = (payload.customModel as string) || stored.customModel || "llama-3.3-70b-versatile";
    if (!apiKey) throw new Error("Configure a chave do provedor custom em Configurações → Custom/Groq.");
  }
  // Perplexity
  else if (isPerplexityModel(model) || payload.perplexityKey) {
    apiKey = (payload.perplexityKey as string) || stored.perplexityKey;
    if (!apiKey) throw new Error("Configure a chave Perplexity em Configurações → Perplexity API Key.");
    baseUrl = "https://api.perplexity.ai";
    if (isPerplexityModel(model) === false) model = "sonar";
  }
  // Gemini
  else if (isGeminiModel(model)) {
    apiKey = stored.geminiKey;
    if (!apiKey) throw new Error("Configure a chave Gemini em Configurações → Gemini API Key.");
  }
  // OpenAI (premium = gpt-4o, standard = gpt-4o-mini)
  else {
    if (isPremiumModel(model)) model = "gpt-4o";
    if (model === "standard") model = "gpt-4o-mini";
    apiKey = stored.openaiKey;
    if (!apiKey) throw new Error("Configure sua chave OpenAI em Configurações → Chave de API.");
  }

  // ── Gemini ──────────────────────────────────────────────────────────────────
  if (isGeminiModel(model)) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
        signal,
      }
    );
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.error?.message || `Erro Gemini ${res.status}`);
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    onChunk(content);
    return;
  }

  // ── OpenAI-compatible (OpenAI, Groq, OpenRouter, Perplexity, Custom) ────────
  const endpoint = isPerplexityModel(model)
    ? "https://api.perplexity.ai/chat/completions"
    : baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/chat/completions`
      : "https://api.openai.com/v1/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } })) as any;
    throw new Error(err.error?.message || `Erro ${res.status}`);
  }

  // Streaming SSE
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Sem reader no streaming");
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        const j = JSON.parse(raw);
        const chunk = j.choices?.[0]?.delta?.content || "";
        if (chunk) onChunk(chunk);
      } catch { }
    }
  }
}

// ── SSE Response builder ─────────────────────────────────────────────────────

function sseResponse(
  handler: (emit: (data: object) => void, done: () => void, error: (msg: string) => void) => void
): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encode = (data: object) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      const finish = () => { try { controller.close(); } catch { } };
      const err = (msg: string) => {
        encode({ error: msg });
        finish();
      };
      try { handler(encode, finish, err); } catch (e: any) { err(e?.message || "Erro"); }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── LocalStorage KV para simular banco ──────────────────────────────────────

function kvGet<T>(key: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? def; } catch { return def; }
}
function kvSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
}

let _historyId = parseInt(localStorage.getItem("_hist_id") || "1");
function nextId() { _historyId++; localStorage.setItem("_hist_id", String(_historyId)); return _historyId; }

// ── Route handlers ───────────────────────────────────────────────────────────

async function handleAiProcess(req: Request): Promise<Response> {
  const body = await req.json() as Record<string, unknown>;
  const text = (body.text as string) || "";
  const action = (body.action as string) || "chat";
  const systemPrompt = getSystemPrompt(action);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  return sseResponse((emit, done, error) => {
    emit({ status: "Processando com IA..." });
    callAI(text, systemPrompt, body, (chunk) => emit({ content: chunk }), controller.signal)
      .then(() => { clearTimeout(timer); done(); })
      .catch((e: any) => {
        clearTimeout(timer);
        if (e?.name === "AbortError") error("Tempo esgotado (2 min). Tente um texto menor ou aguarde.");
        else error(e?.message || "Erro ao chamar IA");
      });
  });
}

function handleAiHistory(_req: Request, method: string, body?: Record<string, unknown>): Response {
  if (method === "GET") {
    return jsonResponse(kvGet<unknown[]>("ai_history", []));
  }
  if (method === "POST" && body) {
    const history = kvGet<unknown[]>("ai_history", []);
    const item = { id: nextId(), ...body, createdAt: new Date().toISOString() };
    history.unshift(item);
    if (history.length > 200) history.splice(200);
    kvSet("ai_history", history);
    return jsonResponse(item, 201);
  }
  if (method === "DELETE") {
    kvSet("ai_history", []);
    return jsonResponse({ ok: true });
  }
  return jsonResponse([]);
}

function handleSnippets(_req: Request, method: string, id?: string, body?: Record<string, unknown>): Response {
  const snippets = kvGet<any[]>("snippets", []);
  if (method === "GET") return jsonResponse(snippets);
  if (method === "POST" && body) {
    const item = { id: String(nextId()), ...body, createdAt: new Date().toISOString() };
    snippets.unshift(item);
    kvSet("snippets", snippets);
    return jsonResponse(item, 201);
  }
  if (method === "PATCH" && id && body) {
    const i = snippets.findIndex(s => s.id === id);
    if (i >= 0) { snippets[i] = { ...snippets[i], ...body }; kvSet("snippets", snippets); return jsonResponse(snippets[i]); }
  }
  if (method === "DELETE" && id) {
    const filtered = snippets.filter(s => s.id !== id);
    kvSet("snippets", filtered);
    return jsonResponse({ ok: true });
  }
  return jsonResponse([]);
}

function handleSettings(path: string, method: string, body?: Record<string, unknown>): Response {
  if (path.includes("ai-config") || path.includes("status")) {
    const openaiKey = localStorage.getItem("sk_api_key") || "";
    const geminiKey = localStorage.getItem("sk_gemini_key") || "";
    const perplexityKey = localStorage.getItem("sk_perplexity_key") || "";
    const customKey = localStorage.getItem("custom_api_key") || "";
    return jsonResponse({
      hasOpenai: !!openaiKey,
      hasGemini: !!geminiKey,
      hasPerplexity: !!perplexityKey,
      hasDemo: !!customKey,
      hasCustom: !!customKey,
      model: localStorage.getItem("legal_model_choice") || "premium",
      demoUrl: localStorage.getItem("custom_api_url") || "",
      demoModel: localStorage.getItem("custom_api_model") || "",
    });
  }
  if (path.includes("env-set") && method === "POST" && body) {
    if (body.key && body.value) localStorage.setItem(String(body.key), String(body.value));
    return jsonResponse({ ok: true });
  }
  if (path.includes("env-list")) {
    const keys = ["sk_api_key","sk_gemini_key","sk_perplexity_key","custom_api_key","custom_api_url","custom_api_model"];
    const vars = keys.map(k => ({ key: k, value: localStorage.getItem(k) ? "***" : "" })).filter(v => v.value);
    return jsonResponse({ vars });
  }
  if (method === "POST" && body) {
    const config = kvGet<Record<string,unknown>>("app_config", {});
    Object.assign(config, body);
    kvSet("app_config", config);
    return jsonResponse({ ok: true });
  }
  return jsonResponse(kvGet("app_config", {}));
}

function handleDb(path: string, method: string, body?: Record<string, unknown>): Response {
  if (path.includes("status")) return jsonResponse({ connected: false, error: "Use Neon DB direto pelo browser — sem servidor." });
  if (path.includes("tables")) return jsonResponse({ ok: false, error: "Sem banco servidor. Use localStorage." });
  if (path.includes("query") || path.includes("admin")) return jsonResponse({ ok: false, error: "Banco local apenas. Configure Neon em Configurações." });
  return jsonResponse({ ok: false, error: "Offline" });
}

function handleCustomActions(method: string, body?: Record<string, unknown>): Response {
  const actions = kvGet<any[]>("custom_actions", []);
  if (method === "GET") return jsonResponse(actions);
  if (method === "POST" && body) {
    const item = { id: String(nextId()), ...body };
    actions.unshift(item);
    kvSet("custom_actions", actions);
    return jsonResponse(item, 201);
  }
  return jsonResponse(actions);
}

function handleEmentas(method: string, body?: Record<string, unknown>): Response {
  const ementas = kvGet<any[]>("ementas", []);
  if (method === "GET") return jsonResponse(ementas);
  if (method === "POST" && body) {
    const item = { id: nextId(), ...body, createdAt: new Date().toISOString() };
    ementas.unshift(item);
    kvSet("ementas", ementas);
    return jsonResponse(item, 201);
  }
  return jsonResponse(ementas);
}

function handlePromptTemplates(method: string, id?: string, body?: Record<string, unknown>): Response {
  const templates = kvGet<any[]>("prompt_templates", []);
  if (method === "GET") return jsonResponse(templates);
  if (method === "POST" && body) {
    const item = { id: String(nextId()), ...body };
    templates.unshift(item);
    kvSet("prompt_templates", templates);
    return jsonResponse(item, 201);
  }
  if (method === "PATCH" && id && body) {
    const i = templates.findIndex(t => t.id === id);
    if (i >= 0) { templates[i] = { ...templates[i], ...body }; kvSet("prompt_templates", templates); return jsonResponse(templates[i]); }
  }
  if (method === "DELETE" && id) {
    kvSet("prompt_templates", templates.filter(t => t.id !== id));
    return jsonResponse({ ok: true });
  }
  return jsonResponse(templates);
}

function handleDocTemplates(method: string, id?: string, body?: Record<string, unknown>): Response {
  const templates = kvGet<any[]>("doc_templates", []);
  if (method === "GET") return jsonResponse(templates);
  if (method === "POST" && body) {
    const item = { id: String(nextId()), ...body };
    templates.unshift(item);
    kvSet("doc_templates", templates);
    return jsonResponse(item, 201);
  }
  if (method === "PATCH" && id && body) {
    const i = templates.findIndex(t => t.id === id);
    if (i >= 0) { templates[i] = { ...templates[i], ...body }; kvSet("doc_templates", templates); return jsonResponse(templates[i]); }
  }
  if (method === "DELETE" && id) {
    kvSet("doc_templates", templates.filter(t => t.id !== id));
    return jsonResponse({ ok: true });
  }
  return jsonResponse(templates);
}

// ── Main interceptor ─────────────────────────────────────────────────────────

const originalFetch = window.fetch.bind(window);

async function interceptedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

  // Só intercepta chamadas /api/
  if (!url.startsWith("/api/") && !url.includes("/api/")) {
    return originalFetch(input, init);
  }

  const path = url.split("?")[0];

  // Parse body se existir
  let body: Record<string, unknown> | undefined;
  if (init?.body && typeof init.body === "string") {
    try { body = JSON.parse(init.body); } catch { }
  } else if (input instanceof Request && method !== "GET") {
    try { body = await input.clone().json(); } catch { }
  }

  // Extrai ID de URLs como /api/snippets/123
  const idMatch = path.match(/\/api\/\w+[-\w]*\/(\d+|[a-zA-Z0-9_-]+)$/);
  const resourceId = idMatch?.[1];

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path.includes("/api/auth")) {
    return jsonResponse({ authenticated: true, passwordRequired: false, user: { name: "Maikon Caldeira", role: "admin" } });
  }

  // ── AI Process (streaming) ────────────────────────────────────────────────
  if (path.includes("/api/ai/process") && method === "POST") {
    const req = input instanceof Request ? input : new Request(url, init);
    return handleAiProcess(req);
  }

  // ── Python run via IA ─────────────────────────────────────────────────────
  if (path.includes("/api/run-python") && method === "POST") {
    const code = body?.code as string || "";
    const systemP = "Você é um interpretador Python. Execute mentalmente o código Python fornecido e retorne apenas o output que seria impresso no terminal (stdout). Se houver erro, retorne a mensagem de erro como o Python retornaria. Não adicione explicações — apenas o output puro.";
    return sseResponse((emit, done, error) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      callAI(code, systemP, {}, (chunk) => emit({ output: chunk }), ctrl.signal)
        .then(() => { clearTimeout(t); done(); })
        .catch((e: any) => { clearTimeout(t); error(e?.message || "Erro"); });
    });
  }

  // ── TTS (não disponível offline) ──────────────────────────────────────────
  if (path.includes("/api/tts") || path.includes("/api/voice")) {
    return jsonResponse({ error: "TTS não disponível offline" }, 501);
  }

  // ── AI History ────────────────────────────────────────────────────────────
  if (path.includes("/api/ai-history")) {
    const req = input instanceof Request ? input : new Request(url, init);
    return handleAiHistory(req, method, body);
  }

  // ── Snippets ──────────────────────────────────────────────────────────────
  if (path.includes("/api/snippets")) {
    const req = input instanceof Request ? input : new Request(url, init);
    return handleSnippets(req, method, resourceId, body);
  }

  // ── Custom Actions ────────────────────────────────────────────────────────
  if (path.includes("/api/custom-actions")) {
    return handleCustomActions(method, body);
  }

  // ── Ementas ───────────────────────────────────────────────────────────────
  if (path.includes("/api/ementas")) {
    return handleEmentas(method, body);
  }

  // ── Prompt Templates ──────────────────────────────────────────────────────
  if (path.includes("/api/prompt-templates")) {
    return handlePromptTemplates(method, resourceId, body);
  }

  // ── Doc Templates ─────────────────────────────────────────────────────────
  if (path.includes("/api/doc-templates")) {
    return handleDocTemplates(method, resourceId, body);
  }

  // ── Settings / Config ─────────────────────────────────────────────────────
  if (path.includes("/api/settings") || path.includes("/api/config") || path.includes("/api/demo-key")) {
    return handleSettings(path, method, body);
  }

  // ── Database ──────────────────────────────────────────────────────────────
  if (path.includes("/api/db") || path.includes("/api/database") || path.includes("/api/sql") || path.includes("/api/admin")) {
    return handleDb(path, method, body);
  }

  // ── Integrações (offline stub) ────────────────────────────────────────────
  if (path.includes("/api/integracoes") || path.includes("/api/integrations")) {
    return jsonResponse([
      { id: "pje", nome: "PJe", descricao: "Sistema de Processo Judicial Eletrônico", url: "https://pje.jus.br", configurado: false, campos: [] },
      { id: "esaj", nome: "eSAJ/TJSP", descricao: "Sistema TJSP", url: "https://esaj.tjsp.jus.br", configurado: false, campos: [] },
      { id: "tjmg", nome: "TJMG", descricao: "Tribunal de Justiça de Minas Gerais", url: "https://www.tjmg.jus.br", configurado: false, campos: [] },
    ]);
  }

  // ── Proxy CORS gratuito — extrai texto de URLs externas ──────────────────
  if (path.includes("/api/proxy/extract") && method === "POST") {
    const targetUrl = body?.url as string || "";
    if (!targetUrl) return jsonResponse({ error: "URL não fornecida" }, 400);

    const PROXIES = [
      (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`,
    ];

    for (let i = 0; i < PROXIES.length; i++) {
      try {
        const proxyUrl = PROXIES[i](targetUrl);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await originalFetch(proxyUrl, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;

        let html = "";
        if (i === 0) {
          const json = await res.json() as any;
          html = json.contents || "";
        } else {
          html = await res.text();
        }

        // Strip tags, scripts, styles
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
          .replace(/\s{2,}/g, " ").trim();

        const proxyNames = ["allorigins.win", "corsproxy.io", "thingproxy.freeboard.io"];
        return jsonResponse({ text, proxy: proxyNames[i], chars: text.length });
      } catch { continue; }
    }
    return jsonResponse({ error: "Todos os proxies falharam. Verifique a URL e tente novamente." }, 502);
  }

  // ── Groq — chave gratuita detectada automaticamente ──────────────────────
  if (path.includes("/api/groq") || path.includes("/api/free-ai")) {
    const groqKey = localStorage.getItem("custom_api_key") || localStorage.getItem("groq_api_key") || "";
    if (!groqKey) return jsonResponse({ error: "Configure a chave Groq gratuita em Configurações → Chave Custom/Groq. Obtenha grátis em console.groq.com" }, 401);
    const text = body?.text as string || body?.message as string || "";
    const systemP = body?.system as string || SYSTEM_PROMPTS.default;
    return sseResponse((emit, done, error) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      callAI(text, systemP, { customKey: groqKey, customUrl: "https://api.groq.com/openai/v1", customModel: "llama-3.3-70b-versatile" }, (chunk) => emit({ content: chunk }), ctrl.signal)
        .then(() => { clearTimeout(t); done(); })
        .catch((e: any) => { clearTimeout(t); error(e?.message || "Erro Groq"); });
    });
  }

  // ── Histórico/Processos (localStorage) ───────────────────────────────────
  if (path.includes("/api/processos") || path.includes("/api/prazos")) {
    const data = kvGet<any[]>(path.replace(/\//g, "_"), []);
    if (method === "GET") return jsonResponse(data);
    if ((method === "POST" || method === "PUT") && body) {
      const item = { id: nextId(), ...body, createdAt: new Date().toISOString() };
      data.unshift(item);
      kvSet(path.replace(/\//g, "_"), data);
      return jsonResponse(item, 201);
    }
    return jsonResponse(data);
  }

  // ── Fallback genérico para qualquer outra rota /api/ ─────────────────────
  const genericKey = path.replace(/\//g, "_").replace(/^_api_/, "");
  if (method === "GET") {
    return jsonResponse(kvGet(genericKey, []));
  }
  if ((method === "POST" || method === "PUT") && body) {
    const stored = kvGet<any[]>(genericKey, []);
    const item = { id: nextId(), ...body, createdAt: new Date().toISOString() };
    stored.unshift(item);
    if (stored.length > 500) stored.splice(500);
    kvSet(genericKey, stored);
    return jsonResponse(item, 201);
  }
  if (method === "DELETE") {
    kvSet(genericKey, []);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: true, offline: true });
}

export function installInterceptor() {
  window.fetch = interceptedFetch as typeof window.fetch;
  console.log("[SK Jurídico] Interceptor offline ativo — IA direta, timeout 2min");
}
