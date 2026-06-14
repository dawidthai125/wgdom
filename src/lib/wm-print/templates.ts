import { seedWmPrintTemplatesIfEmpty } from "@/lib/wm-print/default-templates";
import type { WmPrintTemplate, WmPrintTemplateFile, WmPrintTemplateType } from "@/lib/wm-print/types";

const LEGACY_FILE_SUFFIX = "-legacy-0";

/** Usuwa pola legacy single-file — JSON.stringify nie kasuje `undefined`. */
export function purgeLegacyWmPrintTemplateFields(t: WmPrintTemplate): WmPrintTemplate {
  const copy = { ...t };
  delete copy.storagePath;
  delete copy.storageUrl;
  delete copy.originalFileName;
  return copy;
}

/** P1.0.1 — single file → files[1] bez utraty danych. */
export function migrateWmPrintTemplate(t: WmPrintTemplate): WmPrintTemplate {
  // files[] jest autorytatywne (także pusta tablica) — nie odtwarzaj legacy po usunięciu
  if (Array.isArray(t.files)) {
    const existing = t.files.filter((f) => f?.id && f.storageUrl);
    return purgeLegacyWmPrintTemplateFields({
      ...t,
      files: [...existing].sort((a, b) => a.sortOrder - b.sortOrder),
    });
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
    return purgeLegacyWmPrintTemplateFields({
      ...t,
      files: [legacyFile],
    });
  }
  return purgeLegacyWmPrintTemplateFields({ ...t, files: [] });
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
  return addWmPrintTemplateFiles(templates, templateId, [file]).templates;
}

/** P1.0.3 — wiele plików naraz; pomija duplikaty po id (ta sama nazwa OK). */
export function addWmPrintTemplateFiles(
  templates: WmPrintTemplate[],
  templateId: string,
  files: Array<Omit<WmPrintTemplateFile, "sortOrder" | "uploadedAt"> & { id?: string }>,
): { templates: WmPrintTemplate[]; added: number; skipped: number } {
  const now = new Date().toISOString();
  let added = 0;
  let skipped = 0;
  const nextTemplates = templates.map((t) => {
    if (t.id !== templateId) return t;
    const current = getWmPrintTemplateFiles(t);
    const seenIds = new Set(current.map((f) => f.id));
    const newEntries: WmPrintTemplateFile[] = [];
    let maxOrder = current.reduce((m, f) => Math.max(m, f.sortOrder), 0);
    for (const file of files) {
      const id = file.id ?? crypto.randomUUID();
      if (seenIds.has(id)) {
        skipped++;
        continue;
      }
      seenIds.add(id);
      maxOrder += 10;
      newEntries.push({
        id,
        storagePath: file.storagePath,
        storageUrl: file.storageUrl,
        originalFileName: file.originalFileName,
        sortOrder: maxOrder,
        uploadedAt: now,
      });
      added++;
    }
    if (newEntries.length === 0) return migrateWmPrintTemplate(t);
    return migrateWmPrintTemplate({
      ...t,
      files: [...current, ...newEntries],
      updatedAt: now,
    });
  });
  return { templates: nextTemplates, added, skipped };
}

export function removeWmPrintTemplateFile(
  templates: WmPrintTemplate[],
  templateId: string,
  fileId: string,
): WmPrintTemplate[] {
  const now = new Date().toISOString();
  return templates.map((t) => {
    if (t.id !== templateId) return migrateWmPrintTemplate(t);
    const files = getWmPrintTemplateFiles(t).filter((f) => f.id !== fileId);
    return purgeLegacyWmPrintTemplateFields({
      ...migrateWmPrintTemplate(t),
      files,
      updatedAt: now,
    });
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

export function isWmPrintTemplateUploadFileAccepted(fileName: string, type: WmPrintTemplateType): boolean {
  const lower = fileName.toLowerCase();
  if (type === "docx") return lower.endsWith(".docx");
  return lower.endsWith(".pdf");
}
