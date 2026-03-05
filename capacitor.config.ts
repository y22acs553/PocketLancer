// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pocketlancer.app",
  appName: "Pocket Lancer",
  webDir: "out", // Next.js static export dir

  server: {
    url: "https://www.pocketlancer.org",
    cleartext: false, // HTTPS only in production
  },

  plugins: {
    Geolocation: {
      // Android: requires fine location permission (declared in AndroidManifest)
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#F8FAFC", // slate-50 — light mode (was #0f172a dark)
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // "Dark" = dark-colored icons/text on status bar — correct for light backgrounds
      style: "Dark",
      backgroundColor: "#F8FAFC", // slate-50 — light background (was #0f172a dark)
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },

  android: {
    minWebViewVersion: 60,
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: "#F8FAFC", // slate-50 — prevents dark flash on launch (was #0f172a)
  },

  ios: {
    contentInset: "automatic",
  },
};

export default config;
