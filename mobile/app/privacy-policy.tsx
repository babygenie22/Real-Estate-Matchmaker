import { useMemo } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, type ThemeColors } from "@/lib/theme";

interface SectionProps {
  title: string;
  children: string;
}

function PolicySection({ title, children }: SectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

        <PolicySection title="Information We Collect">
          {"We collect information you provide when creating an account, such as your name, email address, location preferences, and budget. We also collect usage data to improve our matching algorithm and your experience."}
        </PolicySection>

        <PolicySection title="How We Use It">
          {"Your information is used to match you with real estate agents in your area, personalize your experience, and send relevant notifications. We may use aggregated, anonymized data to improve our service and features."}
        </PolicySection>

        <PolicySection title="Data Sharing">
          {"We share your contact information with agents only after you explicitly match with them. We do not sell your personal data to third parties or advertisers. We may share data with service providers who help us operate HomeMatch."}
        </PolicySection>

        <PolicySection title="Your Rights">
          {"You may access, correct, or delete your personal data at any time by contacting us. You can also opt out of marketing communications in your notification settings. Residents of certain states may have additional rights under applicable privacy laws."}
        </PolicySection>

        <PolicySection title="Contact Us">
          {"If you have questions about this policy or how we handle your data, email us at privacy@homematch.app. We respond to all requests within 30 days. Our mailing address is available upon request."}
        </PolicySection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>HomeMatch © 2026 · All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
    backgroundColor: c.background,
  },
  backButton: {
    minWidth: 64,
  },
  backText: {
    fontSize: 16,
    color: c.primary,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.foreground,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    color: c.mutedForeground,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.primary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 15,
    color: c.foregroundSecondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: c.mutedForeground,
  },
});
