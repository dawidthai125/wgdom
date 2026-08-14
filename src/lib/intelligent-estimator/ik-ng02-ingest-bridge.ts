/**
 * IK-MIGRATION-01 P2.5 — thin bridge onto existing NG-02 heavy dossier parse.
 * REUSE: fetchTenderDocuments · buildTenderDossierHeavy · Document Expert.
 * ZERO new parser · ZERO new BOQ engine · ZERO ATH writer · ZERO research.
 */

import type { TenderPipelineItem, TenderBzpDocument } from "@/lib/tenders-bzp";
import { fetchTenderDocuments, fetchTenderZipCatalog } from "@/lib/tenders-bzp";
import {
  buildTenderDossierHeavy,
  tenderDossierHeavyParseDone,
} from "@/lib/tender-dossier-pipeline";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import {
  runIkDocumentExpert,
  type IkDocumentExpertReport,
} from "@/lib/intelligent-estimator/ik-document-expert";
import type { TenderPackage } from "@/lib/multi-dwelling/types";

export type IkNg02IngestPhase =
  | "idle"
  | "needs_docs"
  | "started"
  | "completed"
  | "blocked"
  | "skipped_already_done";

export interface IkZipInnerEntryEvidence {
  zipFilename: string;
  documentIndex: number;
  zipSize: number | null;
  innerCount: number;
  innerPaths: string[];
}

export interface IkNg02IngestBridgeResult {
  phase: IkNg02IngestPhase;
  started: boolean;
  completed: boolean;
  tenderId: string;
  documentsUsed: number;
  zipEvidence: IkZipInnerEntryEvidence[];
  parsersReused: string[];
  artifactCount: number;
  extractedLineCount: number;
  primarySourceFilename: string | null;
  reasons: string[];
  itemPatch: Partial<TenderPipelineItem> | null;
  mergedItem: TenderPipelineItem;
  expert: IkDocumentExpertReport;
}

function attachmentCount(item: TenderPipelineItem): number {
  return countTenderAttachments(item);
}

function artifactRows(item: TenderPipelineItem): number {
  const arts =
    item.tenderDossier?.scanSummary?.branchWinnerArtifacts
    ?? item.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? [];
  return arts.reduce((sum, a) => {
    const n = a.snapshot?.rows?.length
      ?? a.snapshot?.catalogQuantities?.length
      ?? a.snapshot?.rowCount
      ?? 0;
    return sum + (Number.isFinite(n) ? Number(n) : 0);
  }, 0);
}

function primaryRows(item: TenderPipelineItem): number {
  const snap = item.tenderDossier?.kosztorys;
  if (!snap?.ok) return 0;
  return Math.max(
    snap.rows?.length ?? 0,
    snap.catalogQuantities?.length ?? 0,
    snap.rowCount ?? 0,
  );
}

/** True when attachments exist but dossier has no usable BOQ extraction yet. */
export function needsIkNg02Ingest(item: TenderPipelineItem): boolean {
  if (attachmentCount(item) === 0) return false;
  if (primaryRows(item) > 0 || artifactRows(item) > 0) return false;
  if (tenderDossierHeavyParseDone(item.tenderDossier) && primaryRows(item) === 0) {
    // Heavy stamped done but empty — still a gap; bridge may re-run with existingDossier null only via force.
    return false;
  }
  return true;
}

async function catalogZips(
  tenderId: string,
  docs: TenderBzpDocument[],
): Promise<IkZipInnerEntryEvidence[]> {
  const out: IkZipInnerEntryEvidence[] = [];
  for (const d of docs) {
    if (!/\.zip$/i.test(d.filename || "")) continue;
    try {
      const cat = await fetchTenderZipCatalog({
        tenderId,
        documentIndex: d.index,
        downloadUrl: d.downloadUrl,
      });
      const entries = cat.entries ?? [];
      out.push({
        zipFilename: d.filename,
        documentIndex: d.index,
        zipSize: cat.zipSize ?? null,
        innerCount: entries.length,
        innerPaths: entries.map((e) => e.path || e.filename).filter(Boolean).slice(0, 40),
      });
    } catch (err) {
      out.push({
        zipFilename: d.filename,
        documentIndex: d.index,
        zipSize: null,
        innerCount: 0,
        innerPaths: [`CATALOG_FAIL:${(err as Error)?.message || String(err)}`],
      });
    }
  }
  return out;
}

/**
 * Run existing NG-02 heavy parse when Document Expert would otherwise see 0 lines.
 * Does not invent lines. Persisting is caller's job via itemPatch + onUpdate.
 */
