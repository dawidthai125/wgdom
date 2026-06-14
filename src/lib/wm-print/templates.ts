import { seedWmPrintTemplatesIfEmpty } from "@/lib/wm-print/default-templates";
import type { WmPrintTemplate, WmPrintTemplateType } from "@/lib/wm-print/types";

export function normalizeWmPrintTemplates(raw: unknown): WmPrintTemplate[] {
  if (!Array.isArray(raw)) return seedWmPrintTemplatesIfEmpty([]);
  const parsed = raw
    .filter((t): t is WmPrintTemplate => !!t && typeof t === "object" && typeof (t as WmPrintTemplate).id === "string")
    .map((t) => ({
      ...t,
      kind: t.kind === "job_upload" ? "job_upload" : "generated",
      type: (["docx", "pdf", "pdf_form"].includes(t.type) ? t.type : "pdf") as WmPrintTemplateType,
      enabled: t.enabled !== false,
      sortOrder: typeof t.sortOrder === "number" ? t.sortOrder : 0,
    }));
  return seedWmPrintTemplatesIfEmpty(parsed).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnabledWmPrintTemplates(templates: WmPrintTemplate[]): WmPrintTemplate[] {
  return templates.filter((t) => t.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createWmPrintTemplate(
  templates: WmPrintTemplate[],
  input: { name: string; kind: WmPrintTemplate["kind"]; type?: WmPrintTemplateType },
): WmPrintTemplate[] {
  const now = new Date().toISOString();
  const maxOrder = templates.reduce((m, t) => Math.max(m, t.sortOrder), 0);
  const next: WmPrintTemplate = {
    id: crypto.randomUUID(),
    name: input.name.trim() || "Nowy szablon",
    kind: input.kind,
    type: input.type ?? "docx",
    enabled: true,
    sortOrder: maxOrder + 10,
    createdAt: now,
    updatedAt: now,
  };
  return [...templates, next].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function updateWmPrintTemplate(
  templates: WmPrintTemplate[],
  id: string,
  patch: Partial<WmPrintTemplate>,
): WmPrintTemplate[] {
  return templates
    .map((t) =>
      t.id === id ? { ...t, ...patch, id: t.id, updatedAt: new Date().toISOString() } : t,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function deleteWmPrintTemplateLogical(
  templates: WmPrintTemplate[],
  id: string,
): { templates: WmPrintTemplate[]; deletedId: string } {
  return { templates: templates.filter((t) => t.id !== id), deletedId: id };
}

export function reorderWmPrintTemplates(
  templates: WmPrintTemplate[],
  orderedIds: string[],
): WmPrintTemplate[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return orderedIds
    .map((id, i) => {
      const t = byId.get(id);
      if (!t) return null;
      return { ...t, sortOrder: (i + 1) * 10, updatedAt: new Date().toISOString() };
    })
    .filter((t): t is WmPrintTemplate => t !== null)
    .concat(
      templates
        .filter((t) => !orderedIds.includes(t.id))
        .map((t) => ({ ...t, sortOrder: orderedIds.length * 10 + t.sortOrder })),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function wmPrintTemplateFileLabel(t: WmPrintTemplate): string {
  if (t.storageUrl && t.originalFileName) return t.originalFileName;
  if (t.kind === "job_upload") return "Wgrywany per robota";
  return "Brak pliku szablonu";
}

export function wmPrintTemplateAcceptMime(type: WmPrintTemplateType): string {
  if (type === "docx") return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return ".pdf,application/pdf";
}
