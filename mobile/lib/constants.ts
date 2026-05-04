import { Platform } from "react-native";
import Constants from "expo-constants";

// For Expo Go on physical device, set apiUrl in app.json extras or use your machine's local IP
export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  (Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001");

export const Colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryLight: "#dbeafe",
  primaryForeground: "#ffffff",
  background: "#ffffff",
  surface: "#f8fafc",
  card: "#ffffff",
  cardBorder: "#e8edf5",
  foreground: "#0f172a",
  foregroundSecondary: "#334155",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  border: "#e2e8f0",
  destructive: "#ef4444",
  destructiveLight: "#fee2e2",
  success: "#22c55e",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  like: "#22c55e",
  pass: "#ef4444",
  overlay: "rgba(0,0,0,0.5)",
  shadowColor: "#1e3a8a",
};
