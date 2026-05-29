import { useState, useRef, useEffect } from "react";
import { getStorageItem, SK } from "@/lib/storage";
import { callAI } from "@/lib/aiDirect";
import { useToast } from "@/hooks/use-toast";

interface Props { onBack: () => void; }

const LANGS = ["HTML", "React", "Python"];
const CODE_TABS = ["HTML", "CSS", "JS"];

const DEFAULT_HTML = `<div style="max-width:600px;margin:40px auto;padding:20px;font-family:sans-serif;">
  <h1 style="color:#4a7c3f;">Bem-vindo ao HTML Playground</h1>
  <p style="color:#ccc;margin:16px 0;">Cole seu código HTML aqui e veja o resultado ao vivo!</p>
  <button onclick="alert('Funcionou!')" style="padding:10px 24px;font-size:16px;background:#4a7c3f;color:white;border:none;border-radius:6px;cursor:pointer;">
    Clique aqui
  </button>
</div>`;
const DEFAULT_CSS = `body { background: #111a0e; color: #e8dfc8; }`;
const DEFAULT_JS = `// JavaScript aqui\nconsole.log('Playground iniciado!');`;

export default function HtmlPlayground({ onBack }: Props) {
  const { toast } = useToast();
  const [activeLang, setActiveLang] = useState("HTML");
  const [activeCodeTab, setActiveCodeTab] = useState("HTML");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [js, setJs] = useState(DEFAULT_JS);
  const [fileName, setFileName] = useState("Sem título");
  const [showPreview, setShowPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fullCode = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></html>`;

  const updatePreview = () => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(fullCode); doc.close(); }
    }
  };

  useEffect(() => { if (showPreview) updatePreview(); }, [html, css, js, showPreview]);

  const getCurrentCode = () => ({ HTML: html, CSS: css, JS: js }[activeCodeTab] ?? html);
  const setCurrentCode = (v: string) => { if (activeCodeTab === "HTML") setHtml(v); else if (activeCodeTab === "CSS") setCss(v); else setJs(v); };

  const handleDownload = () => {
    const blob = new Blob([fullCode], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName || "playground"}.html`;
    a.click();
    toast({ title: "✓ Arquivo baixado" });
  };

  const handleCopy = () => { navigator.clipboard.writeText(getCurrentCode()); toast({ title: "✓ Copiado" }); };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const apiKey = getStorageItem(SK.API_KEY, "");
    const model = getStorageItem(SK.MODEL, "demo");
    try {
      const result = await callAI(
        aiPrompt,
        "gerar_minuta",
        apiKey,
        model,
        "Você é um desenvolvedor web. Gere código HTML completo e funcional com base no que o usuário pedir. Retorne apenas o código HTML, sem explicações."
      );
      const match = result.match(/```html\n?([\s\S]*?)```/);
      setHtml(match ? match[1] : result);
      toast({ title: "✓ Código gerado pela IA" });
    } catch {
      toast({ title: "Erro ao gerar", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const s = {
    page: { display: "flex", flexDirection: "column" as const, height: "100dvh", background: "hsl(120 22% 7%)", color: "hsl(55 25% 88%)", fontFamily: "'Inter',sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid hsl(120 15% 16%)", background: "hsl(120 20% 9%)", flexShrink: 0 as const },
    iconBtn: { background: "none", border: "none", color: "hsl(55 25% 70%)", cursor: "pointer", fontSize: 16, padding: "4px 8px" },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ ...s.iconBtn, fontSize: 20 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 14, color: "hsl(45 70% 60%)" }}>&lt;/&gt;</span>

          {/* Lang tabs */}
          {LANGS.map(l => (
            <button key={l} onClick={() => setActiveLang(l)}
              style={{ padding: "3px 10px", borderRadius: 6, border: "none", background: activeLang === l ? "#4a7c3f" : "hsl(120 18% 16%)", color: activeLang === l ? "#111" : "hsl(55 25% 75%)", fontSize: 12, fontWeight: activeLang === l ? 700 : 400, cursor: "pointer" }}>
              {l === "HTML" ? "🌐 HTML" : l === "React" ? "⚛ React" : "🐍 Python"}
            </button>
          ))}

          <input value={fileName} onChange={e => setFileName(e.target.value)}
            style={{ background: "none", border: "none", color: "hsl(55 20% 65%)", fontSize: 13, width: 100, outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { icon: "👁", tip: "Pré-visualizar", action: () => setShowPreview(v => !v) },
            { icon: "📤", tip: "Exportar", action: handleDownload },
            { icon: "⛶", tip: "Tela cheia", action: () => {} },
            { icon: "📋", tip: "Copiar", action: handleCopy },
            { icon: "⬇", tip: "Download", action: handleDownload },
            { icon: "💾", tip: "Salvar", action: () => toast({ title: "Salvo localmente" }) },
            { icon: "📂", tip: "Abrir", action: () => {} },
            { icon: "↩", tip: "Desfazer", action: () => {} },
            { icon: "🗑", tip: "Limpar", action: () => { setHtml(""); setCss(""); setJs(""); } },
          ].map(b => <button key={b.icon} onClick={b.action} style={s.iconBtn} title={b.tip}>{b.icon}</button>)}
        </div>
      </div>

      {/* AI bar */}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: "1px solid hsl(120 15% 16%)", flexShrink: 0 }}>
        <button style={{ background: "#4a7c3f", color: "#111", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          ✨ Assistente
        </button>
        <button onClick={() => {}} style={{ background: "none", border: "none", color: "hsl(55 20% 65%)", cursor: "pointer", fontSize: 18 }}>🌙</button>
        <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAiGenerate()}
          placeholder="Descreva o que a IA deve gerar... (Ex: crie um formulário de contato estilizado)"
          style={{ flex: 1, background: "hsl(120 18% 13%)", border: "1px solid hsl(120 15% 20%)", borderRadius: 8, padding: "6px 12px", color: "hsl(55 25% 88%)", fontSize: 13, outline: "none" }} />
        <button onClick={handleAiGenerate} disabled={isGenerating}
          style={{ background: isGenerating ? "#3a6232" : "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {isGenerating ? "..." : "Gerar"}
        </button>
      </div>

      {/* Code tabs */}
      <div style={{ display: "flex", gap: 6, padding: "6px 12px", borderBottom: "1px solid hsl(120 15% 16%)", flexShrink: 0 }}>
        {CODE_TABS.map(t => (
          <button key={t} onClick={() => setActiveCodeTab(t)}
            style={{ padding: "4px 14px", borderRadius: 6, border: "1px solid", borderColor: activeCodeTab === t ? "hsl(45 70% 55%)" : "hsl(120 15% 20%)", background: activeCodeTab === t ? "hsl(45 70% 55% / 0.12)" : "transparent", color: activeCodeTab === t ? "hsl(45 70% 65%)" : "hsl(55 20% 65%)", fontSize: 13, cursor: "pointer" }}>
            {t === "HTML" ? "📄 HTML" : t === "CSS" ? "🎨 CSS" : "⚡ JS"}
          </button>
        ))}
        {showPreview && <button onClick={() => setShowPreview(false)} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, border: "1px solid hsl(120 15% 20%)", background: "transparent", color: "hsl(55 20% 65%)", fontSize: 13, cursor: "pointer" }}>Fechar Preview</button>}
      </div>

      {/* Editor + Preview */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Code editor */}
        <div style={{ flex: showPreview ? "0 0 50%" : 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <textarea
            value={getCurrentCode()}
            onChange={e => setCurrentCode(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1, width: "100%", resize: "none", background: "hsl(120 22% 8%)",
              border: "none", outline: "none", padding: "12px 14px",
              color: "#a3e635", fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div style={{ flex: 1, borderLeft: "1px solid hsl(120 15% 16%)", background: "#fff", overflow: "hidden" }}>
            <iframe ref={iframeRef} style={{ width: "100%", height: "100%", border: "none" }} title="preview" sandbox="allow-scripts allow-same-origin" />
          </div>
        )}
      </div>

      {!showPreview && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid hsl(120 15% 16%)", flexShrink: 0 }}>
          <button onClick={() => setShowPreview(true)}
            style={{ width: "100%", padding: "10px", background: "#4a7c3f", color: "#111", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            👁 Ver Preview
          </button>
        </div>
      )}
    </div>
  );
}
