/**
 * V4.2 — Kosztorys PRO Dashboard (decyzyjny ekran właściciela).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  buildCatalogLinePricingView,
} from "@/lib/tender-catalog-line-pricing";
import {
  CONSTRUCTION_CATEGORY_LABELS,
  type ConstructionCategoryId,
} from "@/lib/construction-keywords";
import {
  buildConstructionScopeFromTenderDossier,
  type ConstructionScopeAnalysis,
} from "@/lib/construction-scope-analysis";
import {
  evaluateBusinessFitFromScope,
  formatBusinessFitKpi,
  type BusinessFitResult,
} from "@/lib/construction-business-fit";
import { computeBidMarginPct } from "@/lib/tender-bid-ux";
import {
  buildKosztorysBoqExplorerView,
  selectTopCostRows,
  type KosztorysBoqExplorerView,
  type KosztorysBoqRowViewModel,
} from "@/lib/tender-kosztorys-boq-explorer";
import {
  buildKosztorysV4Stats,
  resolveEffectiveKosztorysV4CatalogLines,
  resolveTenderPricingCatalogForDisplay,
} from "@/lib/tender-detail-v4-display";
import { buildPrzetargExecutiveBundle } from "@/lib/tender-detail-v4-display";
import {
  getTenderPriceOverrides,
  loadTenderPriceOverridesStoreLocal,
} from "@/lib/tender-price-overrides";
import { buildLaborBenchmarkAlerts } from "@/lib/labor-benchmark";

export type { KosztorysProFilterId } from "@/lib/tender-kosztorys-pro-filters";
export {
  KOSZTORYS_PRO_FILTER_OPTIONS,
  filterCatalogLinesByConstructionCategory,
  kosztorysFilterEmptyMessage,
  lineMatchesConstructionFilter,
} from "@/lib/tender-kosztorys-pro-filters";

export interface KosztorysProTopRow {
  lp: string;
  description: string;
  unit: string;
  quantity: string;
  unitPriceDisplay: string;
  valuePln: number;
  valueDisplay: string;
}

export interface KosztorysProAssessment {
  headline: string;
  paragraphs: string[];
}

export interface KosztorysProDashboard {
  athPositions: number;
  athPositionsDisplay: string;
  priced: number;
  unpriced: number;
  coveragePct: number | null;
  coverageDisplay: string;
  valuationDisplay: string;
  valuationPln: number | null;
  avgMarginPct: number | null;
  avgMarginDisplay: string;
  avgMarginHasData: boolean;
  fitDisplay: string | null;
  fitLabel: string | null;
  statusLabel: "GOTOWE DO OFERTY" | "WYMAGA WYCENY";
  marketHint: string | null;
  topRows: KosztorysProTopRow[];
  assessment: KosztorysProAssessment | null;
  scope: ConstructionScopeAnalysis | null;
  fit: BusinessFitResult | null;
  hasCatalog: boolean;
}

function boqRowToProTopRow(row: KosztorysBoqRowViewModel): KosztorysProTopRow {
  const valuePln = row.wgdomLinePln ?? 0;
  const unit = row.wgdomUnitPln;
  return {
    lp: row.lp,
    description: row.description,
    unit: row.unit || "—",
    quantity: row.pricing?.quantityDisplay || row.quantity || "—",
    unitPriceDisplay: unit != null && unit > 0 ? fmtPln(Math.round(unit)) : "—",
    valuePln,
    valueDisplay: fmtPln(Math.round(valuePln)),
  };
}

export function buildKosztorysProTopRowsFromBoqView(
  view: KosztorysBoqExplorerView,
  limit = 20,
): KosztorysProTopRow[] {
  return selectTopCostRows(view.rows, limit).map(boqRowToProTopRow);
}

function resolveAvgMargin(
  item: TenderPipelineItem,
): { pct: number | null; hasData: boolean } {
  const proposal = item.tenderDossier?.bidProposal;
  const fromProposal = computeBidMarginPct(
    proposal?.recommendedBidPln ?? null,
    proposal?.costPricePln ?? null,
  );
  if (fromProposal != null) {
    return { pct: Math.round(fromProposal), hasData: true };
  }

  const profile = loadCompanyProfileLocal();
  if (profile.minMarginPct > 0) {
    return { pct: profile.minMarginPct, hasData: true };
  }

  return { pct: null, hasData: false };
}

function formatAvgMarginDisplay(hasData: boolean, pct: number | null): string {
  if (!hasData || pct == null) return "Ustal marżę";
  return `${pct}%`;
}

function resolveMarketHint(
  pricingView: ReturnType<typeof buildCatalogLinePricingView>,
): string | null {
  if (!pricingView?.categorySummary.length) return null;
  const comparisons = pricingView.categorySummary.map((row) => ({
    ...row.laborBenchmark,
    categoryLabel: row.categoryLabel,
  }));
  const below = comparisons.filter((c) => c.status === "below").length;
  const above = comparisons.filter((c) => c.status === "above").length;
  const ok = comparisons.filter((c) => c.status === "ok").length;
  const alerts = buildLaborBenchmarkAlerts(comparisons);
  if (alerts.outOfRangeCount > 0 && above >= below) {
    return "Stawki robocizny: część pozycji powyżej benchmarku rynku";
  }
  if (alerts.outOfRangeCount > 0 && below > above) {
    return "Stawki robocizny: część pozycji poniżej benchmarku rynku";
  }
  if (ok > 0) return "Stawki robocizny: głównie na poziomie rynku";
  return null;
}

function resolveStatusLabel(
  coveragePct: number | null,
  priced: number,
  athReady: boolean,
): KosztorysProDashboard["statusLabel"] {
  if (!athReady || priced <= 0) return "WYMAGA WYCENY";
  if (coveragePct != null && coveragePct >= 70) return "GOTOWE DO OFERTY";
  return "WYMAGA WYCENY";
}

/** V4.2A — nigdy nie zwraca „Dominują inne.” */
export function formatDominantScopeParagraph(
  scope: ConstructionScopeAnalysis | null,
  scopeDescription?: string | null,
): string | null {
  const classified = scope?.categoryBreakdown?.filter(
    (row) => row.categoryId !== "inne" && row.percentage > 0,
  ) ?? [];

  if (classified.length >= 2) {
    const top3 = classified
      .slice(0, 3)
      .map((row) => `${row.category.toLowerCase()} (${row.percentage}%)`)
      .join(", ");
    return `Dominują: ${top3}.`;
  }

  if (classified.length === 1) {
    return `Dominują ${classified[0].category.toLowerCase()}.`;
  }

  if (scope?.primaryCategoryId && scope.primaryCategoryId !== "inne" && scope.primaryCategory) {
    return `Dominują ${scope.primaryCategory.toLowerCase()}.`;
  }

  const desc = scopeDescription?.trim();
  if (desc) {
    const short = desc.length > 100 ? `${desc.slice(0, 100)}…` : desc;
    return `Zakres: ${short}.`;
  }

  return null;
}

