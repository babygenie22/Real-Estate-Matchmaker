import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, type ThemeColors } from "@/lib/theme";

/**
 * Trust badge shown on agent cards/profiles. An agent is "verified" when an
 * admin has approved them AND they have a license number on file.
 */
export function isVerified(agent: { isApproved?: boolean; licenseNumber?: string | null }): boolean {
  return Boolean(agent.isApproved) && Boolean(agent.licenseNumber && agent.licenseNumber.trim());
}

export function VerifiedBadge({ size = "md", onLight = false }: { size?: "sm" | "md"; onLight?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const compact = size === "sm";
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeSm,
        onLight && styles.badgeOnLight,
      ]}
    >
      <Text style={[styles.check, compact && styles.checkSm]}>✓</Text>
      {!compact && <Text style={styles.label}>Verified</Text>}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSm: { paddingHorizontal: 5, paddingVertical: 5, borderRadius: 10, gap: 0 },
  badgeOnLight: {
    backgroundColor: c.primaryLight,
  },
  check: { color: "#fff", fontSize: 11, fontWeight: "900" },
  checkSm: { fontSize: 10 },
  label: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
});
