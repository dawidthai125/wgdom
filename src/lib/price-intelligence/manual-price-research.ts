/**
 * DEMAND-RESEARCH-01 S0 — manual PriceCandidate → Quotes ACCEPT (pure + commit adapter).
 * 0 external HTTP · no fuzzy-match · no LLM · REUSE commitMarketQuotesImport.
 */

import { commitMarketQuotesImport } from "@/lib/work-catalog/commit-market-quotes";
import type { CommitMarketQuotesDeps, CommitMarketQuotesReport } from "@/lib/work-catalog/commit-market-quotes";
import type { MarketCsvPreviewReport, MarketCsvPreviewRow } from "@/lib/work-catalog/market-csv-preview";
import {
  isMarketRegionCode,
  type MarketRegionCode,
} from "@/lib/work-catalog/market-regions";
import {
  roundMarketPricePln,
  type MarketQuoteOriginId,
  type MarketSourceSnapshot,
} from "@/lib/work-catalog/market-sources";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
} from "@/lib/work-catalog/work-catalog-store";
import { loadWorkCatalogStore } from "@/lib/work-catalog/work-catalog-sync";
import {
  loadPriceDemandStoreLocal,
  savePriceDemandStoreLocal,
} from "./demand-record";
import { resolveMarketLayerForDemand } from "./demand-resolve-layer";
import {
  archivePreviousQuotesIntoHistory,
  collectPreviousQuoteCellsForPreview,
} from "./price-memory";
import type {
  ManualPriceResearchFormInput,
  ManualPriceResearchValidationError,
  ManualResearchProviderId,
  PriceCandidate,
} from "./price-candidate-types";

export const MANUAL_RESEARCH_PROVIDER_LABELS_PL: Record<ManualResearchProviderId, string> = {
  leroy: "Leroy Merlin",
  castorama: "Castorama",
  obi: "OBI",
  other: "Inna",
};

/** D3 — DIY → DIY origin; OBI/other → wgdom (bez rozszerzania enum DIY). */
export function mapManualProviderToQuoteOrigin(
  provider: ManualResearchProviderId,
): MarketQuoteOriginId {
  if (provider === "leroy") return "leroy";
  if (provider === "castorama") return "castorama";
  return "wgdom";
}

