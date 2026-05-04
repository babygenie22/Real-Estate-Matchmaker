import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import { api } from "@/lib/api";
import { Colors } from "@/lib/constants";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

function typeEmoji(type: string) {
  if (type === "match") return "💚";
  if (type === "message") return "💬";
  if (type === "booking") return "📅";
  return "🔔";
}

function typeBg(type: string) {
  if (type === "match") return "#dcfce7";
  if (type === "message") return "#dbeafe";
  if (type === "booking") return "#fef3c7";
  return Colors.muted;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function markRead(id: string) {
    try {
      await api.put(`/api/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.put("/api/notifications/read-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  const unread = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, !item.read && styles.itemUnread]}
              onPress={() => !item.read && markRead(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: typeBg(item.type) }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: { fontSize: 24, fontWeight: "800", color: Colors.foreground },
  subtitle: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.muted,
    borderRadius: 8,
  },
  markAllText: { fontSize: 12, fontWeight: "700", color: Colors.mutedForeground },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: Colors.background,
  },
  itemUnread: { backgroundColor: "#f0f6ff" },
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
  itemTitle: { fontSize: 14, fontWeight: "600", color: Colors.foregroundSecondary, flex: 1 },
  itemTitleUnread: { color: Colors.foreground, fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 6, flexShrink: 0 },
  itemBody: { fontSize: 13, color: Colors.mutedForeground, lineHeight: 18 },
  itemTime: { fontSize: 11, color: Colors.mutedForeground, marginTop: 4, opacity: 0.7 },
  separator: { height: 1, backgroundColor: Colors.cardBorder, marginLeft: 78 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: Colors.foreground },
  emptySub: { fontSize: 14, color: Colors.mutedForeground, textAlign: "center", lineHeight: 20 },
});
