import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  SafeAreaView, Alert, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { SkeletonRow } from "@/components/Skeleton";
import { VerifiedBadge, isVerified } from "@/components/VerifiedBadge";
import { haptics } from "@/lib/haptics";

interface Agent {
  id: string;
  name: string;
  photo: string | null;
  specialties: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  yearsExperience: number | null;
  serviceAreas: string[] | null;
  isApproved?: boolean;
  licenseNumber?: string | null;
}

interface Match {
  id: string;
  agentId: string;
  createdAt: string;
  agent: Agent;
  lastMessage?: { content?: string | null } | string | null;
}

export default function MatchesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadMatches = useCallback(async () => {
    try {
      const data = await api.get<Match[]>("/api/matches");
      setMatches(data);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }, [loadMatches]);

  useEffect(() => { loadMatches(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Matches</Text>
        </View>
        <View style={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Matches</Text>
        <Text style={styles.subtitle}>{matches.length} agent{matches.length !== 1 ? "s" : ""}</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💚</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Go to Discover and swipe right on agents you like!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => <MatchCard match={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function MatchCard({ match }: { match: Match }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const agent = match.agent;
  const avatarUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=256&background=dbeafe&color=2563eb`;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/chat/${match.id}`)} activeOpacity={0.85}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{agent.name}</Text>
          {isVerified(agent) && <VerifiedBadge size="sm" />}
        </View>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>⭐</Text>
          <Text style={styles.ratingText}>{agent.rating?.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({agent.reviewCount})</Text>
          {agent.yearsExperience != null && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.yearsText}>{agent.yearsExperience}yr exp</Text>
            </>
          )}
        </View>
        {agent.serviceAreas && agent.serviceAreas.length > 0 && (
          <Text style={styles.areas} numberOfLines={1}>
            📍 {agent.serviceAreas.slice(0, 2).join(", ")}
          </Text>
        )}
        {agent.specialties && agent.specialties.length > 0 && (
          <View style={styles.tagRow}>
            {agent.specialties.slice(0, 2).map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        {(() => {
          const preview = typeof match.lastMessage === "string" ? match.lastMessage : match.lastMessage?.content;
          return preview ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              💬 {preview}
            </Text>
          ) : null;
        })()}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => { haptics.light(); router.push(`/chat/${match.id}`); }}
          activeOpacity={0.85}
        >
          <Text style={styles.chatBtnText}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => { haptics.light(); router.push(`/booking/${agent.id}`); }}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>📅 Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  title: { fontSize: 24, fontWeight: "800", color: c.foreground },
  subtitle: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: c.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: c.primaryLight },
  info: { gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 17, fontWeight: "800", color: c.foreground },
  lastMessage: { fontSize: 13, color: c.mutedForeground, fontStyle: "italic", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  star: { fontSize: 12 },
  ratingText: { fontSize: 13, fontWeight: "700", color: c.foreground },
  ratingCount: { fontSize: 12, color: c.mutedForeground },
  dot: { fontSize: 12, color: c.mutedForeground },
  yearsText: { fontSize: 12, color: c.mutedForeground },
  areas: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  tag: { backgroundColor: c.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: c.primary, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  chatBtn: {
    flex: 1,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    shadowColor: c.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chatBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  bookBtn: {
    flex: 1,
    backgroundColor: c.muted,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  bookBtnText: { color: c.foreground, fontWeight: "700", fontSize: 14 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: c.foreground },
  emptySub: { fontSize: 15, color: c.mutedForeground, textAlign: "center", lineHeight: 22 },
});
