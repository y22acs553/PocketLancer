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
      // Android: requires fine location permission
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },

  android: {
    // Minimum SDK 24 = Android 7.0
    minWebViewVersion: 60,
    allowMixedContent: false,
    captureInput: true,
    // Prevents white flash on launch
    backgroundColor: "#0f172a",
  },

  ios: {
    contentInset: "automatic",
  },
};

export default config;
