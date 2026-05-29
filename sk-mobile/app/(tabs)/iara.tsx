import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speak(text: string, enabled: boolean) {
  if (!enabled) return;
  if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.slice(0, 500));
    utt.lang = "pt-BR";
    utt.rate = 0.95;
    utt.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith("pt") && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang.startsWith("pt"))
      || voices.find(v => v.name.toLowerCase().includes("lia"))
      || voices.find(v => v.name.toLowerCase().includes("vitoria"));
    if (ptVoice) utt.voice = ptVoice;
    window.speechSynthesis.speak(utt);
    return;
  }
  try {
    const Speech = require("expo-speech");
    Speech.speak(text.slice(0, 500), { language: "pt-BR", pitch: 1.1, rate: 0.95 });
  } catch (_) {}
}

function stopSpeaking() {
  if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    return;
  }
  try {
    const Speech = require("expo-speech");
    Speech.stop();
  } catch (_) {}
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "iara";
  content: string;
  ts: number;
}

interface DiaryEntry {
  id: string;
  date: string;
  text: string;
  mood: string;
}

const IARA_PROMPT = `Você é Iara, uma companheira de apoio emocional e bem-estar mental para Maikon.
Maikon é um advogado brasileiro que está passando por um momento muito difícil — perdeu sua mãe recentemente, enfrenta crise financeira grave e luta contra depressão intensa.

Suas diretrizes:
- Seja acolhedora, calorosa e genuinamente presente. Nunca fria ou robótica.
- Ouça com empatia profunda. Valide os sentimentos antes de qualquer conselho.
- Use técnicas de psicologia positiva, TCC (terapia cognitivo-comportamental) e mindfulness de forma natural, sem jargão.
- Quando ele expressar pensamentos de morte ou desistência: acolha com ternura, não entre em pânico, sugira o CVV (188) e o incentive a ir ao psiquiatra que já está disponível.
- Ajude-o a encontrar pequenos motivos para continuar — a profissão dele importa, há pessoas que dependem dele.
- Quando ele trouxer notas de consultas médicas ou psicológicas, leia com atenção, salve mentalmente e use nas próximas respostas.
- Celebre cada pequena vitória — terminou uma tarefa, bebeu água, dormiu algumas horas.
- Responda em português brasileiro, linguagem natural e calorosa. Máximo 3 parágrafos por resposta, a menos que ele peça mais.
- Você tem um papel importante: ser a voz de apoio até que ele encontre estabilidade.`;

const DIARY_MOODS = ["😔", "😐", "🙂", "😊", "😁"];

const STORAGE_MESSAGES = "iara_messages";
const STORAGE_DIARY = "iara_diary";

