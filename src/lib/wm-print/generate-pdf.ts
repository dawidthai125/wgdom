import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFTextField, rgb } from "pdf-lib";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";

/** Pola ZI §3 — adres obiektu (P0.3A): TextField2[10/9/8] @ y≈142. */
export const WM_PRINT_ZI_PDF_FIELD_MAP: Record<string, WmPrintVariableKey> = {
  "form1[0].Page1[0].TextField2[10]": "JOB_STREET",
  "form1[0].Page1[0].TextField2[9]": "JOB_BUILDING",
  "form1[0].Page1[0].TextField2[8]": "JOB_APARTMENT",
};

/**
 * pdf-lib po strip XFA — indeks PDFTextField (≠ numer w nazwie TextField2[N]).
 * P0.3A: §3 @ y≈142 — 24=ulica, 23=budynek, 22=lokal (hybrid zi-old-template).
 */
export const WM_PRINT_ZI_PDF_FIELD_PDFLIB_INDEX: Record<string, number> = {
  "form1[0].Page1[0].TextField2[10]": 24,
  "form1[0].Page1[0].TextField2[9]": 23,
  "form1[0].Page1[0].TextField2[8]": 22,
};

export const WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX: Partial<Record<WmPrintVariableKey, number>> = {
  JOB_STREET: 24,
  JOB_BUILDING: 23,
  JOB_APARTMENT: 22,
};

/** pdf.js qualified names §3 — SSOT KV pdfFieldMapping (P0.3A). */
export const WM_PRINT_ZI_WM_FIELD_QNAMES: Record<string, WmPrintVariableKey> = {
  "form1[0].Page1[0].TextField2[10]": "JOB_STREET",
  "form1[0].Page1[0].TextField2[9]": "JOB_BUILDING",
  "form1[0].Page1[0].TextField2[8]": "JOB_APARTMENT",
};

/** §1 zgłaszający — nie mapować na JOB_* (P0.3A). */
export const WM_PRINT_ZI_LEGACY_WM_FIELD_QNAMES = new Set([
  "form1[0].Page1[0].TextField5[0]",
  "form1[0].Page1[0].imie[0]",
  "form1[0].Page1[0].nazwisko[1]",
]);

/** @deprecated P0.3A — TextField2[8/9/10] to pola §3, nie demo. */
export const WM_PRINT_ZI_DEMO_FIELD_RECT_Y = 142.735992;
export const WM_PRINT_ZI_DEMO_FIELD_Y_TOLERANCE = 2;

const ZI_PDF_FONT_PATH = "/fonts/NotoSans-Regular.ttf";

let cachedZiPdfFontBytes: Uint8Array | null = null;

/** P0.1G — debug overlay: czerwony/zielony/niebieski box bez drawText (tylko test). */
export let wmPrintZiDebugColorOverlay = false;

export function setWmPrintZiDebugColorOverlay(enabled: boolean): void {
  wmPrintZiDebugColorOverlay = enabled;
}

export type WmPrintPdfFormType = "acroform" | "xfa" | "hybrid" | "none" | "unknown";

export interface WmPrintPdfFormInspection {
  formType: WmPrintPdfFormType;
  fieldCount: number;
  fieldNames: string[];
  /** Pola z mapowania ZI obecne w formularzu (nazwa lub indeks). */
  addressFieldNames: string[];
}

