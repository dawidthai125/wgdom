/**
 * MARKET-MATERIAL-RESEARCH-01 B1 — runtime wire (PHASE 1 enqueue + PHASE 2 Owner execute).
 * REUSE Stage B orchestration + Stage A lease · ZERO live shop HTTP · ZERO auto-Accept.
 */

import type { CompanyCostRo } from "@/lib/cost-expert";
import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";
import {
  mapMaterialToMarketWork,
  resolveDemandProductIdentityExact,
} from "@/lib/pricing-expert/material-market-map";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { pushKeysToCloud } from "@/lib/cloud-sync";
import { supabaseAnonKey, supabaseFunctionsBase } from "@/config/supabase";
import {
  listActivePriceDemands,
  normalizePriceDemandStore,
  upsertPriceDemandCandidates,
} from "./demand-queue";
import type { CollectPriceDemandContext } from "./demand-collect";
import {
  loadPriceDemandStoreLocal,
  savePriceDemandStoreLocal,
  type RecordPriceDemandsResult,
} from "./demand-record";
import { resolveMarketLayerForDemand } from "./demand-resolve-layer";
import {
  PRICE_DEMAND_STORAGE_KEY,
  type PriceDemandCandidate,
  type PriceDemandMissingLayer,
  type PriceDemandRecord,
  type PriceDemandStore,
} from "./demand-types";
import { evaluateMaterialCache, isCooldownActive, setCooldown } from "./market-material-research-cache";
import { dedupeNeededMaterialKeys } from "./market-material-research-identity";
import { assertMaterialResearchAllowed } from "@/lib/intelligent-estimator";
import {
  MMR_DEFAULT_COOLDOWN_MS,
  MMR_DEFAULT_LEASE_MS,
  MMR_MAX_ACTIVE_CLAIMS_PER_PASS,
  orchestrateMaterialResearch,
} from "./market-material-research-orchestrate";
import { resolveMmr02Phase2Provider } from "./market-material-research-02-provider";
import type {
  MaterialCacheUsability,
  MaterialResearchCooldownMap,
  MaterialResearchLeasePort,
  MaterialResearchProvider,
  NeededMaterialLine,
} from "./market-material-research-types";
import type { PriceCandidate } from "./price-candidate-types";

/** Session/ephemeral cooldown — NOT a new DATA_KEY. */
const sessionCooldown: MaterialResearchCooldownMap = {
  untilByMaterialKey: new Map(),
};

export function getMaterialResearchSessionCooldown(): MaterialResearchCooldownMap {
  return sessionCooldown;
}

export function resetMaterialResearchSessionCooldownForTests(): void {
  sessionCooldown.untilByMaterialKey.clear();
}

export function loadCatalogWorksById(): Map<string, CatalogWork> {
  try {
    const store = loadWorkCatalogStoreLocal();
    return new Map(
      [...store.catalogs.wroclaw.works, ...store.catalogs.dolnyslask.works].map((w) => [w.id, w]),
    );
  } catch {
    return new Map();
  }
}

function resolveIdentity(
  materialKey: string,
  namePl: string | null | undefined,
  unit: string | null | undefined,
  peMappedWorkId?: string | null,
): { materialKey: string; catalogWorkId: string | null; namePl: string; unit: string } {
  const identity = resolveDemandProductIdentityExact({
    materialKey,
    namePl: namePl || null,
    unit: unit || null,
  });
  const map = mapMaterialToMarketWork(materialKey);
  const peWork =
    typeof peMappedWorkId === "string" && peMappedWorkId.trim() ? peMappedWorkId.trim() : null;
  const catalogWorkId =
    identity?.catalogWorkId ?? peWork ?? map?.candidateWorkIds?.[0] ?? map?.workId ?? null;
  return {
    materialKey: identity?.materialKey ?? materialKey,
    catalogWorkId,
    namePl: identity?.labelPl || namePl || map?.labelPl || materialKey,
    unit: unit || "",
  };
}

/**
 * BOM (+ PE keys) → NeededMaterialLine[] before dedup.
 * Qty is NOT copied — research is unit-price identity only.
 */
