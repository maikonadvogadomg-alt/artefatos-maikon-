import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SK_API_KEY = "sk_api_key";
const SK_MODEL = "sk_model";
const SK_PERPLEXITY_KEY = "sk_perplexity_key";
const SK_NEON_URL = "sk_neon_url";
const SK_SERVER_URL = "sk_server_url";

const ALL_KEYS = [SK_API_KEY, SK_MODEL, SK_PERPLEXITY_KEY, SK_NEON_URL, SK_SERVER_URL];

const MODELS = [
  { value: "llama-3.3-70b-versatile", label: "🟣 Groq Llama 3.3 70B (GRÁTIS ⚡)", provider: "groq" },
  { value: "llama3-8b-8192",          label: "🟣 Groq Llama 3 8B (GRÁTIS ⚡ rápido)", provider: "groq" },
  { value: "mixtral-8x7b-32768",      label: "🟣 Groq Mixtral 8x7B (GRÁTIS ⚡)", provider: "groq" },
  { value: "gemma2-9b-it",            label: "🟣 Groq Gemma 2 9B (GRÁTIS ⚡)", provider: "groq" },
  { value: "gpt-4o-mini",             label: "🟢 OpenAI GPT-4o Mini (barato)", provider: "openai" },
  { value: "gpt-4o",                  label: "🟢 OpenAI GPT-4o (avançado)", provider: "openai" },
  { value: "gemini-2.0-flash",        label: "🔵 Gemini 2.0 Flash", provider: "google" },
  { value: "gemini-1.5-pro",          label: "🔵 Gemini 1.5 Pro", provider: "google" },
];

