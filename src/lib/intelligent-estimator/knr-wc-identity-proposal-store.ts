/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2.1 — local proposal persistence (kw-knr-wc-identity-proposals).
 *
 * Proposal cache keyed by normalizedKey · localStorage adapter · ZERO HTTP · ZERO WC write.
 * REUSE pattern: knr-discovery-evidence-store.ts · knr-catalog-store.ts
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import type {
  KnrWcDuplicateRisk,
  KnrWcEvidenceRef,
  KnrWcIdentityProposal,
  KnrWcIdentityProposalRecord,
  KnrWcIdentityProposalStore,
  KnrWcLineRef,
  KnrWcRecommendation,
  KnrWcSimilarWork,
  KnrWcVerificationState,
} from "./knr-wc-identity-bridge-types";

export const KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY = "kw-knr-wc-identity-proposals" as const;

export const KNR_WC_IDENTITY_PROPOSAL_SCHEMA_VERSION = 1 as const;

export const KNR_WC_IDENTITY_PROPOSAL_DEFAULT_UPDATED_AT = "2026-08-22T00:00:00.000Z";

const VALID_RECOMMENDATIONS: readonly KnrWcRecommendation[] = [
  "REUSE_EXISTING",
  "CREATE_NEW",
  "HOLD",
  "HOLD_UNIT",
  "HOLD_EVIDENCE",
  "REJECT",
];

const VALID_VERIFICATION: readonly KnrWcVerificationState[] = [
  "TENDER_ONLY",
  "PENDING_VERIFY",
  "VERIFIED",
  "DISCOVERY_REQUIRED",
];

const VALID_DUPLICATE: readonly KnrWcDuplicateRisk[] = ["NONE", "POSSIBLE", "HIGH"];

function buildStoreEtag(store: Pick<KnrWcIdentityProposalStore, "entries">): string {
  const keys = Object.keys(store.entries).sort();
  const hashes = keys.map((k) => store.entries[k]?.contentHash ?? "").join("|");
  return fnv1aHex(`${keys.join(",")}|${hashes}`);
}

/** Stable proposal id — shared across tenders · never CatalogWork id. */
export function stableKnrWcProposalId(normalizedKey: string): string {
  return `knr-wc-proposal:${normalizedKey.replace(/\|/g, "/")}`;
}

function fingerprintRecord(record: Omit<KnrWcIdentityProposalRecord, "contentHash" | "updatedAt">): string {
  return fnv1aHex(
    JSON.stringify({
      proposalId: record.proposalId,
      normalizedKey: record.normalizedKey,
      identityKeyV2: record.identityKeyV2,
      displayCode: record.displayCode,
      family: record.family,
      catalogId: record.catalogId,
      tableCode: record.tableCode,
      officialNamePl: record.officialNamePl,
      descriptionPl: record.descriptionPl,
      unitRaw: record.unitRaw,
      proposedUnit: record.proposedUnit,
      verificationState: record.verificationState,
      recommendation: record.recommendation,
      duplicateRisk: record.duplicateRisk,
      specialRiskNotes: record.specialRiskNotes,
      knrEvidenceRefs: record.knrEvidenceRefs,
      similarWorks: record.similarWorks,
      sourceStatus: record.sourceStatus,
      discoveryStatus: record.discoveryStatus,
      unitStatus: record.unitStatus,
    }),
  );
}

function normalizeEvidenceRef(raw: unknown): KnrWcEvidenceRef | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  if (
    kind !== "catalogBasis"
    && kind !== "knrCatalog"
    && kind !== "discoveryEvidence"
    && kind !== "harvest"
    && kind !== "tenderLine"
  ) {
    return null;
  }
  const refId = typeof row.refId === "string" ? row.refId.trim() : "";
  if (!refId) return null;
  return {
    kind,
    refId,
    detail: typeof row.detail === "string" ? row.detail : undefined,
  };
}

