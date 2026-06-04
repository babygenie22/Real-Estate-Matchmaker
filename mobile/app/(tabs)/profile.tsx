import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

interface Booking {
  id: string;
  agentId: string;
  proposedDate: string;
  proposedTime: string;
  status: string;
  agent: { name: string; photo: string | null };
}

function isUpcoming(booking: Booking): boolean {
  const status = booking.status.toLowerCase();
  if (status === "declined") return false;
  if (status === "completed") return false;
  // Compare date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = booking.proposedDate.split(/[-\/]/);
  // Try parsing as YYYY-MM-DD or MM/DD/YYYY
  let bookingDate: Date;
  if (parts[0].length === 4) {
    bookingDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    bookingDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  return bookingDate >= today;
}

function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase();
  const config = s === "confirmed"
    ? { bg: Colors.successLight, color: Colors.success, label: "Confirmed" }
    : s === "declined"
    ? { bg: Colors.destructiveLight, color: Colors.destructive, label: "Declined" }
    : s === "completed"
    ? { bg: Colors.muted, color: Colors.mutedForeground, label: "Completed" }
    : { bg: Colors.warningLight, color: Colors.warning, label: "Pending" };

  return (
    <View style={[chipStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[chipStyles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  text: { fontSize: 11, fontWeight: "700" },
});

function BookingCard({ booking, onLeaveReview }: { booking: Booking; onLeaveReview?: () => void }) {
  const photoUri =
    booking.agent.photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.agent.name)}&size=60&background=dbeafe&color=2563eb`;
  const showReviewBtn = onLeaveReview && booking.status.toLowerCase() === "confirmed";

  return (
    <View style={styles.bookingCard}>
      <Image source={{ uri: photoUri }} style={styles.bookingAvatar} />
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingAgent}>{booking.agent.name}</Text>
        <Text style={styles.bookingDate}>📅 {booking.proposedDate} at {booking.proposedTime}</Text>
        <StatusChip status={booking.status} />
        {showReviewBtn && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={onLeaveReview}
            activeOpacity={0.7}
          >
            <Text style={styles.reviewBtnText}>⭐ Leave Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const router = useRouter();

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    try {
      const data = await api.get<Booking[]>("/api/bookings");
      setBookings(data);
    } catch {}
    finally { setLoadingBookings(false); }
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)"); } },
    ]);
  }

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const prefs = [
    { label: "📍 Location", value: user?.location },
    { label: "💰 Budget", value: user?.budget },
    { label: "🏠 Property Type", value: user?.propertyType },
    { label: "💬 Communication", value: user?.communicationStyle },
  ].filter((p) => p.value);

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter((b) => !isUpcoming(b));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || "Consumer"}</Text>
          </View>
        </View>

        {/* Preferences */}
        {prefs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Preferences</Text>
              <TouchableOpacity
                style={styles.editPrefBtn}
                onPress={() => router.push("/onboarding")}
                activeOpacity={0.7}
              >
                <Text style={styles.editPrefText}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>
            {prefs.map((p) => (
              <View key={p.label} style={styles.prefRow}>
                <Text style={styles.prefLabel}>{p.label}</Text>
                <Text style={styles.prefValue}>{p.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Requests</Text>
          {loadingBookings ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
          ) : bookings.length === 0 ? (
            <Text style={styles.emptyBooking}>No bookings yet. Match with an agent and tap "Book"!</Text>
          ) : (
            <>
              {upcomingBookings.length > 0 && (
                <View style={styles.bookingGroup}>
                  <Text style={styles.groupLabel}>Upcoming</Text>
                  {upcomingBookings.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </View>
              )}
              {pastBookings.length > 0 && (
                <View style={styles.bookingGroup}>
                  <Text style={styles.groupLabel}>Past</Text>
                  {pastBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onLeaveReview={
                        b.status.toLowerCase() === "confirmed"
                          ? () => router.push({
                              pathname: "/review/[bookingId]",
                              params: { bookingId: b.id, agentId: b.agentId },
                            })
                          : undefined
                      }
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <TouchableOpacity
            style={styles.toolRow}
            onPress={() => router.push("/mortgage-calculator")}
            activeOpacity={0.7}
          >
            <View style={styles.toolIconWrap}>
              <Text style={styles.toolIcon}>🏦</Text>
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolLabel}>Mortgage Calculator</Text>
              <Text style={styles.toolSub}>Estimate your monthly payments</Text>
            </View>
            <Text style={styles.toolChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/settings" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.toolIconWrap}>
              <Text style={styles.toolIcon}>⚙️</Text>
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolLabel}>Settings</Text>
              <Text style={styles.toolSub}>Notifications, privacy & account</Text>
            </View>
            <Text style={styles.toolChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Agent Portal (only for agents) */}
        {user?.role === "agent" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent Tools</Text>
            <TouchableOpacity
              style={[styles.toolRow, styles.agentToolRow]}
              onPress={() => router.replace("/(agent-portal)/dashboard")}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIconWrap, { backgroundColor: "#dbeafe" }]}>
                <Text style={styles.toolIcon}>🏠</Text>
              </View>
              <View style={styles.toolInfo}>
                <Text style={styles.toolLabel}>Agent Portal</Text>
                <Text style={styles.toolSub}>Manage clients & bookings</Text>
              </View>
              <Text style={styles.toolChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Become an Agent (only for non-agents) */}
        {user?.role !== "agent" && (
          <TouchableOpacity
            style={styles.becomeAgentBtn}
            onPress={() => router.push("/(auth)/agent-register")}
            activeOpacity={0.8}
          >
            <Text style={styles.becomeAgentText}>🏡 Become an Agent</Text>
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 32, fontWeight: "700", color: Colors.primary },
  name: { fontSize: 22, fontWeight: "800", color: Colors.foreground, marginBottom: 4 },
  email: { fontSize: 14, color: Colors.mutedForeground, marginBottom: 8 },
  roleBadge: { backgroundColor: Colors.muted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, color: Colors.mutedForeground, fontWeight: "600", textTransform: "capitalize" },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
  editPrefBtn: { backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  editPrefText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  prefRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.muted },
  prefLabel: { fontSize: 15, color: Colors.mutedForeground },
  prefValue: { fontSize: 15, fontWeight: "600", color: Colors.foreground, flexShrink: 1, textAlign: "right", maxWidth: "55%" },
  emptyBooking: { color: Colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  bookingGroup: { marginTop: 12 },
  groupLabel: { fontSize: 12, fontWeight: "700", color: Colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  bookingCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.muted },
  bookingAvatar: { width: 48, height: 48, borderRadius: 24, marginTop: 2 },
  bookingInfo: { flex: 1, gap: 3 },
  bookingAgent: { fontSize: 15, fontWeight: "700", color: Colors.foreground },
  bookingDate: { fontSize: 13, color: Colors.mutedForeground },
  reviewBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reviewBtnText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  becomeAgentBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  becomeAgentText: { color: Colors.primary, fontWeight: "700", fontSize: 16 },
  signOutBtn: { margin: 20, marginTop: 12, borderRadius: 12, paddingVertical: 16, alignItems: "center", backgroundColor: "#fee2e2" },
  signOutText: { color: Colors.destructive, fontWeight: "700", fontSize: 16 },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.muted },
  agentToolRow: { borderBottomWidth: 0 },
  toolIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  toolIcon: { fontSize: 20 },
  toolInfo: { flex: 1 },
  toolLabel: { fontSize: 15, fontWeight: "600", color: Colors.foreground },
  toolSub: { fontSize: 12, color: Colors.mutedForeground, marginTop: 1 },
  toolChevron: { fontSize: 22, color: Colors.muted, fontWeight: "300" },
});
