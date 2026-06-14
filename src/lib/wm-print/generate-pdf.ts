import { PDFDocument } from "pdf-lib";
import { generatePdfTextFromTemplate } from "@/lib/wm-print/generate-docx";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";

const DEFAULT_PDF_FIELD_MAP: Record<string, WmPrintVariableKey> = {
  Ulica: "JOB_STREET",
  "Numer budynku": "JOB_BUILDING",
  "Numer lokalu": "JOB_APARTMENT",
};

export async function generatePdfFormFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
  fieldMapping?: Partial<Record<string, WmPrintVariableKey>>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const mapping = { ...DEFAULT_PDF_FIELD_MAP, ...fieldMapping };

  try {
    const fields = form.getFields();
    for (const field of fields) {
      const name = field.getName();
      const varKey = mapping[name];
      if (!varKey) continue;
      const value = vars[varKey] ?? "";
      try {
        const textField = form.getTextField(name);
        textField.setText(value);
      } catch {
        try {
          const dropdown = form.getDropdown(name);
          dropdown.select(value);
        } catch {
          /* pole bez obsługiwanego typu */
        }
      }
    }
    form.flatten();
  } catch {
    /* brak formularza AcroForm — zwróć oryginał */
  }

  return pdfDoc.save();
}

export async function generatePdfPlainFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  return generatePdfTextFromTemplate(templateBytes, vars);
}
