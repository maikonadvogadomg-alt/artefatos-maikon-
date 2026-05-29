import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScriptItem { i: number; full: string; pre: string; size: number; hc: boolean; hf: boolean; ha: boolean; }
interface AssetItem  { url: string; type: string; name: string; }
interface LinkItem   { url: string; text: string; ext: boolean; }
interface ApiItem    { url: string; path: string; }
interface MetaInfo   { title: string; desc: string; lang: string; gen: string; url: string; }
interface ExtData {
  meta: MetaInfo; scripts: ScriptItem[]; assets: AssetItem[];
  links: LinkItem[]; apis: ApiItem[]; tech: string[];
  rawHtml: string; rootUrl: string;
}

const C = {
  bg:   "#111a0e",
  bg2:  "#192113",
  bg3:  "#1f2918",
  bg4:  "#283420",
  bord: "#2d3d25",
  text: "#e8ead0",
  muted:"#8a9a72",
  gold: "#4a7c3f",
  green:"#4a7c3f",
  red:  "#ef4444",
};

const SHORTCUTS = [
  { label: "Cálculo Jurídico",    url: "https://www.calculojuridico.com.br" },
  { label: "Calculadora Jurídica",url: "https://calculadorajuridica.com.br" },
  { label: "Previdenciário.com",  url: "https://previdenciario.com.br" },
  { label: "JusBrasil",           url: "https://www.jusbrasil.com.br" },
  { label: "INSS Digital",        url: "https://meu.inss.gov.br" },
  { label: "STJ",                 url: "https://www.stj.jus.br" },
  { label: "STF",                 url: "https://portal.stf.jus.br" },
  { label: "TCU",                 url: "https://portal.tcu.gov.br" },
  { label: "TRT-3 (MG)",          url: "https://www.trt3.jus.br" },
  { label: "TJMG",                url: "https://www.tjmg.jus.br" },
  { label: "TJSP (eSAJ)",         url: "https://esaj.tjsp.jus.br" },
  { label: "Consulta Proc. CNJ",  url: "https://www.cnj.jus.br/sistemas/processo-judicial-eletronico-pje/" },
];

const PROXY_NAMES = ["allorigins.win", "corsproxy.io", "codetabs.com", "servidor próprio"];

async function fetchViaProxy(url: string, onStatus: (msg: string) => void): Promise<string> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  for (let i = 0; i < proxies.length; i++) {
    try {
      onStatus(`Proxy ${i + 1}/3: ${PROXY_NAMES[i]}…`);
      const r = await fetch(proxies[i](url), { signal: AbortSignal.timeout(14000) });
      if (!r.ok) continue;
      let d: any;
      try { d = await r.json(); } catch { return await r.text(); }
      const h = d.contents ?? d.data ?? d;
      if (typeof h === "string" && h.length > 80) return h;
    } catch (e: any) {
      if (i === proxies.length - 1) {
        // Last resort: our own backend proxy
        try {
          onStatus(`Proxy 4/4: ${PROXY_NAMES[3]}…`);
          const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
          const r = await fetch(`${base}/api/proxy?url=${encodeURIComponent(url)}`, {
            signal: AbortSignal.timeout(20000),
          });
          if (r.ok) return await r.text();
        } catch {}
        throw e;
      }
    }
  }
  throw new Error("Todos os proxies falharam. Tente outra URL.");
}

