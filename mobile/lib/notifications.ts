import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

/**
 * Push + local notification integration.
 *
 * Real remote push (APNs) requires a physical device and an EAS projectId —
 * it cannot work on the iOS Simulator. Every function here degrades gracefully:
 * on the simulator / without a projectId, registration is a safe no-op, while
 * the foreground handler and tap-routing still work (and local notifications,
 * used for demos/tests, work on the simulator too).
 */

let Notifications: any = null;
let Device: any = null;
try {
  Notifications = require("expo-notifications");
  Device = require("expo-device");
} catch {
  Notifications = null;
  Device = null;
}

let handlerConfigured = false;

/** Configure how notifications behave while the app is foregrounded. Call once at startup. */
export function configureNotificationHandler() {
  if (!Notifications || handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // legacy keys for older SDKs
      shouldShowAlert: true,
    }),
  });
}

/**
 * Request permission, obtain the Expo push token, and register it with the
 * backend. Returns the token, or null if unavailable (simulator / denied / no
 * projectId). Never throws.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  try {
    // Push only works on physical devices.
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563eb",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    // Without a projectId, getExpoPushTokenAsync throws — bail cleanly.
    if (!projectId) return null;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse?.data ?? null;
    if (token) {
      try {
        await api.post("/api/push-token", { token });
      } catch {
        // token will be re-sent next launch
      }
    }
    return token;
  } catch {
    return null;
  }
}

/** Type guard for the deep-link payload the backend attaches to pushes. */
export interface NotificationData {
  type?: "match" | "message" | "booking" | "booking_update" | string;
  referenceId?: string;
}

/**
 * Subscribe to notification taps. `onNavigate` receives the parsed data so the
 * caller can route. Returns an unsubscribe function. Safe no-op without the
 * native module.
 */
export function addNotificationTapListener(
  onNavigate: (data: NotificationData) => void
): () => void {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
    const data = (response?.notification?.request?.content?.data ?? {}) as NotificationData;
    onNavigate(data);
  });
  return () => {
    try {
      sub?.remove?.();
    } catch {
      /* ignore */
    }
  };
}

/**
 * Present a local notification immediately. Works on the simulator (no APNs
 * needed) — useful for demoing the foreground handler and tap routing.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
  data?: NotificationData
) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: "default" },
      trigger: null, // fire now
    });
  } catch {
    /* ignore */
  }
}
