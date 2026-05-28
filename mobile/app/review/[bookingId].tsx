import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          activeOpacity={0.7}
          style={starStyles.starBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[starStyles.star, star <= value && starStyles.starFilled]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 44, color: "#d1d5db" },
  starFilled: { color: "#f59e0b" },
});

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  async function loadBooking() {
    try {
      const bookings = await api.get<Booking[]>("/api/bookings");
      const found = bookings.find((b) => b.id === bookingId);
      setBooking(found ?? null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!booking || rating === 0) return;
    setSubmitting(true);
    try {
      await api.post("/api/reviews", {
        agentId: booking.agentId,
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert("Review submitted! ⭐", "Thank you for sharing your experience.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const status = err.message?.includes("409") || err.message?.toLowerCase().includes("already");
      if (status) {
        Alert.alert(
          "Already Reviewed",
          "You've already reviewed this agent.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", err.message || "Failed to submit review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Booking not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const photoUri =
    booking.agent.photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.agent.name)}&size=200&background=dbeafe&color=2563eb`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Agent card */}
        <View style={styles.agentCard}>
          <Image source={{ uri: photoUri }} style={styles.agentPhoto} />
          <Text style={styles.agentName}>{booking.agent.name}</Text>
          <Text style={styles.agentSubtitle}>
            {booking.proposedDate} at {booking.proposedTime}
          </Text>
        </View>

        {/* Rating section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How would you rate your experience?</Text>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
          )}
        </View>

        {/* Comment section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Share more details (optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share your experience with this agent..."
            placeholderTextColor={Colors.mutedForeground}
            multiline
            numberOfLines={5}
            maxLength={300}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/300</Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Review</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  agentCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 24,
    marginBottom: 16,
  },
  agentPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  agentName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.foreground,
    marginBottom: 4,
  },
  agentSubtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.foreground,
    marginBottom: 12,
    textAlign: "center",
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.warning,
    marginTop: 4,
  },

  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    color: Colors.foreground,
    minHeight: 110,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textAlign: "right",
    marginTop: 6,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.primaryLight,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },

  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: Colors.mutedForeground,
    fontSize: 15,
    fontWeight: "600",
  },

  errorText: {
    fontSize: 16,
    color: Colors.mutedForeground,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
