/**
 * IK-MIGRATION-01 P1 shell + P2 Documents→BOQ + P3 classification/identity
 * + P5 Labor E2E + P6 Material E2E + P7 Position Cost → F5 → Bid → SUM
 * + P8 Risk → Validation → Chief → DW → EC.
 *
 * P1: ExpertConversationSurface + pipeline-fact VM · flag seam · NG-10 OFF fallback.
 * P2: when isIkP2DocumentsBoqActive() (IK Entry ON) → NG-02 ingest bridge → Document Expert.
 *     Leftover ikAutoIngestEnabled is NOT the runtime gate (AUTONOMY-08 P0 / OD-08-1).
 * P3: A1 classification via EC when Master BOQ READY; Identity Coverage when
 *     isIkIdentityCoverageEnabled() (AppSettings, default OFF).
 * P5: Labor E2E when isIkP5LaborE2eActive() (AUTO|ON, not OFF); Research-on-Miss permission
 *     isIkP5LaborExecuteResearchActive() (Entry ∧ E2E; host executeResearch === true).
 * P6: Material E2E when isIkP6MaterialE2eActive() (AUTO|ON, not OFF); Research-on-Miss permission
 *     isIkP6MaterialExecuteResearchActive() (Entry ∧ E2E; host executeResearch === true).
 *     P6 waits for P5 settled (laborSettledRef) when P5 ON — IC-SEQ-1/2.
 * P7: F5/Bid when isIkP7F5E2eActive() (AUTO|ON, not OFF); RESEARCH=0 · HTTP=0 always (no research lever).
 * P8: Risk/Decision when isIkP8RiskDecisionE2eActive() (AUTO|ON, not OFF); RESEARCH=0 · HTTP=0 · no D/Chief start.
 *      No extra BOQ READY gate (engine requires item only; P7/Chief optional → HOLD).
 * COMPOSITE: BOTH_HOLD consumer when P5∧P6; leaf experts → computePositionCost (NO CHANGE).
 *
 * Shared RUN_RATE_EXPERTS stays false (never arms Material via shared sentinel).
 * P4 Chief Wiring lives on TenderDetailPage (IK≠D) — passed in as optional session.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { ExpertConversationSurface } from "@/app/expert-conversation";
import { IkExpertRoomChrome } from "@/lib/intelligent-estimator/IkExpertRoomChrome";
import { buildIkEntryConversationViewModel } from "@/lib/intelligent-estimator/ik-entry-conversation";
import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { runIkKnrExpert } from "@/lib/intelligent-estimator/ik-knr-expert";
import { applyOwnerKnrMapping } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import { runIkMasterBoqClassification } from "@/lib/intelligent-estimator/ik-classification";
import {
  needsIkNg02Ingest,
  runIkNg02IngestBridge,
  type IkNg02IngestBridgeResult,
} from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";
import {
  runIkMasterBoqLaborExpert,
  type IkLaborExpertReport,
} from "@/lib/intelligent-estimator/ik-labor-expert";
import {
  runIkMasterBoqMaterialExpert,
  type IkMaterialExpertReport,
} from "@/lib/intelligent-estimator/ik-material-expert";
import {
  runIkMasterBoqIdentityCoverage,
  type IkIdentityCoverageReport,
} from "@/lib/intelligent-estimator/ik-identity-coverage";
import {
  runIkP7PositionCostBid,
  type IkP7PositionCostBidReport,
} from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import {
  runIkP8RiskDecision,
  type IkP8RiskDecisionReport,
} from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import {
  runIkCompositeBothHold,
  type IkCompositeBothHoldReport,
} from "@/lib/intelligent-estimator/ik-composite-both-hold";
import {
  isIkP2DocumentsBoqActive,
  isIkIdentityCoverageEnabled,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  isIkP7F5E2eActive,
  isIkP8RiskDecisionE2eActive,
} from "@/lib/intelligent-estimator/ik-entry-flag";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
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
   * Host hydration of completed-job ATH = NOT WIRED (OD-IMPL-2).
   */
  historicalIndex = null,
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
}) {
  const p2DocumentsBoqOn = isIkP2DocumentsBoqActive() === true;
  const identityCoverageOn = isIkIdentityCoverageEnabled() === true;
  const p5LaborOn = isIkP5LaborE2eActive() === true;
  const p5ResearchOn = isIkP5LaborExecuteResearchActive() === true;
  const p6MaterialOn = isIkP6MaterialE2eActive() === true;
  const p6ResearchOn = isIkP6MaterialExecuteResearchActive() === true;
  const p7F5On = isIkP7F5E2eActive() === true;
  const p8RiskOn = isIkP8RiskDecisionE2eActive() === true;
  const pkg = useMemo(() => getTenderPackage(item.id), [item.id]);
  const [ingest, setIngest] = useState<IkNg02IngestBridgeResult | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [labor, setLabor] = useState<IkLaborExpertReport | null>(null);
  const [material, setMaterial] = useState<IkMaterialExpertReport | null>(null);
  const attemptedRef = useRef<string | null>(null);
  const laborAttemptedRef = useRef<string | null>(null);
  const materialAttemptedRef = useRef<string | null>(null);
  /** IC-SEQ-2: synchronous P5 settled truth. Tick only retriggers P6. */
  const laborSettledRef = useRef(false);
  const [laborSettleTick, setLaborSettleTick] = useState(0);

  const effectiveItem = ingest?.mergedItem ?? item;

  // P2 Documents→BOQ — IK ON (isIkP2DocumentsBoqActive). Leftover ingest key ignored.
  useEffect(() => {
    if (!p2DocumentsBoqOn) {
      setIngest(null);
      setBridgeBusy(false);
      return;
    }
    const key = item.id || item.tenderId || "";
    if (!key) return;
    if (pipelineIngest?.dossierBuilding || pipelineIngest?.dossierEnriching) return;
    if (!needsIkNg02Ingest(item)) return;
    if (attemptedRef.current === key) return;
    if (!onUpdate) return;

    let cancelled = false;
    setBridgeBusy(true);
    void (async () => {
      if (pipelineIngest) {
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;
        if (pipelineIngest.dossierBuilding || pipelineIngest.dossierEnriching) {
          setBridgeBusy(false);
          return;
        }
        if (!needsIkNg02Ingest(item)) {
          setBridgeBusy(false);
          return;
        }
      }
      if (attemptedRef.current === key) {
        setBridgeBusy(false);
        return;
      }
      attemptedRef.current = key;
      try {
        const result = await runIkNg02IngestBridge({
          item,
          package: pkg,
          athPreviewEnabled,
          ensureDocuments: (item.bzpDocuments?.length ?? 0) === 0,
        });
        if (cancelled) return;
        setIngest(result);
        if (result.itemPatch) {
          onUpdate(result.itemPatch, { persist: "local" });
          if (result.extractedLineCount > 0) {
            onUpdate(result.itemPatch, { persist: "cloud" });
          }
        }
      } catch (err) {
        if (cancelled) return;
        setIngest({
          phase: "blocked",
          started: true,
          completed: false,
          tenderId: key,
          documentsUsed: item.bzpDocuments?.length ?? 0,
          zipEvidence: [],
          parsersReused: ["buildTenderDossierHeavy"],
          artifactCount: 0,
          extractedLineCount: 0,
          primarySourceFilename: null,
          reasons: [`BRIDGE_THROW:${(err as Error)?.message || String(err)}`],
          itemPatch: null,
          mergedItem: item,
          expert: runIkDocumentExpert({ item, package: pkg }),
        });
      } finally {
        if (!cancelled) setBridgeBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    p2DocumentsBoqOn,
    item,
    pkg,
    onUpdate,
    athPreviewEnabled,
    pipelineIngest,
    pipelineIngest?.dossierBuilding,
    pipelineIngest?.dossierEnriching,
  ]);

  const report = useMemo(
    () => ingest?.expert ?? runIkDocumentExpert({ item: effectiveItem, package: pkg }),
    [ingest, effectiveItem, pkg],
  );

  // C3 — KNR Expert (sync read-only adapter; BLOCKED when !readyForExperts).
  // Historical index: optional Host prop (in-memory). Empty ⇒ HISTORICAL_MISS (not an error).
  const knr = useMemo(
    () =>
      runIkKnrExpert({
        tenderId: effectiveItem.id || effectiveItem.tenderId || "",
        documentExpert: report,
        historicalIndex: historicalIndex ?? null,
      }),
    [effectiveItem, report, historicalIndex],
  );

  // D — Owner KNR overlay on LINE COPIES, then existing P3 via opts.classification.
  // Seam: classification (not ingest.expert) — avoids fabricating ingest, keeps C3 knr
  // path / Surface / Hub unchanged, lets P3 read overlay catalogWorkId. Mapping module
  // does not call P3/A1. Original `report` stays for P5.
  const knrMapped = useMemo(
    () => applyOwnerKnrMapping({ documentExpert: report, knr }),
    [report, knr],
  );
  const classification = useMemo(
    () =>
      runIkMasterBoqClassification({
        item: effectiveItem,
        package: pkg,
        expert: knrMapped.expert,
      }),
    [effectiveItem, pkg, knrMapped],
  );

  // P3 Identity Coverage — AppSettings lever (default OFF). Sync diagnostic · 0 HTTP research.
  const identityCoverage = useMemo((): IkIdentityCoverageReport | null => {
    if (!identityCoverageOn) return null;
    if (!report.masterBoq.readyForExperts) return null;
    return runIkMasterBoqIdentityCoverage({
      item: effectiveItem,
      package: pkg,
      expert: report,
    });
  }, [identityCoverageOn, effectiveItem, pkg, report]);

  // P5 Labor E2E — Labor-specific levers (≠ Material / ≠ shared RUN_RATE_EXPERTS).
  useEffect(() => {
    if (!p5LaborOn) {
      laborSettledRef.current = true;
      setLabor(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !report.masterBoq.readyForExperts) {
      laborSettledRef.current = false;
      setLabor(null);
      return;
    }
    const laborKey = `${key}|${report.masterBoq.lineCount}|${report.masterBoqLines.length}|${p5ResearchOn ? "B" : "A"}`;
    if (laborAttemptedRef.current === laborKey) return;
    laborSettledRef.current = false;
    laborAttemptedRef.current = laborKey;
    let cancelled = false;
    void (async () => {
      try {
        const result = await runIkMasterBoqLaborExpert({
          item: effectiveItem,
          package: pkg,
          expert: report,
          executeResearch: p5ResearchOn === true,
          enableInternalFirst: true,
        });
        if (!cancelled) setLabor(result);
      } catch {
        if (!cancelled) setLabor(null);
      } finally {
        if (!cancelled) {
          laborSettledRef.current = true;
          setLaborSettleTick((n) => n + 1);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveItem, pkg, report, p5LaborOn, p5ResearchOn]);

  // P6 Material E2E — Material-specific levers (≠ Labor / ≠ shared RUN_RATE_EXPERTS).
  useEffect(() => {
    if (!p6MaterialOn) {
      setMaterial(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !report.masterBoq.readyForExperts) {
      setMaterial(null);
      return;
    }
    if (p5LaborOn && laborSettledRef.current !== true) return;
    const materialKey = `${key}|mat|${report.masterBoq.lineCount}|${report.masterBoqLines.length}|${p6ResearchOn ? "B" : "A"}`;
    if (materialAttemptedRef.current === materialKey) return;
    materialAttemptedRef.current = materialKey;
    let cancelled = false;
    void (async () => {
      try {
        const result = await runIkMasterBoqMaterialExpert({
          item: effectiveItem,
          package: pkg,
          expert: report,
          executeResearch: p6ResearchOn === true,
        });
        if (!cancelled) setMaterial(result);
      } catch {
        if (!cancelled) setMaterial(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveItem, pkg, report, p5LaborOn, p6MaterialOn, p6ResearchOn, laborSettleTick]);

  // BOTH_HOLD consumer — existing P5∧P6 only · no new flag · XOR F5 (feedsP7Bid=false).
  const composite = useMemo((): IkCompositeBothHoldReport | null => {
    if (!p5LaborOn || !p6MaterialOn) return null;
    if (!report.masterBoq.readyForExperts) return null;
    return runIkCompositeBothHold({
      item: effectiveItem,
      package: pkg,
      expert: report,
      p5LaborActive: true,
      p6MaterialActive: true,
      executeLaborResearch: p5ResearchOn === true,
      executeMaterialResearch: p6ResearchOn === true,
    });
  }, [p5LaborOn, p6MaterialOn, p5ResearchOn, p6ResearchOn, effectiveItem, pkg, report]);

  // P7 Position Cost → F5 → Bid → SUM — sync REUSE engines · RESEARCH=0 · no Accept writes.
  const positionCostBid = useMemo((): IkP7PositionCostBidReport | null => {
    if (!p7F5On) return null;
    if (!report.masterBoq.readyForExperts && !(report.offerBoq?.lines?.length)) {
      return null;
    }
    return runIkP7PositionCostBid({
      item: effectiveItem,
      expert: report,
      package: pkg,
    });
  }, [p7F5On, effectiveItem, pkg, report]);

  // P8 Risk → Validation → DW → EC — REUSE engines · RESEARCH=0 · no D/Chief start · no Accept.
  // Eligibility: isIkP8RiskDecisionE2eActive() only (AUTO|ON). No BOQ READY host gate (KEEP).
  const riskDecision = useMemo((): IkP8RiskDecisionReport | null => {
    if (!p8RiskOn) return null;
    return runIkP8RiskDecision({
      item: effectiveItem,
      p7: positionCostBid,
      bidProposal: positionCostBid?.proposal ?? null,
      chiefSession,
      knrHistorical: knr,
    });
  }, [p8RiskOn, effectiveItem, positionCostBid, chiefSession, knr]);

  const vm = useMemo(
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
      }),
    [effectiveItem, pkg, ingest, bridgeBusy, item, report, pipelineIngest, labor, material, identityCoverage, positionCostBid, riskDecision, composite, knr, classification],
  );

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
    >
      <IkExpertRoomChrome report={knr}>
        <ExpertConversationSurface vm={vm} />
      </IkExpertRoomChrome>
    </div>
  );
}
