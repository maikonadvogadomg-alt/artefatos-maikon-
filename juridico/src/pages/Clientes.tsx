import { useState, useEffect } from "react";
import { db, type Cliente } from "@/lib/localDB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, User } from "lucide-react";

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, nome: "", cpf: "", email: "", telefone: "", endereco: "", observacoes: "" });
  const { toast } = useToast();

  useEffect(() => { setClientes(db.clientes.list()); }, []);

  const refresh = () => setClientes(db.clientes.list());

  const handleOpen = (c?: Cliente) => {
    setFormData(c ? { id: c.id, nome: c.nome, cpf: c.cpf||"", email: c.email||"", telefone: c.telefone||"", endereco: c.endereco||"", observacoes: c.observacoes||"" }
      : { id: 0, nome: "", cpf: "", email: "", telefone: "", endereco: "", observacoes: "" });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;
    if (formData.id) { db.clientes.update(formData.id, formData); toast({ title: "Cliente atualizado" }); }
    else { db.clientes.create({ nome: formData.nome, cpf: formData.cpf, email: formData.email, telefone: formData.telefone, endereco: formData.endereco, observacoes: formData.observacoes }); toast({ title: "Cliente criado" }); }
    refresh(); setIsOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir este cliente?")) return;
    db.clientes.delete(id);
    refresh();
    toast({ title: "Cliente excluído" });
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setFormData(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#7bc47f", cursor: "pointer", fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
        ← Voltar
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#f0f0f0", fontSize: 24, fontWeight: 700, margin: 0 }}>👤 Clientes</h2>
        <button onClick={() => handleOpen()} style={{ background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1a2a17", borderRadius: 12, padding: 24, width: "90%", maxWidth: 480, border: "1px solid #2d4a2a" }}>
            <h3 style={{ color: "#f0f0f0", margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{formData.id ? "Editar" : "Novo"} Cliente</h3>
            <form onSubmit={handleSubmit}>
              {[["nome","Nome *","text"],["cpf","CPF","text"],["email","E-mail","email"],["telefone","Telefone","text"],["endereco","Endereço","text"]].map(([k,l,t]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>{l}</label>
                  <input type={t} value={(formData as any)[k]} onChange={F(k)} required={k==="nome"} style={{ width: "100%", background: "#111a0e", border: "1px solid #2d4a2a", borderRadius: 8, padding: "8px 12px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Observações</label>
                <textarea value={formData.observacoes} onChange={F("observacoes")} rows={3} style={{ width: "100%", background: "#111a0e", border: "1px solid #2d4a2a", borderRadius: 8, padding: "8px 12px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
                <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, background: "#2a2a2a", color: "#ccc", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clientes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
          <User size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {clientes.map(c => (
            <div key={c.id} style={{ background: "#1a2a17", border: "1px solid #2d4a2a", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 16 }}>{c.nome}</div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>{[c.cpf, c.telefone, c.email].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleOpen(c)} style={{ background: "#2d4a2a", color: "#7bc47f", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}><Edit size={14} /></button>
                <button onClick={() => handleDelete(c.id)} style={{ background: "#3a1a1a", color: "#ef4444", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
