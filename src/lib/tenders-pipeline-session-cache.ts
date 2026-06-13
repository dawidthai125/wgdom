/**
 * Performance 2.1C — sesyjny cache pipeline (module scope, TTL 60s).
 * Przetrwa unmount TendersProvider; współdzielony Pulpit ↔ Przetargi.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TendersCustomKeywords } from "@/lib/tenders-bzp-learn";
import { loadCustomKeywordsLocal } from "@/lib/tenders-bzp-learn";

/** Musi być identyczny z WGDOM_DEFERRED_BOOTSTRAP_EVENT w cloud-sync.ts (bez importu — unikamy cyklu app-core). */
const WGDOM_DEFERRED_BOOTSTRAP_EVENT = "wgdom-deferred-bootstrap";

export const PIPELINE_SESSION_CACHE_TTL_MS = 60_000;
export const PIPELINE_AUTO_AWARD_SESSION_TTL_MS = 60_000;

export type PipelineSessionCacheMeta = {
  generation: number;
  cloudFetchedAt: number;
  autoAwardCompletedAt: number | null;
  keywordsEpoch: string;
  cloudHydrated: boolean;
};

export type PipelineSessionCacheEntry = {
  meta: PipelineSessionCacheMeta;
  items: TenderPipelineItem[];
  customKeywords: TendersCustomKeywords;
};

let cache: PipelineSessionCacheEntry | null = null;
let generationCounter = 0;

const LS_PIPELINE_KEY = "kw-tenders-pipeline";
const LS_KEYWORDS_KEY = "kw-tenders-custom-keywords";

function readPipelineLocal(): TenderPipelineItem[] {
  try {
    const raw = localStorage.getItem(LS_PIPELINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TenderPipelineItem[]) : [];
  } catch {
    return [];
  }
}

function readKeywordsLocal(): TendersCustomKeywords {
  try {
    const raw = localStorage.getItem(LS_KEYWORDS_KEY);
    if (!raw) return { action: [], scope: [], exclude: [], learnedFromCount: 0, updatedAt: "" };
    const p = JSON.parse(raw) as Partial<TendersCustomKeywords>;
    return {
      action: Array.isArray(p.action) ? p.action : [],
      scope: Array.isArray(p.scope) ? p.scope : [],
      exclude: Array.isArray(p.exclude) ? p.exclude : [],
      learnedFromCount: p.learnedFromCount ?? 0,
      updatedAt: p.updatedAt ?? "",
    };
  } catch {
    return { action: [], scope: [], exclude: [], learnedFromCount: 0, updatedAt: "" };
  }
}

/** Performance 2.1C+ — CloudLoader zmergował LS; nie invaliduj TTL po starcie sesji. */
function hydratePipelineSessionCacheFromLocalStorage(): void {
  if (!cache) return;
  if (Date.now() - cache.meta.cloudFetchedAt >= PIPELINE_SESSION_CACHE_TTL_MS) return;
  const items = readPipelineLocal();
  const customKeywords = readKeywordsLocal();
  patchPipelineSessionCache(items, {
    customKeywords,
    partialMeta: { keywordsEpoch: keywordsEpochFromCustom(customKeywords) },
  });
}

export function keywordsEpochFromCustom(kw: TendersCustomKeywords): string {
  return kw.updatedAt || JSON.stringify([kw.action, kw.scope, kw.exclude]);
}

export function getPipelineCacheGeneration(): number {
  return generationCounter;
}

/** Surowy wpis (bez TTL) — do patch po zapisie keywords. */
export function getPipelineSessionCacheOrNull(): PipelineSessionCacheEntry | null {
  return cache;
}

export function getPipelineSessionCacheIfFresh(now = Date.now()): PipelineSessionCacheEntry | null {
  if (!cache) return null;
  if (now - cache.meta.cloudFetchedAt >= PIPELINE_SESSION_CACHE_TTL_MS) return null;
  return cache;
}

export function shouldSkipAutoAwardPass(now = Date.now()): boolean {
  if (!cache) return false;
  const at = cache.meta.autoAwardCompletedAt;
  return at != null && now - at < PIPELINE_AUTO_AWARD_SESSION_TTL_MS;
}

export function setPipelineSessionCache(input: {
  items: TenderPipelineItem[];
  customKeywords: TendersCustomKeywords;
  cloudHydrated?: boolean;
  autoAwardCompletedAt?: number | null;
}): void {
  const now = Date.now();
  cache = {
    items: input.items,
    customKeywords: input.customKeywords,
    meta: {
      generation: generationCounter,
      cloudFetchedAt: now,
      autoAwardCompletedAt: input.autoAwardCompletedAt ?? null,
      keywordsEpoch: keywordsEpochFromCustom(input.customKeywords),
      cloudHydrated: input.cloudHydrated ?? true,
    },
  };
}

export function patchPipelineSessionCache(
  items: TenderPipelineItem[],
  opts?: {
    partialMeta?: Partial<PipelineSessionCacheMeta>;
    customKeywords?: TendersCustomKeywords;
  },
): void {
  if (!cache) {
    const kw = opts?.customKeywords ?? loadCustomKeywordsLocal();
    setPipelineSessionCache({
      items,
      customKeywords: kw,
      cloudHydrated: false,
      autoAwardCompletedAt: null,
    });
    return;
  }
  cache = {
    items,
    customKeywords: opts?.customKeywords ?? cache.customKeywords,
    meta: { ...cache.meta, ...opts?.partialMeta },
  };
}

export function markPipelineAutoAwardCompleted(now = Date.now()): void {
  if (!cache) return;
  cache.meta.autoAwardCompletedAt = now;
}

export function invalidatePipelineSessionCache(_reason?: string): void {
  generationCounter += 1;
  cache = null;
}

export function invalidatePipelineKeywordsEpoch(): void {
  if (!cache) return;
  cache.meta.keywordsEpoch = "";
}

if (typeof window !== "undefined") {
  window.addEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, () => {
    hydratePipelineSessionCacheFromLocalStorage();
  });
}
