/* PAYROLL-P0-REGRESSION-06 — MUST be first: patch LS before any setItem/getItem */
import { installPayrollKwWeekEmployeesStorageTrace } from "@/lib/payroll-kw-week-employees-storage-trace";
installPayrollKwWeekEmployeesStorageTrace();

/* PAYROLL-P0-RCA-07 — boot path A vs B */
import "@/lib/payroll-boot-path-trace";

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

registerServiceWorker();
void initNativeShell();
initMobileKeyboard();
initModalScrollLock();
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