function normalizeSimilarWork(raw: unknown): KnrWcSimilarWork | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const workId = typeof row.workId === "string" ? row.workId.trim() : "";
  const namePl = typeof row.namePl === "string" ? row.namePl : "";
  const unit = typeof row.unit === "string" ? row.unit : "";
  const score = Number(row.score);
  if (!workId || !Number.isFinite(score)) return null;
  return {
    workId,
    namePl,
    unit,
    tradeId: typeof row.tradeId === "string" ? row.tradeId : undefined,
    active: row.active === true,
    score,
  };
}

export function normalizeKnrWcIdentityProposalRecord(
  raw: unknown,
  nowIso = KNR_WC_IDENTITY_PROPOSAL_DEFAULT_UPDATED_AT,
): KnrWcIdentityProposalRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const normalizedKey = typeof row.normalizedKey === "string" ? row.normalizedKey.trim() : "";
  if (!normalizedKey) return null;

  const recommendation = VALID_RECOMMENDATIONS.includes(row.recommendation as KnrWcRecommendation)
    ? (row.recommendation as KnrWcRecommendation)
    : "CREATE_NEW";
  const verificationState = VALID_VERIFICATION.includes(row.verificationState as KnrWcVerificationState)
    ? (row.verificationState as KnrWcVerificationState)
    : "DISCOVERY_REQUIRED";
  const duplicateRisk = VALID_DUPLICATE.includes(row.duplicateRisk as KnrWcDuplicateRisk)
    ? (row.duplicateRisk as KnrWcDuplicateRisk)
    : "NONE";

  const refs: KnrWcEvidenceRef[] = [];
  if (Array.isArray(row.knrEvidenceRefs)) {
    for (const ref of row.knrEvidenceRefs) {
      const n = normalizeEvidenceRef(ref);
      if (n) refs.push(n);
    }
  }

  const similarWorks: KnrWcSimilarWork[] = [];
  if (Array.isArray(row.similarWorks)) {
    for (const sw of row.similarWorks) {
      const n = normalizeSimilarWork(sw);
      if (n) similarWorks.push(n);
    }
  }

  const specialRiskNotes = Array.isArray(row.specialRiskNotes)
    ? row.specialRiskNotes.filter((x): x is string => typeof x === "string")
    : [];

  const createdAt = typeof row.createdAt === "string" ? row.createdAt : nowIso;
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : nowIso;

  const base: Omit<KnrWcIdentityProposalRecord, "contentHash"> = {
    schemaVersion: KNR_WC_IDENTITY_PROPOSAL_SCHEMA_VERSION,
    proposalId:
      typeof row.proposalId === "string" && row.proposalId.startsWith("knr-wc-proposal:")
        ? row.proposalId
        : stableKnrWcProposalId(normalizedKey),
    normalizedKey,
    identityKeyV2: typeof row.identityKeyV2 === "string" ? row.identityKeyV2 : "",
    displayCode: typeof row.displayCode === "string" ? row.displayCode : normalizedKey,
    family: typeof row.family === "string" ? row.family : "",
    catalogId: typeof row.catalogId === "string" ? row.catalogId : row.catalogId === null ? null : null,
    tableCode: typeof row.tableCode === "string" ? row.tableCode : "",
    officialNamePl: typeof row.officialNamePl === "string" ? row.officialNamePl : null,
    descriptionPl: typeof row.descriptionPl === "string" ? row.descriptionPl : null,
    unitRaw: typeof row.unitRaw === "string" ? row.unitRaw : "UNKNOWN",
    proposedUnit: typeof row.proposedUnit === "string" ? row.proposedUnit : null,
    proposedTradeId: typeof row.proposedTradeId === "string" ? row.proposedTradeId : null,
    proposedWorkId:
      typeof row.proposedWorkId === "string" && row.proposedWorkId.startsWith("proposal:")
        ? row.proposedWorkId
        : `proposal:${normalizedKey.replace(/\|/g, "/")}`,
    verificationState,
    recommendation,
    duplicateRisk,
    specialRiskNotes,
    knrEvidenceRefs: refs,
    similarWorks,
    sourceStatus:
      row.sourceStatus === "LOCAL_CATALOG"
      || row.sourceStatus === "DISCOVERY_EVIDENCE"
      || row.sourceStatus === "HARVEST"
      || row.sourceStatus === "TENDER"
      || row.sourceStatus === "NONE"
        ? row.sourceStatus
        : "NONE",
    discoveryStatus:
      row.discoveryStatus === "NOT_NEEDED"
      || row.discoveryStatus === "LOCAL_HIT"
      || row.discoveryStatus === "EVIDENCE_HIT"
      || row.discoveryStatus === "DISCOVERY_REQUIRED"
        ? row.discoveryStatus
        : "DISCOVERY_REQUIRED",
    unitStatus:
      row.unitStatus === "OK" || row.unitStatus === "HOLD_UNIT" || row.unitStatus === "UNKNOWN"
        ? row.unitStatus
        : "UNKNOWN",
    createdAt,
    updatedAt,
  };

  return {
    ...base,
    contentHash: fingerprintRecord(base),
  };
}