function parseMeta(html: string, base: string): MetaInfo {
  const g = (p: RegExp) => (html.match(p)?.[1] ?? "").trim();
  return {
    title: g(/<title[^>]*>([^<]*)<\/title>/i),
    desc:  g(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
           g(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    lang:  g(/<html[^>]+lang=["']([^"']*)["']/i),
    gen:   g(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i),
    url:   base,
  };
}

function parseAssets(html: string, base: string): AssetItem[] {
  const seen = new Set<string>(); const out: AssetItem[] = [];
  const rules: [RegExp, string][] = [
    [/<script[^>]+src=["']([^"']+)["']/gi, "script"],
    [/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi, "stylesheet"],
    [/<img[^>]+src=["']([^"']+)["']/gi, "image"],
    [/<link[^>]+href=["']([^"']+\.(?:woff2?|ttf|otf|eot))["']/gi, "font"],
  ];
  rules.forEach(([p, t]) => {
    let m; p.lastIndex = 0;
    while ((m = p.exec(html)) !== null) {
      try {
        const s = m[1].trim();
        if (!s || s.startsWith("data:")) continue;
        const abs = s.startsWith("http") ? s : new URL(s, base).toString();
        if (!seen.has(abs)) { seen.add(abs); out.push({ url: abs, type: t, name: s.split("/").pop()?.split("?")[0] || s }); }
      } catch {}
    }
  });
  return out.slice(0, 300);
}

function parseLinks(html: string, base: string): LinkItem[] {
  const seen = new Set<string>(); const out: LinkItem[] = [];
  const bh = new URL(base).hostname;
  let m; const p = /<a[^>]+href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = p.exec(html)) !== null) {
    try {
      const h = m[1].trim();
      if (!h || h.startsWith("javascript:") || h.startsWith("mailto:")) continue;
      const abs = h.startsWith("http") ? h : new URL(h, base).toString();
      if (!seen.has(abs)) {
        seen.add(abs);
        const txt = m[2].replace(/<[^>]+>/g, "").trim().slice(0, 80);
        out.push({ url: abs, text: txt || "(sem texto)", ext: new URL(abs).hostname !== bh });
      }
    } catch {}
  }
  return out.slice(0, 300);
}

