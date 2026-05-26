import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/lib/constants";

interface SectionProps {
  title: string;
  children: string;
}

function PolicySection({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

        <PolicySection title="Acceptance of Terms">
          {"By downloading or using HomeMatch, you agree to these Terms of Service. If you do not agree, please do not use the app. We may update these terms from time to time and will notify you of significant changes."}
        </PolicySection>

        <PolicySection title="Use of Service">
          {"HomeMatch is a platform connecting home buyers and renters with licensed real estate agents. You must be at least 18 years old to use this service and must not use it for any unlawful purpose."}
        </PolicySection>

        <PolicySection title="Agent Listings">
          {"Agent profiles are provided for informational purposes only. HomeMatch does not guarantee the accuracy of agent listings, reviews, or credentials. We encourage users to independently verify agent licensing before engaging their services."}
        </PolicySection>

        <PolicySection title="User Content">
          {"By submitting content (including profile information and messages), you grant HomeMatch a non-exclusive license to use that content to operate and improve the service. You are responsible for ensuring your content does not violate any laws or third-party rights."}
        </PolicySection>

        <PolicySection title="Limitation of Liability">
          {"HomeMatch is provided 'as is' without warranties of any kind. We are not liable for any damages arising from your use of the service, including any transactions with agents you connect with through our platform."}
        </PolicySection>

        <PolicySection title="Contact">
          {"For questions about these terms, email us at legal@homematch.app. To report violations of these terms, contact support@homematch.app. We aim to respond within 5 business days."}
        </PolicySection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>HomeMatch © 2026 · All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  backButton: {
    minWidth: 64,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.foreground,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 15,
    color: Colors.foregroundSecondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
});
