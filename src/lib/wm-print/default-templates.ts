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

export function seedWmPrintTemplatesIfEmpty(existing: WmPrintTemplate[]): WmPrintTemplate[] {
  if (existing.length > 0) return existing;
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
            Ulica: "JOB_STREET",
            "Numer budynku": "JOB_BUILDING",
            "Numer lokalu": "JOB_APARTMENT",
          },
        }
      : {}),
  }));
}
