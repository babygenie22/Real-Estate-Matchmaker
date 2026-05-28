import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

const LANGUAGES = [
  "English", "Spanish", "Arabic", "Mandarin", "French", "Hindi", "Portuguese",
];

const MICHIGAN_CITIES = [
  "Detroit", "Ann Arbor", "Grand Rapids", "Lansing", "Troy", "Novi",
  "Dearborn", "Southfield", "Sterling Heights", "Auburn Hills", "Birmingham",
  "Bloomfield Hills", "West Bloomfield", "Plymouth", "Canton", "Northville",
  "Farmington Hills", "Livonia", "Rochester Hills", "Pontiac", "Royal Oak",
  "Ferndale", "Clarkston", "Milford", "Brighton",
];

const SPECIALTIES = [
  "First-Time Buyers", "Luxury Homes", "Investment Properties", "Relocation",
  "New Construction", "Short Sales/Foreclosures", "Commercial", "Condos & Townhomes",
];

const PERSONALITY_TAGS = [
  "Patient & Educational", "Bold & Results-Driven", "Analytical & Data-Driven",
  "Responsive & Tech-Savvy", "Community-Focused",
];

function ChipSelect({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
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

export default function AgentProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await api.get<any>("/api/agent-portal/me");
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setBio(data.bio ?? "");
      setPhoto(data.photo ?? "");
      setLicenseNumber(data.licenseNumber ?? "");
      setWebsite(data.website ?? "");
      setYearsExperience(data.yearsExperience ?? 0);
      setSpecialties(data.specialties ?? []);
      setServiceAreas(data.serviceAreas ?? []);
      setPersonalityTags(data.personalityTags ?? []);
      setLanguages(data.languages ?? []);
      setPriceMin(data.priceRangeMin ? String(data.priceRangeMin) : "");
      setPriceMax(data.priceRangeMax ? String(data.priceRangeMax) : "");
    } catch (err: any) {
      Alert.alert("Error", "Could not load your profile. " + (err.message ?? ""));
    } finally {
      setLoading(false);
    }
  }


  function toggleChip(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        licenseNumber: licenseNumber.trim(),
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (bio.trim()) payload.bio = bio.trim();
      if (photo.trim()) payload.photo = photo.trim();
      if (website.trim()) payload.website = website.trim();
      if (specialties.length > 0) payload.specialties = specialties;
      if (serviceAreas.length > 0) payload.serviceAreas = serviceAreas;
      if (personalityTags.length > 0) payload.personalityTags = personalityTags;
      if (languages.length > 0) payload.languages = languages;
      if (yearsExperience > 0) payload.yearsExperience = yearsExperience;
      const min = parseInt(priceMin, 10);
      const max = parseInt(priceMax, 10);
      if (min > 0) payload.priceRangeMin = min;
      if (max > 0) payload.priceRangeMax = max;

      await api.put("/api/agent-portal/profile", payload);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2000);
    } catch (err: any) {
      Alert.alert("Save failed", err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Saved banner */}
      {savedBanner && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedBannerText}>Changes saved ✓</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Photo */}
        <View style={styles.photoSection}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>👤</Text>
            </View>
          )}
          {photo ? (
            <TouchableOpacity style={styles.removeBtn} onPress={() => setPhoto("")} activeOpacity={0.8}>
              <Text style={styles.removeBtnText}>Remove Photo</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldHint}>Paste a photo URL (LinkedIn, website, etc.)</Text>
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
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>

          <Field label="Full Name *" value={name} onChangeText={setName} placeholder="Jane Smith" autoCapitalize="words" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" />
          <Field label="License Number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="MI-RE123456" autoCapitalize="characters" />
          <Field label="Website URL" value={website} onChangeText={setWebsite} placeholder="https://yoursite.com" keyboardType="url" />

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Years of Experience</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setYearsExperience(Math.max(0, yearsExperience - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{yearsExperience === 30 ? "30+" : yearsExperience} {yearsExperience === 1 ? "yr" : "yrs"}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setYearsExperience(Math.min(30, yearsExperience + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <Text style={styles.fieldHint}>{bio.length}/500</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell buyers about your background and approach..."
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, 500))}
              multiline
              numberOfLines={4}
              placeholderTextColor={Colors.mutedForeground}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.priceRow}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Min ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="200000"
                value={priceMin}
                onChangeText={(t) => setPriceMin(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>
            <Text style={styles.priceTo}>to</Text>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Max ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="800000"
                value={priceMax}
                onChangeText={(t) => setPriceMax(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Areas</Text>
          <ChipSelect options={MICHIGAN_CITIES} selected={serviceAreas} onToggle={(v) => toggleChip(serviceAreas, setServiceAreas, v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <ChipSelect options={SPECIALTIES} selected={specialties} onToggle={(v) => toggleChip(specialties, setSpecialties, v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Style</Text>
          <ChipSelect options={PERSONALITY_TAGS} selected={personalityTags} onToggle={(v) => toggleChip(personalityTags, setPersonalityTags, v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <ChipSelect options={LANGUAGES} selected={languages} onToggle={(v) => toggleChip(languages, setLanguages, v)} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        placeholderTextColor={Colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  headerTitle: { fontSize: 17, fontWeight: "800", color: Colors.foreground },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, minWidth: 60, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  scroll: { padding: 20, gap: 8 },

  savedBanner: {
    backgroundColor: Colors.successLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.success + "44",
    paddingVertical: 10,
    alignItems: "center",
  },
  savedBannerText: { fontSize: 14, fontWeight: "700", color: Colors.success },

  photoSection: { alignItems: "center", marginBottom: 16, gap: 12 },
  photoImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.primary },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.muted, borderWidth: 2, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  photoPlaceholderIcon: { fontSize: 40 },
  photoActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  photoBtn: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  photoBtnText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  removeBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: Colors.destructiveLight,
  },
  removeBtnText: { fontSize: 14, fontWeight: "700", color: Colors.destructive },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: Colors.foreground, marginBottom: 14 },

  fieldWrap: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: Colors.foregroundSecondary },
  fieldHint: { fontSize: 12, color: Colors.mutedForeground },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: Colors.foreground, backgroundColor: Colors.background,
  },
  textArea: { minHeight: 100, paddingTop: 12 },

  stepperRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.muted, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  stepperBtnText: { fontSize: 22, color: Colors.foreground, fontWeight: "600", lineHeight: 26 },
  stepperValue: { fontSize: 17, fontWeight: "700", color: Colors.foreground, minWidth: 70, textAlign: "center" },

  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  priceTo: { color: Colors.mutedForeground, fontSize: 14, fontWeight: "600", paddingBottom: 14 },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 14, color: Colors.foreground, fontWeight: "500" },
  chipTextActive: { color: Colors.primary, fontWeight: "700" },
});
