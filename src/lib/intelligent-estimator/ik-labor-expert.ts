/**
 * IK-MIGRATION-01 P4 — Labor Expert orchestration over Master BOQ.
 *
 * Path (REUSE only):
 *   Master BOQ line
 *   → mapOfferBoqLine (Product Mapper / alias)
 *   → resolveWorkIdentityFromOfferBoqLine
 *   → classifyEstimatorPricingPlane (A1)
 *   → lookupWorkRate (CURRENT / MISS)
 *   → runIkLaborGapResearch (MISS only · validated LABOR identity)
 *
 * ZERO auto-Accept · ZERO Material · ZERO F5/Bid · ZERO invent identity from namePl alone.
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
import { normalizeWgdomCostUnit, type WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import {
  runIkLaborGapResearch,
  type RunIkLaborGapResearchResult,
} from "@/lib/ik-pricing-orchestrator/labor-research-bridge";
import { buildIkLaborDedupeKey } from "@/lib/ik-pricing-orchestrator/types";
import { isCenyMaterialow01Enabled } from "@/lib/ceny-materialow-01-flag";
import { classifyEstimatorPricingPlane } from "./classification-gate";
import type {
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";
import {
  runIkDocumentExpert,
  type IkDocumentExpertReport,
} from "./ik-document-expert";
import type { DwellingLineProvenance } from "@/lib/multi-boq/types";

export type IkLaborBucket =
  | "LABOR"
  | "NON_LABOR"
  | "BOTH"
  | "UNRESOLVED"
  | "NON_COST";

export type IkLaborRateStatus =
  | "NONE"
  | "CURRENT_HIT"
  | "MISS"
  | "STALE_TREATED_AS_MISS"
  | "CANDIDATE_OWNER_ACCEPT_REQUIRED"
  | "RESEARCH_GAP"
  | "RESEARCH_BLOCKED"
  | "RESEARCH_COOLDOWN"
  | "RESEARCH_SKIPPED";

export type IkLaborExpertLineResult = {
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
  /** After Product Mapper — may differ from Master structural catalogWorkId. */
  catalogWorkId: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
  identity: ShadowWorkIdentityResolve;
  plane: EstimatorPricingPlane;
  classify: EstimatorClassifyResult;
  bucket: IkLaborBucket;
  rateStatus: IkLaborRateStatus;
  ourRatePln: number | null;
  researchKey: string | null;
  candidate: WorkRateResearchCandidate | null;
};

export type IkLaborExpertCounts = {
  inputLineCount: number;
  outputLineCount: number;
  workIdentityResolved: number;
  labor: number;
  nonLabor: number;
  both: number;
  unresolved: number;
  nonCost: number;
  currentOurRateHit: number;
  ourRateMiss: number;
  researchCalls: number;
  evidenceCandidates: number;
  ownerAcceptRequired: number;
  acceptedOurRate: number;
};

export type IkLaborExpertReport = {
  tenderId: string;
  status: "ready" | "blocked" | "partial";
  counts: IkLaborExpertCounts;
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
  materialResearchExecuted: false;
  lines: IkLaborExpertLineResult[];
  /** Unique workId|unit research keys attempted. */
  researchKeys: string[];
  reasons: string[];
};

function bucketFrom(
  identity: ShadowWorkIdentityResolve,
  plane: EstimatorPricingPlane,
): IkLaborBucket {
  if (
    identity.status === "NOISE_SKIP"
    || identity.status === "EQUIPMENT_GAP"
    || identity.status === "AUXILIARY_GAP"
    || identity.status === "TRANSPORT_GAP"
  ) {
    return "NON_COST";
  }
  if (identity.status === "AMBIGUOUS" || identity.status === "NO_IDENTITY" || identity.status === "INVALID_UNIT") {
    return "UNRESOLVED";
  }
  if (identity.status !== "OK" || !identity.workId) {
    return "UNRESOLVED";
  }
  switch (plane) {
    case "LABOR":
      return "LABOR";
    case "MATERIAL":
      return "NON_LABOR";
    case "COMPOUND":
      return "BOTH";
    case "UNKNOWN":
    default:
      return "UNRESOLVED";
  }
}

function emptyCounts(input: number): IkLaborExpertCounts {
  return {
    inputLineCount: input,
    outputLineCount: 0,
    workIdentityResolved: 0,
    labor: 0,
    nonLabor: 0,
    both: 0,
    unresolved: 0,
    nonCost: 0,
    currentOurRateHit: 0,
    ourRateMiss: 0,
    researchCalls: 0,
    evidenceCandidates: 0,
    ownerAcceptRequired: 0,
    acceptedOurRate: 0,
  };
}

/**
 * Labor Expert pass over READY Master BOQ.
 * Research only for LABOR + trusted identity + OUR RATE MISS (deduped by workId|unit).
 */
