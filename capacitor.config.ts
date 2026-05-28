import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Domyślnie: UI z https://wgdom.fun (aktualizacje bez sklepu).
 * CAPACITOR_SERVER_URL=http://10.0.2.2:5173 — dev w WebView.
 * CAPACITOR_USE_BUNDLE=1 — lokalny dist z dist/ (offline shell, bez remote URL).
 */
const useBundle = process.env.CAPACITOR_USE_BUNDLE === "1";
const serverUrl = useBundle
  ? undefined
  : (process.env.CAPACITOR_SERVER_URL || "https://wgdom.fun");

const config: CapacitorConfig = {
  appId: "fun.wgdom.app",
  appName: "W&G DOM",
  webDir: "dist",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          androidScheme: "https",
          /** Gdy brak sieci — strona offline zamiast pustego WebView */
          errorPath: "offline.html",
        },
      }
    : {}),
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
