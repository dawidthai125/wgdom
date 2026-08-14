/**
 * MARKET-MATERIAL-RESEARCH-01 Stage B — cache-first orchestration.
 *
 * NEEDED → dedup → L1 CURRENT=REUSE · STALE/MISSING=DEMAND
 * → cooldown → Hard SF claim (Stage A port) → mock candidate
 * → Owner Accept (separate) → Quotes persist
 *
 * ZERO live HTTP · ZERO Purchase · ZERO auto-Accept.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import {
  buildPriceDemandId,
  normalizePriceDemandStore,
  upsertPriceDemandCandidates,
} from "./demand-queue";
import type { PriceDemandStore } from "./demand-types";
import {
  evaluateMaterialCache,
  isCooldownActive,
  setCooldown,
} from "./market-material-research-cache";
import {
  buildMaterialResearchJobId,
  dedupeNeededMaterialKeys,
  MMR_DEFAULT_SOURCE_SCOPE,
} from "./market-material-research-identity";
import {
  MMR_MOCK_PROVIDER_ID,
  unitsCompatible,
} from "./market-material-research-provider";
import type {
  AcceptResearchCandidateResult,
  MaterialResearchCooldownMap,
  MaterialResearchJobView,
  MaterialResearchLeasePort,
  MaterialResearchLineResult,
  MaterialResearchOrchestrationResult,
  MaterialResearchProvider,
  NeededMaterialLine,
} from "./market-material-research-types";
import { acceptManualMarketPriceResearchPure } from "./manual-price-research";
import type { PriceCandidate } from "./price-candidate-types";
import type { CommitMarketQuotesDeps } from "@/lib/work-catalog/commit-market-quotes";
import { assertMaterialResearchAllowed } from "@/lib/intelligent-estimator";

/** Short failure cooldown — blocks request storm (not PE 90d window). */
export const MMR_DEFAULT_COOLDOWN_MS = 60_000;

/** Soft cap on newly claimed ACTIVE research jobs per orchestration pass. */
export const MMR_MAX_ACTIVE_CLAIMS_PER_PASS = 8;

export const MMR_DEFAULT_LEASE_MS = 120_000;

export interface OrchestrateMaterialResearchOpts {
  lines: readonly NeededMaterialLine[];
  worksById: ReadonlyMap<string, CatalogWork>;
  demandStore: PriceDemandStore;
  lease: MaterialResearchLeasePort;
  provider: MaterialResearchProvider;
  claimantId: string;
  nowMs?: number;
  cooldown?: MaterialResearchCooldownMap;
  cooldownMs?: number;
  leaseMs?: number;
  sourceScope?: string;
  /** When true, claim lease + run provider for DEMAND keys. Default true. */
  executeResearch?: boolean;
  maxActiveClaims?: number;
  /**
   * PRICE-MEMORY-CATALOG-01 C4 — Owner force refresh.
   * When true, CURRENT keys still enter research (bypass REUSE gate).
   * Default false — preserves PRICE MEMORY FIRST for all other callers.
   */
  forceRefresh?: boolean;
}

function emptyCooldown(): MaterialResearchCooldownMap {
  return { untilByMaterialKey: new Map() };
}

/**
 * Batch orchestration for one tender (or multi-user consumer set).
 * Dedup BEFORE demand/job · CURRENT → ZERO research.
 */
