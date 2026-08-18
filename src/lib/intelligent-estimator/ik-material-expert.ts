/**
 * IK-MIGRATION-01 P6 — Material Expert orchestration over Master BOQ.
 *
 * Path (REUSE only):
 *   Master BOQ line
 *   → mapOfferBoqLine (Product Mapper)
 *   → resolveDemandProductIdentityExact (trusted product identity · 0 soft invent)
 *   → classifyEstimatorPricingPlane (A1) — line bucket only
 *   → evaluateMaterialCache / lookupPriceMemory (HIT → reuse)
 *      · with product identity: materialKey + catalogWorkId
 *      · P5.13 demand path: catalogWorkId only (empty materialKey — no fabricate mat.*)
 *   → executeMaterialResearchPhase2 (MISS only · executeResearch === true only · never auto-Accept)
 *      · product identity key OR demand.work.<workId> coordination key
 *   → Candidate → Owner Accept REQUIRED → Price Memory (Accept separate)
 *
 * P0: executeResearch requires explicit `=== true` (never `!== false` / undefined).
 * ZERO invent product/SKU/price from namePl alone · ZERO Labor rewrite · ZERO F5/Bid.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import {
  mapOfferBoqLine,
  type OfferBoqMappingContext,
} from "@/lib/tender-offer-boq-mapping";
import {
  resolveWorkIdentityFromOfferBoqLine,
  type ShadowWorkIdentityResolve,
} from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { isCenyMaterialow01Enabled } from "@/lib/ceny-materialow-01-flag";
import { resolveDemandProductIdentityExact } from "@/lib/pricing-expert/material-market-map";
import { evaluateMaterialCache } from "@/lib/price-intelligence/market-material-research-cache";
import {
  executeMaterialResearchPhase2,
  createEdgeResearchLeasePort,
  resetMaterialResearchSessionCooldownForTests,
  type Phase2ExecuteResult,
} from "@/lib/price-intelligence/market-material-research-wire";
import type {
  MaterialCacheDecision,
  MaterialResearchLeasePort,
  MaterialResearchProvider,
} from "@/lib/price-intelligence/market-material-research-types";
import type { PriceCandidate } from "@/lib/price-intelligence/price-candidate-types";
import type { PriceDemandRecord, PriceDemandStore } from "@/lib/price-intelligence/demand-types";
import {
  buildPriceDemandId,
  normalizePriceDemandStore,
} from "@/lib/price-intelligence/demand-queue";
import { acceptMaterialResearchCandidate } from "@/lib/price-intelligence/market-material-research-orchestrate";
import type { CommitMarketQuotesDeps } from "@/lib/work-catalog/commit-market-quotes";
import { isInvoicePurchaseMaterialKey } from "@/lib/price-intelligence/invoice-purchase-host";
import { classifyEstimatorPricingPlane } from "./classification-gate";
import type {
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";
import {
  runIkDocumentExpert,
  type IkDocumentExpertReport,
} from "./ik-document-expert";
import {
  IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE,
  IkP6MaterialBudget,
} from "./ik-p6-material-budget";
import type { DwellingLineProvenance } from "@/lib/multi-boq/types";

export type IkMaterialBucket =
  | "MATERIAL"
  | "LABOR"
  | "BOTH"
  | "UNRESOLVED"
  | "NON_COST";

export type IkMaterialPriceStatus =
  | "NONE"
  | "PRICE_MEMORY_HIT"
  | "PRICE_MEMORY_MISS"
  | "CANDIDATE_OWNER_ACCEPT_REQUIRED"
  | "RESEARCH_GAP"
  | "RESEARCH_BLOCKED"
  | "RESEARCH_COOLDOWN"
  | "RESEARCH_SKIPPED"
  | "RESEARCH_HELD";

export type IkMaterialIdentity = {
  materialKey: string;
  catalogWorkId: string;
  labelPl: string;
  via: "materialKey" | "alias" | "catalogWorkId";
};

export type IkMaterialExpertLineResult = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  unit: string;
  branch: string | null;
  sourceDocumentId: string | null;
  sourceLineKey: string | null;
  lineProvenance: DwellingLineProvenance | null;
  catalogWorkId: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
  workIdentity: ShadowWorkIdentityResolve;
  materialIdentity: IkMaterialIdentity | null;
  plane: EstimatorPricingPlane;
  classify: EstimatorClassifyResult;
  bucket: IkMaterialBucket;
  priceStatus: IkMaterialPriceStatus;
  priceMemoryHitPln: number | null;
  researchKey: string | null;
  candidate: PriceCandidate | null;
  researchError: string | null;
};

export type IkMaterialExpertCounts = {
  inputLineCount: number;
  outputLineCount: number;
  materialIdentityResolved: number;
  material: number;
  labor: number;
  both: number;
  unresolved: number;
  nonCost: number;
  priceMemoryHit: number;
  priceMemoryMiss: number;
  researchCalls: number;
  concreteProducts: number;
  evidence: number;
  candidates: number;
  ownerAcceptRequired: number;
  accepted: number;
};

export type IkMaterialExpertReport = {
  tenderId: string;
  status: "ready" | "blocked" | "partial";
  counts: IkMaterialExpertCounts;
  reconciliation: {
    ok: boolean;
    unexplainedLoss: number;
    unexplainedDuplication: number;
    reasons: string[];
  };
  dwellingPreservation: boolean;
  branchPreservation: boolean;
  provenancePreservation: boolean;
  researchBoundaryOk: boolean;
  autoAcceptExecuted: false;
  pricingExecuted: false;
  laborResearchExecuted: false;
  lines: IkMaterialExpertLineResult[];
  researchKeys: string[];
  reasons: string[];
};

function bucketFrom(
  workIdentity: ShadowWorkIdentityResolve,
  plane: EstimatorPricingPlane,
): IkMaterialBucket {
  if (
    workIdentity.status === "NOISE_SKIP"
    || workIdentity.status === "EQUIPMENT_GAP"
    || workIdentity.status === "AUXILIARY_GAP"
    || workIdentity.status === "TRANSPORT_GAP"
  ) {
    return "NON_COST";
  }
  switch (plane) {
    case "MATERIAL":
      return "MATERIAL";
    case "LABOR":
      return "LABOR";
    case "COMPOUND":
      return "BOTH";
    case "UNKNOWN":
    default:
      // Trusted material identity alone does not invent plane — stay UNRESOLVED
      // unless A1 already classified. Line coverage still counts every line.
      if (
        workIdentity.status === "AMBIGUOUS"
        || workIdentity.status === "NO_IDENTITY"
        || workIdentity.status === "INVALID_UNIT"
        || workIdentity.status !== "OK"
      ) {
        return "UNRESOLVED";
      }
      return "UNRESOLVED";
  }
}

/** Autonomous Research only when plane === MATERIAL ∧ bucket === MATERIAL (A08-P2 F1). */
export function researchEligible(
  materialIdentity: IkMaterialIdentity | null,
  bucket: IkMaterialBucket,
  plane: EstimatorPricingPlane,
): boolean {
  if (!materialIdentity) return false;
  if (bucket === "NON_COST") return false;
  if (plane === "LABOR" || bucket === "LABOR") return false;
  // IK-P1 G2: invoice purchase materials never enter DIY Research pending.
  if (isInvoicePurchaseMaterialKey(materialIdentity.materialKey)) return false;
  // COMPOUND/BOTH/UNKNOWN/UNRESOLVED = HOLD — product identity alone is not enough.
  return plane === "MATERIAL" && bucket === "MATERIAL";
}

