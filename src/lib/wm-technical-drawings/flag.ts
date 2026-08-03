/** WM-RYSUNKI-01 P0 — feature flag UI-only (MR-03: NIE w DATA_KEYS). */

export const WM_RYSUNKI_01_DEFAULT = false;

export const WM_RYSUNKI_01_LS_KEY = "kw-wm-rysunki-01";

let wmRysunki01ForTests: boolean | null = null;

export function forceWmRysunki01ForTests(on: boolean | null): void {
  wmRysunki01ForTests = on;
}

/** Czy zakładka Rysunki jest widoczna / aktywna. */
export function isWmRysunki01Enabled(): boolean {
  if (wmRysunki01ForTests != null) return wmRysunki01ForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(WM_RYSUNKI_01_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return WM_RYSUNKI_01_DEFAULT;
}
