import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api, setToken } from "@/lib/api";
import { Colors } from "@/lib/constants";

const TOTAL_STEPS = 7;

const MICHIGAN_CITIES = [
  "Detroit", "Ann Arbor", "Grand Rapids", "Lansing", "Troy", "Novi",
  "Dearborn", "Southfield", "Sterling Heights", "Auburn Hills", "Birmingham",
  "Bloomfield Hills", "West Bloomfield", "Plymouth", "Canton", "Northville",
  "Farmington Hills", "Livonia", "Rochester Hills", "Pontiac", "Royal Oak",
  "Ferndale", "Clarkston", "Milford", "Brighton",
];

const SPECIALTIES = [
  "First-Time Buyers",
  "Luxury Homes",
  "Investment Properties",
  "Relocation",
  "New Construction",
  "Short Sales/Foreclosures",
  "Commercial",
  "Condos & Townhomes",
];

const PERSONALITY_TAGS = [
  "Patient & Educational",
  "Bold & Results-Driven",
  "Analytical & Data-Driven",
  "Responsive & Tech-Savvy",
  "Community-Focused",
];

function formatPrice(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${Math.round(value / 1000)}K`;
}

function ProgressBar({ step }: { step: number }) {
  const progressAnim = useRef(new Animated.Value(((step + 1) / TOTAL_STEPS) * 100)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ((step + 1) / TOTAL_STEPS) * 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: widthInterpolated }]} />
    </View>
  );
}

function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AgentRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; password: string }>();
  const email = params.email ?? "";
  const password = params.password ?? "";

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — Basic Info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);

  // Step 2 — License
  const [licenseNumber, setLicenseNumber] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // Step 3 — Specialties
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Step 4 — About You
  const [bio, setBio] = useState("");
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);

  // Step 5 — Price Range
  const [priceMin, setPriceMin] = useState("200000");
  const [priceMax, setPriceMax] = useState("800000");

  // Step 6 — Photo URL
  const [photo, setPhoto] = useState("");

  // Animation
  const slideX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const slideDirectionRef = useRef<number>(0);

  const contentStyle = {
    transform: [{ translateX: slideX }],
    opacity,
  };

  // Fade in whenever step changes — guarantees new content is rendered first
  useEffect(() => {
    slideX.setValue(slideDirectionRef.current);
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [step]);

  function animateToStep(direction: "forward" | "back", callback: () => void) {
    const offset = direction === "forward" ? -30 : 30;
    slideDirectionRef.current = -offset;
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => {
      if (finished) callback();
    });
  }

  function toggleChip(list: string[], setList: (v: string[]) => void, val: string) {
    if (list.includes(val)) {
      setList(list.filter((x) => x !== val));
    } else {
      setList([...list, val]);
    }
  }

  function validateStep(): boolean {
    if (step === 0) {
      if (!name.trim()) {
        Alert.alert("Required", "Please enter your full name.");
        return false;
      }
    }
    if (step === 1) {
      if (!licenseNumber.trim()) {
        Alert.alert("Required", "Please enter your license number.");
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      animateToStep("forward", () => setStep((s) => s + 1));
    }
  }

  function handleBack() {
    if (step > 0) {
      animateToStep("back", () => setStep((s) => s - 1));
    } else {
      router.back();
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const minVal = parseInt(priceMin, 10) || 0;
      const maxVal = parseInt(priceMax, 10) || 0;

      const payload: Record<string, unknown> = {
        email,
        password,
        name: name.trim(),
        licenseNumber: licenseNumber.trim(),
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (bio.trim()) payload.bio = bio.trim();
      if (photo.trim()) payload.photo = photo.trim();
      if (specialties.length > 0) payload.specialties = specialties;
      if (serviceAreas.length > 0) payload.serviceAreas = serviceAreas;
      if (personalityTags.length > 0) payload.personalityTags = personalityTags;
      if (yearsExperience > 0) payload.yearsExperience = yearsExperience;
      if (minVal > 0) payload.priceRangeMin = minVal;
      if (maxVal > 0) payload.priceRangeMax = maxVal;

      let token: string | undefined;

      try {
        const res = await api.post<{ token?: string; message?: string }>("/api/agent-portal/register", payload);
        if (res.token) token = res.token;
      } catch {
        // Registration endpoint may not return a token; fall through to login
      }

      if (!token) {
        // Get token via standard mobile login after registration
        const loginRes = await api.post<{ token: string }>("/api/auth/mobile/login", { email, password });
        token = loginRes.token;
      }

      await setToken(token);
      router.replace("/(agent-portal)/dashboard");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = [
    "Basic Info",
    "License",
    "Specialties",
    "About You",
    "Price Range",
    "Photo",
    "Review",
  ];

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>👤</Text>
              <Text style={styles.stepCount}>Step 1 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>Basic Info</Text>
              <Text style={styles.subtitle}>Tell us a little about yourself</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jane Smith"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor={Colors.mutedForeground}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.mutedForeground}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Years of Experience</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setYearsExperience(Math.max(0, yearsExperience - 1))}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>
                    {yearsExperience === 30 ? "30+" : yearsExperience} {yearsExperience === 1 ? "year" : "years"}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setYearsExperience(Math.min(30, yearsExperience + 1))}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case 1:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>📋</Text>
              <Text style={styles.stepCount}>Step 2 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>License & Areas</Text>
              <Text style={styles.subtitle}>Your license and where you work in Michigan</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>License Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MI-REXXXXXX"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters"
                  placeholderTextColor={Colors.mutedForeground}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Service Areas</Text>
                <Text style={styles.fieldHint}>Select all Michigan cities you serve</Text>
                <ChipSelect
                  options={MICHIGAN_CITIES}
                  selected={serviceAreas}
                  onToggle={(v) => toggleChip(serviceAreas, setServiceAreas, v)}
                />
              </View>
            </View>
          </ScrollView>
        );

      case 2:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>🏆</Text>
              <Text style={styles.stepCount}>Step 3 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>Specialties</Text>
              <Text style={styles.subtitle}>What types of transactions do you specialize in?</Text>
            </View>

            <ChipSelect
              options={SPECIALTIES}
              selected={specialties}
              onToggle={(v) => toggleChip(specialties, setSpecialties, v)}
            />
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>💬</Text>
              <Text style={styles.stepCount}>Step 4 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>About You</Text>
              <Text style={styles.subtitle}>Help buyers get to know you</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <Text style={styles.fieldHint}>{bio.length}/500 characters</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell buyers about your background, approach, and what makes you different..."
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 500))}
                  multiline
                  numberOfLines={5}
                  placeholderTextColor={Colors.mutedForeground}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Personality Tags</Text>
                <Text style={styles.fieldHint}>How would clients describe you?</Text>
                <ChipSelect
                  options={PERSONALITY_TAGS}
                  selected={personalityTags}
                  onToggle={(v) => toggleChip(personalityTags, setPersonalityTags, v)}
                />
              </View>
            </View>
          </ScrollView>
        );

      case 4:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>💰</Text>
              <Text style={styles.stepCount}>Step 5 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>Price Range</Text>
              <Text style={styles.subtitle}>What price range do you typically work in?</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.priceRow}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Min Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="200000"
                    value={priceMin}
                    onChangeText={(t) => setPriceMin(t.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.mutedForeground}
                  />
                  {priceMin ? (
                    <Text style={styles.pricePreview}>{formatPrice(parseInt(priceMin, 10) || 0)}</Text>
                  ) : null}
                </View>
                <View style={styles.priceDivider}>
                  <Text style={styles.priceDividerText}>to</Text>
                </View>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Max Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="800000"
                    value={priceMax}
                    onChangeText={(t) => setPriceMax(t.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.mutedForeground}
                  />
                  {priceMax ? (
                    <Text style={styles.pricePreview}>{formatPrice(parseInt(priceMax, 10) || 0)}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.priceExamples}>
                <Text style={styles.priceExamplesLabel}>Quick presets:</Text>
                <View style={styles.chipWrap}>
                  {[
                    { label: "Starter ($100K–$400K)", min: "100000", max: "400000" },
                    { label: "Mid-Range ($300K–$700K)", min: "300000", max: "700000" },
                    { label: "Luxury ($700K–$2M)", min: "700000", max: "2000000" },
                    { label: "Ultra-Luxury ($2M+)", min: "2000000", max: "10000000" },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.chip, priceMin === preset.min && priceMax === preset.max && styles.chipActive]}
                      onPress={() => { setPriceMin(preset.min); setPriceMax(preset.max); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, priceMin === preset.min && priceMax === preset.max && styles.chipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case 5:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>📸</Text>
              <Text style={styles.stepCount}>Step 6 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>Profile Photo</Text>
              <Text style={styles.subtitle}>Add a professional headshot so buyers can put a face to your name</Text>
            </View>

            {/* Photo preview */}
            <View style={styles.photoPreviewWrap}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>👤</Text>
                </View>
              )}
              {photo ? (
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto("")}>
                  <Text style={styles.removePhotoBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Photo URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/headshot.jpg"
                  value={photo}
                  onChangeText={setPhoto}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholderTextColor={Colors.mutedForeground}
                />
                <Text style={styles.fieldHint}>Paste a link to your professional headshot (LinkedIn, company website, etc.)</Text>
              </View>
            </View>
          </ScrollView>
        );

      case 6:
        return (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.stepHeader, { alignItems: "center" }]}>
              <Text style={styles.stepEmoji}>🎉</Text>
              <Text style={styles.stepCount}>Step 7 of {TOTAL_STEPS}</Text>
              <Text style={styles.title}>Review & Submit</Text>
              <Text style={[styles.subtitle, { textAlign: "center" }]}>
                Almost there! Review your agent profile before publishing.
              </Text>
            </View>

            <View style={styles.reviewCard}>
              <ReviewRow label="Name" value={name} />
              <ReviewRow label="Email" value={email} />
              {phone ? <ReviewRow label="Phone" value={phone} /> : null}
              <ReviewRow label="License #" value={licenseNumber} />
              <ReviewRow label="Experience" value={yearsExperience === 30 ? "30+ years" : `${yearsExperience} ${yearsExperience === 1 ? "year" : "years"}`} />
              {serviceAreas.length > 0 && (
                <ReviewRow label="Service Areas" value={serviceAreas.join(", ")} />
              )}
              {specialties.length > 0 && (
                <ReviewRow label="Specialties" value={specialties.join(", ")} />
              )}
              {personalityTags.length > 0 && (
                <ReviewRow label="Style" value={personalityTags.join(", ")} />
              )}
              {(priceMin || priceMax) && (
                <ReviewRow
                  label="Price Range"
                  value={`${formatPrice(parseInt(priceMin, 10) || 0)} – ${formatPrice(parseInt(priceMax, 10) || 0)}`}
                />
              )}
              {bio ? <ReviewRow label="Bio" value={bio.length > 80 ? bio.slice(0, 80) + "…" : bio} /> : null}
              {photo ? <ReviewRow label="Photo" value="✓ Added" /> : null}
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={step} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          {renderStep()}
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
            onPress={isLastStep ? handleSubmit : handleNext}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextText}>
                {isLastStep ? "Create Agent Profile 🚀" : "Continue →"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressTrack: { height: 4, backgroundColor: Colors.muted },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  content: { padding: 24, paddingTop: 20, paddingBottom: 40 },

  stepHeader: { marginBottom: 28, alignItems: "flex-start" },
  stepEmoji: { fontSize: 40, marginBottom: 10 },
  stepCount: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: "800", color: Colors.foreground, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.mutedForeground, lineHeight: 21 },

  fieldGroup: { gap: 20 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: Colors.foregroundSecondary },
  fieldHint: { fontSize: 12, color: Colors.mutedForeground, marginTop: -2 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.muted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: { fontSize: 22, color: Colors.foreground, fontWeight: "600", lineHeight: 26 },
  stepperValue: { fontSize: 18, fontWeight: "700", color: Colors.foreground, minWidth: 90, textAlign: "center" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontSize: 14, color: Colors.foreground, fontWeight: "500" },
  chipTextActive: { color: Colors.primary, fontWeight: "700" },

  priceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  priceDivider: { justifyContent: "center", paddingTop: 36 },
  priceDividerText: { color: Colors.mutedForeground, fontSize: 14, fontWeight: "600" },
  pricePreview: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  priceExamples: { gap: 8 },
  priceExamplesLabel: { fontSize: 13, fontWeight: "600", color: Colors.foregroundSecondary },

  reviewCard: {
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
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: 12,
  },
  reviewLabel: { fontSize: 13, color: Colors.mutedForeground, fontWeight: "600", minWidth: 90 },
  reviewValue: { fontSize: 14, color: Colors.foreground, fontWeight: "700", flex: 1, textAlign: "right" },

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
  nextText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },

  // Photo step
  photoPreviewWrap: { alignItems: "center", marginBottom: 24 },
  photoPreview: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.primary },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.muted, borderWidth: 2, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  photoPlaceholderIcon: { fontSize: 48 },
  removePhotoBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.destructiveLight },
  removePhotoBtnText: { fontSize: 13, color: Colors.destructive, fontWeight: "700" },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.primary, borderStyle: "dashed",
    backgroundColor: Colors.primaryLight,
  },
  uploadBtnIcon: { fontSize: 22 },
  uploadBtnText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { fontSize: 13, color: Colors.mutedForeground, fontWeight: "500" },
});
