/**
 * IK-MIGRATION-01 P1/P2.5/P3/P4/P5 — first-screen host.
 * REUSE ExpertConversationSurface + NG-02 heavy + Classification + Labor + Material Expert.
 * ZERO NG-10. ZERO new chat store. ZERO auto-Accept.
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
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";

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

  useEffect(() => {
    const key = item.id || item.tenderId || "";
    if (!key) return;
    if (pipelineIngest?.dossierBuilding || pipelineIngest?.dossierEnriching) return;
    if (!needsIkNg02Ingest(item)) return;
    if (attemptedRef.current === key) return;
    if (!onUpdate) return;

    let cancelled = false;
    setBridgeBusy(true);
    void (async () => {
      // Prefer existing useTenderDossierHeavyLazy when it starts within grace window.
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

  // P4 — Labor Expert when Master BOQ READY (identity → CURRENT/MISS → research only if justified).
  useEffect(() => {
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
          executeResearch: true,
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

  // P5 — Material Expert when Master BOQ READY (identity → PM HIT/MISS → research only if justified).
  useEffect(() => {
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
          executeResearch: true,
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
      }),
    [effectiveItem, pkg, ingest, bridgeBusy, item, report, pipelineIngest, labor, material],
  );

  return (
    <div
      className="mb-4"
      data-ik-entry-host="1"
      data-ik-entry-tender-id={item.id}
      data-ik-entry-boq-status={report.masterBoq.status}
      data-ik-cost-doc-count={String(report.costDocuments.length)}
      data-ik-przedmiar-count={String(report.przedmiary.length)}
      data-ik-master-ready={report.masterBoq.readyForExperts ? "1" : "0"}
      data-ik-extracted-lines={String(report.extraction.extractedCount)}
      data-ik-ingest-phase={ingest?.phase ?? (bridgeBusy ? "started" : "idle")}
      data-ik-labor-status={labor?.status ?? "pending"}
      data-ik-labor-resolved={String(labor?.counts.workIdentityResolved ?? 0)}
      data-ik-labor-research={String(labor?.counts.researchCalls ?? 0)}
      data-ik-material-status={material?.status ?? "pending"}
      data-ik-material-resolved={String(material?.counts.materialIdentityResolved ?? 0)}
      data-ik-material-research={String(material?.counts.researchCalls ?? 0)}
      data-ik-material-pm-hit={String(material?.counts.priceMemoryHit ?? 0)}
    >
      <ExpertConversationSurface vm={vm} />
    </div>
  );
}
