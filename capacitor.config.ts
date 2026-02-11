import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pocketlancer.app",
  appName: "Pocket Lancer",
  webDir: "www",

  server: {
    url: "https://www.pocketlancer.org",
    cleartext: true,
  },
};

export default config;