export function buildKosztorysProAssessment(opts: {
  scope: ConstructionScopeAnalysis | null;
  scopeDescription?: string | null;
  fit: BusinessFitResult | null;
  coveragePct: number | null;
  priced: number;
  unpriced: number;
  statusLabel: KosztorysProDashboard["statusLabel"];
  marketHint: string | null;
}): KosztorysProAssessment | null {
  const { scope, scopeDescription, fit, coveragePct, priced, unpriced, statusLabel, marketHint } = opts;
  if (priced <= 0 && unpriced <= 0) return null;

  const paragraphs: string[] = [];
  let headline = "Ocena kosztorysu";

  if (fit) {
    if (fit.fitScore >= 80) {
      headline = "Przetarg bardzo dobrze dopasowany do profilu WGDOM";
    } else if (fit.fitScore >= 60) {
      headline = "Przetarg dobrze dopasowany do profilu WGDOM";
    } else if (fit.fitScore >= 40) {
      headline = "Przetarg średnio dopasowany do profilu WGDOM";
    } else {
      headline = "Przetarg słabo dopasowany do profilu WGDOM";
    }
  }

  const dominantLine = formatDominantScopeParagraph(scope, scopeDescription);
  if (dominantLine) {
    paragraphs.push(dominantLine);
  }

  if (coveragePct != null) {
    paragraphs.push(`Pokrycie wyceny ${coveragePct}%.`);
  }

  if (unpriced > 0) {
    paragraphs.push(`Pozostało ${unpriced} pozycji bez wyceny katalogowej.`);
  }

  if (marketHint) {
    paragraphs.push(marketHint);
  }

  paragraphs.push(
    statusLabel === "GOTOWE DO OFERTY"
      ? "Można przygotowywać ofertę."
      : "Uzupełnij wycenę katalogową przed przygotowaniem oferty.",
  );

  return { headline, paragraphs };
}