export function buildNeededMaterialLinesFromExperts(opts: {
  execution: ExecutionExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  region: string;
  tenderId?: string | null;
}): NeededMaterialLine[] {
  const bomMats = opts.execution.bom?.materials ?? [];
  const peByKey = new Map(opts.pricing.lines.map((l) => [l.materialKey, l] as const));
  const keys = new Set<string>();
  for (const m of bomMats) keys.add(m.materialKey);
  for (const l of opts.pricing.lines) keys.add(l.materialKey);

  const lines: NeededMaterialLine[] = [];
  for (const materialKey of keys) {
    const bom = bomMats.find((m) => m.materialKey === materialKey);
    const pe = peByKey.get(materialKey);
    const id = resolveIdentity(
      materialKey,
      pe?.namePl || bom?.namePl,
      pe?.unit || bom?.unit,
      pe?.mappedWorkId,
    );
    lines.push({
      materialKey: id.materialKey,
      catalogWorkId: id.catalogWorkId || "",
      namePl: id.namePl,
      unit: id.unit,
      region: opts.region,
      tenderId: opts.tenderId ?? null,
    });
  }
  return lines;
}

export interface Phase1EnqueueResult extends RecordPriceDemandsResult {
  uniqueNeeds: number;
  reusedCurrent: number;
  marketDemandsEnqueued: number;
  providerCalls: 0;
  leaseClaims: 0;
  decisions: Array<{
    materialKey: string;
    usability: MaterialCacheUsability;
    action: "REUSE" | "DEMAND" | "PURCHASE_ONLY" | "CLASSIFICATION_HOLD";
  }>;
}

/**
 * PHASE 1 — cache-first enqueue ONLY (sync · fail-soft · no provider · no lease).
 * CURRENT → REUSE (no market demand). STALE/MISSING → MARKET demand.
 * Does NOT use pe.marketPricePln > 0 as CURRENT gate.
 */
