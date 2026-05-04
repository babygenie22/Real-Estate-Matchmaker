import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="chat/[matchId]" options={{ headerShown: true, title: "Chat", headerBackTitle: "Back" }} />
          <Stack.Screen name="agent/[agentId]" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="booking/[agentId]" options={{ presentation: "modal", headerShown: true, title: "Book Consultation", headerBackTitle: "Back" }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
