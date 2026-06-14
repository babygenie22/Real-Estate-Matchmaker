import { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
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
      size: 64, iconSize: 30,
      bg: colors.pass, iconColor: "#ffffff", shadow: colors.pass,
      sheen: "rgba(255,255,255,0.32)",
    },
    info: {
      size: 52, iconSize: 22,
      bg: colors.muted, iconColor: colors.foregroundSecondary, shadow: colors.shadowColor,
      sheen: "rgba(255,255,255,0.5)",
    },
    like: {
      size: 72, iconSize: 36,
      bg: colors.like, iconColor: "#ffffff", shadow: colors.like,
      sheen: "rgba(255,255,255,0.3)",
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
            shadowOpacity: 0.28,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 7,
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
        {variant === "like" ? (
          <Ionicons name="heart" size={cfg.iconSize} color={cfg.iconColor} />
        ) : variant === "pass" ? (
          <Ionicons name="close" size={cfg.iconSize} color={cfg.iconColor} />
        ) : (
          <Feather name="info" size={cfg.iconSize} color={cfg.iconColor} />
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
});
