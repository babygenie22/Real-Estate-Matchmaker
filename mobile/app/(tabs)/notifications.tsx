import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useTheme, type ThemeColors } from "@/lib/theme";
import { SkeletonRow } from "@/components/Skeleton";
import { haptics } from "@/lib/haptics";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  referenceId?: string;
}

function typeEmoji(type: string) {
  if (type === "match") return "💚";
  if (type === "message") return "💬";
  if (type === "booking") return "📅";
  return "🔔";
}

function typeBg(type: string, c: ThemeColors) {
  if (type === "match") return c.successLight;
  if (type === "message") return c.primaryLight;
  if (type === "booking") return c.warningLight;
  return c.muted;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>("/api/notifications");
      setNotifications(data);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  function navigateFor(n: Notification) {
    try {
      if (n.type === "match") {
        router.push("/(tabs)/matches");
      } else if (n.type === "message") {
        if (n.referenceId) {
          router.push(`/chat/${n.referenceId}`);
        } else {
          router.push("/(tabs)/matches");
        }
      } else if (n.type === "booking" || n.type === "booking_update") {
        router.push("/(tabs)/profile");
      }
    } catch {
      // bad referenceId or route — never crash on navigation
    }
  }

  async function markRead(id: string) {
    try {
      await api.put(`/api/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  }

  function onNotificationPress(n: Notification) {
    haptics.selection();
    if (!n.read) markRead(n.id);
    navigateFor(n);
  }

  async function markAllRead() {
    haptics.light();
    try {
      await api.put("/api/notifications/read-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  const unread = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Loading…</Text>
          </View>
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unread > 0 ? `${unread} unread` : "All caught up"}</Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>Matches, messages, and bookings will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, !item.read && styles.itemUnread]}
              onPress={() => onNotificationPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: typeBg(item.type, colors) }]}>
                <Text style={styles.iconEmoji}>{typeEmoji(item.type)}</Text>
              </View>
              <View style={styles.content}>
                <View style={styles.contentHeader}>
                  <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  skeletonList: { paddingHorizontal: 4, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  title: { fontSize: 24, fontWeight: "800", color: c.foreground },
  subtitle: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: c.muted,
    borderRadius: 8,
  },
  markAllText: { fontSize: 12, fontWeight: "700", color: c.mutedForeground },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: c.background,
  },
  itemUnread: {
    backgroundColor: c.primaryLight + "66",
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
    paddingHorizontal: 17,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 20 },
  content: { flex: 1 },
  contentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: c.foregroundSecondary, flex: 1 },
  itemTitleUnread: { color: c.foreground, fontWeight: "700" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary, marginLeft: 6, flexShrink: 0 },
  itemBody: { fontSize: 13, color: c.mutedForeground, lineHeight: 18 },
  itemTime: { fontSize: 11, color: c.mutedForeground, marginTop: 4, opacity: 0.7 },
  separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 78 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: c.foreground },
  emptySub: { fontSize: 14, color: c.mutedForeground, textAlign: "center", lineHeight: 20 },
});
