/** Wspólne typy dokumentów robót — używane w panelu admina i inspektora. */

export const DOCUMENT_TYPES = [
  "zlecenie", "zakres", "kosztorys", "kominiarz", "pomiary",
  "oswiadczenia", "gwarancje", "rysunek", "zdjecia",
] as const;

export type DocType = (typeof DOCUMENT_TYPES)[number];

export const REQUIRED_DOCS = [
  "zlecenie", "zakres", "kosztorys", "kominiarz", "pomiary",
  "oswiadczenia", "gwarancje", "rysunek",
] as const;

export const DOC_LABELS: Record<DocType, string> = {
  zlecenie: "Zlecenie",
  zakres: "Zakres robót",
  kosztorys: "Kosztorys",
  kominiarz: "Kominiarz",
  pomiary: "Pomiary",
  oswiadczenia: "Oświadczenia",
  gwarancje: "Gwarancje",
  rysunek: "Rysunek/Plan",
  zdjecia: "Zdjęcia",
};

export type InspectorJobFileKind = "zlecenie" | "kosztorys";

export interface JobFileAttachment {
  id: string;
  kind: InspectorJobFileKind;
  path: string;
  publicUrl: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: string;
}

/** Rozszerzenia kosztorysu NORMA + PDF. */
export const KOSZTORYS_ACCEPT = ".pdf,.PDF,.nor,.NOR,.xml,.XML,.doc,.docx,.xls,.xlsx";
export const ZLECENIE_ACCEPT = ".pdf,.PDF";

export const INSPECTOR_FILE_KINDS = ["zlecenie", "kosztorys"] as const;

export function latestJobFile(
  job: { jobFiles?: JobFileAttachment[] },
  kind: InspectorJobFileKind,
): JobFileAttachment | undefined {
  const files = (job.jobFiles || []).filter((f) => f.kind === kind);
  if (files.length === 0) return undefined;
  return files.reduce((a, b) => (a.uploadedAt >= b.uploadedAt ? a : b));
}

/** Plik wgrany przez inspektora → ptaszek przy dokumencie (spójność Roboty ↔ Inspektor). */
export function syncJobDocumentsFromFiles<T extends {
  documents: Record<DocType, boolean>;
  jobFiles?: JobFileAttachment[];
}>(job: T): T {
  const docs = { ...job.documents };
  let changed = false;
  for (const kind of INSPECTOR_FILE_KINDS) {
    if ((job.jobFiles || []).some((f) => f.kind === kind) && !docs[kind]) {
      docs[kind] = true;
      changed = true;
    }
  }
  return changed ? { ...job, documents: docs } : job;
}

export function mergeJobDocuments(
  a: Record<string, boolean> | undefined,
  b: Record<string, boolean> | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (v) out[k] = true;
    else if (!(k in out)) out[k] = false;
  }
  return out;
}

export function mergeJobFiles(
  a: JobFileAttachment[] | undefined,
  b: JobFileAttachment[] | undefined,
): JobFileAttachment[] {
  const byKind = new Map<InspectorJobFileKind, JobFileAttachment>();
  for (const f of [...(a || []), ...(b || [])]) {
    const prev = byKind.get(f.kind);
    if (!prev || f.uploadedAt >= prev.uploadedAt) byKind.set(f.kind, f);
  }
  return [...byKind.values()];
}