export function emptyKnrWcIdentityProposalStore(
  updatedAtIso = KNR_WC_IDENTITY_PROPOSAL_DEFAULT_UPDATED_AT,
): KnrWcIdentityProposalStore {
  const store: KnrWcIdentityProposalStore = {
    schemaVersion: KNR_WC_IDENTITY_PROPOSAL_SCHEMA_VERSION,
    updatedAt: updatedAtIso,
    etag: "",
    entries: {},
  };
  store.etag = buildStoreEtag(store);
  return store;
}

export function normalizeKnrWcIdentityProposalStore(
  raw: unknown,
  updatedAtIso = KNR_WC_IDENTITY_PROPOSAL_DEFAULT_UPDATED_AT,
): KnrWcIdentityProposalStore {
  if (!raw || typeof raw !== "object") return emptyKnrWcIdentityProposalStore(updatedAtIso);
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== KNR_WC_IDENTITY_PROPOSAL_SCHEMA_VERSION) {
    return emptyKnrWcIdentityProposalStore(updatedAtIso);
  }
  const entries: Record<string, KnrWcIdentityProposalRecord> = {};
  if (row.entries && typeof row.entries === "object") {
    for (const [key, val] of Object.entries(row.entries as Record<string, unknown>)) {
      const rec = normalizeKnrWcIdentityProposalRecord(val, updatedAtIso);
      if (rec) entries[key.trim() || rec.normalizedKey] = rec;
    }
  }
  const store: KnrWcIdentityProposalStore = {
    schemaVersion: KNR_WC_IDENTITY_PROPOSAL_SCHEMA_VERSION,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : updatedAtIso,
    etag: typeof row.etag === "string" ? row.etag : "",
    entries,
  };
  store.etag = buildStoreEtag(store);
  return store;
}

export function loadKnrWcIdentityProposalStoreLocal(): KnrWcIdentityProposalStore {
  try {
    if (typeof localStorage === "undefined") return emptyKnrWcIdentityProposalStore();
    const raw = localStorage.getItem(KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY);
    if (!raw) return emptyKnrWcIdentityProposalStore();
    return normalizeKnrWcIdentityProposalStore(JSON.parse(raw));
  } catch {
    return emptyKnrWcIdentityProposalStore();
  }
}

export function saveKnrWcIdentityProposalStoreLocal(
  store: KnrWcIdentityProposalStore,
  updatedAtIso?: string,
): KnrWcIdentityProposalStore {
  const next = normalizeKnrWcIdentityProposalStore(
    {
      ...store,
      updatedAt: updatedAtIso ?? store.updatedAt,
    },
    updatedAtIso ?? store.updatedAt,
  );
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY, JSON.stringify(next));
    return loadKnrWcIdentityProposalStoreLocal();
  }
  return next;
}

