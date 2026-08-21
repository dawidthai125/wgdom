/**
 * IK-HISTORICAL-EXECUTED-ATH Host Hydrate — async load + session cache + index build.
 *
 * READ-ONLY · fail-soft per source · authority:false via builder.
 * ZERO KL-6 · ZERO Catalog · ZERO VERIFY · ZERO localStorage primary.
 */

import type { Job } from "@/app/app-domain";
import { fetchKosztorysBytes } from "@/lib/ath-parser";
import { sha256Hex } from "@/lib/tender-ingest/hash";
import {
  buildHistoricalExecutedIndexFromAthSources,
  emptyHistoricalExecutedIndex,
  type HistoricalAthSourceInput,
  type HistoricalExecutedIndex,
} from "./historical-executed-index";
import {
  discoverHistoricalExecutedAthCandidates,
  fingerprintHistoricalAthCandidates,
  type HistoricalExecutedAthCandidate,
} from "./historical-executed-discover";

export type HistoricalHydrateLoadBytes = (input: {
  storagePath: string;
  filename: string;
  publicUrl?: string | null;
}) => Promise<Uint8Array | null>;

export type HistoricalHydrateSourceDiag = {
  jobId: string;
  filename: string;
  storagePath: string;
  status: "ok" | "failed";
  reason?: string;
  contentSha256?: string;
  byteLength?: number;
  cacheHit?: boolean;
};

export type HistoricalHydrateReport = {
  candidateCount: number;
  completedJobsWithAth: number;
  fetchedOk: number;
  failed: number;
  cacheHits: number;
  parseOkSources: number;
  index: HistoricalExecutedIndex;
  sources: HistoricalHydrateSourceDiag[];
  fingerprint: string;
  authority: false;
};

type BytesCacheEntry = {
  contentSha256: string;
  bytes: Uint8Array;
  storagePath: string;
};

/** Session in-memory caches (tab lifetime). */
const bytesByPath = new Map<string, BytesCacheEntry>();
const bytesBySha = new Map<string, BytesCacheEntry>();
const inflightByPath = new Map<string, Promise<BytesCacheEntry | null>>();
const indexByFingerprint = new Map<string, HistoricalExecutedIndex>();

const DEFAULT_CONCURRENCY = 3;

export function resetHistoricalExecutedHostHydrateCachesForTests(): void {
  bytesByPath.clear();
  bytesBySha.clear();
  inflightByPath.clear();
  indexByFingerprint.clear();
}

