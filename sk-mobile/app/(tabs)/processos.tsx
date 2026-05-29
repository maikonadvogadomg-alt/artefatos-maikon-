import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SK_SERVER_URL = "sk_server_url";

type Processo = {
  id: number;
  numero: string;
  tipo: string;
  tribunal?: string;
  vara?: string;
  status: string;
  clienteNome?: string;
  descricao?: string;
  valorCausa?: number;
};

const STATUS_COLOR: Record<string, string> = {
  ativo: "#22c55e",
  encerrado: "#6b7c52",
  suspenso: "#f59e0b",
  arquivado: "#6b7280",
};

async function getBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SK_SERVER_URL);
    if (stored && stored.trim()) return stored.trim().replace(/\/$/, "");
  } catch {}
  return "";
}

export default function ProcessosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcessos = useCallback(async () => {
    try {
      setError(null);
      const base = await getBaseUrl();
      if (!base) {
        setProcessos([]);
        setError("Configure a URL do servidor em Configurações para carregar processos.");
        return;
      }
      const res = await fetch(`${base}/api/processos`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProcessos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchProcessos(); }, [fetchProcessos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProcessos();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructiveForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    emptyText: { color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
    list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 20, ...(Platform.OS === "web" ? { paddingTop: 67 + 12 } : {}) },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
    numero: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
    tipo: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    meta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.accentForeground} /></View>;
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={32} color={colors.destructiveForeground} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchProcessos(); }}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, processos.length === 0 && { flex: 1, justifyContent: "center", alignItems: "center" }]}
      data={processos}
      keyExtractor={item => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentForeground} />}
      showsVerticalScrollIndicator={false}
      scrollEnabled={processos.length > 0}
      ListEmptyComponent={
        <View style={{ alignItems: "center", gap: 12 }}>
          <Feather name="folder" size={40} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyText}>Nenhum processo encontrado</Text>
        </View>
      }
      renderItem={({ item }) => {
        const statusColor = STATUS_COLOR[item.status?.toLowerCase()] ?? "#6b7c52";
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.numero}>{item.numero}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.tipo}>{item.tipo}</Text>
            {item.clienteNome && (
              <View style={styles.row}>
                <Feather name="user" size={11} color={colors.mutedForeground} />
                <Text style={styles.meta}>{item.clienteNome}</Text>
              </View>
            )}
            {item.tribunal && (
              <View style={styles.row}>
                <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                <Text style={styles.meta}>{item.tribunal}{item.vara ? ` · ${item.vara}` : ""}</Text>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}
