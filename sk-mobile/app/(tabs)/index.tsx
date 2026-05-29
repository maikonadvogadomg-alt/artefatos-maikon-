import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
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

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  mode?: string;
};

type Mode = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const MODES: Mode[] = [
  { id: "corrigir", label: "Corrigir", icon: "check-circle" },
  { id: "redacao", label: "Redigir", icon: "edit-2" },
  { id: "lacunas", label: "Lacunas", icon: "search" },
  { id: "resumir", label: "Resumir", icon: "align-left" },
  { id: "revisar", label: "Revisar", icon: "eye" },
  { id: "analisar", label: "Analisar", icon: "bar-chart-2" },
  { id: "gerar_minuta", label: "Minuta", icon: "file-text" },
  { id: "linguagem_simples", label: "Simplificar", icon: "book-open" },
  { id: "refinar", label: "Refinar", icon: "zap" },
  { id: "chat", label: "Chat Livre", icon: "message-circle" },
];

const PROMPTS: Record<string, string> = {
  corrigir: "Você é um assistente jurídico. Corrija o texto mantendo o sentido jurídico, corrigindo erros gramaticais e de estilo. Retorne apenas o texto corrigido.",
  redacao: "Você é um advogado especialista. Reescreva o texto com linguagem jurídica formal, técnica e precisa.",
  lacunas: "Você é um advogado especialista. Analise o texto jurídico e identifique lacunas, inconsistências, pontos ambíguos e possíveis riscos jurídicos. Liste cada problema.",
  resumir: "Você é um assistente jurídico. Faça um resumo conciso do texto, destacando partes envolvidas, pedidos e decisões.",
  revisar: "Você é um revisor jurídico. Revise o texto apontando problemas técnico-jurídicos e sugestões de melhoria.",
  analisar: "Você é um analista jurídico. Faça uma análise profunda identificando fundamentos legais, jurisprudência aplicável e estratégias.",
  gerar_minuta: "Você é um advogado especialista. Com base nas informações, gere uma minuta jurídica completa e formal.",
  linguagem_simples: "Você é um comunicador jurídico. Reescreva o texto jurídico em linguagem simples e acessível para leigos.",
  refinar: "Você é um advogado experiente. Refine o texto tornando-o mais persuasivo, técnico e juridicamente sólido.",
  chat: "Você é um assistente jurídico especializado no direito brasileiro. Responda de forma clara e fundamentada.",
};

const SK_API_KEY = "sk_api_key";
const SK_MODEL = "sk_model";
const SK_PERPLEXITY_KEY = "sk_perplexity_key";
const TIMEOUT_MS = 120000;

function uid() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function callAIDirect(text: string, mode: string, apiKey: string, model: string): Promise<string> {
  const systemPrompt = PROMPTS[mode] || PROMPTS.chat;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (model.startsWith("gemini")) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
          signal: controller.signal,
        }
      );
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error?.message || "Erro Gemini");
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (model.startsWith("sonar") || model.startsWith("llama")) {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
          temperature: 0.7, max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error?.message || "Erro Perplexity");
      return data.choices?.[0]?.message?.content || "";
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
        temperature: 0.7, max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.error?.message || "Erro OpenAI");
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(tid);
  }
}