export async function orchestrateMaterialResearch(
  opts: OrchestrateMaterialResearchOpts,
): Promise<MaterialResearchOrchestrationResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const cooldown = opts.cooldown ?? emptyCooldown();
  const cooldownMs = opts.cooldownMs ?? MMR_DEFAULT_COOLDOWN_MS;
  const leaseMs = opts.leaseMs ?? MMR_DEFAULT_LEASE_MS;
  const sourceScope = opts.sourceScope ?? MMR_DEFAULT_SOURCE_SCOPE;
  const execute = opts.executeResearch !== false;
  const maxClaims = opts.maxActiveClaims ?? MMR_MAX_ACTIVE_CLAIMS_PER_PASS;

  const unique = dedupeNeededMaterialKeys(opts.lines);
  let demandStore = normalizePriceDemandStore(opts.demandStore);
  const decisions: MaterialResearchLineResult[] = [];
  let demandsCreated = 0;
  let jobsClaimed = 0;
  let jobsHeld = 0;
  let reusedCurrent = 0;
  let candidatesReady = 0;

  for (const need of unique) {
    // A3 — Classification Gate before cache/research (mat.* allowed; labor workId blocked)
    const matGate = assertMaterialResearchAllowed({
      materialKey: need.materialKey,
      catalogWorkId: need.catalogWorkId,
      namePl: need.namePl,
      unit: need.unit,
    });
    if (!matGate.ok) {
      jobsHeld += 1;
      decisions.push({
        materialKey: need.materialKey,
        usability: "MISSING",
        action: "CLASSIFICATION_HOLD",
        researchJobId: null,
        demand: null,
        job: null,
        reusedHit: null,
        externalResearchAttempted: false,
      });
      continue;
    }

    const cache = evaluateMaterialCache({
      materialKey: need.materialKey,
      catalogWorkId: need.catalogWorkId,
      region: need.region,
      worksById: opts.worksById,
      nowMs,
    });

    if (cache.usability === "CURRENT" && !opts.forceRefresh) {
      reusedCurrent += 1;
      decisions.push({
        materialKey: need.materialKey,
        usability: "CURRENT",
        action: "REUSE",
        researchJobId: null,
        demand: null,
        job: null,
        reusedHit: cache.hit,
        externalResearchAttempted: false,
      });
      continue;
    }

    // STALE | MISSING → demand (market layer)
    // C4 forceRefresh: CURRENT also enters demand + research
    const upsert = upsertPriceDemandCandidates(demandStore, [
      {
        materialKey: need.materialKey,
        catalogWorkId: need.catalogWorkId || null,
        namePl: need.namePl,
        unit: need.unit,
        region: need.region,
        missingLayer: "MARKET_QUOTE_MISSING",
        tenderId: need.tenderIds[0] ?? null,
        requestedAt: nowIso,
        reason:
          opts.forceRefresh && cache.usability === "CURRENT"
            ? "OWNER FORCE REFRESH — CURRENT bypass"
            : cache.usability === "STALE"
              ? "MARKET PRICE STALE — refresh demand"
              : "MARKET PRICE MISSING",
      },
    ]);
    demandStore = upsert.store;
    if (upsert.upserted > 0) demandsCreated += upsert.upserted;

    const demandId = buildPriceDemandId({
      materialKey: need.materialKey,
      catalogWorkId: need.catalogWorkId || null,
      region: need.region,
      missingLayer: "MARKET_QUOTE_MISSING",
    });
    const demand = demandStore.demands.find((d) => d.demandId === demandId) ?? null;

    const researchJobId = buildMaterialResearchJobId({
      materialKey: need.materialKey,
      sourceScope,
      regionScope: need.region,
    });

    if (isCooldownActive(cooldown.untilByMaterialKey, need.materialKey, nowMs)) {
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "COOLDOWN_SKIP",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "QUEUED",
          claimantId: null,
          demandId,
          candidate: null,
          accepted: false,
          persisted: false,
          error: "cooldown_active",
        },
        reusedHit: cache.hit,
        externalResearchAttempted: false,
      });
      continue;
    }

    if (!execute) {
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "DEMAND",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "DEMANDED",
          claimantId: null,
          demandId,
          candidate: null,
          accepted: false,
          persisted: false,
        },
        reusedHit: cache.hit,
        externalResearchAttempted: false,
      });
      continue;
    }

    if (jobsClaimed >= maxClaims) {
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "DEMAND",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "QUEUED",
          claimantId: null,
          demandId,
          candidate: null,
          accepted: false,
          persisted: false,
          error: "max_active_claims",
        },
        reusedHit: cache.hit,
        externalResearchAttempted: false,
      });
      continue;
    }

    const claim = await opts.lease.claim({
      researchJobId,
      claimantId: opts.claimantId,
      leaseMs,
    });

    if (!claim.acquired) {
      jobsHeld += 1;
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "HELD_SINGLE_FLIGHT",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "ACTIVE",
          claimantId: claim.job?.claimantId ?? null,
          demandId,
          candidate: null,
          accepted: false,
          persisted: false,
          error: claim.reason ?? "held_by_other",
        },
        reusedHit: cache.hit,
        externalResearchAttempted: false,
      });
      continue;
    }

    jobsClaimed += 1;

    // Live shops: connected=false → fail soft + cooldown. Mock is allowed offline.
    const isMockProvider = opts.provider.id === MMR_MOCK_PROVIDER_ID;
    if (!opts.provider.connected && !isMockProvider) {
      setCooldown(cooldown.untilByMaterialKey, need.materialKey, nowMs, cooldownMs);
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "FAILED",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "FAILED",
          claimantId: opts.claimantId,
          demandId,
          candidate: null,
          accepted: false,
          persisted: false,
          error: "provider_not_connected",
        },
        reusedHit: cache.hit,
        externalResearchAttempted: false,
      });
      continue;
    }

    const researched = await opts.provider.research({
      materialKey: need.materialKey,
      catalogWorkId: need.catalogWorkId,
      namePl: need.namePl,
      unit: need.unit,
      region: need.region,
      demandId,
      researchJobId,
      nowIso,
    });

    if (!researched.ok) {
      setCooldown(cooldown.untilByMaterialKey, need.materialKey, nowMs, cooldownMs);
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "FAILED",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "FAILED",
          claimantId: opts.claimantId,
          demandId,
          candidate: null,
          accepted: false,
          persisted: false,
          error: researched.error,
        },
        reusedHit: cache.hit,
        externalResearchAttempted: true,
      });
      continue;
    }

    if (researched.autoAccepted) {
      // Hard invariant — Stage B must never auto-accept
      throw new Error("AUTO_ACCEPT_FORBIDDEN");
    }

    if (!unitsCompatible(need.unit, researched.candidate.unit)) {
      setCooldown(cooldown.untilByMaterialKey, need.materialKey, nowMs, cooldownMs);
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "UNIT_REJECT",
        researchJobId,
        demand,
        job: {
          researchJobId,
          materialKey: need.materialKey,
          phase: "FAILED",
          claimantId: opts.claimantId,
          demandId,
          candidate: researched.candidate,
          accepted: false,
          persisted: false,
          error: "unit_mismatch_price_gap",
        },
        reusedHit: cache.hit,
        externalResearchAttempted: true,
      });
      continue;
    }

    candidatesReady += 1;
    const jobView: MaterialResearchJobView = {
      researchJobId,
      materialKey: need.materialKey,
      phase: "CANDIDATE",
      claimantId: opts.claimantId,
      demandId,
      candidate: researched.candidate,
      accepted: false,
      persisted: false,
    };
    decisions.push({
      materialKey: need.materialKey,
      usability: cache.usability,
      action: "CANDIDATE_READY",
      researchJobId,
      demand,
      job: jobView,
      reusedHit: cache.hit,
      externalResearchAttempted: true,
    });
  }

  return {
    uniqueMaterialKeys: unique.map((u) => u.materialKey),
    decisions,
    demandsCreated,
    jobsClaimed,
    jobsHeld,
    reusedCurrent,
    candidatesReady,
    demandStore,
    cooldown,
    perLineExternalForbidden: true,
  };
}

