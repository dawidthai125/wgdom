import { seedWmPrintTemplatesIfEmpty } from "@/lib/wm-print/default-templates";
import type { WmPrintTemplate, WmPrintTemplateFile, WmPrintTemplateType } from "@/lib/wm-print/types";

const LEGACY_FILE_SUFFIX = "-legacy-0";

/** P1.0.1 — single file → files[1] bez utraty danych. */
export function migrateWmPrintTemplate(t: WmPrintTemplate): WmPrintTemplate {
  const existing = Array.isArray(t.files) ? t.files.filter((f) => f?.id && f.storageUrl) : [];
  if (existing.length > 0) {
    return {
      ...t,
      files: [...existing].sort((a, b) => a.sortOrder - b.sortOrder),
      storagePath: undefined,
      storageUrl: undefined,
      originalFileName: undefined,
    };
  }
  if (t.storageUrl && t.originalFileName) {
    const legacyFile: WmPrintTemplateFile = {
      id: `${t.id}${LEGACY_FILE_SUFFIX}`,
      storagePath: t.storagePath ?? "",
      storageUrl: t.storageUrl,
      originalFileName: t.originalFileName,
      sortOrder: 10,
      uploadedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
    };
    return {
      ...t,
      files: [legacyFile],
      storagePath: undefined,
      storageUrl: undefined,
      originalFileName: undefined,
    };
  }
  return { ...t, files: [] };
}

export function getWmPrintTemplateFiles(t: WmPrintTemplate): WmPrintTemplateFile[] {
  return migrateWmPrintTemplate(t).files ?? [];
}

export function countWmPrintTemplateFiles(t: WmPrintTemplate): number {
  return getWmPrintTemplateFiles(t).length;
}

export function wmPrintTemplateGroupLabel(t: WmPrintTemplate): string {
  const n = countWmPrintTemplateFiles(t);
  return `${t.name} (${n})`;
}

export function normalizeWmPrintTemplates(raw: unknown): WmPrintTemplate[] {
  if (!Array.isArray(raw)) return seedWmPrintTemplatesIfEmpty([]);
  const parsed = raw
    .filter((t): t is WmPrintTemplate => !!t && typeof t === "object" && typeof (t as WmPrintTemplate).id === "string")
    .map((t) =>
      migrateWmPrintTemplate({
        ...t,
        kind: t.kind === "job_upload" ? "job_upload" : "generated",
        type: (["docx", "pdf", "pdf_form"].includes(t.type) ? t.type : "pdf") as WmPrintTemplateType,
        enabled: t.enabled !== false,
        sortOrder: typeof t.sortOrder === "number" ? t.sortOrder : 0,
      }),
    );
  return seedWmPrintTemplatesIfEmpty(parsed).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mergeWmPrintTemplateFiles(
  localFiles: WmPrintTemplateFile[],
  cloudFiles: WmPrintTemplateFile[],
): WmPrintTemplateFile[] {
  const map = new Map<string, WmPrintTemplateFile>();
  const ingest = (list: WmPrintTemplateFile[]) => {
    for (const f of list) {
      if (!f?.id) continue;
      const prev = map.get(f.id);
      if (!prev || (f.uploadedAt || "") >= (prev.uploadedAt || "")) map.set(f.id, f);
    }
  };
  ingest(localFiles);
  ingest(cloudFiles);
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
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
    files: [],
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
      t.id === id ? migrateWmPrintTemplate({ ...t, ...patch, id: t.id, updatedAt: new Date().toISOString() }) : t,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function addWmPrintTemplateFile(
  templates: WmPrintTemplate[],
  templateId: string,
  file: Omit<WmPrintTemplateFile, "id" | "sortOrder" | "uploadedAt"> & { id?: string },
): WmPrintTemplate[] {
  const now = new Date().toISOString();
  return templates.map((t) => {
    if (t.id !== templateId) return t;
    const files = getWmPrintTemplateFiles(t);
    const maxOrder = files.reduce((m, f) => Math.max(m, f.sortOrder), 0);
    const entry: WmPrintTemplateFile = {
      id: file.id ?? crypto.randomUUID(),
      storagePath: file.storagePath,
      storageUrl: file.storageUrl,
      originalFileName: file.originalFileName,
      sortOrder: maxOrder + 10,
      uploadedAt: now,
    };
    return migrateWmPrintTemplate({
      ...t,
      files: [...files, entry],
      updatedAt: now,
    });
  });
}

export function removeWmPrintTemplateFile(
  templates: WmPrintTemplate[],
  templateId: string,
  fileId: string,
): WmPrintTemplate[] {
  return templates.map((t) => {
    if (t.id !== templateId) return t;
    const files = getWmPrintTemplateFiles(t).filter((f) => f.id !== fileId);
    return migrateWmPrintTemplate({ ...t, files, updatedAt: new Date().toISOString() });
  });
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
  const n = countWmPrintTemplateFiles(t);
  if (t.kind === "job_upload") return n > 0 ? `${n} plik(ów) wzorcowych` : "Wgrywany per robota";
  if (n === 0) return "Brak plików w grupie";
  if (n === 1) return getWmPrintTemplateFiles(t)[0]?.originalFileName ?? "1 plik";
  return `${n} plików w grupie`;
}

export function wmPrintTemplateAcceptMime(type: WmPrintTemplateType): string {
  if (type === "docx") return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return ".pdf,application/pdf";
}

export function isWmPrintPdfFileName(name: string): boolean {
  return /\.pdf$/i.test(name);
}