export function buildKosztorysProDashboard(
  item: TenderPipelineItem,
  boqView?: KosztorysBoqExplorerView,
): KosztorysProDashboard {
  const stats = buildKosztorysV4Stats(item);
  const catalog = resolveEffectiveKosztorysV4CatalogLines(item);
  const priceOverrides = getTenderPriceOverrides(
    loadTenderPriceOverridesStoreLocal(),
    item.id,
  ).overrides;
  const { catalog: pricingCatalog, costModel } = resolveTenderPricingCatalogForDisplay();
  const pricingView = catalog.length
    ? buildCatalogLinePricingView(catalog, pricingCatalog, costModel, priceOverrides)
    : null;
  const view = boqView ?? buildKosztorysBoqExplorerView({ item, priceOverrides });

  const coveragePct = stats.athPositions > 0
    ? Math.round((stats.pricedPositions / stats.athPositions) * 100)
    : null;
  const coverageDisplay = coveragePct != null ? `${coveragePct}%` : "—";

  const { executive } = buildPrzetargExecutiveBundle(item);
  const scope = catalog.length || item.tenderDossier?.kosztorys
    ? buildConstructionScopeFromTenderDossier({
      kosztorys: item.tenderDossier?.kosztorys ?? null,
      executiveSummary: executive,
      scopeDescription: item.tenderDossier?.brief?.scopeDescription ?? item.title ?? null,
    })
    : null;

  const fit = scope ? evaluateBusinessFitFromScope(scope, catalog.map((c) => c.description)) : null;
  const fitKpi = fit ? formatBusinessFitKpi(fit) : null;

  const { pct: avgMarginPct, hasData: avgMarginHasData } = resolveAvgMargin(item);
  const scopeDescription =
    item.tenderDossier?.brief?.scopeDescription ?? item.title ?? null;

  const statusLabel = resolveStatusLabel(coveragePct, stats.pricedPositions, stats.athReady);
  const marketHint = resolveMarketHint(pricingView);
  const topRows = view.rows.length ? buildKosztorysProTopRowsFromBoqView(view) : [];

  const assessment = buildKosztorysProAssessment({
    scope,
    scopeDescription,
    fit,
    coveragePct,
    priced: stats.pricedPositions,
    unpriced: stats.unpricedPositions,
    statusLabel,
    marketHint,
  });

  return {
    athPositions: stats.athPositions,
    athPositionsDisplay: stats.athPositionsDisplay,
    priced: stats.pricedPositions,
    unpriced: stats.unpricedPositions,
    coveragePct,
    coverageDisplay,
    valuationDisplay: stats.valuationValueDisplay,
    valuationPln: stats.valuationTotalPln,
    avgMarginPct,
    avgMarginHasData,
    avgMarginDisplay: formatAvgMarginDisplay(avgMarginHasData, avgMarginPct),
    fitDisplay: fitKpi?.line ?? null,
    fitLabel: fit?.fitLabel ?? null,
    statusLabel,
    marketHint,
    topRows,
    assessment,
    scope,
    fit,
    hasCatalog: catalog.length > 0,
  };
}

export function primaryConstructionCategoryLabel(scope: ConstructionScopeAnalysis | null): string {
  if (!scope?.primaryCategoryId || scope.primaryCategoryId === "inne") return "—";
  return CONSTRUCTION_CATEGORY_LABELS[scope.primaryCategoryId as ConstructionCategoryId] ?? scope.primaryCategory;
}
