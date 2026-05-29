import { useState, useEffect } from "react";
import { db, type Processo, type Cliente } from "@/lib/localDB";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FolderOpen } from "lucide-react";

const TIPOS = ["Cível","Criminal","Trabalhista","Família","Previdenciário","Tributário","Administrativo","Empresarial"];
const STATUS = ["Ativo","Suspenso","Arquivado","Encerrado"];

export default function Processos() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, numero: "", tipo: "Cível", clienteId: 0, tribunal: "", vara: "", status: "Ativo", descricao: "", valorCausa: 0 });
  const { toast } = useToast();

  useEffect(() => { setProcessos(db.processos.list()); setClientes(db.clientes.list()); }, []);

  const refresh = () => setProcessos(db.processos.list());

  const handleOpen = (p?: Processo) => {
    setFormData(p ? { id: p.id, numero: p.numero, tipo: p.tipo, clienteId: p.clienteId||0, tribunal: p.tribunal||"", vara: p.vara||"", status: p.status, descricao: p.descricao||"", valorCausa: p.valorCausa||0 }
      : { id: 0, numero: "", tipo: "Cível", clienteId: 0, tribunal: "", vara: "", status: "Ativo", descricao: "", valorCausa: 0 });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numero) return;
    const d = { ...formData, clienteId: formData.clienteId === 0 ? null : formData.clienteId };
    if (formData.id) { db.processos.update(formData.id, d); toast({ title: "Processo atualizado" }); }
    else { db.processos.create(d); toast({ title: "Processo criado" }); }
    refresh(); setIsOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir este processo?")) return;
    db.processos.delete(id);
    refresh();
    toast({ title: "Processo excluído" });
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setFormData(p => ({ ...p, [k]: k === "clienteId" || k === "valorCausa" ? Number(e.target.value) : e.target.value }));

  const statusColor: Record<string,string> = { Ativo: "#22c55e", Suspenso: "#f59e0b", Arquivado: "#6b7280", Encerrado: "#ef4444" };
  const inp = { width: "100%", background: "#111a0e", border: "1px solid #2d4a2a", borderRadius: 8, padding: "8px 12px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box" as const };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#7bc47f", cursor: "pointer", fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
        ← Voltar
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#f0f0f0", fontSize: 24, fontWeight: 700, margin: 0 }}>⚖️ Processos</h2>
        <button onClick={() => handleOpen()} style={{ background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Novo Processo
        </button>
      </div>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
          <div style={{ background: "#1a2a17", borderRadius: 12, padding: 24, width: "90%", maxWidth: 500, border: "1px solid #2d4a2a", margin: "20px auto" }}>
            <h3 style={{ color: "#f0f0f0", margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{formData.id ? "Editar" : "Novo"} Processo</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Número *</label>
                <input value={formData.numero} onChange={F("numero")} required style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Tipo</label>
                  <select value={formData.tipo} onChange={F("tipo")} style={inp}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Status</label>
                  <select value={formData.status} onChange={F("status")} style={inp}>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Cliente</label>
                <select value={formData.clienteId} onChange={F("clienteId")} style={inp}>
                  <option value={0}>Sem cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              {[["tribunal","Tribunal"],["vara","Vara"]].map(([k,l]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>{l}</label>
                  <input value={(formData as any)[k]} onChange={F(k)} style={inp} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Valor da Causa (R$)</label>
                <input type="number" value={formData.valorCausa} onChange={F("valorCausa")} style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Descrição</label>
                <textarea value={formData.descricao} onChange={F("descricao")} rows={3} style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
                <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, background: "#2a2a2a", color: "#ccc", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {processos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
          <FolderOpen size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Nenhum processo cadastrado</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {processos.map(p => {
            const c = clientes.find(cl => cl.id === p.clienteId);
            return (
              <div key={p.id} style={{ background: "#1a2a17", border: "1px solid #2d4a2a", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 15 }}>{p.numero}</span>
                    <span style={{ background: (statusColor[p.status]||"#666")+"22", color: statusColor[p.status]||"#ccc", border: `1px solid ${statusColor[p.status]||"#666"}44`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{p.status}</span>
                  </div>
                  <div style={{ color: "#888", fontSize: 13 }}>{p.tipo}{c ? ` · ${c.nome}` : ""}{p.tribunal ? ` · ${p.tribunal}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
                  <button onClick={() => handleOpen(p)} style={{ background: "#2d4a2a", color: "#7bc47f", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}><Edit size={14} /></button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: "#3a1a1a", color: "#ef4444", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
