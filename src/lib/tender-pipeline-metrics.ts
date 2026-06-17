/**
 * P3-AUDIT-001-FIX-C — liczniki I/O pipeline (testy / audyt, bez wpływu na prod UX).
 */

export interface TenderPipelineMetricsSnapshot {
  fetchBytes: number;
  pdfExtract: number;
  zipLoad: number;
}

let fetchBytes = 0;
let pdfExtract = 0;
let zipLoad = 0;

export function resetTenderPipelineMetrics(): void {
  fetchBytes = 0;
  pdfExtract = 0;
  zipLoad = 0;
}

export function recordTenderDocumentFetch(): void {
  fetchBytes += 1;
}

export function recordTenderPdfExtract(): void {
  pdfExtract += 1;
}

export function recordTenderZipLoad(): void {
  zipLoad += 1;
}

export function getTenderPipelineMetrics(): TenderPipelineMetricsSnapshot {
  return { fetchBytes, pdfExtract, zipLoad };
}
