/** Trace pipeline analizy dossier przetargu (P2-E.0). */

export type DossierTraceStep =
  | "document_discovered"
  | "document_downloaded"
  | "document_classified"
  | "document_parsed"
  | "criteria_extracted"
  | "value_extracted"
  | "cost_estimate_extracted";

export interface DossierTraceEntry {
  step: DossierTraceStep;
  at: string;
  filename: string;
  detail: Record<string, unknown>;
}

const buffer: DossierTraceEntry[] = [];
const MAX = 80;

export function traceDossierPipeline(
  step: DossierTraceStep,
  filename: string,
  detail: Record<string, unknown> = {},
): void {
  const entry: DossierTraceEntry = { step, at: new Date().toISOString(), filename, detail };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  if (typeof console !== "undefined" && console.debug) {
    console.debug(`[Dossier trace] ${step}`, filename, detail);
  }
}

export function getDossierTraceLog(): DossierTraceEntry[] {
  return [...buffer];
}

export function clearDossierTraceLog(): void {
  buffer.length = 0;
}
