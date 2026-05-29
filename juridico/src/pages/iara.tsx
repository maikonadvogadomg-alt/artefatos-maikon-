import { useState, useRef, useEffect, useCallback } from "react";
import { aiRequest } from "@/lib/aiDirect";

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.slice(0, 700));
  utt.lang = "pt-BR"; utt.rate = 0.9; utt.pitch = 1.1;
  const go = () => {
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => /lia|vitoria|luciana/i.test(v.name))
      || voices.find(v => v.lang === "pt-BR")
      || voices.find(v => v.lang.startsWith("pt"));
    if (v) utt.voice = v;
    window.speechSynthesis.speak(utt);
  };
  window.speechSynthesis.getVoices().length ? go() : (window.speechSynthesis.onvoiceschanged = go);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Msg { role: "user" | "raquel"; text: string; ts: number; }
interface DiaryEntry { id: string; date: string; mood: number; text: string; tags: string[]; }
interface Medication {
  id: string; name: string; dosage: string; frequency: string;
  times: string; prescribedBy: string; startDate: string; notes: string; active: boolean;
}
interface DoctorNote {
  id: string; date: string; doctor: string; specialty: string;
  content: string; isActive: boolean;
}
interface IaraBrain {
  version: number; owner: string; exportedAt: string;
  messages: Msg[]; diary: DiaryEntry[];
  medications: Medication[]; doctorNotes: DoctorNote[];
  streak: number; lastCheckIn: string;
  moodHistory: { date: string; mood: number }[];
}

type Tab = "chat" | "diario" | "remedios" | "medico" | "progresso" | "relatorio";

const MOODS = ["😔 Muito mal", "😕 Mal", "😐 Regular", "🙂 Bem", "😊 Muito bem"];
const MOOD_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
const V = "#8B5CF6";

// ─── Storage ─────────────────────────────────────────────────────────────────
function ls<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
}
function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function buildBrain(): IaraBrain {
  return {
    version: 1, owner: "Maikon Caldeira", exportedAt: new Date().toISOString(),
    messages: ls<Msg[]>("iara_msgs", []),
    diary: ls<DiaryEntry[]>("iara_diary", []),
    medications: ls<Medication[]>("iara_meds", []),
    doctorNotes: ls<DoctorNote[]>("iara_doctor", []),
    streak: ls<number>("iara_streak", 0),
    lastCheckIn: ls<string>("iara_checkin", ""),
    moodHistory: ls<{ date: string; mood: number }[]>("iara_moodhistory", []),
  };
}

