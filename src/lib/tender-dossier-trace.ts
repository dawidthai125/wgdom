/** Trace pipeline analizy dossier przetargu (P2-E.0 / P2-E.1B). */

export type DossierTraceStep =
  | "document_discovered"
  | "document_downloaded"
  | "document_classified"
  | "document_parsed"
  | "criteria_extracted"
  | "value_extracted"
  | "cost_estimate_extracted"
  | "cost_document_discovered"
  | "zip_downloaded"
  | "zip_opened"
  | "zip_open_failed"
  | "zip_inner_files_found"
  | "ath_detected"
  | "ath_bytes_loaded"
  | "ath_parsed"
  | "ath_parse_failed"
  | "kosztorys_created"
  | "dossier_updated"
  | "value_document_trace";

export interface DossierTraceEntry {
  step: DossierTraceStep;
  at: string;
  filename: string;
  detail: Record<string, unknown>;
}

const buffer: DossierTraceEntry[] = [];
const MAX = 120;

export function traceDossierPipeline(
  step: DossierTraceStep,
  filename: string,
  detail: Record<string, unknown> = {},
): void {
  const entry: DossierTraceEntry = { step, at: new Date().toISOString(), filename, detail };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  if (import.meta.env?.DEV && typeof console !== "undefined" && console.debug) {
    console.debug(`[Dossier trace] ${step}`, filename, detail);
  }
}

export function getDossierTraceLog(): DossierTraceEntry[] {
  return [...buffer];
}

export function clearDossierTraceLog(): void {
  buffer.length = 0;
}
