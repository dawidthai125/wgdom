/**
 * AI-COST-02 / COST-02-A — kontrolowane źródło cen (Modele cenowe).
 * REUSE: Work Catalog `marketQuotes` + `computeMarketAverageForWork` — wyłącznie ODCZYT.
 * Bez Kp / marży / oferty / scrapingu / Cloud Sync.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import {
  computeMarketAverageForWork,
  isMarketRegionCode,
  marketRegionLabelPl,
  type MarketRegionCode,
} from "@/lib/work-catalog";
import {
  deriveCostSplitFromLegacyRate,
  normalizeCostSplit,
  resolveReferenceHourlyPln,
  splitCompanyPrice,
} from "@/lib/work-catalog/cost-split";
import type { OfferBoqConfidence, OfferBoqControlledMarketHint } from "@/lib/tender-offer-boq";
import type {
  OfferBoqPriceLookupRequest,
  OfferBoqPriceLookupResult,
  OfferBoqPriceSourceProvider,
} from "@/lib/tender-offer-boq-pricing-engine";

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function resolveStartRegion(code: string | null | undefined): MarketRegionCode | undefined {
  return isMarketRegionCode(code) ? code : undefined;
}

function pickAsOf(
  quotes: ReturnType<typeof computeMarketAverageForWork>["resolvedQuotes"],
  fallback: string | null,
): string | null {
  const dates = quotes
    .map((q) => q.snapshot.updatedAt)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (dates.length === 0) return fallback;
  return dates.sort().at(-1) ?? fallback;
}

function mapConfidence(avg: ReturnType<typeof computeMarketAverageForWork>): OfferBoqConfidence {
  if (avg.legacyFallbackUsed || avg.pricePln == null) return "low";
  if (avg.originCount >= 2 && !avg.fallbackUsed) return "medium";
  if (avg.originCount >= 1) return "medium";
  return "low";
}

export function controlledMarketHintFromLookup(
  result: OfferBoqPriceLookupResult,
): OfferBoqControlledMarketHint | undefined {
  const meta = result.controlledMarket;
  if (!meta) {
    if (result.origin.kind !== "controlled_market") return undefined;
    return {
      used: true,
      workId: result.origin.refId ?? "",
      regionCode: result.origin.regionCode ?? null,
      regionLabelPl: result.origin.regionCode
        ? marketRegionLabelPl(result.origin.regionCode as MarketRegionCode)
        : null,
      asOf: result.origin.asOf ?? null,
      originCount: 1,
      legacyFallbackUsed: false,
    };
  }
  return {
    used: true,
    workId: meta.workId,
    regionCode: meta.regionCode,
    regionLabelPl: meta.regionLabelPl,
    asOf: meta.asOf,
    originCount: meta.originCount,
    legacyFallbackUsed: meta.legacyFallbackUsed,
  };
}

export interface ControlledMarketProviderOptions {
  /** Stawka godzinowa do podziału M/R (REUSE costSplit). */
  hourlyPln?: number;
  /** Region startowy hierarchii marketQuotes (odczyt). */
  startRegionCode?: string | null;
  /** ISO — bez Date.now w silniku; domyślnie work.updatedAt w computeMarketAverageForWork. */
  computedAtIso?: string;
}

/**
 * Provider benchmarku z kontrolowanych `marketQuotes` Biblioteki Robót.
 * Zwraca null, gdy brak mapowania katalogowego lub brak ceny rynkowej.
 */
export function createControlledMarketPriceProvider(
  works: CatalogWork[],
  opts: ControlledMarketProviderOptions = {},
): OfferBoqPriceSourceProvider {
  const byId = new Map(works.filter((w) => w.active).map((w) => [w.id, w]));
  const hourly = resolveReferenceHourlyPln(opts.hourlyPln ?? 0);
  const startRegion = resolveStartRegion(opts.startRegionCode);

  return {
    id: "controlled_market",
    labelPl: "Kontrolowany benchmark rynkowy",
    lookup(req: OfferBoqPriceLookupRequest): OfferBoqPriceLookupResult | null {
      const workId = req.line.catalogWorkId;
      if (!workId) return null;
      const work = byId.get(workId);
      if (!work) return null;

      const avg = computeMarketAverageForWork(work, {
        context: startRegion ? { startRegionCode: startRegion } : undefined,
        computedAtIso: opts.computedAtIso,
      });
      if (avg.pricePln == null || !(avg.pricePln > 0)) return null;

      const split =
        work.costSplit ??
        deriveCostSplitFromLegacyRate(avg.pricePln * 0.55, 0.2, hourly);
      const parts = splitCompanyPrice(avg.pricePln, normalizeCostSplit(split), hourly);

      let unitPrice: number | null = null;
      if (req.category === "material") {
        unitPrice = parts.materialPlnPerUnit;
      } else if (req.category === "labor") {
        unitPrice = parts.laborCostPlnPerUnit;
      } else if (req.category === "equipment" && req.pricingComponentKind === "purchase") {
        unitPrice = avg.pricePln;
      } else {
        return null;
      }
      if (!(unitPrice > 0)) return null;

      const regionCode = avg.dominantRegionCode ?? startRegion ?? null;
      const regionLabelPl = regionCode ? marketRegionLabelPl(regionCode) : null;
      const asOf = pickAsOf(avg.resolvedQuotes, work.updatedAt ?? null);
      const confidence = mapConfidence(avg);
      const originLabels =
        avg.resolvedQuotes.length > 0
          ? avg.resolvedQuotes.map((q) => q.origin).join(", ")
          : avg.legacyFallbackUsed
            ? "legacy_seed"
            : "marketQuotes";

      return {
        unitPricePln: roundPln(unitPrice),
        origin: {
          kind: "controlled_market",
          refId: work.id,
          labelPl: `Benchmark rynkowy — ${work.namePl}`,
          externalProviderId: "work_catalog_market_quotes",
          regionCode: regionCode ?? undefined,
          asOf: asOf ?? undefined,
        },
        confidence,
        rationale:
          `Kontrolowany benchmark z Biblioteki Robót (marketQuotes, odczyt).` +
          ` Źródła: ${originLabels}.` +
          (regionLabelPl ? ` Region: ${regionLabelPl}.` : "") +
          (asOf ? ` Aktualność: ${asOf.slice(0, 10)}.` : "") +
          (avg.legacyFallbackUsed
            ? " Uwaga: użyto legacy seed — wymaga weryfikacji."
            : "") +
          ` Bez scrapingu; bez wpływu na Kp/marżę oferty.`,
        controlledMarket: {
          workId: work.id,
          regionCode,
          regionLabelPl,
          asOf,
          originCount: avg.originCount,
          legacyFallbackUsed: avg.legacyFallbackUsed,
        },
      };
    },
  };
}
