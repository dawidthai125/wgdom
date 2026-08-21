/**
 * KL-7-P2A — Discovery evidence local store (kw-knr-discovery-evidence).
 * Memory only · ZERO HTTP · ZERO VERIFIED · ZERO PLN.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import {
  KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION,
  KNR_DISCOVERY_EVIDENCE_STORAGE_KEY,
  KNR_DISCOVERY_OPS_FRESHNESS_DAYS,
  KNR_DISCOVERY_PRICING_FIELD_DENY,
  type KnrDiscoveryEvidenceRecord,
  type KnrDiscoveryEvidenceStore,
  type KnrDiscoveryNormBundle,
  type KnrDiscoveryNormLine,
  type KnrDiscoveryOpsFreshness,
  type KnrDiscoverySourcePriority,
  type KnrDiscoverySourceRef,
  type KnrDiscoveryStatus,
} from "./knr-discovery-evidence-types";

export const KNR_DISCOVERY_DEFAULT_UPDATED_AT = "2026-08-22T00:00:00.000Z";

export type KnrDiscoveryCasResult =
  | { ok: true; store: KnrDiscoveryEvidenceStore }
  | {
      ok: false;
      reason: "etag_mismatch" | "empty_destructive";
      store: KnrDiscoveryEvidenceStore;
      messagePl: string;
    };

const VALID_STATUS: readonly KnrDiscoveryStatus[] = [
  "DISCOVERED",
  "CORROBORATED",
  "CONFLICT",
  "INCOMPLETE",
  "READY_FOR_OWNER_VERIFY",
];

const VALID_PRIORITY: readonly KnrDiscoverySourcePriority[] = [
  "GOVERNMENT",
  "OFFICIAL_PUBLIC_DOCUMENT",
  "UNIVERSITY",
  "PUBLIC_TENDER",
  "INDUSTRY",
  "OTHER",
];

function denyPricingKeys(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    if (KNR_DISCOVERY_PRICING_FIELD_DENY.has(key)) return true;
  }
  return false;
}

function buildStoreEtag(store: Pick<KnrDiscoveryEvidenceStore, "entries">): string {
  const keys = Object.keys(store.entries).sort();
  const hashes = keys.map((k) => store.entries[k]?.contentHash ?? "").join("|");
  return fnv1aHex(`${keys.join(",")}|${hashes}`);
}

export function computeKnrDiscoveryOpsFreshness(
  lastFetchedAtIso: string | null | undefined,
  updatedAtIso: string,
  nowMs: number,
  windowDays = KNR_DISCOVERY_OPS_FRESHNESS_DAYS,
): KnrDiscoveryOpsFreshness {
  const stamp = lastFetchedAtIso?.trim() || updatedAtIso;
  const t = Date.parse(stamp);
  if (!Number.isFinite(t)) return "STALE";
  const ageMs = nowMs - t;
  if (ageMs < 0) return "FRESH";
  return ageMs <= windowDays * 24 * 60 * 60 * 1000 ? "FRESH" : "STALE";
}

function normalizeNormLine(raw: unknown): KnrDiscoveryNormLine | null {
  if (!raw || typeof raw !== "object") return null;
  const line = raw as Record<string, unknown>;
  if (denyPricingKeys(line)) return null;
  const kind = line.kind === "R" || line.kind === "M" || line.kind === "S" ? line.kind : null;
  const code = typeof line.code === "string" ? line.code.trim() : "";
  const description = typeof line.description === "string" ? line.description.trim() : "";
  const unit = typeof line.unit === "string" ? line.unit.trim() : "";
  const quantity = Number(line.quantity);
  if (!kind || !code || !description || !unit || !Number.isFinite(quantity)) return null;
  return {
    kind,
    code,
    description,
    unit,
    quantity,
    sourceRef: typeof line.sourceRef === "string" ? line.sourceRef : line.sourceRef ?? null,
  };
}

function normalizeNorms(raw: unknown): KnrDiscoveryNormBundle {
  if (!raw || typeof raw !== "object") {
    return { laborNorms: [], materialNorms: [], equipmentNorms: [] };
  }
  const o = raw as Record<string, unknown>;
  const map = (arr: unknown): KnrDiscoveryNormLine[] => {
    if (!Array.isArray(arr)) return [];
    const out: KnrDiscoveryNormLine[] = [];
    for (const row of arr) {
      const n = normalizeNormLine(row);
      if (n) out.push(n);
    }
    return out;
  };
  return {
    laborNorms: map(o.laborNorms),
    materialNorms: map(o.materialNorms),
    equipmentNorms: map(o.equipmentNorms),
  };
}

function normalizeSource(raw: unknown): KnrDiscoverySourceRef | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (denyPricingKeys(s)) return null;
  const sourceId = typeof s.sourceId === "string" ? s.sourceId.trim() : "";
  const urlHash = typeof s.urlHash === "string" ? s.urlHash.trim() : "";
  const contentHash = typeof s.contentHash === "string" ? s.contentHash.trim() : "";
  const fetchedAt = typeof s.fetchedAt === "string" ? s.fetchedAt.trim() : "";
  if (!sourceId || !urlHash || !contentHash || !fetchedAt) return null;
  const priority =
    typeof s.priority === "string" && (VALID_PRIORITY as readonly string[]).includes(s.priority)
      ? (s.priority as KnrDiscoverySourcePriority)
      : "OTHER";
  return {
    sourceId,
    urlHash,
    title: typeof s.title === "string" ? s.title : undefined,
    publisher: typeof s.publisher === "string" ? s.publisher : undefined,
    edition: typeof s.edition === "string" ? s.edition : undefined,
    fragment: typeof s.fragment === "string" ? s.fragment : undefined,
    contentHash,
    fetchedAt,
    priority,
  };
}

/**
 * Offline fixture status rule (OD-KNR-P2-CORROB-1):
 * ≥2 sources → may be CORROBORATED / READY_FOR_OWNER_VERIFY
 * 1 non-GOV → never READY_FOR_OWNER_VERIFY
 * 1 GOVERNMENT alone → not READY unless caller already set READY with explicit OD (we reject auto)
 */
