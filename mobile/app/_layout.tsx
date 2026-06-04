import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <FavoritesProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(agent-portal)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="chat/[matchId]" options={{ headerShown: true, title: "Chat", headerBackTitle: "Back" }} />
            <Stack.Screen name="agent/[agentId]" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="booking/[agentId]" options={{ presentation: "modal", headerShown: true, title: "Book Consultation", headerBackTitle: "Back" }} />
            <Stack.Screen name="saved" options={{ headerShown: true, title: "Saved Agents", headerBackTitle: "Back" }} />
            <Stack.Screen name="compare" options={{ headerShown: true, title: "Compare Agents", headerBackTitle: "Back" }} />
            <Stack.Screen name="privacy-policy" options={{ headerShown: true, title: "Privacy Policy", headerBackTitle: "Back" }} />
            <Stack.Screen name="terms" options={{ headerShown: true, title: "Terms of Service", headerBackTitle: "Back" }} />
            <Stack.Screen name="mortgage-calculator" options={{ headerShown: true, title: "Mortgage Calculator", headerBackTitle: "Back" }} />
            <Stack.Screen name="review/[bookingId]" options={{ headerShown: true, title: "Leave a Review", headerBackTitle: "Back" }} />
          </Stack>
        </FavoritesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
