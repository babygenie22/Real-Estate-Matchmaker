import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

export interface MatchInfo {
  matchId: string;
  agentName: string;
}

/**
 * Non-blocking "it's a match" toast. Slides down from the top, auto-dismisses,
 * and taps through to the conversation. Rendered once in Discover; pass a fresh
 * MatchInfo to trigger it.
 */
export function MatchToast({
  match,
  onOpen,
  onDismiss,
}: {
  match: MatchInfo | null;
  onOpen: (matchId: string) => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function animateOut(then?: () => void) {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -140, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => then?.());
  }

  useEffect(() => {
    if (!match) return;
    haptics.success();
    translateY.setValue(-140);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => animateOut(onDismiss), 3400);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [match]);

  if (!match) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { transform: [{ translateY }], opacity }]}>
      <Pressable
        style={styles.toast}
        onPress={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          haptics.light();
          animateOut(() => onOpen(match.matchId));
        }}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🎉</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>It's a match!</Text>
          <Text style={styles.sub} numberOfLines={1}>You and {match.agentName} can now chat</Text>
        </View>
        <Text style={styles.cta}>Chat ›</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { position: "absolute", top: 52, left: 16, right: 16, zIndex: 100 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.card,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: c.success + "55",
    shadowColor: c.shadowColor,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.successLight, alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 20 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: "800", color: c.foreground },
  sub: { fontSize: 13, color: c.mutedForeground, marginTop: 1 },
  cta: { fontSize: 14, fontWeight: "800", color: c.success },
});
