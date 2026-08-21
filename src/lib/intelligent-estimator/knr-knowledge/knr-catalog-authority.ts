/**
 * IK-KNR KL-1 — catalog authority guard (ADAPT: work-catalog-authority.ts).
 *
 * Authority = normative KNR knowledge persist safety (anti-wipe).
 * NOT = Work Catalog / OUR RATE / Price Memory / Bid / pricing authority.
 *
 * Status transitions: knr-verify-types (planKnrOwnerVerifyTransition).
 * VERIFIED persist: knr-catalog-write-router only.
 * Pricing field deny: knr-catalog-store normalizeKnrCatalogEntry.
 */

import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrCatalogStore } from "./knr-catalog-store";

export type KnrCatalogPersistBlockReason = "destructive_catalog_replace";

export class KnrCatalogDestructivePersistError extends Error {
  readonly code: KnrCatalogPersistBlockReason = "destructive_catalog_replace";

  constructor(
    message = "Refusing to persist empty KNR catalog over store with VERIFIED entries",
  ) {
    super(message);
    this.name = "KnrCatalogDestructivePersistError";
  }
}

export function listKnrCatalogEntries(
  store: KnrCatalogStore | null | undefined,
): KnrCatalogEntry[] {
  if (!store?.entries) return [];
  return Object.values(store.entries);
}

export function isEmptyKnrCatalogStore(store: KnrCatalogStore | null | undefined): boolean {
  return listKnrCatalogEntries(store).length === 0;
}

export function hasVerifiedKnrCatalogEntries(
  store: KnrCatalogStore | null | undefined,
): boolean {
  return listKnrCatalogEntries(store).some(
    (entry) =>
      entry.verificationStatus === "VERIFIED"
      && entry.lifecycleState === "ACTIVE",
  );
}

/** Empty candidate must not replace baseline with VERIFIED entries. */
export function isDestructiveKnrCatalogReplace(
  candidate: KnrCatalogStore | null | undefined,
  baseline: KnrCatalogStore | null | undefined,
): boolean {
  if (!hasVerifiedKnrCatalogEntries(baseline)) return false;
  return isEmptyKnrCatalogStore(candidate);
}

export function assertKnrCatalogPersistSafe(
  candidate: KnrCatalogStore,
  baseline: KnrCatalogStore,
): void {
  if (isDestructiveKnrCatalogReplace(candidate, baseline)) {
    throw new KnrCatalogDestructivePersistError();
  }
}