export default function AssistenteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [activeMode, setActiveMode] = useState("corrigir");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText("");

    const userMsg: Message = { id: uid(), role: "user", content: text, mode: activeMode };
    setMessages(prev => [userMsg, ...prev]);
    setIsProcessing(true);

    try {
      const [storedKey, storedModel, pplxKey] = await Promise.all([
        AsyncStorage.getItem(SK_API_KEY),
        AsyncStorage.getItem(SK_MODEL),
        AsyncStorage.getItem(SK_PERPLEXITY_KEY),
      ]);

      let model = storedModel || "gpt-4o";
      let apiKey = storedKey || "";

      const isPerplexity = model.startsWith("sonar") || model.startsWith("llama");
      if (isPerplexity && pplxKey) apiKey = pplxKey;

      if (!apiKey) {
        const demoMsg: Message = {
          id: uid(), role: "ai",
          content: "⚠️ Configure sua chave de API em Configurações para usar a IA.\n\nVá em Configurações → cole sua chave OpenAI (sk-...) ou Gemini (AIza...) → Salvar.",
          mode: activeMode,
        };
        setMessages(prev => [demoMsg, ...prev]);
        return;
      }

      const result = await callAIDirect(text, activeMode, apiKey, model);
      const aiMsg: Message = { id: uid(), role: "ai", content: result, mode: activeMode };
      setMessages(prev => [aiMsg, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const errMsg: Message = {
        id: uid(), role: "ai",
        content: `Erro: ${err.message || "Verifique sua chave de API e conexão."}`,
        mode: "error",
      };
      setMessages(prev => [errMsg, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, activeMode, isProcessing]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    modeBar: {
      paddingVertical: 10, paddingHorizontal: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      ...(Platform.OS === "web" ? { paddingTop: 67 + 10 } : {}),
    },
    modeChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    },
    modeLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    chatList: { flex: 1, paddingHorizontal: 14 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
    emptyIcon: { marginBottom: 12, opacity: 0.4 },
    emptyText: {
      fontSize: 14, color: colors.mutedForeground, textAlign: "center",
      paddingHorizontal: 40, fontFamily: "Inter_400Regular",
    },
    messageBubble: { borderRadius: 14, padding: 12, marginBottom: 10, marginTop: 2, maxWidth: "100%" },
    messageRole: {
      fontSize: 10, fontFamily: "Inter_700Bold", marginBottom: 5,
      textTransform: "uppercase", letterSpacing: 0.8,
    },
    messageContent: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
    typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
    typingText: { fontSize: 13, color: colors.accentForeground, fontFamily: "Inter_500Medium" },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      padding: 12, paddingBottom: insets.bottom + 12,
      borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background,
      ...(Platform.OS === "web" ? { paddingBottom: 34 + 12 } : {}),
    },
    textInput: {
      flex: 1, backgroundColor: colors.input, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 10, paddingTop: 10,
      color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular",
      maxHeight: 120, borderWidth: 1, borderColor: colors.border,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  });

  const renderMessage = ({ item }: { item: Message }) => {
    const isAI = item.role === "ai";
    const isError = item.mode === "error";
    return (
      <View style={[styles.messageBubble, {
        backgroundColor: isError ? "#2d0808" : isAI ? colors.card : colors.accent,
        borderWidth: 1,
        borderColor: isError ? "#7f1d1d" : colors.border,
        alignSelf: isAI ? "flex-start" : "flex-end",
        maxWidth: "88%",
      }]}>
        <Text style={[styles.messageRole, { color: isAI ? colors.accentForeground : colors.secondaryForeground }]}>
          {isAI ? `IA · ${item.mode ?? ""}` : "Você"}
        </Text>
        <Text style={[styles.messageContent, { color: isError ? "#fca5a5" : colors.foreground }]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.modeBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MODES.map(m => {
            const isActive = activeMode === m.id;
            return (
              <Pressable key={m.id}
                style={[styles.modeChip, {
                  backgroundColor: isActive ? colors.primary : colors.accent,
                  borderWidth: 1,
                  borderColor: isActive ? colors.accentForeground : colors.border,
                }]}
                onPress={() => { setActiveMode(m.id); Haptics.selectionAsync(); }}
              >
                <Feather name={m.icon} size={13} color={isActive ? colors.accentForeground : colors.mutedForeground} />
                <Text style={[styles.modeLabel, { color: isActive ? colors.accentForeground : colors.mutedForeground }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={[styles.chatList, { flexGrow: 1 }]}
        scrollEnabled={!!messages.length}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={isProcessing ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.accentForeground} />
            <Text style={styles.typingText}>Processando com IA... (até 2 min)</Text>
          </View>
        ) : null}
        ListFooterComponent={messages.length === 0 && !isProcessing ? (
          <View style={styles.emptyState}>
            <Feather name="briefcase" size={40} color={colors.mutedForeground} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>Cole o texto jurídico abaixo e escolha um modo para começar</Text>
          </View>
        ) : null}
      />

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Cole o texto jurídico aqui..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          returnKeyType="default"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: inputText.trim() && !isProcessing ? colors.primary : colors.accent }]}
          onPress={handleSend}
          disabled={!inputText.trim() || isProcessing}
        >
          {isProcessing
            ? <ActivityIndicator size="small" color={colors.accentForeground} />
            : <Feather name="send" size={20} color={inputText.trim() ? colors.accentForeground : colors.mutedForeground} />
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
