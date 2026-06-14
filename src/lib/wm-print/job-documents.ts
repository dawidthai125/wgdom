import type { WmPrintJobDocument } from "@/lib/wm-print/types";

export function normalizeWmPrintJobDocuments(raw: unknown): WmPrintJobDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is WmPrintJobDocument =>
      !!d &&
      typeof d === "object" &&
      typeof (d as WmPrintJobDocument).id === "string" &&
      typeof (d as WmPrintJobDocument).jobId === "string",
  );
}

export function getWmPrintJobDocumentsForJob(
  docs: WmPrintJobDocument[],
  jobId: string,
): WmPrintJobDocument[] {
  return docs.filter((d) => d.jobId === jobId);
}

export function addWmPrintJobDocument(
  docs: WmPrintJobDocument[],
  doc: WmPrintJobDocument,
): WmPrintJobDocument[] {
  return [...docs, doc];
}

export function deleteWmPrintJobDocumentLogical(
  docs: WmPrintJobDocument[],
  id: string,
): { docs: WmPrintJobDocument[]; deletedId: string } {
  return { docs: docs.filter((d) => d.id !== id), deletedId: id };
}

export function countWmPrintJobDocuments(docs: WmPrintJobDocument[], jobId: string): number {
  return docs.filter((d) => d.jobId === jobId).length;
}
