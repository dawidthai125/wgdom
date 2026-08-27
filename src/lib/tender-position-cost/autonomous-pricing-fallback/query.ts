/**
 * Build APF research query from an OfferBoq-like line (no CatalogWork required).
 */

import type { ApfCatalogBasis, ApfResearchQuery } from "./types";

export type ApfLineLike = {
  lineId?: string | null;
  id?: string | null;
  lp?: string | null;
  description?: string | null;
  unit?: string | null;
  quantity?: number | null;
  catalogWorkId?: string | null;
  catalogBasis?: ApfCatalogBasis | null;
  knrHint?: string | null;
};

function parseCatalogBasisFromHint(
  knrHint: string | null | undefined,
): ApfCatalogBasis | null {
  const raw = String(knrHint ?? "").trim();
  if (!raw) return null;
  const m = raw.match(
    /\b(KNR|KNNR)\s*([0-9]+(?:-[0-9]+)?)\s+([0-9]{3,5}-[0-9]{2})\b/i,
  );
  if (!m) {
    return { rawCode: raw, normalizedKey: raw.toUpperCase() };
  }
  const family = m[1]!.toUpperCase();
  const catalogId = m[2]!;
  const tableCode = m[3]!;
  return {
    family,
    catalogId,
    tableCode,
    rawCode: raw,
    normalizedKey: `${family}|${catalogId}|${tableCode}`,
  };
}

export function buildApfResearchQuery(input: {
  tenderId: string;
  dwellingId?: string | null;
  line: ApfLineLike;
}): ApfResearchQuery {
  const line = input.line;
  const lineId = String(line.lineId ?? line.id ?? "").trim();
  const description = String(line.description ?? "").trim();
  const unit = String(line.unit ?? "").trim();
  const fromLine = line.catalogBasis ?? null;
  const fromHint = parseCatalogBasisFromHint(line.knrHint);
  const catalogBasis =
    fromLine?.normalizedKey || fromLine?.tableCode ? fromLine : fromHint;

  return {
    tenderId: String(input.tenderId ?? "").trim(),
    dwellingId: input.dwellingId ?? null,
    lineId,
    lp: line.lp ?? null,
    description,
    unit,
    quantity:
      typeof line.quantity === "number" && Number.isFinite(line.quantity)
        ? line.quantity
        : null,
    catalogBasis,
  };
}

/** Distinct research key — prevents silent merge of 1205-05 vs 1205-06. */
export function apfDistinctIdentityKey(query: ApfResearchQuery): string {
  const basis = query.catalogBasis;
  if (basis?.normalizedKey) return String(basis.normalizedKey);
  if (basis?.family && basis?.catalogId && basis?.tableCode) {
    return `${basis.family}|${basis.catalogId}|${basis.tableCode}`;
  }
  if (basis?.tableCode) return `TABLE|${basis.tableCode}`;
  return `DESC|${query.unit}|${query.description}`.slice(0, 160);
}
