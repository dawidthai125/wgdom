import type { CapacitorConfig } from "@capacitor/cli";

/** Produkcja: apka ładuje zawsze świeży UI z Vercel. Dev: CAPACITOR_SERVER_URL=http://10.0.2.2:5173 */
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://wgdom.fun";

const config: CapacitorConfig = {
  appId: "fun.wgdom.app",
  appName: "W&G DOM",
  webDir: "dist",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f1419",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0f1419",
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f1419",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#344254",
    },
  },
};

export default config;