export function clampDiscoveryStatusForSources(
  status: KnrDiscoveryStatus,
  sources: readonly KnrDiscoverySourceRef[],
): KnrDiscoveryStatus {
  if (status === "CONFLICT" || status === "INCOMPLETE") return status;
  if (sources.length >= 2) {
    if (status === "READY_FOR_OWNER_VERIFY" || status === "CORROBORATED") return status;
    return status === "DISCOVERED" ? "DISCOVERED" : status;
  }
  if (sources.length === 1) {
    if (status === "READY_FOR_OWNER_VERIFY") {
      // Single GOVERNMENT READY only via explicit OD — P2A rejects auto; keep CORROBORATED/DISCOVERED.
      return sources[0]!.priority === "GOVERNMENT" ? "DISCOVERED" : "DISCOVERED";
    }
    if (status === "CORROBORATED") return "DISCOVERED";
  }
  if (sources.length === 0 && status === "READY_FOR_OWNER_VERIFY") return "INCOMPLETE";
  return status;
}

export function normalizeKnrDiscoveryEvidenceRecord(
  raw: unknown,
  nowMs = Date.parse(KNR_DISCOVERY_DEFAULT_UPDATED_AT),
): KnrDiscoveryEvidenceRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (denyPricingKeys(row)) return null;
  if (row.schemaVersion !== KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION) return null;
  // Reject authority spoof fields if present as VERIFIED-like
  if (row.verificationStatus === "VERIFIED") return null;

  const evidenceKeyV1 =
    typeof row.evidenceKeyV1 === "string" ? row.evidenceKeyV1.trim() : "";
  if (!evidenceKeyV1) return null;

  const family = typeof row.family === "string" ? row.family.trim() : "";
  if (!family) return null;

  const displayCode =
    typeof row.displayCode === "string" && row.displayCode.trim()
      ? row.displayCode.trim()
      : evidenceKeyV1;

  const sourcesRaw = Array.isArray(row.sources) ? row.sources : [];
  const sources: KnrDiscoverySourceRef[] = [];
  for (const s of sourcesRaw) {
    const n = normalizeSource(s);
    if (n) sources.push(n);
  }

  let discoveryStatus: KnrDiscoveryStatus =
    typeof row.discoveryStatus === "string"
    && (VALID_STATUS as readonly string[]).includes(row.discoveryStatus)
      ? (row.discoveryStatus as KnrDiscoveryStatus)
      : "DISCOVERED";
  discoveryStatus = clampDiscoveryStatusForSources(discoveryStatus, sources);

  const createdAt =
    typeof row.createdAt === "string" ? row.createdAt : KNR_DISCOVERY_DEFAULT_UPDATED_AT;
  const updatedAt =
    typeof row.updatedAt === "string" ? row.updatedAt : KNR_DISCOVERY_DEFAULT_UPDATED_AT;
  const lastFetchedAt =
    typeof row.lastFetchedAt === "string"
      ? row.lastFetchedAt
      : row.lastFetchedAt === null
        ? null
        : sources[0]?.fetchedAt ?? null;

  const contentHash =
    typeof row.contentHash === "string" && row.contentHash.trim()
      ? row.contentHash.trim()
      : fnv1aHex(JSON.stringify({ evidenceKeyV1, sources: sources.map((s) => s.contentHash) }));

  const queryHashes = Array.isArray(row.queryHashes)
    ? row.queryHashes.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    : [];

  const freshness = computeKnrDiscoveryOpsFreshness(lastFetchedAt, updatedAt, nowMs);

  return {
    schemaVersion: KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION,
    evidenceKeyV1,
    identityKeyV2:
      typeof row.identityKeyV2 === "string"
        ? row.identityKeyV2.trim()
        : row.identityKeyV2 === null
          ? null
          : undefined,
    family,
    displayCode,
    description: typeof row.description === "string" ? row.description : undefined,
    unit: typeof row.unit === "string" ? row.unit : undefined,
    discoveryStatus,
    lifecycleState:
      row.lifecycleState === "SUPERSEDED" || row.lifecycleState === "REJECTED"
        ? row.lifecycleState
        : "ACTIVE",
    sources,
    norms: normalizeNorms(row.norms),
    queryHashes,
    freshness,
    contentHash,
    lastFetchedAt,
    lastResearchAt:
      typeof row.lastResearchAt === "string"
        ? row.lastResearchAt
        : row.lastResearchAt === null
          ? null
          : undefined,
    createdAt,
    updatedAt,
    catalogRevisionLink: null,
  };
}

