/**
 * DEMAND-RESEARCH-01 S3 — OfferBoq / tender line → exactAliasLines.
 * Pure · ZERO fuzzy · ZERO price writes · reuse resolveDemandProductIdentityExact.
 */

import {
  isLaborCatalogWorkBlockedForProductQuotes,
  isProductCatalogWorkId,
} from "@/lib/pricing-expert/material-market-map";

export interface OfferBoqLineForExactAlias {
  description?: string | null;
  normalizedDescription?: string | null;
  unit?: string | null;
  catalogWorkId?: string | null;
  isNoise?: boolean;
}

export interface ExactAliasLineCandidate {
  namePl: string;
  unit: string;
  /** Only product CatalogWork (cw.product.*) — never labor host. */
  catalogWorkId?: string | null;
}

function productCatalogWorkIdOrNull(raw: string | null | undefined): string | null {
  const id = String(raw || "").trim();
  if (!id) return null;
  if (!isProductCatalogWorkId(id)) return null;
  if (isLaborCatalogWorkBlockedForProductQuotes(id)) return null;
  return id;
}

function pushUnique(
  out: ExactAliasLineCandidate[],
  seen: Set<string>,
  namePl: string,
  unit: string,
  catalogWorkId?: string | null,
): void {
  const n = String(namePl || "").trim();
  const u = String(unit || "").trim();
  const cw = productCatalogWorkIdOrNull(catalogWorkId);
  if (!u) return;
  if (!n && !cw) return;
  const key = `${n.toLowerCase()}|${u.toLowerCase()}|${cw ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (cw) {
    out.push({ namePl: n, unit: u, catalogWorkId: cw });
  } else {
    out.push({ namePl: n, unit: u });
  }
}

/**
 * Extract candidate exact name+unit lines from OfferBoq.
 * Identity HIT/MISS is decided only by resolveDemandProductIdentityExact in demand-collect.
 */
export function extractExactAliasLinesFromOfferBoq(
  doc: { lines?: readonly OfferBoqLineForExactAlias[] | null } | null | undefined,
): ExactAliasLineCandidate[] {
  const out: ExactAliasLineCandidate[] = [];
  const seen = new Set<string>();
  for (const line of doc?.lines ?? []) {
    if (line?.isNoise) continue;
    const unit = String(line.unit || "").trim();
    if (!unit) continue;
    const productCw = productCatalogWorkIdOrNull(line.catalogWorkId);
    const desc = String(line.description || "").trim();
    const norm = String(line.normalizedDescription || "").trim();
    if (desc) pushUnique(out, seen, desc, unit, productCw);
    if (norm && norm !== desc) pushUnique(out, seen, norm, unit, productCw);
    // Product CatalogWork alone — reverse path via catalogWorkId in collect.
    if (!desc && !norm && productCw) {
      pushUnique(out, seen, "", unit, productCw);
    }
  }
  return out;
}
