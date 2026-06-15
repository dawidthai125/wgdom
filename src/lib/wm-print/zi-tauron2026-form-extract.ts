/**
 * ZI Tauron 2026 — odczyt wartości AcroForm z szyfrowanego PDF (pdf.js).
 * pdf-lib nie widzi pól R6/AESv3; pdf.js tak — używane przy preservation graft.
 */
export async function extractZiTauron2026FormFieldsPdfJs(bytes: Uint8Array): Promise<Record<string, string>> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
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