export function rebuildKnrDiscoveryIndexes(
  entries: Record<string, KnrDiscoveryEvidenceRecord>,
): Pick<
  KnrDiscoveryEvidenceStore,
  "byEvidenceKey" | "byIdentityKey" | "byUrlHash" | "byQueryHash" | "byContentHash"
> {
  const byEvidenceKey: Record<string, string> = {};
  const byIdentityKey: Record<string, string[]> = {};
  const byUrlHash: Record<string, string[]> = {};
  const byQueryHash: Record<string, string[]> = {};
  const byContentHash: Record<string, string[]> = {};

  const push = (map: Record<string, string[]>, key: string, evidenceKey: string) => {
    const k = key.trim();
    if (!k) return;
    const list = map[k] ?? [];
    if (!list.includes(evidenceKey)) list.push(evidenceKey);
    map[k] = list.sort();
  };

  for (const [ek, entry] of Object.entries(entries)) {
    byEvidenceKey[ek] = ek;
    if (entry.identityKeyV2) push(byIdentityKey, entry.identityKeyV2, ek);
    for (const s of entry.sources) push(byUrlHash, s.urlHash, ek);
    for (const q of entry.queryHashes) push(byQueryHash, q, ek);
    push(byContentHash, entry.contentHash, ek);
    for (const s of entry.sources) push(byContentHash, s.contentHash, ek);
  }

  return { byEvidenceKey, byIdentityKey, byUrlHash, byQueryHash, byContentHash };
}

