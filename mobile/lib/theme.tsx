import React, {
  createContext, useContext, useEffect, useMemo, useState, useCallback,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Colors as LightColors } from "./constants";

/**
 * Theme system. `useTheme()` returns the active palette; styles are built per
 * palette via `makeStyles(c)` factories memoized in each screen. The user can
 * force light/dark/system from Settings — persisted and applied through
 * Appearance.setColorScheme so it works even though the native build defaults
 * to light.
 */

export type ThemeColors = typeof LightColors;

export const DarkColors: ThemeColors = {
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  primaryLight: "#1e3a5f",
  primaryForeground: "#ffffff",
  background: "#0f1729",
  surface: "#0a101f",
  card: "#1a2238",
  cardBorder: "#283452",
  foreground: "#f1f5f9",
  foregroundSecondary: "#cbd5e1",
  muted: "#243049",
  mutedForeground: "#94a3b8",
  border: "#334766",
  destructive: "#f87171",
  destructiveLight: "#451a1a",
  success: "#4ade80",
  successLight: "#143522",
  warning: "#fbbf24",
  warningLight: "#3d2e10",
  like: "#4ade80",
  pass: "#f87171",
  overlay: "rgba(0,0,0,0.6)",
  shadowColor: "#000000",
};

export type ThemePreference = "system" | "light" | "dark";
const THEME_PREF_KEY = "homematch_theme_preference";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  isDark: false,
  preference: "system",
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_PREF_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
          Appearance.setColorScheme(stored === "system" ? null : stored);
        }
      } catch {}
    })();
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    Appearance.setColorScheme(pref === "system" ? null : pref);
    SecureStore.setItemAsync(THEME_PREF_KEY, pref).catch(() => {});
  }, []);

  const isDark =
    preference === "dark" || (preference === "system" && systemScheme === "dark");

  const value = useMemo(
    () => ({
      colors: isDark ? DarkColors : LightColors,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