async function defaultLoadBytes(input: {
  storagePath: string;
  filename: string;
  publicUrl?: string | null;
}): Promise<Uint8Array | null> {
  try {
    const viaApi = await fetchKosztorysBytes(input.storagePath, input.filename);
    if (viaApi && viaApi.length > 0) return viaApi;
  } catch {
    /* fallback publicUrl */
  }
  const url = input.publicUrl?.trim();
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function loadCachedBytes(
  candidate: HistoricalExecutedAthCandidate,
  loadBytes: HistoricalHydrateLoadBytes,
): Promise<{ entry: BytesCacheEntry | null; cacheHit: boolean; error?: string }> {
  const cached = bytesByPath.get(candidate.storagePath);
  if (cached) {
    bytesBySha.set(cached.contentSha256, cached);
    return { entry: cached, cacheHit: true };
  }

  let inflight = inflightByPath.get(candidate.storagePath);
  if (!inflight) {
    inflight = (async () => {
      try {
        const bytes = await loadBytes({
          storagePath: candidate.storagePath,
          filename: candidate.filename,
          publicUrl: candidate.publicUrl,
        });
        if (!bytes || bytes.length === 0) return null;
        const contentSha256 = await sha256Hex(bytes);
        const bySha = bytesBySha.get(contentSha256);
        if (bySha) {
          bytesByPath.set(candidate.storagePath, bySha);
          return bySha;
        }
        const entry: BytesCacheEntry = {
          contentSha256,
          bytes,
          storagePath: candidate.storagePath,
        };
        bytesByPath.set(candidate.storagePath, entry);
        bytesBySha.set(contentSha256, entry);
        return entry;
      } catch {
        return null;
      } finally {
        inflightByPath.delete(candidate.storagePath);
      }
    })();
    inflightByPath.set(candidate.storagePath, inflight);
  }

  const entry = await inflight;
  if (!entry) return { entry: null, cacheHit: false, error: "BYTES_UNAVAILABLE" };
  return { entry, cacheHit: false };
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Async hydrate: discover → fetch/cache bytes → build index.
 * Fail-soft per source. Never throws for tender-level failure.
 */
export async function hydrateHistoricalExecutedIndexFromJobs(input: {
  jobs: readonly Job[] | null | undefined;
  loadBytes?: HistoricalHydrateLoadBytes;
  concurrency?: number;
}): Promise<HistoricalHydrateReport> {
  const candidates = discoverHistoricalExecutedAthCandidates(input.jobs);
  const fingerprint = fingerprintHistoricalAthCandidates(candidates);
  const loadBytes = input.loadBytes ?? defaultLoadBytes;
  const concurrency = input.concurrency ?? DEFAULT_CONCURRENCY;

  if (candidates.length === 0) {
    return {
      candidateCount: 0,
      completedJobsWithAth: 0,
      fetchedOk: 0,
      failed: 0,
      cacheHits: 0,
      parseOkSources: 0,
      index: emptyHistoricalExecutedIndex(),
      sources: [],
      fingerprint,
      authority: false,
    };
  }

  // DF/ARCH R2: never treat empty index as a sticky success hit (poison ban).
  const cachedIndex = indexByFingerprint.get(fingerprint);
  if (cachedIndex && cachedIndex.occurrences.length > 0) {
    return {
      candidateCount: candidates.length,
      completedJobsWithAth: new Set(candidates.map((c) => c.jobId)).size,
      fetchedOk: candidates.length,
      failed: 0,
      cacheHits: candidates.length,
      parseOkSources: cachedIndex.sourceCount,
      index: cachedIndex,
      sources: candidates.map((c) => ({
        jobId: c.jobId,
        filename: c.filename,
        storagePath: c.storagePath,
        status: "ok" as const,
        cacheHit: true,
        contentSha256: bytesByPath.get(c.storagePath)?.contentSha256,
      })),
      fingerprint,
      authority: false,
    };
  }
  if (cachedIndex && cachedIndex.occurrences.length === 0) {
    indexByFingerprint.delete(fingerprint);
  }

  const perSource = await mapPool(candidates, concurrency, async (candidate) => {
    const { entry, cacheHit, error } = await loadCachedBytes(candidate, loadBytes);
    return { candidate, entry, cacheHit, error };
  });

  const diags: HistoricalHydrateSourceDiag[] = [];
  const athInputs: HistoricalAthSourceInput[] = [];
  let cacheHits = 0;
  let failed = 0;

  for (const row of perSource) {
    const { candidate, entry, cacheHit, error } = row;
    if (cacheHit) cacheHits += 1;
    if (!entry) {
      failed += 1;
      diags.push({
        jobId: candidate.jobId,
        filename: candidate.filename,
        storagePath: candidate.storagePath,
        status: "failed",
        reason: error || "BYTES_UNAVAILABLE",
        cacheHit,
      });
      continue;
    }

    athInputs.push({
      bytes: entry.bytes,
      jobId: candidate.jobId,
      address: candidate.address,
      filename: candidate.filename,
      storagePath: candidate.storagePath,
      contentSha256: entry.contentSha256,
      jobStatus: candidate.jobStatus,
    });
    diags.push({
      jobId: candidate.jobId,
      filename: candidate.filename,
      storagePath: candidate.storagePath,
      status: "ok",
      contentSha256: entry.contentSha256,
      byteLength: entry.bytes.length,
      cacheHit,
    });
  }

  const index = athInputs.length > 0
    ? buildHistoricalExecutedIndexFromAthSources(athInputs)
    : emptyHistoricalExecutedIndex();

  // Only cache non-empty indexes — all-fetch-fail must remain retryable.
  if (index.occurrences.length > 0) {
    indexByFingerprint.set(fingerprint, index);
  } else {
    indexByFingerprint.delete(fingerprint);
  }

  return {
    candidateCount: candidates.length,
    completedJobsWithAth: new Set(candidates.map((c) => c.jobId)).size,
    fetchedOk: diags.filter((d) => d.status === "ok").length,
    failed,
    cacheHits,
    parseOkSources: index.sourceCount,
    index,
    sources: diags,
    fingerprint,
    authority: false,
  };
}
