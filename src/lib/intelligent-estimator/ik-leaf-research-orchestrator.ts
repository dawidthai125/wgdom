/**
 * Phase A — Leaf Research Orchestrator under COMPOUND parent.
 *
 * Thin dispatch only:
 *   assertLeaf* → runIkLaborGapResearch / executeMaterialResearchPhase2
 *
 * ZERO second Expert · ZERO second Orchestra · ZERO second Research Engine.
 * ZERO Owner Accept · ZERO OUR RATE / PM write · ZERO ACTIVE pack transition.
 * ZERO F5 / production BOM feed from DRAFT packs.
 *
 * Default: executeLeafResearch !== true → no research HTTP.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { TechnologyPack } from "@/lib/technology-foundation";
import { canPackFeedProductionBom } from "@/lib/technology-foundation";
import {
  findTechnologyPacksForWorkId,
  LEAF_RESEARCH_PACK_LIFECYCLES,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import {
  assertLeafLaborResearchAllowed,
  assertLeafMaterialResearchAllowed,
  IK_LEAF_RESEARCH_CALL_SITE,
  classifyEstimatorPricingPlane,
  type IkLeafLaborResearchAuth,
} from "./classification-gate";
import {
  runIkLaborGapResearch,
  type RunIkLaborGapResearchResult,
} from "@/lib/ik-pricing-orchestrator/labor-research-bridge";
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import {
  executeMaterialResearchPhase2,
  createEdgeResearchLeasePort,
  type Phase2ExecuteResult,
} from "@/lib/price-intelligence/market-material-research-wire";
import type { MaterialResearchLeasePort } from "@/lib/price-intelligence/market-material-research-types";
import type { PriceDemandRecord } from "@/lib/price-intelligence/demand-types";
import { buildPriceDemandId } from "@/lib/price-intelligence/demand-queue";

export type IkLeafResearchDomain = "labor" | "material";

export type IkLeafResearchDedupeInput = {
  tenderId: string;
  packId: string;
  packVersion: string;
  domain: IkLeafResearchDomain;
  leafId: string;
  unit: string;
};

export function buildIkLeafResearchDedupeKey(input: IkLeafResearchDedupeInput): string {
  return [
    String(input.tenderId || "").trim(),
    String(input.packId || "").trim(),
    String(input.packVersion || "").trim(),
    input.domain,
    String(input.leafId || "").trim(),
    String(input.unit || "").trim(),
  ].join("|");
}

/** Session done keys — one legal pass per leaf context (loop safety). */
const leafResearchSessionDone = new Set<string>();

export function clearIkLeafResearchSessionDedupeForTests(): void {
  leafResearchSessionDone.clear();
}

export function isIkLeafResearchSessionDone(dedupeKey: string): boolean {
  return leafResearchSessionDone.has(`done:${dedupeKey}`);
}

function markLeafResearchSessionDone(dedupeKey: string): void {
  leafResearchSessionDone.add(`done:${dedupeKey}`);
}

export type RunIkLeafLaborResearchInput = {
  item: Pick<TenderPipelineItem, "id" | "tenderId">;
  parentWorkId: string;
  leafWorkId: string;
  unit: WgdomCostUnit;
  namePl: string;
  pack: TechnologyPack;
  store: WorkCatalogStore;
  /**
   * Explicit orchestration only. Default / undefined / false → no research.
   * Must never be armed by ordinary Composite pass.
   */
  executeLeafResearch?: boolean;
  lineId?: string;
  dwellingId?: string | null;
  lp?: string;
  nowMs?: number;
  lookupPort?: WorkRateSelectiveLookupPort;
  forceRefresh?: boolean;
  bypassCooldown?: boolean;
};

export type RunIkLeafLaborResearchResult = {
  status:
    | "HOLD_EXECUTE_OFF"
    | "BLOCKED"
    | "SKIPPED_SESSION_DONE"
    | "EXECUTED";
  blockReason?: string;
  auth?: IkLeafLaborResearchAuth | null;
  research: RunIkLaborGapResearchResult | null;
  httpFetchCount: number;
  autoAcceptExecuted: false;
  ourRateWrite: false;
  productionBomFeedAllowed: boolean;
  dedupeKey: string;
};

export type RunIkLeafMaterialResearchInput = {
  item: Pick<TenderPipelineItem, "id" | "tenderId">;
  parentWorkId: string;
  materialKey: string;
  pack: TechnologyPack;
  demand: PriceDemandRecord;
  claimantId: string;
  lease?: MaterialResearchLeasePort;
  /** Explicit orchestration only. Default false → no research. */
  executeLeafResearch?: boolean;
  nowMs?: number;
  useMockForTests?: boolean;
  mockPriceNet?: number;
};

export type RunIkLeafMaterialResearchResult = {
  status: "HOLD_EXECUTE_OFF" | "BLOCKED" | "SKIPPED_SESSION_DONE" | "EXECUTED";
  blockReason?: string;
  research: Phase2ExecuteResult | null;
  httpFetchCount: number;
  autoAcceptExecuted: false;
  priceMemoryWrite: false;
  productionBomFeedAllowed: boolean;
  dedupeKey: string;
};

/**
 * Resolve leaf-identity packs for a COMPOUND parent (DRAFT…ACTIVE).
 * Does NOT imply production BOM feed — use canPackFeedProductionBom separately.
 */
export function resolveLeafResearchPacksForParent(opts: {
  parentWorkId: string;
  packs?: readonly TechnologyPack[];
}): TechnologyPack[] {
  return findTechnologyPacksForWorkId(
    opts.parentWorkId,
    opts.packs,
    LEAF_RESEARCH_PACK_LIFECYCLES,
  );
}

