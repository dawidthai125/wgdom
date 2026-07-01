/**
 * NG-04.1 — BOQ Explorer SSOT (Principle #001 · #002 · #003).
 * Jeden merge · search/filter/sort na gotowym ViewModel.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCostLine } from "@/lib/tenders-bzp-swz";
import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import {
  buildCatalogLinePricingView,
  type CatalogLinePricingRow,
} from "@/lib/tender-catalog-line-pricing";
import {
  extractKatalogHintFromDescription,
  resolveEffectiveKosztorysV4CatalogLines,
  resolveTenderPricingCatalogForDisplay,
} from "@/lib/tender-detail-v4-display";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import {
  getTenderPriceOverrides,
  loadTenderPriceOverridesStoreLocal,
  type TenderPriceOverrideEntry,
} from "@/lib/tender-price-overrides";
import {
  lineMatchesConstructionFilter,
  type KosztorysProFilterId,
} from "@/lib/tender-kosztorys-pro-filters";

export interface KosztorysBoqRowViewModel {
  rowKey: string;
  lp: string;
  description: string;
  unit: string;
  quantity: string;
  knrHint: string;
  athUnitPrice: string | null;
  athTotal: string | null;
  athMatched: boolean;
  wgdomUnitPln: number | null;
  wgdomLinePln: number | null;
  wgdomPriced: boolean;
  pricing: CatalogLinePricingRow | null;
  isUnknown: boolean;
  searchText: string;
}

export interface KosztorysBoqExplorerView {
  rows: KosztorysBoqRowViewModel[];
  meta: {
    totalRows: number;
    athPricedCount: number;
    wgdomPricedCount: number;
    hasAthPrices: boolean;
    sourceFilename: string | null;
    catalogSourceLabel: string;
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function foldBoqSearchText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .trim();
}

export function normalizeBoqLp(lp: string | null | undefined): string {
  return (lp ?? "").trim().replace(/\s+/g, "");
}

export function normalizeBoqDescPrefix(description: string, maxLen = 80): string {
  return foldBoqSearchText(description.slice(0, maxLen));
}

function stableRowKey(lp: string, description: string): string {
  const n = normalizeBoqLp(lp);
  if (n) return `lp:${n}`;
  return `desc:${normalizeBoqDescPrefix(description, 120)}`;
}

function wgdomUnitTotal(pricing: CatalogLinePricingRow | null): number | null {
  if (!pricing || pricing.isUnknown) return null;
  const unit = (pricing.materialPlnPerUnit ?? 0) + (pricing.laborPlnPerUnit ?? 0);
  return unit > 0 ? roundMoney(unit) : null;
}

function wgdomLineTotal(pricing: CatalogLinePricingRow | null): number | null {
  if (!pricing || pricing.isUnknown) return null;
  const unit = (pricing.materialPlnPerUnit ?? 0) + (pricing.laborPlnPerUnit ?? 0);
  if (unit <= 0 || pricing.quantity <= 0) return null;
  return roundMoney(pricing.quantity * unit);
}

function buildAthRowIndexes(rows: TenderCostLine[]): {
  byLp: Map<string, TenderCostLine>;
  byDesc: Map<string, TenderCostLine>;
} {
  const byLp = new Map<string, TenderCostLine>();
  const byDesc = new Map<string, TenderCostLine>();
  for (const row of rows) {
    const lpKey = normalizeBoqLp(row.lp);
    if (lpKey && !byLp.has(lpKey)) byLp.set(lpKey, row);
    const descKey = normalizeBoqDescPrefix(row.description ?? "");
    if (descKey && !byDesc.has(descKey)) byDesc.set(descKey, row);
  }
  return { byLp, byDesc };
}

/** SSOT dopasowania catalog line → ATH priced row (lp, potem prefix opisu). */
export function matchAthPricedRow(
  catalogLine: TenderCatalogQuantityLine,
  indexes: { byLp: Map<string, TenderCostLine>; byDesc: Map<string, TenderCostLine> },
): TenderCostLine | null {
  const lpKey = normalizeBoqLp(catalogLine.lp);
  if (lpKey && indexes.byLp.has(lpKey)) return indexes.byLp.get(lpKey)!;
  const descKey = normalizeBoqDescPrefix(catalogLine.description ?? "");
  if (descKey && indexes.byDesc.has(descKey)) return indexes.byDesc.get(descKey)!;
  return null;
}

function buildSearchText(parts: string[]): string {
  return foldBoqSearchText(parts.filter(Boolean).join(" "));
}

