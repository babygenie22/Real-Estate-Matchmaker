import { useMemo } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useTheme, type ThemeColors } from "@/lib/theme";

interface Props {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  showArrow?: boolean;
}

export function SettingsRow({ icon, label, value, onPress, danger = false, showArrow = true }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.label, danger && styles.dangerText]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value !== undefined && (
          <Text style={styles.value}>{value}</Text>
        )}
        {showArrow && onPress && (
          <Text style={styles.arrow}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    backgroundColor: c.card,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: c.foreground,
    fontWeight: "400",
  },
  dangerText: {
    color: c.destructive,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 15,
    color: c.mutedForeground,
    marginRight: 4,
  },
  arrow: {
    fontSize: 20,
    color: c.mutedForeground,
    lineHeight: 22,
  },
});
