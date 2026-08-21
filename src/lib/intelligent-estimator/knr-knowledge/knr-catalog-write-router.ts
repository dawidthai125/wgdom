/**
 * IK-KNR KL-1 — VERIFIED-only write boundary.
 * KL-7-P1: optional allowAuthoritySupersede ONLY from KL-6 orchestrator.
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
import {
  appendKnrCatalogHistory,
  type KnrCatalogHistoryEntry,
} from "./knr-catalog-history";

export type KnrCatalogPersistOutcome = "CREATED" | "NOOP" | "SUPERSEDED";

export type KnrCatalogPersistResult =
  | { ok: true; outcome: KnrCatalogPersistOutcome; store: KnrCatalogStore }
  | {
      ok: false;
      reason:
        | "NOT_VERIFIED"
        | "VALIDATION_FAILED"
        | "CONTENT_CONFLICT"
        | "DESTRUCTIVE_WRITE"
        | "CAS_MISMATCH"
        | "FAMILY_CONFLICT";
      messagePl: string;
      store: KnrCatalogStore;
    };

export type PersistVerifiedKnrCatalogEntryInput = {
  entry: KnrCatalogEntry;
  nowIso: string;
  expectedEtag?: string;
  /** In-memory store for tests — skips localStorage when set. */
  storeOverride?: KnrCatalogStore;
  /**
   * KL-7-P1 — ONLY set by KL-6 Owner VERIFY orchestrator.
   * Allows VERIFIED→VERIFIED contentHash change with revision bump + history.
   * Update UI MUST NEVER set this flag.
   */
  allowAuthoritySupersede?: boolean;
  actorId?: string;
  actorDisplayName?: string;
};

function fold(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normsSummary(entry: KnrCatalogEntry): string {
  return `R${entry.norms.laborNorms.length}/M${entry.norms.materialNorms.length}/S${entry.norms.equipmentNorms.length}`;
}

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
 * Same identityKeyV2 + diff contentHash → CONTENT_CONFLICT
 *   unless allowAuthoritySupersede (KL-6 only) → SUPERSEDED + revision++.
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

  let outcome: KnrCatalogPersistOutcome = "CREATED";
  let nextEntry: KnrCatalogEntry = { ...entry, contentHash };

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
      // Upgrade non-verified → VERIFIED same hash: first revision + history.
      const revision = existing.catalogRevision && existing.catalogRevision > 0
        ? existing.catalogRevision
        : 1;
      const hist: KnrCatalogHistoryEntry = {
        version: revision,
        at: nowIso,
        actorId: input.actorId ?? entry.verifiedBy ?? undefined,
        actorDisplayName: input.actorDisplayName,
        kind: "VERIFY_APPROVE",
        contentHash,
        previousContentHash: existingHash,
        verificationStatusBefore: existing.verificationStatus,
        verificationStatusAfter: "VERIFIED",
        diffFlags: { verification: true },
        sourceRefs: {
          evidenceRefId: entry.provenance.rawEvidenceRef?.refId,
          sourceIdentifier: entry.provenance.sourceIdentifier,
        },
        snapshot: {
          unit: entry.unit,
          normsSummary: normsSummary(entry),
          identityKeyV2: entry.identityKeyV2,
        },
      };
      nextEntry = {
        ...entry,
        contentHash,
        catalogRevision: revision,
        proposedUpdate: null,
        history: appendKnrCatalogHistory(existing.history, hist),
        createdAt: existing.createdAt || entry.createdAt,
      };
      outcome = "CREATED";
    } else if (input.allowAuthoritySupersede === true) {
      const curFam = fold(existing.identity.family);
      const nextFam = fold(entry.identity.family);
      if (curFam && nextFam && curFam !== nextFam) {
        return {
          ok: false,
          reason: "FAMILY_CONFLICT",
          messagePl: `Zakaz family rewrite: ${existing.identity.family} ≠ ${entry.identity.family}.`,
          store: current,
        };
      }
      const prevRev =
        existing.catalogRevision && existing.catalogRevision > 0
          ? existing.catalogRevision
          : 1;
      const revision = prevRev + 1;
      const histSupersede: KnrCatalogHistoryEntry = {
        version: revision,
        at: nowIso,
        actorId: input.actorId ?? entry.verifiedBy ?? undefined,
        actorDisplayName: input.actorDisplayName,
        kind: "SUPERSEDE",
        contentHash,
        previousContentHash: existingHash,
        verificationStatusBefore: existing.verificationStatus,
        verificationStatusAfter: "VERIFIED",
        diffFlags: { verification: true },
        sourceRefs: {
          evidenceRefId: entry.provenance.rawEvidenceRef?.refId,
          sourceIdentifier: entry.provenance.sourceIdentifier,
        },
        snapshot: {
          unit: entry.unit,
          normsSummary: normsSummary(entry),
          identityKeyV2: entry.identityKeyV2,
        },
      };
      const histApprove: KnrCatalogHistoryEntry = {
        ...histSupersede,
        kind: "VERIFY_APPROVE",
      };
      nextEntry = {
        ...entry,
        contentHash,
        catalogRevision: revision,
        proposedUpdate: null,
        history: appendKnrCatalogHistory(
          appendKnrCatalogHistory(existing.history, histSupersede),
          histApprove,
        ),
        createdAt: existing.createdAt || entry.createdAt,
      };
      outcome = "SUPERSEDED";
    } else {
      return {
        ok: false,
        reason: "CONTENT_CONFLICT",
        messagePl: "Ten sam identityKeyV2 z innym contentHash — brak nadpisania.",
        store: current,
      };
    }
  } else {
    // Fresh VERIFIED create
    const revision = 1;
    const hist: KnrCatalogHistoryEntry = {
      version: revision,
      at: nowIso,
      actorId: input.actorId ?? entry.verifiedBy ?? undefined,
      actorDisplayName: input.actorDisplayName,
      kind: "VERIFY_APPROVE",
      contentHash,
      previousContentHash: null,
      verificationStatusBefore: null,
      verificationStatusAfter: "VERIFIED",
      diffFlags: { verification: true },
      sourceRefs: {
        evidenceRefId: entry.provenance.rawEvidenceRef?.refId,
        sourceIdentifier: entry.provenance.sourceIdentifier,
      },
      snapshot: {
        unit: entry.unit,
        normsSummary: normsSummary(entry),
        identityKeyV2: entry.identityKeyV2,
      },
    };
    nextEntry = {
      ...entry,
      contentHash,
      catalogRevision: revision,
      proposedUpdate: null,
      history: appendKnrCatalogHistory(entry.history, hist),
    };
    outcome = "CREATED";
  }

  const nextStore = applyEntryToStore(current, nextEntry, nowIso);

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
    return { ok: true, outcome, store: nextStore };
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
  return { ok: true, outcome, store: cas.store };
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
