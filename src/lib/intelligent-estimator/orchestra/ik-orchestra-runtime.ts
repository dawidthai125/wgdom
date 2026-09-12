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
  runIkAtesdTechnologyPhase,
  type IkAtesdTechnologyPhaseResult,
} from "@/lib/intelligent-estimator/orchestra/ik-atesd-technology-phase";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation/types";
import {
  resolveHostKnrKnowledgeLookupOnly,
  type KnrKnowledgeEnvelope,
  type KnrHostKnowledgeResolveResult,
} from "@/lib/intelligent-estimator/knr-knowledge";
import {
  resolveKnrVerifyActorFromAdminSession,
} from "@/lib/intelligent-estimator/orchestra/ik-knr-reanalysis-seam";
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


/**
 * KL-3 busy contract on settle (success / MISS / error):
 * clear busy only when this attempt was not cancelled.
 * Cancelled attempts must clear busy in effect cleanup instead —
 * so a newer in-flight run is not clobbered by a stale finally.
 */
export function shouldClearKl3KnowledgeBusyOnFinally(cancelled: boolean): boolean {
  return cancelled !== true;
}

/**
 * Effect cleanup for an in-flight KL-3 attempt: release busy + same-key latch
 * so a later effect with the same knowledgeKey can retry.
 */
export function resolveKl3InFlightCancelCleanup(input: {
  inFlightKnowledgeKey: string;
  attemptedKey: string | null;
}): { nextAttemptedKey: string | null; clearBusy: true } {
  const nextAttemptedKey =
    input.attemptedKey === input.inFlightKnowledgeKey ? null : input.attemptedKey;
  return { nextAttemptedKey, clearBusy: true };
}

export async function executeKl3KnowledgeLookup(opts: {
  tenderId: string;
  knr: IkKnrExpertReport;
  /** Optional Master BOQ — improves public registry query on catalog MISS. */
  documentExpert?: IkDocumentExpertReport | null;
  isCancelled: () => boolean;
  setKnrKnowledge: (value: KnrKnowledgeEnvelope | null) => void;
  setKnowledgeBusy: (value: boolean) => void;
  onHostComplete?: (result: KnrHostKnowledgeResolveResult) => void;
}): Promise<KnrHostKnowledgeResolveResult | null> {
  try {
    const descByLineId = new Map<string, string>();
    for (const ref of opts.documentExpert?.masterBoqLines ?? []) {
      const desc = String(ref.line.description ?? "").trim();
      if (desc) descByLineId.set(ref.line.lineId, desc);
    }

    const actor = resolveKnrVerifyActorFromAdminSession();

    const result = await resolveHostKnrKnowledgeLookupOnly({
      tenderId: opts.tenderId,
      lines: opts.knr.lines.map((l) => ({
        lineId: l.lineId,
        dwellingId: l.dwellingId,
        catalogBasis: l.catalogBasis,
        description: descByLineId.get(l.lineId) ?? null,
      })),
      actor,
      nowIso: new Date().toISOString(),
    });
    if (!opts.isCancelled()) {
      opts.setKnrKnowledge(result.envelope);
      opts.onHostComplete?.(result);
    }
    return opts.isCancelled() ? null : result;
  } catch {
    if (!opts.isCancelled()) opts.setKnrKnowledge(null);
    return null;
  } finally {
    if (shouldClearKl3KnowledgeBusyOnFinally(opts.isCancelled())) {
      opts.setKnowledgeBusy(false);
    }
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
  expert: IkDocumentExpertReport;
  p5ResearchOn: boolean;
  isCancelled: () => boolean;
  setLabor: (value: IkLaborExpertReport | null) => void;
  onSettled: () => void;
}): Promise<void> {
  try {
    const result = await runIkMasterBoqLaborExpert({
      item: opts.effectiveItem,
      package: opts.pkg,
      expert: opts.expert,
      executeResearch: opts.p5ResearchOn === true,
      enableInternalFirst: true,
    });
    // Single cancel gate: setLabor + onSettled must not split across a cleanup tick.
    if (opts.isCancelled()) return;
    opts.setLabor(result);
    opts.onSettled();
  } catch {
    if (opts.isCancelled()) return;
    opts.setLabor(null);
    opts.onSettled();
  }
}

export async function executeP6MaterialExpert(opts: {
  effectiveItem: TenderPipelineItem;
  pkg: TenderPackage | null;
  expert: IkDocumentExpertReport;
  p6ResearchOn: boolean;
  isCancelled: () => boolean;
  setMaterial: (value: IkMaterialExpertReport | null) => void;
}): Promise<void> {
  try {
    const result = await runIkMasterBoqMaterialExpert({
      item: opts.effectiveItem,
      package: opts.pkg,
      expert: opts.expert,
      executeResearch: opts.p6ResearchOn === true,
    });
    if (!opts.isCancelled()) opts.setMaterial(result);
  } catch {
    if (!opts.isCancelled()) opts.setMaterial(null);
  }
}

/**
 * ATESD/ATHED Orchestra CONNECT — after G2 identity/rate, before P6 material.
 * REUSE runIkAtesdTechnologyPhase → BatchAsync ATHED→ATSS→ATA→AUTO_BOM.
 */
export async function executeAtesdTechnologyPhase(opts: {
  effectiveItem: TenderPipelineItem;
  pkg: TenderPackage | null;
  expert: IkDocumentExpertReport;
  executeAthedFetch: boolean;
  store?: WorkCatalogStore;
  packs?: readonly TechnologyPack[];
  isCancelled: () => boolean;
  setAtesd: (value: IkAtesdTechnologyPhaseResult | null) => void;
  onSettled?: () => void;
}): Promise<void> {
  try {
    const result = await runIkAtesdTechnologyPhase({
      expert: opts.expert,
      package: opts.pkg,
      store: opts.store,
      packs: opts.packs,
      tenderId: opts.effectiveItem.id || opts.effectiveItem.tenderId || "",
      executeAthedFetch: opts.executeAthedFetch === true,
      registerAcceptedPackInMemory: true,
      disableAmpedLive: true,
    });
    if (opts.isCancelled()) return;
    opts.setAtesd(result);
    opts.onSettled?.();
  } catch {
    if (opts.isCancelled()) return;
    opts.setAtesd(null);
    opts.onSettled?.();
  }
}

export function buildAtesdAttemptKey(
  key: string,
  expert: IkDocumentExpertReport,
  executeAthedFetch: boolean,
): string {
  return `${key}|atesd|${expert.masterBoq.lineCount}|${expert.masterBoqLines.length}|${executeAthedFetch ? "F" : "A"}`;
}

export function buildLaborAttemptKey(
  key: string,
  expert: IkDocumentExpertReport,
  p5ResearchOn: boolean,
): string {
  return `${key}|${expert.masterBoq.lineCount}|${expert.masterBoqLines.length}|${p5ResearchOn ? "B" : "A"}`;
}

export function buildMaterialAttemptKey(
  key: string,
  expert: IkDocumentExpertReport,
  p6ResearchOn: boolean,
): string {
  return `${key}|mat|${expert.masterBoq.lineCount}|${expert.masterBoqLines.length}|${p6ResearchOn ? "B" : "A"}`;
}

export { needsIkNg02Ingest };
