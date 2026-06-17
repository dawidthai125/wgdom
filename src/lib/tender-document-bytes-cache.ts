/**
 * P3-AUDIT-001-FIX-C — sesyjny cache bajtów załączników BZP (bez zmian wyniku parsowania).
 */

const CACHE_MAX = 48;

export interface TenderDocumentBytesCacheEntry {
  base64: string;
  filename: string;
  contentType: string;
}

const cache = new Map<string, TenderDocumentBytesCacheEntry>();

export function tenderDocumentBytesCacheKey(
  tenderId: string,
  documentIndex: number,
  downloadUrl?: string,
  sourcePageUrl?: string,
): string {
  return `${tenderId}|${documentIndex}|${downloadUrl ?? ""}|${sourcePageUrl ?? ""}`;
}

export function getTenderDocumentBytesCached(
  key: string,
): TenderDocumentBytesCacheEntry | null {
  return cache.get(key) ?? null;
}

export function setTenderDocumentBytesCached(
  key: string,
  entry: TenderDocumentBytesCacheEntry,
): void {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, entry);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest == null) break;
    cache.delete(oldest);
  }
}

export function clearTenderDocumentBytesCache(): void {
  cache.clear();
}

export function tenderDocumentBytesCacheSize(): number {
  return cache.size;
}
