import { PDFDocument, PDFTextField } from "pdf-lib";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";

/** Pola ZI — zweryfikowane nazwy XFA/AcroForm (P0.1B). */
export const WM_PRINT_ZI_PDF_FIELD_MAP: Record<string, WmPrintVariableKey> = {
  "form1[0].Page1[0].TextField2[10]": "JOB_STREET",
  "form1[0].Page1[0].TextField2[9]": "JOB_BUILDING",
  "form1[0].Page1[0].TextField2[8]": "JOB_APARTMENT",
};

/**
 * pdf-lib po usunięciu XFA nie zna qualified names — indeks PDFTextField (P0.1B).
 * TextField2[8]=lokal, [9]=budynek, [10]=ulica.
 */
export const WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX: Partial<Record<WmPrintVariableKey, number>> = {
  JOB_APARTMENT: 8,
  JOB_BUILDING: 9,
  JOB_STREET: 10,
};

export type WmPrintPdfFormType = "acroform" | "xfa" | "hybrid" | "none" | "unknown";

export interface WmPrintPdfFormInspection {
  formType: WmPrintPdfFormType;
  fieldCount: number;
  fieldNames: string[];
  /** Pola z mapowania ZI obecne w formularzu (nazwa lub indeks). */
  addressFieldNames: string[];
}

export function detectWmPrintPdfFormType(bytes: Uint8Array): WmPrintPdfFormType {
  const sample = bytes.slice(0, Math.min(bytes.length, 800_000));
  const latin = new TextDecoder("latin1").decode(sample);
  const hasXfa = /\/XFA\b/.test(latin);
  const hasAcro = /\/AcroForm\b/.test(latin);
  if (hasXfa && hasAcro) return "hybrid";
  if (hasXfa) return "xfa";
  if (hasAcro) return "acroform";
  return "none";
}

function ziMappingKeys(): Set<string> {
  return new Set(Object.keys(WM_PRINT_ZI_PDF_FIELD_MAP));
}

export async function inspectWmPrintPdfForm(bytes: Uint8Array): Promise<WmPrintPdfFormInspection> {
  const detected = detectWmPrintPdfFormType(bytes);

  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fieldNames = form.getFields().map((f) => f.getName());
    const mapKeys = ziMappingKeys();
    const addressFieldNames = fieldNames.filter((n) => mapKeys.has(n));
    const textFieldCount = form.getFields().filter((f) => f instanceof PDFTextField).length;
    const indexOk = Object.values(WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX).every(
      (idx) => typeof idx === "number" && idx < textFieldCount,
    );
    const resolvedAddress = [
      ...addressFieldNames,
      ...(indexOk ? Object.keys(WM_PRINT_ZI_PDF_FIELD_MAP) : []),
    ].filter((v, i, a) => a.indexOf(v) === i);

    return {
      formType:
        detected === "hybrid" || detected === "xfa"
          ? "hybrid"
          : fieldNames.length > 0
            ? "acroform"
            : detected,
      fieldCount: fieldNames.length,
      fieldNames,
      addressFieldNames: resolvedAddress,
    };
  } catch {
    return { formType: "unknown", fieldCount: 0, fieldNames: [], addressFieldNames: [] };
  }
}

/** P0-A — statyczne skany PDF: kopia bajt-w-bajt, bez modyfikacji. */
export function copyStaticPdfTemplate(templateBytes: Uint8Array): Uint8Array {
  return templateBytes.slice();
}

export async function generatePdfPlainFromTemplate(
  templateBytes: Uint8Array,
  _vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  return copyStaticPdfTemplate(templateBytes);
}

function parseTextFieldIndexFromName(name: string): number | null {
  const m = name.match(/\[(\d+)\]$/);
  return m ? Number(m[1]) : null;
}

function fillPdfFormFieldMapping(
  form: ReturnType<PDFDocument["getForm"]>,
  mapping: Record<string, WmPrintVariableKey>,
  vars: Record<WmPrintVariableKey, string>,
): Set<WmPrintVariableKey> {
  const filled = new Set<WmPrintVariableKey>();
  const textFields = form.getFields().filter((f) => f instanceof PDFTextField);

  for (const [name, varKey] of Object.entries(mapping)) {
    const value = vars[varKey] ?? "";
    try {
      form.getTextField(name).setText(value);
      filled.add(varKey);
      continue;
    } catch {
      /* fallback indeks z nazwy TextField2[N] */
    }

    const idx = parseTextFieldIndexFromName(name);
    if (idx !== null && textFields[idx]) {
      textFields[idx].setText(value);
      filled.add(varKey);
    }
  }

  for (const [varKey, idx] of Object.entries(WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX)) {
    if (filled.has(varKey as WmPrintVariableKey)) continue;
    if (typeof idx !== "number" || !textFields[idx]) continue;
    textFields[idx].setText(vars[varKey as WmPrintVariableKey] ?? "");
    filled.add(varKey as WmPrintVariableKey);
  }

  return filled;
}

export async function generatePdfFormFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
  fieldMapping?: Partial<Record<string, WmPrintVariableKey>>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  /** Legacy KV może mieć stare klucze (Ulica…) — SSOT mapowania ZI wygrywa. */
  const mapping: Record<string, WmPrintVariableKey> = {
    ...(fieldMapping ?? {}),
    ...WM_PRINT_ZI_PDF_FIELD_MAP,
  };

  try {
    const form = pdfDoc.getForm();
    // Polskie znaki — bez regeneracji appearance (Helvetica/WinAnsi); wartość /V zostaje.
    form.updateFieldAppearances = () => {};
    fillPdfFormFieldMapping(form, mapping, vars);
  } catch {
    return copyStaticPdfTemplate(templateBytes);
  }

  return pdfDoc.save({ useObjectStreams: false });
}