function pricingRowByLp(pricingRows: CatalogLinePricingRow[]): Map<string, CatalogLinePricingRow> {
  const map = new Map<string, CatalogLinePricingRow>();
  for (const row of pricingRows) {
    const key = normalizeBoqLp(row.lp);
    if (key && !map.has(key)) map.set(key, row);
  }
  return map;
}

export function buildKosztorysBoqExplorerView(opts: {
  item: TenderPipelineItem;
  priceOverrides?: TenderPriceOverrideEntry[];
}): KosztorysBoqExplorerView {
  const { item } = opts;
  const k = item.tenderDossier?.kosztorys;
  const catalog = resolveEffectiveKosztorysV4CatalogLines(item);
  const priceOverrides = opts.priceOverrides ?? getTenderPriceOverrides(
    loadTenderPriceOverridesStoreLocal(),
    item.id,
  ).overrides;
  const { catalog: pricingCatalog, costModel, catalogSourceLabel } = resolveTenderPricingCatalogForDisplay();
  const pricingView = catalog.length
    ? buildCatalogLinePricingView(catalog, pricingCatalog, costModel, priceOverrides)
    : null;
  const pricingByLp = pricingView ? pricingRowByLp(pricingView.rows) : new Map<string, CatalogLinePricingRow>();
  const athIndexes = buildAthRowIndexes(k?.rows ?? []);
  const costStatus = resolvedCostStatus(item);
  const hasAthPrices = costStatus === "FOUND_WITH_VALUE";

  const rows: KosztorysBoqRowViewModel[] = catalog.map((line) => {
    const ath = matchAthPricedRow(line, athIndexes);
    const pricing = pricingByLp.get(normalizeBoqLp(line.lp)) ?? null;
    const knrHint = extractKatalogHintFromDescription(line.description);
    const wgdomUnit = wgdomUnitTotal(pricing);
    const wgdomLine = wgdomLineTotal(pricing);

    return {
      rowKey: stableRowKey(line.lp, line.description),
      lp: line.lp,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      knrHint,
      athUnitPrice: ath?.unitPrice?.trim() ? ath.unitPrice : null,
      athTotal: ath?.total?.trim() ? ath.total : null,
      athMatched: ath != null,
      wgdomUnitPln: wgdomUnit,
      wgdomLinePln: wgdomLine,
      wgdomPriced: wgdomLine != null && wgdomLine > 0,
      pricing,
      isUnknown: pricing?.isUnknown ?? true,
      searchText: buildSearchText([line.lp, line.description, knrHint, line.unit]),
    };
  });

  return {
    rows,
    meta: {
      totalRows: rows.length,
      athPricedCount: rows.filter((r) => r.athMatched && r.athUnitPrice).length,
      wgdomPricedCount: rows.filter((r) => r.wgdomPriced).length,
      hasAthPrices,
      sourceFilename: k?.sourceFilename ?? null,
      catalogSourceLabel,
    },
  };
}

/** Principle #003 — search/filter tylko na gotowych rows. */
export function filterKosztorysBoqRows(
  rows: KosztorysBoqRowViewModel[],
  opts: {
    query?: string;
    categoryFilter?: KosztorysProFilterId;
  },
): KosztorysBoqRowViewModel[] {
  let out = rows;
  const filter = opts.categoryFilter ?? "all";
  if (filter !== "all") {
    out = out.filter((row) => lineMatchesConstructionFilter(row.description, filter));
  }
  const q = foldBoqSearchText(opts.query ?? "");
  if (!q) return out;
  return out.filter((row) => row.searchText.includes(q));
}

/** Principle #002 — sort TOP N bez rebuild merge. */
export function selectTopCostRows(
  rows: KosztorysBoqRowViewModel[],
  limit = 20,
): KosztorysBoqRowViewModel[] {
  return [...rows]
    .filter((r) => (r.wgdomLinePln ?? 0) > 0)
    .sort((a, b) => (b.wgdomLinePln ?? 0) - (a.wgdomLinePln ?? 0))
    .slice(0, limit);
}

export function formatBoqAthPrice(value: string | null): string {
  return value?.trim() ? value : "—";
}

export function formatBoqWgdomUnit(pln: number | null): string {
  if (pln == null || pln <= 0) return "—";
  return fmtPln(Math.round(pln));
}

export function formatBoqWgdomLine(pln: number | null, isUnknown: boolean): string {
  if (isUnknown) return "Nie wyceniono";
  if (pln == null || pln <= 0) return "—";
  return fmtPln(Math.round(pln));
}