export async function runIkMasterBoqLaborExpert(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  expert?: IkDocumentExpertReport | null;
  store?: WorkCatalogStore;
  works?: CatalogWork[];
  /** Default true — HTTP/fixture research for MISS only. */
  executeResearch?: boolean;
  lookupPort?: WorkRateSelectiveLookupPort;
  nowMs?: number;
  forceRefresh?: boolean;
  bypassCooldown?: boolean;
}): Promise<IkLaborExpertReport> {
  const item = opts.item;
  const tenderId = item.id || item.tenderId || "";
  const expert =
    opts.expert
    ?? runIkDocumentExpert({ item, package: opts.package ?? null });
  const nowMs = opts.nowMs ?? Date.now();
  const executeResearch = opts.executeResearch !== false;
  const autoAcceptExecuted = false as const;
  const pricingExecuted = false as const;
  const materialResearchExecuted = false as const;
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
      materialResearchExecuted,
      lines: [],
      researchKeys: [],
      reasons: ["MASTER_BOQ_NOT_READY", ...expert.reasons.slice(0, 4)],
    };
  }

  const store = opts.store ?? loadWorkCatalogStoreLocal();
  const works =
    opts.works ?? listActiveWorksForRegion(store, store.activeRegion);
  const mapCtx: OfferBoqMappingContext = {
    works,
    mappedAt: new Date(nowMs).toISOString(),
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
    workId: string;
    unit: WgdomCostUnit;
    namePl: string;
    lineIds: string[];
    dwellingId: string;
  };
  const pendingByKey = new Map<string, PendingResearch>();
  const lines: IkLaborExpertLineResult[] = [];

  for (const ref of inputRefs) {
    const structural: OfferBoqLine = ref.line;
    const mapped = mapOfferBoqLine(structural, mapCtx);
    const identity = resolveWorkIdentityFromOfferBoqLine(mapped);
    const workId = identity.workId;
    const classify = classifyEstimatorPricingPlane({
      workId,
      materialKey: null,
      namePl: structural.description,
      unit: structural.unit,
      lineKindHint: mapped.workCategory,
    });
    const bucket = bucketFrom(identity, classify.plane);
    const branch =
      (ref.provenance?.branchHint && ref.provenance.branchHint !== "unknown"
        ? ref.provenance.branchHint
        : null)
      ?? (structural.workCategory ? String(structural.workCategory) : null);

    let rateStatus: IkLaborRateStatus = "NONE";
    let ourRatePln: number | null = null;
    let researchKey: string | null = null;

    if (bucket === "LABOR" && workId && identity.unit) {
      const looked = lookupWorkRate(store, workId, identity.unit, nowMs);
      if (looked.status === "CURRENT") {
        rateStatus = "CURRENT_HIT";
        ourRatePln = looked.ourRatePln;
      } else {
        rateStatus = looked.status === "STALE" ? "STALE_TREATED_AS_MISS" : "MISS";
        ourRatePln = looked.status === "STALE" ? looked.ourRatePln : null;
        researchKey = `${workId}|${identity.unit}`;
        if (executeResearch) {
          const existing = pendingByKey.get(researchKey);
          if (existing) {
            existing.lineIds.push(structural.lineId);
          } else {
            pendingByKey.set(researchKey, {
              workId,
              unit: identity.unit,
              namePl: mapped.description || structural.description,
              lineIds: [structural.lineId],
              dwellingId: ref.dwellingId,
            });
          }
        } else {
          rateStatus = "RESEARCH_SKIPPED";
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
      catalogWorkId: workId ?? mapped.catalogWorkId ?? null,
      matchMethod: mapped.matchMethod ?? null,
      matchConfidence: mapped.matchConfidence ?? null,
      identity,
      plane: classify.plane,
      classify,
      bucket,
      rateStatus,
      ourRatePln,
      researchKey,
      candidate: null,
    });
  }

  const researchKeys: string[] = [];
  const researchByKey = new Map<string, RunIkLaborGapResearchResult>();
  let researchBoundaryOk = true;

  for (const [key, job] of pendingByKey) {
    // Boundary: never research UNKNOWN / non-LABOR — pending map only has LABOR+MISS.
    researchKeys.push(key);
    const lineId = job.lineIds[0]!;
    const result = await runIkLaborGapResearch({
      job: {
        domain: "labor",
        gapCode: "BRAK_STAWKI_ROBOT",
        tenderId,
        dwellingId: job.dwellingId,
        lineId,
        lp: lineId,
        workId: job.workId,
        unit: job.unit,
        namePl: job.namePl,
        dedupeKey: buildIkLaborDedupeKey({
          tenderId,
          lineId,
          workId: job.workId,
          unit: job.unit,
        }),
      },
      store,
      nowMs,
      lookupPort: opts.lookupPort,
      forceRefresh: opts.forceRefresh,
      bypassCooldown: opts.bypassCooldown,
    });
    researchByKey.set(key, result);
  }

  // Apply research outcomes onto lines (deduped).
  for (const row of lines) {
    if (!row.researchKey) continue;
    const res = researchByKey.get(row.researchKey);
    if (!res) continue;
    if (res.status === "SKIPPED_SESSION_BUSY") {
      row.rateStatus = "RESEARCH_SKIPPED";
      continue;
    }
    if (res.status === "REUSE") {
      row.rateStatus = "CURRENT_HIT";
      row.ourRatePln = res.ourRatePln;
      continue;
    }
    if (res.status === "CANDIDATE") {
      row.rateStatus = "CANDIDATE_OWNER_ACCEPT_REQUIRED";
      row.candidate = res.candidate;
      row.ourRatePln = res.candidate.proposedOurRatePln;
      continue;
    }
    if (res.status === "COOLDOWN") {
      row.rateStatus = "RESEARCH_COOLDOWN";
      continue;
    }
    if (res.status === "BLOCKED") {
      row.rateStatus = "RESEARCH_BLOCKED";
      // If classification blocked research for non-LABOR — boundary fail.
      if ("reason" in res && res.reason === "CLASSIFICATION_GATE") {
        researchBoundaryOk = false;
        reasons.push(`RESEARCH_BOUNDARY_FAIL line=${row.lineId}`);
      }
      continue;
    }
    if (res.status === "GAP") {
      row.rateStatus = "RESEARCH_GAP";
    }
  }

  // Boundary: no research for UNRESOLVED / NON_LABOR / BOTH / NON_COST
  for (const row of lines) {
    if (
      row.bucket !== "LABOR"
      && row.rateStatus !== "NONE"
      && row.rateStatus !== "CURRENT_HIT"
    ) {
      // Unexpected research path on non-labor
      if (row.researchKey && researchByKey.has(row.researchKey)) {
        researchBoundaryOk = false;
        reasons.push(`RESEARCH_ON_NON_LABOR line=${row.lineId} bucket=${row.bucket}`);
      }
    }
    if (
      row.bucket === "UNRESOLVED"
      && row.identity.status !== "OK"
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
    if (row.identity.status === "OK" && row.identity.workId) {
      counts.workIdentityResolved += 1;
    }
    switch (row.bucket) {
      case "LABOR":
        counts.labor += 1;
        break;
      case "NON_LABOR":
        counts.nonLabor += 1;
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
    if (row.rateStatus === "CURRENT_HIT") counts.currentOurRateHit += 1;
    if (
      row.rateStatus === "MISS"
      || row.rateStatus === "STALE_TREATED_AS_MISS"
      || row.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
      || row.rateStatus === "RESEARCH_GAP"
      || row.rateStatus === "RESEARCH_BLOCKED"
      || row.rateStatus === "RESEARCH_COOLDOWN"
      || row.rateStatus === "RESEARCH_SKIPPED"
    ) {
      counts.ourRateMiss += 1;
    }
    if (row.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && row.candidate) {
      counts.evidenceCandidates += 1;
      counts.ownerAcceptRequired += 1;
    }
  }
  counts.researchCalls = researchKeys.length;
  counts.acceptedOurRate = 0; // P4 never auto-Accept

  const bucketSum =
    counts.labor
    + counts.nonLabor
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
      // quantity/unit/description must stay Master truth
      provenancePreservation = false;
      reasons.push(`LINE_FIELD_MUTATION line=${row.lineId}`);
    }
  }

  const status: IkLaborExpertReport["status"] =
    reconciliationOk && researchBoundaryOk && dwellingPreservation
      ? "ready"
      : "partial";

  return {
    tenderId,
    status,
    counts,
    reconciliation: {
      ok: reconciliationOk,
      unexplainedLoss,
      unexplainedDuplication: unexplainedDuplication + excess,
      reasons: reconciliationOk
        ? []
        : reasons.filter((r) => r.startsWith("RECONCILIATION") || r.startsWith("MASTER_LINES")),
    },
    dwellingPreservation,
    branchPreservation,
    provenancePreservation,
    researchBoundaryOk,
    autoAcceptExecuted,
    pricingExecuted,
    materialResearchExecuted,
    lines,
    researchKeys,
    reasons,
  };
}

/** Pure helper for tests — trusted identity requires mapper + resolve (no invent). */
export function mapAndResolveWorkIdentityForLine(
  line: OfferBoqLine,
  ctx: OfferBoqMappingContext,
): { mapped: OfferBoqLine; identity: ShadowWorkIdentityResolve } {
  const mapped = mapOfferBoqLine(line, ctx);
  return { mapped, identity: resolveWorkIdentityFromOfferBoqLine(mapped) };
}

export function normalizeUnitForLaborLookup(unit: string): WgdomCostUnit | null {
  return normalizeWgdomCostUnit(unit);
}
