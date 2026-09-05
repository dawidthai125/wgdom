/**
 * W1/W2 Orchestra — sync pipeline.
 * W2 order: Document → KNR → KL-3 → Slice D → P4 trust seam → Identity → Classification → IdentityCoverage → Composite → P7 → P8.
 */

import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { runIkKnrExpert } from "@/lib/intelligent-estimator/ik-knr-expert";
import { applyOwnerKnrMapping } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import { runIkMasterBoqClassification } from "@/lib/intelligent-estimator/ik-classification";
import { runIkMasterBoqIdentityCoverage } from "@/lib/intelligent-estimator/ik-identity-coverage";
import { runIkCompositeBothHold } from "@/lib/intelligent-estimator/ik-composite-both-hold";
import { runIkP7PositionCostBid } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import { runIkP8RiskDecision } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import { runIkIdentityPhase } from "@/lib/intelligent-estimator/orchestra/ik-identity-phase";
import {
  buildDeferredIdentityBlockedContext,
  buildKnrReanalysisDiag,
  shouldDeferIkDownstreamUntilKnrKnowledge,
} from "@/lib/intelligent-estimator/orchestra/ik-knr-reanalysis-seam";
import { promoteSliceDHitToTrustedTuple } from "@/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam";
import {
  runKnrHostApplicationDiagBatch,
  summarizeKnrHostAppDiag,
  loadKnrCatalogStoreLocal,
  type KnrHostApplicationResult,
} from "@/lib/intelligent-estimator/knr-knowledge";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { IkDocumentExpertReport } from "@/lib/intelligent-estimator/ik-document-expert";
import {
  expertChainMayProceedFromReport,
  resolveIkExpertAdmission,
} from "@/lib/intelligent-estimator/ik-expert-admission";
import type {
  IkKnrAppDiag,
  IkKnrKnowledgeDiag,
  IkOrchestraSyncInput,
  IkOrchestraSyncSnapshot,
} from "./orchestra-types";

function computeKnrKnowledgeDiag(
  mayProceed: boolean,
  knowledgeBusy: boolean,
  knrKnowledge: IkOrchestraSyncInput["knrKnowledge"],
): IkKnrKnowledgeDiag {
  if (!mayProceed) {
    return {
      status: "skipped",
      hits: 0,
      misses: 0,
      staleHits: 0,
      pendingVerify: 0,
      researchExecuted: 0,
      http: 0,
    };
  }
  if (knowledgeBusy) {
    return {
      status: "busy",
      hits: 0,
      misses: 0,
      staleHits: 0,
      pendingVerify: 0,
      researchExecuted: 0,
      http: 0,
    };
  }
  if (!knrKnowledge) {
    return {
      status: "idle",
      hits: 0,
      misses: 0,
      staleHits: 0,
      pendingVerify: 0,
      researchExecuted: 0,
      http: 0,
    };
  }
  const pendingVerify = knrKnowledge.lineResults.filter(
    (l) => l.lookupStatus === "PENDING_VERIFY",
  ).length;
  return {
    status: "ready",
    hits: knrKnowledge.summary.hits,
    misses: knrKnowledge.summary.misses,
    staleHits: knrKnowledge.summary.staleHits,
    pendingVerify,
    researchExecuted: knrKnowledge.summary.researchExecuted ? 1 : 0,
    http: knrKnowledge.summary.httpRequestCount,
  };
}

function computeKnrApplicationResults(
  mayProceed: boolean,
  knowledgeBusy: boolean,
  knrKnowledge: IkOrchestraSyncInput["knrKnowledge"],
  masterBoqLines: IkDocumentExpertReport["masterBoqLines"],
): KnrHostApplicationResult[] {
  if (!mayProceed || knowledgeBusy || !knrKnowledge) {
    return [];
  }
  const boqByLineId = new Map<
    string,
    { lineId: string; quantity: number | null; unit: string | null }
  >();
  for (const ref of masterBoqLines ?? []) {
    const lineId = String(ref.line?.lineId ?? "").trim();
    if (!lineId) continue;
    boqByLineId.set(lineId, {
      lineId,
      quantity: typeof ref.line.quantity === "number" ? ref.line.quantity : null,
      unit: ref.line.unit != null ? String(ref.line.unit) : null,
    });
  }
  const nowIso = new Date().toISOString();
  return runKnrHostApplicationDiagBatch({
    readyForExperts: true,
    knowledgeLines: knrKnowledge.lineResults,
    boqByLineId,
    catalogStore: loadKnrCatalogStoreLocal(),
    workCatalogStore: loadWorkCatalogStoreLocal(),
    nowMs: Date.parse(nowIso),
    nowIso,
  });
}

function computeKnrAppDiag(
  mayProceed: boolean,
  knowledgeBusy: boolean,
  knrKnowledge: IkOrchestraSyncInput["knrKnowledge"],
  knrApplicationResults: KnrHostApplicationResult[],
): IkKnrAppDiag {
  if (!mayProceed) {
    return summarizeKnrHostAppDiag([], false);
  }
  if (knowledgeBusy) {
    return {
      status: "busy",
      priced: 0,
      partial: 0,
      hold: 0,
      skipped: 0,
      reject: 0,
    };
  }
  if (!knrKnowledge) {
    return {
      status: "idle",
      priced: 0,
      partial: 0,
      hold: 0,
      skipped: 0,
      reject: 0,
    };
  }
  return summarizeKnrHostAppDiag(knrApplicationResults, true);
}

