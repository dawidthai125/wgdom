/**
 * MULTI-DWELLING-01 — shared constants (local-only · no Cloud).
 */

/** Legacy / absent dwellingId normalizes to this stable unit id. */
export const DEFAULT_DWELLING_ID = "default" as const;

export const MULTI_DWELLING_PACKAGE_LS_KEY = "kw-multi-dwelling-package-v1";

/** Same-tab invalidation for Bid/ownerFinanceProposal after package upsert (CONNECT). */
export const MULTI_DWELLING_PACKAGE_CHANGED_EVENT =
  "wgdom:multi-dwelling-package-changed";

export const MULTI_DWELLING_PACKAGE_SCHEMA_VERSION = 1 as const;

export function normalizeDwellingId(raw?: string | null): string {
  const t = String(raw ?? "").trim();
  return t || DEFAULT_DWELLING_ID;
}
