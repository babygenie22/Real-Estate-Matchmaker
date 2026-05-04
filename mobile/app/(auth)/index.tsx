import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Colors } from "@/lib/constants";

type Tab = "login" | "register";

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email.trim(), password);
      } else {
        if (password.length < 6) {
          Alert.alert("Weak password", "Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        await register({ email: email.trim(), password, firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined });
      }
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Hero area */}
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🏠</Text>
          </View>
          <Text style={styles.appName}>HomeMatch</Text>
          <Text style={styles.tagline}>Find your perfect real estate agent</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tab switcher */}
          <View style={styles.tabs}>
            {(["login", "register"] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === "login" ? "Log In" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {tab === "register" && (
              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1, marginRight: 6 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    placeholderTextColor={Colors.mutedForeground}
                  />
                </View>
                <View style={[styles.inputWrap, { flex: 1, marginLeft: 6 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    placeholderTextColor={Colors.mutedForeground}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder={tab === "register" ? "Min 6 characters" : "••••••••"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {tab === "login" ? "Log In" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {tab === "login" ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setTab(tab === "login" ? "register" : "login")}>
              <Text style={styles.switchLink}>
                {tab === "login" ? " Sign up" : " Log in"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },

  hero: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoEmoji: { fontSize: 34 },
  appName: { fontSize: 30, fontWeight: "800", color: Colors.foreground, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: Colors.mutedForeground, marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.background,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: { color: Colors.mutedForeground, fontWeight: "600", fontSize: 15 },
  tabTextActive: { color: Colors.foreground, fontWeight: "700" },

  form: { gap: 14 },
  row: { flexDirection: "row" },
  inputWrap: { gap: 5 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.foregroundSecondary },
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

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  switchText: { fontSize: 14, color: Colors.mutedForeground },
  switchLink: { fontSize: 14, color: Colors.primary, fontWeight: "700" },
});
