/**
 * Przetargi V4 — feature flag routingu URL.
 * true (prod) = lista → `/przetargi/:id/:tab` (SSOT).
 * false = legacy accordion + TenderDetailPanelHosted (rollback only — deprecated TEUX-7f).
 * SSOT: docs/architecture/NG-06-TEUX-HOSTED-DEPRECATION.md
 */
export const TENDERS_V4_ROUTING = true;
