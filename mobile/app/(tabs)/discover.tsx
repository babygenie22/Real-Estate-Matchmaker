import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Dimensions, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import SwipeCard from "@/components/SwipeCard";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 32;
const CARD_H = CARD_W * 1.35;

interface Agent {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  specialties: string[] | null;
  serviceAreas: string[] | null;
  languages: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  transactionCount: number | null;
  yearsExperience: number | null;
}

const SPECIALTY_FILTERS = [
  { label: "All", value: "" },
  { label: "First-Time Buyers", value: "First-Time Buyers" },
  { label: "Luxury Homes", value: "Luxury Homes" },
  { label: "Investment", value: "Investment" },
  { label: "New Construction", value: "New Construction" },
  { label: "Relocation", value: "Relocation" },
];

const AREA_FILTERS = [
  { label: "All Areas", value: "" },
  { label: "Metro Detroit", value: "Metro Detroit" },
  { label: "Ann Arbor", value: "Ann Arbor" },
  { label: "Grand Rapids", value: "Grand Rapids" },
  { label: "Lansing", value: "Lansing" },
  { label: "Oakland County", value: "Oakland County" },
];

export default function DiscoverScreen() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpecialty, setActiveSpecialty] = useState("");
  const [activeArea, setActiveArea] = useState("");
  const router = useRouter();

  useEffect(() => { loadAgents(); }, [activeSpecialty, activeArea]);

  async function loadAgents() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ scored: "true" });
      if (activeSpecialty) params.set("specialty", activeSpecialty);
      if (activeArea) params.set("area", activeArea);
      const data = await api.get<Agent[]>(`/api/agents?${params.toString()}`);
      setAgents(data);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleLike = useCallback(async (agent: Agent) => {
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    try {
      await api.post("/api/likes", { agentId: agent.id, liked: true });
    } catch {}
  }, []);

  const handlePass = useCallback(async (agent: Agent) => {
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    try {
      await api.post("/api/likes", { agentId: agent.id, liked: false });
    } catch {}
  }, []);

  const topAgent = agents[agents.length - 1];
  const nextAgent = agents[agents.length - 2];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding your matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HomeMatch</Text>
        <Text style={styles.headerSub}>
          {agents.length === 0 ? "Swipe to explore agents" : `${agents.length} agents to review`}
        </Text>
      </View>

      {/* Specialty filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {SPECIALTY_FILTERS.map((f) => {
          const isActive = activeSpecialty === f.value;
          return (
            <TouchableOpacity
              key={f.value || "all-specialty"}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveSpecialty(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Area filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {AREA_FILTERS.map((f) => {
          const isActive = activeArea === f.value;
          return (
            <TouchableOpacity
              key={f.value || "all-area"}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveArea(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Card stack */}
      <View style={styles.cardArea}>
        {agents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No more agents right now</Text>
            <Text style={styles.emptySub}>You've reviewed all available agents.{"\n"}Check back soon — new agents join daily.</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadAgents}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Background card (next) */}
            {nextAgent && (
              <View style={[styles.backCard, { width: CARD_W, height: CARD_H }]}>
                <View style={styles.backCardInner} />
              </View>
            )}

            {/* Top swipeable card */}
            <SwipeCard
              key={topAgent.id}
              agent={topAgent}
              isTop
              onLike={() => handleLike(topAgent)}
              onPass={() => handlePass(topAgent)}
              onPress={() => router.push(`/agent/${topAgent.id}`)}
            />
          </>
        )}
      </View>

      {/* Action buttons */}
      {agents.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => handlePass(topAgent)}>
            <Text style={styles.actionEmoji}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoBtn} onPress={() => router.push(`/agent/${topAgent.id}`)}>
            <Text style={styles.actionEmoji}>ℹ️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => handleLike(topAgent)}>
            <Text style={styles.actionEmoji}>💚</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: Colors.mutedForeground, fontSize: 15 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: "900", color: Colors.foreground },
  headerSub: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.foreground,
  },
  chipTextActive: {
    color: "#ffffff",
  },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backCard: {
    position: "absolute",
    borderRadius: 20,
    overflow: "hidden",
  },
  backCardInner: {
    flex: 1,
    backgroundColor: Colors.muted,
    borderRadius: 20,
    transform: [{ scale: 0.96 }, { translateY: 12 }],
  },
  emptyState: { alignItems: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: Colors.foreground },
  emptySub: { fontSize: 15, color: Colors.mutedForeground, textAlign: "center" },
  refreshBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  refreshBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 16,
    gap: 20,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  passBtn: { backgroundColor: "#fff", borderWidth: 2, borderColor: Colors.destructive },
  likeBtn: { backgroundColor: "#fff", borderWidth: 2, borderColor: Colors.success },
  infoBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.muted, justifyContent: "center", alignItems: "center" },
  actionEmoji: { fontSize: 24 },
});
