/**
 * GLOBAL-KNOWLEDGE-E1B — commitControlledImport (public mutation).
 * AR-C1: Legal Gate FIRST — przed Normalizer / Identity / Collision / Persist.
 * AR-C2: jedyna ścieżka importu nowych entries.
 * AR-C3: flag OFF ⇒ store + LS unchanged.
 */

import {
  buildCanonicalGlobalId,
  buildGlobalContentHash,
  canonicalizeNormCode,
} from "./canonical-id";
import { applyCollisionPolicy, findEntryByGlobalId } from "./collision";
import { mayPersistGlobalKnowledgeE1b } from "./flag";
import { normalizeAliasList } from "./identity-ops";
import { evaluateLegalGate, type LegalGateRejectCode } from "./legal-gate";
import {
  validateLifecycleFields,
  type LifecycleValidationCode,
} from "./lifecycle";
import {
  bumpContentVersion,
  persistGlobalKnowledgeStoreLocal,
} from "./store";
import type {
  GlobalKnowledgeAllowedUse,
  GlobalKnowledgeConfidence,
  GlobalKnowledgeEntry,
  GlobalKnowledgeImportBatchMeta,
  GlobalKnowledgeImportCandidate,
  GlobalKnowledgeLifecycle,
  GlobalKnowledgeStore,
} from "./types";

export type CommitRejectCode =
  | LegalGateRejectCode
  | LifecycleValidationCode
  | "MISSING_NAME"
  | "MISSING_KIND"
  | "MISSING_IMPORTED_BY"
  | "INDICATIVE_RATE_NOT_IN_E1A"
  | "ENTRY_HAS_PRICE_FIELD"
  | "COLLISION_DIVERGENT_HASH"
  | "FLAG_OFF"
  | "EMPTY_BATCH";

export interface CommitCandidateResult {
  index: number;
  ok: boolean;
  codes: CommitRejectCode[];
  action?: "insert" | "noop" | "reject";
  globalId?: string;
}

export interface CommitControlledImportResult {
  ok: boolean;
  /** true tylko gdy zapisano zmiany do store/LS. */
  persisted: boolean;
  store: GlobalKnowledgeStore;
  codes: CommitRejectCode[];
  results: CommitCandidateResult[];
  inserted: number;
  noop: number;
  rejected: number;
}

const KINDS = new Set(["norm", "technology", "material", "pack_ref", "other"]);

function rejectPriceFields(candidate: GlobalKnowledgeImportCandidate): boolean {
  const rawAny = candidate as unknown as Record<string, unknown>;
  return (
    rawAny != null &&
    (rawAny.unitPricePln != null ||
      rawAny.pricePln != null ||
      rawAny.indicativeRatePln != null ||
      rawAny.marketQuotes != null)
  );
}

/**
 * Kontrolowany import Identity.
 * Kolejność per candidate (FROZEN): Legal → (price/envelope) → Normalizer → Identity → Collision.
 * Persist tylko gdy flag ON (lub forcePersistForTests).
 */
