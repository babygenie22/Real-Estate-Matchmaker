import React from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Colors } from "@/lib/constants";

const { width: SCREEN_W } = Dimensions.get("window");
export const CARD_W = SCREEN_W - 32;
export const CARD_H = CARD_W * 1.38;
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

interface Agent {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  specialties: string[] | null;
  serviceAreas: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  transactionCount: number | null;
  avgDaysOnMarket?: number | null;
  saleToListRatio?: number | null;
  yearsExperience: number | null;
}

interface SwipeCardProps {
  agent: Agent;
  onLike: () => void;
  onPass: () => void;
  onPress: () => void;
  isTop: boolean;
}

export default function SwipeCard({ agent, onLike, onPass, onPress, isTop }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W * 1.5, { damping: 14 });
        runOnJS(onLike)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W * 1.5, { damping: 14 });
        runOnJS(onPass)();
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => { runOnJS(onPress)(); });
  const composed = Gesture.Simultaneous(gesture, tapGesture);

  const animStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_W / 2, 0, SCREEN_W / 2], [-15, 0, 15], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  const photoUri = agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=400&background=dbeafe&color=2563eb`;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, animStyle]}>
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

        {/* Gradient layers (top shadow + bottom content area) */}
        <View style={styles.gradientTopFade} />
        <View style={styles.gradientBottomFade} />

        {/* LIKE stamp */}
        <Animated.View style={[styles.stamp, styles.likeStamp, likeOpacity]}>
          <Text style={styles.likeStampText}>LIKE 💚</Text>
        </Animated.View>

        {/* PASS stamp */}
        <Animated.View style={[styles.stamp, styles.passStamp, passOpacity]}>
          <Text style={styles.passStampText}>PASS ✕</Text>
        </Animated.View>

        {/* Info overlay */}
        <View style={styles.infoOverlay}>
          {/* Name + exp */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{agent.name}</Text>
            {agent.yearsExperience != null && (
              <View style={styles.expBadge}>
                <Text style={styles.expText}>{agent.yearsExperience}yr</Text>
              </View>
            )}
          </View>

          {/* Rating */}
          {agent.rating != null && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingVal}>{agent.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({agent.reviewCount})</Text>
              <Text style={styles.ratingDot}>·</Text>
              <Text style={styles.ratingDeals}>{agent.transactionCount} deals</Text>
            </View>
          )}

          {/* Service areas */}
          {agent.serviceAreas && agent.serviceAreas.length > 0 && (
            <Text style={styles.areas} numberOfLines={1}>
              📍 {agent.serviceAreas.slice(0, 3).join(", ")}
            </Text>
          )}

          {/* Stats row */}
          {(agent.avgDaysOnMarket != null || agent.saleToListRatio != null) && (
            <View style={styles.statsRow}>
              {agent.avgDaysOnMarket != null && (
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>{agent.avgDaysOnMarket}d</Text>
                  <Text style={styles.statLabel}>Avg DOM</Text>
                </View>
              )}
              {agent.saleToListRatio != null && (
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>{(agent.saleToListRatio * 100).toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>S/L Ratio</Text>
                </View>
              )}
              {agent.transactionCount != null && (
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>{agent.transactionCount}</Text>
                  <Text style={styles.statLabel}>Deals</Text>
                </View>
              )}
            </View>
          )}

          {/* Specialties */}
          {agent.specialties && agent.specialties.length > 0 && (
            <View style={styles.tags}>
              {agent.specialties.slice(0, 3).map((s) => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.card,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    position: "absolute",
  },
  photo: { position: "absolute", width: "100%", height: "100%" },
  gradientTopFade: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "30%",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  gradientBottomFade: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.72)",
  },

  stamp: {
    position: "absolute",
    top: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 3.5,
  },
  likeStamp: { left: 18, borderColor: "#22c55e", transform: [{ rotate: "-14deg" }], backgroundColor: "rgba(34,197,94,0.12)" },
  passStamp: { right: 18, borderColor: "#ef4444", transform: [{ rotate: "14deg" }], backgroundColor: "rgba(239,68,68,0.12)" },
  likeStampText: { color: "#22c55e", fontWeight: "900", fontSize: 22, letterSpacing: 1.5 },
  passStampText: { color: "#ef4444", fontWeight: "900", fontSize: 22, letterSpacing: 1.5 },

  infoOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: 20,
    paddingBottom: 22,
    gap: 6,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 24, fontWeight: "800", color: "#fff", flex: 1, letterSpacing: -0.3 },
  expBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  expText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingStar: { fontSize: 13 },
  ratingVal: { fontSize: 14, fontWeight: "700", color: "#fff" },
  ratingCount: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  ratingDot: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  ratingDeals: { fontSize: 12, color: "rgba(255,255,255,0.65)" },

  areas: { fontSize: 12, color: "rgba(255,255,255,0.75)" },

  statsRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  statChip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    minWidth: 60,
  },
  statVal: { color: "#fff", fontSize: 13, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "500", marginTop: 1 },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tagText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "600" },
});