export function emptyKnrDiscoveryEvidenceStore(
  updatedAtIso = KNR_DISCOVERY_DEFAULT_UPDATED_AT,
): KnrDiscoveryEvidenceStore {
  const store: KnrDiscoveryEvidenceStore = {
    schemaVersion: KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION,
    updatedAt: updatedAtIso,
    etag: "",
    entries: {},
    byEvidenceKey: {},
    byIdentityKey: {},
    byUrlHash: {},
    byQueryHash: {},
    byContentHash: {},
  };
  store.etag = buildStoreEtag(store);
  return store;
}

export function isEmptyKnrDiscoveryEvidenceStore(
  store: KnrDiscoveryEvidenceStore | null | undefined,
): boolean {
  return !store || Object.keys(store.entries ?? {}).length === 0;
}

export function hasActiveKnrDiscoveryEvidence(
  store: KnrDiscoveryEvidenceStore | null | undefined,
): boolean {
  if (!store) return false;
  return Object.values(store.entries).some((e) => e.lifecycleState === "ACTIVE");
}

export function isDestructiveKnrDiscoveryReplace(
  candidate: KnrDiscoveryEvidenceStore | null | undefined,
  baseline: KnrDiscoveryEvidenceStore | null | undefined,
): boolean {
  if (!hasActiveKnrDiscoveryEvidence(baseline)) return false;
  return isEmptyKnrDiscoveryEvidenceStore(candidate);
}

export function normalizeKnrDiscoveryEvidenceStore(
  raw: unknown,
  updatedAtIso = KNR_DISCOVERY_DEFAULT_UPDATED_AT,
  nowMs = Date.parse(updatedAtIso),
): KnrDiscoveryEvidenceStore {
  if (!raw || typeof raw !== "object") return emptyKnrDiscoveryEvidenceStore(updatedAtIso);
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION) {
    return emptyKnrDiscoveryEvidenceStore(updatedAtIso);
  }
  const entries: Record<string, KnrDiscoveryEvidenceRecord> = {};
  if (row.entries && typeof row.entries === "object") {
    for (const [key, value] of Object.entries(row.entries as Record<string, unknown>)) {
      const entry = normalizeKnrDiscoveryEvidenceRecord(value, nowMs);
      if (entry) entries[entry.evidenceKeyV1 || key.trim()] = entry;
    }
  }
  const indexes = rebuildKnrDiscoveryIndexes(entries);
  const store: KnrDiscoveryEvidenceStore = {
    schemaVersion: KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : updatedAtIso,
    etag: typeof row.etag === "string" ? row.etag : "",
    entries,
    ...indexes,
  };
  store.etag = buildStoreEtag(store);
  return store;
}

export function loadKnrDiscoveryEvidenceStoreLocal(): KnrDiscoveryEvidenceStore {
  try {
    if (typeof localStorage === "undefined") return emptyKnrDiscoveryEvidenceStore();
    const raw = localStorage.getItem(KNR_DISCOVERY_EVIDENCE_STORAGE_KEY);
    if (!raw) return emptyKnrDiscoveryEvidenceStore();
    return normalizeKnrDiscoveryEvidenceStore(JSON.parse(raw));
  } catch {
    return emptyKnrDiscoveryEvidenceStore();
  }
}

export function saveKnrDiscoveryEvidenceStoreLocal(
  store: KnrDiscoveryEvidenceStore,
  updatedAtIso?: string,
): KnrDiscoveryEvidenceStore {
  if (typeof localStorage === "undefined") {
    return normalizeKnrDiscoveryEvidenceStore(store, updatedAtIso);
  }
  const next = normalizeKnrDiscoveryEvidenceStore(
    {
      ...store,
      updatedAt: updatedAtIso ?? store.updatedAt,
      ...rebuildKnrDiscoveryIndexes(store.entries),
    },
    updatedAtIso ?? store.updatedAt,
  );
  localStorage.setItem(KNR_DISCOVERY_EVIDENCE_STORAGE_KEY, JSON.stringify(next));
  return loadKnrDiscoveryEvidenceStoreLocal();
}

