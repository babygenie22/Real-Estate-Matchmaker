import { useState, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, Switch, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/lib/auth";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { SettingsRow } from "@/components/SettingsRow";
import { registerForPushNotifications, presentLocalNotification } from "@/lib/notifications";
import { haptics } from "@/lib/haptics";

const PUSH_NOTIFICATIONS_KEY = "homematch_push_notifications_enabled";

function SectionHeader({ title, styles }: { title: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
  );
}

function Divider({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.divider} />;
}

const APPEARANCE_OPTIONS = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { logout } = useAuth();
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(PUSH_NOTIFICATIONS_KEY);
        if (stored !== null) setPushEnabled(stored === "true");
      } catch {}
    })();
  }, []);

  async function togglePush(value: boolean) {
    setPushEnabled(value);
    try {
      await SecureStore.setItemAsync(PUSH_NOTIFICATIONS_KEY, value ? "true" : "false");
    } catch {}
    // When enabling, register the device with the backend so it can receive push.
    if (value) registerForPushNotifications();
  }

  async function sendTestNotification() {
    haptics.light();
    await presentLocalNotification(
      "🔔 Test notification",
      "Notifications are working! Tap to open your alerts.",
      { type: "default" }
    );
    Alert.alert("Sent", "A test notification has been delivered.");
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)");
        },
      },
    ]);
  }

  async function openEmail(subject: string, body?: string) {
    const params = new URLSearchParams({ subject, ...(body ? { body } : {}) });
    const url = `mailto:support@homematch.app?${params.toString()}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Contact us", "Email support@homematch.app and we'll be happy to help.");
      }
    } catch {
      Alert.alert("Contact us", "Email support@homematch.app and we'll be happy to help.");
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This is permanent and cannot be undone. We'll process your request within 48 hours.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: () => openEmail("Delete my account", "Please delete my HomeMatch account."),
        },
      ]
    );
  }

  function handleRateApp() {
    Alert.alert("Thanks for the love! 🏠", undefined, [{ text: "OK" }]);
  }

  function handleContactSupport() {
    openEmail("HomeMatch support request");
  }

  function handleReportBug() {
    openEmail("Bug report", "Describe what happened and the steps to reproduce it:\n\n");
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Account */}
        <SectionHeader title="Account" styles={styles} />
        <View style={styles.section}>
          <SettingsRow
            icon="✏️"
            label="Edit Preferences"
            onPress={() => router.push("/onboarding")}
          />
          <Divider styles={styles} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleIcon}>🔔</Text>
              <Text style={styles.toggleLabel}>Notification Settings</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <Divider styles={styles} />
          <SettingsRow
            icon="📨"
            label="Send a test notification"
            onPress={sendTestNotification}
          />
          <Divider styles={styles} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleIcon}>🌗</Text>
              <Text style={styles.toggleLabel}>Appearance</Text>
            </View>
            <View style={styles.segment}>
              {APPEARANCE_OPTIONS.map((opt) => {
                const active = preference === opt.value;
                return (
                  <Text
                    key={opt.value}
                    onPress={() => {
                      haptics.selection();
                      setPreference(opt.value);
                    }}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                  >
                    {opt.label}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>

        {/* App */}
        <SectionHeader title="App" styles={styles} />
        <View style={styles.section}>
          <SettingsRow
            icon="🔒"
            label="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
          />
          <Divider styles={styles} />
          <SettingsRow
            icon="📄"
            label="Terms of Service"
            onPress={() => router.push("/terms")}
          />
          <Divider styles={styles} />
          <SettingsRow
            icon="⭐"
            label="Rate HomeMatch"
            onPress={handleRateApp}
          />
          <Divider styles={styles} />
          <SettingsRow
            icon="ℹ️"
            label="App Version"
            value={appVersion}
            showArrow={false}
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" styles={styles} />
        <View style={styles.section}>
          <SettingsRow
            icon="💬"
            label="Contact Support"
            onPress={handleContactSupport}
          />
          <Divider styles={styles} />
          <SettingsRow
            icon="🐛"
            label="Report a Bug"
            onPress={handleReportBug}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" styles={styles} />
        <View style={styles.section}>
          <SettingsRow
            icon="🚪"
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />
          <Divider styles={styles} />
          <SettingsRow
            icon="🗑️"
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
            showArrow={false}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>HomeMatch © 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: c.foreground,
  },
  content: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: c.mutedForeground,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 6,
  },
  section: {
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.cardBorder,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.cardBorder,
    marginLeft: 52,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: c.foreground,
    fontWeight: "400",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: c.muted,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    fontSize: 13,
    fontWeight: "600",
    color: c.mutedForeground,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentItemActive: {
    backgroundColor: c.card,
    color: c.foreground,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    paddingTop: 32,
  },
  footerText: {
    fontSize: 13,
    color: c.mutedForeground,
  },
});
