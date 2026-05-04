import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from "react-native-reanimated";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

const { width: SCREEN_W } = Dimensions.get("window");

const STEPS = [
  {
    id: "role", emoji: "🙋", title: "I am a…", subtitle: "Tell us your role so we can tailor your experience",
    options: [
      { label: "🏠 Home Buyer", value: "buyer" },
      { label: "📦 Home Seller", value: "seller" },
      { label: "🔄 Buying & Selling", value: "both" },
      { label: "💰 Investor", value: "investor" },
    ],
  },
  {
    id: "location", emoji: "📍", title: "Where are you looking?", subtitle: "Choose your primary market",
    options: [
      { label: "🌁 San Francisco Bay Area", value: "Bay Area, CA" },
      { label: "🌴 Los Angeles", value: "Los Angeles, CA" },
      { label: "🎸 Austin, TX", value: "Austin, TX" },
      { label: "🌃 Chicago, IL", value: "Chicago, IL" },
      { label: "🌲 Seattle, WA", value: "Seattle, WA" },
    ],
  },
  {
    id: "budget", emoji: "💵", title: "What's your budget?", subtitle: "Select your price range",
    options: [
      { label: "Under $300K", value: "Under $300K" },
      { label: "$300K – $600K", value: "$300K–$600K" },
      { label: "$600K – $1M", value: "$600K–$1M" },
      { label: "$1M – $2M", value: "$1M–$2M" },
      { label: "Over $2M", value: "Over $2M" },
    ],
  },
  {
    id: "propertyType", emoji: "🏡", title: "Property type?", subtitle: "What are you looking for?",
    options: [
      { label: "🏡 Single Family", value: "Single Family" },
      { label: "🏙️ Condo / Townhouse", value: "Condo" },
      { label: "🏢 Multi-Family", value: "Multi-Family" },
      { label: "🌾 Land / Lot", value: "Land" },
    ],
  },
  {
    id: "preferredStyle", emoji: "🤝", title: "Agent personality?", subtitle: "What kind of agent fits you best?",
    options: [
      { label: "📊 Analytical & Data-Driven", value: "Analytical" },
      { label: "⚡ Bold & Results-Driven", value: "Bold" },
      { label: "🎓 Patient & Educational", value: "Patient" },
      { label: "💬 Responsive & Tech-Savvy", value: "Tech-Savvy" },
    ],
  },
  {
    id: "communicationStyle", emoji: "📱", title: "How do you prefer to communicate?", subtitle: "Pick your style",
    options: [
      { label: "📱 Text / App Messaging", value: "Text" },
      { label: "📞 Phone Calls", value: "Phone" },
      { label: "📧 Email", value: "Email" },
      { label: "🤝 In-Person Meetings", value: "In-Person" },
    ],
  },
];

const SUMMARY_LABELS: Record<string, string> = {
  role: "Role",
  location: "Location",
  budget: "Budget",
  propertyType: "Property Type",
  preferredStyle: "Agent Style",
  communicationStyle: "Communication",
};

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
          key={i}
          style={[dotStyles.dot, i === current ? dotStyles.dotActive : i < current ? dotStyles.dotDone : dotStyles.dotPending]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 16 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotDone: { width: 6, backgroundColor: Colors.primary, opacity: 0.4 },
  dotPending: { width: 6, backgroundColor: Colors.border },
});

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  const slideX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const progressWidth = useSharedValue(((1) / STEPS.length) * 100);

  useEffect(() => {
    progressWidth.value = withTiming(((step + 1) / STEPS.length) * 100, { duration: 400, easing: Easing.out(Easing.quad) });
  }, [step]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: opacity.value,
  }));

  function animateToStep(direction: "forward" | "back", callback: () => void) {
    const offset = direction === "forward" ? -30 : 30;
    opacity.value = withTiming(0, { duration: 150 }, () => {
      slideX.value = -offset;
      callback();
      slideX.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
    });
  }

  const current = STEPS[step];
  const selected = answers[current?.id];

  function selectOption(value: string) {
    setAnswers((a) => ({ ...a, [current.id]: value }));
  }

  function handleNext() {
    if (!selected) return;
    if (step < STEPS.length - 1) {
      animateToStep("forward", () => setStep((s) => s + 1));
    } else {
      setShowSummary(true);
    }
  }

  function handleBack() {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    if (step > 0) {
      animateToStep("back", () => setStep((s) => s - 1));
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await api.put("/api/users/preferences", answers);
      await refreshUser();
      router.replace("/(tabs)/discover");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      {!showSummary ? (
        <>
          <Animated.View style={[styles.contentWrap, contentStyle]}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <ProgressDots total={STEPS.length} current={step} />

              <View style={styles.stepHeader}>
                <Text style={styles.stepEmoji}>{current.emoji}</Text>
                <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>
                <Text style={styles.title}>{current.title}</Text>
                <Text style={styles.subtitle}>{current.subtitle}</Text>
              </View>

              <View style={styles.options}>
                {current.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, selected === opt.value && styles.optionSelected]}
                    onPress={() => selectOption(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, selected === opt.value && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected === opt.value && (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          <View style={styles.footer}>
            {step > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!selected}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>{step === STEPS.length - 1 ? "Review →" : "Continue →"}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Summary screen */
        <>
          <ScrollView contentContainerStyle={styles.summaryContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.summaryEmoji}>🎉</Text>
            <Text style={styles.summaryTitle}>You're all set!</Text>
            <Text style={styles.summarySub}>Here's a summary of your preferences. You can update these anytime from your profile.</Text>

            <View style={styles.summaryCard}>
              {STEPS.map((s) => (
                <View key={s.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{SUMMARY_LABELS[s.id]}</Text>
                  <Text style={styles.summaryValue}>
                    {s.options.find(o => o.value === answers[s.id])?.label.replace(/^[^\w]+ ?/, "") ?? answers[s.id]}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backText}>← Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.nextText}>Start Matching 🔥</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressTrack: { height: 4, backgroundColor: Colors.muted },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  contentWrap: { flex: 1 },
  content: { padding: 24, paddingTop: 16 },
  stepHeader: { marginBottom: 28, alignItems: "flex-start" },
  stepEmoji: { fontSize: 40, marginBottom: 10 },
  stepCount: { color: Colors.primary, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.foreground, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.mutedForeground, lineHeight: 21 },
  options: { gap: 10 },
  option: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  optionText: { fontSize: 16, color: Colors.foreground, fontWeight: "500", flex: 1 },
  optionTextSelected: { color: Colors.primary, fontWeight: "700" },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "800" },
  footer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  backBtn: { paddingVertical: 16, paddingHorizontal: 12, justifyContent: "center" },
  backText: { color: Colors.mutedForeground, fontWeight: "600", fontSize: 15 },
  nextBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { color: "#fff", fontWeight: "800", fontSize: 17, letterSpacing: 0.2 },

  summaryContent: { padding: 24, paddingTop: 32, alignItems: "center" },
  summaryEmoji: { fontSize: 64, marginBottom: 16 },
  summaryTitle: { fontSize: 28, fontWeight: "800", color: Colors.foreground, marginBottom: 8 },
  summarySub: { fontSize: 14, color: Colors.mutedForeground, textAlign: "center", lineHeight: 20, marginBottom: 28 },
  summaryCard: {
    width: "100%",
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  summaryLabel: { fontSize: 13, color: Colors.mutedForeground, fontWeight: "600" },
  summaryValue: { fontSize: 14, color: Colors.foreground, fontWeight: "700", maxWidth: "55%", textAlign: "right" },
});
