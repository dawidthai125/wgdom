import { isDeadStorageUrl } from "@/lib/storage-url";

const failedUrls = new Set<string>();
const listeners = new Set<() => void>();

function notifyMediaFailures() {
  listeners.forEach((l) => l());
}

/** URL zapisany po błędzie 404 / braku pliku w storage. */
export function markMediaUrlFailed(url: string | undefined | null): void {
  if (typeof url !== "string" || !url.trim() || failedUrls.has(url)) return;
  failedUrls.add(url);
  notifyMediaFailures();
}

export function subscribeMediaFailures(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getMediaFailureGeneration(): number {
  return failedUrls.size;
}

/** Brak URL, stary bucket albo potwierdzony błąd ładowania. */
export function isUnavailableMediaUrl(url: string | undefined | null): boolean {
  if (typeof url !== "string" || !url.trim()) return true;
  if (isDeadStorageUrl(url)) return true;
  if (failedUrls.has(url)) return true;
  return false;
}

export function isMediaAttachmentAvailable(item: {
  publicUrl?: string | null;
  path?: string | null;
}): boolean {
  const url = item.publicUrl?.trim();
  if (url) return !isUnavailableMediaUrl(url);
  const path = item.path?.trim();
  if (path) return !isUnavailableMediaUrl(path);
  return false;
}

export function filterAvailablePhotos<T extends { publicUrl?: string | null; path?: string | null }>(
  photos: T[] | undefined | null,
): T[] {
  return (photos || []).filter(isMediaAttachmentAvailable);
}

export function filterAvailableJobFiles<T extends { publicUrl?: string | null; path?: string | null }>(
  files: T[] | undefined | null,
): T[] {
  return (files || []).filter(isMediaAttachmentAvailable);
}

export function availableSketch<T extends { publicUrl?: string | null; path?: string | null }>(
  sketch: T | null | undefined,
): T | null {
  if (!sketch || !isMediaAttachmentAvailable(sketch)) return null;
  return sketch;
}

/** Martwy storage (stary projekt / obcy bucket) — bez runtime 404 z sesji. */
function isDeadMediaAttachment(item: {
  publicUrl?: string | null;
  path?: string | null;
  url?: string | null;
}): boolean {
  const url = (item.publicUrl || item.url || "").trim();
  const path = (item.path || "").trim();
  return isDeadStorageUrl(url) || isDeadStorageUrl(path);
}

/** Usuwa martwe URL storage z jednej roboty (sync — nie zmienia innych pól). */
export function stripDeadMediaFromJob<T extends Record<string, unknown>>(job: T): T {
  if (!job || typeof job !== "object") return job;

  const photos = (Array.isArray(job.photos) ? job.photos : [])
    .filter((p) => p && typeof p === "object" && !isDeadMediaAttachment(p as { publicUrl?: string; path?: string; url?: string }));

  const jobFiles = (Array.isArray(job.jobFiles) ? job.jobFiles : [])
    .filter((f) => f && typeof f === "object" && !isDeadMediaAttachment(f as { publicUrl?: string; path?: string }));

  const inspectorPhotos = (Array.isArray(job.inspectorPhotos) ? job.inspectorPhotos : [])
    .filter((p) => p && typeof p === "object" && !isDeadMediaAttachment(p as { publicUrl?: string; path?: string; url?: string }));

  const workerReports = (Array.isArray(job.workerReports) ? job.workerReports : []).map((r) => {
    if (!r || typeof r !== "object") return r;
    const row = r as { sketch?: { publicUrl?: string; path?: string } | null };
    const sketch =
      row.sketch && typeof row.sketch === "object" && !isDeadMediaAttachment(row.sketch)
        ? row.sketch
        : null;
    return { ...row, sketch };
  });

  let sketch = job.sketch;
  if (sketch && typeof sketch === "object" && isDeadMediaAttachment(sketch as { publicUrl?: string; path?: string })) {
    sketch = null;
  }

  return {
    ...job,
    photos,
    jobFiles,
    inspectorPhotos,
    workerReports,
    sketch,
  };
}

/** Usuwa martwe URL storage z listy robót (po merge / przed push do chmury). */
export function stripDeadMediaFromJobs(jobs: unknown[]): unknown[] {
  if (!Array.isArray(jobs)) return jobs;
  return jobs.map((j) =>
    j && typeof j === "object" ? stripDeadMediaFromJob(j as Record<string, unknown>) : j,
  );
}