export function clearKnrWcIdentityProposalStoreLocalForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KNR_WC_IDENTITY_PROPOSAL_STORAGE_KEY);
}

export function proposalToPersistedRecord(
  proposal: KnrWcIdentityProposal,
  nowIso: string,
): KnrWcIdentityProposalRecord {
  const base: Omit<KnrWcIdentityProposalRecord, "contentHash"> = {
    schemaVersion: KNR_WC_IDENTITY_PROPOSAL_SCHEMA_VERSION,
    proposalId: stableKnrWcProposalId(proposal.normalizedKey),
    normalizedKey: proposal.normalizedKey,
    identityKeyV2: proposal.identityKeyV2,
    displayCode: proposal.displayCode,
    family: proposal.family,
    catalogId: proposal.catalogId,
    tableCode: proposal.tableCode,
    officialNamePl: proposal.officialNamePl,
    descriptionPl: proposal.descriptionPl,
    unitRaw: proposal.unitRaw,
    proposedUnit: proposal.proposedUnit,
    proposedTradeId: proposal.proposedTradeId,
    proposedWorkId: proposal.proposedWorkId,
    verificationState: proposal.verificationState,
    recommendation: proposal.recommendation,
    duplicateRisk: proposal.duplicateRisk,
    specialRiskNotes: [...proposal.specialRiskNotes],
    knrEvidenceRefs: [...proposal.knrEvidenceRefs],
    similarWorks: [...proposal.similarWorks],
    sourceStatus: proposal.sourceStatus,
    discoveryStatus: proposal.discoveryStatus,
    unitStatus: proposal.unitStatus,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { ...base, contentHash: fingerprintRecord(base) };
}

export function recordToProposalForTender(
  record: KnrWcIdentityProposalRecord,
  tenderId: string,
  lineRefs: readonly KnrWcLineRef[] = [],
): KnrWcIdentityProposal {
  return {
    proposalId: record.proposalId,
    tenderId,
    normalizedKey: record.normalizedKey,
    identityKeyV2: record.identityKeyV2,
    displayCode: record.displayCode,
    family: record.family,
    catalogId: record.catalogId,
    tableCode: record.tableCode,
    officialNamePl: record.officialNamePl,
    descriptionPl: record.descriptionPl,
    unitRaw: record.unitRaw,
    proposedUnit: record.proposedUnit,
    proposedTradeId: record.proposedTradeId,
    proposedWorkId: record.proposedWorkId,
    knrEvidenceRefs: [...record.knrEvidenceRefs],
    verificationState: record.verificationState,
    similarWorks: [...record.similarWorks],
    duplicateRisk: record.duplicateRisk,
    recommendation: record.recommendation,
    ownerDecision: "unset",
    sourceStatus: record.sourceStatus,
    discoveryStatus: record.discoveryStatus,
    unitStatus: record.unitStatus,
    lineRefs: [...lineRefs],
    specialRiskNotes: [...record.specialRiskNotes],
  };
}

export function upsertKnrWcIdentityProposalRecord(
  store: KnrWcIdentityProposalStore,
  record: KnrWcIdentityProposalRecord,
  nowIso: string,
): KnrWcIdentityProposalStore {
  const existing = store.entries[record.normalizedKey];
  const nextRecord: KnrWcIdentityProposalRecord = {
    ...record,
    createdAt: existing?.createdAt ?? record.createdAt,
    updatedAt: nowIso,
    contentHash: fingerprintRecord({ ...record, createdAt: existing?.createdAt ?? record.createdAt }),
  };
  store.entries[record.normalizedKey] = nextRecord;
  store.updatedAt = nowIso;
  store.etag = buildStoreEtag(store);
  return store;
}
