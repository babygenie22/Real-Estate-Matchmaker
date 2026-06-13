import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Dimensions, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import SwipeCard from "@/components/SwipeCard";
import { SkeletonCard } from "@/components/Skeleton";
import { haptics } from "@/lib/haptics";
import { api } from "@/lib/api";
import { useTheme, type ThemeColors } from "@/lib/theme";

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

// Values match the cities agents actually list in serviceAreas (see seed data).
const AREA_FILTERS = [
  { label: "All Areas", value: "" },
  { label: "Detroit", value: "Detroit" },
  { label: "Ann Arbor", value: "Ann Arbor" },
  { label: "Birmingham", value: "Birmingham" },
  { label: "Royal Oak", value: "Royal Oak" },
  { label: "Troy", value: "Troy" },
  { label: "Novi", value: "Novi" },
];

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpecialty, setActiveSpecialty] = useState("");
  const [activeArea, setActiveArea] = useState("");
  const [lastSwiped, setLastSwiped] = useState<{ agent: Agent; index: number } | null>(null);
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
    haptics.medium();
    setLastSwiped({ agent, index: agents.length });
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    try {
      await api.post("/api/likes", { agentId: agent.id, liked: true });
    } catch {}
  }, [agents.length]);

  const handlePass = useCallback(async (agent: Agent) => {
    haptics.light();
    setLastSwiped({ agent, index: agents.length });
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    try {
      await api.post("/api/likes", { agentId: agent.id, liked: false });
    } catch {}
  }, [agents.length]);

  const undoSwipe = useCallback(() => {
    if (!lastSwiped) return;
    haptics.selection();
    // Put the agent back on the END of the array so it becomes the top card
    // again (topAgent === agents[agents.length - 1]). This is a LOCAL-only
    // restore: the original like/pass was already recorded server-side and
    // intentionally stays recorded — there is no backend undo endpoint.
    setAgents((prev) => [...prev, lastSwiped.agent]);
    setLastSwiped(null);
  }, [lastSwiped]);

  const topAgent = agents[agents.length - 1];
  const nextAgent = agents[agents.length - 2];
  const filtersActive = activeSpecialty !== "" || activeArea !== "";

  const SpecialtyFilters = (
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
            onPress={() => {
              haptics.selection();
              setActiveSpecialty(f.value);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const AreaFilters = (
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
            onPress={() => {
              haptics.selection();
              setActiveArea(f.value);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const Header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>HomeMatch</Text>
        <Text style={styles.headerSub}>
          {loading
            ? "Finding your matches..."
            : agents.length === 0
              ? filtersActive
                ? "No agents match these filters"
                : "You're all caught up"
              : `${agents.length} ${agents.length === 1 ? "agent" : "agents"} to review`}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.savedLink} onPress={() => router.push("/saved")} activeOpacity={0.7}>
          <Text style={styles.savedLinkText}>🔖 Saved</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.refreshSlot} />
        ) : (
          <TouchableOpacity style={styles.refreshSlot} onPress={loadAgents} activeOpacity={0.7}>
            <Text style={styles.refreshLink}>🔄 Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {Header}
        {SpecialtyFilters}
        {AreaFilters}
        <View style={styles.cardArea}>
          <SkeletonCard width={CARD_W} height={CARD_H} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {Header}

      {/* Specialty filter chips */}
      {SpecialtyFilters}

      {/* Area filter chips */}
      {AreaFilters}

      {/* Card stack */}
      <View style={styles.cardArea}>
        {agents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{filtersActive ? "🎚️" : "✨"}</Text>
            <Text style={styles.emptyTitle}>
              {filtersActive ? "No agents match these filters" : "You're all caught up"}
            </Text>
            <Text style={styles.emptySub}>
              {filtersActive
                ? "Try removing a filter to see more agents in your area."
                : "You've reviewed every available agent.\nWe'll notify you when new agents join."}
            </Text>
            {filtersActive ? (
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => {
                  haptics.selection();
                  setActiveSpecialty("");
                  setActiveArea("");
                }}
              >
                <Text style={styles.refreshBtnText}>Clear filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.refreshBtn} onPress={loadAgents}>
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            )}
            {lastSwiped && (
              <TouchableOpacity style={styles.adjustBtn} onPress={undoSwipe}>
                <Text style={styles.adjustBtnText}>↩ Undo last swipe</Text>
              </TouchableOpacity>
            )}
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

      {/* Undo last swipe */}
      {lastSwiped && agents.length > 0 && (
        // (Empty-deck undo lives inside the empty state above.)
        <View style={styles.undoRow}>
          <TouchableOpacity style={styles.undoPill} onPress={undoSwipe} activeOpacity={0.7}>
            <Text style={styles.undoText}>↩ Undo</Text>
          </TouchableOpacity>
        </View>
      )}

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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: c.mutedForeground, fontSize: 15 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: "900", color: c.foreground },
  headerSub: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  headerActions: { alignItems: "flex-end", gap: 8 },
  savedLink: { paddingVertical: 2 },
  savedLinkText: { fontSize: 14, fontWeight: "700", color: c.foregroundSecondary },
  refreshSlot: { minWidth: 72, alignItems: "flex-end", justifyContent: "center" },
  refreshLink: { color: c.primary, fontSize: 14, fontWeight: "600" },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: c.background,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.foreground,
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
    backgroundColor: c.muted,
    borderRadius: 20,
    transform: [{ scale: 0.96 }, { translateY: 12 }],
  },
  emptyState: { alignItems: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: c.foreground },
  emptySub: { fontSize: 15, color: c.mutedForeground, textAlign: "center" },
  refreshBtn: {
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  refreshBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  adjustBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 2,
  },
  adjustBtnText: { color: c.foregroundSecondary, fontWeight: "600", fontSize: 14 },
  undoRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  undoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.muted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  undoText: { color: c.foregroundSecondary, fontSize: 13, fontWeight: "600" },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 16,
    gap: 24,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  passBtn: { backgroundColor: c.card, borderWidth: 2, borderColor: c.destructive },
  likeBtn: { backgroundColor: c.card, borderWidth: 2, borderColor: c.success },
  infoBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.muted, justifyContent: "center", alignItems: "center" },
  actionEmoji: { fontSize: 26 },
});
