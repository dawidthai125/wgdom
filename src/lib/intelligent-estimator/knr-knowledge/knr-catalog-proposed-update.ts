/**
 * KL-7-P1 — offline proposed update bag (NO HTTP · NO auto-VERIFIED).
 * Never writes VERIFIED · never bumps catalogRevision.
 */

import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import {
  appendKnrCatalogHistory,
  type KnrCatalogDiffFlags,
  type KnrCatalogHistoryEntry,
  type KnrCatalogProposedUpdateBag as KnrCatalogProposedUpdateBagBase,
} from "./knr-catalog-history";
import {
  asNonAuthorityProposedEntry,
  compareKnrCatalogUpdate,
  type KnrCatalogCompareStatus,
} from "./knr-catalog-update-compare";
import {
  casWriteKnrCatalogStore,
  loadKnrCatalogStoreLocal,
  normalizeKnrCatalogEntry,
  normalizeKnrCatalogStore,
  rebuildKnrAliasIndex,
  type KnrCatalogStore,
} from "./knr-catalog-store";
import { buildKnrNormContentHash } from "./knr-content-hash";

export type KnrCatalogProposedUpdateBag = Omit<
  KnrCatalogProposedUpdateBagBase,
  "proposedEntry"
> & {
  proposedEntry: KnrCatalogEntry;
};

export type ApplyKnrProposedUpdateResult =
  | {
      ok: true;
      store: KnrCatalogStore;
      entry: KnrCatalogEntry;
      compareStatus: KnrCatalogCompareStatus;
    }
  | {
      ok: false;
      reason: "ENTRY_NOT_FOUND" | "CAS_MISMATCH" | "DESTRUCTIVE_WRITE";
      messagePl: string;
      store: KnrCatalogStore;
    };

function entryHash(entry: KnrCatalogEntry): string {
  const h = String(entry.contentHash ?? "").trim();
  if (h) return h;
  return buildKnrNormContentHash(entry.norms);
}

function normsSummary(entry: KnrCatalogEntry): string {
  return `R${entry.norms.laborNorms.length}/M${entry.norms.materialNorms.length}/S${entry.norms.equipmentNorms.length}`;
}

export function normalizeKnrCatalogProposedUpdate(
  raw: unknown,
): KnrCatalogProposedUpdateBag | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const proposedAt = typeof row.proposedAt === "string" ? row.proposedAt.trim() : "";
  if (!proposedAt) return null;
  const status = row.compareStatus;
  if (status !== "SAME_HASH" && status !== "DIFF_REVIEW" && status !== "CONFLICT") {
    return null;
  }
  const proposedEntry = normalizeKnrCatalogEntry(row.proposedEntry);
  if (!proposedEntry) return null;
  const safe = asNonAuthorityProposedEntry(proposedEntry);

  return {
    proposedAt,
    proposedBy: typeof row.proposedBy === "string" ? row.proposedBy : undefined,
    actorDisplayName:
      typeof row.actorDisplayName === "string" ? row.actorDisplayName : undefined,
    compareStatus: status,
    proposedEntry: safe,
    currentContentHash:
      typeof row.currentContentHash === "string" ? row.currentContentHash : "",
    proposedContentHash:
      typeof row.proposedContentHash === "string" ? row.proposedContentHash : "",
    diffFlags:
      row.diffFlags && typeof row.diffFlags === "object"
        ? (row.diffFlags as KnrCatalogDiffFlags)
        : {},
    reasonsPl: Array.isArray(row.reasonsPl)
      ? row.reasonsPl.filter((x): x is string => typeof x === "string")
      : [],
  };
}

/**
 * Build offline fixture proposed from current — same family/identity, mild R touch.
 * NEVER changes family to KNR-W.
 */
export function buildOfflineProposedFixtureFromCurrent(
  current: KnrCatalogEntry,
  nowIso: string,
): KnrCatalogEntry {
  const labor = current.norms.laborNorms.map((l, i) =>
    i === 0
      ? { ...l, quantity: Number(l.quantity) + 0.01 }
      : { ...l },
  );
  const nextLabor =
    labor.length > 0
      ? labor
      : [
          {
            kind: "R" as const,
            code: "R-FIX",
            description: "Offline fixture R (non-authoritative)",
            unit: current.unit || "r-g",
            quantity: 0.01,
            sourceRef: null,
          },
        ];
  const norms = {
    ...current.norms,
    laborNorms: nextLabor,
  };
  const contentHash = buildKnrNormContentHash(norms);
  return asNonAuthorityProposedEntry({
    ...current,
    norms,
    contentHash,
    provenance: {
      ...current.provenance,
      contentHash,
      capturedAt: nowIso,
      acquisitionMethod: "MANUAL_OWNER",
      sourceIdentifier:
        current.provenance.sourceIdentifier || "offline-fixture-kl7-p1",
    },
    verificationStatus: "PENDING_VERIFY",
    verifiedAt: null,
    verifiedBy: null,
    updatedAt: nowIso,
    proposedUpdate: null,
    history: undefined,
  });
}

