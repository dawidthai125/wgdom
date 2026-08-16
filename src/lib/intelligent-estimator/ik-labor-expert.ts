/**
 * IK-MIGRATION-01 P5 — Labor Expert orchestration over Master BOQ
 * (library historically labeled P4 — formal phase = Labor E2E).
 *
 * Path (REUSE only):
 *   Master BOQ line
 *   → mapOfferBoqLine (Product Mapper / alias)
 *   → resolveWorkIdentityFromOfferBoqLine
 *   → classifyEstimatorPricingPlane (A1)
 *   → lookupWorkRate (CURRENT / MISS)
 *   → lookupInternalFirst (MISS · P5.26-E REUSE)
 *   → runIkLaborGapResearch (MISS + NO_INTERNAL_MATCH · executeResearch === true only)
 *
 * ZERO auto-Accept · ZERO Material · ZERO F5/Bid · ZERO invent identity from namePl alone.
 * P0: executeResearch requires explicit `=== true` (never `!== false` / undefined).
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
import { lookupInternalFirst } from "./internal-first-semantic-match";
import { buildInternalFirstIndexFromCatalogWorks } from "./ik-p5-internal-first-index";
import {
  IkP5ResearchBudget,
  wrapLookupPortWithIkP5Budget,
} from "./ik-p5-labor-budget";
import { getDefaultWorkRateLookupPort } from "@/lib/work-catalog/work-rate-research";

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
  | "INTERNAL_EXACT_HIT"
  | "INTERNAL_SEMANTIC_HIT"
  | "INTERNAL_REVIEW"
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
  /** P5 internal-first outcome (when run). */
  internalFirstOutcome?: string | null;
  internalFirstConfidence?: string | null;
  internalFirstMatchId?: string | null;
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
  internalExactHits: number;
  internalSemanticHits: number;
  internalReview: number;
  researchHttpFetches: number;
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
    internalExactHits: 0,
    internalSemanticHits: 0,
    internalReview: 0,
    researchHttpFetches: 0,
  };
}

/**
 * Labor Expert pass over READY Master BOQ.
 * Research only for LABOR + trusted identity + OUR RATE MISS + NO_INTERNAL_MATCH
 * when executeResearch === true (explicit).
 */