export async function runIkNg02IngestBridge(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  athPreviewEnabled?: boolean;
  /** When true, fetch BZP docs if item has none (existing Edge API only). */
  ensureDocuments?: boolean;
  noticeNumber?: string | null;
}): Promise<IkNg02IngestBridgeResult> {
  const tenderId = opts.item.id || opts.item.tenderId || "";
  const athPreviewEnabled = opts.athPreviewEnabled !== false;
  let item = opts.item;
  const reasons: string[] = [];
  const parsersReused = [
    "buildTenderDossierHeavy",
    "tender-document-resolver",
    "ath-parser",
    "tenders-bzp-doc-parse",
    "pdf-przedmiar-heuristic",
  ];

  const baseExpert = () => runIkDocumentExpert({ item, package: opts.package });

  if (!tenderId) {
    const expert = baseExpert();
    return {
      phase: "blocked",
      started: false,
      completed: false,
      tenderId: "",
      documentsUsed: 0,
      zipEvidence: [],
      parsersReused,
      artifactCount: 0,
      extractedLineCount: 0,
      primarySourceFilename: null,
      reasons: ["NO_TENDER_ID"],
      itemPatch: null,
      mergedItem: item,
      expert,
    };
  }

  if (opts.ensureDocuments && attachmentCount(item) === 0) {
    const notice =
      opts.noticeNumber
      || item.noticeNumber
      || item.bzpNumber
      || undefined;
    try {
      const docs = await fetchTenderDocuments(
        notice ? { tenderId, noticeNumber: notice } : { tenderId: item.tenderId || tenderId, noticeNumber: notice },
      );
      if (docs.length > 0) {
        item = {
          ...item,
          tenderId: item.tenderId || tenderId,
          bzpDocuments: docs,
          documentsFetchedAt: new Date().toISOString(),
          noticeNumber: notice || item.noticeNumber,
        };
        reasons.push(`DOCS_FETCHED=${docs.length}`);
      } else {
        // Fallback: object id vs OCDS id (pipeline often stores OCDS in tenderId).
        const altId = item.tenderId && item.tenderId !== tenderId ? item.tenderId : tenderId;
        const docs2 = await fetchTenderDocuments(
          notice ? { tenderId: altId, noticeNumber: notice } : altId,
        );
        if (docs2.length > 0) {
          item = {
            ...item,
            tenderId: item.tenderId || altId,
            bzpDocuments: docs2,
            documentsFetchedAt: new Date().toISOString(),
            noticeNumber: notice || item.noticeNumber,
          };
          reasons.push(`DOCS_FETCHED_ALT=${docs2.length}`);
        } else {
          reasons.push("DOCS_FETCH_EMPTY");
        }
      }
    } catch (err) {
      reasons.push(`DOCS_FETCH_FAIL:${(err as Error)?.message || String(err)}`);
    }
  }

  if (attachmentCount(item) === 0) {
    const expert = baseExpert();
    return {
      phase: isDocumentDiscoverySettled(item) ? "blocked" : "needs_docs",
      started: false,
      completed: false,
      tenderId,
      documentsUsed: 0,
      zipEvidence: [],
      parsersReused,
      artifactCount: 0,
      extractedLineCount: 0,
      primarySourceFilename: null,
      reasons: [...reasons, "NO_ATTACHMENTS"],
      itemPatch: null,
      mergedItem: item,
      expert,
    };
  }

  if (!needsIkNg02Ingest(item)) {
    const expert = baseExpert();
    const extracted = Math.max(
      expert.extraction.extractedCount,
      expert.masterBoq.lineCount,
      primaryRows(item),
      artifactRows(item),
    );
    return {
      phase: "skipped_already_done",
      started: false,
      completed: extracted > 0,
      tenderId,
      documentsUsed: attachmentCount(item),
      zipEvidence: [],
      parsersReused,
      artifactCount:
        item.tenderDossier?.scanSummary?.branchWinnerArtifacts?.length
        ?? item.tenderDossier?.scanSummary?.costBranchArtifacts?.length
        ?? 0,
      extractedLineCount: extracted,
      primarySourceFilename: item.tenderDossier?.kosztorys?.sourceFilename ?? null,
      reasons: [...reasons, "INGEST_SKIP_ALREADY_HAS_EXTRACTION"],
      itemPatch: null,
      mergedItem: item,
      expert,
    };
  }

  const docs = item.bzpDocuments ?? [];
  const zipEvidence = await catalogZips(tenderId, docs);

  const built = await buildTenderDossierHeavy({
    item: {
      ...item,
      tenderId: item.tenderId || tenderId,
    },
    docs,
    noticeHtml: item.noticeHtml ?? null,
    existingSwz: item.swzAnalysis ?? null,
    existingDossier: null,
    athPreviewEnabled,
  });

  const itemPatch: Partial<TenderPipelineItem> = {
    tenderDossier: built.tenderDossier,
  };
  if (docs.length > 0 && (opts.item.bzpDocuments?.length ?? 0) === 0) {
    itemPatch.bzpDocuments = docs;
    itemPatch.documentsFetchedAt = item.documentsFetchedAt;
    if (item.noticeNumber) itemPatch.noticeNumber = item.noticeNumber;
  }
  if (built.swzAnalysis) itemPatch.swzAnalysis = built.swzAnalysis;
  if (built.ourEstimatePln != null && item.ourEstimatePln == null) {
    itemPatch.ourEstimatePln = built.ourEstimatePln;
  }

  const mergedItem: TenderPipelineItem = { ...item, ...itemPatch };
  const expert = runIkDocumentExpert({ item: mergedItem, package: opts.package });
  const arts =
    built.tenderDossier?.scanSummary?.branchWinnerArtifacts
    ?? built.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? [];
  const extracted = Math.max(
    expert.extraction.extractedCount,
    expert.masterBoq.lineCount,
    primaryRows(mergedItem),
    artifactRows(mergedItem),
  );

  if (extracted === 0) {
    reasons.push("HEAVY_COMPLETED_BUT_ZERO_LINES");
  } else {
    reasons.push(`HEAVY_EXTRACTED=${extracted}`);
  }

  return {
    phase: extracted > 0 ? "completed" : "blocked",
    started: true,
    completed: extracted > 0,
    tenderId,
    documentsUsed: docs.length,
    zipEvidence,
    parsersReused,
    artifactCount: arts.length,
    extractedLineCount: extracted,
    primarySourceFilename: built.tenderDossier?.kosztorys?.sourceFilename ?? null,
    reasons,
    itemPatch,
    mergedItem,
    expert,
  };
}
