/**
 * PRICE-MEMORY-CATALOG-01 — manual force refresh (ONE materialKey).
 * C4: may force CURRENT · C5: Accept → commit required (never silent write).
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import type { CommitMarketQuotesDeps } from "@/lib/work-catalog/commit-market-quotes";
import { buildPriceDemandId, normalizePriceDemandStore } from "./demand-queue";
import type { PriceDemandRecord, PriceDemandStore } from "./demand-types";
import {
  acceptMaterialResearchCandidate,
} from "./market-material-research-orchestrate";
import type {
  AcceptResearchCandidateResult,
  MaterialResearchLeasePort,
  MaterialResearchProvider,
} from "./market-material-research-types";
import {
  executeMaterialResearchPhase2,
  type Phase2ExecuteResult,
} from "./market-material-research-wire";
import type { PriceCandidate } from "./price-candidate-types";
import { assertMaterialResearchAllowed } from "@/lib/intelligent-estimator";

export const OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY = 3;

export type ForceRefreshMaterialMarketOpts = {
  materialKey: string;
  catalogWorkId?: string | null;
  namePl?: string;
  unit?: string;
  region?: string;
  claimantId: string;
  lease: MaterialResearchLeasePort;
  worksById: ReadonlyMap<string, CatalogWork>;
  nowMs?: number;
  provider?: MaterialResearchProvider;
  /** Always true for catalog CTA (C4). */
  forceRefresh?: boolean;
  mockPriceNet?: number;
  useMockForTests?: boolean;
};

/**
 * Owner CTA: force research ONE materialKey (even CURRENT).
 * Returns candidate — does NOT persist (C5).
 */
export async function forceResearchMaterialMarketPrice(
  opts: ForceRefreshMaterialMarketOpts,
): Promise<Phase2ExecuteResult & { materialKeysRequested: string[]; maxShops: number }> {
  const materialKey = String(opts.materialKey || "").trim();
  const nowMs = opts.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // A3 — Classification Gate at catalog refresh entry
  const matGate = assertMaterialResearchAllowed({
    materialKey,
    catalogWorkId: opts.catalogWorkId,
    namePl: opts.namePl,
    unit: opts.unit,
  });
  if (!matGate.ok) {
    return {
      ok: false,
      acquired: false,
      candidate: null,
      autoAccepted: false,
      error: `classification_gate:${matGate.classify.plane}`,
      materialKeysRequested: [materialKey],
      maxShops: OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY,
    };
  }

  const demandId = buildPriceDemandId({
    materialKey,
    catalogWorkId: opts.catalogWorkId ?? null,
    region: opts.region || "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
  });
  const demand: PriceDemandRecord = {
    demandId,
    materialKey,
    catalogWorkId: opts.catalogWorkId ?? null,
    normalizedName: opts.namePl || materialKey,
    unit: opts.unit || "szt",
    region: opts.region || "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    priority: "HIGH",
    occurrenceCount: 1,
    tenderIds: [],
    firstRequestedAt: nowIso,
    lastRequestedAt: nowIso,
    reason: "OWNER FORCE REFRESH — our price catalog",
  };

  const result = await executeMaterialResearchPhase2({
    demand,
    claimantId: opts.claimantId,
    lease: opts.lease,
    worksById: opts.worksById,
    nowMs,
    forceRefresh: opts.forceRefresh !== false,
    provider: opts.provider,
    mockPriceNet: opts.mockPriceNet,
    useMockForTests: opts.useMockForTests,
  });

  return {
    ...result,
    materialKeysRequested: [materialKey],
    maxShops: OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY,
  };
}

export async function acceptForceRefreshCandidate(opts: {
  candidate: PriceCandidate;
  demandStore?: PriceDemandStore;
  expectedUnit: string;
  commitDeps?: Partial<CommitMarketQuotesDeps>;
  updatedAtIso?: string;
}): Promise<AcceptResearchCandidateResult> {
  const demandStore =
    opts.demandStore ??
    normalizePriceDemandStore({
      schemaVersion: 1,
      updatedAt: opts.updatedAtIso ?? opts.candidate.retrievedAt,
      demands: [],
    });
  return acceptMaterialResearchCandidate({
    candidate: opts.candidate,
    demandStore,
    expectedUnit: opts.expectedUnit,
    commitDeps: opts.commitDeps,
    updatedAtIso: opts.updatedAtIso,
  });
}