export async function runIkMasterBoqLaborExpert(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  expert?: IkDocumentExpertReport | null;
  store?: WorkCatalogStore;
  works?: CatalogWork[];
  /**
   * P5 hardening: research runs ONLY when `=== true`.
   * Default / undefined / false → no HTTP (never `!== false`).
   */
  executeResearch?: boolean;
  /** Default true — REUSE P5.26-E lookupInternalFirst on MISS. */
  enableInternalFirst?: boolean;
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
  const executeResearch = opts.executeResearch === true;
  const enableInternalFirst = opts.enableInternalFirst !== false;
  const autoAcceptExecuted = false as const;
  const pricingExecuted = false as const;
  const materialResearchExecuted = false as const;
  const reasons: string[] = [];
  const researchBudget = new IkP5ResearchBudget();

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
  const internalIndex = enableInternalFirst
    ? buildInternalFirstIndexFromCatalogWorks(works)
    : [];
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
    let internalFirstOutcome: string | null = null;
    let internalFirstConfidence: string | null = null;
    let internalFirstMatchId: string | null = null;

    if (bucket === "LABOR" && workId && identity.unit) {
      const looked = lookupWorkRate(store, workId, identity.unit, nowMs);
      if (looked.status === "CURRENT") {
        rateStatus = "CURRENT_HIT";
        ourRatePln = looked.ourRatePln;
      } else {
        rateStatus = looked.status === "STALE" ? "STALE_TREATED_AS_MISS" : "MISS";
        ourRatePln = looked.status === "STALE" ? looked.ourRatePln : null;
        researchKey = `${workId}|${identity.unit}`;

        if (enableInternalFirst && internalIndex.length > 0) {
          const planeDomain =
            classify.plane === "COMPOUND" ? "LABOR_MATERIAL_PACKAGE" : classify.plane;
          const internal = lookupInternalFirst({
            description: mapped.description || structural.description,
            unit: identity.unit,
            sourceDomain: planeDomain === "UNKNOWN" ? "LABOR" : planeDomain,
            index: internalIndex,
          });
          internalFirstOutcome = internal.outcome;
          internalFirstConfidence = internal.confidence;
          internalFirstMatchId = internal.match?.id ?? null;

          if (
            internal.outcome === "INTERNAL_EXACT_HIT"
            && internal.match?.base != null
            && internal.match.base > 0
          ) {
            rateStatus = "INTERNAL_EXACT_HIT";
            ourRatePln = internal.match.base;
            researchKey = null;
          } else if (
            internal.outcome === "INTERNAL_SEMANTIC_HIT"
            && internal.match?.base != null
            && internal.match.base > 0
            && (internal.confidence === "HIGH" || internal.confidence === "MEDIUM")
          ) {
            rateStatus = "INTERNAL_SEMANTIC_HIT";
            ourRatePln = internal.match.base;
            researchKey = null;
          } else if (
            internal.confidence === "MEDIUM"
            && internal.match
            && internal.note.includes("without Owner Knowledge")
          ) {
            // Ambiguous semantic — Owner REVIEW, no auto research invent
            rateStatus = "INTERNAL_REVIEW";
            researchKey = null;
          }
        }

        if (researchKey && executeResearch) {
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
        } else if (researchKey && !executeResearch) {
          rateStatus =
            rateStatus === "MISS" || rateStatus === "STALE_TREATED_AS_MISS"
              ? "RESEARCH_SKIPPED"
              : rateStatus;
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
      internalFirstOutcome,
      internalFirstConfidence,
      internalFirstMatchId,
    });
  }

  const researchKeys: string[] = [];
  const researchByKey = new Map<string, RunIkLaborGapResearchResult>();
  let researchBoundaryOk = true;
  const basePort = opts.lookupPort ?? (executeResearch ? getDefaultWorkRateLookupPort() : undefined);
  const lookupPort =
    executeResearch && basePort
      ? wrapLookupPortWithIkP5Budget(basePort, researchBudget)
      : opts.lookupPort;

  for (const [key, job] of pendingByKey) {
    // Boundary: never research UNKNOWN / non-LABOR — pending map only has LABOR+MISS.
    if (!researchBudget.canFetch(key, 1)) {
      researchKeys.push(key);
      researchByKey.set(key, {
        status: "GAP",
        rejects: [],
        httpFetchCount: 0,
        previousOurRatePln: null,
        previousFreshness: "MISSING",
        messagePl: "Limit HTTP P5 wyczerpany — GAP (bez invent).",
        fullCatalogueForbidden: true,
        telemetry: [],
      });
      reasons.push(`RESEARCH_BUDGET_STOP key=${key}`);
      continue;
    }
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
      lookupPort,
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
    if (row.rateStatus === "INTERNAL_EXACT_HIT") counts.internalExactHits += 1;
    if (row.rateStatus === "INTERNAL_SEMANTIC_HIT") counts.internalSemanticHits += 1;
    if (row.rateStatus === "INTERNAL_REVIEW") counts.internalReview += 1;
    if (
      row.rateStatus === "MISS"
      || row.rateStatus === "STALE_TREATED_AS_MISS"
      || row.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
      || row.rateStatus === "RESEARCH_GAP"
      || row.rateStatus === "RESEARCH_BLOCKED"
      || row.rateStatus === "RESEARCH_COOLDOWN"
      || row.rateStatus === "RESEARCH_SKIPPED"
      || row.rateStatus === "INTERNAL_REVIEW"
    ) {
      counts.ourRateMiss += 1;
    }
    if (row.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && row.candidate) {
      counts.evidenceCandidates += 1;
      counts.ownerAcceptRequired += 1;
    }
  }
  counts.researchCalls = researchKeys.length;
  counts.researchHttpFetches = researchBudget.runHttpCount;
  counts.acceptedOurRate = 0; // never auto-Accept

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

/** P4-REAL — slice Labor Expert report to trusted Work Identity lineIds (no re-run). */
export type IkTrustedWorkLaborSummary = {
  trustedWorkInput: number;
  laborEligible: number;
  nonLaborOrCompound: number;
  currentOurRateHit: number;
  ourRateMissPath: number;
  researchGap: number;
  candidateOwnerAcceptRequired: number;
  researchKeysOnTrusted: string[];
  orphanRates: number;
  coverageOk: boolean;
  byPlane: Record<string, number>;
  byBucket: Record<string, number>;
  byRateStatus: Record<string, number>;
  lines: IkLaborExpertLineResult[];
};

export function summarizeIkLaborForTrustedWorkLines(
  labor: IkLaborExpertReport,
  trustedLineIds: Iterable<string>,
): IkTrustedWorkLaborSummary {
  const idSet = new Set([...trustedLineIds].map(String));
  const lines = labor.lines.filter((l) => idSet.has(l.lineId));
  const byPlane: Record<string, number> = {};
  const byBucket: Record<string, number> = {};
  const byRateStatus: Record<string, number> = {};
  let laborEligible = 0;
  let nonLaborOrCompound = 0;
  let currentOurRateHit = 0;
  let ourRateMissPath = 0;
  let researchGap = 0;
  let candidateOwnerAcceptRequired = 0;
  let orphanRates = 0;
  const researchKeys = new Set<string>();

  for (const row of lines) {
    byPlane[row.plane] = (byPlane[row.plane] || 0) + 1;
    byBucket[row.bucket] = (byBucket[row.bucket] || 0) + 1;
    byRateStatus[row.rateStatus] = (byRateStatus[row.rateStatus] || 0) + 1;
    if (row.bucket === "LABOR") laborEligible += 1;
    else nonLaborOrCompound += 1;
    if (row.rateStatus === "CURRENT_HIT") currentOurRateHit += 1;
    if (
      row.rateStatus === "MISS"
      || row.rateStatus === "STALE_TREATED_AS_MISS"
      || row.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
      || row.rateStatus === "RESEARCH_GAP"
      || row.rateStatus === "RESEARCH_BLOCKED"
      || row.rateStatus === "RESEARCH_COOLDOWN"
      || row.rateStatus === "RESEARCH_SKIPPED"
    ) {
      ourRateMissPath += 1;
    }
    if (row.rateStatus === "RESEARCH_GAP") researchGap += 1;
    if (row.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && row.candidate) {
      candidateOwnerAcceptRequired += 1;
    }
    if (row.researchKey) researchKeys.add(row.researchKey);
    // Gate C: rate without CURRENT or accepted candidate path = orphan (P4 never auto-accepts).
    if (
      row.ourRatePln != null
      && row.rateStatus !== "CURRENT_HIT"
      && row.rateStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED"
      && row.rateStatus !== "STALE_TREATED_AS_MISS"
    ) {
      orphanRates += 1;
    }
  }

  const coverageOk = lines.length === idSet.size;

  return {
    trustedWorkInput: lines.length,
    laborEligible,
    nonLaborOrCompound,
    currentOurRateHit,
    ourRateMissPath,
    researchGap,
    candidateOwnerAcceptRequired,
    researchKeysOnTrusted: [...researchKeys].sort(),
    orphanRates,
    coverageOk,
    byPlane,
    byBucket,
    byRateStatus,
    lines,
  };
}
