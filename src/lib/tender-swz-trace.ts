/** Tymczasowy trace pipeline analizy SWZ (P2 bugfix Logintrade). */

export type SwzTraceStep =
  | "document_download"
  | "pdf_parsed"
  | "metadata_extracted"
  | "tender_updated";

export interface SwzTraceEntry {
  step: SwzTraceStep;
  at: string;
  detail: Record<string, unknown>;
}

const buffer: SwzTraceEntry[] = [];
const MAX = 40;

export function traceSwzPipeline(step: SwzTraceStep, detail: Record<string, unknown> = {}): void {
  const entry: SwzTraceEntry = { step, at: new Date().toISOString(), detail };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  if (typeof console !== "undefined" && console.debug) {
    console.debug(`[SWZ trace] ${step}`, detail);
  }
}

export function getSwzTraceLog(): SwzTraceEntry[] {
  return [...buffer];
}

export function clearSwzTraceLog(): void {
  buffer.length = 0;
}
