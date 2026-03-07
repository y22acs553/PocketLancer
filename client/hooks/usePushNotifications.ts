// client/hooks/usePushNotifications.ts
import { useEffect } from "react";
import { useUser } from "@/context/UserContext";

export function usePushNotifications() {
  const { user, loading } = useUser();

  useEffect(() => {
    // Don't run until we know auth state — avoids 401 on token registration
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
          } catch (err: any) {
            // ✅ Log the full error so we can see exactly why it failed
            // (e.g. 401 Unauthorized = race condition, network error = wrong API URL)
            console.error(
              "[FCM] Failed to register token on server:",
              err?.response?.status,
              err?.response?.data,
              err?.message,
            );
          }
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", JSON.stringify(err));
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
      } catch (err: any) {
        // ✅ Log the real error instead of the misleading "not running in native app" message.
        // The old catch swallowed all errors with the same message, making it impossible
        // to distinguish "genuinely running on web" from "crashed during setup".
        if (
          err?.message?.toLowerCase().includes("not implemented") ||
          err?.message?.toLowerCase().includes("native")
        ) {
          console.log("[FCM] Not running in native app, push skipped");
        } else {
          console.error(
            "[FCM] Setup failed with unexpected error:",
            err?.message,
            err,
          );
        }
      }
    };

    setup();

    return () => {
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {});
    };
  }, [user?._id, loading]);
}