export function manualProviderSourceLabel(provider: ManualResearchProviderId): string {
  return MANUAL_RESEARCH_PROVIDER_LABELS_PL[provider];
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parsePriceNet(raw: number | string): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

export function validateManualPriceResearchInput(
  input: ManualPriceResearchFormInput,
): ManualPriceResearchValidationError | null {
  if (!trimStr(input.demandId)) return "missing_demand_id";
  if (!trimStr(input.materialKey)) return "missing_material_key";
  if (!trimStr(input.catalogWorkId)) return "missing_catalog_work_id";
  if (!trimStr(input.name)) return "missing_name";
  if (!trimStr(input.unit)) return "missing_unit";
  if (!trimStr(input.priceDate)) return "missing_price_date";
  const price = parsePriceNet(input.priceNet);
  if (price == null || !(price > 0)) return "invalid_price";
  return null;
}

export function buildPriceCandidateFromManualInput(
  input: ManualPriceResearchFormInput,
  opts?: { candidateId?: string; retrievedAt?: string },
): { ok: true; candidate: PriceCandidate } | { ok: false; error: ManualPriceResearchValidationError } {
  const error = validateManualPriceResearchInput(input);
  if (error) return { ok: false, error };

  const priceNet = roundMarketPricePln(parsePriceNet(input.priceNet)!);
  const retrievedAt = opts?.retrievedAt ?? input.retrievedAt ?? new Date().toISOString();
  const sourceUrl = trimStr(input.sourceUrl) || undefined;
  const ean = trimStr(input.ean) || undefined;
  const providerSku = trimStr(input.providerSku) || undefined;
  const notes = trimStr(input.notes) || undefined;

  return {
    ok: true,
    candidate: {
      candidateId: opts?.candidateId ?? `pc_${retrievedAt.replace(/[^0-9A-Za-z]/g, "").slice(0, 20)}_${Math.random().toString(36).slice(2, 8)}`,
      demandId: trimStr(input.demandId),
      provider: input.provider,
      sourceType: "market_reference",
      name: trimStr(input.name),
      unit: trimStr(input.unit),
      priceNet,
      currency: "PLN",
      priceDate: trimStr(input.priceDate),
      sourceUrl,
      ean,
      providerSku,
      retrievedAt,
      provenance: "manual_owner",
      notes,
      materialKey: trimStr(input.materialKey),
      catalogWorkId: trimStr(input.catalogWorkId!),
      region: trimStr(input.region) || "wroclaw",
    },
  };
}

function resolveRegionCode(region: string): MarketRegionCode {
  const r = trimStr(region) || "wroclaw";
  if (isMarketRegionCode(r)) return r;
  if (r === "dolny_slask" || r === "dolny-slask") return "dolnyslask";
  return "wroclaw";
}

function resolveCatalogSlice(region: string): WgdomCostRegion {
  const r = resolveRegionCode(region);
  return r === "dolnyslask" ? "dolnyslask" : "wroclaw";
}

function emptyParse(): MarketCsvPreviewReport["parse"] {
  return {
    ok: true,
    delimiter: ";",
    headers: [],
    rows: [],
    rejected: [],
  };
}

function previewRow(
  partial: Omit<MarketCsvPreviewRow, "origin"> & { origin: MarketCsvPreviewRow["origin"] | MarketQuoteOriginId },
): MarketCsvPreviewRow {
  return partial as MarketCsvPreviewRow;
}

/**
 * 1-cell Quotes staging preview (matched) · identity = Demand.catalogWorkId.
 * DIY: dodatkowy companion `wgdom` (indicative) — PE average ma DIY OFF w enabledOrigins;
 * bez companion Cost nie widzi ceny (MARKET-SYNC design). Primary origin = D3.
 */
export function buildManualMarketQuotesPreview(
  candidate: PriceCandidate,
): MarketCsvPreviewReport {
  const origin = mapManualProviderToQuoteOrigin(candidate.provider);
  const regionCode = resolveRegionCode(candidate.region);
  const updatedAt = candidate.priceDate.includes("T")
    ? candidate.priceDate
    : `${candidate.priceDate}T12:00:00.000Z`;
  const sourceLabel = manualProviderSourceLabel(candidate.provider);

  const primary: MarketSourceSnapshot = {
    price: candidate.priceNet,
    regionCode,
    coverage: origin === "wgdom" ? "indicative" : "full",
    updatedAt,
    confidence: origin === "wgdom" ? 0.7 : 0.85,
    origin,
  };

  const rows: MarketCsvPreviewRow[] = [
    previewRow({
      rowIndex: 0,
      lineNumber: 1,
      origin,
      externalId: candidate.providerSku ?? candidate.ean ?? candidate.candidateId,
      workId: candidate.catalogWorkId,
      confidence: primary.confidence,
      status: "matched",
      regionCode,
      price: candidate.priceNet,
      errors: [],
      snapshot: primary,
    }),
  ];

  // DIY OFF w average → companion wgdom dla widoczności Cost/PE (nie zastępuje primary DIY).
  if (origin === "leroy" || origin === "castorama") {
    const companion: MarketSourceSnapshot = {
      price: candidate.priceNet,
      regionCode,
      coverage: "indicative",
      updatedAt,
      confidence: 0.7,
      origin: "wgdom",
    };
    rows.push(
      previewRow({
        rowIndex: 1,
        lineNumber: 2,
        origin: "wgdom",
        externalId: `manual_${sourceLabel}_${candidate.candidateId}`,
        workId: candidate.catalogWorkId,
        confidence: companion.confidence,
        status: "matched",
        regionCode,
        price: candidate.priceNet,
        errors: [],
        snapshot: companion,
      }),
    );
  }

  return {
    mode: "preview",
    parse: emptyParse(),
    matched: rows,
    lowConfidence: [],
    unmatched: [],
    rejected: [],
    summary: {
      totalInputRows: rows.length,
      parsedRows: rows.length,
      parseRejectedLines: 0,
      matched: rows.length,
      lowConfidence: 0,
      unmatched: 0,
      rejected: 0,
    },
  };
}

export interface AcceptManualMarketPriceResearchOpts {
  candidate: PriceCandidate;
  /** Po ACCEPT — resolve MARKET layer + save Demand store (default true). */
  resolveDemand?: boolean;
  commitOptions?: {
    updatedAtIso?: string;
    deps?: Partial<CommitMarketQuotesDeps>;
  };
}

export interface AcceptManualMarketPriceResearchResult {
  ok: boolean;
  commit: CommitMarketQuotesReport | null;
  demandResolved: boolean;
  demandChanged: boolean;
  historyAppended: number;
  wroteCompanyKnowledge: false;
  wrotePurchase: false;
  error?: string;
}

/**
 * OWNER ACCEPT → commitMarketQuotesImport → A2 history (previous LAST) → MARKET resolve.
 * NIE invoice · NIE company knowledge · NIE Purchase.
 */
export async function acceptManualMarketPriceResearch(
  opts: AcceptManualMarketPriceResearchOpts,
): Promise<AcceptManualMarketPriceResearchResult> {
  const { candidate } = opts;
  const preview = buildManualMarketQuotesPreview(candidate);
  const region = resolveCatalogSlice(candidate.region);
  const deps: CommitMarketQuotesDeps = {
    load: loadWorkCatalogStore,
    save: saveWorkCatalogRouted,
    loadLocal: loadWorkCatalogStoreLocal,
    saveLocal: saveWorkCatalogStoreLocal,
    ...(opts.commitOptions?.deps ?? {}),
  };

  let previousCells: ReturnType<typeof collectPreviousQuoteCellsForPreview> = [];
  try {
    const preStore = await deps.load();
    previousCells = collectPreviousQuoteCellsForPreview(preStore, preview.matched, region);
  } catch {
    previousCells = [];
  }

  let commit: CommitMarketQuotesReport;
  try {
    commit = await commitMarketQuotesImport(preview, {
      region,
      updatedAtIso: opts.commitOptions?.updatedAtIso ?? candidate.retrievedAt,
      deps: opts.commitOptions?.deps,
    });
  } catch (e) {
    return {
      ok: false,
      commit: null,
      demandResolved: false,
      demandChanged: false,
      historyAppended: 0,
      wroteCompanyKnowledge: false,
      wrotePurchase: false,
      error: e instanceof Error ? e.message : "commit_failed",
    };
  }

  const committed = commit.status === "committed" || commit.status === "noop";
  if (!committed) {
    return {
      ok: false,
      commit,
      demandResolved: false,
      demandChanged: false,
      historyAppended: 0,
      wroteCompanyKnowledge: false,
      wrotePurchase: false,
      error: commit.reason ?? commit.status,
    };
  }

  let historyAppended = 0;
  if (previousCells.length > 0 && commit.status === "committed") {
    try {
      const postStore = deps.loadLocal();
      const archived = archivePreviousQuotesIntoHistory(postStore, previousCells, region);
      if (archived.appended > 0) {
        historyAppended = archived.appended;
        await deps.save(
          archived.store,
          {
            updatedAtIso: opts.commitOptions?.updatedAtIso ?? candidate.retrievedAt,
            previousStore: postStore,
          },
          undefined,
        );
      }
    } catch {
      historyAppended = 0;
    }
  }

  let demandResolved = false;
  let demandChanged = false;
  if (opts.resolveDemand !== false) {
    const store = loadPriceDemandStoreLocal();
    const result = resolveMarketLayerForDemand(store, {
      materialKey: candidate.materialKey,
      catalogWorkId: candidate.catalogWorkId,
      region: candidate.region || "wroclaw",
      resolvedAt: candidate.retrievedAt,
    });
    demandChanged = result.changed;
    demandResolved = result.resolved > 0;
    if (result.changed) {
      savePriceDemandStoreLocal(result.store);
    }
  }

  return {
    ok: true,
    commit,
    demandResolved,
    demandChanged,
    historyAppended,
    wroteCompanyKnowledge: false,
    wrotePurchase: false,
  };
}

/** Pure ACCEPT path for tests (in-memory demand + commit deps). */
export async function acceptManualMarketPriceResearchPure(opts: {
  candidate: PriceCandidate;
  demandStore: import("./demand-types").PriceDemandStore;
  commitOptions?: AcceptManualMarketPriceResearchOpts["commitOptions"];
}): Promise<
  AcceptManualMarketPriceResearchResult & {
    nextDemandStore: import("./demand-types").PriceDemandStore;
  }
> {
  const preview = buildManualMarketQuotesPreview(opts.candidate);
  const region = resolveCatalogSlice(opts.candidate.region);
  const deps = opts.commitOptions?.deps;

  let previousCells: ReturnType<typeof collectPreviousQuoteCellsForPreview> = [];
  if (deps?.load) {
    const preStore = await deps.load();
    previousCells = collectPreviousQuoteCellsForPreview(preStore, preview.matched, region);
  }

  const commit = await commitMarketQuotesImport(preview, {
    region,
    updatedAtIso: opts.commitOptions?.updatedAtIso ?? opts.candidate.retrievedAt,
    deps: opts.commitOptions?.deps,
  });
  const committed = commit.status === "committed" || commit.status === "noop";
  if (!committed) {
    return {
      ok: false,
      commit,
      demandResolved: false,
      demandChanged: false,
      historyAppended: 0,
      wroteCompanyKnowledge: false,
      wrotePurchase: false,
      error: commit.reason ?? commit.status,
      nextDemandStore: opts.demandStore,
    };
  }

  let historyAppended = 0;
  if (previousCells.length > 0 && commit.status === "committed" && deps?.loadLocal && deps?.save) {
    const postStore = deps.loadLocal();
    const archived = archivePreviousQuotesIntoHistory(postStore, previousCells, region);
    if (archived.appended > 0) {
      historyAppended = archived.appended;
      await deps.save(archived.store, {
        updatedAtIso: opts.commitOptions?.updatedAtIso ?? opts.candidate.retrievedAt,
        previousStore: postStore,
      });
    }
  }

  const result = resolveMarketLayerForDemand(opts.demandStore, {
    materialKey: opts.candidate.materialKey,
    catalogWorkId: opts.candidate.catalogWorkId,
    region: opts.candidate.region || "wroclaw",
    resolvedAt: opts.candidate.retrievedAt,
  });
  return {
    ok: true,
    commit,
    demandResolved: result.resolved > 0,
    demandChanged: result.changed,
    historyAppended,
    wroteCompanyKnowledge: false,
    wrotePurchase: false,
    nextDemandStore: result.store,
  };
}
