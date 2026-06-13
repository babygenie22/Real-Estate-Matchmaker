import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { SkeletonRow } from "@/components/Skeleton";
import { useTheme, type ThemeColors } from "@/lib/theme";

interface Review {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string | null;
  user?: { firstName?: string | null; lastName?: string | null };
}

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  total: number;
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} mo ago`;
  return `${Math.floor(diff / (365 * day))} yr ago`;
}

export default function AgentReviewsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await api.get<ReviewsResponse>("/api/agent-portal/reviews");
      setData(res);
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

  const reviews = data?.reviews ?? [];
  const avg = data?.averageRating ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Reviews</Text>
        <View style={{ width: 50 }} />
      </View>

      {!loading && reviews.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryAvg}>⭐ {avg.toFixed(1)}</Text>
          <Text style={styles.summaryCount}>{data?.total} review{data?.total !== 1 ? "s" : ""}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.list}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySub}>
            Reviews from clients you've worked with will appear here. Deliver great
            consultations to earn your first one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const stars = Math.max(0, Math.min(5, Math.round(item.rating || 0)));
            const name = [item.user?.firstName, item.user?.lastName].filter(Boolean).join(" ") || "Verified client";
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.stars}>{"★".repeat(stars)}<Text style={styles.starsEmpty}>{"★".repeat(5 - stars)}</Text></Text>
                  {item.createdAt && <Text style={styles.date}>{timeAgo(item.createdAt)}</Text>}
                </View>
                {item.text ? <Text style={styles.body}>{item.text}</Text> : <Text style={styles.bodyEmpty}>No written feedback</Text>}
                <Text style={styles.author}>— {name}</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  back: { fontSize: 16, color: c.primary, fontWeight: "600", width: 50 },
  title: { fontSize: 18, fontWeight: "800", color: c.foreground },
  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  summaryAvg: { fontSize: 28, fontWeight: "900", color: c.foreground },
  summaryCount: { fontSize: 14, color: c.mutedForeground },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  stars: { fontSize: 15, color: c.warning, letterSpacing: 1 },
  starsEmpty: { color: c.border },
  date: { fontSize: 12, color: c.mutedForeground },
  body: { fontSize: 15, color: c.foreground, lineHeight: 21 },
  bodyEmpty: { fontSize: 14, color: c.mutedForeground, fontStyle: "italic" },
  author: { fontSize: 13, color: c.mutedForeground, marginTop: 10, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: c.foreground },
  emptySub: { fontSize: 14, color: c.mutedForeground, textAlign: "center", lineHeight: 20 },
});