/**
 * P5.13 — Material Demand research without pre-existing product materialKey.
 * Coordination key only (`demand.work.<workId>`) — NOT a product invent.
 */
export const MATERIAL_DEMAND_RESEARCH_KEY_PREFIX = "demand.work." as const;

export function buildMaterialDemandResearchKey(workId: string): string {
  const id = String(workId || "").trim();
  return id ? `${MATERIAL_DEMAND_RESEARCH_KEY_PREFIX}${id}` : "";
}

export function isMaterialDemandResearchKey(key: string | null | undefined): boolean {
  return String(key || "").startsWith(MATERIAL_DEMAND_RESEARCH_KEY_PREFIX);
}

/** MATERIAL plane + trusted Work Identity — Supplier Research entry (no mat.* required). */
function demandResearchEligible(
  workId: string | null,
  bucket: IkMaterialBucket,
  plane: EstimatorPricingPlane,
): boolean {
  if (!workId?.trim()) return false;
  if (bucket === "NON_COST") return false;
  if (plane === "LABOR" || bucket === "LABOR") return false;
  // P5.13 scope: MATERIAL demand only (COMPOUND still requires product identity / TechnologyPack).
  return plane === "MATERIAL" && bucket === "MATERIAL";
}

function emptyCounts(input: number): IkMaterialExpertCounts {
  return {
    inputLineCount: input,
    outputLineCount: 0,
    materialIdentityResolved: 0,
    material: 0,
    labor: 0,
    both: 0,
    unresolved: 0,
    nonCost: 0,
    priceMemoryHit: 0,
    priceMemoryMiss: 0,
    researchCalls: 0,
    concreteProducts: 0,
    evidence: 0,
    candidates: 0,
    ownerAcceptRequired: 0,
    accepted: 0,
  };
}

