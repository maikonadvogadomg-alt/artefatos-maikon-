import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useState, useRef } from "react";
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

const ACTIONS = [
  { key: "chat",    label: "💬 Chat livre",   prompt: "Você é um assistente jurídico especializado no direito brasileiro. Responda de forma clara e fundamentada." },
  { key: "resumir", label: "📋 Resumir",       prompt: "Faça um resumo jurídico conciso destacando partes, pedidos e decisões principais." },
  { key: "revisar", label: "🔍 Revisar",       prompt: "Revise o texto jurídico apontando problemas técnicos, erros e sugestões de melhoria." },
  { key: "refinar", label: "✨ Refinar",       prompt: "Refine e melhore o texto tornando-o mais persuasivo e juridicamente sólido." },
  { key: "minuta",  label: "📝 Gerar Minuta",  prompt: "Gere uma minuta jurídica completa e formal com base nas informações fornecidas." },
  { key: "analisar",label: "⚖️ Analisar",      prompt: "Faça uma análise jurídica profunda identificando fundamentos legais e riscos." },
];

async function callGroq(messages: { role: string; content: string }[], model: string, key: string) {
  let url = "https://api.openai.com/v1/chat/completions";
  if (key.startsWith("gsk_") || model.startsWith("llama") || model.startsWith("mixtral") || model.startsWith("gemma")) {
    url = "https://api.groq.com/openai/v1/chat/completions";
  } else if (model.startsWith("gemini")) {
    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const sys = messages.find(m => m.role === "system")?.content || "";
    const user = messages.filter(m => m.role === "user").map(m => m.content).join("\n");
    const res = await fetch(gUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: [{ parts: [{ text: user }] }] }),
    });
    const d = await res.json() as any;
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
  });
  const d = await res.json() as any;
  if (!res.ok) throw new Error(d.error?.message || `Erro ${res.status}`);
  return d.choices?.[0]?.message?.content || "Sem resposta";
}

export default function JuridicoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const currentAction = ACTIONS.find(a => a.key === action) || ACTIONS[0];

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const key = await AsyncStorage.getItem("sk_api_key") || "";
    const model = await AsyncStorage.getItem("sk_model") || "llama-3.3-70b-versatile";
    if (!key) {
      Alert.alert("Chave não configurada", "Vá em Configurações e coloque sua chave Groq (grátis) ou OpenAI.");
      return;
    }
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const apiMessages = [
        { role: "system", content: currentAction.prompt },
        ...newMessages.map(m => ({ role: m.role, content: m.content })),
      ];
      const reply = await callGroq(apiMessages, model, key);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Erro ao chamar IA");
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clear = () => { setMessages([]); setInput(""); };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10, paddingTop: 8 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    actionBtnActive: { backgroundColor: colors.tint, borderColor: colors.tint },
    actionText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    actionTextActive: { color: "#fff" },
    messages: { flex: 1, paddingHorizontal: 12 },
    bubble: { maxWidth: "88%", padding: 12, borderRadius: 16, marginBottom: 8 },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.tint, borderBottomRightRadius: 4 },
    aiBubble: { alignSelf: "flex-start", backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
    userText: { color: "#fff" },
    aiText: { color: colors.foreground },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 6, textAlign: "center", fontFamily: "Inter_700Bold" },
    emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular" },
    inputRow: { flexDirection: "row", gap: 8, padding: 10, paddingBottom: Math.max(insets.bottom, 10), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    input: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.foreground, maxHeight: 100, fontFamily: "Inter_400Regular" },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
    clearBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    loading: { padding: 16, alignItems: "flex-start" },
  });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.actions}>
        {ACTIONS.map(a => (
          <Pressable key={a.key} onPress={() => setAction(a.key)} style={[s.actionBtn, action === a.key && s.actionBtnActive]}>
            <Text style={[s.actionText, action === a.key && s.actionTextActive]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {messages.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>⚖️</Text>
          <Text style={s.emptyTitle}>Campo Jurídico</Text>
          <Text style={s.emptyText}>Selecione uma ação acima e digite seu texto ou pergunta jurídica.</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={{ paddingTop: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
          {messages.map((m, i) => (
            <View key={i} style={[s.bubble, m.role === "user" ? s.userBubble : s.aiBubble]}>
              <Text style={[s.bubbleText, m.role === "user" ? s.userText : s.aiText]}>{m.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={s.loading}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}
        </ScrollView>
      )}

      <View style={s.inputRow}>
        {messages.length > 0 && (
          <Pressable onPress={clear} style={s.clearBtn}>
            <Feather name="trash-2" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder={action === "chat" ? "Faça uma pergunta jurídica..." : "Cole o texto para processar..."}
          placeholderTextColor={colors.mutedForeground}
          multiline
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <Pressable onPress={send} style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]} disabled={!input.trim() || loading}>
          <Feather name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
