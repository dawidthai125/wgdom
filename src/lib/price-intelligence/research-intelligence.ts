/**
 * DEMAND-RESEARCH-01 S2-A — Research Intelligence Brief (deterministic hints).
 * ZERO auto-price · ZERO fuzzy SSOT · ZERO HTTP · reuse S1-A identity + Quotes/history.
 * Priority bump = OUT (thin slice).
 */

import {
  mapMaterialToMarketWork,
  type MaterialMarketMapEntry,
} from "@/lib/pricing-expert/material-market-map";
import {
  findMapping,
  type MarketWorkMappingStore,
} from "@/lib/work-catalog/market-work-mapping";
import { isMarketOriginId, type MarketQuoteOriginId } from "@/lib/work-catalog/market-sources";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { TRADE_LABELS_PL, type TradeId } from "@/lib/work-catalog/trades";
import type { PriceDemandRecord } from "./demand-types";
import {
  lookupPriceMemory,
  marketQuoteOriginLabelPl,
  priceMemoryFreshnessLabelPl,
  type PriceMemoryFreshnessUx,
  type PriceMemoryHit,
  type PriceMemoryLookupResult,
} from "./price-memory";

export interface ResearchIntelligenceBrief {
  typicalWgdom: boolean;
  tradeId: TradeId | null;
  tradeLabelPl: string | null;
  materialLabelPl: string | null;
  materialKey: string;
  catalogWorkId: string | null;
  occurrenceCount: number;
  tenderCount: number;
  memoryStatus: "HIT" | "MISS";
  memoryHit: PriceMemoryHit | null;
  /** Ostatni / najlepszy origin z exact work LAST (S1-A pick) lub history. */
  lastOrigin: MarketQuoteOriginId | null;
  lastOriginLabelPl: string | null;
  /** Najczęstszy origin w history+LAST dla exact workId — HINT only. */
  preferredOriginHint: MarketQuoteOriginId | null;
  preferredOriginLabelPl: string | null;
  freshnessUx: PriceMemoryFreshnessUx | null;
  freshnessLabelPl: string | null;
  /** Agregat origin po TradeId — HINT only · nigdy auto-cena. */
  tradeOriginHint: MarketQuoteOriginId | null;
  tradeOriginHintLabelPl: string | null;
  ctaCheckSavedPl: string;
  ctaFindPricePl: string;
  guidancePl: string;
}

