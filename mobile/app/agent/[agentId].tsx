import { useEffect, useState } from "react";
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

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
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function AgentDetailScreen() {
  const { agentId } = useLocalSearchParams<{ agentId: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadAgent(); }, [agentId]);

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

  if (loading || !agent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const photoUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=400&background=dbeafe&color=2563eb`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero photo */}
        <View style={styles.hero}>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{agent.name}</Text>
            {agent.rating != null && (
              <Text style={styles.heroRating}>⭐ {agent.rating.toFixed(1)}  ({agent.reviewCount} reviews)</Text>
            )}
          </View>
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
              <Text style={styles.sectionTitle}>📍 Service Areas</Text>
              <Text style={styles.detail}>{agent.serviceAreas.join(" • ")}</Text>
            </View>
          )}

          {/* Languages */}
          {agent.languages && agent.languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌐 Languages</Text>
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

          {/* License */}
          {agent.licenseNumber && (
            <Text style={styles.license}>License: {agent.licenseNumber}</Text>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push(`/booking/${agent.id}`)}>
          <Text style={styles.bookBtnText}>📅 Book Consultation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: { position: "relative", height: 340 },
  photo: { width: "100%", height: "100%" },
  closeBtn: { position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroInfo: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "rgba(0,0,0,0.5)" },
  heroName: { fontSize: 24, fontWeight: "800", color: "#fff" },
  heroRating: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  body: { padding: 20 },
  statsRow: { flexDirection: "row", borderRadius: 14, backgroundColor: Colors.muted, padding: 16, marginBottom: 20, gap: 4 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: Colors.foreground },
  statLabel: { fontSize: 10, color: Colors.mutedForeground, marginTop: 3, textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: Colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  bio: { fontSize: 15, color: Colors.foreground, lineHeight: 22 },
  detail: { fontSize: 15, color: Colors.foreground, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
  chipAlt: { backgroundColor: Colors.muted },
  chipTextAlt: { color: Colors.foreground, fontWeight: "600", fontSize: 13 },
  license: { fontSize: 12, color: Colors.mutedForeground, marginTop: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  bookBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});