export function enqueueMaterialResearchPhase1(opts: {
  execution: ExecutionExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
  context?: CollectPriceDemandContext;
  worksById?: ReadonlyMap<string, CatalogWork>;
  demandStore?: PriceDemandStore;
  nowMs?: number;
  pushCloud?: boolean;
  /** When true (default), persist to localStorage unless demandStore injected for tests. */
  persistLocal?: boolean;
}): Phase1EnqueueResult {
  const empty = (): Phase1EnqueueResult => ({
    store: normalizePriceDemandStore(null),
    changed: false,
    upserted: 0,
    resolved: 0,
    activeCount: 0,
    ok: true,
    uniqueNeeds: 0,
    reusedCurrent: 0,
    marketDemandsEnqueued: 0,
    providerCalls: 0,
    leaseClaims: 0,
    decisions: [],
  });

  try {
    const region = String(opts.context?.region || "wroclaw").trim() || "wroclaw";
    const requestedAt = opts.context?.requestedAt ?? new Date().toISOString();
    const parsedRequested = Date.parse(requestedAt);
    const nowMs = opts.nowMs ?? (Number.isFinite(parsedRequested) ? parsedRequested : Date.now());
    const tenderId = opts.context?.tenderId?.trim() || null;
    const worksById = opts.worksById ?? loadCatalogWorksById();
    const persistLocal = opts.persistLocal !== false && !opts.demandStore;
    let store = normalizePriceDemandStore(opts.demandStore ?? loadPriceDemandStoreLocal());

    const lines = buildNeededMaterialLinesFromExperts({
      execution: opts.execution,
      pricing: opts.pricing,
      region,
      tenderId,
    });
    for (const line of opts.context?.exactAliasLines ?? []) {
      const identity = resolveDemandProductIdentityExact({
        namePl: line.namePl,
        unit: line.unit,
        catalogWorkId: line.catalogWorkId ?? null,
      });
      if (!identity) continue;
      lines.push({
        materialKey: identity.materialKey,
        catalogWorkId: identity.catalogWorkId,
        namePl: identity.labelPl,
        unit: line.unit,
        region,
        tenderId,
      });
    }

    const unique = dedupeNeededMaterialKeys(lines);
    const decisions: Phase1EnqueueResult["decisions"] = [];
    const marketCandidates: PriceDemandCandidate[] = [];
    const purchaseOnlyCandidates: PriceDemandCandidate[] = [];
    const currentKeys: string[] = [];
    let reusedCurrent = 0;
    let changed = false;
    let upserted = 0;
    let resolved = 0;

    for (const need of unique) {
      const cache = evaluateMaterialCache({
        materialKey: need.materialKey,
        catalogWorkId: need.catalogWorkId || null,
        region: need.region,
        worksById,
        nowMs,
      });
      const purchaseOk =
        (opts.company.purchaseByMaterialKey[need.materialKey]?.unitPricePln ?? 0) > 0;

      // CACHE FIRST — CURRENT before DIY gate / demand (IK-P1: mat.inv.* may REUSE PM)
      if (cache.usability === "CURRENT") {
        reusedCurrent += 1;
        currentKeys.push(need.materialKey);
        if (!purchaseOk) {
          decisions.push({
            materialKey: need.materialKey,
            usability: "CURRENT",
            action: "PURCHASE_ONLY",
          });
          purchaseOnlyCandidates.push({
            materialKey: need.materialKey,
            catalogWorkId: need.catalogWorkId || null,
            namePl: need.namePl,
            unit: need.unit,
            region: need.region,
            missingLayer: "PURCHASE_MISSING",
            tenderId,
            requestedAt,
            reason: "PURCHASE MISSING · market CURRENT (reuse)",
          });
        } else {
          decisions.push({
            materialKey: need.materialKey,
            usability: "CURRENT",
            action: "REUSE",
          });
        }
        continue;
      }

      // A3 + IK-P1 G2 — Classification Gate before demand enqueue (mat.inv.* → no DIY)
      const matGate = assertMaterialResearchAllowed({
        materialKey: need.materialKey,
        catalogWorkId: need.catalogWorkId || null,
        namePl: need.namePl,
        unit: need.unit,
      });
      if (!matGate.ok) {
        decisions.push({
          materialKey: need.materialKey,
          usability: "MISSING",
          action: "CLASSIFICATION_HOLD",
        });
        continue;
      }

      // STALE | MISSING — market research demand (PE numeric ≠ CURRENT)
      const missingLayer: PriceDemandMissingLayer = purchaseOk
        ? "MARKET_QUOTE_MISSING"
        : "BOTH_MISSING";
      decisions.push({
        materialKey: need.materialKey,
        usability: cache.usability,
        action: "DEMAND",
      });
      marketCandidates.push({
        materialKey: need.materialKey,
        catalogWorkId: need.catalogWorkId || null,
        namePl: need.namePl,
        unit: need.unit,
        region: need.region,
        missingLayer,
        tenderId,
        requestedAt,
        reason:
          cache.usability === "STALE"
            ? "MARKET PRICE STALE — refresh demand (PE numeric ≠ CURRENT)"
            : "MARKET PRICE MISSING",
      });
    }

    if (marketCandidates.length > 0) {
      const up = upsertPriceDemandCandidates(store, marketCandidates);
      store = up.store;
      changed = changed || up.changed;
      upserted += up.upserted;
      resolved += up.resolved;
    }
    if (purchaseOnlyCandidates.length > 0) {
      const up = upsertPriceDemandCandidates(store, purchaseOnlyCandidates);
      store = up.store;
      changed = changed || up.changed;
      upserted += up.upserted;
      resolved += up.resolved;
    }

    // Resolve MARKET layer for CURRENT keys (does not invent Purchase)
    for (const mk of currentKeys) {
      const need = unique.find((u) => u.materialKey === mk);
      const r = resolveMarketLayerForDemand(store, {
        materialKey: mk,
        catalogWorkId: need?.catalogWorkId || null,
        region,
        resolvedAt: requestedAt,
      });
      store = r.store;
      changed = changed || r.changed;
      if (r.resolved > 0) resolved += r.resolved;
    }

    if (changed && persistLocal) {
      savePriceDemandStoreLocal(store);
      if (opts.pushCloud && typeof window !== "undefined") {
        void pushKeysToCloud([PRICE_DEMAND_STORAGE_KEY], [store]).catch(() => {
          /* soft */
        });
      }
    }

    return {
      store,
      changed,
      upserted,
      resolved,
      activeCount: listActivePriceDemands(store).length,
      ok: true,
      uniqueNeeds: unique.length,
      reusedCurrent,
      marketDemandsEnqueued: marketCandidates.length,
      providerCalls: 0,
      leaseClaims: 0,
      decisions,
    };
  } catch (e) {
    return {
      ...empty(),
      ok: false,
      error: String((e as Error)?.message || e),
    };
  }
}

