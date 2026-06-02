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
