import type { WmPrintTemplate, WmPrintTemplateKind, WmPrintTemplateType } from "@/lib/wm-print/types";

type Seed = { name: string; kind: WmPrintTemplateKind; type?: WmPrintTemplateType };

const SEED: Seed[] = [
  { name: "Oświadczenie kierownika", kind: "generated", type: "docx" },
  { name: "Oświadczenie o zatrudnieniu", kind: "generated", type: "docx" },
  { name: "Oświadczenie podwykonawcy", kind: "generated", type: "docx" },
  { name: "Oświadczenie bezrobotny", kind: "generated", type: "docx" },
  { name: "ZI", kind: "generated", type: "pdf_form" },
  { name: "Izba", kind: "generated", type: "pdf" },
  { name: "Uprawnienia", kind: "generated", type: "pdf" },
  { name: "SEP", kind: "generated", type: "pdf" },
  { name: "Wzorcowanie", kind: "generated", type: "pdf" },
  { name: "Kominiarz", kind: "job_upload" },
  { name: "Pomiary elektryczne", kind: "job_upload" },
  { name: "Gaz", kind: "job_upload" },
  { name: "Wentylacja", kind: "job_upload" },
];

/** Pełny seed 13 slotów — tylko gdy local i cloud są puste (bootstrap). */
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
            "form1[0].Page1[0].TextField2[10]": "JOB_STREET",
            "form1[0].Page1[0].TextField2[9]": "JOB_BUILDING",
            "form1[0].Page1[0].TextField2[8]": "JOB_APARTMENT",
          },
        }
      : {}),
  }));
}

/** @deprecated Użyj createWmPrintSeedTemplates() — nie wywoływać z normalize/merge. */
export function seedWmPrintTemplatesIfEmpty(existing: WmPrintTemplate[]): WmPrintTemplate[] {
  if (existing.length > 0) return existing;
  return createWmPrintSeedTemplates();
}
