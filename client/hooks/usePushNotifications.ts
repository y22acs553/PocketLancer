// client/hooks/usePushNotifications.ts
//
// Registers for FCM push notifications via @capacitor/push-notifications.
// Called once from providers.tsx on every app launch.
//
// ✅ Safe for Next.js web builds — all Capacitor imports are dynamic
//    so the web/Vercel build never tries to resolve native packages.
// ✅ No-op on web — only activates inside the real Android/iOS app.

import { useEffect } from "react";

export function usePushNotifications() {
  useEffect(() => {
    // Dynamic import so Next.js web build never touches Capacitor packages
    const setup = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");

        // Only run inside the native Capacitor app
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } =
          await import("@capacitor/push-notifications");
        const { default: api } = await import("@/services/api");

        // 1. Request permission
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          console.log("[FCM] Push permission denied");
          return;
        }

        // 2. Register with FCM
        await PushNotifications.register();

        let registered = false;

        // 3. Send token to server on successful registration
        PushNotifications.addListener("registration", async (token) => {
          if (registered) return;
          registered = true;
          console.log("[FCM] Token received");
          try {
            await api.post("/notifications/register-token", {
              fcmToken: token.value,
              platform: Capacitor.getPlatform(), // "android" | "ios"
            });
          } catch (err) {
            console.error("[FCM] Failed to register token on server:", err);
          }
        });

        // 4. Registration error
        PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", err);
        });

        // 5. Foreground — socket.io already handles this, just log
        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[FCM] Foreground notification:", notification.title);
          },
        );

        // 6. User tapped notification (app was closed/background)
        //    Navigate to the deep-link sent in notification.data.link
        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const link = action.notification?.data?.link;
            if (link && typeof window !== "undefined") {
              window.location.href = link;
            }
          },
        );
      } catch (err) {
        // Capacitor packages not available (web environment) — ignore silently
        console.log("[FCM] Not running in native app, push skipped");
      }
    };

    setup();

    return () => {
      // Clean up listeners — also dynamic to avoid web build issues
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {});
    };
  }, []);
}
