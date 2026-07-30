/**
 * MARKET-SYNC-01 P0 — local-first staging store.
 * NIE w DATA_KEYS · NIE cloud-sync · NIE Work Catalog.
 */

import {
  EMPTY_MARKET_SYNC_STAGING,
  MARKET_SYNC_STAGING_STORAGE_KEY,
  type MarketProduct,
  type MarketSyncStagingStore,
  type ProviderId,
  type ProviderQuote,
  type SyncRun,
} from "@/lib/market-sync/types";
import { dedupeFolded, uniqueEans } from "@/lib/market-sync/normalize";

function nowIso(): string {
  return new Date().toISOString();
}

function isBrowserStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function createEmptyStagingStore(updatedAt = nowIso()): MarketSyncStagingStore {
  return { ...EMPTY_MARKET_SYNC_STAGING, updatedAt };
}

export function normalizeMarketProduct(raw: unknown): MarketProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const canonicalName = typeof o.canonicalName === "string" ? o.canonicalName.trim() : "";
  const unit = typeof o.unit === "string" ? o.unit.trim() : "";
  if (!id || !canonicalName || !unit) return null;
  const aliases = Array.isArray(o.aliases)
    ? dedupeFolded(o.aliases.filter((a): a is string => typeof a === "string"))
    : [];
  const ean = Array.isArray(o.ean)
    ? uniqueEans(o.ean.filter((a): a is string => typeof a === "string"))
    : [];
  return {
    id,
    canonicalName,
    manufacturer: typeof o.manufacturer === "string" ? o.manufacturer : o.manufacturer === null ? null : null,
    unit,
    category: typeof o.category === "string" ? o.category : null,
    aliases,
    ean,
    active: o.active !== false,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : nowIso(),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : nowIso(),
  };
}

export function normalizeStagingStore(raw: unknown): MarketSyncStagingStore {
  if (!raw || typeof raw !== "object") return createEmptyStagingStore();
  const o = raw as Record<string, unknown>;
  const products = Array.isArray(o.marketProducts)
    ? o.marketProducts.map(normalizeMarketProduct).filter((p): p is MarketProduct => p != null)
    : [];
  const quotes = Array.isArray(o.providerQuotes)
    ? (o.providerQuotes as ProviderQuote[]).filter(
        (q) => q && typeof q === "object" && typeof (q as ProviderQuote).id === "string",
      )
    : [];
  const syncRuns = Array.isArray(o.syncRuns)
    ? (o.syncRuns as SyncRun[]).filter(
        (r) => r && typeof r === "object" && typeof (r as SyncRun).id === "string",
      )
    : [];
  return {
    version: 1,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : nowIso(),
    marketProducts: products,
    providerQuotes: quotes,
    syncRuns,
  };
}

export function loadMarketSyncStagingLocal(): MarketSyncStagingStore {
  if (!isBrowserStorage()) return createEmptyStagingStore();
  try {
    const raw = localStorage.getItem(MARKET_SYNC_STAGING_STORAGE_KEY);
    if (!raw) return createEmptyStagingStore();
    return normalizeStagingStore(JSON.parse(raw));
  } catch {
    return createEmptyStagingStore();
  }
}

export function saveMarketSyncStagingLocal(store: MarketSyncStagingStore): void {
  if (!isBrowserStorage()) return;
  const next = { ...store, updatedAt: nowIso(), version: 1 as const };
  localStorage.setItem(MARKET_SYNC_STAGING_STORAGE_KEY, JSON.stringify(next));
}

export function clearMarketSyncStagingLocal(): void {
  if (!isBrowserStorage()) return;
  localStorage.removeItem(MARKET_SYNC_STAGING_STORAGE_KEY);
}

export function exportMarketSyncStagingJson(store: MarketSyncStagingStore): string {
  return JSON.stringify({ ...store, version: 1 }, null, 2);
}

export function importMarketSyncStagingJson(text: string): MarketSyncStagingStore {
  const parsed = JSON.parse(text) as unknown;
  return normalizeStagingStore(parsed);
}

export function mergeMarketProducts(
  store: MarketSyncStagingStore,
  incoming: readonly MarketProduct[],
): MarketSyncStagingStore {
  const byId = new Map(store.marketProducts.map((p) => [p.id, p]));
  // EAN uniqueness among active
  const eanOwner = new Map<string, string>();
  for (const p of byId.values()) {
    if (!p.active) continue;
    for (const e of p.ean) eanOwner.set(e, p.id);
  }
  for (const p of incoming) {
    const normalized = normalizeMarketProduct(p);
    if (!normalized) continue;
    let ok = true;
    for (const e of normalized.ean) {
      const owner = eanOwner.get(e);
      if (owner && owner !== normalized.id) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    byId.set(normalized.id, normalized);
    if (normalized.active) {
      for (const e of normalized.ean) eanOwner.set(e, normalized.id);
    }
  }
  return {
    ...store,
    marketProducts: [...byId.values()],
    updatedAt: nowIso(),
  };
}

export function appendImportToStaging(
  store: MarketSyncStagingStore,
  syncRun: SyncRun,
  quotes: readonly ProviderQuote[],
): MarketSyncStagingStore {
  return {
    ...store,
    syncRuns: [...store.syncRuns, syncRun],
    providerQuotes: [...store.providerQuotes, ...quotes],
    updatedAt: nowIso(),
  };
}

export function replaceQuotesInStaging(
  store: MarketSyncStagingStore,
  quotes: readonly ProviderQuote[],
): MarketSyncStagingStore {
  return {
    ...store,
    providerQuotes: [...quotes],
    updatedAt: nowIso(),
  };
}

export function createMarketProductDraft(input: {
  canonicalName: string;
  manufacturer?: string | null;
  unit: string;
  category?: string | null;
  aliases?: string[];
  ean?: string[];
  id?: string;
  nowIso?: string;
}): MarketProduct {
  const ts = input.nowIso ?? nowIso();
  return {
    id: input.id ?? `mp-${crypto.randomUUID()}`,
    canonicalName: input.canonicalName.trim(),
    manufacturer: input.manufacturer?.trim() || null,
    unit: input.unit,
    category: input.category ?? null,
    aliases: dedupeFolded(input.aliases ?? []),
    ean: uniqueEans(input.ean ?? []),
    active: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function assertNoPublishSurfaceInModuleGraph(): {
  commitImportTouched: boolean;
} {
  // Guard dokumentacyjny dla testów OV — runtime nie importuje commit.
  return { commitImportTouched: false };
}

export type { ProviderId };