/** Client adapter → existing Stage A Edge lease (no new endpoint). */
export function createEdgeResearchLeasePort(opts?: {
  baseUrl?: string;
  anonKey?: string;
  fetchImpl?: typeof fetch;
}): MaterialResearchLeasePort {
  const base = (opts?.baseUrl || supabaseFunctionsBase || "").replace(/\/$/, "");
  const anon = opts?.anonKey || supabaseAnonKey || "";
  const fetchImpl = opts?.fetchImpl || fetch;
  return {
    async claim(input) {
      if (!base || !anon) {
        return { acquired: false, reason: "supabase_not_configured", job: null };
      }
      const res = await fetchImpl(`${base}/research-job-claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anon}`,
          apikey: anon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          researchJobId: input.researchJobId,
          claimantId: input.claimantId,
          leaseMs: input.leaseMs,
        }),
      });
      const json = (await res.json()) as {
        acquired?: boolean;
        reason?: string | null;
        job?: { researchJobId: string; claimantId: string; status: string } | null;
      };
      return {
        acquired: json.acquired === true,
        reason: json.reason ?? null,
        job: json.job ?? null,
      };
    },
    async release(input) {
      if (!base || !anon) return { released: false };
      const res = await fetchImpl(`${base}/research-job-release`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anon}`,
          apikey: anon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          researchJobId: input.researchJobId,
          claimantId: input.claimantId,
        }),
      });
      const json = (await res.json()) as { released?: boolean };
      return { released: json.released === true };
    },
  };
}

export interface Phase2ExecuteResult {
  ok: boolean;
  acquired: boolean;
  candidate: PriceCandidate | null;
  autoAccepted: false;
  error?: string;
  reason?: string;
  cooldownActive?: boolean;
}

/**
 * PHASE 2 — Owner CTA only. Claim Stage A + provider → CANDIDATE (never auto-accept).
 *
 * MARKET-MATERIAL-RESEARCH-02: default provider = Legal/D1-gated factory
 * (DISCONNECTED while Legal OPEN / D1 UNKNOWN / ADAPTER_NOT_IMPLEMENTED — ZERO live HTTP).
 * Harness may pass `provider` or `mockPriceNet` / `useMockForTests`.
 */
export async function executeMaterialResearchPhase2(opts: {
  demand: PriceDemandRecord;
  claimantId: string;
  lease: MaterialResearchLeasePort;
  worksById?: ReadonlyMap<string, CatalogWork>;
  cooldown?: MaterialResearchCooldownMap;
  nowMs?: number;
  /** Harness-only mock price — selects mock provider (not production default). */
  mockPriceNet?: number;
  /** Harness-only — force mock provider without inventing production PLN. */
  useMockForTests?: boolean;
  /** Explicit provider override (tests / future inject). */
  provider?: MaterialResearchProvider;
  leaseMs?: number;
  /**
   * PRICE-MEMORY-CATALOG-01 C4 — Owner force refresh even when CURRENT.
   * Does NOT auto-Accept (C5).
   */
  forceRefresh?: boolean;
}): Promise<Phase2ExecuteResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const cooldown = opts.cooldown ?? sessionCooldown;
  const worksById = opts.worksById ?? loadCatalogWorksById();

  // Cache CURRENT first — Price Memory reuse (not DIY Research). IK-P1: mat.inv.* may HIT PM.
  const cache = evaluateMaterialCache({
    materialKey: opts.demand.materialKey,
    catalogWorkId: opts.demand.catalogWorkId,
    region: opts.demand.region,
    worksById,
    nowMs,
  });
  if (cache.usability === "CURRENT" && !opts.forceRefresh) {
    return {
      ok: false,
      acquired: false,
      candidate: null,
      autoAccepted: false,
      error: "current_reuse_no_research",
    };
  }

  // A3 + IK-P1 G2 — Classification / invoice DIY forbid BEFORE lease / provider HTTP
  const matGate = assertMaterialResearchAllowed({
    materialKey: opts.demand.materialKey,
    catalogWorkId: opts.demand.catalogWorkId,
    namePl: opts.demand.normalizedName,
    unit: opts.demand.unit,
  });
  if (!matGate.ok) {
    return {
      ok: false,
      acquired: false,
      candidate: null,
      autoAccepted: false,
      error: `classification_gate:${matGate.classify.plane}`,
    };
  }

  if (isCooldownActive(cooldown.untilByMaterialKey, opts.demand.materialKey, nowMs)) {
    return {
      ok: false,
      acquired: false,
      candidate: null,
      autoAccepted: false,
      error: "cooldown_active",
      cooldownActive: true,
    };
  }

  const line: NeededMaterialLine = {
    materialKey: opts.demand.materialKey,
    catalogWorkId: opts.demand.catalogWorkId || "",
    namePl: opts.demand.normalizedName || opts.demand.materialKey,
    unit: opts.demand.unit || "",
    region: opts.demand.region || "wroclaw",
    tenderId: opts.demand.tenderIds[0] ?? null,
  };

  const resolved =
    opts.provider ??
    resolveMmr02Phase2Provider({
      nowMs,
      useMockForTests: opts.useMockForTests,
      mockPriceNet: opts.mockPriceNet,
    }).provider;

  const orch = await orchestrateMaterialResearch({
    lines: [line],
    worksById,
    demandStore: normalizePriceDemandStore({
      schemaVersion: 1,
      updatedAt: new Date(nowMs).toISOString(),
      demands: [opts.demand],
    }),
    lease: opts.lease,
    provider: resolved,
    claimantId: opts.claimantId,
    nowMs,
    cooldown,
    cooldownMs: MMR_DEFAULT_COOLDOWN_MS,
    leaseMs: opts.leaseMs ?? MMR_DEFAULT_LEASE_MS,
    executeResearch: true,
    maxActiveClaims: MMR_MAX_ACTIVE_CLAIMS_PER_PASS,
    forceRefresh: opts.forceRefresh === true,
  });

  // Persist cooldown mutations into session map
  for (const [k, v] of orch.cooldown.untilByMaterialKey) {
    cooldown.untilByMaterialKey.set(k, v);
  }

  const d0 = orch.decisions[0];
  if (!d0) {
    return { ok: false, acquired: false, candidate: null, autoAccepted: false, error: "no_decision" };
  }
  if (d0.action === "HELD_SINGLE_FLIGHT") {
    return {
      ok: false,
      acquired: false,
      candidate: null,
      autoAccepted: false,
      error: "held_by_other",
      reason: d0.job?.error,
    };
  }
  if (d0.action === "CANDIDATE_READY" && d0.job?.candidate) {
    return {
      ok: true,
      acquired: true,
      candidate: d0.job.candidate,
      autoAccepted: false,
    };
  }
  if (d0.action === "UNIT_REJECT" || d0.action === "FAILED") {
    setCooldown(cooldown.untilByMaterialKey, opts.demand.materialKey, nowMs, MMR_DEFAULT_COOLDOWN_MS);
    return {
      ok: false,
      acquired: orch.jobsClaimed > 0,
      candidate: d0.job?.candidate ?? null,
      autoAccepted: false,
      error: d0.job?.error || d0.action,
    };
  }
  return {
    ok: false,
    acquired: false,
    candidate: null,
    autoAccepted: false,
    error: d0.action,
  };
}

export { MMR_MAX_ACTIVE_CLAIMS_PER_PASS };
