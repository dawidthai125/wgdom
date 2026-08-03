/**
 * AI-COST-02-I3 — Competitiveness / quality signals (RO, pure).
 * REUSE: computeMarketAverageForWork (marketQuotes) · controlled_market hints (COST-02-A).
 * CK = RO hint only — nigdy nie napędza band.
 * ZERO: win% · Bid · pricing rewrite · Save Quotes · mutacje dokumentu.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import {
  computeMarketAverageForWork,
  isMarketRegionCode,
  type MarketAverageResult,
  type MarketRegionCode,
} from "@/lib/work-catalog";
import type {
  OfferBoqDocument,
  OfferBoqLine,
  OfferBoqPricedComponent,
} from "@/lib/tender-offer-boq";

/** DF §5.2 — pasmo OK = ±10%. */
export const I3_BAND_HALF_PCT = 10;

/** DF §5.2 — outlier gdy |Δ| > 25. */
export const I3_OUTLIER_PCT = 25;

export type I3Band = "below_market" | "in_band" | "above_market" | "no_benchmark";
export type I3MarketSource = "market_quotes" | "controlled_market" | "none";

export interface I3CkHint {
  present: boolean;
  entryId?: string;
  occurrenceCount?: number;
  labelPl?: string;
}

export interface I3LineCompetitiveness {
  lineId: string;
  offerUnitPln: number | null;
  marketUnitPln: number | null;
  deltaPct: number | null;
  band: I3Band;
  isOutlier: boolean;
  marketSource: I3MarketSource;
  controlledMarketUsed: boolean;
  ckHint: I3CkHint;
  lineDirectPln: number;
}

export interface I3CompetitivenessSummary {
  lineCount: number;
  withBenchmark: number;
  below: number;
  inBand: number;
  above: number;
  noBenchmark: number;
  outlierCount: number;
  /** Udział lineDirect linii above_market w sumie lineDirect (0..1). */
  aboveDirectShare: number;
}

export interface I3CompetitivenessView {
  builtAt: string;
  summary: I3CompetitivenessSummary;
  lines: I3LineCompetitiveness[];
}

export interface BuildI3CompetitivenessInput {
  doc: Pick<OfferBoqDocument, "lines">;
  works: CatalogWork[];
  /** ISO z callera — bez Date.now w formule band. */
  builtAt: string;
  startRegionCode?: string | null;
  computedAtIso?: string;
  marketAverageMemo?: Map<string, MarketAverageResult>;
}

export const I3_BAND_LABEL_PL: Record<I3Band, string> = {
  below_market: "Poniżej rynku",
  in_band: "W paśmie rynku (±10%)",
  above_market: "Powyżej rynku",
  no_benchmark: "Brak benchmarku",
};

export function i3BandLabelPl(band: I3Band, isOutlier: boolean): string {
  const base = I3_BAND_LABEL_PL[band];
  if (isOutlier && band !== "no_benchmark") return `${base} · outlier`;
  return base;
}

function roundPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function resolveStartRegion(code: string | null | undefined): MarketRegionCode | undefined {
  return isMarketRegionCode(code) ? code : undefined;
}

