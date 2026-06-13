import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

type Variant = "pass" | "info" | "like";

/**
 * Swipe-action button with a gentle claymorphism look: a soft pastel body, a
 * light top sheen and a faint bottom shade to fake the puffy "clay" inflation
 * (RN has no inset shadows), plus a soft diffuse drop shadow. Springs on press.
 */
export function ActionButton({ variant, onPress }: { variant: Variant; onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();

  const cfg = {
    pass: {
      size: 64, glyph: "✕", glyphSize: 23,
      bg: colors.destructiveLight, glyphColor: colors.destructive, shadow: colors.destructive,
      sheen: "rgba(255,255,255,0.55)",
    },
    info: {
      size: 52, glyph: "i", glyphSize: 21,
      bg: colors.muted, glyphColor: colors.foregroundSecondary, shadow: colors.shadowColor,
      sheen: "rgba(255,255,255,0.5)",
    },
    like: {
      size: 72, glyph: "♥", glyphSize: 29,
      bg: colors.like, glyphColor: "#ffffff", shadow: colors.like,
      sheen: "rgba(255,255,255,0.28)",
    },
  }[variant];

  const r = cfg.size / 2;

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} hitSlop={8}>
      <Animated.View
        style={[
          styles.btn,
          {
            width: cfg.size,
            height: cfg.size,
            borderRadius: r,
            backgroundColor: cfg.bg,
            shadowColor: cfg.shadow,
            shadowOpacity: 0.2,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 7 },
            elevation: 6,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Clipped clay surface (sheen + shade). Kept separate from the shadow
            view above — a view can't both cast a shadow and clip on iOS. */}
        <View pointerEvents="none" style={[styles.clip, { borderRadius: r }]}>
          <View style={[styles.sheen, { height: cfg.size * 0.4, backgroundColor: cfg.sheen }]} />
          <View style={[styles.shade, { height: cfg.size * 0.3 }]} />
        </View>
        {variant === "info" ? (
          <View style={styles.infoMark}>
            <View style={[styles.infoDot, { backgroundColor: cfg.glyphColor }]} />
            <View style={[styles.infoBar, { backgroundColor: cfg.glyphColor }]} />
          </View>
        ) : (
          <Text style={[styles.glyph, { fontSize: cfg.glyphSize, color: cfg.glyphColor }]}>{cfg.glyph}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { justifyContent: "center", alignItems: "center" },
  clip: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  sheen: { position: "absolute", top: 0, left: 0, right: 0 },
  shade: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.06)" },
  glyph: { includeFontPadding: false, textAlign: "center", fontWeight: "700" },
  infoMark: { alignItems: "center", justifyContent: "center" },
  infoDot: { width: 4.5, height: 4.5, borderRadius: 2.25, marginBottom: 3 },
  infoBar: { width: 4, height: 13, borderRadius: 2 },
});
