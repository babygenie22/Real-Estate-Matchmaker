import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import {
  configureNotificationHandler,
  registerForPushNotifications,
  addNotificationTapListener,
  NotificationData,
} from "@/lib/notifications";

/**
 * Headless manager: configures the foreground notification handler, registers
 * the device for push once a user is logged in, and routes notification taps
 * to the right screen. Renders nothing.
 */
export function NotificationManager() {
  const router = useRouter();
  const { user } = useAuth();

  // Configure foreground behaviour once.
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Register for push whenever we have a logged-in user.
  useEffect(() => {
    if (user) registerForPushNotifications();
  }, [user]);

  // Route taps. Mirrors the in-app notifications-screen routing.
  useEffect(() => {
    const unsubscribe = addNotificationTapListener((data: NotificationData) => {
      try {
        switch (data.type) {
          case "message":
            router.push(data.referenceId ? `/chat/${data.referenceId}` : "/(tabs)/matches");
            break;
          case "match":
            router.push("/(tabs)/matches");
            break;
          case "booking":
          case "booking_update":
            router.push("/(tabs)/profile");
            break;
          default:
            router.push("/(tabs)/notifications");
        }
      } catch {
        /* bad payload — ignore */
      }
    });
    return unsubscribe;
  }, [router]);

  return null;
}
