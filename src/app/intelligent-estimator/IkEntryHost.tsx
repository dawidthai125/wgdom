/**
 * IK-MIGRATION-01 P1 shell + P2 Documents→BOQ + P3 classification/identity
 * + P5 Labor E2E + P6 Material E2E + P7 Position Cost → F5 → Bid → SUM
 * + P8 Risk → Validation → Chief → DW → EC.
 *
 * W1: IK sequencer extracted to lib/orchestra — Host = UI/runtime adapter only.
 *
 * P1: ExpertConversationSurface + pipeline-fact VM · flag seam · NG-10 OFF fallback.
 * P4 Chief Wiring lives on TenderDetailPage (IK≠D) — passed in as optional session.
 */

import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { ExpertConversationSurface } from "@/app/expert-conversation";
import { IkExpertRoomChrome } from "@/lib/intelligent-estimator/IkExpertRoomChrome";
import { buildIkEntryConversationViewModel, overlayObservationStatusesOnConversationVm } from "@/lib/intelligent-estimator/ik-entry-conversation";
import { buildAnalysisObservation } from "@/lib/intelligent-estimator/analysis-observation";
import { IkOwnerActionQueueNavigate } from "@/app/intelligent-estimator/IkOwnerActionQueueNavigate";
import { LiveVisualizationView } from "@/app/intelligent-estimator/LiveVisualizationView";
import type { IkOrchestraSnapshot } from "@/lib/intelligent-estimator/orchestra/orchestra-types";
import type {
  IkOwnerActionDeepLinkContext,
  IkOwnerActionNavigateHandlers,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import type { HistoricalExecutedIndex } from "@/lib/intelligent-estimator/historical-executed";

/**
 * Compile-time default sentinels — runtime levers use AppSettings.
 */
export const IK_ENTRY_SHELL_AUTO_INGEST = false;
export const IK_ENTRY_SHELL_EXECUTE_RESEARCH = false;
/** Default sentinel — runtime: isIkIdentityCoverageEnabled(). */
export const IK_ENTRY_SHELL_IDENTITY_COVERAGE = false;
/**
 * Legacy shared experts sentinel — MUST stay false.
 * Labor uses ikLabor* · Material uses ikMaterial* — never arm via this flag.
 */
export const IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false;

export function IkEntryHost({
  item,
  onUpdate,
  pipelineIngest,
  athPreviewEnabled = true,
  /** P4 Chief session REUSE — optional; P8 Validation HOLD when null. */
  chiefSession = null,
  /**
   * Historical Executed in-memory index (READ-ONLY).
   * Absent/empty ⇒ HISTORICAL_MISS per line (first-class · not an error).
   */
  historicalIndex = null,
  /** W6 — page-level orchestra snapshot (from IkOrchestraPageBridge). */
  orchestra,
  ownerActionDeepLinkContext = null,
  ownerActionNavigateHandlers = null,
}: {
  item: TenderPipelineItem;
  onUpdate?: (patch: Partial<TenderPipelineItem>, opts?: TenderItemUpdateOpts) => void;
  pipelineIngest?: {
    dossierBuilding?: boolean;
    dossierEnriching?: boolean;
    heavyDone?: boolean;
  } | null;
  athPreviewEnabled?: boolean;
  chiefSession?: ChiefSessionOutput | null;
  historicalIndex?: HistoricalExecutedIndex | null;
  orchestra: IkOrchestraSnapshot;
  ownerActionDeepLinkContext?: IkOwnerActionDeepLinkContext | null;
  ownerActionNavigateHandlers?: IkOwnerActionNavigateHandlers | null;
}) {
  const tendersCtx = useTendersContextOptional();
  void tendersCtx;

  const {
    effectiveItem,
    pkg,
    ingest,
    bridgeBusy,
    labor,
    material,
    flags,
    report,
    knr,
    knrKnowledgeDiag,
    knrAppDiag,
    classification,
    identityCoverage,
    composite,
    positionCostBid,
    riskDecision,
    packageBlockers,
    ownerActionQueue,
    identityCoverageOps,
  } = orchestra;

  const {
    p2DocumentsBoqOn,
    identityCoverageOn,
    p5LaborOn,
    p5ResearchOn,
    p6MaterialOn,
    p6ResearchOn,
    p7F5On,
    p8RiskOn,
  } = flags;

  const legacyVm = useMemo(
    () =>
      buildIkEntryConversationViewModel(effectiveItem, {
        package: pkg,
        ingest: ingest
          ?? (bridgeBusy
            ? {
                phase: "started",
                started: true,
                completed: false,
                tenderId: item.id,
                documentsUsed: item.bzpDocuments?.length ?? 0,
                zipEvidence: [],
                parsersReused: ["buildTenderDossierHeavy"],
                artifactCount: 0,
                extractedLineCount: 0,
                primarySourceFilename: null,
                reasons: ["INGEST_STARTED"],
                itemPatch: null,
                mergedItem: item,
                expert: report,
              }
            : null),
        pipelineIngest,
        labor,
        material,
        identityCoverage,
        positionCostBid,
        riskDecision,
        composite,
        knr,
        classification,
        packageBlockers,
        ownerActionQueue,
        identityCoverageOps,
      }),
    [effectiveItem, pkg, ingest, bridgeBusy, item, report, pipelineIngest, labor, material, identityCoverage, positionCostBid, riskDecision, composite, knr, classification, packageBlockers, ownerActionQueue, identityCoverageOps],
  );

  // Phase 3 — Live Viz: pure Observation each render (C-MEMO: orchestra ref unstable).
  // Do NOT useMemo(..., [orchestra]) — useIkOrchestra returns a new object every render.
  const observation = buildAnalysisObservation(orchestra);

  // Phase 4 — Team Conversation: Observation SSOT status overlay (Variant A · pure recompute).
  const vm = overlayObservationStatusesOnConversationVm(legacyVm, observation);

  return (
    <div
      className="mb-4"
      data-ik-entry-host="1"
      data-ik-entry-shell="1"
      data-ik-entry-auto-ingest={p2DocumentsBoqOn ? "1" : "0"}
      data-ik-entry-execute-research={p5ResearchOn ? "1" : "0"}
      data-ik-p2-documents-boq={p2DocumentsBoqOn ? "1" : "0"}
      data-ik-p3-identity-coverage={identityCoverageOn ? "1" : "0"}
      data-ik-p5-labor-e2e={p5LaborOn ? "1" : "0"}
      data-ik-p5-labor-research={p5ResearchOn ? "1" : "0"}
      data-ik-p6-material-e2e={p6MaterialOn ? "1" : "0"}
      data-ik-p6-material-research={p6ResearchOn ? "1" : "0"}
      data-ik-p7-f5-e2e={p7F5On ? "1" : "0"}
      data-ik-p8-risk-decision-e2e={p8RiskOn ? "1" : "0"}
      data-ik-entry-identity-coverage={identityCoverageOn ? "1" : "0"}
      data-ik-entry-tender-id={item.id}
      data-ik-entry-boq-status={report.masterBoq.status}
      data-ik-cost-doc-count={String(report.costDocuments.length)}
      data-ik-przedmiar-count={String(report.przedmiary.length)}
      data-ik-master-ready={report.masterBoq.readyForExperts ? "1" : "0"}
      data-ik-extracted-lines={String(report.extraction.extractedCount)}
      data-ik-ingest-phase={
        p2DocumentsBoqOn
          ? (ingest?.phase ?? (bridgeBusy ? "started" : "idle"))
          : "shell"
      }
      data-ik-labor-status={
        p5LaborOn ? (labor?.status ?? "pending") : "shell_skipped"
      }
      data-ik-labor-resolved={String(labor?.counts.workIdentityResolved ?? 0)}
      data-ik-labor-research={String(labor?.counts.researchCalls ?? 0)}
      data-ik-material-status={
        p6MaterialOn ? (material?.status ?? "pending") : "shell_skipped"
      }
      data-ik-material-resolved={String(material?.counts.materialIdentityResolved ?? 0)}
      data-ik-material-research={String(material?.counts.researchCalls ?? 0)}
      data-ik-material-pm-hit={String(material?.counts.priceMemoryHit ?? 0)}
      data-ik-p7-status={
        p7F5On ? (positionCostBid?.status ?? "pending") : "shell_skipped"
      }
      data-ik-p7-bid-ok={positionCostBid?.bidOk ? "1" : "0"}
      data-ik-p7-research={String(positionCostBid?.researchExecuted ?? 0)}
      data-ik-p7-http={String(positionCostBid?.httpCalls ?? 0)}
      data-ik-p8-status={
        p8RiskOn ? (riskDecision?.status ?? "pending") : "shell_skipped"
      }
      data-ik-p8-decision={riskDecision?.displayDecision ?? ""}
      data-ik-p8-validation={riskDecision?.validationVerdict ?? ""}
      data-ik-p8-research={String(riskDecision?.researchExecuted ?? 0)}
      data-ik-p8-http={String(riskDecision?.httpCalls ?? 0)}
      data-ik-p8-auto-accept={String(riskDecision?.autoAcceptExecuted ?? 0)}
      data-ik-composite-status={
        p5LaborOn && p6MaterialOn ? (composite?.status ?? "pending") : "hold"
      }
      data-ik-composite-both-hold={String(composite?.bothHoldLineCount ?? 0)}
      data-ik-composite-complete={String(composite?.completeLineCount ?? 0)}
      data-ik-composite-accept={String(composite?.autoAcceptExecuted ?? 0)}
      data-ik-composite-http={String(composite?.researchHttpExecuted ? 1 : 0)}
      data-ik-composite-feeds-p7={String(composite?.feedsP7Bid ? 1 : 0)}
      data-ik-identity-status={
        identityCoverageOn ? (identityCoverage?.status ?? "pending") : "shell_skipped"
      }
      data-ik-identity-work={String(identityCoverage?.counts.trustedWorkIdentity ?? 0)}
      data-ik-identity-material={String(identityCoverage?.counts.trustedMaterialIdentity ?? 0)}
      data-ik-identity-alias={String(identityCoverage?.counts.approvedAlias ?? 0)}
      data-ik-identity-gap={String(identityCoverage?.counts.identityGap ?? 0)}
      data-ik-knr-status={knr.status}
      data-ik-knr-with-basis={String(knr.counts.withBasis)}
      data-ik-knr-knowledge-status={knrKnowledgeDiag.status}
      data-ik-knr-knowledge-hits={String(knrKnowledgeDiag.hits)}
      data-ik-knr-knowledge-misses={String(knrKnowledgeDiag.misses)}
      data-ik-knr-knowledge-stale={String(knrKnowledgeDiag.staleHits)}
      data-ik-knr-knowledge-pending={String(knrKnowledgeDiag.pendingVerify)}
      data-ik-knr-knowledge-research={String(knrKnowledgeDiag.researchExecuted)}
      data-ik-knr-knowledge-http={String(knrKnowledgeDiag.http)}
      data-ik-knr-knowledge-lookup-only="1"
      data-ik-knr-app-status={knrAppDiag.status}
      data-ik-knr-app-priced={String(knrAppDiag.priced)}
      data-ik-knr-app-partial={String(knrAppDiag.partial)}
      data-ik-knr-app-hold={String(knrAppDiag.hold)}
      data-ik-knr-app-skipped={String(knrAppDiag.skipped)}
      data-ik-knr-app-diag-only="1"
    >
      <IkExpertRoomChrome report={knr}>
        <LiveVisualizationView observation={observation} />
        <IkOwnerActionQueueNavigate
          queue={ownerActionQueue}
          deepLinkContext={ownerActionDeepLinkContext ?? undefined}
          navigateHandlers={ownerActionNavigateHandlers ?? undefined}
        />
        <ExpertConversationSurface vm={vm} />
      </IkExpertRoomChrome>
    </div>
  );
}
