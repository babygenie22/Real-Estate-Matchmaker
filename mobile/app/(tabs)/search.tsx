import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet,
  SafeAreaView, ScrollView, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { SkeletonRow } from "@/components/Skeleton";
import { VerifiedBadge, isVerified } from "@/components/VerifiedBadge";
import { useFavorites, FavoriteAgent } from "@/lib/favorites";
import { haptics } from "@/lib/haptics";
import { useTheme, type ThemeColors } from "@/lib/theme";

type Agent = FavoriteAgent;

const SPECIALTIES = ["First-Time Buyers", "Luxury Homes", "Investment", "New Construction", "Relocation"];
const AREAS = ["Detroit", "Ann Arbor", "Birmingham", "Royal Oak", "Troy", "Novi"];

// Budget bands; an agent matches when their price range overlaps the band.
const BUDGETS: { label: string; value: string; min: number; max: number }[] = [
  { label: "Under $300K", value: "u300", min: 0, max: 300_000 },
  { label: "$300K–$600K", value: "300-600", min: 300_000, max: 600_000 },
  { label: "$600K–$1M", value: "600-1m", min: 600_000, max: 1_000_000 },
  { label: "$1M+", value: "1m", min: 1_000_000, max: Number.MAX_SAFE_INTEGER },
];

type SortKey = "rating" | "deals" | "experience" | "fastest";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Top rated" },
  { key: "deals", label: "Most deals" },
  { key: "experience", label: "Experience" },
  { key: "fastest", label: "Fastest sales" },
];

