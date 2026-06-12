import { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { haptics } from "@/lib/haptics";
import { useTheme, type ThemeColors } from "@/lib/theme";

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

function getDates() {
  const dates: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const value = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    dates.push({ label, value });
  }
  return dates;
}

export default function BookingScreen() {
  const { agentId } = useLocalSearchParams<{ agentId: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [agent, setAgent] = useState<{ id: string; name: string } | null>(null);
  const [agentError, setAgentError] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dates = getDates();

  useEffect(() => {
    api.get<{ id: string; name: string }>(`/api/agents/${agentId}`)
      .then(setAgent)
      .catch(() => setAgentError(true));
  }, [agentId]);

  async function submit() {
    if (!selectedDate || !selectedTime) {
      Alert.alert("Select date and time", "Please choose a date and time for your consultation.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/bookings", {
        agentId,
        proposedDate: selectedDate,
        proposedTime: selectedTime,
        notes: notes.trim() || null,
      });
      Alert.alert("Booking Requested! 🎉", `Your consultation request with ${agent?.name} has been sent. They'll confirm shortly.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {agent ? (
          <View style={styles.agentInfo}>
            <Text style={styles.agentLabel}>Booking consultation with</Text>
            <Text style={styles.agentName}>{agent.name}</Text>
          </View>
        ) : agentError ? (
          <View style={styles.agentInfoError}>
            <Text style={styles.agentErrorText}>Couldn't load agent details.</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.agentErrorLink}>Go back and try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.agentInfo}>
            <Skeleton width={160} height={12} />
            <Skeleton width={220} height={22} style={{ marginTop: 8 }} />
          </View>
        )}

        {/* Date picker */}
        <Text style={styles.sectionTitle}>Select a Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow} contentContainerStyle={styles.dateContent}>
          {dates.map((d) => (
            <TouchableOpacity
              key={d.value}
              style={[styles.dateChip, selectedDate === d.value && styles.dateChipSelected]}
              onPress={() => { haptics.selection(); setSelectedDate(d.value); }}
            >
              <Text style={[styles.dateText, selectedDate === d.value && styles.dateTextSelected]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time picker */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Select a Time</Text>
        <View style={styles.timeGrid}>
          {TIMES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, selectedTime === t && styles.timeChipSelected]}
              onPress={() => { haptics.selection(); setSelectedTime(t); }}
            >
              <Text style={[styles.timeText, selectedTime === t && styles.timeTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="What would you like to discuss? E.g. budget, neighborhoods, timeline..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Summary */}
        {selectedDate && selectedTime && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>📋 Booking Summary</Text>
            <Text style={styles.summaryText}>📅 {selectedDate}</Text>
            <Text style={styles.summaryText}>🕐 {selectedTime}</Text>
            {agent && <Text style={styles.summaryText}>👤 {agent.name}</Text>}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {(!selectedDate || !selectedTime) && (
          <Text style={styles.footerHint}>
            {!selectedDate && !selectedTime
              ? "Select a date and time to continue"
              : !selectedDate
                ? "Select a date to continue"
                : "Select a time to continue"}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedDate || !selectedTime || loading) && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!selectedDate || !selectedTime || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Request Consultation</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 20, paddingBottom: 0 },
  agentInfo: { backgroundColor: c.primaryLight, borderRadius: 12, padding: 16, marginBottom: 24 },
  agentInfoError: { backgroundColor: c.destructiveLight, borderRadius: 12, padding: 16, marginBottom: 24, gap: 6 },
  agentErrorText: { fontSize: 14, fontWeight: "600", color: c.destructive },
  agentErrorLink: { fontSize: 14, fontWeight: "700", color: c.primary },
  footerHint: { fontSize: 12, color: c.mutedForeground, textAlign: "center", marginBottom: 8 },
  agentLabel: { fontSize: 12, color: c.primary, fontWeight: "600", textTransform: "uppercase" },
  agentName: { fontSize: 20, fontWeight: "800", color: c.foreground, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: c.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  dateRow: { marginHorizontal: -20, paddingHorizontal: 20 },
  dateContent: { gap: 10, paddingRight: 20 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background },
  dateChipSelected: { borderColor: c.primary, backgroundColor: c.primaryLight },
  dateText: { color: c.foreground, fontWeight: "600", fontSize: 13 },
  dateTextSelected: { color: c.primary },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background, minWidth: "22%" },
  timeChipSelected: { borderColor: c.primary, backgroundColor: c.primaryLight },
  timeText: { color: c.foreground, fontWeight: "600", fontSize: 14, textAlign: "center" },
  timeTextSelected: { color: c.primary },
  notesInput: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 15, color: c.foreground, minHeight: 100, marginTop: 4 },
  summary: { backgroundColor: c.muted, borderRadius: 12, padding: 16, marginTop: 24, gap: 6, borderLeftWidth: 3, borderLeftColor: c.primary },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: c.foreground, marginBottom: 4 },
  summaryText: { fontSize: 14, color: c.foreground },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  submitBtn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});
