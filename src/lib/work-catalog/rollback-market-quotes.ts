/**
 * WC-P3.2-S2 — Rollback (Single Undo) dla Apply Market Quotes.
 *
 * Model lightweight: `snapshot-before-commit` → `undo-last-import`.
 * BEZ historii · BEZ event sourcingu · BEZ multi-level undo (jeden token).
 *
 * Pure · deterministyczny · ZERO localStorage / cloud / runtime / UI.
 * Rollback obejmuje CAŁY WorkCatalogStore. Integralność chroniona
 * przez browser-safe fingerprint (bez node:crypto).
 */

import { normalizeWorkCatalogStore } from "@/lib/work-catalog/work-catalog-store";
import { WORK_CATALOG_SCHEMA_VERSION, type WorkCatalogStore } from "@/lib/work-catalog/types";

export const MARKET_QUOTES_ROLLBACK_KIND = "market-quotes-rollback" as const;

export interface MarketQuotesRollbackSnapshot {
  kind: typeof MARKET_QUOTES_ROLLBACK_KIND;
  schemaVersion: number;
  fingerprint: string;
  store: WorkCatalogStore;
}

export type RestoreMarketQuotesReason =
  | "ok"
  | "empty-snapshot"
  | "corrupted-snapshot"
  | "schema-mismatch";

export interface RestoreMarketQuotesResult {
  store: WorkCatalogStore;
  restored: boolean;
  reason: RestoreMarketQuotesReason;
}

/** Deterministyczny klon kanoniczny (bez współdzielonych referencji). */
function cloneStore(store: WorkCatalogStore): WorkCatalogStore {
  return normalizeWorkCatalogStore(JSON.parse(JSON.stringify(store)));
}

/** cyrb53 — stabilny, browser-safe hash (bez node:crypto). */
function cyrb53Hex(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hv = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hv.toString(16).padStart(14, "0");
}

/** Integralnościowy fingerprint całego store (kanoniczny). */
export function fingerprintWorkCatalogStore(store: WorkCatalogStore): string {
  return cyrb53Hex(JSON.stringify(cloneStore(store)));
}

/**
 * snapshot-before-commit — utrwala stan CAŁEGO store PRZED apply.
 * Zwraca pojedynczy token undo (deep-clone + fingerprint integralności).
 */
export function captureMarketQuotesSnapshot(
  store: WorkCatalogStore,
): MarketQuotesRollbackSnapshot {
  const cloned = cloneStore(store);
  return {
    kind: MARKET_QUOTES_ROLLBACK_KIND,
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    fingerprint: cyrb53Hex(JSON.stringify(cloned)),
    store: cloned,
  };
}

/**
 * undo-last-import — przywraca store z tokena snapshot.
 * Bezpieczny no-op (zwraca `current`) dla pustego / uszkodzonego / niezgodnego
 * schematu tokena. Idempotentny: wielokrotne restore z tym samym tokenem daje
 * identyczny store.
 */
export function restoreMarketQuotesSnapshot(
  current: WorkCatalogStore,
  snapshot: MarketQuotesRollbackSnapshot | null | undefined,
): RestoreMarketQuotesResult {
  if (!snapshot || typeof snapshot !== "object") {
    return { store: current, restored: false, reason: "empty-snapshot" };
  }

  const snap = snapshot as Partial<MarketQuotesRollbackSnapshot>;
  if (
    snap.kind !== MARKET_QUOTES_ROLLBACK_KIND ||
    !snap.store ||
    typeof snap.store !== "object" ||
    typeof snap.fingerprint !== "string"
  ) {
    return { store: current, restored: false, reason: "corrupted-snapshot" };
  }

  const restored = cloneStore(snap.store as WorkCatalogStore);
  const expected = cyrb53Hex(JSON.stringify(restored));
  if (snap.fingerprint !== expected) {
    return { store: current, restored: false, reason: "corrupted-snapshot" };
  }

  if (typeof snap.schemaVersion === "number" && snap.schemaVersion !== WORK_CATALOG_SCHEMA_VERSION) {
    return { store: current, restored: false, reason: "schema-mismatch" };
  }

  return { store: restored, restored: true, reason: "ok" };
}
