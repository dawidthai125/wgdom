import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Analytics } from "@vercel/analytics/react";
import "@/lib/cloud-sync";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./lib/pwa-install";
import { initNativeShell, isNativeApp } from "./lib/capacitor-native";
import { initMobileKeyboard } from "./lib/mobile-keyboard";
import { initModalScrollLock } from "./lib/modal-scroll-lock";
import { initAppViewport } from "./lib/app-viewport";
import { initDeepLinks } from "./lib/deep-link";
import { AppUpdateBanner } from "./app/AppUpdateBanner";
import { PayrollRcbDebugOverlay } from "./app/PayrollRcbDebugOverlay";
import { isPayrollRcbDebugOverlayEnabled, PAYROLL_RCB_DEBUG_LS_KEY } from "@/lib/payroll-rcb-debug-overlay";

/** RC-B live repro — włącz: localStorage.setItem('wgdom-payroll-rcb-debug','1') · wyłącz: removeItem */
if (localStorage.getItem(PAYROLL_RCB_DEBUG_LS_KEY) === "1") {
  (globalThis as { __wgdomPayrollPipelineDebug?: boolean }).__wgdomPayrollPipelineDebug = true;
}

registerServiceWorker();
void initNativeShell();
initMobileKeyboard();
initModalScrollLock();
initAppViewport();
initDeepLinks();

createRoot(document.getElementById("root")!).render(
  <>
    <AppUpdateBanner />
    {isPayrollRcbDebugOverlayEnabled() ? <PayrollRcbDebugOverlay /> : null}
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {!isNativeApp() && <Analytics />}
  </>,
);