function lineDirectOf(line: OfferBoqLine): number {
  const v = line.linePricing?.aggregates.lineDirectPln;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function offerUnitOf(line: OfferBoqLine): number | null {
  if (!(line.quantity > 0)) return null;
  const direct = line.linePricing?.aggregates.lineDirectPln;
  if (typeof direct !== "number" || !Number.isFinite(direct)) return null;
  return direct / line.quantity;
}

function componentsOf(line: OfferBoqLine): OfferBoqPricedComponent[] {
  return line.linePricing?.components ?? [];
}

function controlledMarketUsedOnLine(components: OfferBoqPricedComponent[]): boolean {
  return components.some(
    (c) =>
      c.controlledMarketHint?.used === true || c.priceOrigin?.kind === "controlled_market",
  );
}

/** SECONDARY — suma unitPricePln komponentów controlled_market (RO). */
function secondaryControlledMarketUnit(
  components: OfferBoqPricedComponent[],
): number | null {
  let sum = 0;
  let any = false;
  for (const c of components) {
    const isCm =
      c.controlledMarketHint?.used === true || c.priceOrigin?.kind === "controlled_market";
    if (!isCm) continue;
    const u = c.unitPricePln;
    if (typeof u !== "number" || !(u > 0)) continue;
    sum += u;
    any = true;
  }
  return any && sum > 0 ? sum : null;
}

function resolveCkHint(components: OfferBoqPricedComponent[]): I3CkHint {
  for (const c of components) {
    const h = c.companyKnowledgeHint;
    if (h?.used) {
      return {
        present: true,
        entryId: h.entryId,
        occurrenceCount: h.occurrenceCount,
        labelPl: `Wiedza firmy (RO) · ${h.occurrenceCount}×`,
      };
    }
  }
  return { present: false };
}

export function classifyI3Band(deltaPct: number | null): {
  band: I3Band;
  isOutlier: boolean;
} {
  if (deltaPct == null || !Number.isFinite(deltaPct)) {
    return { band: "no_benchmark", isOutlier: false };
  }
  let band: I3Band;
  if (deltaPct < -I3_BAND_HALF_PCT) band = "below_market";
  else if (deltaPct > I3_BAND_HALF_PCT) band = "above_market";
  else band = "in_band";
  const isOutlier = Math.abs(deltaPct) > I3_OUTLIER_PCT;
  return { band, isOutlier };
}

function resolveMarketUnit(
  line: OfferBoqLine,
  work: CatalogWork | undefined,
  opts: {
    startRegion?: MarketRegionCode;
    computedAtIso?: string;
    memo?: Map<string, MarketAverageResult>;
  },
): {
  marketUnitPln: number | null;
  marketSource: I3MarketSource;
  controlledMarketUsed: boolean;
} {
  const components = componentsOf(line);
  const cmUsed = controlledMarketUsedOnLine(components);

  if (work) {
    const memoKey = `${work.id}|${opts.startRegion ?? ""}|${opts.computedAtIso ?? ""}`;
    let avg = opts.memo?.get(memoKey);
    if (!avg) {
      avg = computeMarketAverageForWork(work, {
        context: opts.startRegion ? { startRegionCode: opts.startRegion } : undefined,
        computedAtIso: opts.computedAtIso,
      });
      opts.memo?.set(memoKey, avg);
    }
    if (avg.pricePln != null && avg.pricePln > 0) {
      return {
        marketUnitPln: avg.pricePln,
        marketSource: "market_quotes",
        controlledMarketUsed: cmUsed,
      };
    }
  }

  const secondary = secondaryControlledMarketUnit(components);
  if (secondary != null) {
    return {
      marketUnitPln: secondary,
      marketSource: "controlled_market",
      controlledMarketUsed: true,
    };
  }

  return {
    marketUnitPln: null,
    marketSource: "none",
    controlledMarketUsed: cmUsed,
  };
}

/**
 * Pure view konkurencyjności RO (DF §6).
 * Sort: lineDirect ↓. Brak Quotes → no_benchmark (nigdy above_market).
 */
export function buildI3CompetitivenessView(
  input: BuildI3CompetitivenessInput,
): I3CompetitivenessView {
  const byId = new Map(input.works.filter((w) => w.active).map((w) => [w.id, w]));
  const startRegion = resolveStartRegion(input.startRegionCode);
  const memo = input.marketAverageMemo;
  const computedAtIso = input.computedAtIso;

  const lines: I3LineCompetitiveness[] = [];

  for (const line of input.doc.lines) {
    const lineDirectPln = lineDirectOf(line);
    const offerUnitPln = offerUnitOf(line);
    const work = line.catalogWorkId ? byId.get(line.catalogWorkId) : undefined;
    const market = resolveMarketUnit(line, work, {
      startRegion,
      computedAtIso,
      memo,
    });
    const components = componentsOf(line);
    const ckHint = resolveCkHint(components);

    let deltaPct: number | null = null;
    if (
      offerUnitPln != null &&
      market.marketUnitPln != null &&
      market.marketUnitPln > 0 &&
      Number.isFinite(offerUnitPln)
    ) {
      deltaPct = roundPct(
        ((offerUnitPln - market.marketUnitPln) / market.marketUnitPln) * 100,
      );
    }

    const { band, isOutlier } = classifyI3Band(deltaPct);

    lines.push({
      lineId: line.lineId,
      offerUnitPln,
      marketUnitPln: market.marketUnitPln,
      deltaPct: band === "no_benchmark" ? null : deltaPct,
      band,
      isOutlier: band === "no_benchmark" ? false : isOutlier,
      marketSource: market.marketSource,
      controlledMarketUsed: market.controlledMarketUsed,
      ckHint,
      lineDirectPln,
    });
  }

  lines.sort((a, b) => (b.lineDirectPln || 0) - (a.lineDirectPln || 0));

  let below = 0;
  let inBand = 0;
  let above = 0;
  let noBenchmark = 0;
  let outlierCount = 0;
  let totalDirect = 0;
  let aboveDirect = 0;

  for (const row of lines) {
    totalDirect += row.lineDirectPln || 0;
    if (row.band === "below_market") below += 1;
    else if (row.band === "in_band") inBand += 1;
    else if (row.band === "above_market") {
      above += 1;
      aboveDirect += row.lineDirectPln || 0;
    } else noBenchmark += 1;
    if (row.isOutlier) outlierCount += 1;
  }

  const withBenchmark = below + inBand + above;
  const aboveDirectShare =
    totalDirect > 0 ? Math.round((aboveDirect / totalDirect) * 1000) / 1000 : 0;

  return {
    builtAt: input.builtAt,
    summary: {
      lineCount: lines.length,
      withBenchmark,
      below,
      inBand,
      above,
      noBenchmark,
      outlierCount,
      aboveDirectShare,
    },
    lines,
  };
}
