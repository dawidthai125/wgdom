/**
 * W1 Orchestra — sync pipeline (extraction of IkEntryHost useMemo chain).
 * Order: Document → KNR → KL-3 diag / ETAP 11 → Slice D → Classification → Identity → Composite → P7 → P8.
 */

import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { runIkKnrExpert } from "@/lib/intelligent-estimator/ik-knr-expert";
import { applyOwnerKnrMapping } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import { runIkMasterBoqClassification } from "@/lib/intelligent-estimator/ik-classification";
import { runIkMasterBoqIdentityCoverage } from "@/lib/intelligent-estimator/ik-identity-coverage";
import { runIkCompositeBothHold } from "@/lib/intelligent-estimator/ik-composite-both-hold";
import { runIkP7PositionCostBid } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import { runIkP8RiskDecision } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import {
  runKnrHostApplicationDiagBatch,
  summarizeKnrHostAppDiag,
  loadKnrCatalogStoreLocal,
  type KnrHostApplicationResult,
} from "@/lib/intelligent-estimator/knr-knowledge";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { IkDocumentExpertReport } from "@/lib/intelligent-estimator/ik-document-expert";
import type {
  IkKnrAppDiag,
  IkKnrKnowledgeDiag,
  IkOrchestraSyncInput,
  IkOrchestraSyncSnapshot,
} from "./orchestra-types";

function computeKnrKnowledgeDiag(
  readyForExperts: boolean,
  knowledgeBusy: boolean,
  knrKnowledge: IkOrchestraSyncInput["knrKnowledge"],
): IkKnrKnowledgeDiag {
  if (!readyForExperts) {
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
  readyForExperts: boolean,
  knowledgeBusy: boolean,
  knrKnowledge: IkOrchestraSyncInput["knrKnowledge"],
  masterBoqLines: IkDocumentExpertReport["masterBoqLines"],
): KnrHostApplicationResult[] {
  if (!readyForExperts || knowledgeBusy || !knrKnowledge) {
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
  readyForExperts: boolean,
  knowledgeBusy: boolean,
  knrKnowledge: IkOrchestraSyncInput["knrKnowledge"],
  knrApplicationResults: KnrHostApplicationResult[],
): IkKnrAppDiag {
  if (!readyForExperts) {
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

  const knr = runIkKnrExpert({
    tenderId: effectiveItem.id || effectiveItem.tenderId || "",
    documentExpert: report,
    historicalIndex: historicalIndex ?? null,
  });

  const knrKnowledgeDiag = computeKnrKnowledgeDiag(
    report.masterBoq.readyForExperts,
    knowledgeBusy,
    knrKnowledge,
  );

  const knrApplicationResults = computeKnrApplicationResults(
    report.masterBoq.readyForExperts,
    knowledgeBusy,
    knrKnowledge,
    report.masterBoqLines,
  );

  const knrAppDiag = computeKnrAppDiag(
    report.masterBoq.readyForExperts,
    knowledgeBusy,
    knrKnowledge,
    knrApplicationResults,
  );

  const knrMapped = applyOwnerKnrMapping({ documentExpert: report, knr });

  const classification = runIkMasterBoqClassification({
    item: effectiveItem,
    package: pkg,
    expert: knrMapped.expert,
  });

  let identityCoverage = null;
  if (identityCoverageOn && report.masterBoq.readyForExperts) {
    identityCoverage = runIkMasterBoqIdentityCoverage({
      item: effectiveItem,
      package: pkg,
      expert: report,
    });
  }

  let composite = null;
  if (p5LaborOn && p6MaterialOn && report.masterBoq.readyForExperts) {
    composite = runIkCompositeBothHold({
      item: effectiveItem,
      package: pkg,
      expert: report,
      p5LaborActive: true,
      p6MaterialActive: true,
      executeLaborResearch: p5ResearchOn === true,
      executeMaterialResearch: p6ResearchOn === true,
    });
  }

  let positionCostBid = null;
  if (
    p7F5On
    && (report.masterBoq.readyForExperts || (report.offerBoq?.lines?.length ?? 0) > 0)
  ) {
    positionCostBid = runIkP7PositionCostBid({
      item: effectiveItem,
      expert: report,
      package: pkg,
    });
  }

  let riskDecision = null;
  if (p8RiskOn) {
    riskDecision = runIkP8RiskDecision({
      item: effectiveItem,
      p7: positionCostBid,
      bidProposal: positionCostBid?.proposal ?? null,
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
    classification,
    identityCoverage,
    composite,
    positionCostBid,
    riskDecision,
  };
}
