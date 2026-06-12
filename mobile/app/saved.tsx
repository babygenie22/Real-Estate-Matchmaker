import { useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { SkeletonRow } from "@/components/Skeleton";
import { VerifiedBadge, isVerified } from "@/components/VerifiedBadge";
import { useFavorites, FavoriteAgent } from "@/lib/favorites";
import { haptics } from "@/lib/haptics";

const MAX_SELECT = 3;

export default function SavedScreen() {
  const { favorites, toggleFavorite, refresh, loading } = useFavorites();
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => { refresh(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        haptics.selection();
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_SELECT) {
        haptics.warning();
        return prev;
      }
      haptics.selection();
      return [...prev, id];
    });
  };

  if (loading && favorites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (!loading && favorites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔖</Text>
          <Text style={styles.emptyTitle}>No saved agents yet</Text>
          <Text style={styles.emptySub}>
            Tap the bookmark on an agent's profile to save them to your shortlist.
          </Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => { haptics.light(); router.push("/(tabs)/discover"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.discoverBtnText}>Discover Agents</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SavedCard
            agent={item}
            selected={selected.includes(item.id)}
            onToggleSelect={() => toggleSelect(item.id)}
            onRemove={() => { haptics.light(); toggleFavorite(item); }}
            onPress={() => router.push(`/agent/${item.id}`)}
          />
        )}
      />

      <View style={styles.bottomBar}>
        {selected.length >= 2 ? (
          <TouchableOpacity
            style={styles.compareBtn}
            onPress={() => { haptics.medium(); router.push(`/compare?ids=${selected.join(",")}`); }}
            activeOpacity={0.85}
          >
            <Text style={styles.compareBtnText}>Compare {selected.length} agents →</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>Select 2-3 agents to compare</Text>
        )}
      </View>
    </View>
  );
}

function SavedCard({
  agent, selected, onToggleSelect, onRemove, onPress,
}: {
  agent: FavoriteAgent;
  selected: boolean;
  onToggleSelect: () => void;
  onRemove: () => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const avatarUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=120&background=dbeafe&color=2563eb`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{agent.name}</Text>
          {isVerified(agent) && <VerifiedBadge size="sm" />}
        </View>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>⭐</Text>
          <Text style={styles.ratingText}>{agent.rating?.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({agent.reviewCount})</Text>
          {agent.transactionCount != null && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{agent.transactionCount} deals</Text>
            </>
          )}
          {agent.yearsExperience != null && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{agent.yearsExperience}yr</Text>
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
            {agent.specialties.slice(0, 3).map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeBtnText}>♡ Remove</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.checkbox, selected && styles.checkboxOn]}
        onPress={onToggleSelect}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {selected && <Text style={styles.checkboxCheck}>✓</Text>}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: c.primaryLight },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "800", color: c.foreground, flexShrink: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, flexWrap: "wrap" },
  star: { fontSize: 12 },
  ratingText: { fontSize: 13, fontWeight: "700", color: c.foreground },
  ratingCount: { fontSize: 12, color: c.mutedForeground },
  dot: { fontSize: 12, color: c.mutedForeground },
  metaText: { fontSize: 12, color: c.mutedForeground },
  areas: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  tag: { backgroundColor: c.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: c.primary, fontWeight: "600" },
  removeBtn: { marginTop: 6, alignSelf: "flex-start" },
  removeBtnText: { fontSize: 12, color: c.destructive, fontWeight: "600" },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card,
  },
  checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
  checkboxCheck: { color: "#fff", fontSize: 15, fontWeight: "900" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  compareBtn: {
    width: "100%",
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: c.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  compareBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  hint: { fontSize: 14, color: c.mutedForeground, fontWeight: "500" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: c.foreground },
  emptySub: { fontSize: 15, color: c.mutedForeground, textAlign: "center", lineHeight: 22 },
  discoverBtn: {
    marginTop: 12,
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
    shadowColor: c.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  discoverBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