/**
 * Offline-only: attach proposed update + PROPOSED_UPDATE history.
 * Does NOT change verificationStatus / contentHash / catalogRevision of current.
 */
export function applyKnrCatalogProposedUpdateOffline(input: {
  identityKeyV2: string;
  proposed: KnrCatalogEntry;
  nowIso: string;
  actorId?: string;
  actorDisplayName?: string;
  storeOverride?: KnrCatalogStore;
}): ApplyKnrProposedUpdateResult {
  const currentStore = input.storeOverride ?? loadKnrCatalogStoreLocal();
  const existing = currentStore.entries[input.identityKeyV2];
  if (!existing) {
    return {
      ok: false,
      reason: "ENTRY_NOT_FOUND",
      messagePl: "Brak wpisu KNR do aktualizacji.",
      store: currentStore,
    };
  }

  const proposedSafe = asNonAuthorityProposedEntry(input.proposed);
  if (proposedSafe.verificationStatus === "VERIFIED") {
    proposedSafe.verificationStatus = "PENDING_VERIFY";
    proposedSafe.verifiedAt = null;
    proposedSafe.verifiedBy = null;
  }

  const compare = compareKnrCatalogUpdate(existing, proposedSafe);
  const bag: KnrCatalogProposedUpdateBag = {
    proposedAt: input.nowIso,
    proposedBy: input.actorId,
    actorDisplayName: input.actorDisplayName,
    compareStatus: compare.status,
    proposedEntry: proposedSafe,
    currentContentHash: compare.currentContentHash,
    proposedContentHash: compare.proposedContentHash,
    diffFlags: compare.diffFlags,
    reasonsPl: compare.reasonsPl,
  };

  const histEntry: KnrCatalogHistoryEntry = {
    version: existing.catalogRevision ?? 0,
    at: input.nowIso,
    actorId: input.actorId,
    actorDisplayName: input.actorDisplayName,
    kind: "PROPOSED_UPDATE",
    contentHash: compare.proposedContentHash,
    previousContentHash: compare.currentContentHash,
    verificationStatusBefore: existing.verificationStatus,
    verificationStatusAfter: existing.verificationStatus,
    diffFlags: compare.diffFlags,
    sourceRefs: {
      evidenceRefId: proposedSafe.provenance.rawEvidenceRef?.refId,
      sourceIdentifier: proposedSafe.provenance.sourceIdentifier,
    },
    snapshot: {
      unit: proposedSafe.unit,
      normsSummary: normsSummary(proposedSafe),
      identityKeyV2: proposedSafe.identityKeyV2,
    },
  };

  const nextEntry: KnrCatalogEntry = {
    ...existing,
    verificationStatus: existing.verificationStatus,
    contentHash: entryHash(existing),
    catalogRevision: existing.catalogRevision,
    verifiedAt: existing.verifiedAt,
    verifiedBy: existing.verifiedBy,
    lifecycleState: existing.lifecycleState,
    updatedAt: input.nowIso,
    proposedUpdate: bag,
    history: appendKnrCatalogHistory(existing.history, histEntry),
  };

  const entries = { ...currentStore.entries, [nextEntry.identityKeyV2]: nextEntry };
  const nextStore = normalizeKnrCatalogStore(
    {
      ...currentStore,
      entries,
      aliasIndex: rebuildKnrAliasIndex(entries),
      updatedAt: input.nowIso,
    },
    input.nowIso,
  );

  if (input.storeOverride) {
    return {
      ok: true,
      store: nextStore,
      entry: nextEntry,
      compareStatus: compare.status,
    };
  }

  const cas = casWriteKnrCatalogStore({
    expectedEtag: currentStore.etag,
    next: nextStore,
    baselineForGuard: currentStore,
  });
  if (!cas.ok) {
    return {
      ok: false,
      reason: cas.reason === "etag_mismatch" ? "CAS_MISMATCH" : "DESTRUCTIVE_WRITE",
      messagePl: cas.messagePl,
      store: cas.store,
    };
  }
  return {
    ok: true,
    store: cas.store,
    entry: cas.store.entries[input.identityKeyV2] ?? nextEntry,
    compareStatus: compare.status,
  };
}
