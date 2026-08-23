/**
 * W5-3 — Owner action freshness token (read-model invalidation only).
 * REUSE: buildOwnerInputRefreshKey · pricingCatalogRevision · no new store.
 */

import { buildOwnerInputRefreshKey } from "./ik-f5-package-refresh";

/**
 * Deterministic key — when this changes, W4 read models must recompute.
 */
export function buildIkOwnerActionFreshnessKey(
  tenderId: string,
  pricingCatalogRevision = 0,
): string {
  const tid = String(tenderId ?? "").trim();
  if (!tid) return "empty";
  const oiKey = buildOwnerInputRefreshKey(tid);
  return `${tid}|pcr:${pricingCatalogRevision}|${oiKey}`;
}