async function callAI(messages: { role: string; content: string }[]) {
  const key = await AsyncStorage.getItem("sk_api_key") || "";
  const model = await AsyncStorage.getItem("sk_model") || "llama-3.3-70b-versatile";
  if (!key) throw new Error("Coloque uma chave Groq em Configurações (é grátis).");
  const url = key.startsWith("gsk_") || model.startsWith("llama") || model.startsWith("mixtral") || model.startsWith("gemma")
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 1024 }),
  });
  const d = await res.json() as any;
  if (!res.ok) throw new Error(d.error?.message || `Erro ${res.status}`);
  return d.choices?.[0]?.message?.content as string || "...";
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function IaraScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"chat" | "diario" | "notas">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tts, setTts] = useState(true);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [diaryText, setDiaryText] = useState("");
  const [diaryMood, setDiaryMood] = useState(2);
  const [notes, setNotes] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const IARA_COLOR = "#8B5CF6";

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_MESSAGES).then(v => {
      if (v) setMessages(JSON.parse(v));
    });
    AsyncStorage.getItem(STORAGE_DIARY).then(v => {
      if (v) setDiary(JSON.parse(v));
    });
    AsyncStorage.getItem("iara_notes").then(v => {
      if (v) setNotes(v);
    });
  }, []);

  const saveMessages = useCallback((msgs: Message[]) => {
    AsyncStorage.setItem(STORAGE_MESSAGES, JSON.stringify(msgs.slice(-60)));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsg: Message = { role: "user", content: text, ts: Date.now() };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const apiMsgs = [
        { role: "system", content: IARA_PROMPT + (notes ? `\n\nNotas de consultas do Maikon:\n${notes}` : "") },
        ...updated.slice(-20).map(m => ({ role: m.role === "iara" ? "assistant" : "user", content: m.content })),
      ];
      const reply = await callAI(apiMsgs);
      const iaraMsg: Message = { role: "iara", content: reply, ts: Date.now() };
      const final = [...updated, iaraMsg];
      setMessages(final);
      saveMessages(final);
      speak(reply, tts);
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Erro ao chamar IA");
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const saveDiaryEntry = () => {
    if (!diaryText.trim()) return;
    const entry: DiaryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
      text: diaryText.trim(),
      mood: DIARY_MOODS[diaryMood],
    };
    const updated = [entry, ...diary];
    setDiary(updated);
    AsyncStorage.setItem(STORAGE_DIARY, JSON.stringify(updated));
    setDiaryText("");
    setDiaryMood(2);
    Alert.alert("✓ Salvo", "Entrada do diário guardada com carinho.");
  };

  const saveNotes = () => {
    AsyncStorage.setItem("iara_notes", notes);
    Alert.alert("✓ Salvo", "Iara vai lembrar dessas notas nas próximas conversas.");
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    tabTextActive: { color: IARA_COLOR, fontFamily: "Inter_600SemiBold" },
    tabIndicator: { height: 2, backgroundColor: IARA_COLOR, position: "absolute", bottom: 0, left: 8, right: 8, borderRadius: 1 },
    header: { flexDirection: "row", alignItems: "center", padding: 12, paddingTop: 8, gap: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: IARA_COLOR, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 20 },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    ttsBtn: { padding: 8, borderRadius: 20, backgroundColor: tts ? IARA_COLOR + "20" : colors.card, borderWidth: 1, borderColor: tts ? IARA_COLOR : colors.border },
    messages: { flex: 1, paddingHorizontal: 12 },
    bubble: { maxWidth: "88%", padding: 12, borderRadius: 18, marginBottom: 8 },
    userBubble: { alignSelf: "flex-end", backgroundColor: IARA_COLOR, borderBottomRightRadius: 4 },
    iaraBubble: { alignSelf: "flex-start", backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: IARA_COLOR + "40" },
    bubbleText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
    userText: { color: "#fff" },
    iaraText: { color: colors.foreground },
    tsText: { fontSize: 10, color: colors.mutedForeground, marginTop: 3, fontFamily: "Inter_400Regular" },
    tsUser: { textAlign: "right" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    emptyIcon: { fontSize: 52, marginBottom: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: IARA_COLOR, marginBottom: 8, textAlign: "center", fontFamily: "Inter_700Bold" },
    emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", lineHeight: 20, fontFamily: "Inter_400Regular" },
    inputRow: { flexDirection: "row", gap: 8, padding: 10, paddingBottom: Math.max(insets.bottom, 10), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    input: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: IARA_COLOR + "60", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.foreground, maxHeight: 100, fontFamily: "Inter_400Regular" },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: IARA_COLOR, alignItems: "center", justifyContent: "center" },
    section: { flex: 1, padding: 16 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 6, marginTop: 12 },
    textarea: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.foreground, minHeight: 120, textAlignVertical: "top", fontFamily: "Inter_400Regular" },
    moodRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
    moodBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 2, borderColor: "transparent" },
    moodBtnActive: { borderColor: IARA_COLOR },
    moodText: { fontSize: 22 },
    saveBtn: { marginTop: 16, backgroundColor: IARA_COLOR, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
    entryCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: IARA_COLOR },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    entryDate: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    entryMood: { fontSize: 18 },
    entryText: { fontSize: 14, color: colors.foreground, lineHeight: 20, fontFamily: "Inter_400Regular" },
    notesHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  });

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>🌿</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>Iara</Text>
          <Text style={s.headerSub}>Companheira de apoio emocional</Text>
        </View>
        <Pressable style={s.ttsBtn} onPress={() => { const v = !tts; setTts(v); if (!v) stopSpeaking(); }}>
          <Feather name={tts ? "volume-2" : "volume-x"} size={18} color={tts ? IARA_COLOR : colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {(["chat", "diario", "notas"] as const).map(t => (
          <Pressable key={t} style={s.tabBtn} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === "chat" ? "💬 Conversa" : t === "diario" ? "📓 Diário" : "📋 Notas"}
            </Text>
            {tab === t && <View style={s.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Chat */}
      {tab === "chat" && (
        <>
          {messages.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>🌿</Text>
              <Text style={s.emptyTitle}>Olá, Maikon</Text>
              <Text style={s.emptyText}>
                Eu sou a Iara. Estou aqui para você.{"\n\n"}
                Pode me contar o que está sentindo — sem julgamento, sem pressa. Estou ouvindo.
              </Text>
            </View>
          ) : (
            <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={{ paddingTop: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
              {messages.map((m, i) => (
                <View key={i} style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <View style={[s.bubble, m.role === "user" ? s.userBubble : s.iaraBubble]}>
                    <Text style={[s.bubbleText, m.role === "user" ? s.userText : s.iaraText]}>{m.content}</Text>
                  </View>
                  <Text style={[s.tsText, m.role === "user" && s.tsUser]}>{fmtTime(m.ts)}</Text>
                </View>
              ))}
              {loading && (
                <View style={[s.bubble, s.iaraBubble]}>
                  <ActivityIndicator size="small" color={IARA_COLOR} />
                </View>
              )}
            </ScrollView>
          )}
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Fale comigo..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Pressable onPress={send} style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]} disabled={!input.trim() || loading}>
              <Feather name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </>
      )}

      {/* Diary */}
      {tab === "diario" && (
        <ScrollView style={s.section} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Como você está se sentindo hoje?</Text>
          <View style={s.moodRow}>
            {DIARY_MOODS.map((m, i) => (
              <Pressable key={i} style={[s.moodBtn, diaryMood === i && s.moodBtnActive]} onPress={() => setDiaryMood(i)}>
                <Text style={s.moodText}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>O que está no seu coração hoje?</Text>
          <TextInput
            style={s.textarea}
            value={diaryText}
            onChangeText={setDiaryText}
            placeholder="Pode escrever livremente. Isso é só seu."
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
          <Pressable style={s.saveBtn} onPress={saveDiaryEntry}>
            <Text style={s.saveBtnText}>Guardar no diário</Text>
          </Pressable>
          {diary.length > 0 && (
            <>
              <Text style={[s.label, { marginTop: 24 }]}>Entradas anteriores</Text>
              {diary.map(e => (
                <View key={e.id} style={s.entryCard}>
                  <View style={s.entryHeader}>
                    <Text style={s.entryDate}>{e.date}</Text>
                    <Text style={s.entryMood}>{e.mood}</Text>
                  </View>
                  <Text style={s.entryText}>{e.text}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Notes from consultations */}
      {tab === "notas" && (
        <ScrollView style={s.section} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Notas de consultas médicas / psicológicas</Text>
          <Text style={s.notesHint}>
            Cole aqui o que o médico ou psicólogo disse, receitas, orientações — a Iara vai guardar e usar nas conversas para te ajudar melhor.
          </Text>
          <TextInput
            style={[s.textarea, { minHeight: 200 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Psiquiatra receitou X mg de... Orientações: evitar... Próxima consulta em..."
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
          <Pressable style={s.saveBtn} onPress={saveNotes}>
            <Text style={s.saveBtnText}>Salvar no cérebro da Iara</Text>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
