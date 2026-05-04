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
  proposedDate: string;
  proposedTime: string;
  status: string;
  agent: { name: string; photo: string | null };
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
            <Text style={styles.sectionTitle}>Your Preferences</Text>
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
            bookings.map((b) => (
              <View key={b.id} style={styles.bookingCard}>
                <Image
                  source={{ uri: b.agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.agent.name)}&size=60&background=dbeafe&color=2563eb` }}
                  style={styles.bookingAvatar}
                />
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingAgent}>{b.agent.name}</Text>
                  <Text style={styles.bookingDate}>📅 {b.proposedDate} at {b.proposedTime}</Text>
                  <View style={[styles.statusBadge, b.status === "confirmed" ? styles.statusConfirmed : b.status === "declined" ? styles.statusDeclined : styles.statusPending]}>
                    <Text style={styles.statusText}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

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
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  prefRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.muted },
  prefLabel: { fontSize: 15, color: Colors.mutedForeground },
  prefValue: { fontSize: 15, fontWeight: "600", color: Colors.foreground, flexShrink: 1, textAlign: "right", maxWidth: "55%" },
  emptyBooking: { color: Colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  bookingCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.muted },
  bookingAvatar: { width: 48, height: 48, borderRadius: 24 },
  bookingInfo: { flex: 1, gap: 3 },
  bookingAgent: { fontSize: 15, fontWeight: "700", color: Colors.foreground },
  bookingDate: { fontSize: 13, color: Colors.mutedForeground },
  statusBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  statusPending: { backgroundColor: "#fef3c7" },
  statusConfirmed: { backgroundColor: "#dcfce7" },
  statusDeclined: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 11, fontWeight: "700", color: Colors.foreground },
  signOutBtn: { margin: 20, borderRadius: 12, paddingVertical: 16, alignItems: "center", backgroundColor: "#fee2e2" },
  signOutText: { color: Colors.destructive, fontWeight: "700", fontSize: 16 },
});