function buildDemand(opts: {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  region: string;
  tenderId: string;
  nowIso: string;
}): PriceDemandRecord {
  const demandId = buildPriceDemandId({
    materialKey: opts.materialKey,
    catalogWorkId: opts.catalogWorkId,
    region: opts.region,
    missingLayer: "MARKET_QUOTE_MISSING",
  });
  return {
    demandId,
    materialKey: opts.materialKey,
    catalogWorkId: opts.catalogWorkId,
    normalizedName: opts.namePl || opts.materialKey,
    unit: opts.unit || "szt",
    region: opts.region,
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    priority: "MEDIUM",
    occurrenceCount: 1,
    tenderIds: opts.tenderId ? [opts.tenderId] : [],
    firstRequestedAt: opts.nowIso,
    lastRequestedAt: opts.nowIso,
    reason: "IK-MIGRATION-01 P5 — Price Memory MISS",
  };
}

/**
 * Material Expert pass over READY Master BOQ.
 * Research when:
 *   (A) trusted product identity + Price Memory MISS, OR
 *   (B) P5.13 Material Demand (MATERIAL plane + workId, no mat.*) + no CURRENT work quotes
 * Dedup: materialKey|region or demand.work.<workId>|region. Never auto-Accept.
 */
export async function runIkMasterBoqMaterialExpert(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  expert?: IkDocumentExpertReport | null;
  store?: WorkCatalogStore;
  works?: CatalogWork[];
  /** Default false — Phase2 only when executeResearch === true (P6 MODE B). */
  executeResearch?: boolean;
  lease?: MaterialResearchLeasePort;
  provider?: MaterialResearchProvider;
  mockPriceNet?: number;
  useMockForTests?: boolean;
  nowMs?: number;
  forceRefresh?: boolean;
  region?: string;
}): Promise<IkMaterialExpertReport> {
  const item = opts.item;
  const tenderId = item.id || item.tenderId || "";
  const expert =
    opts.expert
    ?? runIkDocumentExpert({ item, package: opts.package ?? null });
  const nowMs = opts.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const region = opts.region || "wroclaw";
  const executeResearch = opts.executeResearch === true;
  const autoAcceptExecuted = false as const;
  const pricingExecuted = false as const;
  const laborResearchExecuted = false as const;
  const reasons: string[] = [];

  if (!expert.masterBoq.readyForExperts) {
    return {
      tenderId,
      status: "blocked",
      counts: emptyCounts(expert.masterBoq.lineCount),
      reconciliation: {
        ok: false,
        unexplainedLoss: expert.masterBoq.lineCount,
        unexplainedDuplication: 0,
        reasons: ["MASTER_BOQ_NOT_READY"],
      },
      dwellingPreservation: false,
      branchPreservation: false,
      provenancePreservation: false,
      researchBoundaryOk: true,
      autoAcceptExecuted,
      pricingExecuted,
      laborResearchExecuted,
      lines: [],
      researchKeys: [],
      reasons: ["MASTER_BOQ_NOT_READY", ...expert.reasons.slice(0, 4)],
    };
  }

  const store = opts.store ?? loadWorkCatalogStoreLocal();
  const works =
    opts.works ?? listActiveWorksForRegion(store, store.activeRegion);
  const worksById = new Map(works.map((w) => [w.id, w]));
  const mapCtx: OfferBoqMappingContext = {
    works,
    mappedAt: nowIso,
    documentContext: item.title ?? null,
    cenyMaterialowUplift: isCenyMaterialow01Enabled(),
  };

  const inputRefs = expert.masterBoqLines;
  const inputLineCount = expert.masterBoq.lineCount;
  if (inputRefs.length !== inputLineCount) {
    reasons.push(
      `MASTER_LINES_COUNT_MISMATCH lineCount=${inputLineCount} refs=${inputRefs.length}`,
    );
  }

  type PendingResearch = {
    materialKey: string;
    catalogWorkId: string;
    namePl: string;
    unit: string;
    lineIds: string[];
    dwellingId: string;
  };
  const pendingByKey = new Map<string, PendingResearch>();
  const lines: IkMaterialExpertLineResult[] = [];

  for (const ref of inputRefs) {
    const structural: OfferBoqLine = ref.line;
    const mapped = mapOfferBoqLine(structural, mapCtx);
    const workIdentity = resolveWorkIdentityFromOfferBoqLine(mapped);
    const workId = workIdentity.workId;
    const classify = classifyEstimatorPricingPlane({
      workId,
      materialKey: null,
      namePl: structural.description,
      unit: structural.unit,
      lineKindHint: mapped.workCategory,
    });
    const bucket = bucketFrom(workIdentity, classify.plane);
    const branch =
      (ref.provenance?.branchHint && ref.provenance.branchHint !== "unknown"
        ? ref.provenance.branchHint
        : null)
      ?? (structural.workCategory ? String(structural.workCategory) : null);

    // Trusted material identity ONLY — exact materialKey / alias / product catalogWorkId.
    // namePl alone never invents SKU / brand / price.
    const resolvedExact = resolveDemandProductIdentityExact({
      catalogWorkId: workId ?? mapped.catalogWorkId ?? null,
      namePl: structural.description,
      unit: structural.unit,
    });
    const materialIdentity: IkMaterialIdentity | null = resolvedExact
      ? {
          materialKey: resolvedExact.materialKey,
          catalogWorkId: resolvedExact.catalogWorkId,
          labelPl: resolvedExact.labelPl,
          via: resolvedExact.via,
        }
      : null;

    let priceStatus: IkMaterialPriceStatus = "NONE";
    let priceMemoryHitPln: number | null = null;
    let researchKey: string | null = null;
    let cacheDecision: MaterialCacheDecision | null = null;

    if (materialIdentity && researchEligible(materialIdentity, bucket, classify.plane)) {
      // (A) Existing product-identity path — unchanged.
      cacheDecision = evaluateMaterialCache({
        materialKey: materialIdentity.materialKey,
        catalogWorkId: materialIdentity.catalogWorkId,
        region,
        worksById,
        nowMs,
      });
      if (cacheDecision.usability === "CURRENT") {
        priceStatus = "PRICE_MEMORY_HIT";
        priceMemoryHitPln = cacheDecision.hit?.price ?? null;
      } else {
        priceStatus = "PRICE_MEMORY_MISS";
        researchKey = `${materialIdentity.materialKey}|${region}`;
        if (executeResearch) {
          const existing = pendingByKey.get(researchKey);
          if (existing) {
            existing.lineIds.push(structural.lineId);
          } else {
            pendingByKey.set(researchKey, {
              materialKey: materialIdentity.materialKey,
              catalogWorkId: materialIdentity.catalogWorkId,
              namePl: materialIdentity.labelPl || structural.description,
              unit: structural.unit,
              lineIds: [structural.lineId],
              dwellingId: ref.dwellingId,
            });
          }
        } else {
          priceStatus = "RESEARCH_SKIPPED";
        }
      }
    } else if (
      !materialIdentity
      && workId
      && demandResearchEligible(workId, bucket, classify.plane)
    ) {
      // (B) P5.13 — Material Demand without product materialKey.
      // Price Memory by catalogWorkId only (no fabricated mat.*). CURRENT → HIT; else research.
      cacheDecision = evaluateMaterialCache({
        materialKey: "",
        catalogWorkId: workId,
        region,
        worksById,
        nowMs,
      });
      if (cacheDecision.usability === "CURRENT") {
        priceStatus = "PRICE_MEMORY_HIT";
        priceMemoryHitPln = cacheDecision.hit?.price ?? null;
      } else {
        priceStatus = "PRICE_MEMORY_MISS";
        const demandKey = buildMaterialDemandResearchKey(workId);
        researchKey = `${demandKey}|${region}`;
        if (executeResearch) {
          const existing = pendingByKey.get(researchKey);
          if (existing) {
            existing.lineIds.push(structural.lineId);
          } else {
            pendingByKey.set(researchKey, {
              materialKey: demandKey,
              catalogWorkId: workId,
              namePl: structural.description,
              unit: structural.unit,
              lineIds: [structural.lineId],
              dwellingId: ref.dwellingId,
            });
          }
        } else {
          priceStatus = "RESEARCH_SKIPPED";
        }
      }
    }

    lines.push({
      tenderId,
      dwellingId: ref.dwellingId,
      lineId: structural.lineId,
      lp: structural.lp,
      description: structural.description,
      quantity: structural.quantity,
      unit: structural.unit,
      branch,
      sourceDocumentId: ref.provenance?.sourceDocumentId ?? null,
      sourceLineKey: ref.provenance?.sourceLineKey ?? null,
      lineProvenance: ref.provenance,
      catalogWorkId: workId ?? mapped.catalogWorkId ?? materialIdentity?.catalogWorkId ?? null,
      matchMethod: mapped.matchMethod ?? null,
      matchConfidence: mapped.matchConfidence ?? null,
      workIdentity,
      materialIdentity,
      plane: classify.plane,
      classify,
      bucket,
      priceStatus,
      priceMemoryHitPln,
      researchKey,
      candidate: null,
      researchError: null,
    });
  }

  const researchKeys: string[] = [];
  const researchByKey = new Map<string, Phase2ExecuteResult>();
  let researchBoundaryOk = true;
  const lease = opts.lease ?? createEdgeResearchLeasePort();
  const budget = new IkP6MaterialBudget();

  for (const [key, job] of pendingByKey) {
    researchKeys.push(key);
    if (!budget.canClaim(IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE)) {
      const reason = budget.denyReason(IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE) ?? "CLAIM_CEILING";
      researchByKey.set(key, {
        ok: false,
        acquired: false,
        candidate: null,
        autoAccepted: false,
        error: `BUDGET_EXCEEDED:${reason}`,
      });
      reasons.push(`BUDGET_EXCEEDED key=${key} reason=${reason}`);
      continue;
    }
    const demand = buildDemand({
      materialKey: job.materialKey,
      catalogWorkId: job.catalogWorkId,
      namePl: job.namePl,
      unit: job.unit,
      region,
      tenderId,
      nowIso,
    });
    const result = await executeMaterialResearchPhase2({
      demand,
      claimantId: `ik-p6-${tenderId.slice(0, 8) || "t"}`,
      lease,
      worksById,
      nowMs,
      provider: opts.provider,
      mockPriceNet: opts.mockPriceNet,
      useMockForTests: opts.useMockForTests,
      forceRefresh: opts.forceRefresh,
    });
    budget.recordClaim(IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE);
    researchByKey.set(key, result);
  }

  for (const row of lines) {
    if (!row.researchKey) continue;
    const res = researchByKey.get(row.researchKey);
    if (!res) continue;
    row.researchError = res.error ?? null;
    if (res.error === "current_reuse_no_research") {
      row.priceStatus = "PRICE_MEMORY_HIT";
      continue;
    }
    if (res.error === "cooldown_active") {
      row.priceStatus = "RESEARCH_COOLDOWN";
      continue;
    }
    if (res.error === "held_by_other") {
      row.priceStatus = "RESEARCH_HELD";
      continue;
    }
    if (res.error?.startsWith("classification_gate:")) {
      row.priceStatus = "RESEARCH_BLOCKED";
      researchBoundaryOk = false;
      reasons.push(`RESEARCH_BOUNDARY_FAIL line=${row.lineId}`);
      continue;
    }
    if (res.ok && res.candidate) {
      row.priceStatus = "CANDIDATE_OWNER_ACCEPT_REQUIRED";
      row.candidate = res.candidate;
      continue;
    }
    row.priceStatus = "RESEARCH_GAP";
  }

  // Boundary: product-identity research OR P5.13 demand.work research on MATERIAL only.
  // Forbid LABOR research · forbid UNKNOWN invent · forbid non-demand research without identity.
  for (const row of lines) {
    if (
      !row.materialIdentity
      && row.researchKey
      && researchByKey.has(row.researchKey)
    ) {
      const demandOk =
        isMaterialDemandResearchKey(row.researchKey.split("|")[0] ?? "")
        && row.plane === "MATERIAL"
        && row.bucket === "MATERIAL";
      if (!demandOk) {
        researchBoundaryOk = false;
        reasons.push(`RESEARCH_WITHOUT_MATERIAL_IDENTITY line=${row.lineId}`);
      }
    }
    if (
      (row.bucket === "LABOR" || row.plane === "LABOR")
      && row.researchKey
      && researchByKey.has(row.researchKey)
    ) {
      researchBoundaryOk = false;
      reasons.push(`RESEARCH_ON_LABOR_PLANE line=${row.lineId}`);
    }
    if (
      row.bucket === "UNRESOLVED"
      && !row.materialIdentity
      && row.researchKey
      && researchByKey.has(row.researchKey)
    ) {
      researchBoundaryOk = false;
      reasons.push(`RESEARCH_ON_UNKNOWN_IDENTITY line=${row.lineId}`);
    }
  }

  const counts = emptyCounts(inputLineCount);
  counts.outputLineCount = lines.length;
  for (const row of lines) {
    if (row.materialIdentity) counts.materialIdentityResolved += 1;
    switch (row.bucket) {
      case "MATERIAL":
        counts.material += 1;
        break;
      case "LABOR":
        counts.labor += 1;
        break;
      case "BOTH":
        counts.both += 1;
        break;
      case "NON_COST":
        counts.nonCost += 1;
        break;
      default:
        counts.unresolved += 1;
    }
    if (row.priceStatus === "PRICE_MEMORY_HIT") counts.priceMemoryHit += 1;
    if (
      row.priceStatus === "PRICE_MEMORY_MISS"
      || row.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
      || row.priceStatus === "RESEARCH_GAP"
      || row.priceStatus === "RESEARCH_BLOCKED"
      || row.priceStatus === "RESEARCH_COOLDOWN"
      || row.priceStatus === "RESEARCH_SKIPPED"
      || row.priceStatus === "RESEARCH_HELD"
    ) {
      counts.priceMemoryMiss += 1;
    }
    if (row.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && row.candidate) {
      counts.candidates += 1;
      counts.evidence += 1;
      counts.concreteProducts += 1;
      counts.ownerAcceptRequired += 1;
    }
  }
  counts.researchCalls = researchKeys.length;
  counts.accepted = 0; // P5 never auto-Accept

  const bucketSum =
    counts.material
    + counts.labor
    + counts.both
    + counts.unresolved
    + counts.nonCost;
  const unexplainedLoss = Math.max(0, inputLineCount - counts.outputLineCount);
  const excess = Math.max(0, counts.outputLineCount - inputLineCount);
  const seen = new Set<string>();
  let unexplainedDuplication = 0;
  for (const row of lines) {
    const k = `${row.dwellingId}|${row.lineId}`;
    if (seen.has(k)) unexplainedDuplication += 1;
    else seen.add(k);
  }
  const reconciliationOk =
    unexplainedLoss === 0
    && unexplainedDuplication === 0
    && excess === 0
    && bucketSum === counts.outputLineCount
    && counts.outputLineCount === inputLineCount
    && inputRefs.length === inputLineCount;

  if (!reconciliationOk) {
    reasons.push(
      `RECONCILIATION_FAIL in=${inputLineCount} out=${counts.outputLineCount} buckets=${bucketSum}`,
    );
  }

  let dwellingPreservation = true;
  let branchPreservation = true;
  let provenancePreservation = true;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i]!;
    const src = inputRefs[i]!;
    if (row.dwellingId !== src.dwellingId) dwellingPreservation = false;
    const srcBranch =
      (src.provenance?.branchHint && src.provenance.branchHint !== "unknown"
        ? src.provenance.branchHint
        : null)
      ?? (src.line.workCategory ? String(src.line.workCategory) : null);
    if (srcBranch && row.branch !== srcBranch) branchPreservation = false;
    if (src.provenance) {
      if (
        !row.lineProvenance
        || row.sourceDocumentId !== src.provenance.sourceDocumentId
        || row.sourceLineKey !== src.provenance.sourceLineKey
      ) {
        provenancePreservation = false;
      }
    }
    if (
      row.description !== src.line.description
      || row.quantity !== src.line.quantity
      || row.unit !== src.line.unit
    ) {
      provenancePreservation = false;
      reasons.push(`LINE_FIELD_MUTATION line=${row.lineId}`);
    }
  }

  const status: IkMaterialExpertReport["status"] =
    !reconciliationOk
      ? "partial"
      : counts.materialIdentityResolved === 0 && counts.unresolved === counts.outputLineCount
        ? "ready"
        : counts.ownerAcceptRequired > 0 || counts.priceMemoryMiss > 0
          ? "partial"
          : "ready";

  return {
    tenderId,
    status,
    counts,
    reconciliation: {
      ok: reconciliationOk,
      unexplainedLoss,
      unexplainedDuplication: unexplainedDuplication + excess,
      reasons: reasons.filter((r) => r.startsWith("RECONCILIATION") || r.startsWith("MASTER_LINES")),
    },
    dwellingPreservation,
    branchPreservation,
    provenancePreservation,
    researchBoundaryOk,
    autoAcceptExecuted,
    pricingExecuted,
    laborResearchExecuted,
    lines,
    researchKeys,
    reasons,
  };
}

