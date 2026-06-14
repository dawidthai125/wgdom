import { PDFDocument } from "pdf-lib";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";

/** Pola ZI wypełniane z adresu roboty (P0-B). */
export const WM_PRINT_ZI_PDF_FIELD_MAP: Record<string, WmPrintVariableKey> = {
  Ulica: "JOB_STREET",
  "Numer budynku": "JOB_BUILDING",
  "Numer lokalu": "JOB_APARTMENT",
};

export type WmPrintPdfFormType = "acroform" | "xfa" | "none" | "unknown";

export interface WmPrintPdfFormInspection {
  formType: WmPrintPdfFormType;
  fieldCount: number;
  fieldNames: string[];
  /** Pola z mapowania ZI obecne w formularzu. */
  addressFieldNames: string[];
}

export function detectWmPrintPdfFormType(bytes: Uint8Array): WmPrintPdfFormType {
  const sample = bytes.slice(0, Math.min(bytes.length, 800_000));
  const latin = new TextDecoder("latin1").decode(sample);
  if (/\/XFA\b/.test(latin)) return "xfa";
  if (/\/AcroForm\b/.test(latin)) return "acroform";
  return "none";
}

export async function inspectWmPrintPdfForm(bytes: Uint8Array): Promise<WmPrintPdfFormInspection> {
  const detected = detectWmPrintPdfFormType(bytes);
  if (detected === "xfa") {
    return { formType: "xfa", fieldCount: 0, fieldNames: [], addressFieldNames: [] };
  }

  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fieldNames = form.getFields().map((f) => f.getName());
    const addressFieldNames = fieldNames.filter((n) => n in WM_PRINT_ZI_PDF_FIELD_MAP);
    return {
      formType: fieldNames.length > 0 ? "acroform" : detected === "acroform" ? "acroform" : "none",
      fieldCount: fieldNames.length,
      fieldNames,
      addressFieldNames,
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

export async function generatePdfFormFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
  fieldMapping?: Partial<Record<string, WmPrintVariableKey>>,
): Promise<Uint8Array> {
  const inspection = await inspectWmPrintPdfForm(templateBytes);
  if (inspection.formType === "xfa") {
    return copyStaticPdfTemplate(templateBytes);
  }

  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const mapping = { ...WM_PRINT_ZI_PDF_FIELD_MAP, ...fieldMapping };

  try {
    const form = pdfDoc.getForm();
    for (const field of form.getFields()) {
      const name = field.getName();
      const varKey = mapping[name];
      if (!varKey) continue;
      const value = vars[varKey] ?? "";
      try {
        form.getTextField(name).setText(value);
      } catch {
        try {
          form.getDropdown(name).select(value);
        } catch {
          /* nieobsługiwany typ pola */
        }
      }
    }
    // P0-B: bez flatten() — flatten() psuł ZI na prod
  } catch {
    return copyStaticPdfTemplate(templateBytes);
  }

  return pdfDoc.save();
}
