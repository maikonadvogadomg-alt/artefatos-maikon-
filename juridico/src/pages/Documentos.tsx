import { useState, useEffect } from "react";
import { db, type Documento } from "@/lib/localDB";
import { useToast } from "@/hooks/use-toast";
import { FileText, Copy, Download, Printer, Trash2 } from "lucide-react";

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [selected, setSelected] = useState<Documento | null>(null);
  const { toast } = useToast();

  useEffect(() => { setDocumentos(db.documentos.list()); }, []);
  const refresh = () => { const d = db.documentos.list(); setDocumentos(d); if (selected) setSelected(d.find(x => x.id === selected.id) || null); };

  const handleCopy = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.conteudo);
    toast({ title: "Copiado!" });
  };

  const handleDownload = () => {
    if (!selected) return;
    const blob = new Blob([selected.conteudo], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${selected.titulo.replace(/[^a-z0-9]/gi,"_")}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!selected) return;
    const w = window.open("","_blank");
    if (!w) { toast({ title: "Permita popups para imprimir", variant: "destructive" }); return; }
    w.document.write(`<html><head><title>${selected.titulo}</title><style>body{font-family:'Times New Roman',serif;line-height:1.6;max-width:800px;margin:0 auto;padding:40px;color:#000}h1{text-align:center;font-size:18pt;margin-bottom:30px}.content{white-space:pre-wrap;text-align:justify;font-size:12pt}</style></head><body><h1>${selected.titulo}</h1><div class="content">${selected.conteudo}</div><script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    w.document.close();
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir este documento?")) return;
    db.documentos.delete(id);
    if (selected?.id === id) setSelected(null);
    refresh();
    toast({ title: "Documento excluído" });
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: selected ? "300px 1fr" : "1fr", gap: 16, height: "calc(100vh - 120px)" }}>
      <div>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#7bc47f", cursor: "pointer", fontSize: 15, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
          ← Voltar
        </button>
        <h2 style={{ color: "#f0f0f0", fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>📄 Documentos</h2>
        {documentos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
            <FileText size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Documentos gerados na aba Assistente aparecem aqui</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {documentos.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ background: selected?.id === d.id ? "#2d4a2a" : "#1a2a17", border: `1px solid ${selected?.id === d.id ? "#4a7c3f" : "#2d4a2a"}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: "#f0f0f0", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.titulo}</div>
                  <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{new Date(d.createdAt).toLocaleDateString("pt-BR")}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ background: "#1a2a17", border: "1px solid #2d4a2a", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #2d4a2a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.titulo}</span>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {[["Copiar", <Copy size={13}/>, handleCopy], ["Baixar", <Download size={13}/>, handleDownload], ["Imprimir", <Printer size={13}/>, handlePrint]].map(([label, icon, fn]: any) => (
                <button key={label as string} onClick={fn} title={label as string} style={{ background: "#2d4a2a", color: "#7bc47f", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>{icon}{label}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            <pre style={{ color: "#e0e0e0", fontFamily: "'Times New Roman', serif", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{selected.conteudo}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