/**
 * Owner Accept → persist Market Quote (REUSE acceptManualMarketPriceResearchPure).
 * NEVER Purchase / company knowledge.
 */
export async function acceptMaterialResearchCandidate(opts: {
  candidate: PriceCandidate;
  demandStore: PriceDemandStore;
  expectedUnit: string;
  commitDeps?: Partial<CommitMarketQuotesDeps>;
  updatedAtIso?: string;
}): Promise<AcceptResearchCandidateResult> {
  if (!unitsCompatible(opts.expectedUnit, opts.candidate.unit)) {
    return {
      ok: false,
      accepted: false,
      persisted: false,
      wrotePurchase: false,
      wroteCompanyKnowledge: false,
      error: "unit_mismatch_price_gap",
      demandStore: opts.demandStore,
    };
  }

  const result = await acceptManualMarketPriceResearchPure({
    candidate: {
      ...opts.candidate,
      // Accept path still uses Quotes commit; provenance mock_test is allowed staging.
      provenance: opts.candidate.provenance === "mock_test" ? "mock_test" : "manual_owner",
    },
    demandStore: opts.demandStore,
    commitOptions: {
      updatedAtIso: opts.updatedAtIso ?? opts.candidate.retrievedAt,
      deps: opts.commitDeps,
    },
  });

  return {
    ok: result.ok,
    accepted: result.ok,
    persisted: result.ok && (result.commit?.status === "committed" || result.commit?.status === "noop"),
    wrotePurchase: false,
    wroteCompanyKnowledge: false,
    error: result.error,
    demandStore: result.nextDemandStore,
  };
}
