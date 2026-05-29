import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Template = {
  id: number;
  titulo: string;
  tipo: string;
  descricao?: string;
  conteudo: string;
  created_at: string;
};

const TIPOS = [
  "Petição Inicial", "Contestação", "Recurso", "Contrato", "Procuração",
  "Notificação", "Parecer", "Habeas Corpus", "Mandado de Segurança", "Outro",
];

const st = {
  page: { minHeight: "100%", padding: "0 0 40px", fontFamily: "'Inter', sans-serif", color: "hsl(55 25% 88%)" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#7aad3e" },
  btnPrimary: { background: "#4a5c2f", color: "#e8f0d8", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnDanger: { background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer" },
  btnGhost: { background: "#252d14", color: "hsl(55 25% 80%)", border: "1px solid #3a4a24", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer" },
  card: { background: "#252d14", border: "1px solid #3a4a24", borderRadius: 12, padding: "16px 18px", marginBottom: 10 },
  label: { fontSize: 12, color: "hsl(85 10% 55%)", display: "block" as const, marginBottom: 4, marginTop: 12, fontWeight: 500 },
  input: { width: "100%", background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 8, padding: "8px 10px", color: "hsl(55 25% 88%)", fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
  textarea: { width: "100%", background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 8, padding: "9px 10px", color: "hsl(55 25% 88%)", fontSize: 13, resize: "vertical" as const, boxSizing: "border-box" as const, outline: "none", fontFamily: "'Inter', sans-serif" },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, background: "#3a4a24", color: "#9acc55", marginRight: 8 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 },
  modal: { background: "#1e2810", border: "1px solid #3a4a24", borderRadius: 14, padding: 24, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" as const },
};

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? "Erro na requisição");
  }
  return res.json();
}

export default function Templates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [viewing, setViewing] = useState<Template | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");

  const [form, setForm] = useState({ titulo: "", tipo: TIPOS[0], descricao: "", conteudo: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/templates");
      setTemplates(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (err: any) {
      toast({ title: "Erro ao carregar templates", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!loaded && !loading) { load(); }

  const openNew = () => {
    setEditing(null);
    setForm({ titulo: "", tipo: TIPOS[0], descricao: "", conteudo: "" });
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ titulo: t.titulo, tipo: t.tipo, descricao: t.descricao ?? "", conteudo: t.conteudo });
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast({ title: "Título e conteúdo são obrigatórios", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        const updated = await apiFetch(`/templates/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        setTemplates(prev => prev.map(t => t.id === editing.id ? updated : t));
        toast({ title: "✓ Template atualizado" });
      } else {
        const created = await apiFetch("/templates", { method: "POST", body: JSON.stringify(form) });
        setTemplates(prev => [created, ...prev]);
        toast({ title: "✓ Template criado" });
      }
      setShowForm(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("Excluir este template?")) return;
    try {
      await apiFetch(`/templates/${id}`, { method: "DELETE" });
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: "Template excluído" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const copyContent = (t: Template) => {
    navigator.clipboard.writeText(t.conteudo);
    toast({ title: "✓ Conteúdo copiado" });
  };

  const tipos = ["Todos", ...TIPOS];
  const filtered = templates.filter(t => {
    const matchSearch = !search || t.titulo.toLowerCase().includes(search.toLowerCase()) || t.tipo.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "Todos" || t.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <Layout>
      <div style={st.page}>
        <div style={st.topBar}>
          <span style={st.title}>📄 Templates de Documentos</span>
          <button style={st.btnPrimary} onClick={openNew}>+ Novo Template</button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" as const }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou tipo..."
            style={{ ...st.input, maxWidth: 280 }}
          />
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            style={{ ...st.input, maxWidth: 200, cursor: "pointer" }}
          >
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {loading && (
          <div style={{ textAlign: "center" as const, padding: "32px 0", color: "#7aad3e" }}>⟳ Carregando templates...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center" as const, padding: "48px 0", color: "hsl(85 10% 45%)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, marginBottom: 6 }}>Nenhum template encontrado</div>
            <div style={{ fontSize: 13 }}>Clique em "+ Novo Template" para criar o primeiro</div>
          </div>
        )}

        {filtered.map(t => (
          <div key={t.id} style={st.card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.titulo}</div>
                <span style={st.badge}>{t.tipo}</span>
                {t.descricao && <span style={{ fontSize: 12, color: "hsl(85 10% 55%)" }}>{t.descricao}</span>}
                <div style={{ fontSize: 12, color: "hsl(85 10% 45%)", marginTop: 6 }}>
                  {new Date(t.created_at).toLocaleDateString("pt-BR")} · {t.conteudo.length} caracteres
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setViewing(t)} style={st.btnGhost} title="Ver conteúdo">👁</button>
                <button onClick={() => copyContent(t)} style={st.btnGhost} title="Copiar">📋</button>
                <button onClick={() => openEdit(t)} style={st.btnGhost} title="Editar">✏</button>
                <button onClick={() => deleteTemplate(t.id)} style={st.btnDanger} title="Excluir">🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#7aad3e", marginBottom: 16 }}>
              {editing ? "✏ Editar Template" : "+ Novo Template"}
            </div>

            <label style={st.label}>Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Petição Inicial Trabalhista" style={st.input} />

            <label style={st.label}>Tipo *</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              style={{ ...st.input, cursor: "pointer" }}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={st.label}>Descrição</label>
            <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Breve descrição do uso" style={st.input} />

            <label style={st.label}>Conteúdo *</label>
            <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              placeholder="Cole aqui o texto do template. Use [NOME_CLIENTE], [DATA], [VARA] etc. como marcadores."
              rows={10} style={st.textarea} />

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowForm(false)} style={{ ...st.btnGhost, flex: 1 }}>Cancelar</button>
              <button onClick={saveForm} style={{ ...st.btnPrimary, flex: 2 }}>
                {editing ? "✓ Salvar alterações" : "✓ Criar template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div style={st.overlay}>
          <div style={{ ...st.modal, maxWidth: 680 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#7aad3e" }}>{viewing.titulo}</span>
              <button onClick={() => setViewing(null)} style={{ background: "none", border: "none", color: "hsl(55 25% 88%)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <span style={st.badge}>{viewing.tipo}</span>
            {viewing.descricao && <div style={{ fontSize: 13, color: "hsl(85 10% 55%)", marginBottom: 12, marginTop: 8 }}>{viewing.descricao}</div>}
            <pre style={{ background: "#1a1f0f", border: "1px solid #3a4a24", borderRadius: 8, padding: 14, fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 12, color: "hsl(55 25% 88%)", maxHeight: 400, overflowY: "auto" }}>
              {viewing.conteudo}
            </pre>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => copyContent(viewing)} style={{ ...st.btnPrimary, flex: 1 }}>📋 Copiar</button>
              <button onClick={() => { openEdit(viewing); setViewing(null); }} style={{ ...st.btnGhost, flex: 1 }}>✏ Editar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
