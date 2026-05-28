import { Capacitor } from "@capacitor/core";
import { initNativeAppBridge } from "./native-app-bridge";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Status bar, splash, most natywny — tylko w skorupie Capacitor. */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  void initNativeAppBridge();

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#344254" });
    }
  } catch {
    /* plugin niedostępny */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* plugin niedostępny */
  }
}
