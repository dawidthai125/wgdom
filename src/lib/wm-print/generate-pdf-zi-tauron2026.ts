/**
 * ZI Tauron 2026 — generator PDF (FormMaker AcroForm).
 * Osobna ścieżka — bez LiveCycle, XFA, ciphertext, finalizeZiHybridForm.
 */
import fontkit from "@pdf-lib/fontkit";
import { PDFCheckBox, PDFDocument, PDFName, PDFRadioGroup, PDFTextField, type PDFForm } from "pdf-lib";
import { loadWmPrintZiPdfFontBytes } from "@/lib/wm-print/generate-pdf";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";
import { extractZiTauron2026FormFieldsPdfJs } from "@/lib/wm-print/zi-tauron2026-form-extract";

/** §4 OKREŚLENIE OBIEKTU — strona 2 formularza Tauron 2026. */
export const WM_PRINT_ZI_TAURON2026_FIELD_MAP: Record<string, WmPrintVariableKey> = {
  "Pole tekstowe 99": "JOB_STREET",
  "Pole tekstowe 111": "JOB_BUILDING",
  "Pole tekstowe 112": "JOB_APARTMENT",
};

export const WM_PRINT_ZI_TAURON2026_TEMPLATE_PATH = "/wm-print/zi-tauron-2026-template.pdf";

let cachedBundledTemplate: Uint8Array | null = null;

/** Wykrywa formularz Tauron 2026 (FormMaker) vs legacy LiveCycle hybrid. */
export function detectZiTauron2026Form(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, Math.min(bytes.length, 900_000));
  const latin = new TextDecoder("latin1").decode(sample);
  if (/\/XFA\b/.test(latin)) return false;
  if (/TextField2\[10\]/.test(latin) || /LiveCycle Designer/.test(latin)) return false;
  if (/Pole tekstowe 99/.test(latin)) return true;
  return /FormMaker/.test(latin) && /\/AcroForm\b/.test(latin);
}

/** Wykrywa legacy LiveCycle ZI (hybrid) — tylko diagnostyka / guard. */
export function detectLegacyLiveCycleZiForm(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, Math.min(bytes.length, 400_000));
  const latin = new TextDecoder("latin1").decode(sample);
  return /\/XFA\b/.test(latin) || /TextField2\[10\]/.test(latin);
}

export async function loadZiTauron2026BundledTemplateBytes(): Promise<Uint8Array> {
  if (cachedBundledTemplate) return cachedBundledTemplate;

  if (typeof window === "undefined") {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    cachedBundledTemplate = new Uint8Array(
      readFileSync(join(process.cwd(), "public", "wm-print", "zi-tauron-2026-template.pdf")),
    );
    return cachedBundledTemplate;
  }

  const res = await fetch(WM_PRINT_ZI_TAURON2026_TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(`Nie można wczytać szablonu ZI 2026 (${res.status})`);
  }
  cachedBundledTemplate = new Uint8Array(await res.arrayBuffer());
  return cachedBundledTemplate;
}

/** pdf-lib na szyfrowanym Tauron R6 widzi 0 pól — graft wartości z pdf.js (patrz generatePdfZiTauron2026). */
export async function countZiTauron2026PdfLibFields(bytes: Uint8Array): Promise<number> {
  try {
    const probe = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return probe.getForm().getFields().length;
  } catch {
    return 0;
  }
}

/**
 * Odszyfrowany upload WM → sourceBytes; szyfrowany → bundled base (ten sam FormMaker) + graft z pdf.js.
 */
export async function resolveZiTauron2026TemplateBytes(sourceBytes: Uint8Array): Promise<Uint8Array> {
  if ((await countZiTauron2026PdfLibFields(sourceBytes)) >= 50) return sourceBytes;
  return loadZiTauron2026BundledTemplateBytes();
}

function formatBuildingForZi2026(value: string): string {
  return (value ?? "").trim().slice(0, 2);
}

function setNeedAppearances(pdfDoc: PDFDocument): void {
  const acroRef = pdfDoc.catalog.get(PDFName.of("AcroForm"));
  if (!acroRef) return;
  const acroDict = pdfDoc.context.lookup(acroRef);
  acroDict?.set?.(PDFName.of("NeedAppearances"), pdfDoc.context.obj(true));
}

function isCheckboxOnValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "tak" || v === "yes" || v === "on" || v === "true" || v === "1";
}

function applyExtractedFormFieldValue(form: PDFForm, fieldName: string, value: string): void {
  try {
    const field = form.getField(fieldName);
    if (field instanceof PDFTextField) {
      field.setText(value);
      return;
    }
    if (field instanceof PDFCheckBox) {
      if (isCheckboxOnValue(value)) field.check();
      else field.uncheck();
      return;
    }
    if (field instanceof PDFRadioGroup) {
      field.select(value);
    }
  } catch {
    /* pole nieobecne w bazie — pomijamy */
  }
}

function applyAddressSectionFields(form: PDFForm, vars: Record<WmPrintVariableKey, string>): void {
  const values: Record<string, string> = {
    "Pole tekstowe 99": (vars.JOB_STREET ?? "").trim(),
    "Pole tekstowe 111": formatBuildingForZi2026(vars.JOB_BUILDING ?? ""),
    "Pole tekstowe 112": (vars.JOB_APARTMENT ?? "").trim(),
  };

  for (const [fieldName, value] of Object.entries(values)) {
    try {
      form.getTextField(fieldName).setText(value);
    } catch {
      const textFields = form.getFields().filter((f) => f instanceof PDFTextField);
      const byName = textFields.find((f) => f.getName() === fieldName);
      byName?.setText(value);
    }
  }
}

/**
 * Wypełnia §4 adres obiektu (pola 99/111/112). Zachowuje istniejące dane szablonu WM (pdf.js graft gdy R6).
 */
export async function generatePdfZiTauron2026(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  const sourcePdfLibFieldCount = await countZiTauron2026PdfLibFields(templateBytes);
  const needsPdfJsGraft = sourcePdfLibFieldCount < 50;
  const graftedValues = needsPdfJsGraft ? await extractZiTauron2026FormFieldsPdfJs(templateBytes) : null;

  const usableBytes = await resolveZiTauron2026TemplateBytes(templateBytes);
  const pdfDoc = await PDFDocument.load(usableBytes);
  const form = pdfDoc.getForm();
  form.updateFieldAppearances = () => {};

  if (graftedValues) {
    for (const [fieldName, value] of Object.entries(graftedValues)) {
      applyExtractedFormFieldValue(form, fieldName, value);
    }
  }

  applyAddressSectionFields(form, vars);

  setNeedAppearances(pdfDoc);

  try {
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(await loadWmPrintZiPdfFontBytes());
    form.updateFieldAppearances(font);
  } catch {
    /* /V + NeedAppearances wystarczy dla viewerów FormMaker */
  }

  return pdfDoc.save({ useObjectStreams: false });
}

export async function inspectZiTauron2026Fill(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Record<string, string>> {
  const out = await generatePdfZiTauron2026(templateBytes, vars);
  const reloaded = await PDFDocument.load(out);
  const form = reloaded.getForm();
  const result: Record<string, string> = {};
  for (const fieldName of Object.keys(WM_PRINT_ZI_TAURON2026_FIELD_MAP)) {
    try {
      result[fieldName] = form.getTextField(fieldName).getText() ?? "";
    } catch {
      result[fieldName] = "";
    }
  }
  return result;
}
