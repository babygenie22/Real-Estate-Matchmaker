import { useEffect, useMemo, useState } from "react";
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { VerifiedBadge, isVerified } from "@/components/VerifiedBadge";
import { Skeleton } from "@/components/Skeleton";
import { useFavorites } from "@/lib/favorites";
import { haptics } from "@/lib/haptics";

interface Agent {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  licenseNumber: string | null;
  specialties: string[] | null;
  serviceAreas: string[] | null;
  languages: string[] | null;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  rating: number | null;
  reviewCount: number | null;
  transactionCount: number | null;
  avgDaysOnMarket: number | null;
  saleToListRatio: number | null;
  yearsExperience: number | null;
  personalityTags: string[] | null;
  isApproved?: boolean;
}

function timeAgo(dateStr: string): string {
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

function formatPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function AgentDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { agentId } = useLocalSearchParams<{ agentId: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = agent ? isFavorite(agent.id) : false;

  useEffect(() => { loadAgent(); loadReviews(); }, [agentId]);

  async function loadAgent() {
    try {
      const data = await api.get<Agent>(`/api/agents/${agentId}`);
      setAgent(data);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const data = await api.get<any[]>(`/api/agents/${agentId}/reviews`);
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      // reviews are best-effort — never block the profile
    }
  }

  if (loading || !agent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Skeleton width="100%" height={300} radius={0} />
        <View style={styles.body}>
          <Skeleton width="55%" height={28} />
          <View style={styles.skeletonStatsRow}>
            <Skeleton width={90} height={60} radius={12} />
            <Skeleton width={90} height={60} radius={12} />
            <Skeleton width={90} height={60} radius={12} />
          </View>
          <Skeleton width="100%" height={16} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={16} style={{ marginTop: 10 }} />
        </View>
      </View>
    );
  }

  const photoUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=512&background=dbeafe&color=2563eb`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero photo */}
        <View style={styles.hero}>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          {/* Floating controls (hero starts below the status bar, so 8px is clear) */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnActive]}
            onPress={() => { haptics.light(); toggleFavorite(agent as any); }}
            activeOpacity={0.8}
            hitSlop={8}
          >
            {saved
              ? <Ionicons name="bookmark" size={20} color="#fff" />
              : <Feather name="bookmark" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Name + rating in a clean section below the photo */}
        <View style={styles.heroInfo}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName} numberOfLines={1}>{agent.name}</Text>
            {isVerified(agent) && <VerifiedBadge />}
          </View>
          {agent.rating != null && (
            <View style={styles.heroRatingRow}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={styles.heroRating}>{agent.rating.toFixed(1)}  ({agent.reviewCount} reviews)</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: "Deals Closed", value: agent.transactionCount?.toString() ?? "—" },
              { label: "Avg Days", value: agent.avgDaysOnMarket?.toString() ?? "—" },
              { label: "Sale/List", value: agent.saleToListRatio ? `${(agent.saleToListRatio * 100).toFixed(0)}%` : "—" },
              { label: "Experience", value: agent.yearsExperience ? `${agent.yearsExperience}y` : "—" },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Bio */}
          {agent.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{agent.bio}</Text>
            </View>
          )}

          {/* Price range */}
          {agent.priceRangeMin && agent.priceRangeMax && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <Text style={styles.detail}>{formatPrice(agent.priceRangeMin)} – {formatPrice(agent.priceRangeMax)}</Text>
            </View>
          )}

          {/* Specialties */}
          {agent.specialties && agent.specialties.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specialties</Text>
              <View style={styles.chips}>
                {agent.specialties.map((s) => (
                  <View key={s} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>
                ))}
              </View>
            </View>
          )}

          {/* Service areas */}
          {agent.serviceAreas && agent.serviceAreas.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                <Text style={styles.sectionTitle}>Service Areas</Text>
              </View>
              <Text style={styles.detail}>{agent.serviceAreas.join(" • ")}</Text>
            </View>
          )}

          {/* Languages */}
          {agent.languages && agent.languages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Feather name="globe" size={12} color={colors.mutedForeground} />
                <Text style={styles.sectionTitle}>Languages</Text>
              </View>
              <Text style={styles.detail}>{agent.languages.join(", ")}</Text>
            </View>
          )}

          {/* Personality */}
          {agent.personalityTags && agent.personalityTags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personality</Text>
              <View style={styles.chips}>
                {agent.personalityTags.map((t) => (
                  <View key={t} style={[styles.chip, styles.chipAlt]}><Text style={styles.chipTextAlt}>{t}</Text></View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.reviewsTitle}>Reviews</Text>
              <View style={styles.reviewsList}>
                {reviews.map((r) => {
                  const name =
                    r.userName ||
                    r.user?.name ||
                    r.user?.fullName ||
                    "Verified client";
                  const stars = Math.max(0, Math.min(5, Math.round(r.rating || 0)));
                  return (
                    <View key={r.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewStars}>
                          {[0, 1, 2, 3, 4].map((i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={14}
                              color={i < stars ? "#fbbf24" : colors.border}
                            />
                          ))}
                        </View>
                        {r.createdAt && <Text style={styles.reviewDate}>{timeAgo(r.createdAt)}</Text>}
                      </View>
                      {r.text ? <Text style={styles.reviewText}>{r.text}</Text> : null}
                      <Text style={styles.reviewAuthor}>{name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* License */}
          {agent.licenseNumber && (
            <Text style={styles.license}>License: {agent.licenseNumber}</Text>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push(`/booking/${agent.id}`)}>
          <View style={styles.bookBtnRow}>
            <Feather name="calendar" size={18} color="#fff" />
            <Text style={styles.bookBtnText}>Book Consultation</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  skeletonStatsRow: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 4 },
  hero: { position: "relative", height: 320, backgroundColor: c.muted },
  photo: { width: "100%", height: "100%" },
  closeBtn: { position: "absolute", top: 12, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  saveBtn: { position: "absolute", top: 12, right: 62, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  saveBtnActive: { backgroundColor: c.primary },
  saveBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  heroInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: c.background,
  },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  heroName: { fontSize: 24, fontWeight: "800", color: c.foreground, letterSpacing: -0.3 },
  heroRatingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  heroRating: { fontSize: 14, color: c.mutedForeground },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  // flexBasis 23% keeps one row on regular phones but wraps to a 2x2 grid on
  // narrow screens (iPhone SE) instead of truncating the labels.
  statsRow: { flexDirection: "row", flexWrap: "wrap", borderRadius: 14, backgroundColor: c.muted, padding: 16, marginBottom: 20, gap: 8 },
  statBox: { flexBasis: "23%", flexGrow: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: c.foreground },
  statLabel: { fontSize: 10, color: c.mutedForeground, marginTop: 3, textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: c.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  bio: { fontSize: 15, color: c.foreground, lineHeight: 22 },
  detail: { fontSize: 15, color: c.foreground, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: c.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { color: c.primary, fontWeight: "600", fontSize: 13 },
  chipAlt: { backgroundColor: c.muted },
  chipTextAlt: { color: c.foreground, fontWeight: "600", fontSize: 13 },
  reviewsTitle: { fontSize: 18, fontWeight: "800", color: c.foreground, marginBottom: 12 },
  reviewsList: { gap: 12 },
  reviewCard: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewStars: { flexDirection: "row", alignItems: "center", gap: 2 },
  reviewDate: { fontSize: 12, color: c.mutedForeground },
  reviewText: { fontSize: 14, color: c.foreground, lineHeight: 20, marginTop: 8 },
  reviewAuthor: { fontSize: 12, fontWeight: "700", color: c.mutedForeground, marginTop: 8 },
  license: { fontSize: 12, color: c.mutedForeground, marginTop: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  bookBtn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  bookBtnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});