export interface BuildResearchIntelligenceInput {
  demand: PriceDemandRecord;
  worksById: ReadonlyMap<string, CatalogWork>;
  mappingStore?: MarketWorkMappingStore | null;
  mappingOrigin?: string | null;
  mappingExternalId?: string | null;
  materialMap?: readonly MaterialMarketMapEntry[];
  nowMs?: number;
  /** Opcjonalny wynik S1-A (uniknij podwójnego lookup w UI). */
  memoryLookup?: PriceMemoryLookupResult | null;
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Identity = S1-A exact (DF-1). Zwraca work nawet bez Quotes (dla Trade na MISS).
 * Soft label overlap = FORBIDDEN.
 */
export function resolveExactCatalogWork(opts: {
  catalogWorkId?: string | null;
  materialKey?: string | null;
  worksById: ReadonlyMap<string, CatalogWork>;
  mappingStore?: MarketWorkMappingStore | null;
  mappingOrigin?: string | null;
  mappingExternalId?: string | null;
}): { workId: string; work: CatalogWork; via: "catalogWorkId" | "materialKey" | "mapping" } | null {
  const mk = trimStr(opts.materialKey) || null;
  const cw = trimStr(opts.catalogWorkId);
  if (cw) {
    const work = opts.worksById.get(cw);
    if (work) return { workId: cw, work, via: "catalogWorkId" };
  }

  if (mk) {
    const map = mapMaterialToMarketWork(mk);
    if (map) {
      for (const id of map.candidateWorkIds ?? []) {
        const w = opts.worksById.get(id);
        if (w) return { workId: id, work: w, via: "materialKey" };
      }
      const w = opts.worksById.get(map.workId);
      if (w) return { workId: map.workId, work: w, via: "materialKey" };
    }
  }

  const origin = trimStr(opts.mappingOrigin);
  const externalId = trimStr(opts.mappingExternalId);
  if (opts.mappingStore && origin && externalId && isMarketOriginId(origin)) {
    const found = findMapping(opts.mappingStore, origin, externalId);
    const workId = found?.mapping?.workId;
    if (workId && opts.worksById.has(workId)) {
      return { workId, work: opts.worksById.get(workId)!, via: "mapping" };
    }
  }

  return null;
}

function exactMaterialLabel(materialKey: string): string | null {
  const map = mapMaterialToMarketWork(materialKey);
  return map?.labelPl?.trim() || null;
}

/** Najczęstszy origin w history dla workId (wszystkie origin×region cells). */
function mostFrequentOriginFromHistory(work: CatalogWork): MarketQuoteOriginId | null {
  const hist = work.marketQuoteHistory ?? [];
  if (hist.length === 0) return null;
  const counts = new Map<MarketQuoteOriginId, number>();
  for (const e of hist) {
    counts.set(e.origin, (counts.get(e.origin) ?? 0) + 1);
  }
  let best: MarketQuoteOriginId | null = null;
  let bestN = 0;
  for (const [origin, n] of counts) {
    if (n > bestN) {
      best = origin;
      bestN = n;
    }
  }
  return best;
}

/**
 * Agregat origin po TradeId — HINT only (DF-6). Nigdy nie ustawia ceny.
 */
export function deriveTradeOriginHint(
  tradeId: TradeId,
  worksById: ReadonlyMap<string, CatalogWork>,
): MarketQuoteOriginId | null {
  const counts = new Map<MarketQuoteOriginId, number>();
  for (const work of worksById.values()) {
    if (work.tradeId !== tradeId) continue;
    const quotes = work.marketQuotes;
    if (!quotes) continue;
    for (const origin of Object.keys(quotes) as MarketQuoteOriginId[]) {
      const regions = quotes[origin];
      if (!regions) continue;
      for (const snap of Object.values(regions)) {
        if (snap && snap.price > 0) {
          counts.set(origin, (counts.get(origin) ?? 0) + 1);
        }
      }
    }
  }
  let best: MarketQuoteOriginId | null = null;
  let bestN = 0;
  for (const [origin, n] of counts) {
    if (n > bestN) {
      best = origin;
      bestN = n;
    }
  }
  return best;
}

/**
 * S2-A Research Intelligence Brief — display only · zero price invent.
 */
export function buildResearchIntelligenceBrief(
  input: BuildResearchIntelligenceInput,
): ResearchIntelligenceBrief {
  const { demand, worksById } = input;
  const nowMs = input.nowMs ?? Date.now();
  const materialKey = demand.materialKey || "";
  const materialLabelPl = exactMaterialLabel(materialKey);

  const resolved = resolveExactCatalogWork({
    catalogWorkId: demand.catalogWorkId,
    materialKey,
    worksById,
    mappingStore: input.mappingStore,
    mappingOrigin: input.mappingOrigin,
    mappingExternalId: input.mappingExternalId,
  });

  const tradeId = resolved?.work.tradeId ?? null;
  const tradeLabelPl = tradeId ? TRADE_LABELS_PL[tradeId] ?? tradeId : null;
  const typicalWgdom = tradeId != null || materialLabelPl != null;

  const memory =
    input.memoryLookup ??
    lookupPriceMemory({
      catalogWorkId: demand.catalogWorkId,
      materialKey,
      region: demand.region,
      worksById,
      mappingStore: input.mappingStore,
      mappingOrigin: input.mappingOrigin,
      mappingExternalId: input.mappingExternalId,
      nowMs,
    });

  const hit = memory.status === "HIT" ? memory.hit : null;

  let lastOrigin: MarketQuoteOriginId | null = hit?.origin ?? null;
  let preferredOriginHint: MarketQuoteOriginId | null = null;
  let freshnessUx: PriceMemoryFreshnessUx | null = hit?.freshnessUx ?? null;

  if (resolved) {
    const fromHist = mostFrequentOriginFromHistory(resolved.work);
    preferredOriginHint = fromHist ?? hit?.origin ?? null;
    if (!lastOrigin && fromHist) lastOrigin = fromHist;
    // History-only freshness: nie inventuj ceny — tylko label gdy HIT
  }

  const tradeOriginHint =
    tradeId != null ? deriveTradeOriginHint(tradeId, worksById) : null;

  const occurrenceCount = Number.isFinite(demand.occurrenceCount)
    ? Math.max(0, demand.occurrenceCount)
    : 0;
  const tenderCount = Array.isArray(demand.tenderIds) ? demand.tenderIds.length : 0;

  const guidancePl = hit
    ? "Sprawdź zapisaną cenę (Price Memory), zanim uruchomisz nowy research."
    : typicalWgdom
      ? "Typowa pozycja profilu WGDOM — brak zapisanej ceny MARKET. Znajdź cenę ręcznie (S0). Purchase/faktura = osobna warstwa."
      : "Brak deterministycznej branży/mapy — nie zgadujemy Trade. Znajdź cenę ręcznie lub powiąż catalogWorkId.";

  return {
    typicalWgdom,
    tradeId,
    tradeLabelPl,
    materialLabelPl,
    materialKey,
    catalogWorkId: resolved?.workId ?? demand.catalogWorkId,
    occurrenceCount,
    tenderCount,
    memoryStatus: hit ? "HIT" : "MISS",
    memoryHit: hit,
    lastOrigin,
    lastOriginLabelPl: lastOrigin ? marketQuoteOriginLabelPl(lastOrigin) : null,
    preferredOriginHint,
    preferredOriginLabelPl: preferredOriginHint
      ? marketQuoteOriginLabelPl(preferredOriginHint)
      : null,
    freshnessUx,
    freshnessLabelPl: freshnessUx ? priceMemoryFreshnessLabelPl(freshnessUx) : null,
    tradeOriginHint,
    tradeOriginHintLabelPl: tradeOriginHint
      ? marketQuoteOriginLabelPl(tradeOriginHint)
      : null,
    ctaCheckSavedPl: "Sprawdź zapisaną cenę",
    ctaFindPricePl: "Brak zapisanej ceny — znajdź cenę",
    guidancePl,
  };
}

/** Pure helper — czy S2 kiedykolwiek używa soft label overlap (musi być false). */
export function researchIntelligenceUsesSoftLabelOverlap(): boolean {
  return false;
}

/** Pure helper — czy S2 tworzy cenę z historycznego BOQ (musi być false). */
export function researchIntelligenceCreatesPriceFromBoq(): boolean {
  return false;
}

/** Pure helper — czy S2 wypełnia MARKET z Purchase (musi być false). */
export function researchIntelligenceFillsMarketFromPurchase(): boolean {
  return false;
}

export function researchIntelligencePriorityImplemented(): boolean {
  return false; // OUT — thin slice
}
