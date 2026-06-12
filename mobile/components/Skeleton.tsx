import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from "react-native";
import { useTheme, type ThemeColors } from "@/lib/theme";

/**
 * Shimmering skeleton placeholder. Use while async content loads —
 * perceived ~40% faster than a blank spinner.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.muted, opacity },
        style,
      ]}
    />
  );
}

/** A skeleton shaped like an agent swipe card. */
export function SkeletonCard({ width, height }: { width: number; height: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, { width, height }]}>
      <Skeleton width="100%" height={height * 0.62} radius={0} />
      <View style={styles.cardBody}>
        <Skeleton width="60%" height={24} radius={8} />
        <Skeleton width="40%" height={16} radius={6} style={{ marginTop: 10 }} />
        <View style={styles.cardChips}>
          <Skeleton width={80} height={28} radius={14} />
          <Skeleton width={64} height={28} radius={14} />
          <Skeleton width={72} height={28} radius={14} />
        </View>
      </View>
    </View>
  );
}

/** A skeleton shaped like a list row (avatar + two lines). */
export function SkeletonRow() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Skeleton width={56} height={56} radius={28} />
      <View style={styles.rowBody}>
        <Skeleton width="55%" height={18} radius={6} />
        <Skeleton width="80%" height={14} radius={5} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  cardBody: { padding: 18, gap: 4 },
  cardChips: { flexDirection: "row", gap: 8, marginTop: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  rowBody: { flex: 1 },
});