function formatPrice(n?: number | null) {
  if (n == null) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isFavorite, toggleFavorite } = useFavorites();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");

  async function load() {
    try {
      // Browse mode returns all approved agents; we filter/sort client-side for instant feedback.
      const data = await api.get<Agent[]>("/api/agents?browse=true");
      setAgents(Array.isArray(data) ? data : []);
    } catch {
      // empty state handles failure
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = agents.filter((a) => {
      if (q) {
        const hay = [a.name, a.bio, ...(a.serviceAreas ?? []), ...(a.specialties ?? [])]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (specialty && !(a.specialties ?? []).some((s) => s === specialty)) return false;
      if (area && !(a.serviceAreas ?? []).some((s) => s === area)) return false;
      if (budget) {
        const band = BUDGETS.find((b) => b.value === budget);
        if (band) {
          // Overlap test: agent's [min, max] intersects the band (open-ended on missing bounds).
          const aMin = a.priceRangeMin ?? 0;
          const aMax = a.priceRangeMax ?? Number.MAX_SAFE_INTEGER;
          if (aMin > band.max || aMax < band.min) return false;
        }
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "deals": return (b.transactionCount ?? 0) - (a.transactionCount ?? 0);
        case "experience": return (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0);
        case "fastest": return (a.avgDaysOnMarket ?? 9999) - (b.avgDaysOnMarket ?? 9999);
        case "rating":
        default: return (b.rating ?? 0) - (a.rating ?? 0);
      }
    });
    return list;
  }, [agents, query, specialty, area, sort]);

  const filtersActive = query !== "" || specialty !== "" || area !== "" || budget !== "";

  function clearFilters() {
    haptics.selection();
    setQuery(""); setSpecialty(""); setArea(""); setBudget("");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse Agents</Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, area, or specialty"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Specialty filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {[{ label: "All specialties", value: "" }, ...SPECIALTIES.map((s) => ({ label: s, value: s }))].map((f) => {
          const active = specialty === f.value;
          return (
            <TouchableOpacity key={f.value || "all-sp"} style={[styles.chip, active && styles.chipActive]}
              onPress={() => { haptics.selection(); setSpecialty(f.value); }} activeOpacity={0.7}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Area filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {[{ label: "All areas", value: "" }, ...AREAS.map((s) => ({ label: s, value: s }))].map((f) => {
          const active = area === f.value;
          return (
            <TouchableOpacity key={f.value || "all-ar"} style={[styles.chip, active && styles.chipActive]}
              onPress={() => { haptics.selection(); setArea(f.value); }} activeOpacity={0.7}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Budget filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {[{ label: "Any budget", value: "" }, ...BUDGETS.map((b) => ({ label: b.label, value: b.value }))].map((f) => {
          const active = budget === f.value;
          return (
            <TouchableOpacity key={f.value || "all-bud"} style={[styles.chip, active && styles.chipActive]}
              onPress={() => { haptics.selection(); setBudget(f.value); }} activeOpacity={0.7}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sort + count */}
      <View style={styles.sortRow}>
        <Text style={styles.count}>
          {loading ? "Loading…" : `${results.length} agent${results.length === 1 ? "" : "s"}`}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <TouchableOpacity key={s.key} style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => { haptics.selection(); setSort(s.key); }} activeOpacity={0.7}>
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="search" size={56} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No agents found</Text>
          <Text style={styles.emptySub}>
            {filtersActive ? "Try removing a filter or searching a different term." : "Check back soon — new agents join regularly."}
          </Text>
          {filtersActive && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.85}>
              <Text style={styles.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <BrowseCard
              agent={item}
              saved={isFavorite(item.id)}
              onPress={() => router.push(`/agent/${item.id}`)}
              onToggleSave={() => { haptics.light(); toggleFavorite(item); }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BrowseCard({
  agent, saved, onPress, onToggleSave,
}: {
  agent: Agent;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const avatarUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=256&background=dbeafe&color=2563eb`;
  const price = agent.priceRangeMin && agent.priceRangeMax
    ? `${formatPrice(agent.priceRangeMin)}–${formatPrice(agent.priceRangeMax)}`
    : "";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{agent.name}</Text>
          {isVerified(agent) && <VerifiedBadge size="sm" />}
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#fbbf24" />
          <Text style={styles.ratingText}>{agent.rating?.toFixed(1) ?? "—"}</Text>
          <Text style={styles.ratingCount}>({agent.reviewCount ?? 0})</Text>
          {agent.transactionCount != null && (
            <><Text style={styles.dot}>·</Text><Text style={styles.metaText}>{agent.transactionCount} deals</Text></>
          )}
          {agent.yearsExperience != null && (
            <><Text style={styles.dot}>·</Text><Text style={styles.metaText}>{agent.yearsExperience}yr</Text></>
          )}
        </View>
        {agent.serviceAreas && agent.serviceAreas.length > 0 && (
          <View style={styles.areasRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={styles.areas} numberOfLines={1}>{agent.serviceAreas.slice(0, 2).join(", ")}</Text>
          </View>
        )}
        {price ? (
          <View style={styles.priceRow}>
            <Feather name="tag" size={12} color={colors.foregroundSecondary} />
            <Text style={styles.price}>{price}</Text>
          </View>
        ) : null}
        {agent.specialties && agent.specialties.length > 0 && (
          <View style={styles.tagRow}>
            {agent.specialties.slice(0, 3).map((s) => (
              <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnOn]}
        onPress={onToggleSave}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {saved
          ? <Ionicons name="bookmark" size={18} color={colors.primary} />
          : <Feather name="bookmark" size={18} color={colors.mutedForeground} />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: c.background },
  title: { fontSize: 26, fontWeight: "900", color: c.foreground, marginBottom: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.muted, borderRadius: 12, paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 16, color: c.foreground },
  chipScroll: { flexGrow: 0, backgroundColor: c.background },
  chipRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: c.foreground },
  chipTextActive: { color: "#fff" },
  sortRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: c.cardBorder, backgroundColor: c.background,
  },
  count: { fontSize: 13, fontWeight: "700", color: c.mutedForeground },
  sortChips: { gap: 6, flexDirection: "row" },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: c.muted },
  sortChipActive: { backgroundColor: c.primaryLight },
  sortChipText: { fontSize: 12, fontWeight: "600", color: c.mutedForeground },
  sortChipTextActive: { color: c.primary, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 12,
    borderWidth: 1, borderColor: c.cardBorder,
    shadowColor: c.shadowColor, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: c.primaryLight },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "800", color: c.foreground, flexShrink: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, flexWrap: "wrap" },
  ratingText: { fontSize: 13, fontWeight: "700", color: c.foreground },
  ratingCount: { fontSize: 12, color: c.mutedForeground },
  dot: { fontSize: 12, color: c.mutedForeground },
  metaText: { fontSize: 12, color: c.mutedForeground },
  areasRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  areas: { fontSize: 12, color: c.mutedForeground, flexShrink: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  price: { fontSize: 12, color: c.foregroundSecondary, fontWeight: "600" },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  tag: { backgroundColor: c.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: c.primary, fontWeight: "600" },
  saveBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: c.muted, borderWidth: 1, borderColor: c.border,
  },
  saveBtnOn: { backgroundColor: c.primaryLight, borderColor: c.primary },
  saveBtnText: { fontSize: 18 },
  saveBtnTextOn: { fontSize: 18 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: c.foreground },
  emptySub: { fontSize: 14, color: c.mutedForeground, textAlign: "center", lineHeight: 20 },
  clearBtn: { marginTop: 8, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  clearBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
