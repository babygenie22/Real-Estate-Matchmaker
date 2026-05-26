import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Colors } from "@/lib/constants";

interface Props {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  showArrow?: boolean;
}

export function SettingsRow({ icon, label, value, onPress, danger = false, showArrow = true }: Props) {
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.card,
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
    color: Colors.foreground,
    fontWeight: "400",
  },
  dangerText: {
    color: Colors.destructive,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 15,
    color: Colors.mutedForeground,
    marginRight: 4,
  },
  arrow: {
    fontSize: 20,
    color: Colors.mutedForeground,
    lineHeight: 22,
  },
});
