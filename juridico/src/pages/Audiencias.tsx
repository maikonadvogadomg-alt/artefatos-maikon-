import { useState, useEffect } from "react";
import { db, type Audiencia, type Processo } from "@/lib/localDB";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Clock, MapPin } from "lucide-react";

const TIPOS = ["Conciliação","Instrução","Julgamento","Inicial","Perícia","Oitiva"];
const STATUS_LIST = ["Agendada","Realizada","Cancelada","Redesignada"];

export default function Audiencias() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ processoId: 0, data: new Date().toISOString().split("T")[0], hora: "14:00", local: "", tipo: "Conciliação", status: "Agendada", notas: "" });
  const { toast } = useToast();

  useEffect(() => { setAudiencias(db.audiencias.list()); setProcessos(db.processos.list()); }, []);
  const refresh = () => setAudiencias(db.audiencias.list());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.processoId) { toast({ title: "Selecione um processo", variant: "destructive" }); return; }
    db.audiencias.create(formData);
    toast({ title: "Audiência agendada" });
    refresh(); setIsOpen(false);
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setFormData(p => ({ ...p, [k]: k === "processoId" ? Number(e.target.value) : e.target.value }));

  const badgeColor: Record<string,string> = { Agendada: "#f59e0b", Realizada: "#22c55e", Cancelada: "#ef4444", Redesignada: "#a78bfa" };
  const inp = { width: "100%", background: "#111a0e", border: "1px solid #2d4a2a", borderRadius: 8, padding: "8px 12px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box" as const };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#7bc47f", cursor: "pointer", fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
        ← Voltar
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#f0f0f0", fontSize: 24, fontWeight: 700, margin: 0 }}>📅 Audiências</h2>
        <button onClick={() => setIsOpen(true)} style={{ background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Nova Audiência
        </button>
      </div>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1a2a17", borderRadius: 12, padding: 24, width: "90%", maxWidth: 480, border: "1px solid #2d4a2a" }}>
            <h3 style={{ color: "#f0f0f0", margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>Nova Audiência</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Processo *</label>
                <select value={formData.processoId} onChange={F("processoId")} required style={inp}>
                  <option value={0}>Selecione...</option>
                  {processos.map(p => <option key={p.id} value={p.id}>{p.numero} – {p.tipo}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Data</label>
                  <input type="date" value={formData.data} onChange={F("data")} style={inp} />
                </div>
                <div>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Hora</label>
                  <input type="time" value={formData.hora} onChange={F("hora")} style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Local</label>
                <input value={formData.local} onChange={F("local")} style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Tipo</label>
                  <select value={formData.tipo} onChange={F("tipo")} style={inp}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div>
                  <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Status</label>
                  <select value={formData.status} onChange={F("status")} style={inp}>{STATUS_LIST.map(s => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#b0b0b0", fontSize: 13, display: "block", marginBottom: 4 }}>Notas</label>
                <textarea value={formData.notas} onChange={F("notas")} rows={3} style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: "#4a7c3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
                <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, background: "#2a2a2a", color: "#ccc", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {audiencias.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
          <Calendar size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Nenhuma audiência agendada</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {audiencias.sort((a,b) => a.data.localeCompare(b.data)).map(a => {
            const p = processos.find(pr => pr.id === a.processoId);
            return (
              <div key={a.id} style={{ background: "#1a2a17", border: "1px solid #2d4a2a", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{a.tipo}</div>
                    <div style={{ color: "#888", fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{a.data}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} />{a.hora}</span>
                      {a.local && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{a.local}</span>}
                    </div>
                    {p && <div style={{ color: "#7bc47f", fontSize: 12, marginTop: 4 }}>⚖️ {p.numero}</div>}
                  </div>
                  <span style={{ background: (badgeColor[a.status]||"#666")+"22", color: badgeColor[a.status]||"#ccc", border: `1px solid ${badgeColor[a.status]||"#666"}44`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{a.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
