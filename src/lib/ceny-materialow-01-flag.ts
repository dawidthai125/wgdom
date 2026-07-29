/**
 * CENY-MATERIAŁÓW-01 — Feature flag (mapping uplift + memo + KPI path).
 * DF: default OFF · LS `kw-ceny-materialow-01` · IC-1 izolacja OFF.
 */

export const CENY_MATERIALOW_01_DEFAULT = false;

export const CENY_MATERIALOW_01_LS_KEY = "kw-ceny-materialow-01";

/** Alias nazwy z DF. */
export const CENY_MATERIALOW_01 = CENY_MATERIALOW_01_DEFAULT;

let cenyMaterialow01ForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceCenyMaterialow01ForTests(on: boolean | null): void {
  cenyMaterialow01ForTests = on;
}

/**
 * Czy Phase 1 uplift mapowania / memo market average / ścieżka KPI jest włączona.
 * OFF ⇒ tip parity (brak zmian scoringu mapowania).
 */
export function isCenyMaterialow01Enabled(): boolean {
  if (cenyMaterialow01ForTests != null) return cenyMaterialow01ForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(CENY_MATERIALOW_01_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return CENY_MATERIALOW_01_DEFAULT;
}