/**
 * Owner Accept → Price Memory (REUSE acceptMaterialResearchCandidate).
 * Never called automatically from runIkMasterBoqMaterialExpert.
 */
export async function acceptIkMaterialResearchCandidate(opts: {
  candidate: PriceCandidate;
  expectedUnit: string;
  demandStore?: PriceDemandStore;
  commitDeps?: Partial<CommitMarketQuotesDeps>;
  updatedAtIso?: string;
}): Promise<Awaited<ReturnType<typeof acceptMaterialResearchCandidate>>> {
  const demandStore =
    opts.demandStore
    ?? normalizePriceDemandStore({
      schemaVersion: 1,
      updatedAt: opts.updatedAtIso ?? new Date().toISOString(),
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

/**
 * P5-REAL — slice Material Expert report to focus lineIds (MATERIAL + COMPOUND check).
 * COMPOUND without trusted mat.* identity → NO_MATERIAL_COMPONENT (existing Wave1 PENDING_OWNER_NORM).
 * Does not invent materialKey / SKU / price.
 */
export type IkMaterialFocusCoverageStatus =
  | "PRICE_MEMORY_HIT"
  | "PRICE_MEMORY_MISS_PATH"
  | "NO_MATERIAL_COMPONENT"
  | "LABOR_SKIPPED"
  | "OTHER";

export type IkTrustedMaterialFocusSummary = {
  focusInput: number;
  materialPlaneInput: number;
  compoundPlaneInput: number;
  totalMaterialExpertInput: number;
  materialIdentityResolved: number;
  priceMemoryHit: number;
  priceMemoryMissPath: number;
  noMaterialComponent: number;
  researchKeysOnFocus: string[];
  candidates: number;
  orphanPrices: number;
  coverageOk: boolean;
  byPlane: Record<string, number>;
  byBucket: Record<string, number>;
  byPriceStatus: Record<string, number>;
  byCoverage: Record<string, number>;
  lines: IkMaterialExpertLineResult[];
};

export function summarizeIkMaterialForFocusLines(
  material: IkMaterialExpertReport,
  focusLineIds: Iterable<string>,
): IkTrustedMaterialFocusSummary {
  const idSet = new Set([...focusLineIds].map(String));
  const lines = material.lines.filter((l) => idSet.has(l.lineId));
  const byPlane: Record<string, number> = {};
  const byBucket: Record<string, number> = {};
  const byPriceStatus: Record<string, number> = {};
  const byCoverage: Record<string, number> = {};
  let materialPlaneInput = 0;
  let compoundPlaneInput = 0;
  let materialIdentityResolved = 0;
  let priceMemoryHit = 0;
  let priceMemoryMissPath = 0;
  let noMaterialComponent = 0;
  let candidates = 0;
  let orphanPrices = 0;
  const researchKeys = new Set<string>();

  for (const row of lines) {
    byPlane[row.plane] = (byPlane[row.plane] || 0) + 1;
    byBucket[row.bucket] = (byBucket[row.bucket] || 0) + 1;
    byPriceStatus[row.priceStatus] = (byPriceStatus[row.priceStatus] || 0) + 1;

    let coverage: IkMaterialFocusCoverageStatus = "OTHER";
    if (row.plane === "LABOR" || row.bucket === "LABOR") {
      coverage = "LABOR_SKIPPED";
    } else if (row.plane === "MATERIAL" || row.plane === "COMPOUND") {
      if (row.plane === "MATERIAL") materialPlaneInput += 1;
      if (row.plane === "COMPOUND") compoundPlaneInput += 1;
      if (row.materialIdentity) {
        materialIdentityResolved += 1;
        if (row.priceStatus === "PRICE_MEMORY_HIT") {
          coverage = "PRICE_MEMORY_HIT";
          priceMemoryHit += 1;
        } else if (
          row.priceStatus === "PRICE_MEMORY_MISS"
          || row.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
          || row.priceStatus === "RESEARCH_GAP"
          || row.priceStatus === "RESEARCH_BLOCKED"
          || row.priceStatus === "RESEARCH_COOLDOWN"
          || row.priceStatus === "RESEARCH_SKIPPED"
          || row.priceStatus === "RESEARCH_HELD"
        ) {
          coverage = "PRICE_MEMORY_MISS_PATH";
          priceMemoryMissPath += 1;
        } else {
          coverage = "OTHER";
        }
      } else if (
        // P5.13 — demand research / work-anchored Price Memory without product mat.*
        row.priceStatus === "PRICE_MEMORY_HIT"
      ) {
        coverage = "PRICE_MEMORY_HIT";
        priceMemoryHit += 1;
      } else if (
        row.priceStatus === "PRICE_MEMORY_MISS"
        || row.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
        || row.priceStatus === "RESEARCH_GAP"
        || row.priceStatus === "RESEARCH_BLOCKED"
        || row.priceStatus === "RESEARCH_COOLDOWN"
        || row.priceStatus === "RESEARCH_SKIPPED"
        || row.priceStatus === "RESEARCH_HELD"
        || Boolean(row.researchKey)
      ) {
        coverage = "PRICE_MEMORY_MISS_PATH";
        priceMemoryMissPath += 1;
      } else {
        coverage = "NO_MATERIAL_COMPONENT";
        noMaterialComponent += 1;
      }
    }

    byCoverage[coverage] = (byCoverage[coverage] || 0) + 1;
    if (row.researchKey) researchKeys.add(row.researchKey);
    if (row.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && row.candidate) {
      candidates += 1;
    }
    // Gate C: price without HIT or candidate path = orphan
    if (
      row.priceMemoryHitPln != null
      && row.priceStatus !== "PRICE_MEMORY_HIT"
      && row.priceStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED"
    ) {
      orphanPrices += 1;
    }
  }

  const totalMaterialExpertInput = materialPlaneInput + compoundPlaneInput;
  const accounted =
    priceMemoryHit + priceMemoryMissPath + noMaterialComponent
    + (byCoverage.LABOR_SKIPPED || 0)
    + (byCoverage.OTHER || 0);
  const coverageOk = lines.length === idSet.size && accounted === lines.length;

  return {
    focusInput: lines.length,
    materialPlaneInput,
    compoundPlaneInput,
    totalMaterialExpertInput,
    materialIdentityResolved,
    priceMemoryHit,
    priceMemoryMissPath,
    noMaterialComponent,
    researchKeysOnFocus: [...researchKeys].sort(),
    candidates,
    orphanPrices,
    coverageOk,
    byPlane,
    byBucket,
    byPriceStatus,
    byCoverage,
    lines,
  };
}

/** Test-only cooldown reset — re-export for harness. */
export { resetMaterialResearchSessionCooldownForTests };