/** P0.1C — log diagnostyczny setText / getText / save. */
export interface ZiPdfFieldFillLogRow {
  field: string;
  index: number | null;
  valueBefore: string | undefined;
  valueAfterSetText: string | undefined;
  setTextExecuted: boolean;
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

export async function loadWmPrintZiPdfFontBytes(): Promise<Uint8Array> {
  if (cachedZiPdfFontBytes) return cachedZiPdfFontBytes;

  if (typeof window === "undefined") {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    cachedZiPdfFontBytes = new Uint8Array(
      readFileSync(join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf")),
    );
    return cachedZiPdfFontBytes;
  }

  const res = await fetch(ZI_PDF_FONT_PATH);
  if (!res.ok) throw new Error(`Nie można wczytać czcionki ZI (${res.status})`);
  cachedZiPdfFontBytes = new Uint8Array(await res.arrayBuffer());
  return cachedZiPdfFontBytes;
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

function getZiTextFieldByIndex(form: ReturnType<PDFDocument["getForm"]>, index: number): PDFTextField | null {
  const textFields = form.getFields().filter((f) => f instanceof PDFTextField);
  const field = textFields[index];
  return field instanceof PDFTextField ? field : null;
}

function getZiPdfLibIndexForFieldName(fieldName: string): number | null {
  const idx = WM_PRINT_ZI_PDF_FIELD_PDFLIB_INDEX[fieldName];
  return typeof idx === "number" ? idx : null;
}

export function isZiDemoDesignerFieldRect(_y: number): boolean {
  return false;
}

/** P0.3A — no-op: TextField2[8/9/10] @ y≈142 to pola §3, nie demo. */
export function stripZiDemoDesignerFields(_form: ReturnType<PDFDocument["getForm"]>): number {
  return 0;
}

export async function cleanZiTemplateDemoFields(templateBytes: Uint8Array): Promise<Uint8Array> {
  return templateBytes.slice();
}

function setZiTextFieldValue(
  form: ReturnType<PDFDocument["getForm"]>,
  fieldName: string,
  value: string,
): { executed: boolean; field: PDFTextField | null } {
  const textFields = form.getFields().filter((f) => f instanceof PDFTextField);

  try {
    const byName = form.getTextField(fieldName);
    byName.setText(value);
    return { executed: true, field: byName };
  } catch {
    /* fallback indeks pdf-lib (≠ numer w TextField2[N]) */
  }

  const mappedIdx = getZiPdfLibIndexForFieldName(fieldName);
  if (mappedIdx !== null && textFields[mappedIdx]) {
    textFields[mappedIdx].setText(value);
    return { executed: true, field: textFields[mappedIdx] };
  }

  return { executed: false, field: null };
}

export function fillZiPdfFieldsWithLog(
  form: ReturnType<PDFDocument["getForm"]>,
  vars: Record<WmPrintVariableKey, string>,
): ZiPdfFieldFillLogRow[] {
  form.updateFieldAppearances = () => {};
  const log: ZiPdfFieldFillLogRow[] = [];

  for (const [fieldName, varKey] of Object.entries(WM_PRINT_ZI_PDF_FIELD_MAP)) {
    const idx = getZiPdfLibIndexForFieldName(fieldName);
    const fieldBefore = idx !== null ? getZiTextFieldByIndex(form, idx) : null;
    const valueBefore = fieldBefore?.getText();
    const value = vars[varKey] ?? "";
    const { executed, field } = setZiTextFieldValue(form, fieldName, value);

    log.push({
      field: fieldName,
      index: idx,
      valueBefore,
      valueAfterSetText: field?.getText(),
      setTextExecuted: executed,
    });
  }

  return log;
}

function fillPdfFormFieldMapping(
  form: ReturnType<PDFDocument["getForm"]>,
  mapping: Record<string, WmPrintVariableKey>,
  vars: Record<WmPrintVariableKey, string>,
): Set<WmPrintVariableKey> {
  const filled = new Set<WmPrintVariableKey>();
  form.updateFieldAppearances = () => {};

  for (const [name, varKey] of Object.entries(mapping)) {
    const value = vars[varKey] ?? "";
    const { executed } = setZiTextFieldValue(form, name, value);
    if (executed) filled.add(varKey);
  }

  for (const [varKey, idx] of Object.entries(WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX)) {
    if (filled.has(varKey as WmPrintVariableKey)) continue;
    const field = typeof idx === "number" ? getZiTextFieldByIndex(form, idx) : null;
    if (!field) continue;
    field.setText(vars[varKey as WmPrintVariableKey] ?? "");
    filled.add(varKey as WmPrintVariableKey);
  }

  return filled;
}

function pdfPageForWidget(
  pdfDoc: PDFDocument,
  widget: ReturnType<PDFTextField["acroField"]["getWidgets"]>[number],
) {
  const pages = pdfDoc.getPages();
  const pageRef = widget.P();
  if (!pageRef) return pages[0];
  return pages.find((p) => p.ref.tag === pageRef.tag) ?? pages[0];
}

/**
 * P0.1E — hybrid XFA: /V + /AP Noto, potem biały cover + tekst na stronie i ukrycie widgetów.
 * Edge (i część viewerów) nadal pokazuje placeholdery {{JOB_*}} z warstwy statycznej Im0/content
 * mimo poprawnego /AP — widgety AcroForm są nad tłem, a AP bez pełnego wypełnienia nie zasłania grafiki.
 */
async function finalizeZiHybridForm(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument["getForm"]>,
  vars: Record<WmPrintVariableKey, string>,
): Promise<void> {
  const addressFields: [WmPrintVariableKey, number][] = [
    ["JOB_STREET", WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_STREET!],
    ["JOB_BUILDING", WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_BUILDING!],
    ["JOB_APARTMENT", WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_APARTMENT!],
  ];

  const debugColors: Partial<Record<WmPrintVariableKey, ReturnType<typeof rgb>>> = wmPrintZiDebugColorOverlay
    ? {
        JOB_STREET: rgb(1, 0, 0),
        JOB_BUILDING: rgb(0, 1, 0),
        JOB_APARTMENT: rgb(0, 0, 1),
      }
    : {};

  let font: Awaited<ReturnType<PDFDocument["embedFont"]>> | null = null;
  if (!wmPrintZiDebugColorOverlay) {
    pdfDoc.registerFontkit(fontkit);
    font = await pdfDoc.embedFont(await loadWmPrintZiPdfFontBytes());
  }

  for (const [varKey, idx] of addressFields) {
    const field = getZiTextFieldByIndex(form, idx);
    if (!field) continue;

    const widget = field.acroField.getWidgets()[0];
    if (!widget) continue;

    const rect = widget.getRectangle();
    const page = pdfPageForWidget(pdfDoc, widget);

    if (wmPrintZiDebugColorOverlay) {
      const boxColor = debugColors[varKey];
      if (boxColor) {
        page.drawRectangle({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          color: boxColor,
          borderWidth: 0,
          opacity: 1,
        });
      }
      continue;
    }

    field.updateAppearances(font!);
    const text = vars[varKey] ?? "";

    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    page.drawText(text, {
      x: rect.x + 2,
      y: rect.y + rect.height * 0.28,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    /** P0.2C experiment — nie ukrywaj widgetów WM (/F=2 usunięte). */
  }
}

export async function generatePdfFormFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
  fieldMapping?: Partial<Record<string, WmPrintVariableKey>>,
): Promise<Uint8Array> {
  const formType = detectWmPrintPdfFormType(templateBytes);
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const kvMapping = Object.fromEntries(
    Object.entries(fieldMapping ?? {}).filter(([name]) => !WM_PRINT_ZI_LEGACY_WM_FIELD_QNAMES.has(name)),
  );
  /** Legacy KV może mieć stare klucze — SSOT mapowania ZI §3 wygrywa. */
  const mapping: Record<string, WmPrintVariableKey> = {
    ...kvMapping,
    ...WM_PRINT_ZI_PDF_FIELD_MAP,
  };

  const form = pdfDoc.getForm();
  fillPdfFormFieldMapping(form, mapping, vars);

  if (formType === "hybrid" || formType === "xfa") {
    await finalizeZiHybridForm(pdfDoc, form, vars);
  } else {
    try {
      pdfDoc.registerFontkit(fontkit);
      const font = await pdfDoc.embedFont(await loadWmPrintZiPdfFontBytes());
      form.updateFieldAppearances(font);
    } catch {
      /* czysty AcroForm bez czcionki — /V wystarczy */
    }
  }

  return pdfDoc.save({ useObjectStreams: false });
}

/** P0.1C — pełna diagnostyka: log + zapis + reload getText + placeholdery w bajtach. */
export async function diagnoseZiPdfFieldFill(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<{
  log: ZiPdfFieldFillLogRow[];
  afterSave: { field: string; index: number | null; getText: string | undefined }[];
  placeholdersInOutput: Record<string, number>;
  visibleTextInOutput: Record<string, number>;
}> {
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const log = fillZiPdfFieldsWithLog(form, vars);

  const formType = detectWmPrintPdfFormType(templateBytes);
  if (formType === "hybrid" || formType === "xfa") {
    await finalizeZiHybridForm(pdfDoc, form, vars);
  }

  const out = await pdfDoc.save({ useObjectStreams: false });
  const reloaded = await PDFDocument.load(out, { ignoreEncryption: true });
  const reForm = reloaded.getForm();

  const afterSave = Object.entries(WM_PRINT_ZI_PDF_FIELD_MAP).map(([fieldName]) => {
    const idx = getZiPdfLibIndexForFieldName(fieldName);
    const field = idx !== null ? getZiTextFieldByIndex(reForm, idx) : null;
    return { field: fieldName, index: idx, getText: field?.getText() };
  });

  const countUtf8 = (buf: Uint8Array, needle: string) => {
    const n = Buffer.from(needle, "utf8");
    const b = Buffer.from(buf);
    let c = 0;
    for (let i = 0; i <= b.length - n.length; i++) {
      let ok = true;
      for (let j = 0; j < n.length; j++) if (b[i + j] !== n[j]) ok = false;
      if (ok) c++;
    }
    return c;
  };

  const countUtf16Le = (buf: Uint8Array, str: string) => {
    if (!str) return 0;
    const needle = Buffer.alloc(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      needle[i * 2] = c & 0xff;
      needle[i * 2 + 1] = c >> 8;
    }
    const b = Buffer.from(buf);
    let c = 0;
    for (let i = 0; i <= b.length - needle.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) if (b[i + j] !== needle[j]) ok = false;
      if (ok) c++;
    }
    return c;
  };

  return {
    log,
    afterSave,
    placeholdersInOutput: {
      "{{JOB_STREET}}": countUtf8(out, "{{JOB_STREET}}"),
      "{{JOB_BUILDING}}": countUtf8(out, "{{JOB_BUILDING}}"),
      "{{JOB_APARTMENT}}": countUtf8(out, "{{JOB_APARTMENT}}"),
    },
    visibleTextInOutput: {
      Sępa_utf8: countUtf8(out, "Sępa"),
      Sępa_utf16le: countUtf16Le(out, "Sępa"),
      "83": countUtf8(out, "83"),
      "7": countUtf8(out, "7"),
    },
  };
}
