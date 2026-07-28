/**
 * Przetargi V4 — feature flag routingu URL.
 * true (prod) = lista → `/przetargi/:id/:tab` (SSOT).
 * false = legacy accordion + TenderDetailPanelHosted (rollback only — deprecated TEUX-7f).
 * SSOT: docs/architecture/NG-06-TEUX-HOSTED-DEPRECATION.md
 */
export const TENDERS_V4_ROUTING = true;

/**
 * TRE-01 / TRE-02 — Outcome-first default (Offer Run + Recommendation Result).
 * TRE-02 DF: default ON (Outcome First Experience).
 * R0 rollback: localStorage `kw-tre-01-slice-a` = `0` → Hub-first (bez redeployu silników).
 * Override: `1` = ON · `0` = OFF · brak klucza → default tip.
 */
export const TRE_01_SLICE_A_DEFAULT = true;

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

/**
 * COST-PIPELINE-01 — OfferBoq (L1) → Bid (L2) jako SSOT Outcome.
 * Default ON. R0 rollback: localStorage `kw-cost-pipeline-01` = `0` → catalog Bid (pre-wire).
 */
export const COST_PIPELINE_01_DEFAULT = true;

export const COST_PIPELINE_01_LS_KEY = "kw-cost-pipeline-01";

/** Czy runtime Outcome używa OfferBoq → Bid (S6), nie catalog. */
export function isCostPipeline01Enabled(): boolean {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(COST_PIPELINE_01_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return COST_PIPELINE_01_DEFAULT;
}