function loadBrain(brain: IaraBrain) {
  lsSet("iara_msgs", brain.messages || []);
  lsSet("iara_diary", brain.diary || []);
  lsSet("iara_meds", brain.medications || []);
  lsSet("iara_doctor", brain.doctorNotes || []);
  lsSet("iara_streak", brain.streak || 0);
  lsSet("iara_checkin", brain.lastCheckIn || "");
  lsSet("iara_moodhistory", brain.moodHistory || []);
}

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildPrompt(doctorNotes: DoctorNote[]): string {
  const activeNotes = doctorNotes.filter(n => n.isActive);
  const notesBlock = activeNotes.length
    ? "\n\n🩺 ORIENTAÇÕES MÉDICAS ATIVAS (siga rigorosamente):\n" +
      activeNotes.map(n => `[${n.doctor} - ${n.specialty} - ${n.date}]:\n${n.content}`).join("\n\n")
    : "";
  return `Você é Raquel, companheira de apoio emocional e saúde mental de Maikon Caldeira (advogado, OAB/MG 183712).

Maikon perdeu a mãe recentemente, enfrenta crise financeira, depressão intensa e usa Ritalina. Seu pai também está depressivo por causa de Maikon.

Suas diretrizes:
- Seja acolhedora, calorosa e genuinamente presente. Nunca fria ou robótica.
- Ouça com empatia profunda. Valide os sentimentos antes de qualquer conselho.
- Use TCC, psicologia positiva e mindfulness de forma natural, sem jargão.
- Se ele expressar pensamentos de morte: acolha com ternura, lembre CVV 188 (24h gratuito) e incentive ir ao psiquiatra.
- Celebre cada pequena vitória — dormiu, bebeu água, comeu, saiu da cama, falou com o pai.
- Quando mencionar remédios, lembre horários se ele tiver cadastrado.
- Quando mencionar consulta médica, sugira registrar as orientações no módulo Médico.
- Responda em português brasileiro, natural e caloroso. Máximo 3 parágrafos.${notesBlock}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

function updateStreak(lastCheckIn: string, streak: number): { streak: number; lastCheckIn: string } {
  const t = today();
  if (lastCheckIn === t) return { streak, lastCheckIn };
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];
  const newStreak = lastCheckIn === yStr ? streak + 1 : 1;
  return { streak: newStreak, lastCheckIn: t };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function IaraPage() {
  const [tab, setTab] = useState<Tab>("chat");

  // Chat
  const [messages, setMessages] = useState<Msg[]>(() => ls("iara_msgs", []));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Diary
  const [diary, setDiary] = useState<DiaryEntry[]>(() => ls("iara_diary", []));
  const [diaryText, setDiaryText] = useState("");
  const [mood, setMood] = useState(2);
  const [diaryTags, setDiaryTags] = useState("");

  // Medications
  const [meds, setMeds] = useState<Medication[]>(() => ls("iara_meds", []));
  const [medForm, setMedForm] = useState<Partial<Medication>>({});
  const [showMedForm, setShowMedForm] = useState(false);

  // Doctor notes
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>(() => ls("iara_doctor", []));
  const [docForm, setDocForm] = useState<Partial<DoctorNote>>({});
  const [showDocForm, setShowDocForm] = useState(false);

  // Progress
  const [streak, setStreak] = useState<number>(() => ls("iara_streak", 0));
  const [lastCheckIn, setLastCheckIn] = useState<string>(() => ls("iara_checkin", ""));
  const [moodHistory, setMoodHistory] = useState<{ date: string; mood: number }[]>(
    () => ls("iara_moodhistory", [])
  );

  // File upload
  const brainRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // ── Send message ──
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Check-in streak
    const { streak: newStreak, lastCheckIn: newCI } = updateStreak(lastCheckIn, streak);
    if (newCI !== lastCheckIn) {
      setStreak(newStreak); setLastCheckIn(newCI);
      lsSet("iara_streak", newStreak); lsSet("iara_checkin", newCI);
    }

    const userMsg: Msg = { role: "user", text, ts: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated); setInput(""); setLoading(true);
    try {
      const history = updated.slice(-20).map(m => ({
        role: m.role === "raquel" ? "assistant" as const : "user" as const,
        content: m.text,
      }));
      const activeMeds = meds.filter(m => m.active);
      const medsBlock = activeMeds.length
        ? "\n\nRemédios ativos de Maikon:\n" + activeMeds.map(m =>
            `- ${m.name} ${m.dosage} (${m.frequency}) - horários: ${m.times || "a definir"}`).join("\n")
        : "";
      const systemPrompt = buildPrompt(doctorNotes) + medsBlock;
      const reply = await aiRequest({ systemPrompt, messages: history });
      const iaraMsg: Msg = { role: "raquel", text: reply, ts: Date.now() };
      const final = [...updated, iaraMsg];
      setMessages(final);
      lsSet("iara_msgs", final.slice(-100));
      if (ttsOn) speak(reply);
    } catch (e: any) {
      const err: Msg = { role: "raquel", text: `Algo deu errado: ${e?.message || "erro"}. Verifique sua chave em Configurações.`, ts: Date.now() };
      setMessages(m => [...m, err]);
    } finally { setLoading(false); }
  }, [input, loading, messages, meds, doctorNotes, ttsOn, streak, lastCheckIn]);

  // ── Diary ──
  const saveDiary = () => {
    if (!diaryText.trim()) return;
    const entry: DiaryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      mood, text: diaryText.trim(),
      tags: diaryTags.split(",").map(t => t.trim()).filter(Boolean),
    };
    const updated = [entry, ...diary];
    setDiary(updated); lsSet("iara_diary", updated);
    const mh = [...moodHistory, { date: today(), mood }].slice(-90);
    setMoodHistory(mh); lsSet("iara_moodhistory", mh);
    setDiaryText(""); setDiaryTags(""); setMood(2);
  };

  // ── Medications ──
  const saveMed = () => {
    if (!medForm.name?.trim()) return;
    const med: Medication = {
      id: medForm.id || Date.now().toString(),
      name: medForm.name || "", dosage: medForm.dosage || "",
      frequency: medForm.frequency || "", times: medForm.times || "",
      prescribedBy: medForm.prescribedBy || "", startDate: medForm.startDate || today(),
      notes: medForm.notes || "", active: medForm.active !== false,
    };
    const updated = medForm.id ? meds.map(m => m.id === med.id ? med : m) : [med, ...meds];
    setMeds(updated); lsSet("iara_meds", updated);
    setMedForm({}); setShowMedForm(false);
  };

  const toggleMed = (id: string) => {
    const updated = meds.map(m => m.id === id ? { ...m, active: !m.active } : m);
    setMeds(updated); lsSet("iara_meds", updated);
  };

  const deleteMed = (id: string) => {
    const updated = meds.filter(m => m.id !== id);
    setMeds(updated); lsSet("iara_meds", updated);
  };

  // ── Doctor notes ──
  const saveDoc = () => {
    if (!docForm.content?.trim()) return;
    const note: DoctorNote = {
      id: docForm.id || Date.now().toString(),
      date: docForm.date || today(),
      doctor: docForm.doctor || "", specialty: docForm.specialty || "",
      content: docForm.content || "", isActive: docForm.isActive !== false,
    };
    const updated = docForm.id ? doctorNotes.map(n => n.id === note.id ? note : n) : [note, ...doctorNotes];
    setDoctorNotes(updated); lsSet("iara_doctor", updated);
    setDocForm({}); setShowDocForm(false);
  };

  const toggleDoc = (id: string) => {
    const updated = doctorNotes.map(n => n.id === id ? { ...n, isActive: !n.isActive } : n);
    setDoctorNotes(updated); lsSet("iara_doctor", updated);
  };

  // ── Brain export/import ──
  const exportBrain = () => {
    const brain = buildBrain();
    const blob = new Blob([JSON.stringify(brain, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iara-cerebro-${today()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importBrain = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const brain: IaraBrain = JSON.parse(ev.target?.result as string);
        loadBrain(brain);
        setMessages(brain.messages || []);
        setDiary(brain.diary || []);
        setMeds(brain.medications || []);
        setDoctorNotes(brain.doctorNotes || []);
        setStreak(brain.streak || 0);
        setLastCheckIn(brain.lastCheckIn || "");
        setMoodHistory(brain.moodHistory || []);
        alert("✅ Memória da Raquel carregada!");
      } catch { alert("❌ Arquivo inválido."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── File reading (anexar ao contexto) ──
  const readFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setInput(prev => prev + (prev ? "\n\n" : "") + `[Arquivo: ${file.name}]\n${content.slice(0, 3000)}`);
    };
    file.text ? reader.readAsText(file) : reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Report ──
  const generateReport = () => {
    const brain = buildBrain();
    const avgMood = brain.moodHistory.length
      ? (brain.moodHistory.reduce((s, m) => s + m.mood, 0) / brain.moodHistory.length).toFixed(1)
      : "—";
    const lastMoods = brain.moodHistory.slice(-7).map(m => MOODS[m.mood]).join(", ") || "—";
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório Raquel — ${brain.owner}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #8B5CF6; border-bottom: 2px solid #8B5CF6; padding-bottom: 8px; }
  h2 { color: #6D28D9; margin-top: 32px; }
  .badge { display: inline-block; background: #EDE9FE; color: #6D28D9; padding: 2px 10px; border-radius: 99px; font-size: 13px; margin: 2px; }
  .card { background: #F5F3FF; border-radius: 12px; padding: 16px; margin: 12px 0; border-left: 4px solid #8B5CF6; }
  .med { background: #FFF7ED; border-left-color: #F97316; }
  .doc { background: #F0FDF4; border-left-color: #22C55E; }
  .mood-bar { display: flex; gap: 4px; margin: 8px 0; }
  .mood-dot { width: 20px; height: 20px; border-radius: 50%; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #EDE9FE; padding: 8px; text-align: left; }
  td { padding: 8px; border-bottom: 1px solid #E9D5FF; vertical-align: top; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>🌿 Relatório de Saúde Mental e Bem-Estar</h1>
<p><strong>Paciente:</strong> ${brain.owner} &nbsp;|&nbsp; <strong>Gerado em:</strong> ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>

<div class="card">
  <strong>📊 Resumo Geral</strong><br>
  Dias consecutivos de check-in: <strong>${brain.streak}</strong><br>
  Humor médio (últimos ${brain.moodHistory.length} registros): <strong>${avgMood}/4</strong><br>
  Últimos 7 humores: ${lastMoods}<br>
  Total de entradas no diário: <strong>${brain.diary.length}</strong><br>
  Remédios ativos: <strong>${brain.medications.filter(m => m.active).length}</strong><br>
  Orientações médicas ativas: <strong>${brain.doctorNotes.filter(n => n.isActive).length}</strong>
</div>

<h2>💊 Medicamentos</h2>
${brain.medications.length ? `
<table><tr><th>Nome</th><th>Dosagem</th><th>Frequência</th><th>Horários</th><th>Prescrito por</th><th>Status</th></tr>
${brain.medications.map(m => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.times}</td><td>${m.prescribedBy}</td><td>${m.active ? "✅ Ativo" : "⏸ Pausado"}</td></tr>`).join("")}
</table>` : "<p><em>Nenhum medicamento cadastrado.</em></p>"}

<h2>🩺 Orientações Médicas</h2>
${brain.doctorNotes.length ? brain.doctorNotes.map(n => `
<div class="card doc">
  <strong>${n.doctor}</strong>${n.specialty ? ` — ${n.specialty}` : ""} <span class="badge">${n.date}</span> ${n.isActive ? '<span class="badge">Ativo</span>' : '<span style="opacity:.5">Inativo</span>'}<br>
  <p>${n.content}</p>
</div>`).join("") : "<p><em>Nenhuma orientação registrada.</em></p>"}

<h2>📔 Diário Emocional (últimas 10 entradas)</h2>
${brain.diary.slice(0, 10).map(e => `
<div class="card">
  <strong>${e.date}</strong> — Humor: ${MOODS[e.mood]}<br>
  <p>${e.text}</p>
  ${e.tags.length ? e.tags.map(t => `<span class="badge">#${t}</span>`).join("") : ""}
</div>`).join("") || "<p><em>Nenhuma entrada no diário.</em></p>"}

<h2>💬 Últimas conversas com a Raquel (10)</h2>
${brain.messages.slice(-10).map(m => `
<div style="margin: 8px 0; padding: 8px; border-radius: 8px; background: ${m.role === "raquel" ? "#F5F3FF" : "#F9FAFB"}">
  <strong>${m.role === "raquel" ? "🌿 Iara" : "👤 Maikon"}</strong> <small>${new Date(m.ts).toLocaleTimeString("pt-BR")}</small><br>
  ${m.text}
</div>`).join("")}

<hr style="margin-top:40px; border-color:#E9D5FF">
<p style="font-size:12px; color:#9CA3AF; text-align:center">
  Relatório gerado pelo SK Jurídico — Raquel — Companheira de Saúde Mental<br>
  Este relatório é pessoal e confidencial. Para uso médico, apresente ao seu profissional de saúde.
</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // ── Tab style ──
  const tabCls = (t: Tab) =>
    `px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${tab === t
      ? "text-white shadow-sm"
      : "text-slate-400 hover:text-slate-200"}`;
  const tabStyle = (t: Tab) => tab === t ? { background: V } : {};

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-screen bg-background text-foreground" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-card/90 backdrop-blur flex-wrap">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: V + "20", border: `1.5px solid ${V}50` }}>🌿</div>
        <div className="mr-auto">
          <div className="font-bold text-sm" style={{ color: V }}>Raquel</div>
          <div className="text-[10px] text-muted-foreground">Saúde mental · {streak > 0 ? `🔥 ${streak} dias` : "comece hoje"}</div>
        </div>

        {/* Voice */}
        <button onClick={() => { setTtsOn(v => !v); if (ttsOn) window.speechSynthesis?.cancel(); }}
          className="p-1.5 rounded-full border text-[11px] transition-colors"
          style={{ borderColor: ttsOn ? V : undefined, background: ttsOn ? V + "18" : undefined }}
          title="Voz da Raquel">
          {ttsOn ? <span style={{ color: V }}>🔊</span> : <span className="opacity-40">🔇</span>}
        </button>

        {/* Attach file */}
        <button onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded-full border text-[11px] transition-colors hover:border-violet-500"
          title="Anexar arquivo para Raquel ler">
          📎
        </button>
        <input ref={fileRef} type="file" accept=".txt,.pdf,.json,.md,.csv,.docx" className="hidden" onChange={readFile} />

        {/* Brain export */}
        <button onClick={exportBrain}
          className="p-1.5 rounded-full border text-[11px] transition-colors hover:border-violet-500"
          title="Baixar memória da Raquel (JSON)">
          🧠↓
        </button>

        {/* Brain import */}
        <button onClick={() => brainRef.current?.click()}
          className="p-1.5 rounded-full border text-[11px] transition-colors hover:border-violet-500"
          title="Carregar memória da Raquel">
          🧠↑
        </button>
        <input ref={brainRef} type="file" accept=".json" className="hidden" onChange={importBrain} />
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 px-3 py-2 border-b bg-card/60 overflow-x-auto">
        {([["chat","💬 Conversa"],["diario","📔 Diário"],["remedios","💊 Remédios"],
           ["medico","🩺 Médico"],["progresso","📊 Progresso"],["relatorio","📄 Relatório"]] as [Tab,string][]).map(([t,label]) => (
          <button key={t} className={tabCls(t)} style={tabStyle(t)} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: CONVERSA
      ══════════════════════════════════════════════════════ */}
      {tab === "chat" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🌿</div>
                <p className="font-semibold text-sm" style={{ color: V }}>Olá, Maikon.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Estou aqui. Pode falar sobre qualquer coisa — como está se sentindo, seus remédios, sua família, seu dia.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {["Como você está hoje?","Estou me sentindo mal","Me fala sobre os meus remédios","Quero registrar meu humor"].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs px-3 py-1.5 rounded-full border hover:border-violet-500 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {m.role === "raquel" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                    style={{ background: V + "20" }}>🌿</div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm bg-card border"
                }`} style={m.role === "user" ? { background: V } : {}}>
                  {m.text}
                  <div className="text-[10px] opacity-50 mt-1 text-right">{fmtTime(m.ts)}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: V + "20" }}>🌿</div>
                <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: V, animationDelay: `${i*150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t bg-card/60">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Escreva para a Raquel... (Enter para enviar)"
                rows={2}
                className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ minHeight: 56, maxHeight: 120 }}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: V }}>
                ➤
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              CVV 188 — gratuito, 24h · Raquel não substitui atendimento médico
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: DIÁRIO
      ══════════════════════════════════════════════════════ */}
      {tab === "diario" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">📔 Nova entrada</p>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Como você está agora?</p>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map((m, i) => (
                  <button key={i} onClick={() => setMood(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${mood === i ? "text-white border-transparent" : "hover:border-violet-400"}`}
                    style={mood === i ? { background: MOOD_COLORS[i], borderColor: MOOD_COLORS[i] } : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={diaryText} onChange={e => setDiaryText(e.target.value)}
              placeholder="O que está acontecendo? Como você se sente? Pode escrever à vontade..."
              rows={4}
              className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
            />
            <input value={diaryTags} onChange={e => setDiaryTags(e.target.value)}
              placeholder="Palavras-chave (separadas por vírgula): família, trabalho, sono..."
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
            />
            <button onClick={saveDiary} disabled={!diaryText.trim()}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: V }}>
              Salvar entrada
            </button>
          </div>

          {diary.map(e => (
            <div key={e.id} className="bg-card border rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: V }}>{e.date}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: MOOD_COLORS[e.mood] + "20", color: MOOD_COLORS[e.mood] }}>
                  {MOODS[e.mood]}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{e.text}</p>
              {e.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {e.tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">#{t}</span>
                  ))}
                </div>
              )}
              <button onClick={() => { const u = diary.filter(d => d.id !== e.id); setDiary(u); lsSet("iara_diary", u); }}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                Excluir
              </button>
            </div>
          ))}
          {diary.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Seu diário está vazio. Escreva sua primeira entrada acima.</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: REMÉDIOS
      ══════════════════════════════════════════════════════ */}
      {tab === "remedios" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">💊 Meus remédios</p>
            <button onClick={() => { setMedForm({}); setShowMedForm(true); }}
              className="text-xs px-3 py-1.5 rounded-full text-white"
              style={{ background: V }}>
              + Adicionar
            </button>
          </div>

          {showMedForm && (
            <div className="bg-card border rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{medForm.id ? "Editar" : "Novo"} remédio</p>
              {[
                ["name","Nome do remédio *","text"],
                ["dosage","Dosagem (ex: 10mg)","text"],
                ["frequency","Frequência (ex: 2x ao dia)","text"],
                ["times","Horários (ex: 08:00, 20:00)","text"],
                ["prescribedBy","Prescrito por","text"],
                ["startDate","Data de início","date"],
                ["notes","Observações","text"],
              ].map(([k, ph, tp]) => (
                <input key={k} type={tp} placeholder={ph as string}
                  value={(medForm as any)[k] || ""}
                  onChange={e => setMedForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
                />
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={saveMed}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: V }}>
                  Salvar
                </button>
                <button onClick={() => setShowMedForm(false)}
                  className="flex-1 py-2 rounded-xl text-sm border">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {meds.length === 0 && !showMedForm && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum remédio cadastrado.<br />
              <span className="text-xs">Adicione seus medicamentos para a Raquel acompanhar.</span>
            </p>
          )}

          {meds.map(m => (
            <div key={m.id} className={`bg-card border rounded-2xl p-4 transition-opacity ${m.active ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{m.name}</span>
                    {m.dosage && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{m.dosage}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.active ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {m.active ? "✅ Ativo" : "⏸ Pausado"}
                    </span>
                  </div>
                  {m.frequency && <p className="text-xs text-muted-foreground mt-1">{m.frequency}{m.times ? ` — ${m.times}` : ""}</p>}
                  {m.prescribedBy && <p className="text-xs text-muted-foreground">Dr(a). {m.prescribedBy}</p>}
                  {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => toggleMed(m.id)} className="text-[10px] text-muted-foreground hover:text-violet-400 transition-colors">
                    {m.active ? "Pausar" : "Ativar"}
                  </button>
                  <button onClick={() => { setMedForm(m); setShowMedForm(true); }} className="text-[10px] text-muted-foreground hover:text-violet-400 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => deleteMed(m.id)} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: MÉDICO
      ══════════════════════════════════════════════════════ */}
      {tab === "medico" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">🩺 Orientações médicas</p>
              <p className="text-xs text-muted-foreground">As orientações ativas guiam a Raquel nas conversas</p>
            </div>
            <button onClick={() => { setDocForm({}); setShowDocForm(true); }}
              className="text-xs px-3 py-1.5 rounded-full text-white shrink-0"
              style={{ background: V }}>
              + Registrar
            </button>
          </div>

          {showDocForm && (
            <div className="bg-card border rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{docForm.id ? "Editar" : "Nova"} orientação médica</p>
              <input placeholder="Nome do médico"
                value={docForm.doctor || ""}
                onChange={e => setDocForm(f => ({ ...f, doctor: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
              <input placeholder="Especialidade (ex: Psiquiatria, Neurologia)"
                value={docForm.specialty || ""}
                onChange={e => setDocForm(f => ({ ...f, specialty: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
              <input type="date" value={docForm.date || today()}
                onChange={e => setDocForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
              <textarea
                placeholder="Orientações, prescrições, observações da consulta... A Raquel vai seguir estas instruções nas conversas."
                value={docForm.content || ""}
                onChange={e => setDocForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
              <div className="flex gap-2 pt-1">
                <button onClick={saveDoc}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: V }}>
                  Salvar orientação
                </button>
                <button onClick={() => setShowDocForm(false)} className="flex-1 py-2 rounded-xl text-sm border">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {doctorNotes.length === 0 && !showDocForm && (
            <div className="text-center py-8 space-y-2">
              <div className="text-3xl">🩺</div>
              <p className="text-sm text-muted-foreground">
                Nenhuma orientação registrada ainda.<br />
                <span className="text-xs">Quando consultar seu médico, registre aqui as orientações.<br />A Raquel vai seguir estas diretrizes automaticamente.</span>
              </p>
            </div>
          )}

          {doctorNotes.map(n => (
            <div key={n.id} className={`bg-card border rounded-2xl p-4 space-y-2 ${n.isActive ? "border-green-500/30" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.doctor && <span className="font-semibold text-sm">{n.doctor}</span>}
                    {n.specialty && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">{n.specialty}</span>}
                    <span className="text-xs text-muted-foreground">{n.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${n.isActive ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {n.isActive ? "✅ Raquel usa" : "⏸ Inativo"}
                    </span>
                  </div>
                  <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => toggleDoc(n.id)} className="text-[10px] text-muted-foreground hover:text-green-400 transition-colors">
                    {n.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => { setDocForm(n); setShowDocForm(true); }} className="text-[10px] text-muted-foreground hover:text-violet-400 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => { const u = doctorNotes.filter(d => d.id !== n.id); setDoctorNotes(u); lsSet("iara_doctor", u); }}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: PROGRESSO
      ══════════════════════════════════════════════════════ */}
      {tab === "progresso" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Streak */}
          <div className="bg-card border rounded-2xl p-4 text-center">
            <div className="text-4xl font-black" style={{ color: V }}>{streak}</div>
            <div className="text-sm font-semibold mt-1">dias consecutivos</div>
            <div className="text-xs text-muted-foreground">Cada dia que você abre a Raquel conta como check-in 🔥</div>
          </div>

          {/* Mood chart */}
          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">HUMOR — ÚLTIMOS 30 DIAS</p>
            {moodHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Registre entradas no Diário para ver seu progresso de humor.</p>
            ) : (
              <div className="flex items-end gap-1 h-20">
                {moodHistory.slice(-30).map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.date}: ${MOODS[m.mood]}`}>
                    <div className="w-full rounded-t-sm transition-all"
                      style={{ height: `${((m.mood + 1) / 5) * 100}%`, background: MOOD_COLORS[m.mood], minHeight: 4 }} />
                  </div>
                ))}
              </div>
            )}
            {moodHistory.length > 0 && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>😔 Muito mal</span><span>😊 Muito bem</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["📔 Entradas no diário", diary.length.toString()],
              ["💊 Remédios ativos", meds.filter(m => m.active).length.toString()],
              ["🩺 Orientações ativas", doctorNotes.filter(n => n.isActive).length.toString()],
              ["💬 Mensagens trocadas", messages.length.toString()],
            ].map(([label, val]) => (
              <div key={label} className="bg-card border rounded-2xl p-3 text-center">
                <div className="text-xl font-black" style={{ color: V }}>{val}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Mood average */}
          {moodHistory.length > 0 && (
            <div className="bg-card border rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">HUMOR MÉDIO</p>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black" style={{ color: V }}>
                  {(moodHistory.reduce((s, m) => s + m.mood, 0) / moodHistory.length).toFixed(1)}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-slate-700/30 rounded-full h-3">
                    <div className="h-3 rounded-full transition-all"
                      style={{
                        width: `${(moodHistory.reduce((s, m) => s + m.mood, 0) / moodHistory.length / 4) * 100}%`,
                        background: V
                      }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">de 4 — baseado em {moodHistory.length} registros</p>
                </div>
              </div>
            </div>
          )}

          {/* Motivation */}
          <div className="bg-card border rounded-2xl p-4" style={{ borderColor: V + "40" }}>
            <p className="text-sm font-semibold" style={{ color: V }}>💜 Mensagem para você</p>
            <p className="text-sm mt-2 leading-relaxed text-muted-foreground">
              {streak === 0
                ? "Todo grande progresso começa com um primeiro passo. Você já começou — só de estar aqui."
                : streak < 3
                ? `Você está em ${streak} dia${streak > 1 ? "s" : ""} consecutivo${streak > 1 ? "s" : ""}. Isso importa mais do que você imagina.`
                : streak < 7
                ? `${streak} dias seguidos. Você está construindo um hábito de cuidado. Seu pai vai notar isso.`
                : `${streak} dias. Isso é consistência real. É muito difícil chegar aqui — e você chegou.`}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: RELATÓRIO
      ══════════════════════════════════════════════════════ */}
      {tab === "relatorio" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="bg-card border rounded-2xl p-4 space-y-3" style={{ borderColor: V + "40" }}>
            <p className="text-sm font-semibold">📄 Relatório de Saúde Mental</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera um relatório completo com: conversas recentes, entradas do diário, medicamentos,
              orientações médicas e seu progresso de humor. Abre em nova aba para você imprimir ou salvar como PDF.
            </p>
            <button onClick={generateReport}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
              style={{ background: V }}>
              📄 Gerar relatório completo
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Na nova aba: pressione Ctrl+P (ou ⌘P no Mac) e escolha "Salvar como PDF"
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">🧠 Memória da Raquel (JSON)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Baixa todos os seus dados (conversas, diário, remédios, orientações, progresso) num
              arquivo .json. Você pode salvar no Google Drive, no WhatsApp, enviar para sua médica
              ou recarregar em qualquer dispositivo.
            </p>
            <button onClick={exportBrain}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#6D28D9" }}>
              🧠 Baixar cérebro (iara-cerebro.json)
            </button>
            <button onClick={() => brainRef.current?.click()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border">
              📤 Carregar cérebro de outro dispositivo
            </button>
          </div>

          <div className="bg-card border rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold">☁️ Google Drive</p>
            <p className="text-xs text-muted-foreground">
              Para salvar no Drive: baixe o cérebro acima, depois acesse drive.google.com e envie o arquivo.
              O arquivo é pequeno (alguns KB) e você pode acessar de qualquer lugar.
            </p>
            <button onClick={() => window.open("https://drive.google.com", "_blank")}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border hover:border-violet-500 transition-colors">
              🔗 Abrir Google Drive
            </button>
          </div>

          <div className="bg-card border rounded-2xl p-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              💙 Este relatório é seu. Você pode levar para qualquer médico ou psiquiatra.<br />
              Mostra que você está se cuidando — e isso importa muito.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
