// client/hooks/usePushNotifications.ts
import { useEffect, useRef } from "react";
import { useUser } from "@/context/UserContext";

export function usePushNotifications() {
  const { user, loading } = useUser();
  // ✅ Track whether setup has already run for this user session so we never
  // call register() or addListener() twice (e.g. if loading flickers).
  const setupDoneRef = useRef(false);

  useEffect(() => {
    // Don't run until auth state is resolved and user is logged in
    if (loading || !user) {
      setupDoneRef.current = false; // reset when logged out
      return;
    }

    // Don't run setup twice for the same user session
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;

    const setup = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } =
          await import("@capacitor/push-notifications");
        const { default: api } = await import("@/services/api");

        // ✅ Remove any stale listeners from a previous session BEFORE adding
        // new ones — prevents duplicate handlers accumulating across re-renders.
        await PushNotifications.removeAllListeners();

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          console.log("[FCM] Push permission denied");
          return;
        }

        await PushNotifications.register();

        let registered = false;

        // Token received from FCM — save to server
        await PushNotifications.addListener("registration", async (token) => {
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
            console.error(
              "[FCM] Failed to register token on server:",
              err?.response?.status,
              err?.response?.data,
              err?.message,
            );
          }
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", JSON.stringify(err));
        });

        // Foreground notification — socket already handles UI, just log
        await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[FCM] Foreground notification:", notification.title);
          },
        );

        // ✅ CRASH FIX: User tapped a notification (app was closed/background).
        // The old code did `window.location.href = link` immediately, which fired
        // during app launch before the app was ready, causing a freeze/crash.
        // Now we delay navigation by 500ms to let the app fully initialize first.
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const link: string = action.notification?.data?.link;
            if (!link || typeof window === "undefined") return;

            // Small delay ensures the React tree and router are mounted before
            // we navigate — prevents crash when notification is tapped cold-start
            setTimeout(() => {
              window.location.href = link;
            }, 500);
          },
        );
      } catch (err: any) {
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

    // Cleanup only on unmount — avoids tearing down listeners while async
    // setup is still in flight on dep changes
    return () => {
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {});
    };
  }, [user?._id, loading]); // eslint-disable-line
}