export default function ConfiguracoesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [apiKey, setApiKey] = useState("");
  const [perplexityKey, setPerplexityKey] = useState("");
  const [neonUrl, setNeonUrl] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("gpt-4o");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [k, m, pk, nu, su] = await Promise.all([
        AsyncStorage.getItem(SK_API_KEY),
        AsyncStorage.getItem(SK_MODEL),
        AsyncStorage.getItem(SK_PERPLEXITY_KEY),
        AsyncStorage.getItem(SK_NEON_URL),
        AsyncStorage.getItem(SK_SERVER_URL),
      ]);
      if (k) { setApiKey(k); setSaved(true); }
      if (m && m !== "demo") setModel(m);
      if (pk) setPerplexityKey(pk);
      if (nu) setNeonUrl(nu);
      if (su) setServerUrl(su);
    })();
  }, []);

  const saveAll = async () => {
    await Promise.all([
      AsyncStorage.setItem(SK_API_KEY, apiKey),
      AsyncStorage.setItem(SK_MODEL, model),
      AsyncStorage.setItem(SK_PERPLEXITY_KEY, perplexityKey),
      AsyncStorage.setItem(SK_NEON_URL, neonUrl),
      AsyncStorage.setItem(SK_SERVER_URL, serverUrl),
    ]);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✓ Salvo", "Configurações salvas com sucesso.");
  };

  const testKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      Alert.alert("Atenção", "Digite uma chave antes de testar.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestMsg("");
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (res.ok) {
        setTestResult("ok");
        setTestMsg("Chave válida! Conectado.");
      } else {
        const d = await res.json() as any;
        setTestResult("error");
        setTestMsg(d.error?.message || "Chave inválida");
      }
    } catch (e: any) {
      setTestResult("error");
      setTestMsg(e?.message || "Erro de rede");
    }
    setTesting(false);
    Haptics.notificationAsync(
      testResult === "ok" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
  };

  const exportConfig = async () => {
    setExporting(true);
    try {
      const config: Record<string, string> = {};
      for (const key of ALL_KEYS) {
        const val = await AsyncStorage.getItem(key);
        if (val !== null) config[key] = val;
      }
      const json = JSON.stringify(config, null, 2);
      await Share.share({
        message: json,
        title: "SK Jurídico — Configurações",
      });
    } catch (e: any) {
      if (e?.message !== "User did not share") {
        Alert.alert("Erro ao exportar", e?.message || "Erro desconhecido");
      }
    } finally {
      setExporting(false);
    }
  };

  const importConfig = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setImporting(false);
        return;
      }

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error(`Não foi possível ler o arquivo (HTTP ${response.status})`);
      const content = await response.text();

      const parsed = JSON.parse(content) as unknown;

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Arquivo JSON inválido — deve ser um objeto com as configurações.");
      }

      const data = parsed as Record<string, unknown>;
      const updates: Promise<void>[] = [];
      for (const key of ALL_KEYS) {
        if (typeof data[key] === "string") {
          updates.push(AsyncStorage.setItem(key, data[key] as string));
        }
      }

      if (updates.length === 0) {
        throw new Error("Nenhuma configuração reconhecida no arquivo. Exporte primeiro para gerar um arquivo válido.");
      }

      await Promise.all(updates);

      const [k, m, pk, nu, su] = await Promise.all([
        AsyncStorage.getItem(SK_API_KEY),
        AsyncStorage.getItem(SK_MODEL),
        AsyncStorage.getItem(SK_PERPLEXITY_KEY),
        AsyncStorage.getItem(SK_NEON_URL),
        AsyncStorage.getItem(SK_SERVER_URL),
      ]);
      if (k) setApiKey(k);
      if (m && m !== "demo") setModel(m);
      if (pk) setPerplexityKey(pk);
      if (nu) setNeonUrl(nu);
      if (su) setServerUrl(su);
      setSaved(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✓ Importado", `${updates.length} configurações carregadas com sucesso.`);
    } catch (e: any) {
      Alert.alert("Erro ao importar", e?.message || "Verifique se o arquivo é um JSON válido exportado pelo SK Jurídico.");
    } finally {
      setImporting(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
      paddingBottom: insets.bottom + 40,
    },
    section: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16,
      marginBottom: 14, borderWidth: 1, borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13, fontFamily: "Inter_700Bold", color: colors.accentForeground,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14,
    },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 6 },
    inputRow: {
      flexDirection: "row", alignItems: "center", backgroundColor: colors.input,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, marginBottom: 10, minHeight: 46,
    },
    textInput: { flex: 1, color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 10 },
    eyeBtn: { padding: 4 },
    modelBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
    },
    modelLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
    modelProvider: { fontSize: 11, fontFamily: "Inter_400Regular" },
    btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    btnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
    row: { flexDirection: "row", gap: 10, marginTop: 4 },
    hint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
  });

  const currentProvider = MODELS.find(m2 => m2.value === model)?.provider ?? "openai";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Chave Principal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 Chave de API</Text>
        <Text style={styles.label}>
          {currentProvider === "openai" ? "OpenAI API Key (sk-...)" :
           currentProvider === "google" ? "Gemini API Key (AIza...)" : "Chave principal"}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={apiKey}
            onChangeText={k => { setApiKey(k); setSaved(false); setTestResult(null); }}
            placeholder="Cole sua chave aqui..."
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowKey(v => !v)}>
            <Feather name={showKey ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {testMsg ? (
          <Text style={[styles.hint, { color: testResult === "ok" ? "#22c55e" : "#ef4444", marginBottom: 8 }]}>
            {testResult === "ok" ? "✓ " : "✗ "}{testMsg}
          </Text>
        ) : null}

        <View style={styles.row}>
          <Pressable style={[styles.btn, { flex: 1, backgroundColor: colors.primary }]} onPress={saveAll}>
            <Text style={[styles.btnText, { color: colors.accentForeground }]}>
              {saved ? "✓ Salvo" : "Salvar Tudo"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { flex: 1, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border }]}
            onPress={testKey} disabled={testing}
          >
            {testing
              ? <ActivityIndicator size="small" color={colors.accentForeground} />
              : <Text style={[styles.btnText, { color: colors.foreground }]}>Testar OpenAI</Text>
            }
          </Pressable>
        </View>
      </View>

      {/* Perplexity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🟡 Perplexity API Key</Text>
        <Text style={styles.label}>Para modelos Sonar (pplx-...)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={perplexityKey}
            onChangeText={k => { setPerplexityKey(k); setSaved(false); }}
            placeholder="pplx-..."
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Modelo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Modelo de IA</Text>
        {MODELS.map(m2 => {
          const isSelected = model === m2.value;
          return (
            <Pressable key={m2.value}
              style={[styles.modelBtn, {
                backgroundColor: isSelected ? colors.primary : colors.input,
                borderColor: isSelected ? colors.accentForeground : colors.border,
              }]}
              onPress={() => { setModel(m2.value); setSaved(false); Haptics.selectionAsync(); }}
            >
              <View>
                <Text style={[styles.modelLabel, { color: isSelected ? colors.accentForeground : colors.foreground }]}>
                  {m2.label}
                </Text>
                <Text style={[styles.modelProvider, { color: colors.mutedForeground }]}>
                  {m2.provider === "openai" ? "OpenAI" : m2.provider === "google" ? "Google" : "Perplexity"}
                </Text>
              </View>
              {isSelected && <Feather name="check-circle" size={18} color={colors.accentForeground} />}
            </Pressable>
          );
        })}
      </View>

      {/* URL do Servidor */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 URL do Servidor (opcional)</Text>
        <Text style={styles.label}>URL base da sua API (para Clientes e Processos)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={serverUrl}
            onChangeText={u => { setServerUrl(u); setSaved(false); }}
            placeholder="https://meuservidor.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        <Text style={styles.hint}>
          Deixe em branco se não usar servidor próprio. A IA funciona sem servidor — direto da chave de API.
        </Text>
      </View>

      {/* Neon DB */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗄 Banco de Dados — Neon</Text>
        <Text style={styles.label}>Connection string PostgreSQL</Text>
        <View style={[styles.inputRow, { minHeight: 60 }]}>
          <TextInput
            style={[styles.textInput, { paddingVertical: 8 }]}
            value={neonUrl}
            onChangeText={u => { setNeonUrl(u); setSaved(false); }}
            placeholder="postgresql://user:pass@host/db?sslmode=require"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
        </View>
        <Text style={styles.hint}>Cole a URL do painel do Neon (console.neon.tech)</Text>
      </View>

      {/* Salvar */}
      <Pressable style={[styles.btn, { backgroundColor: colors.primary, marginBottom: 14 }]} onPress={saveAll}>
        <Text style={[styles.btnText, { color: colors.accentForeground }]}>💾 Salvar Todas as Configurações</Text>
      </Pressable>

      {/* Import / Export */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Backup de Configurações</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14, lineHeight: 19 }}>
          Exporte suas configurações para JSON e importe em outro dispositivo.
        </Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.btn, { flex: 1, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border }]}
            onPress={exportConfig}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color={colors.accentForeground} />
              : <Text style={[styles.btnText, { color: colors.foreground }]}>⬆ Exportar JSON</Text>
            }
          </Pressable>
          <Pressable
            style={[styles.btn, { flex: 1, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border }]}
            onPress={importConfig}
            disabled={importing}
          >
            {importing
              ? <ActivityIndicator size="small" color={colors.accentForeground} />
              : <Text style={[styles.btnText, { color: colors.foreground }]}>⬇ Importar JSON</Text>
            }
          </Pressable>
        </View>
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Sobre</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
          SK Jurídico Mobile v1.0.0 — Assistente jurídico com IA.{"\n\n"}
          100% autônomo — chama OpenAI, Gemini e Perplexity diretamente do app, sem servidor intermediário.{"\n\n"}
          Maikon Caldeira — OAB/MG 183712
        </Text>
      </View>
    </ScrollView>
  );
}
