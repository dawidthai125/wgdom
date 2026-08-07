/**
 * GLOBAL-KNOWLEDGE-E1B — softDelete · legalWipe (public mutations AR-C2).
 * AR-C3: flag OFF ⇒ store/LS unchanged.
 */

import { mayPersistGlobalKnowledgeE1b } from "./flag";
import {
  bumpContentVersion,
  createEmptyGlobalKnowledgeStore,
  persistGlobalKnowledgeStoreLocal,
} from "./store";
import type {
  GlobalKnowledgeLegalWipeOpts,
  GlobalKnowledgeSoftDeleteMeta,
  GlobalKnowledgeStore,
} from "./types";

export type SoftDeleteCode =
  | "FLAG_OFF"
  | "NOT_FOUND"
  | "ALREADY_OBSOLETE"
  | "OK";

export interface SoftDeleteResult {
  ok: boolean;
  persisted: boolean;
  store: GlobalKnowledgeStore;
  codes: SoftDeleteCode[];
}

export type LegalWipeCode =
  | "FLAG_OFF"
  | "MISSING_CONFIRM_TOKEN"
  | "MISSING_ACTOR"
  | "MISSING_NOTES"
  | "OK";

export interface LegalWipeResult {
  ok: boolean;
  persisted: boolean;
  store: GlobalKnowledgeStore;
  codes: LegalWipeCode[];
}

/**
 * Soft delete — lifecycle OBSOLETE + validTo; wiersz pozostaje w tablicy.
 */
export function softDeleteGlobalKnowledgeEntry(
  store: GlobalKnowledgeStore,
  globalId: string,
  meta: GlobalKnowledgeSoftDeleteMeta,
): SoftDeleteResult {
  if (!mayPersistGlobalKnowledgeE1b(meta.forcePersistForTests)) {
    return { ok: false, persisted: false, store, codes: ["FLAG_OFF"] };
  }
  const id = String(globalId || "").trim();
  const idx = store.entries.findIndex((e) => e.globalId === id);
  if (idx < 0) {
    return { ok: false, persisted: false, store, codes: ["NOT_FOUND"] };
  }
  const nowIso = meta.nowIso ?? new Date().toISOString();
  const prev = store.entries[idx]!;
  if (prev.lifecycle === "OBSOLETE") {
    return { ok: true, persisted: false, store, codes: ["ALREADY_OBSOLETE"] };
  }
  const nextEntry = {
    ...prev,
    lifecycle: "OBSOLETE" as const,
    validTo: nowIso,
    supersededBy: null,
  };
  const entries = store.entries.map((e, i) => (i === idx ? nextEntry : e));
  const nextStore: GlobalKnowledgeStore = {
    ...store,
    entries,
    contentVersion: bumpContentVersion(store.contentVersion, nowIso),
    updatedAt: nowIso,
  };
  persistGlobalKnowledgeStoreLocal(nextStore);
  return { ok: true, persisted: true, store: nextStore, codes: ["OK"] };
}

/**
 * Legal wipe — entries=[] · licences retained.
 * Wymaga confirmToken + actor + notes (non-empty).
 */
export function legalWipeGlobalKnowledgeEntries(
  store: GlobalKnowledgeStore,
  opts: GlobalKnowledgeLegalWipeOpts,
): LegalWipeResult {
  if (!mayPersistGlobalKnowledgeE1b(opts.forcePersistForTests)) {
    return { ok: false, persisted: false, store, codes: ["FLAG_OFF"] };
  }
  const codes: LegalWipeCode[] = [];
  if (!String(opts.confirmToken || "").trim()) codes.push("MISSING_CONFIRM_TOKEN");
  if (!String(opts.actor || "").trim()) codes.push("MISSING_ACTOR");
  if (!String(opts.notes || "").trim()) codes.push("MISSING_NOTES");
  if (codes.length) {
    return { ok: false, persisted: false, store, codes };
  }
  const nowIso = opts.nowIso ?? new Date().toISOString();
  const empty = createEmptyGlobalKnowledgeStore({
    contentVersion: bumpContentVersion(store.contentVersion, nowIso),
    includeOwnerLicence: true,
  });
  // Preserve existing licences when present; else owner seed from empty.
  const nextStore: GlobalKnowledgeStore = {
    ...empty,
    licences: store.licences.length ? store.licences : empty.licences,
    entries: [],
    updatedAt: nowIso,
  };
  persistGlobalKnowledgeStoreLocal(nextStore);
  return { ok: true, persisted: true, store: nextStore, codes: ["OK"] };
}
