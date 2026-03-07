// client/hooks/usePushNotifications.ts
import { useEffect } from "react";
import { useUser } from "@/context/UserContext"; // ← ADD

export function usePushNotifications() {
  const { user, loading } = useUser(); // ← ADD

  useEffect(() => {
    // ✅ Don't run until we know auth state — avoids 401 on token registration
    if (loading || !user) return;

    const setup = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } =
          await import("@capacitor/push-notifications");
        const { default: api } = await import("@/services/api");

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          console.log("[FCM] Push permission denied");
          return;
        }

        await PushNotifications.register();

        let registered = false;

        PushNotifications.addListener("registration", async (token) => {
          if (registered) return;
          registered = true;
          console.log("[FCM] Token received, registering for user:", user._id);
          try {
            await api.post("/notifications/register-token", {
              fcmToken: token.value,
              platform: Capacitor.getPlatform(),
            });
            console.log("[FCM] Token saved to server ✓");
          } catch (err) {
            console.error("[FCM] Failed to register token on server:", err);
          }
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", err);
        });

        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[FCM] Foreground notification:", notification.title);
          },
        );

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
        console.log("[FCM] Not running in native app, push skipped");
      }
    };

    setup();

    return () => {
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {});
    };
  }, [user?._id, loading]); // ✅ Re-runs when user logs in, no-op when logged out
}
