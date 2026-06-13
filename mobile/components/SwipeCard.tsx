import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import {
  View, Text, Image, StyleSheet, Dimensions,
  PanResponder, Animated,
} from "react-native";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { VerifiedBadge, isVerified } from "@/components/VerifiedBadge";
import { haptics } from "@/lib/haptics";

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
  isApproved?: boolean;
  licenseNumber?: string | null;
}

interface SwipeCardProps {
  agent: Agent;
  onLike: () => void;
  onPass: () => void;
  onPress: () => void;
  isTop: boolean;
}

export interface SwipeCardHandle {
  swipe: (direction: "left" | "right") => void;
}

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { agent, onLike, onPass, onPress, isTop },
  ref
) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const position = useRef(new Animated.ValueXY()).current;
  const lastTap = useRef<number>(0);

  // Programmatic fly-off so the action buttons animate the card off-screen
  // (matching a real swipe) instead of making it vanish instantly.
  function forceSwipe(direction: "left" | "right") {
    const x = direction === "right" ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => (direction === "right" ? onLike() : onPass()));
  }

  useImperativeHandle(ref, () => ({ swipe: forceSwipe }), [onLike, onPass]);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [20, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: (_, gs) => isTop && (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5),
      onPanResponderGrant: () => {
        position.setOffset({ x: (position.x as any).__getValue(), y: 0 });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gs) => {
        position.flattenOffset();
        const now = Date.now();
        const isTap = Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5 && gs.numberActiveTouches === 0;

        if (isTap && now - lastTap.current < 300) {
          // double tap — treat as single tap
        } else if (isTap) {
          lastTap.current = now;
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            damping: 18,
            stiffness: 200,
          }).start();
          onPress();
          return;
        }

        if (gs.dx > SWIPE_THRESHOLD) {
          haptics.success();
          Animated.spring(position, {
            toValue: { x: SCREEN_W * 1.5, y: gs.dy },
            useNativeDriver: false,
            damping: 14,
          }).start(() => onLike());
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          haptics.light();
          Animated.spring(position, {
            toValue: { x: -SCREEN_W * 1.5, y: gs.dy },
            useNativeDriver: false,
            damping: 14,
          }).start(() => onPass());
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            damping: 18,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  const photoUri =
    agent.photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=512&background=dbeafe&color=2563eb`;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        },
      ]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

      {/* Shadow overlays */}
      <View style={styles.gradientTopFade} />
      <View style={styles.gradientBottomFade} />

      {/* LIKE stamp */}
      <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
        <Text style={styles.likeStampText}>LIKE 💚</Text>
      </Animated.View>

      {/* PASS stamp */}
      <Animated.View style={[styles.stamp, styles.passStamp, { opacity: passOpacity }]}>
        <Text style={styles.passStampText}>PASS ✕</Text>
      </Animated.View>

      {/* Info overlay */}
      <View style={styles.infoOverlay}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{agent.name}</Text>
          {isVerified(agent) && <VerifiedBadge size="sm" />}
          {agent.yearsExperience != null && (
            <View style={styles.expBadge}>
              <Text style={styles.expText}>{agent.yearsExperience}yr</Text>
            </View>
          )}
        </View>

        {agent.rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingVal}>{agent.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({agent.reviewCount})</Text>
            <Text style={styles.ratingDot}>·</Text>
            <Text style={styles.ratingDeals}>{agent.transactionCount} deals</Text>
          </View>
        )}

        {agent.serviceAreas && agent.serviceAreas.length > 0 && (
          <Text style={styles.areas} numberOfLines={1}>
            📍 {agent.serviceAreas.slice(0, 3).join(", ")}
          </Text>
        )}

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
  );
});

export default SwipeCard;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: c.card,
    shadowColor: c.shadowColor,
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
  // Dark translucent backing keeps the stamps legible on light photos.
  likeStamp: { left: 18, borderColor: c.like, transform: [{ rotate: "-14deg" }], backgroundColor: "rgba(0,0,0,0.35)" },
  passStamp: { right: 18, borderColor: c.pass, transform: [{ rotate: "14deg" }], backgroundColor: "rgba(0,0,0,0.35)" },
  likeStampText: { color: c.like, fontWeight: "900", fontSize: 22, letterSpacing: 1.5, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  passStampText: { color: c.pass, fontWeight: "900", fontSize: 22, letterSpacing: 1.5, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

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
    backgroundColor: c.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: c.primary,
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
