/**
 * Confidence MVP — feature flag (UI only, default OFF).
 * DF: CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01 · LS `kw-confidence-mvp`.
 */

export const CONFIDENCE_MVP_DEFAULT = false;

export const CONFIDENCE_MVP_LS_KEY = "kw-confidence-mvp";

/** Alias nazwy z DF. */
export const CONFIDENCE_MVP = CONFIDENCE_MVP_DEFAULT;

let confidenceMvpForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceConfidenceMvpForTests(on: boolean | null): void {
  confidenceMvpForTests = on;
}

/**
 * Czy UI Confidence MVP jest włączone.
 * OFF ⇒ tip parity (brak badge). Nie zmienia AI-COST / Bid / SMART.
 */
export function isConfidenceMvpEnabled(): boolean {
  if (confidenceMvpForTests != null) return confidenceMvpForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(CONFIDENCE_MVP_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return CONFIDENCE_MVP_DEFAULT;
}

/** Pure — czy renderować badge (flag + report available lub empty reason). */
export function shouldRenderConfidenceBadge(
  flagOn: boolean,
  report: { available: boolean } | null | undefined,
): boolean {
  if (!flagOn) return false;
  return report != null;
}
