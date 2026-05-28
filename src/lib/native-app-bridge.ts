import { Capacitor } from "@capacitor/core";

/** Zwraca true, gdy obsłużono (np. zamknięto modal). */
export type NativeBackHandler = () => boolean;
export type NativeResumeHandler = () => void;

const backHandlers: NativeBackHandler[] = [];
const resumeHandlers: NativeResumeHandler[] = [];
let bridgeReady = false;

export function registerNativeBackHandler(handler: NativeBackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const i = backHandlers.indexOf(handler);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

export function onNativeAppResume(handler: NativeResumeHandler): () => void {
  resumeHandlers.push(handler);
  return () => {
    const i = resumeHandlers.indexOf(handler);
    if (i >= 0) resumeHandlers.splice(i, 1);
  };
}

function dispatchBack(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    if (backHandlers[i]()) return true;
  }
  return false;
}

function dispatchResume() {
  resumeHandlers.forEach((h) => {
    try {
      h();
    } catch {
      /* ignore */
    }
  });
}

/** Przycisk Wstecz (Android) + wznowienie apki — tylko Capacitor. */
export async function initNativeAppBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform() || bridgeReady) return;
  bridgeReady = true;

  try {
    const { App } = await import("@capacitor/app");

    App.addListener("backButton", () => {
      if (!dispatchBack()) {
        void App.minimizeApp();
      }
    });

    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) dispatchResume();
    });
  } catch {
    bridgeReady = false;
  }
}
