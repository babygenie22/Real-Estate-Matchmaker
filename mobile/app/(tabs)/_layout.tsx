import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { Colors } from "@/lib/constants";
import { api } from "@/lib/api";

function TabIcon({ emoji, focused, badge }: { emoji: string; focused: boolean; badge?: number }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: focused ? 24 : 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
      {badge != null && badge > 0 && (
        <View style={{
          position: "absolute",
          top: -4,
          right: -8,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: Colors.destructive,
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
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await api.get<any[]>("/api/notifications");
        if (!cancelled) setUnread(data.filter((n: any) => !n.read).length);
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
        tabBarStyle: {
          borderTopColor: Colors.cardBorder,
          backgroundColor: Colors.background,
          paddingBottom: 6,
          paddingTop: 4,
          height: 64,
          shadowColor: Colors.shadowColor,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: "Matches", tabBarIcon: ({ focused }) => <TabIcon emoji="💚" focused={focused} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Alerts", tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} badge={unread} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
