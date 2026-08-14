/**
 * IK-MIGRATION-01 P1 — read-only pipeline facts for IK Entry.
 * ZERO discovery engine · ZERO pricing · ZERO research.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";

export type IkBoqReadiness = "ready" | "partial" | "not_ready";

export interface IkEntrySourceRef {
  kind: "document" | "extraction" | "boq_ready" | "hold";
  tenderId: string;
  documentId?: string;
  artifact: {
    attachmentCount?: number;
    bzpDocumentCount?: number;
    documentIds?: string[];
    swzPresent?: boolean;
    swzDocumentId?: string | null;
    discoverySettled?: boolean;
    rowCount?: number;
    sourceFilename?: string | null;
    dossierPresent?: boolean;
  };
}

export interface IkEntryPipelineFacts {
  tenderId: string;
  discoverySettled: boolean;
  attachmentCount: number;
  bzpDocumentCount: number;
  documentIds: string[];
  swzPresent: boolean;
  swzDocumentId: string | null;
  hasSwzAnalysis: boolean;
  dossierPresent: boolean;
  boqRowCount: number;
  boqSourceFilename: string | null;
  boqReadiness: IkBoqReadiness;
}

function bzpDocumentId(
  doc: { documentId?: string; filename?: string },
  index: number,
): string {
  const id = typeof doc.documentId === "string" ? doc.documentId.trim() : "";
  if (id) return id;
  const filename = typeof doc.filename === "string" ? doc.filename.trim() : "";
  return filename || `bzp-doc-${index}`;
}

export function collectIkEntryPipelineFacts(
  item: TenderPipelineItem,
): IkEntryPipelineFacts {
  const tenderId = item.id || item.tenderId || "";
  const bzpDocs = Array.isArray(item.bzpDocuments) ? item.bzpDocuments : [];
  const documentIds = bzpDocs.map((doc, i) => bzpDocumentId(doc, i));
  const swzDoc = bzpDocs.find((d) => d.isSwzHint) ?? null;
  const snapshot = item.tenderDossier?.kosztorys ?? null;
  const snapshotOk = snapshot?.ok === true;
  const boqRowCount = snapshotOk && Number.isFinite(snapshot.rowCount)
    ? Math.max(0, snapshot.rowCount)
    : 0;
  const dossierPresent = item.tenderDossier != null;
  let boqReadiness: IkBoqReadiness = "not_ready";
  if (snapshotOk && boqRowCount > 0) boqReadiness = "ready";
  else if (dossierPresent || snapshot != null) boqReadiness = "partial";

  return {
    tenderId,
    discoverySettled: isDocumentDiscoverySettled(item),
    attachmentCount: countTenderAttachments(item),
    bzpDocumentCount: bzpDocs.length,
    documentIds,
    swzPresent: Boolean(swzDoc) || item.swzAnalysis != null,
    swzDocumentId: swzDoc ? bzpDocumentId(swzDoc, bzpDocs.indexOf(swzDoc)) : null,
    hasSwzAnalysis: item.swzAnalysis != null,
    dossierPresent,
    boqRowCount,
    boqSourceFilename: snapshot?.sourceFilename?.trim() || null,
    boqReadiness,
  };
}
