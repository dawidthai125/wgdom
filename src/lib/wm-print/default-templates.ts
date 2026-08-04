import type {
  WmPrintTemplate,
  WmPrintTemplateKind,
  WmPrintTemplateType,
  WmPrintVariableKey,
} from "@/lib/wm-print/types";

type Seed = { name: string; kind: WmPrintTemplateKind; type?: WmPrintTemplateType };

/**
 * OST — aliasy wyłącznie w pdfFieldMapping (DF / AR).
 * Literały z/bez `{{…}}` — Gate-dependent; seed pokrywa obie formy.
 */
export const WM_PRINT_OST_PDF_FIELD_MAPPING: Partial<Record<string, WmPrintVariableKey>> = {
  BUILDING: "JOB_BUILDING",
  APARTMENT: "JOB_APARTMENT",
  JOB_STREET: "JOB_STREET",
  JOB_CITY: "JOB_CITY",
  "{{BUILDING}}": "JOB_BUILDING",
  "{{APARTMENT}}": "JOB_APARTMENT",
  "{{JOB_STREET}}": "JOB_STREET",
  "{{JOB_CITY}}": "JOB_CITY",
};

const SEED: Seed[] = [
  { name: "Oświadczenie kierownika", kind: "generated", type: "docx" },
  { name: "Oświadczenie o zatrudnieniu", kind: "generated", type: "docx" },
  { name: "Oświadczenie podwykonawcy", kind: "generated", type: "docx" },
  { name: "Oświadczenie bezrobotny", kind: "generated", type: "docx" },
  { name: "ZI", kind: "generated", type: "pdf_form" },
  { name: "OST", kind: "generated", type: "pdf_form" },
  { name: "Izba", kind: "generated", type: "pdf" },
  { name: "Uprawnienia", kind: "generated", type: "pdf" },
  { name: "SEP", kind: "generated", type: "pdf" },
  { name: "Wzorcowanie", kind: "generated", type: "pdf" },
  { name: "Kominiarz", kind: "job_upload" },
  { name: "Pomiary elektryczne", kind: "job_upload" },
  { name: "Gaz", kind: "job_upload" },
  { name: "Wentylacja", kind: "job_upload" },
];

/** Pełny seed slotów — tylko gdy local i cloud są puste (bootstrap). Upload plików = upload-only. */
export function createWmPrintSeedTemplates(): WmPrintTemplate[] {
  const now = new Date().toISOString();
  return SEED.map((s, i) => ({
    id: crypto.randomUUID(),
    name: s.name,
    kind: s.kind,
    type: s.type ?? "pdf",
    enabled: true,
    sortOrder: (i + 1) * 10,
    createdAt: now,
    updatedAt: now,
    ...(s.kind === "generated" && s.name === "ZI"
      ? {
          pdfFieldMapping: {
            "Pole tekstowe 95": "JOB_STREET",
            "Pole tekstowe 96": "JOB_BUILDING",
            "Pole tekstowe 97": "JOB_APARTMENT",
          },
        }
      : {}),
    ...(s.kind === "generated" && s.name === "OST"
      ? { pdfFieldMapping: { ...WM_PRINT_OST_PDF_FIELD_MAPPING } }
      : {}),
  }));
}

/** @deprecated Użyj createWmPrintSeedTemplates() — nie wywoływać z normalize/merge. */
export function seedWmPrintTemplatesIfEmpty(existing: WmPrintTemplate[]): WmPrintTemplate[] {
  if (existing.length > 0) return existing;
  return createWmPrintSeedTemplates();
}
