/**
 * Haptics-ready wrapper. expo-haptics is a native module that isn't compiled
 * into the current dev build (and haptics don't fire on the simulator anyway),
 * so this degrades to a no-op. When expo-haptics is added to the native build,
 * swap the no-op bodies for the real calls — no call sites need to change.
 *
 * Usage: haptics.light() on swipe, haptics.success() on match, etc.
 */

let Haptics: any = null;
try {
  // Loaded lazily so a missing native module never crashes the bundle.
  Haptics = require("expo-haptics");
} catch {
  Haptics = null;
}

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // ignore — haptics are best-effort
  }
}

export const haptics = {
  light() {
    if (Haptics) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium() {
    if (Haptics) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  heavy() {
    if (Haptics) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  success() {
    if (Haptics) safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    if (Haptics) safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  selection() {
    if (Haptics) safe(() => Haptics.selectionAsync());
  },
};
