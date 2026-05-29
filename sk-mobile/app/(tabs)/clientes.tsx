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

type Cliente = {
  id: number;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  createdAt: string;
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

async function getBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SK_SERVER_URL);
    if (stored && stored.trim()) return stored.trim().replace(/\/$/, "");
  } catch {}
  return "";
}

export default function ClientesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      setError(null);
      const base = await getBaseUrl();
      if (!base) {
        setClientes([]);
        setError("Configure a URL do servidor em Configurações para carregar clientes.");
        return;
      }
      const res = await fetch(`${base}/api/clientes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const onRefresh = () => { setRefreshing(true); fetchClientes(); };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructiveForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    emptyText: { color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
    list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 20, ...(Platform.OS === "web" ? { paddingTop: 67 + 12 } : {}) },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.accentForeground },
    info: { flex: 1 },
    nome: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 3 },
    meta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    row: { flexDirection: "row", alignItems: "center", gap: 4 },
  });

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.accentForeground} /></View>;
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={32} color={colors.destructiveForeground} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchClientes(); }}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, clientes.length === 0 && { flex: 1, justifyContent: "center", alignItems: "center" }]}
      data={clientes}
      keyExtractor={item => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentForeground} />}
      showsVerticalScrollIndicator={false}
      scrollEnabled={clientes.length > 0}
      ListEmptyComponent={
        <View style={{ alignItems: "center", gap: 12 }}>
          <Feather name="users" size={40} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.nome)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.nome}>{item.nome}</Text>
            {item.email && (
              <View style={styles.row}>
                <Feather name="mail" size={11} color={colors.mutedForeground} />
                <Text style={styles.meta}>{item.email}</Text>
              </View>
            )}
            {item.telefone && (
              <View style={styles.row}>
                <Feather name="phone" size={11} color={colors.mutedForeground} />
                <Text style={styles.meta}>{item.telefone}</Text>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      )}
    />
  );
}
