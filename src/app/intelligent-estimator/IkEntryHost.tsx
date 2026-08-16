/**
 * IK-MIGRATION-01 P1 shell + P2 Documents→BOQ + P3 classification/identity
 * + P5 Labor E2E + P6 Material E2E.
 *
 * P1: ExpertConversationSurface + pipeline-fact VM · flag seam · NG-10 OFF fallback.
 * P2: when isIkAutoIngestEnabled() → NG-02 ingest bridge → Document Expert.
 * P3: A1 classification via EC when Master BOQ READY; Identity Coverage when
 *     isIkIdentityCoverageEnabled() (AppSettings, default OFF).
 * P5: Labor E2E when isIkP5LaborE2eActive(); MODE B research only when
 *     isIkP5LaborExecuteResearchActive() (explicit executeResearch === true).
 * P6: Material E2E when isIkP6MaterialE2eActive(); MODE B research only when
 *     isIkP6MaterialExecuteResearchActive() (explicit executeResearch === true).
 *
 * Shared RUN_RATE_EXPERTS stays false (never arms Material via shared sentinel).
 * P4 Chief Wiring lives on TenderDetailPage (IK≠D) — not labor/material experts.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { ExpertConversationSurface } from "@/app/expert-conversation";
import { buildIkEntryConversationViewModel } from "@/lib/intelligent-estimator/ik-entry-conversation";
import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
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
  isIkAutoIngestEnabled,
  isIkIdentityCoverageEnabled,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
} from "@/lib/intelligent-estimator/ik-entry-flag";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";

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
}: {
  item: TenderPipelineItem;
  onUpdate?: (patch: Partial<TenderPipelineItem>, opts?: TenderItemUpdateOpts) => void;
  pipelineIngest?: {
    dossierBuilding?: boolean;
    dossierEnriching?: boolean;
    heavyDone?: boolean;
  } | null;
  athPreviewEnabled?: boolean;
}) {
  const autoIngestOn = isIkAutoIngestEnabled() === true;
  const identityCoverageOn = isIkIdentityCoverageEnabled() === true;
  const p5LaborOn = isIkP5LaborE2eActive() === true;
  const p5ResearchOn = isIkP5LaborExecuteResearchActive() === true;
  const p6MaterialOn = isIkP6MaterialE2eActive() === true;
  const p6ResearchOn = isIkP6MaterialExecuteResearchActive() === true;
  const pkg = useMemo(() => getTenderPackage(item.id), [item.id]);
  const [ingest, setIngest] = useState<IkNg02IngestBridgeResult | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [labor, setLabor] = useState<IkLaborExpertReport | null>(null);
  const [material, setMaterial] = useState<IkMaterialExpertReport | null>(null);
  const attemptedRef = useRef<string | null>(null);
  const laborAttemptedRef = useRef<string | null>(null);
  const materialAttemptedRef = useRef<string | null>(null);

  const effectiveItem = ingest?.mergedItem ?? item;

  // P2 Documents→BOQ — only when AppSettings.ikAutoIngestEnabled (default OFF).
  useEffect(() => {
    if (!autoIngestOn) {
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
    autoIngestOn,
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
      setLabor(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !report.masterBoq.readyForExperts) {
      setLabor(null);
      return;
    }
    const laborKey = `${key}|${report.masterBoq.lineCount}|${report.masterBoqLines.length}|${p5ResearchOn ? "B" : "A"}`;
    if (laborAttemptedRef.current === laborKey) return;
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
  }, [effectiveItem, pkg, report, p6MaterialOn, p6ResearchOn]);

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
      }),
    [effectiveItem, pkg, ingest, bridgeBusy, item, report, pipelineIngest, labor, material, identityCoverage],
  );

  return (
    <div
      className="mb-4"
      data-ik-entry-host="1"
      data-ik-entry-shell="1"
      data-ik-entry-auto-ingest={autoIngestOn ? "1" : "0"}
      data-ik-entry-execute-research={p5ResearchOn ? "1" : "0"}
      data-ik-p2-documents-boq={autoIngestOn ? "1" : "0"}
      data-ik-p3-identity-coverage={identityCoverageOn ? "1" : "0"}
      data-ik-p5-labor-e2e={p5LaborOn ? "1" : "0"}
      data-ik-p5-labor-research={p5ResearchOn ? "1" : "0"}
      data-ik-p6-material-e2e={p6MaterialOn ? "1" : "0"}
      data-ik-p6-material-research={p6ResearchOn ? "1" : "0"}
      data-ik-entry-identity-coverage={identityCoverageOn ? "1" : "0"}
      data-ik-entry-tender-id={item.id}
      data-ik-entry-boq-status={report.masterBoq.status}
      data-ik-cost-doc-count={String(report.costDocuments.length)}
      data-ik-przedmiar-count={String(report.przedmiary.length)}
      data-ik-master-ready={report.masterBoq.readyForExperts ? "1" : "0"}
      data-ik-extracted-lines={String(report.extraction.extractedCount)}
      data-ik-ingest-phase={
        autoIngestOn
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
      data-ik-identity-status={
        identityCoverageOn ? (identityCoverage?.status ?? "pending") : "shell_skipped"
      }
      data-ik-identity-work={String(identityCoverage?.counts.trustedWorkIdentity ?? 0)}
      data-ik-identity-material={String(identityCoverage?.counts.trustedMaterialIdentity ?? 0)}
      data-ik-identity-alias={String(identityCoverage?.counts.approvedAlias ?? 0)}
      data-ik-identity-gap={String(identityCoverage?.counts.identityGap ?? 0)}
    >
      <ExpertConversationSurface vm={vm} />
    </div>
  );
}
