/**
 * TP192C — równoległy prefetch bajtów dokumentów dossier (concurrency 4).
 */

import type { TenderBzpDocument } from "@/lib/tenders-bzp";
import { resolveTenderDocumentDownload } from "@/lib/tenders-bzp";
import {
  getTenderDocumentBytesCached,
  tenderDocumentBytesCacheKey,
} from "@/lib/tender-document-bytes-cache";
import { mapWithConcurrency } from "@/lib/tender-platform-adapters";

export const DOSSIER_DOCUMENT_BYTES_CONCURRENCY = 4;

export type BytesPrefetchSpec = {
  documentIndex: number;
  downloadUrl?: string;
};

export function bytesPrefetchCacheKey(
  tenderId: string,
  documentIndex: number,
  docs: TenderBzpDocument[],
  downloadUrl?: string,
): string {
  const access = resolveTenderDocumentDownload(docs, documentIndex);
  return tenderDocumentBytesCacheKey(
    tenderId,
    documentIndex,
    downloadUrl ?? access?.downloadUrl,
    access?.sourcePageUrl,
  );
}

/** Unikalne specy bez wpisów już w cache (kolejność wejścia zachowana). */
export function filterBytesPrefetchTodo(
  tenderId: string,
  docs: TenderBzpDocument[],
  specs: BytesPrefetchSpec[],
  isCached: (key: string) => boolean = (key) => Boolean(getTenderDocumentBytesCached(key)),
): BytesPrefetchSpec[] {
  const seen = new Set<string>();
  const out: BytesPrefetchSpec[] = [];
  for (const spec of specs) {
    const key = bytesPrefetchCacheKey(tenderId, spec.documentIndex, docs, spec.downloadUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    if (isCached(key)) continue;
    out.push(spec);
  }
  return out;
}

/** TP192C — prefetch z limitem równoległości; błędy pojedynczych fetch ignorowane. */
export async function prefetchDocumentBytesWithConcurrency(
  specs: BytesPrefetchSpec[],
  concurrency: number,
  fetchOne: (spec: BytesPrefetchSpec, index: number) => Promise<void>,
): Promise<void> {
  if (!specs.length) return;
  await mapWithConcurrency(specs, concurrency, async (spec, index) => {
    try {
      await fetchOne(spec, index);
    } catch {
      /* best-effort prefetch — parse phase obsłuży błędy */
    }
  });
}
