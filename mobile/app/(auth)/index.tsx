import { useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useTheme, type ThemeColors } from "@/lib/theme";

type Tab = "login" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login, register } = useAuth();
  const router = useRouter();

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    else if (tab === "register" && password.length < 6) next.password = "Use at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email.trim(), password);
        router.replace("/");
      } else {
        if (isAgent) {
          // Navigate to agent onboarding flow, passing credentials as params
          router.push({
            pathname: "/(auth)/agent-register",
            params: { email: email.trim(), password },
          });
          setLoading(false);
          return;
        }
        await register({ email: email.trim(), password, firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined });
        router.replace("/");
      }
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
                onPress={() => { setTab(t); setErrors({}); }}
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
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={[styles.inputWrap, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.label}>Last name</Text>
                  <TextInput
                    ref={lastNameRef}
                    style={styles.input}
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailRef}
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholderTextColor={colors.mutedForeground}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputNoBorder]}
                  placeholder={tab === "register" ? "Min 6 characters" : "••••••••"}
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
                  secureTextEntry={!showPassword}
                  returnKeyType={tab === "login" ? "go" : "next"}
                  onSubmitEditing={handleSubmit}
                  placeholderTextColor={colors.mutedForeground}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {tab === "login" && (
              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => Alert.alert("Reset Password", "Please contact support to reset your password.")}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {tab === "register" && (
              <View style={[styles.agentToggleRow, isAgent && styles.agentToggleRowActive]}>
                <View style={styles.agentToggleInfo}>
                  <Text style={[styles.agentToggleLabel, isAgent && styles.agentToggleLabelActive]}>
                    I'm a real estate agent
                  </Text>
                  <Text style={styles.agentToggleHint}>
                    {isAgent ? "You'll set up your agent profile in the next step" : "Verified agents get a profile, reviews, and bookings"}
                  </Text>
                </View>
                <Switch
                  value={isAgent}
                  onValueChange={setIsAgent}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            )}

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
                  {tab === "login" ? "Log In" : isAgent ? "Set Up Agent Profile →" : "Create Account"}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },

  hero: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: c.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: c.shadowColor,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoEmoji: { fontSize: 34 },
  appName: { fontSize: 30, fontWeight: "800", color: c.foreground, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: c.mutedForeground, marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: c.shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: c.muted,
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
    backgroundColor: c.background,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: { color: c.mutedForeground, fontWeight: "600", fontSize: 15 },
  tabTextActive: { color: c.foreground, fontWeight: "700" },

  form: { gap: 14 },
  row: { flexDirection: "row" },
  inputWrap: { gap: 5 },
  label: { fontSize: 13, fontWeight: "600", color: c.foregroundSecondary },
  input: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: c.foreground,
    backgroundColor: c.background,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.background,
    paddingRight: 4,
  },
  inputNoBorder: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
  inputError: { borderColor: c.destructive },
  errorText: { fontSize: 12, color: c.destructive, fontWeight: "600", marginTop: 4 },
  eyeBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 20 },
  forgotRow: { alignItems: "flex-end" },
  forgotText: { fontSize: 13, color: c.primary, fontWeight: "600" },

  submitBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: c.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  switchText: { fontSize: 14, color: c.mutedForeground },
  switchLink: { fontSize: 14, color: c.primary, fontWeight: "700" },

  agentToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.muted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  agentToggleRowActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  agentToggleInfo: { flex: 1, marginRight: 12 },
  agentToggleLabel: { fontSize: 14, fontWeight: "700", color: c.foreground },
  agentToggleLabelActive: { color: c.primary },
  agentToggleHint: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  agentToggleDesc: {
    fontSize: 12,
    color: c.primary,
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 16,
  },
});
