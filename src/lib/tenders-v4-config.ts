/**
 * Przetargi V4 — feature flag routingu URL.
 * true (prod) = lista → `/przetargi/:id/:tab` (SSOT).
 * false = legacy accordion + TenderDetailPanelHosted (rollback only — deprecated TEUX-7f).
 * SSOT: docs/architecture/NG-06-TEUX-HOSTED-DEPRECATION.md
 */
export const TENDERS_V4_ROUTING = true;

/**
 * TRE-01 Slice A — Outcome-first default (Offer Run + Recommendation Result).
 * DF: default OFF do PV Ownera; R0 rollback = OFF (bez redeployu silników).
 * Override sesji (bez sync): localStorage `kw-tre-01-slice-a` = `1` | `0`.
 */
export const TRE_01_SLICE_A_DEFAULT = false;

export const TRE_01_SLICE_A_LS_KEY = "kw-tre-01-slice-a";

/** Czy Outcome MVP jest defaultem po otwarciu detalu przetargu. */
export function isTre01SliceAEnabled(): boolean {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(TRE_01_SLICE_A_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return TRE_01_SLICE_A_DEFAULT;
}
