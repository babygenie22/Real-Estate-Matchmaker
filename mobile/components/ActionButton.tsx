import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

type Variant = "pass" | "info" | "like";

/**
 * Premium swipe-action button: spring press-scale, a crisp monochrome glyph
 * (not a multicolor emoji), and a color-matched glow. `pass` and `like` read
 * as the primary actions; `info` is a quieter secondary.
 */
export function ActionButton({ variant, onPress }: { variant: Variant; onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();

  const cfg = {
    pass: {
      size: 64, glyph: "✕", glyphSize: 26,
      bg: colors.card, ring: colors.destructive, glyphColor: colors.destructive,
      glow: colors.destructive, ringWidth: 2, filled: false,
    },
    info: {
      size: 52, glyph: "i", glyphSize: 22,
      bg: colors.card, ring: colors.border, glyphColor: colors.foregroundSecondary,
      glow: colors.shadowColor, ringWidth: 1.5, filled: false,
    },
    like: {
      size: 72, glyph: "♥", glyphSize: 30,
      bg: colors.like, ring: colors.like, glyphColor: "#ffffff",
      glow: colors.like, ringWidth: 0, filled: true,
    },
  }[variant];

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} hitSlop={8}>
      <Animated.View
        style={[
          styles.btn,
          {
            width: cfg.size,
            height: cfg.size,
            borderRadius: cfg.size / 2,
            backgroundColor: cfg.bg,
            borderWidth: cfg.ringWidth,
            borderColor: cfg.ring,
            shadowColor: cfg.glow,
            shadowOpacity: cfg.filled ? 0.45 : 0.28,
            shadowRadius: cfg.filled ? 14 : 10,
            shadowOffset: { width: 0, height: cfg.filled ? 8 : 5 },
            elevation: cfg.filled ? 8 : 5,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Subtle top-edge highlight on the filled button for depth */}
        {cfg.filled && <View style={[styles.gloss, { borderRadius: cfg.size / 2 }]} />}
        {variant === "info" ? (
          // Vector-style info mark (dot + rounded bar) — crisper than a glyph.
          <View style={styles.infoMark}>
            <View style={[styles.infoDot, { backgroundColor: cfg.glyphColor }]} />
            <View style={[styles.infoBar, { backgroundColor: cfg.glyphColor }]} />
          </View>
        ) : (
          <Text style={[styles.glyph, { fontSize: cfg.glyphSize, color: cfg.glyphColor }]}>
            {cfg.glyph}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { justifyContent: "center", alignItems: "center" },
  gloss: {
    position: "absolute",
    top: 0, left: 0, right: 0, height: "55%",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  glyph: { includeFontPadding: false, textAlign: "center", fontWeight: "700" },
  infoMark: { alignItems: "center", justifyContent: "center" },
  infoDot: { width: 4.5, height: 4.5, borderRadius: 2.25, marginBottom: 3 },
  infoBar: { width: 4, height: 13, borderRadius: 2 },
});
