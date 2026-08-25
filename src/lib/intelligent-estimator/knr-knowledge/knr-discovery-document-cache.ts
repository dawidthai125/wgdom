/**
 * IK-KNR Phase 2D — in-process document body cache (same allowlisted URL → one fetch).
 * Shared across multiple MISS keys targeting the same sourceId/document.
 * NEVER caches arbitrary client URLs — only keys used after allowlist resolve.
 */

export type KnrDiscoveryCachedDocument = {
  finalUrl: string;
  contentType: string;
  bodyText: string;
  fetchedAtIso: string;
  byteLength: number;
};

const cacheByUrl = new Map<string, KnrDiscoveryCachedDocument>();

export function clearKnrDiscoveryDocumentCacheForTests(): void {
  cacheByUrl.clear();
}

export function getKnrDiscoveryCachedDocument(
  requestUrl: string,
): KnrDiscoveryCachedDocument | null {
  const key = String(requestUrl ?? "").trim();
  if (!key) return null;
  return cacheByUrl.get(key) ?? null;
}

export function setKnrDiscoveryCachedDocument(
  requestUrl: string,
  doc: KnrDiscoveryCachedDocument,
): void {
  const key = String(requestUrl ?? "").trim();
  if (!key) return;
  cacheByUrl.set(key, doc);
}

export const KNR_DISCOVERY_DOCUMENT_CACHE_P2D_IMPLEMENTED = true as const;
