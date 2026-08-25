/**
 * IK-KNR Phase 2 — stage FULL discovery FACT as PENDING_VERIFY (never VERIFIED).
 * REUSE catalog store normalize pattern from KL-5 ingest (no write-router VERIFIED path).
 */

import { buildKnrNormContentHash } from "./knr-content-hash";
import {
  createKnrCatalogEntrySkeleton,
  type KnrCatalogEntry,
} from "./knr-catalog-entry-types";
import {
  normalizeKnrCatalogStore,
  rebuildKnrAliasIndex,
  type KnrCatalogStore,
} from "./knr-catalog-store";
import type { KnrDiscoveryFactCandidate } from "./knr-discovery-fact-extract";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import { foldIdentityKeyV2, parseIdentityPartialFromCatalogBasis } from "./knr-identity-v2";
import type { CatalogBasis } from "@/lib/tenders-bzp-swz";

export type StageDiscoveryFactToPendingResult =
  | {
      ok: true;
      outcome: "STAGED_PENDING" | "NOOP_EXISTING" | "SKIP_PARTIAL";
      store: KnrCatalogStore;
      entry: KnrCatalogEntry | null;
    }
  | { ok: false; reason: string; store: KnrCatalogStore };

function stagePendingEntry(
  store: KnrCatalogStore,
  entry: KnrCatalogEntry,
  nowIso: string,
): KnrCatalogStore {
  if (entry.verificationStatus === "VERIFIED") {
    throw new Error("Discovery stage forbids VERIFIED — KL-6 only.");
  }
  const nextEntry: KnrCatalogEntry = { ...entry, updatedAt: nowIso };
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
 * Write PENDING_VERIFY candidate from FULL discovery FACT only.
 * PARTIAL → skip (evidence remains; no fabricated description/unit).
 */
export function stageDiscoveryFactToPendingCatalog(input: {
  fact: KnrDiscoveryFactCandidate;
  identityKeyV2: string;
  evidenceKeyV1: string;
  identity: KnrIdentityV2Partial;
  displayCode: string;
  nowIso: string;
  catalogStore: KnrCatalogStore;
  originId?: string | null;
  sourceIdentifier?: string | null;
}): StageDiscoveryFactToPendingResult {
  const { fact, catalogStore, nowIso } = input;

  if (fact.extractionStatus !== "FULL" || !fact.description || !fact.unit) {
    return {
      ok: true,
      outcome: "SKIP_PARTIAL",
      store: catalogStore,
      entry: null,
    };
  }

  const existing = catalogStore.entries[input.identityKeyV2];
  if (existing?.verificationStatus === "VERIFIED") {
    return {
      ok: true,
      outcome: "NOOP_EXISTING",
      store: catalogStore,
      entry: existing,
    };
  }
  if (existing?.verificationStatus === "PENDING_VERIFY") {
    return {
      ok: true,
      outcome: "NOOP_EXISTING",
      store: catalogStore,
      entry: existing,
    };
  }

  const skeleton = createKnrCatalogEntrySkeleton(
    {
      identityKeyV2: input.identityKeyV2,
      evidenceKeyV1: input.evidenceKeyV1,
      identity: input.identity,
      originalSourceCode: input.displayCode,
      displayCode: input.displayCode,
    },
    nowIso,
  );

  const norms = {
    laborNorms: [] as KnrCatalogEntry["norms"]["laborNorms"],
    materialNorms: [] as KnrCatalogEntry["norms"]["materialNorms"],
    equipmentNorms: [] as KnrCatalogEntry["norms"]["equipmentNorms"],
  };
  const contentHash = buildKnrNormContentHash(norms);

  const entry: KnrCatalogEntry = {
    ...skeleton,
    description: fact.description,
    unit: fact.unit,
    norms,
    contentHash,
    verificationStatus: "PENDING_VERIFY",
    validationState: "INCOMPLETE",
    lifecycleState: "ACTIVE",
    emptyNormsWithEvidence: true,
    provenance: {
      ...skeleton.provenance,
      sourceType: "AUTHORIZED_FETCH",
      sourceIdentifier: input.sourceIdentifier ?? fact.sourceId ?? "discovery",
      acquisitionMethod: "AUTHORIZED_FETCH",
      contentHash,
      originId: input.originId ?? "knr_official_public_document",
      parserVersion: "KL-P2-discovery-fact",
      rawEvidenceRef: {
        refId: fact.evidenceRef,
        kind: "inline_stub",
        sourceFilename: null,
        sourceRow: null,
      },
    },
    verifiedAt: null,
    verifiedBy: null,
  };

  // Hard deny spoof
  if (entry.verificationStatus === "VERIFIED") {
    return { ok: false, reason: "VERIFIED_SPOOF", store: catalogStore };
  }

  return {
    ok: true,
    outcome: "STAGED_PENDING",
    store: stagePendingEntry(catalogStore, entry, nowIso),
    entry,
  };
}

/** Helper: identity from CatalogBasis for staging. */
export function identityBundleFromCatalogBasis(basis: CatalogBasis): {
  identityKeyV2: string;
  evidenceKeyV1: string;
  identity: KnrIdentityV2Partial;
  displayCode: string;
} {
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 =
    String(basis.normalizedKey ?? "").trim() || partial.evidenceKeyV1;
  return {
    identityKeyV2,
    evidenceKeyV1,
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      column: partial.column,
      item: partial.item,
      chapter: partial.chapter,
    },
    displayCode: String(basis.rawCode ?? basis.normalizedKey ?? evidenceKeyV1),
  };
}

export const KNR_DISCOVERY_CATALOG_STAGE_P2_IMPLEMENTED = true as const;