/** Sync IK sequencer — mirrors IkEntryHost useMemo order 1:1. */
export function computeIkOrchestraSyncSnapshot(
  input: IkOrchestraSyncInput,
): IkOrchestraSyncSnapshot {
  const {
    effectiveItem,
    pkg,
    ingest,
    historicalIndex,
    knrKnowledge,
    knowledgeBusy,
    flags,
    chiefSession,
    manualOverrides = null,
    deferDownstreamUntilKnrKnowledge,
    knrReanalysisSignal = null,
  } = input;
  const {
    identityCoverageOn,
    p5LaborOn,
    p5ResearchOn,
    p6MaterialOn,
    p6ResearchOn,
    p7F5On,
    p8RiskOn,
  } = flags;

  const report =
    ingest?.expert ?? runIkDocumentExpert({ item: effectiveItem, package: pkg });

  const mayProceed = resolveIkExpertAdmission(report).expertChainMayProceed;

  const knr = runIkKnrExpert({
    tenderId: effectiveItem.id || effectiveItem.tenderId || "",
    documentExpert: report,
    historicalIndex: historicalIndex ?? null,
  });

  // G-ORD-01 — defer from real KNR workload (report/knr), never ingest-only.
  const knrLinesNeedingKnowledge = knr.lines.filter((l) => l.catalogBasis != null).length;
  const autoDeferDownstream = shouldDeferIkDownstreamUntilKnrKnowledge({
    readyForExperts: mayProceed,
    knrLineCount: knrLinesNeedingKnowledge,
    knowledgeBusy,
    knrKnowledge,
  });
  const knrDownstreamDeferred =
    typeof deferDownstreamUntilKnrKnowledge === "boolean"
      ? deferDownstreamUntilKnrKnowledge && mayProceed
      : autoDeferDownstream;

  const knrKnowledgeDiag = computeKnrKnowledgeDiag(
    mayProceed,
    knowledgeBusy,
    knrKnowledge,
  );

  const knrApplicationResults = computeKnrApplicationResults(
    mayProceed,
    knowledgeBusy,
    knrKnowledge,
    report.masterBoqLines,
  );

  const knrAppDiag = computeKnrAppDiag(
    mayProceed,
    knowledgeBusy,
    knrKnowledge,
    knrApplicationResults,
  );

  const knrMapped = applyOwnerKnrMapping({ documentExpert: report, knr });

  // P4 — thin trust seam (Owner Enable GO / ENABLED). Slice D remains mapping authority; Identity Phase stays generic.
  const sliceDTrusted = promoteSliceDHitToTrustedTuple({ sliceD: knrMapped });

  let identityPhase;
  if (knrDownstreamDeferred) {
    identityPhase = {
      postIdentityExpert: report,
      context: buildDeferredIdentityBlockedContext(report.masterBoq.lineCount),
    };
  } else {
    identityPhase = runIkIdentityPhase({
      structuralReport: report,
      sliceDExpert: sliceDTrusted.expert,
      item: effectiveItem,
      package: pkg,
      manualOverrides,
    });
  }
  const postIdentityExpert = identityPhase.postIdentityExpert;
  const identityContext = identityPhase.context;
  const postMayProceed = expertChainMayProceedFromReport(postIdentityExpert);

  const classification = runIkMasterBoqClassification({
    item: effectiveItem,
    package: pkg,
    expert: postIdentityExpert,
  });

  let identityCoverage = null;
  if (
    !knrDownstreamDeferred
    && identityCoverageOn
    && postMayProceed
  ) {
    identityCoverage = runIkMasterBoqIdentityCoverage({
      item: effectiveItem,
      package: pkg,
      expert: postIdentityExpert,
    });
  }

  let composite = null;
  if (
    !knrDownstreamDeferred
    && p5LaborOn
    && p6MaterialOn
    && postMayProceed
  ) {
    composite = runIkCompositeBothHold({
      item: effectiveItem,
      package: pkg,
      expert: postIdentityExpert,
      p5LaborActive: true,
      p6MaterialActive: true,
      executeLaborResearch: p5ResearchOn === true,
      executeMaterialResearch: p6ResearchOn === true,
    });
  }

  let positionCostBid = null;
  if (
    !knrDownstreamDeferred
    && p7F5On
    && (postMayProceed
      || (postIdentityExpert.offerBoq?.lines?.length ?? 0) > 0)
  ) {
    positionCostBid = runIkP7PositionCostBid({
      item: effectiveItem,
      expert: postIdentityExpert,
      package: pkg,
    });
  }

  let riskDecision = null;
  if (!knrDownstreamDeferred && p8RiskOn) {
    riskDecision = runIkP8RiskDecision({
      item: effectiveItem,
      p7: positionCostBid,
      bidProposal: positionCostBid?.proposal ?? null,
      expert: postIdentityExpert,
      chiefSession,
      knrHistorical: knr,
    });
  }

  return {
    report,
    knr,
    knrKnowledgeDiag,
    knrApplicationResults,
    knrAppDiag,
    knrMapped,
    identityContext,
    postIdentityExpert,
    identityPersistOutcome: null,
    classification,
    identityCoverage,
    composite,
    positionCostBid,
    riskDecision,
    knrDownstreamDeferred,
    knrReanalysisDiag: buildKnrReanalysisDiag(knrReanalysisSignal ?? undefined),
  };
}
