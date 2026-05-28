import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

interface BuyerMatch {
  id: string | number;
  buyerName?: string;
  buyerEmail?: string;
  name?: string;
  email?: string;
  matchScore?: number;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#dc2626",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch {
    return "";
  }
}

export default function AgentChatsScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadMatches() {
    try {
      const res = await api.get<BuyerMatch[] | { matches: BuyerMatch[] }>("/api/agent-portal/matches");
      const data = Array.isArray(res) ? res : (res as any).matches ?? [];
      setMatches(data as BuyerMatch[]);
    } catch {
      // Silently fail — empty state handles it
    }
  }

  useEffect(() => {
    loadMatches().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }, []);

  function getBuyerDisplay(match: BuyerMatch): { name: string; initial: string } {
    const name =
      match.buyerName ||
      match.name ||
      match.buyerEmail?.split("@")[0] ||
      match.email?.split("@")[0] ||
      "Buyer";
    const initial = name.charAt(0).toUpperCase();
    return { name, initial };
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={matches.length === 0 ? styles.emptyContainer : styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyHint}>
              When buyers match with you, you can chat here
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { name, initial } = getBuyerDisplay(item);
          const avatarColor = getAvatarColor(name);
          const timestamp = item.lastMessageAt || item.updatedAt || item.createdAt;
          const preview = item.lastMessage;

          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => router.push(`/chat/${item.id}` as any)}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
              </View>

              {/* Info */}
              <View style={styles.rowInfo}>
                <View style={styles.rowTop}>
                  <Text style={styles.buyerName} numberOfLines={1}>{name}</Text>
                  {timestamp ? (
                    <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
                  ) : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {preview || "Tap to chat →"}
                </Text>
              </View>

              {/* Chevron */}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 64 },
  backText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  headerTitle: { fontSize: 17, fontWeight: "800", color: Colors.foreground },
  headerSpacer: { minWidth: 64 },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 15, color: Colors.mutedForeground },

  listContent: { paddingVertical: 8 },

  emptyContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: { alignItems: "center", paddingHorizontal: 40, gap: 10 },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: Colors.foreground, textAlign: "center" },
  emptyHint: { fontSize: 14, color: Colors.mutedForeground, textAlign: "center", lineHeight: 20 },

  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 76 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: "800" },
  rowInfo: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  buyerName: { fontSize: 16, fontWeight: "700", color: Colors.foreground, flex: 1, marginRight: 8 },
  timestamp: { fontSize: 12, color: Colors.mutedForeground, fontWeight: "500" },
  preview: { fontSize: 14, color: Colors.mutedForeground, lineHeight: 18 },
  chevron: { fontSize: 22, color: Colors.mutedForeground, marginLeft: 8, fontWeight: "300" },
});
