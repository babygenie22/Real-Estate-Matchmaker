import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "@/lib/constants";
import { VerifiedBadge, isVerified } from "@/components/VerifiedBadge";
import { useFavorites, FavoriteAgent } from "@/lib/favorites";
import { haptics } from "@/lib/haptics";

const COL_WIDTH = 160;
const LABEL_WIDTH = 120;
const ROW_HEIGHT = 52;

function formatPrice(n?: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

type MetricKey =
  | "rating" | "deals" | "experience" | "avgDays" | "saleRatio"
  | "price" | "specialties" | "areas";

interface MetricDef {
  key: MetricKey;
  label: string;
  emoji: string;
  // numeric value used for highlight comparison; undefined = not numeric
  value: (a: FavoriteAgent) => number | undefined;
  // displayed text
  display: (a: FavoriteAgent) => string;
  // "higher" or "lower" is best; undefined = no highlight
  better?: "higher" | "lower";
}

const METRICS: MetricDef[] = [
  {
    key: "rating", label: "Rating", emoji: "⭐", better: "higher",
    value: (a) => a.rating ?? undefined,
    display: (a) => a.rating != null ? `${a.rating.toFixed(1)} (${a.reviewCount ?? 0})` : "—",
  },
  {
    key: "deals", label: "Deals closed", emoji: "🤝", better: "higher",
    value: (a) => a.transactionCount ?? undefined,
    display: (a) => a.transactionCount != null ? `${a.transactionCount}` : "—",
  },
  {
    key: "experience", label: "Experience", emoji: "📅", better: "higher",
    value: (a) => a.yearsExperience ?? undefined,
    display: (a) => a.yearsExperience != null ? `${a.yearsExperience} yrs` : "—",
  },
  {
    key: "avgDays", label: "Avg days on mkt", emoji: "⏱", better: "lower",
    value: (a) => a.avgDaysOnMarket ?? undefined,
    display: (a) => a.avgDaysOnMarket != null ? `${a.avgDaysOnMarket}d` : "—",
  },
  {
    key: "saleRatio", label: "Sale/list ratio", emoji: "📈", better: "higher",
    value: (a) => a.saleToListRatio ?? undefined,
    display: (a) => a.saleToListRatio != null ? `${(a.saleToListRatio * 100).toFixed(0)}%` : "—",
  },
  {
    key: "price", label: "Price range", emoji: "💰",
    value: () => undefined,
    display: (a) => `${formatPrice(a.priceRangeMin)}–${formatPrice(a.priceRangeMax)}`,
  },
  {
    key: "specialties", label: "Specialties", emoji: "🏆",
    value: () => undefined,
    display: (a) => a.specialties && a.specialties.length > 0 ? a.specialties.slice(0, 2).join(", ") : "—",
  },
  {
    key: "areas", label: "Areas", emoji: "📍",
    value: () => undefined,
    display: (a) => a.serviceAreas && a.serviceAreas.length > 0 ? a.serviceAreas.slice(0, 2).join(", ") : "—",
  },
];

export default function CompareScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const idList = (ids ?? "").split(",").filter(Boolean);
  const { favorites } = useFavorites();
  const router = useRouter();

  const agents = idList
    .map((id) => favorites.find((a) => a.id === id))
    .filter((a): a is FavoriteAgent => Boolean(a));

  if (agents.length < 2) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>Select at least 2 agents to compare</Text>
      </View>
    );
  }

  // Precompute the winning agent index per numeric metric.
  const winners: Record<string, number | null> = {};
  for (const m of METRICS) {
    if (!m.better) { winners[m.key] = null; continue; }
    let bestIdx: number | null = null;
    let bestVal: number | null = null;
    agents.forEach((a, i) => {
      const v = m.value(a);
      if (v == null) return;
      if (bestVal == null || (m.better === "higher" ? v > bestVal : v < bestVal)) {
        bestVal = v;
        bestIdx = i;
      }
    });
    // Only highlight if there's a unique winner among >1 valid values.
    const valid = agents.map(m.value).filter((v) => v != null);
    winners[m.key] = valid.length >= 2 ? bestIdx : null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Fixed label column */}
        <View style={styles.labelCol}>
          <View style={styles.labelHeaderSpacer} />
          {METRICS.map((m) => (
            <View key={m.key} style={styles.labelCell}>
              <Text style={styles.labelEmoji}>{m.emoji}</Text>
              <Text style={styles.labelText} numberOfLines={2}>{m.label}</Text>
            </View>
          ))}
          <View style={styles.footerSpacer} />
        </View>

        {/* Scrollable agent columns */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colsRow}>
          {agents.map((agent, colIdx) => {
            const avatarUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=120&background=dbeafe&color=2563eb`;
            return (
              <View key={agent.id} style={styles.agentCol}>
                <View style={styles.colHeader}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  <View style={styles.headerNameRow}>
                    <Text style={styles.colName} numberOfLines={1}>{agent.name}</Text>
                  </View>
                  {isVerified(agent) && <VerifiedBadge size="sm" />}
                </View>

                {METRICS.map((m) => {
                  const isWinner = winners[m.key] === colIdx;
                  return (
                    <View
                      key={m.key}
                      style={[styles.metricCell, isWinner && styles.metricCellWin]}
                    >
                      <Text
                        style={[styles.metricText, isWinner && styles.metricTextWin]}
                        numberOfLines={2}
                      >
                        {m.display(agent)}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => { haptics.light(); router.push(`/agent/${agent.id}`); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.viewBtnText}>View profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const HEADER_HEIGHT = 130;
const FOOTER_HEIGHT = 56;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12, backgroundColor: Colors.background },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.foreground, textAlign: "center" },
  row: { flexDirection: "row", paddingVertical: 16 },

  labelCol: {
    width: LABEL_WIDTH,
    paddingLeft: 16,
    paddingRight: 8,
  },
  labelHeaderSpacer: { height: HEADER_HEIGHT },
  labelCell: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    gap: 2,
  },
  labelEmoji: { fontSize: 14 },
  labelText: { fontSize: 12, fontWeight: "700", color: Colors.foregroundSecondary },
  footerSpacer: { height: FOOTER_HEIGHT },

  colsRow: { gap: 12, paddingRight: 16 },
  agentCol: {
    width: COL_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  colHeader: {
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: Colors.primaryLight },
  headerNameRow: { flexDirection: "row", alignItems: "center", maxWidth: "100%" },
  colName: { fontSize: 15, fontWeight: "800", color: Colors.foreground },
  metricCell: {
    height: ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.muted,
  },
  metricCellWin: { backgroundColor: Colors.successLight },
  metricText: { fontSize: 14, fontWeight: "600", color: Colors.foreground, textAlign: "center" },
  metricTextWin: { color: Colors.success, fontWeight: "800" },
  footer: {
    height: FOOTER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  viewBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  viewBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
