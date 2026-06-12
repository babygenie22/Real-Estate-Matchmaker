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

/**
 * Design tokens — the single source of truth for typography, spacing, radius
 * and elevation. Screens should compose from these instead of hardcoding
 * values, so the look stays consistent and can be tuned globally.
 */
export const Type = {
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "700" as const },
  h3: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const },
  small: { fontSize: 14, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, pill: 999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

/** Minimum touch target per iOS HIG (44pt). */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