function parseScripts(html: string): ScriptItem[] {
  const out: ScriptItem[] = []; let m; let idx = 0;
  const p = /<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = p.exec(html)) !== null) {
    const c = (m[1] || "").trim();
    if (!c || c.length < 30) continue;
    const hc = /calc[uú]|c[aá]lculo|remuner|sal[aá]rio|benef[ií]cio|previdenci|inss|fator\s*previd|aposentad|pens[aã]o|corre[çc][aã]o|coeficiente|rmc|rma|segurado|competência|contrib|parcela|honorár|adiantamento|férias|rescisão|trabalhista/i.test(c);
    const hf = /Math\.|function\s+calc|=\s*[\d.]+\s*[\*\/\+\-]|parseFloat|parseInt|\.toFixed\(|f[oó]rmula|aliq|juros|amortiz|desconto/i.test(c);
    const ha = /fetch\s*\(|XMLHttpRequest|\.ajax\s*\(|axios\.|\.post\s*\(|\.get\s*\(/i.test(c);
    out.push({ i: idx++, full: c, pre: c.slice(0, 500), size: c.length, hc, hf, ha });
  }
  return out;
}

function parseApis(html: string, base: string): ApiItem[] {
  const out: ApiItem[] = []; const seen = new Set<string>();
  const patterns = [
    /fetch\s*\(\s*['"`]([^'"`\s]+)['"`]/g,
    /['"`](\/api\/[^'"`\s?#]{2,})['"`]/g,
    /action=["']([^"']+\.(?:php|aspx|jsp|do)[^"']*)["']/gi,
  ];
  patterns.forEach(p => {
    let m;
    while ((m = p.exec(html)) !== null) {
      try {
        let u = m[1];
        if (u.startsWith("/")) u = new URL(u, base).toString();
        if (!u.startsWith("http")) continue;
        const k = new URL(u).pathname;
        if (!seen.has(k)) { seen.add(k); out.push({ url: u, path: k }); }
      } catch {}
    }
  });
  return out.slice(0, 80);
}

const TECH_SIG: Record<string, RegExp[]> = {
  "React":     [/react(?:\.min)?\.js/, /__REACT_/, /data-reactroot/],
  "Next.js":   [/__NEXT_DATA__/, /\/_next\/static/],
  "Vue.js":    [/vue(?:\.min)?\.js/, /__vue_/],
  "Angular":   [/angular(?:\.min)?\.js/, /ng-version/],
  "jQuery":    [/jquery(?:\.min)?\.js/, /\$\(document\)\.ready/],
  "Bootstrap": [/bootstrap(?:\.min)?\.css/],
  "WordPress": [/wp-content/, /wp-includes/],
  "PHP":       [/\.php/, /PHPSESSID/],
  "Tailwind":  [/tailwindcss/],
  "Vite":      [/\/@vite\//],
};
function detectTech(html: string) {
  return Object.entries(TECH_SIG).filter(([, pp]) => pp.some(p => p.test(html))).map(([n]) => n);
}

function parseAll(html: string, base: string): Omit<ExtData, "rawHtml" | "rootUrl"> {
  return {
    meta: parseMeta(html, base),
    assets: parseAssets(html, base),
    links: parseLinks(html, base),
    scripts: parseScripts(html),
    tech: detectTech(html),
    apis: parseApis(html, base),
  };
}

function dlBlob(content: string, name: string, type = "text/plain;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

const S = {
  page:    { background: C.bg, color: C.text, minHeight: "100dvh", fontFamily: "'Inter',sans-serif" },
  header:  { background: C.bg2, borderBottom: `1px solid ${C.bord}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky" as const, top: 0, zIndex: 100 },
  card:    { background: C.bg2, border: `1px solid ${C.bord}`, borderRadius: 10, padding: 16, marginBottom: 14 },
  cardTitle:{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 },
  input:   { flex: 1, background: C.bg3, border: `1px solid ${C.bord}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" },
  select:  { background: C.bg3, border: `1px solid ${C.bord}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" },
  btnGold: { background: C.gold, color: "#111", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGreen:{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost:{ background: C.bg4, color: C.text, border: `1px solid ${C.bord}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  btnSm:   { padding: "4px 10px", fontSize: 11 },
  badge:   { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 },
  shortcut:{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${C.gold}44`, background: `${C.gold}0d`, color: C.gold, fontSize: 11, cursor: "pointer" },
  tab:     { padding: "6px 14px", borderRadius: 6, border: "none", background: "none", color: C.muted, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  tabActive:{ background: C.bg3, color: C.text },
  listBox: { border: `1px solid ${C.bord}`, borderRadius: 8, maxHeight: 360, overflowY: "auto" as const },
  listRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: `1px solid ${C.bord}66`, fontSize: 11 },
  metaBox: { background: C.bg3, borderRadius: 8, padding: 12, marginBottom: 10 },
  scriptCard:{ background: C.bg3, border: `1px solid ${C.bord}`, borderRadius: 8, padding: 12, marginBottom: 10 },
  scriptPre:{ background: C.bg, borderRadius: 5, padding: 9, fontSize: 11, fontFamily: "monospace", color: C.gold, whiteSpace: "pre-wrap" as const, maxHeight: 120, overflow: "hidden", wordBreak: "break-all" as const, lineHeight: 1.5 },
  modal:   { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalBox:{ background: C.bg2, border: `1px solid ${C.bord}`, borderRadius: 12, width: "min(820px, 96vw)", maxHeight: "88vh", display: "flex", flexDirection: "column" as const },
  empty:   { textAlign: "center" as const, padding: "32px", color: C.muted, fontSize: 13 },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExtractorJuridico({ onBack, onSendToAssistente }: {
  onBack?: () => void;
  onSendToAssistente?: (text: string) => void;
}) {
  const [url, setUrl]           = useState("");
  const [depth, setDepth]       = useState("1");
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState("Conectando ao proxy…");
  const [proxyOk, setProxyOk]   = useState("");
  const [error, setError]       = useState("");
  const [extData, setExtData]   = useState<ExtData | null>(null);
  const [activeTab, setActiveTab] = useState("scripts");
  const [scriptFilter, setScriptFilter] = useState("all");
  const [assetFilter, setAssetFilter]   = useState({ txt: "", type: "" });
  const [linkFilter, setLinkFilter]     = useState({ txt: "", ext: "" });
  const [modal, setModal]       = useState<{ title: string; content: string } | null>(null);

  const doExtract = async () => {
    let u = url.trim();
    if (!u) { setError("Digite uma URL"); return; }
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    setError(""); setExtData(null); setProxyOk(""); setLoading(true);
    try {
      const html = await fetchViaProxy(u, setLoadMsg);
      setProxyOk(`✓ Extração bem-sucedida`);
      const parsed = parseAll(html, u);
      let data: ExtData = { ...parsed, rawHtml: html, rootUrl: u };

      if (parseInt(depth) >= 2) {
        const subs = getSameOriginLinks(html, u).slice(0, 5);
        for (const sub of subs) {
          try {
            setLoadMsg(`Subpágina: ${sub.replace(/^https?:\/\//, "").slice(0, 40)}…`);
            const sh = await fetchViaProxy(sub, () => {});
            const sr = parseAll(sh, sub);
            data.scripts.push(...sr.scripts);
            data.assets.push(...sr.assets.filter(a => !data.assets.some(e => e.url === a.url)));
            data.links.push(...sr.links.filter(l => !data.links.some(e => e.url === l.url)));
            data.apis.push(...sr.apis.filter(a => !data.apis.some(e => e.url === a.url)));
          } catch {}
        }
      }
      setExtData(data);
      setActiveTab("scripts");
    } catch (err: any) {
      setError(err.message || "Erro ao extrair. Verifique a URL.");
    } finally {
      setLoading(false);
      setLoadMsg("Conectando ao proxy…");
    }
  };

  const getSameOriginLinks = (html: string, base: string) => {
    const seen = new Set<string>(); const out: string[] = [];
    const bh = new URL(base).hostname;
    let m; const p = /href=["']([^"'#?][^"']*)["']/gi;
    while ((m = p.exec(html)) !== null) {
      try {
        const h = m[1].trim();
        if (!h || h.startsWith("javascript:")) continue;
        const abs = h.startsWith("http") ? h : new URL(h, base).toString();
        const u2 = new URL(abs);
        if (u2.hostname !== bh) continue;
        const n = u2.origin + u2.pathname;
        if (!seen.has(n) && n !== base.split("?")[0]) { seen.add(n); out.push(n); }
      } catch {}
    }
    return out.slice(0, 15);
  };

  const filteredScripts = () => {
    if (!extData) return [];
    const all = extData.scripts;
    if (scriptFilter === "calc") return all.filter(s => s.hc);
    if (scriptFilter === "math") return all.filter(s => s.hf);
    if (scriptFilter === "ajax") return all.filter(s => s.ha);
    return all;
  };

  const filteredAssets = () => {
    if (!extData) return [];
    return extData.assets.filter(a =>
      (!assetFilter.type || a.type === assetFilter.type) &&
      (!assetFilter.txt || a.url.toLowerCase().includes(assetFilter.txt) || a.name.toLowerCase().includes(assetFilter.txt))
    );
  };

  const filteredLinks = () => {
    if (!extData) return [];
    return extData.links.filter(l =>
      (!linkFilter.ext || (linkFilter.ext === "int" && !l.ext) || (linkFilter.ext === "ext" && l.ext)) &&
      (!linkFilter.txt || l.url.toLowerCase().includes(linkFilter.txt) || l.text.toLowerCase().includes(linkFilter.txt))
    );
  };

  const dlScripts = () => {
    if (!extData) return;
    const c = extData.scripts.map((s, i) => `/* ═══ SCRIPT #${i + 1} | ${(s.size / 1024).toFixed(1)}KB | Cálculo:${s.hc ? "SIM" : "não"} | Fórmula:${s.hf ? "SIM" : "não"} ═══ */\n\n${s.full}`).join("\n\n\n");
    dlBlob(c, `scripts-${new URL(extData.rootUrl).hostname}.js`, "text/javascript");
  };

  const dlHtml = () => {
    if (!extData) return;
    dlBlob(extData.rawHtml, `pagina-${new URL(extData.rootUrl).hostname}.html`, "text/html");
  };

  const dlReport = () => {
    if (!extData) return;
    const jur = extData.scripts.filter(s => s.hc || s.hf);
    const txt = [
      `RELATÓRIO DE EXTRAÇÃO — SK JURÍDICO`,
      `Data: ${new Date().toLocaleString("pt-BR")}`,
      `URL: ${extData.rootUrl}`,
      `Título: ${extData.meta.title}`,
      ``,
      `═══ RESUMO ═══`,
      `Scripts inline: ${extData.scripts.length}`,
      `Scripts jurídicos: ${jur.length}`,
      `Arquivos externos: ${extData.assets.length}`,
      `Links: ${extData.links.length}`,
      `Rotas de API: ${extData.apis.length}`,
      `Tecnologias: ${extData.tech.join(", ") || "—"}`,
      ``,
      `═══ SCRIPTS JURÍDICOS ═══`,
      ...jur.map(s => `\n--- Script #${s.i + 1} (${(s.size / 1024).toFixed(1)}KB) ---\n${s.full.slice(0, 3000)}`),
    ].join("\n");
    dlBlob(txt, `relatorio-${new URL(extData.rootUrl).hostname}.txt`);
  };

  const TYPE_ICON: Record<string, string> = { script: "📜", stylesheet: "🎨", image: "🖼", font: "🔤" };
  const jurCount = extData ? extData.scripts.filter(s => s.hc || s.hf).length : 0;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: C.text, cursor: "pointer", fontSize: 20 }}>←</button>
          )}
          <span style={{ fontWeight: 800, fontSize: 15, color: C.gold }}>🔍 Extrator Jurídico</span>
          <span style={{ fontSize: 11, color: C.muted }}>SK Jurídico</span>
        </div>
        {onSendToAssistente && extData && (
          <button
            onClick={() => onSendToAssistente(extData.rawHtml.slice(0, 8000))}
            style={S.btnGreen}
          >⚖ Enviar à IA</button>
        )}
      </div>

      <div style={{ padding: "16px 16px 40px", maxWidth: 960, margin: "0 auto" }}>

        {/* URL Input */}
        <div style={S.card}>
          <div style={S.cardTitle}>URL para Extrair</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <input
              style={S.input}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doExtract()}
              placeholder="calculojuridico.com.br ou https://site.com.br"
            />
            <select style={S.select} value={depth} onChange={e => setDepth(e.target.value)}>
              <option value="1">Só a página inicial</option>
              <option value="2">+ subpáginas (até 5 links)</option>
            </select>
            <button style={S.btnGold} onClick={doExtract} disabled={loading}>
              {loading ? "⏳ Extraindo…" : "🔍 Extrair"}
            </button>
          </div>

          {/* Shortcuts */}
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 10 }}>
            {SHORTCUTS.map(s => (
              <button key={s.url} style={S.shortcut} onClick={() => { setUrl(s.url); }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Status */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <span style={{ display: "inline-block", width: 16, height: 16, border: `2px solid ${C.bord}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <span style={{ fontSize: 12, color: C.muted }}>{loadMsg}</span>
            </div>
          )}
          {proxyOk && !loading && <div style={{ fontSize: 11, color: C.green, marginTop: 6 }}>{proxyOk}</div>}
          {error && (
            <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: `${C.red}14`, border: `1px solid ${C.red}44`, color: C.red, fontSize: 12 }}>
              ⚠️ {error}<br /><small style={{ color: C.muted }}>Dica: tente sem www, ou use outra URL. Sites com Cloudflare podem bloquear proxies.</small>
            </div>
          )}
        </div>

        {/* Results */}
        {extData && (
          <>
            {/* Tabs + Download buttons */}
            <div style={{ ...S.card, padding: 12 }}>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const, marginBottom: 10 }}>
                {[
                  { id: "scripts",  label: `⚖️ Scripts ${jurCount > 0 ? `(${jurCount})` : `(${extData.scripts.length})`}` },
                  { id: "overview", label: "📊 Visão Geral" },
                  { id: "assets",   label: `📁 Arquivos (${extData.assets.length})` },
                  { id: "links",    label: `🔗 Links (${extData.links.length})` },
                  { id: "apis",     label: `🌐 APIs (${extData.apis.length})` },
                ].map(t => (
                  <button key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={dlScripts}>⬇ Scripts .js</button>
                <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={dlHtml}>⬇ HTML completo</button>
                <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={dlReport}>⬇ Relatório .txt</button>
                {onSendToAssistente && (
                  <button style={{ ...S.btnGreen, ...S.btnSm }} onClick={() => onSendToAssistente(extData.rawHtml.slice(0, 8000))}>
                    ⚖ Enviar à IA
                  </button>
                )}
              </div>
            </div>

            {/* SCRIPTS TAB */}
            {activeTab === "scripts" && (
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" as const, gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Scripts Inline Encontrados</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {extData.scripts.length} scripts · {jurCount} com lógica jurídica · {extData.assets.filter(a => a.type === "script").length} arquivos .js externos
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {[
                    { id: "all",  label: "Todos" },
                    { id: "calc", label: "⚖️ Cálculo" },
                    { id: "math", label: "📐 Fórmula" },
                    { id: "ajax", label: "🌐 AJAX" },
                  ].map(f => (
                    <button key={f.id}
                      onClick={() => setScriptFilter(f.id)}
                      style={{ ...S.btnGhost, ...S.btnSm, ...(scriptFilter === f.id ? { borderColor: C.gold, color: C.gold } : {}) }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div>
                  {filteredScripts().length === 0
                    ? <div style={S.empty}>Nenhum script com esse filtro</div>
                    : filteredScripts().map(s => (
                      <div key={s.i} style={S.scriptCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap" as const, gap: 6 }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                            <span style={{ ...S.badge, background: C.bg4, color: C.muted }}>#{s.i + 1}</span>
                            {s.hc && <span style={{ ...S.badge, background: `${C.gold}22`, color: C.gold }}>⚖️ Cálculo</span>}
                            {s.hf && <span style={{ ...S.badge, background: "#bc8cff22", color: "#bc8cff" }}>📐 Fórmula</span>}
                            {s.ha && <span style={{ ...S.badge, background: `${C.green}22`, color: C.green }}>🌐 AJAX</span>}
                            <span style={{ ...S.badge, background: C.bg4, color: C.muted }}>{(s.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => navigator.clipboard.writeText(s.full)}>📋</button>
                            <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => setModal({ title: `Script #${s.i + 1}`, content: s.full })}>👁 Ver</button>
                          </div>
                        </div>
                        <div style={S.scriptPre}>{s.pre}{s.full.length > 500 ? `\n…[mais ${s.size - 500} chars]` : ""}</div>
                      </div>
                    ))
                  }
                  {/* External JS */}
                  {extData.assets.filter(a => a.type === "script").length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, marginBottom: 8 }}>
                        Arquivos .js externos ({extData.assets.filter(a => a.type === "script").length})
                      </div>
                      <div style={S.listBox}>
                        {extData.assets.filter(a => a.type === "script").map(a => (
                          <div key={a.url} style={S.listRow}>
                            <span style={{ ...S.badge, background: `${C.gold}22`, color: C.gold }}>JS</span>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", color: C.muted }}>{a.name || a.url}</span>
                            <a href={a.url} target="_blank" rel="noreferrer">
                              <button style={{ ...S.btnGhost, ...S.btnSm }}>🔗</button>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div style={S.card}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginBottom: 14 }}>
                  {[
                    { n: extData.scripts.length, l: "Scripts", c: C.gold },
                    { n: jurCount,               l: "⚖️ Jurídico", c: C.gold },
                    { n: extData.assets.length,  l: "Arquivos", c: C.gold },
                    { n: extData.apis.length,    l: "Rotas API", c: "#bc8cff" },
                    { n: extData.tech.length,    l: "Tecnologias", c: C.green },
                    { n: extData.links.filter(l => l.ext).length, l: "Links ext.", c: C.muted },
                  ].map(s => (
                    <div key={s.l} style={{ background: C.bg3, border: `1px solid ${C.bord}`, borderRadius: 8, padding: 10, textAlign: "center" as const }}>
                      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace", color: s.c }}>{s.n}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={S.metaBox}>
                  {[
                    { k: "Site",      v: extData.meta.url },
                    { k: "Título",    v: extData.meta.title || "—" },
                    { k: "Idioma",    v: extData.meta.lang || "—" },
                    { k: "Descrição", v: (extData.meta.desc || "—").slice(0, 200) },
                    ...(extData.meta.gen ? [{ k: "Gerador", v: extData.meta.gen }] : []),
                  ].map(r => (
                    <div key={r.k} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 12 }}>
                      <span style={{ color: C.muted, width: 70, flexShrink: 0, fontWeight: 600 }}>{r.k}</span>
                      <span style={{ flex: 1, wordBreak: "break-word" as const }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                {extData.tech.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Tecnologias detectadas:</div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                      {extData.tech.map(t => (
                        <span key={t} style={{ ...S.badge, background: "#bc8cff22", color: "#bc8cff" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ASSETS TAB */}
            {activeTab === "assets" && (
              <div style={S.card}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" as const }}>
                  <input style={{ ...S.input, maxWidth: 220, fontSize: 12, padding: "5px 9px" }}
                    placeholder="Filtrar por nome…"
                    value={assetFilter.txt}
                    onChange={e => setAssetFilter(p => ({ ...p, txt: e.target.value.toLowerCase() }))} />
                  <select style={{ ...S.select, fontSize: 12, padding: "5px 9px" }}
                    value={assetFilter.type}
                    onChange={e => setAssetFilter(p => ({ ...p, type: e.target.value }))}>
                    <option value="">Todos os tipos</option>
                    <option value="script">Scripts JS</option>
                    <option value="stylesheet">CSS</option>
                    <option value="image">Imagens</option>
                    <option value="font">Fontes</option>
                  </select>
                </div>
                <div style={S.listBox}>
                  {filteredAssets().length === 0
                    ? <div style={S.empty}>Nenhum arquivo</div>
                    : filteredAssets().map(a => (
                      <div key={a.url} style={S.listRow}>
                        <span style={{ ...S.badge, background: `${C.gold}22`, color: C.gold, minWidth: 70, justifyContent: "center" }}>
                          {TYPE_ICON[a.type] || ""} {a.type}
                        </span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", color: C.muted }}>{a.name || a.url}</span>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <button style={{ ...S.btnGhost, ...S.btnSm }}>🔗</button>
                        </a>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {activeTab === "links" && (
              <div style={S.card}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" as const }}>
                  <input style={{ ...S.input, maxWidth: 220, fontSize: 12, padding: "5px 9px" }}
                    placeholder="Filtrar links…"
                    value={linkFilter.txt}
                    onChange={e => setLinkFilter(p => ({ ...p, txt: e.target.value.toLowerCase() }))} />
                  <select style={{ ...S.select, fontSize: 12, padding: "5px 9px" }}
                    value={linkFilter.ext}
                    onChange={e => setLinkFilter(p => ({ ...p, ext: e.target.value }))}>
                    <option value="">Todos</option>
                    <option value="int">Internos</option>
                    <option value="ext">Externos</option>
                  </select>
                </div>
                <div style={S.listBox}>
                  {filteredLinks().length === 0
                    ? <div style={S.empty}>Nenhum link</div>
                    : filteredLinks().map((l, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${C.bord}66`, gap: 8, fontSize: 12 }}>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.text}</div>
                          <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, fontFamily: "monospace", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: "none" }}>{l.url}</a>
                        </div>
                        <span style={{ ...S.badge, ...(l.ext ? { background: `${C.gold}22`, color: C.gold } : { background: `${C.green}22`, color: C.green }) }}>
                          {l.ext ? "Externo" : "Interno"}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* APIS TAB */}
            {activeTab === "apis" && (
              <div style={S.card}>
                <div style={{ marginBottom: 8, fontSize: 12, color: C.muted }}>Rotas de API / formulários detectados na página</div>
                <div style={S.listBox}>
                  {extData.apis.length === 0
                    ? <div style={S.empty}>Nenhuma rota de API detectada</div>
                    : extData.apis.map((a, i) => (
                      <div key={i} style={S.listRow}>
                        <span style={{ ...S.badge, background: "#bc8cff22", color: "#bc8cff" }}>API</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", color: "#bc8cff" }}>{a.path}</span>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <button style={{ ...S.btnGhost, ...S.btnSm }}>🔗</button>
                        </a>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Code Modal */}
      {modal && (
        <div style={S.modal} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.bord}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{modal.title}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => navigator.clipboard.writeText(modal.content)}>📋 Copiar</button>
                <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => setModal(null)}>✕ Fechar</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              <pre style={{ fontSize: 11, fontFamily: "monospace", color: C.gold, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, margin: 0 }}>{modal.content}</pre>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
