/**
 * W1 Orchestra — async runtime drivers (P2 / KL-3 / P5 / P6).
 * Extracted from IkEntryHost useEffect bodies — zero semantic change.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import {
  needsIkNg02Ingest,
  runIkNg02IngestBridge,
  type IkNg02IngestBridgeResult,
} from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";
import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { runIkMasterBoqLaborExpert } from "@/lib/intelligent-estimator/ik-labor-expert";
import { runIkMasterBoqMaterialExpert } from "@/lib/intelligent-estimator/ik-material-expert";
import {
  resolveHostKnrKnowledgeLookupOnly,
  type KnrKnowledgeEnvelope,
} from "@/lib/intelligent-estimator/knr-knowledge";
import type { IkDocumentExpertReport } from "@/lib/intelligent-estimator/ik-document-expert";
import type { IkKnrExpertReport } from "@/lib/intelligent-estimator/ik-knr-expert";
import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";

export async function executeP2IngestBridge(opts: {
  liveItem: TenderPipelineItem;
  athPreviewEnabled: boolean;
  onUpdate: ((patch: Partial<TenderPipelineItem>, opts?: TenderItemUpdateOpts) => void) | undefined;
  tenderKey: string;
  isStale: () => boolean;
  setIngest: (value: IkNg02IngestBridgeResult | null) => void;
  getLiveItem: () => TenderPipelineItem;
}): Promise<void> {
  const livePkg = getTenderPackage(opts.liveItem.id);
  try {
    const result = await runIkNg02IngestBridge({
      item: opts.liveItem,
      package: livePkg,
      athPreviewEnabled: opts.athPreviewEnabled,
      ensureDocuments: (opts.liveItem.bzpDocuments?.length ?? 0) === 0,
    });
    if (opts.isStale()) return;
    opts.setIngest(result);
    const apply = opts.onUpdate;
    if (result.itemPatch && apply) {
      apply(result.itemPatch, { persist: "local" });
      if (result.extractedLineCount > 0) {
        apply(result.itemPatch, { persist: "cloud" });
      }
    }
  } catch (err) {
    if (opts.isStale()) return;
    const errItem = opts.getLiveItem();
    opts.setIngest({
      phase: "blocked",
      started: true,
      completed: false,
      tenderId: opts.tenderKey,
      documentsUsed: errItem.bzpDocuments?.length ?? 0,
      zipEvidence: [],
      parsersReused: ["buildTenderDossierHeavy"],
      artifactCount: 0,
      extractedLineCount: 0,
      primarySourceFilename: null,
      reasons: [`BRIDGE_THROW:${(err as Error)?.message || String(err)}`],
      itemPatch: null,
      mergedItem: errItem,
      expert: runIkDocumentExpert({
        item: errItem,
        package: getTenderPackage(errItem.id),
      }),
    });
  }
}


export async function executeKl3KnowledgeLookup(opts: {
  tenderId: string;
  knr: IkKnrExpertReport;
  isCancelled: () => boolean;
  setKnrKnowledge: (value: KnrKnowledgeEnvelope | null) => void;
  setKnowledgeBusy: (value: boolean) => void;
}): Promise<void> {
  try {
    const result = await resolveHostKnrKnowledgeLookupOnly({
      tenderId: opts.tenderId,
      lines: opts.knr.lines.map((l) => ({
        lineId: l.lineId,
        catalogBasis: l.catalogBasis,
      })),
      nowIso: new Date().toISOString(),
    });
    if (!opts.isCancelled()) opts.setKnrKnowledge(result.envelope);
  } catch {
    if (!opts.isCancelled()) opts.setKnrKnowledge(null);
  } finally {
    if (!opts.isCancelled()) opts.setKnowledgeBusy(false);
  }
}

export function buildKl3KnowledgeKey(
  tenderId: string,
  knr: IkKnrExpertReport,
): string {
  const basisKey = knr.lines
    .map((l) => `${l.lineId}:${l.catalogBasis?.normalizedKey ?? ""}`)
    .join("|");
  return `${tenderId}|${knr.lines.length}|${basisKey}|lookup-only`;
}

export async function executeP5LaborExpert(opts: {
  effectiveItem: TenderPipelineItem;
  pkg: TenderPackage | null;
  report: IkDocumentExpertReport;
  p5ResearchOn: boolean;
  isCancelled: () => boolean;
  setLabor: (value: IkLaborExpertReport | null) => void;
  onSettled: () => void;
}): Promise<void> {
  try {
    const result = await runIkMasterBoqLaborExpert({
      item: opts.effectiveItem,
      package: opts.pkg,
      expert: opts.report,
      executeResearch: opts.p5ResearchOn === true,
      enableInternalFirst: true,
    });
    if (!opts.isCancelled()) opts.setLabor(result);
  } catch {
    if (!opts.isCancelled()) opts.setLabor(null);
  } finally {
    if (!opts.isCancelled()) opts.onSettled();
  }
}

export async function executeP6MaterialExpert(opts: {
  effectiveItem: TenderPipelineItem;
  pkg: TenderPackage | null;
  report: IkDocumentExpertReport;
  p6ResearchOn: boolean;
  isCancelled: () => boolean;
  setMaterial: (value: IkMaterialExpertReport | null) => void;
}): Promise<void> {
  try {
    const result = await runIkMasterBoqMaterialExpert({
      item: opts.effectiveItem,
      package: opts.pkg,
      expert: opts.report,
      executeResearch: opts.p6ResearchOn === true,
    });
    if (!opts.isCancelled()) opts.setMaterial(result);
  } catch {
    if (!opts.isCancelled()) opts.setMaterial(null);
  }
}

export function buildLaborAttemptKey(
  key: string,
  report: IkDocumentExpertReport,
  p5ResearchOn: boolean,
): string {
  return `${key}|${report.masterBoq.lineCount}|${report.masterBoqLines.length}|${p5ResearchOn ? "B" : "A"}`;
}

export function buildMaterialAttemptKey(
  key: string,
  report: IkDocumentExpertReport,
  p6ResearchOn: boolean,
): string {
  return `${key}|mat|${report.masterBoq.lineCount}|${report.masterBoqLines.length}|${p6ResearchOn ? "B" : "A"}`;
}

export { needsIkNg02Ingest };
