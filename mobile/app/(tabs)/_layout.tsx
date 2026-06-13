import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function TabIcon({ emoji, focused, badge }: { emoji: string; focused: boolean; badge?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {focused ? (
        <View style={{ backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 20, opacity: 0.45 }}>{emoji}</Text>
      )}
      {badge != null && badge > 0 && (
        <View style={{
          position: "absolute",
          top: -4,
          right: -8,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.destructive,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [unread, setUnread] = useState<number | undefined>(undefined);
  const [matchCount, setMatchCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function poll() {
      try {
        const [notifications, matches] = await Promise.all([
          api.get<any[]>("/api/notifications"),
          api.get<any[]>("/api/matches"),
        ]);
        if (!cancelled) {
          const unreadCount = notifications.filter((n: any) => !n.read).length;
          setUnread(unreadCount > 0 ? unreadCount : undefined);
          setMatchCount(matches.length > 0 ? matches.length : undefined);
        }
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          borderTopColor: colors.cardBorder,
          backgroundColor: colors.background,
          paddingBottom: 8,
          paddingTop: 4,
          height: 68,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600", letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Browse", tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarBadge: matchCount,
          tabBarIcon: ({ focused }) => <TabIcon emoji="💚" focused={focused} badge={matchCount} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarBadge: unread,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} badge={unread} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />, href: null }}
      />
    </Tabs>
  );
}
