/**
 * ZI Tauron 2026 — odczyt wartości AcroForm z szyfrowanego PDF (pdf.js).
 * pdf-lib nie widzi pól R6/AESv3; pdf.js tak — używane przy preservation graft.
 */
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let pdfWorkerReady = false;

async function ensurePdfJsWorker() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfWorkerReady) {
    // Browser wymaga workerSrc (prod ZIP); Node (vite-node smoke) działa bez workera.
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
    pdfWorkerReady = true;
  }
  return pdfjs;
}

export async function extractZiTauron2026FormFieldsPdfJs(bytes: Uint8Array): Promise<Record<string, string>> {
  const pdfjs = await ensurePdfJsWorker();
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const fieldObjects = await doc.getFieldObjects();
  const out: Record<string, string> = {};
  for (const [name, widgets] of Object.entries(fieldObjects ?? {})) {
    const raw = widgets?.[0]?.value;
    if (raw === undefined || raw === null) continue;
    out[name] = String(raw);
  }
  return out;
}

/** Pola z niepustą wartością (diagnostyka / smoke). */
export function pickNonEmptyZiFormFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (String(value).trim()) out[name] = value;
  }
  return out;
}
