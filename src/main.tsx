import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./lib/pwa-install";
import { initNativeShell, isNativeApp } from "./lib/capacitor-native";
import { initMobileKeyboard } from "./lib/mobile-keyboard";

registerServiceWorker();
void initNativeShell();
initMobileKeyboard();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    {!isNativeApp() && <Analytics />}
  </>,
);