export function casWriteKnrDiscoveryEvidenceStore(input: {
  expectedEtag: string;
  next: KnrDiscoveryEvidenceStore;
  baselineForGuard?: KnrDiscoveryEvidenceStore;
}): KnrDiscoveryCasResult {
  const current = loadKnrDiscoveryEvidenceStoreLocal();
  if (current.etag !== input.expectedEtag) {
    return {
      ok: false,
      reason: "etag_mismatch",
      store: current,
      messagePl: "Discovery evidence CAS conflict — reload and retry.",
    };
  }
  const normalized = normalizeKnrDiscoveryEvidenceStore(input.next);
  const baseline = input.baselineForGuard ?? current;
  if (isDestructiveKnrDiscoveryReplace(normalized, baseline)) {
    return {
      ok: false,
      reason: "empty_destructive",
      store: current,
      messagePl: "Refusing empty CAS write over non-empty discovery evidence.",
    };
  }
  saveKnrDiscoveryEvidenceStoreLocal(normalized);
  return { ok: true, store: loadKnrDiscoveryEvidenceStoreLocal() };
}

export function clearKnrDiscoveryEvidenceStoreLocalForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KNR_DISCOVERY_EVIDENCE_STORAGE_KEY);
}

/**
 * Offline upsert — never sets VERIFIED · never HTTP.
 * Family mismatch vs existing → CONFLICT status (no rewrite).
 */
export function upsertKnrDiscoveryEvidenceOffline(input: {
  record: KnrDiscoveryEvidenceRecord;
  nowIso: string;
  storeOverride?: KnrDiscoveryEvidenceStore;
}): { ok: true; store: KnrDiscoveryEvidenceStore; record: KnrDiscoveryEvidenceRecord } {
  const current = input.storeOverride ?? loadKnrDiscoveryEvidenceStoreLocal();
  const existing = current.entries[input.record.evidenceKeyV1];
  let nextRecord = normalizeKnrDiscoveryEvidenceRecord(
    { ...input.record, updatedAt: input.nowIso, catalogRevisionLink: null },
    Date.parse(input.nowIso),
  );
  if (!nextRecord) {
    nextRecord = {
      ...input.record,
      updatedAt: input.nowIso,
      catalogRevisionLink: null,
      discoveryStatus: clampDiscoveryStatusForSources(
        input.record.discoveryStatus,
        input.record.sources,
      ),
    };
  }

  if (existing) {
    const a = String(existing.family).trim().toUpperCase();
    const b = String(nextRecord.family).trim().toUpperCase();
    if (a && b && a !== b) {
      nextRecord = {
        ...existing,
        discoveryStatus: "CONFLICT",
        updatedAt: input.nowIso,
        sources: nextRecord.sources.length ? nextRecord.sources : existing.sources,
        catalogRevisionLink: null,
      };
    }
  }

  const entries = { ...current.entries, [nextRecord.evidenceKeyV1]: nextRecord };
  const indexes = rebuildKnrDiscoveryIndexes(entries);
  const nextStore = normalizeKnrDiscoveryEvidenceStore(
    {
      ...current,
      entries,
      ...indexes,
      updatedAt: input.nowIso,
    },
    input.nowIso,
    Date.parse(input.nowIso),
  );

  if (input.storeOverride) {
    return { ok: true, store: nextStore, record: nextRecord };
  }
  saveKnrDiscoveryEvidenceStoreLocal(nextStore, input.nowIso);
  return {
    ok: true,
    store: loadKnrDiscoveryEvidenceStoreLocal(),
    record: loadKnrDiscoveryEvidenceStoreLocal().entries[nextRecord.evidenceKeyV1] ?? nextRecord,
  };
}

export const KNR_DISCOVERY_EVIDENCE_P2A_IMPLEMENTED = true as const;