/**
 * Leaf Labor Research — COMPOUND parent + pack-bound leaf (incl. self-bind).
 */
export async function runIkLeafLaborResearch(
  input: RunIkLeafLaborResearchInput,
): Promise<RunIkLeafLaborResearchResult> {
  const tenderId = String(input.item.id || input.item.tenderId || "").trim();
  const dedupeKey = buildIkLeafResearchDedupeKey({
    tenderId,
    packId: input.pack.packId,
    packVersion: input.pack.packVersion,
    domain: "labor",
    leafId: input.leafWorkId,
    unit: input.unit,
  });
  const productionBomFeedAllowed = canPackFeedProductionBom(input.pack);

  const base = {
    auth: null as IkLeafLaborResearchAuth | null,
    research: null as RunIkLaborGapResearchResult | null,
    httpFetchCount: 0,
    autoAcceptExecuted: false as const,
    ourRateWrite: false as const,
    productionBomFeedAllowed,
    dedupeKey,
  };

  const parentPlane = classifyEstimatorPricingPlane({
    workId: input.parentWorkId,
  }).plane;
  if (parentPlane !== "COMPOUND") {
    return { ...base, status: "BLOCKED", blockReason: "LEAF_PARENT_NOT_COMPOUND" };
  }

  const gate = assertLeafLaborResearchAllowed({
    leafWorkId: input.leafWorkId,
    parentWorkId: input.parentWorkId,
    pack: input.pack,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
    namePl: input.namePl,
    unit: input.unit,
  });
  if (!gate.ok) {
    return { ...base, status: "BLOCKED", blockReason: gate.blockReason };
  }

  if (input.executeLeafResearch !== true) {
    return { ...base, status: "HOLD_EXECUTE_OFF", auth: gate.auth };
  }

  if (isIkLeafResearchSessionDone(dedupeKey)) {
    return { ...base, status: "SKIPPED_SESSION_DONE", auth: gate.auth };
  }

  // Bridge owns in-flight busy for job.dedupeKey — do NOT pre-mark here
  // (would cause immediate SKIPPED_SESSION_BUSY / false loop).
  const laborDedupe = `leaf|${dedupeKey}`;
  const research = await runIkLaborGapResearch({
    job: {
      domain: "labor",
      gapCode: "BRAK_STAWKI_ROBOT",
      tenderId,
      dwellingId: input.dwellingId ?? null,
      lineId: input.lineId || `leaf:${input.leafWorkId}`,
      lp: input.lp || "",
      workId: input.leafWorkId,
      unit: input.unit,
      namePl: input.namePl,
      dedupeKey: laborDedupe,
    },
    store: input.store,
    nowMs: input.nowMs,
    lookupPort: input.lookupPort,
    forceRefresh: input.forceRefresh,
    bypassCooldown: input.bypassCooldown,
    leafResearchAuth: {
      parentWorkId: input.parentWorkId,
      pack: input.pack,
      callSite: IK_LEAF_RESEARCH_CALL_SITE,
    },
  });
  markLeafResearchSessionDone(dedupeKey);
  const httpFetchCount =
    research && "httpFetchCount" in research ? Number(research.httpFetchCount) || 0 : 0;
  return {
    ...base,
    status: "EXECUTED",
    auth: gate.auth,
    research,
    httpFetchCount,
  };
}

/**
 * Leaf Material Research — pack.materials[] mat.* only (not parent COMPOUND workId).
 */
export async function runIkLeafMaterialResearch(
  input: RunIkLeafMaterialResearchInput,
): Promise<RunIkLeafMaterialResearchResult> {
  const tenderId = String(input.item.id || input.item.tenderId || "").trim();
  const unit = String(input.demand.unit || "").trim() || "kg";
  const dedupeKey = buildIkLeafResearchDedupeKey({
    tenderId,
    packId: input.pack.packId,
    packVersion: input.pack.packVersion,
    domain: "material",
    leafId: input.materialKey,
    unit,
  });
  const productionBomFeedAllowed = canPackFeedProductionBom(input.pack);
  const base = {
    research: null as Phase2ExecuteResult | null,
    httpFetchCount: 0,
    autoAcceptExecuted: false as const,
    priceMemoryWrite: false as const,
    productionBomFeedAllowed,
    dedupeKey,
  };

  const gate = assertLeafMaterialResearchAllowed({
    materialKey: input.materialKey,
    parentWorkId: input.parentWorkId,
    pack: input.pack,
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
    namePl: input.demand.normalizedName || input.materialKey,
    unit,
  });
  if (!gate.ok) {
    return { ...base, status: "BLOCKED", blockReason: gate.blockReason };
  }

  if (input.executeLeafResearch !== true) {
    return { ...base, status: "HOLD_EXECUTE_OFF" };
  }

  if (isIkLeafResearchSessionDone(dedupeKey)) {
    return { ...base, status: "SKIPPED_SESSION_DONE" };
  }

  const demand: PriceDemandRecord = {
    ...input.demand,
    materialKey: input.materialKey,
    demandId:
      input.demand.demandId
      || buildPriceDemandId({
        materialKey: input.materialKey,
        catalogWorkId: input.demand.catalogWorkId,
        region: input.demand.region,
      }),
  };

  const research = await executeMaterialResearchPhase2({
    demand,
    claimantId: input.claimantId,
    lease: input.lease ?? createEdgeResearchLeasePort(),
    nowMs: input.nowMs,
    useMockForTests: input.useMockForTests,
    mockPriceNet: input.mockPriceNet,
  });
  markLeafResearchSessionDone(dedupeKey);

  return {
    ...base,
    status: "EXECUTED",
    research,
    httpFetchCount: research?.httpFetchCount ?? 0,
  };
}
