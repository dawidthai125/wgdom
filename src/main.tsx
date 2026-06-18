import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Analytics } from "@vercel/analytics/react";
import "@/lib/cloud-sync";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./lib/pwa-install";
import { initNativeShell, isNativeApp } from "./lib/capacitor-native";
import { initMobileKeyboard } from "./lib/mobile-keyboard";
import { initAppViewport } from "./lib/app-viewport";
import { initDeepLinks } from "./lib/deep-link";
import { AppUpdateBanner } from "./app/AppUpdateBanner";

registerServiceWorker();
void initNativeShell();
initMobileKeyboard();
initAppViewport();
initDeepLinks();

createRoot(document.getElementById("root")!).render(
  <>
    <AppUpdateBanner />
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {!isNativeApp() && <Analytics />}
  </>,
);