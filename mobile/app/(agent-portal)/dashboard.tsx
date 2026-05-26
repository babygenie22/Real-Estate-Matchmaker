import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Colors } from "@/lib/constants";

interface AgentStats {
  todayMatches: number;
  pendingBookings: number;
  totalReviews: number;
}

interface BuyerMatch {
  id: string | number;
  buyerName?: string;
  buyerEmail?: string;
  name?: string;
  email?: string;
  matchScore?: number;
  createdAt?: string;
}

interface Booking {
  id: string | number;
  buyerName?: string;
  name?: string;
  scheduledAt?: string;
  date?: string;
  time?: string;
  status: string;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AgentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<AgentStats | null>(null);
  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [statsRes, matchesRes, bookingsRes] = await Promise.all([
        api.get<AgentStats | { stats: AgentStats }>("/api/agent-portal/stats"),
        api.get<BuyerMatch[] | { matches: BuyerMatch[] }>("/api/agent-portal/matches"),
        api.get<Booking[] | { bookings: Booking[] }>("/api/agent-portal/bookings"),
      ]);

      // Handle both array-direct and wrapped responses
      const statsData = "stats" in (statsRes as any) ? (statsRes as any).stats : statsRes;
      const matchesData = Array.isArray(matchesRes) ? matchesRes : (matchesRes as any).matches ?? [];
      const bookingsData = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes as any).bookings ?? [];

      setStats(statsData as AgentStats);
      setMatches(matchesData as BuyerMatch[]);
      setBookings(bookingsData as Booking[]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load dashboard data");
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function handleBookingAction(bookingId: string | number, action: "confirm" | "decline") {
    try {
      await api.put(`/api/agent-portal/bookings/${bookingId}`, { status: action === "confirm" ? "confirmed" : "declined" });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: action === "confirm" ? "confirmed" : "declined" } : b
        )
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || `Failed to ${action} booking`);
    }
  }

  function formatBookingTime(booking: Booking): string {
    const raw = booking.scheduledAt || booking.date;
    if (!raw) return booking.time || "Time TBD";
    try {
      const d = new Date(raw);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return raw;
    }
  }

  function statusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case "confirmed": return Colors.success;
      case "declined": return Colors.destructive;
      case "pending": return Colors.warning;
      default: return Colors.mutedForeground;
    }
  }

  function statusBg(status: string): string {
    switch (status?.toLowerCase()) {
      case "confirmed": return Colors.successLight;
      case "declined": return Colors.destructiveLight;
      case "pending": return Colors.warningLight;
      default: return Colors.muted;
    }
  }

  const agentName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : (user?.email ?? "Agent");

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.agentName}>{agentName}</Text>
            <View style={styles.agentBadge}>
              <Text style={styles.agentBadgeText}>🏡 Agent Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert("Log Out", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: () => { logout(); router.replace("/(auth)"); } },
              ]);
            }}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label="Today's Matches" value={stats.todayMatches ?? 0} />
            <StatCard label="Pending Bookings" value={stats.pendingBookings ?? 0} />
            <StatCard label="Total Reviews" value={stats.totalReviews ?? 0} />
          </View>
        )}

        {/* New Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Matches</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{matches.length}</Text>
            </View>
          </View>

          {matches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No matches yet</Text>
              <Text style={styles.emptyHint}>Buyers will appear here as they match with your profile</Text>
            </View>
          ) : (
            matches.slice(0, 10).map((match) => {
              const displayName = match.buyerName || match.name || "Buyer";
              const displayEmail = match.buyerEmail || match.email || "";
              return (
                <View key={match.id} style={styles.matchCard}>
                  <View style={styles.matchAvatar}>
                    <Text style={styles.matchAvatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchName}>{displayName}</Text>
                    {displayEmail ? <Text style={styles.matchEmail}>{displayEmail}</Text> : null}
                    {match.matchScore != null && (
                      <Text style={styles.matchScore}>{match.matchScore}% match</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => router.push(`/chat/${match.id}` as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Upcoming Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{bookings.length}</Text>
            </View>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptyHint}>Consultation requests will appear here</Text>
            </View>
          ) : (
            bookings.slice(0, 10).map((booking) => {
              const displayName = booking.buyerName || booking.name || "Buyer";
              const isPending = booking.status?.toLowerCase() === "pending";
              return (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingTop}>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingName}>{displayName}</Text>
                      <Text style={styles.bookingTime}>{formatBookingTime(booking)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusBg(booking.status) }]}>
                      <Text style={[styles.statusText, { color: statusColor(booking.status) }]}>
                        {booking.status ?? "pending"}
                      </Text>
                    </View>
                  </View>
                  {isPending && (
                    <View style={styles.bookingActions}>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleBookingAction(booking.id, "confirm")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.confirmBtnText}>✓ Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleBookingAction(booking.id, "decline")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.declineBtnText}>✗ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Edit Profile Link */}
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => router.push("/(agent-portal)/profile" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.editProfileText}>Edit My Profile →</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20 },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: Colors.mutedForeground, fontSize: 15 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: { fontSize: 14, color: Colors.mutedForeground, fontWeight: "500" },
  agentName: { fontSize: 26, fontWeight: "800", color: Colors.foreground, marginTop: 2, letterSpacing: -0.5 },
  agentBadge: {
    marginTop: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  agentBadgeText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  logoutText: { fontSize: 13, fontWeight: "600", color: Colors.mutedForeground },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.mutedForeground, fontWeight: "600", textAlign: "center", marginTop: 4, lineHeight: 15 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: Colors.foreground },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 16, fontWeight: "700", color: Colors.foreground },
  emptyHint: { fontSize: 13, color: Colors.mutedForeground, textAlign: "center", lineHeight: 18 },

  matchCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  matchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  matchAvatarText: { fontSize: 18, fontWeight: "800", color: Colors.primary },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 15, fontWeight: "700", color: Colors.foreground },
  matchEmail: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },
  matchScore: { fontSize: 12, color: Colors.success, fontWeight: "700", marginTop: 3 },
  chatBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  bookingCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bookingTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bookingInfo: { flex: 1, marginRight: 10 },
  bookingName: { fontSize: 15, fontWeight: "700", color: Colors.foreground },
  bookingTime: { fontSize: 13, color: Colors.mutedForeground, marginTop: 3 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  bookingActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.success + "44",
  },
  confirmBtnText: { color: Colors.success, fontWeight: "700", fontSize: 14 },
  declineBtn: {
    flex: 1,
    backgroundColor: Colors.destructiveLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.destructive + "44",
  },
  declineBtnText: { color: Colors.destructive, fontWeight: "700", fontSize: 14 },

  editProfileBtn: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  editProfileText: { color: Colors.primary, fontWeight: "800", fontSize: 16 },
});
