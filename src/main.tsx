import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "@/lib/cloud-sync";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./lib/pwa-install";
import { initNativeShell, isNativeApp } from "./lib/capacitor-native";
import { initMobileKeyboard } from "./lib/mobile-keyboard";
import { initAppViewport } from "./lib/app-viewport";
import { initDeepLinks } from "./lib/deep-link";

/** Stare aliasy Vercel (wgdom*.vercel.app) — przekieruj na www.wgdom.fun (zakładki / PWA). */
if (typeof window !== "undefined" && import.meta.env.PROD) {
  const host = window.location.hostname;
  const isWgdomLegacyVercel =
    host.endsWith(".vercel.app") &&
    (host === "wgdom.vercel.app" || host.startsWith("wgdom-") || host.startsWith("wgdom."));
  if (isWgdomLegacyVercel) {
    const next = new URL(window.location.href);
    next.hostname = "www.wgdom.fun";
    next.protocol = "https:";
    window.location.replace(next.toString());
  }
}

registerServiceWorker();
void initNativeShell();
initMobileKeyboard();
initAppViewport();
initDeepLinks();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    {!isNativeApp() && <Analytics />}
  </>,
);