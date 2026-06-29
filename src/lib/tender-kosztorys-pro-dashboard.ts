/**
 * V4.2 — Kosztorys PRO Dashboard (decyzyjny ekran właściciela).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  buildCatalogLinePricingView,
  type CatalogLinePricingRow,
} from "@/lib/tender-catalog-line-pricing";
import {
  CONSTRUCTION_CATEGORY_LABELS,
  type ConstructionCategoryId,
  foldConstructionText,
  matchConstructionKeywordsInText,
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
import { computeBidMarginPct, formatBidMarginPct } from "@/lib/tender-bid-ux";
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

export type KosztorysProFilterId = "all" | ConstructionCategoryId;

/** V4.2A — wykluczenia z filtra Elektryczne (false positives ATH). */
const ELECTRICAL_FILTER_EXCLUDE =
  /nietoperz|siedlisk|budek\s+l[eę]gow|trocinobeton|bruzd.{0,40}tynk|wyka[nń]czan.{0,20}tynk|sprz[aą]tanie\s+pomieszcze[nń]/i;

/** V4.2A — mocny sygnał elektryki (nie samo „przewód” w kontekście ogólnobudowlanym). */
const ELECTRICAL_FILTER_STRONG =
  /rozdzielnic|ydy|ytksy|ytk\b|domofon|rg6|utp|licznik|swiatlowod|światłowod|instalacj.{0,12}elektryczn|o[sś]wietlen|gniazd|opraw|napi[eę]ci|niskiego\s+napi|okablow|energi.{0,6}elektryczn|przew[oó]d\s+ydy|wci[aą]ganie\s+przewodu/i;

export const KOSZTORYS_PRO_FILTER_OPTIONS: {
  id: KosztorysProFilterId;
  label: string;
}[] = [
  { id: "all", label: "Wszystkie" },
  { id: "wykończeniowe", label: "Wykończeniowe" },
  { id: "sanitarne", label: "Sanitarne" },
  { id: "elektryczne", label: "Elektryczne" },
  { id: "dachowe", label: "Dachowe" },
  { id: "drogowe", label: "Drogowe" },
];

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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function lineValuePln(row: CatalogLinePricingRow): number {
  if (row.isUnknown) return 0;
  const unit = (row.materialPlnPerUnit ?? 0) + (row.laborPlnPerUnit ?? 0);
  if (unit <= 0 || row.quantity <= 0) return 0;
  return roundMoney(row.quantity * unit);
}

function unitPriceDisplay(row: CatalogLinePricingRow): string {
  const unit = (row.materialPlnPerUnit ?? 0) + (row.laborPlnPerUnit ?? 0);
  if (unit <= 0) return "—";
  return fmtPln(Math.round(unit));
}

function lineMatchesElectricalFilter(description: string): boolean {
  const text = description ?? "";
  if (!text.trim()) return false;
  if (ELECTRICAL_FILTER_EXCLUDE.test(text)) return false;

  const hits = matchConstructionKeywordsInText(text).filter((h) => h.categoryId === "elektryczne");
  if (!hits.length) return false;

  const folded = foldConstructionText(text);
  if (ELECTRICAL_FILTER_STRONG.test(folded)) return true;

  const strongDictionary = [
    "instalacja elektryczna",
    "instalacje elektryczne",
    "rozdzielnica",
    "rozdzielnia",
    "okablowanie",
    "tablica rozdzielcza",
    "instalacja niskiego napięcia",
  ];
  return hits.some((h) =>
    strongDictionary.some((kw) => foldConstructionText(h.keyword).includes(foldConstructionText(kw))),
  );
}

export function lineMatchesConstructionFilter(
  description: string,
  filter: KosztorysProFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "elektryczne") return lineMatchesElectricalFilter(description);
  const hits = matchConstructionKeywordsInText(description ?? "");
  return hits.some((h) => h.categoryId === filter);
}

export function kosztorysFilterEmptyMessage(filter: KosztorysProFilterId): string {
  if (filter === "sanitarne") return "Nie wykryto pozycji sanitarnych.";
  if (filter === "elektryczne") return "Nie wykryto pozycji elektrycznych.";
  if (filter === "wykończeniowe") return "Nie wykryto pozycji wykończeniowych.";
  if (filter === "dachowe") return "Nie wykryto pozycji dachowych.";
  if (filter === "drogowe") return "Nie wykryto pozycji drogowych.";
  return "Brak pozycji dla wybranego filtra.";
}

export function filterCatalogLinesByConstructionCategory(
  lines: TenderCatalogQuantityLine[],
  filter: KosztorysProFilterId,
): TenderCatalogQuantityLine[] {
  if (filter === "all") return lines;
  return lines.filter((line) => lineMatchesConstructionFilter(line.description ?? "", filter));
}

export function buildKosztorysProTopRows(
  pricingRows: CatalogLinePricingRow[],
  limit = 20,
): KosztorysProTopRow[] {
  return [...pricingRows]
    .map((row) => ({
      row,
      valuePln: lineValuePln(row),
    }))
    .filter((x) => x.valuePln > 0)
    .sort((a, b) => b.valuePln - a.valuePln)
    .slice(0, limit)
    .map(({ row, valuePln }) => ({
      lp: row.lp,
      description: row.description,
      unit: row.unit || "—",
      quantity: row.quantityDisplay || String(row.quantity),
      unitPriceDisplay: unitPriceDisplay(row),
      valuePln,
      valueDisplay: fmtPln(Math.round(valuePln)),
    }));
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

export function buildKosztorysProDashboard(item: TenderPipelineItem): KosztorysProDashboard {
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
  const topRows = pricingView ? buildKosztorysProTopRows(pricingView.rows) : [];

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
