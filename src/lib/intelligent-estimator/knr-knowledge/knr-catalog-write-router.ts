/**
 * IK-KNR KL-1 — VERIFIED-only write boundary.
 * No auto VERIFIED · no research · no HTTP · localStorage adapter only.
 */

import { buildKnrNormContentHash } from "./knr-content-hash";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import { assertKnrCatalogPersistSafe } from "./knr-catalog-authority";
import {
  loadKnrCatalogStoreLocal,
  rebuildKnrAliasIndex,
  normalizeKnrCatalogStore,
  type KnrCatalogStore,
  casWriteKnrCatalogStore,
} from "./knr-catalog-store";
import { validateKnrCatalogEntryCandidate } from "./knr-validate-contract";

export type KnrCatalogPersistOutcome = "CREATED" | "NOOP";

export type KnrCatalogPersistResult =
  | { ok: true; outcome: KnrCatalogPersistOutcome; store: KnrCatalogStore }
  | {
      ok: false;
      reason:
        | "NOT_VERIFIED"
        | "VALIDATION_FAILED"
        | "CONTENT_CONFLICT"
        | "DESTRUCTIVE_WRITE"
        | "CAS_MISMATCH";
      messagePl: string;
      store: KnrCatalogStore;
    };

export type PersistVerifiedKnrCatalogEntryInput = {
  entry: KnrCatalogEntry;
  nowIso: string;
  expectedEtag?: string;
  /** In-memory store for tests — skips localStorage when set. */
  storeOverride?: KnrCatalogStore;
};

function applyEntryToStore(
  store: KnrCatalogStore,
  entry: KnrCatalogEntry,
  nowIso: string,
): KnrCatalogStore {
  const contentHash = entry.contentHash.trim() || buildKnrNormContentHash(entry.norms);
  const nextEntry: KnrCatalogEntry = {
    ...entry,
    contentHash,
    updatedAt: nowIso,
    provenance: {
      ...entry.provenance,
      contentHash: entry.provenance.contentHash || contentHash,
    },
  };
  const entries = { ...store.entries, [nextEntry.identityKeyV2]: nextEntry };
  return normalizeKnrCatalogStore(
    {
      ...store,
      entries,
      aliasIndex: rebuildKnrAliasIndex(entries),
      updatedAt: nowIso,
    },
    nowIso,
  );
}

/**
 * Persist only VERIFIED entries that pass forVerifiedTarget validation.
 * Same identityKeyV2 + same contentHash → NOOP.
 * Same identityKeyV2 + diff contentHash → CONTENT_CONFLICT.
 */
export function persistVerifiedKnrCatalogEntry(
  input: PersistVerifiedKnrCatalogEntryInput,
): KnrCatalogPersistResult {
  const { entry, nowIso } = input;

  if (entry.verificationStatus !== "VERIFIED") {
    return {
      ok: false,
      reason: "NOT_VERIFIED",
      messagePl: "Write-router akceptuje wyłącznie verificationStatus=VERIFIED.",
      store: input.storeOverride ?? loadKnrCatalogStoreLocal(),
    };
  }

  /** Client-supplied VERIFIED without Owner VERIFY metadata = spoof. */
  if (!entry.verifiedAt?.trim() || !entry.verifiedBy?.trim()) {
    return {
      ok: false,
      reason: "NOT_VERIFIED",
      messagePl: "Odrzucono client-supplied VERIFIED — brak verifiedAt/verifiedBy (Owner VERIFY).",
      store: input.storeOverride ?? loadKnrCatalogStoreLocal(),
    };
  }

  const validation = validateKnrCatalogEntryCandidate({
    entry,
    forVerifiedTarget: true,
  });
  if (validation.validationState !== "PASS") {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      messagePl: `Walidacja odrzucona: ${validation.codes.join(", ")}`,
      store: input.storeOverride ?? loadKnrCatalogStoreLocal(),
    };
  }

  const current = input.storeOverride ?? loadKnrCatalogStoreLocal();
  const contentHash = entry.contentHash.trim() || buildKnrNormContentHash(entry.norms);
  const existing = current.entries[entry.identityKeyV2];

  if (existing) {
    const existingHash = existing.contentHash.trim() || buildKnrNormContentHash(existing.norms);
    if (existingHash === contentHash) {
      // Idempotent only when already VERIFIED+ACTIVE — PENDING→VERIFIED is CREATED upgrade.
      if (
        existing.verificationStatus === "VERIFIED"
        && existing.lifecycleState === "ACTIVE"
      ) {
        return { ok: true, outcome: "NOOP", store: current };
      }
    } else {
      return {
        ok: false,
        reason: "CONTENT_CONFLICT",
        messagePl: "Ten sam identityKeyV2 z innym contentHash — brak nadpisania.",
        store: current,
      };
    }
  }

  const nextStore = applyEntryToStore(current, { ...entry, contentHash }, nowIso);

  try {
    assertKnrCatalogPersistSafe(nextStore, current);
  } catch {
    return {
      ok: false,
      reason: "DESTRUCTIVE_WRITE",
      messagePl: "Odrzucono destrukcyjny zapis katalogu KNR.",
      store: current,
    };
  }

  if (input.storeOverride) {
    return { ok: true, outcome: "CREATED", store: nextStore };
  }

  const cas = casWriteKnrCatalogStore({
    expectedEtag: input.expectedEtag ?? current.etag,
    next: nextStore,
    baselineForGuard: current,
  });
  if (!cas.ok) {
    return {
      ok: false,
      reason: cas.reason === "etag_mismatch" ? "CAS_MISMATCH" : "DESTRUCTIVE_WRITE",
      messagePl: cas.messagePl,
      store: cas.store,
    };
  }
  return { ok: true, outcome: "CREATED", store: cas.store };
}

/** In-memory persist for harness — no localStorage side effects. */
export function persistVerifiedKnrCatalogEntryInMemory(
  input: Omit<PersistVerifiedKnrCatalogEntryInput, "storeOverride"> & {
    store: KnrCatalogStore;
  },
): KnrCatalogPersistResult {
  return persistVerifiedKnrCatalogEntry({
    ...input,
    storeOverride: input.store,
  });
}

export const KNR_KNOWLEDGE_KL1_IMPLEMENTED = true as const;
