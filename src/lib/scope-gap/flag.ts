/**
 * Scope Gap MVP — feature flag (UI only, default OFF).
 * DF: SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01 · LS `kw-scope-gap-mvp`.
 */

export const SCOPE_GAP_MVP_DEFAULT = false;

export const SCOPE_GAP_MVP_LS_KEY = "kw-scope-gap-mvp";

/** Alias nazwy z DF. */
export const SCOPE_GAP_MVP = SCOPE_GAP_MVP_DEFAULT;

let scopeGapMvpForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceScopeGapMvpForTests(on: boolean | null): void {
  scopeGapMvpForTests = on;
}

/**
 * Czy UI Scope Gap MVP jest włączone.
 * OFF ⇒ tip parity (brak panelu). Nie zmienia AI-COST / Bid / Quotes / History.
 */
export function isScopeGapMvpEnabled(): boolean {
  if (scopeGapMvpForTests != null) return scopeGapMvpForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(SCOPE_GAP_MVP_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return SCOPE_GAP_MVP_DEFAULT;
}

/** Pure — czy renderować panel (flag + report obecny). */
export function shouldRenderScopeGapPanel(
  flagOn: boolean,
  report: { available: boolean } | null | undefined,
): boolean {
  if (!flagOn) return false;
  return report != null;
}
