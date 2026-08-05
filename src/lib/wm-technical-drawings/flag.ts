/** WM-RYSUNKI-01 — feature gate UI (P1B: AppSettings SSOT · LS fallback / FORCE OFF / promote). */

import {
  APP_SETTINGS_KEY,
  loadAppSettingsLocal,
  saveAppSettings,
  type AppSettings,
} from "@/lib/app-settings";

export const WM_RYSUNKI_01_DEFAULT = false;

/** Legacy / diagnostyka — nie jest org-SSOT po P1B. */
export const WM_RYSUNKI_01_LS_KEY = "kw-wm-rysunki-01";

let wmRysunki01ForTests: boolean | null = null;
let wmWorkerSketchForTests: boolean | null = null;

export function forceWmRysunki01ForTests(on: boolean | null): void {
  wmRysunki01ForTests = on;
}

export function forceWmWorkerSketchForTests(on: boolean | null): void {
  wmWorkerSketchForTests = on;
}

export type WmRysunkiGateSettings = Pick<AppSettings, "wmRysunkiEnabled">;
export type WmWorkerSketchGateSettings = Pick<AppSettings, "wmWorkerSketchEnabled">;

function readLsRaw(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(WM_RYSUNKI_01_LS_KEY);
  } catch {
    return null;
  }
}

/** Usuń wpis LS po one-shot promote (D-P1B-10). Nie rusza FORCE OFF `"0"`. */
export function clearWmRysunki01LsLegacyOn(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(WM_RYSUNKI_01_LS_KEY);
    if (raw === "1") localStorage.removeItem(WM_RYSUNKI_01_LS_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Gate widoczności taba Rysunki.
 *
 * Kolejność (DF §4 + D-P1B-11):
 * 1. forceWmRysunki01ForTests
 * 2. LS === "0" → FORCE OFF (najwyższy priorytet lokalny)
 * 3. AppSettings (gdy podane) → wmRysunkiEnabled
 * 4. Fallback: LS === "1" → true · else default OFF
 */
export function isWmRysunki01Enabled(settings?: WmRysunkiGateSettings | null): boolean {
  if (wmRysunki01ForTests != null) return wmRysunki01ForTests;

  const ls = readLsRaw();
  if (ls === "0") return false;

  if (settings != null) {
    return settings.wmRysunkiEnabled === true;
  }

  if (ls === "1") return true;
  return WM_RYSUNKI_01_DEFAULT;
}

/**
 * One-shot promote (D-P1B-10 / MR-P1B-01):
 * LS `"1"` → AppSettings.wmRysunkiEnabled=true → usuń LS → dalsza praca tylko na AppSettings.
 * Nie promuje przy FORCE OFF (`"0"`). Idempotentne po usunięciu LS.
 *
 * @returns zaktualizowane settings albo `null` gdy nic nie zrobiono
 */
export async function maybePromoteWmRysunki01FromLs(
  settings: AppSettings,
): Promise<AppSettings | null> {
  const ls = readLsRaw();
  if (ls === "0") return null;
  if (ls !== "1") return null;

  if (settings.wmRysunkiEnabled === true) {
    clearWmRysunki01LsLegacyOn();
    return null;
  }

  const next: AppSettings = { ...settings, wmRysunkiEnabled: true };
  try {
    await saveAppSettings(next);
  } catch {
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }
  clearWmRysunki01LsLegacyOn();
  return next;
}

/** WM-WORKER-SKETCH-01 — Docs → Szkice. Default OFF. Niezależne od wmRysunkiEnabled. */
export function isWmWorkerSketchEnabled(settings?: WmWorkerSketchGateSettings | null): boolean {
  if (wmWorkerSketchForTests != null) return wmWorkerSketchForTests;
  if (settings != null) return settings.wmWorkerSketchEnabled === true;
  return loadAppSettingsLocal().wmWorkerSketchEnabled === true;
}

/** Sync helper — gdy brak React state, odczyt z LS AppSettings (nie preferowane w UI). */
export function isWmRysunki01EnabledFromLocalAppSettings(): boolean {
  return isWmRysunki01Enabled(loadAppSettingsLocal());
}