export function commitControlledImport(
  store: GlobalKnowledgeStore,
  candidates: readonly GlobalKnowledgeImportCandidate[],
  batchMeta: GlobalKnowledgeImportBatchMeta,
): CommitControlledImportResult {
  const nowIso = batchMeta.nowIso ?? new Date().toISOString();
  const results: CommitCandidateResult[] = [];
  const codes: CommitRejectCode[] = [];

  if (!candidates.length) {
    return {
      ok: false,
      persisted: false,
      store,
      codes: ["EMPTY_BATCH"],
      results: [],
      inserted: 0,
      noop: 0,
      rejected: 0,
    };
  }

  if (!mayPersistGlobalKnowledgeE1b(batchMeta.forcePersistForTests)) {
    return {
      ok: false,
      persisted: false,
      store,
      codes: ["FLAG_OFF"],
      results: [],
      inserted: 0,
      noop: 0,
      rejected: 0,
    };
  }

  let workingEntries = [...store.entries];
  let inserted = 0;
  let noop = 0;
  let rejected = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    const entryCodes: CommitRejectCode[] = [];

    // ── AR-C1: Legal Gate FIRST ──────────────────────────────────────────
    const allowedUseRaw = candidate.provenance?.allowedUse ?? [];
    const legal = evaluateLegalGate(
      {
        licenceId: candidate.provenance?.licenceId ?? "",
        originId: candidate.provenance?.originId ?? "",
        allowedUse: allowedUseRaw.filter((u) => u !== "indicative_rate") as GlobalKnowledgeAllowedUse[],
        nowIso,
      },
      store.licences,
    );
    if (!legal.ok) {
      entryCodes.push(...legal.codes);
      rejected += 1;
      results.push({ index, ok: false, codes: entryCodes, action: "reject" });
      continue;
    }

    // Envelope / anti-price (po Legal, przed Normalizer)
    if (!candidate?.namePl?.trim()) entryCodes.push("MISSING_NAME");
    if (!KINDS.has(candidate?.kind)) entryCodes.push("MISSING_KIND");
    const importedBy =
      candidate.provenance?.importedBy?.trim() || batchMeta.importedBy?.trim() || "";
    if (!importedBy) entryCodes.push("MISSING_IMPORTED_BY");
    if (rejectPriceFields(candidate)) entryCodes.push("ENTRY_HAS_PRICE_FIELD");
    if (allowedUseRaw.includes("indicative_rate")) {
      entryCodes.push("INDICATIVE_RATE_NOT_IN_E1A");
    }

    if (entryCodes.length) {
      rejected += 1;
      results.push({ index, ok: false, codes: entryCodes, action: "reject" });
      continue;
    }

    // ── Normalizer ───────────────────────────────────────────────────────
    const namePl = candidate.namePl.trim();
    const unit = candidate.unit ?? null;
    const normCode = canonicalizeNormCode(candidate.normCode ?? null);
    const aliases = normalizeAliasList(candidate.aliases ?? []);
    const revision = candidate.revision?.trim() || "1";
    const lifecycle: GlobalKnowledgeLifecycle = candidate.lifecycle ?? "ACTIVE";
    const confidence: GlobalKnowledgeConfidence = candidate.confidence ?? "medium";

    const life = validateLifecycleFields({
      lifecycle,
      supersededBy: candidate.supersededBy,
    });
    if (!life.ok) {
      entryCodes.push(...life.codes);
      rejected += 1;
      results.push({ index, ok: false, codes: entryCodes, action: "reject" });
      continue;
    }

    // ── Identity ─────────────────────────────────────────────────────────
    const contentHash = buildGlobalContentHash({
      kind: candidate.kind,
      namePl,
      unit,
      normCode,
      revision,
    });
    const globalId = buildCanonicalGlobalId({
      kind: candidate.kind,
      namePl,
      unit,
      normCode,
      revision,
    });

    const entry: GlobalKnowledgeEntry = {
      globalId,
      kind: candidate.kind,
      namePl,
      unit,
      normCode,
      aliases,
      lifecycle,
      supersededBy: candidate.supersededBy ?? null,
      confidence,
      revision,
      validFrom: candidate.validFrom ?? nowIso,
      validTo: candidate.validTo ?? null,
      provenance: {
        originId: candidate.provenance.originId,
        licenceId: candidate.provenance.licenceId,
        sourceFilename:
          candidate.provenance.sourceFilename ?? batchMeta.sourceFilename ?? null,
        importedAt: candidate.provenance.importedAt ?? nowIso,
        importedBy,
        contentHash,
        allowedUse: allowedUseRaw.filter((u) => u !== "indicative_rate"),
      },
    };

    const life2 = validateLifecycleFields({
      lifecycle: entry.lifecycle,
      supersededBy: entry.supersededBy,
      globalId: entry.globalId,
    });
    if (!life2.ok) {
      entryCodes.push(...life2.codes);
      rejected += 1;
      results.push({ index, ok: false, codes: entryCodes, action: "reject" });
      continue;
    }

    // ── Collision Variant A ──────────────────────────────────────────────
    const existing = findEntryByGlobalId(workingEntries, entry.globalId);
    const collision = applyCollisionPolicy(existing, entry);
    if (collision.action === "reject") {
      entryCodes.push(collision.code ?? "COLLISION_DIVERGENT_HASH");
      rejected += 1;
      results.push({
        index,
        ok: false,
        codes: entryCodes,
        action: "reject",
        globalId: entry.globalId,
      });
      continue;
    }
    if (collision.action === "noop") {
      noop += 1;
      results.push({
        index,
        ok: true,
        codes: [],
        action: "noop",
        globalId: entry.globalId,
      });
      continue;
    }

    workingEntries = [...workingEntries, entry];
    inserted += 1;
    results.push({
      index,
      ok: true,
      codes: [],
      action: "insert",
      globalId: entry.globalId,
    });
  }

  if (inserted === 0) {
    return {
      ok: rejected === 0,
      persisted: false,
      store,
      codes,
      results,
      inserted,
      noop,
      rejected,
    };
  }

  const nextStore: GlobalKnowledgeStore = {
    ...store,
    schemaVersion: store.schemaVersion,
    contentVersion: bumpContentVersion(store.contentVersion, nowIso),
    entries: workingEntries,
    updatedAt: nowIso,
  };

  persistGlobalKnowledgeStoreLocal(nextStore);

  return {
    ok: rejected === 0,
    persisted: true,
    store: nextStore,
    codes,
    results,
    inserted,
    noop,
    rejected,
  };
}
