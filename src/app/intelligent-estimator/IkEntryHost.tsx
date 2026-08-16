/**
 * IK-MIGRATION-01 P1 — IK Entry Shell host (hardened).
 *
 * Design Freeze §6 IN: ExpertConversationSurface + pipeline-fact VM · flag seam · NG-10 OFF fallback.
 * OUT of automatic P1 path: NG-02 auto-ingest cloud writes · labor/material HTTP research · Accept · F5 · D.
 *
 * Extended expert code remains behind explicit shell guards (default OFF).
 * Flip only with Owner GO for P2.5 / P5+ — do not invent a second host.
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
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";

/**
 * P1 Entry Shell guards — default OFF (R1 harden).
 * AUTO_INGEST: P2.5 bridge + possible local/cloud itemPatch.
 * EXECUTE_RESEARCH: labor selective HTTP + material Phase2 orchestration.
 */
export const IK_ENTRY_SHELL_AUTO_INGEST = false;
export const IK_ENTRY_SHELL_EXECUTE_RESEARCH = false;
/** Sync identity audit (no HTTP). OFF in P1 shell — P3/P5.5 Owner GO. */
export const IK_ENTRY_SHELL_IDENTITY_COVERAGE = false;
/** Labor/material expert reports without research (lookup-only). OFF in P1 shell. */
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
  const pkg = useMemo(() => getTenderPackage(item.id), [item.id]);
  const [ingest, setIngest] = useState<IkNg02IngestBridgeResult | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [labor, setLabor] = useState<IkLaborExpertReport | null>(null);
  const [material, setMaterial] = useState<IkMaterialExpertReport | null>(null);
  const attemptedRef = useRef<string | null>(null);
  const laborAttemptedRef = useRef<string | null>(null);
  const materialAttemptedRef = useRef<string | null>(null);

  const effectiveItem = ingest?.mergedItem ?? item;

  // P2.5 ingest — gated OFF for P1 shell (no fetch / no cloud write).
  useEffect(() => {
    if (!IK_ENTRY_SHELL_AUTO_INGEST) return;
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

  const identityCoverage = useMemo((): IkIdentityCoverageReport | null => {
    if (!IK_ENTRY_SHELL_IDENTITY_COVERAGE) return null;
    if (!report.masterBoq.readyForExperts) return null;
    return runIkMasterBoqIdentityCoverage({
      item: effectiveItem,
      package: pkg,
      expert: report,
    });
  }, [effectiveItem, pkg, report]);

  // Labor expert — gated; when enabled, research still forced OFF in P1 shell.
  useEffect(() => {
    if (!IK_ENTRY_SHELL_RUN_RATE_EXPERTS) {
      setLabor(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !report.masterBoq.readyForExperts) {
      setLabor(null);
      return;
    }
    const laborKey = `${key}|${report.masterBoq.lineCount}|${report.masterBoqLines.length}`;
    if (laborAttemptedRef.current === laborKey) return;
    laborAttemptedRef.current = laborKey;
    let cancelled = false;
    void (async () => {
      try {
        const result = await runIkMasterBoqLaborExpert({
          item: effectiveItem,
          package: pkg,
          expert: report,
          executeResearch: IK_ENTRY_SHELL_EXECUTE_RESEARCH,
        });
        if (!cancelled) setLabor(result);
      } catch {
        if (!cancelled) setLabor(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveItem, pkg, report]);

  // Material expert — gated; research OFF in P1 shell.
  useEffect(() => {
    if (!IK_ENTRY_SHELL_RUN_RATE_EXPERTS) {
      setMaterial(null);
      return;
    }
    const key = effectiveItem.id || effectiveItem.tenderId || "";
    if (!key || !report.masterBoq.readyForExperts) {
      setMaterial(null);
      return;
    }
    const materialKey = `${key}|mat|${report.masterBoq.lineCount}|${report.masterBoqLines.length}`;
    if (materialAttemptedRef.current === materialKey) return;
    materialAttemptedRef.current = materialKey;
    let cancelled = false;
    void (async () => {
      try {
        const result = await runIkMasterBoqMaterialExpert({
          item: effectiveItem,
          package: pkg,
          expert: report,
          executeResearch: IK_ENTRY_SHELL_EXECUTE_RESEARCH,
        });
        if (!cancelled) setMaterial(result);
      } catch {
        if (!cancelled) setMaterial(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveItem, pkg, report]);

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
      data-ik-entry-auto-ingest={IK_ENTRY_SHELL_AUTO_INGEST ? "1" : "0"}
      data-ik-entry-execute-research={IK_ENTRY_SHELL_EXECUTE_RESEARCH ? "1" : "0"}
      data-ik-entry-tender-id={item.id}
      data-ik-entry-boq-status={report.masterBoq.status}
      data-ik-cost-doc-count={String(report.costDocuments.length)}
      data-ik-przedmiar-count={String(report.przedmiary.length)}
      data-ik-master-ready={report.masterBoq.readyForExperts ? "1" : "0"}
      data-ik-extracted-lines={String(report.extraction.extractedCount)}
      data-ik-ingest-phase={
        IK_ENTRY_SHELL_AUTO_INGEST
          ? (ingest?.phase ?? (bridgeBusy ? "started" : "idle"))
          : "shell"
      }
      data-ik-labor-status={
        IK_ENTRY_SHELL_RUN_RATE_EXPERTS ? (labor?.status ?? "pending") : "shell_skipped"
      }
      data-ik-labor-resolved={String(labor?.counts.workIdentityResolved ?? 0)}
      data-ik-labor-research={String(labor?.counts.researchCalls ?? 0)}
      data-ik-material-status={
        IK_ENTRY_SHELL_RUN_RATE_EXPERTS ? (material?.status ?? "pending") : "shell_skipped"
      }
      data-ik-material-resolved={String(material?.counts.materialIdentityResolved ?? 0)}
      data-ik-material-research={String(material?.counts.researchCalls ?? 0)}
      data-ik-material-pm-hit={String(material?.counts.priceMemoryHit ?? 0)}
      data-ik-identity-status={identityCoverage?.status ?? "shell_skipped"}
      data-ik-identity-work={String(identityCoverage?.counts.trustedWorkIdentity ?? 0)}
      data-ik-identity-material={String(identityCoverage?.counts.trustedMaterialIdentity ?? 0)}
      data-ik-identity-alias={String(identityCoverage?.counts.approvedAlias ?? 0)}
      data-ik-identity-gap={String(identityCoverage?.counts.identityGap ?? 0)}
    >
      <ExpertConversationSurface vm={vm} />
    </div>
  );
}
