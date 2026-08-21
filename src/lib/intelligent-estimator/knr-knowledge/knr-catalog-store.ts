/**
 * IK-KNR KL-1 — OUR KNR CATALOG local store (ADAPT: work-catalog-store + LSE CAS).
 * Domain SSOT for KNR norms · localStorage adapter only · NO cloud-sync.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import type { KnrNormComponentKind } from "./types";
import type { KnrCatalogEntry, KnrNormLine } from "./knr-catalog-entry-types";
import { buildKnrNormContentHash } from "./knr-content-hash";

export const KNR_CATALOG_STORAGE_KEY = "kw-knr-catalog";

/** Deterministic default for normalize/tests — no Date.now(). */
export const KNR_CATALOG_DEFAULT_UPDATED_AT = "2026-08-19T12:00:00.000Z";

export const KNR_CATALOG_STORE_SCHEMA_VERSION = 1 as const;

export type KnrCatalogStore = {
  schemaVersion: typeof KNR_CATALOG_STORE_SCHEMA_VERSION;
  updatedAt: string;
  etag: string;
  entries: Record<string, KnrCatalogEntry>;
  aliasIndex: Record<string, string[]>;
  tombstones?: string[];
};

export type KnrCatalogCasResult =
  | { ok: true; store: KnrCatalogStore }
  | {
      ok: false;
      reason: "etag_mismatch" | "empty_destructive";
      store: KnrCatalogStore;
      messagePl: string;
    };

const VALID_KINDS: KnrNormComponentKind[] = ["R", "M", "S"];
const PRICING_FIELD_DENY = new Set([
  "ourRatePln",
  "pricePln",
  "pln",
  "marketQuotes",
  "ourRate",
  "sellPrice",
  "costPln",
]);

function buildStoreEtag(store: Pick<KnrCatalogStore, "entries" | "aliasIndex">): string {
  const keys = Object.keys(store.entries).sort();
  const alias = JSON.stringify(store.aliasIndex);
  return fnv1aHex(`${keys.join(",")}|${alias}`);
}

function normalizeNormLine(raw: unknown, kind: KnrNormComponentKind): KnrNormLine | null {
  if (!raw || typeof raw !== "object") return null;
  const line = raw as Record<string, unknown>;
  for (const key of Object.keys(line)) {
    if (PRICING_FIELD_DENY.has(key)) return null;
  }
  const code = typeof line.code === "string" ? line.code.trim() : "";
  const description = typeof line.description === "string" ? line.description.trim() : "";
  const unit = typeof line.unit === "string" ? line.unit.trim() : "";
  const quantity = Number(line.quantity);
  if (!code || !description || !unit || !Number.isFinite(quantity)) return null;
  const lineKind = line.kind === "R" || line.kind === "M" || line.kind === "S" ? line.kind : kind;
  if (!(VALID_KINDS as readonly string[]).includes(lineKind)) return null;
  return {
    kind: lineKind,
    code,
    description,
    unit,
    quantity,
    sourceRef: typeof line.sourceRef === "string" ? line.sourceRef : line.sourceRef ?? null,
  };
}

function normalizeNormLines(raw: unknown, kind: KnrNormComponentKind): KnrNormLine[] {
  if (!Array.isArray(raw)) return [];
  const out: KnrNormLine[] = [];
  for (const row of raw) {
    const line = normalizeNormLine(row, kind);
    if (line) out.push(line);
  }
  return out;
}

/** Strip pricing-like fields from entry — KNR norms ≠ PLN domain. */
export function normalizeKnrCatalogEntry(raw: unknown): KnrCatalogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    if (PRICING_FIELD_DENY.has(key)) return null;
  }
  if (row.schemaVersion !== 1) return null;
  const identityKeyV2 = typeof row.identityKeyV2 === "string" ? row.identityKeyV2.trim() : "";
  const evidenceKeyV1 = typeof row.evidenceKeyV1 === "string" ? row.evidenceKeyV1.trim() : "";
  if (!identityKeyV2 || !evidenceKeyV1) return null;

  const normsRaw = row.norms;
  if (!normsRaw || typeof normsRaw !== "object") return null;
  const normsObj = normsRaw as Record<string, unknown>;
  const norms = {
    laborNorms: normalizeNormLines(normsObj.laborNorms, "R"),
    materialNorms: normalizeNormLines(normsObj.materialNorms, "M"),
    equipmentNorms: normalizeNormLines(normsObj.equipmentNorms, "S"),
  };

  const provenanceRaw = row.provenance;
  if (!provenanceRaw || typeof provenanceRaw !== "object") return null;
  const prov = provenanceRaw as Record<string, unknown>;
  const capturedAt = typeof prov.capturedAt === "string" ? prov.capturedAt : "";
  const parserVersion = typeof prov.parserVersion === "string" ? prov.parserVersion : "";
  if (!capturedAt || !parserVersion) return null;

  const identity = row.identity && typeof row.identity === "object"
    ? (row.identity as KnrCatalogEntry["identity"])
    : {};

  const contentHash =
    typeof row.contentHash === "string" && row.contentHash.trim()
      ? row.contentHash.trim()
      : buildKnrNormContentHash(norms);

  return {
    schemaVersion: 1,
    identityKeyV2,
    evidenceKeyV1,
    identity,
    originalSourceCode:
      typeof row.originalSourceCode === "string" ? row.originalSourceCode : "",
    displayCode: typeof row.displayCode === "string" ? row.displayCode : "",
    description: typeof row.description === "string" ? row.description : "",
    unit: typeof row.unit === "string" ? row.unit : "",
    norms,
    provenance: {
      sourceType:
        prov.sourceType === "OUR_KNR_CATALOG"
        || prov.sourceType === "LICENSED_PROGRAM_EXPORT"
        || prov.sourceType === "LICENSED_OEM_BUNDLE"
        || prov.sourceType === "AUTHORIZED_API"
        || prov.sourceType === "AUTHORIZED_FETCH"
        || prov.sourceType === "OWNER_MANUAL"
          ? prov.sourceType
          : "UNSPECIFIED",
      sourceIdentifier:
        typeof prov.sourceIdentifier === "string" ? prov.sourceIdentifier : "",
      sourceProgram: typeof prov.sourceProgram === "string" ? prov.sourceProgram : null,
      sourceProgramVersion:
        typeof prov.sourceProgramVersion === "string" ? prov.sourceProgramVersion : null,
      acquisitionMethod:
        prov.acquisitionMethod === "LOCAL_CATALOG_HIT"
        || prov.acquisitionMethod === "LICENSED_EXPORT"
        || prov.acquisitionMethod === "LICENSED_BUNDLE"
        || prov.acquisitionMethod === "AUTHORIZED_API"
        || prov.acquisitionMethod === "AUTHORIZED_FETCH"
        || prov.acquisitionMethod === "SCRAPER"
        || prov.acquisitionMethod === "MANUAL_OWNER"
        || prov.acquisitionMethod === "LLM_ASSIST_NON_AUTHORITATIVE"
          ? prov.acquisitionMethod
          : "NOT_ACQUIRED",
      capturedAt,
      retrievedAt: typeof prov.retrievedAt === "string" ? prov.retrievedAt : null,
      parserVersion,
      contentHash: typeof prov.contentHash === "string" ? prov.contentHash : contentHash,
      rawEvidenceRef:
        prov.rawEvidenceRef && typeof prov.rawEvidenceRef === "object"
          ? (prov.rawEvidenceRef as KnrCatalogEntry["provenance"]["rawEvidenceRef"])
          : null,
      importBatchId: typeof prov.importBatchId === "string" ? prov.importBatchId : null,
      licenceId: typeof prov.licenceId === "string" ? prov.licenceId : null,
      originId: typeof prov.originId === "string" ? prov.originId : null,
      revision: Number.isFinite(Number(prov.revision)) ? Number(prov.revision) : 0,
    },
    verificationStatus:
      row.verificationStatus === "VERIFIED"
      || row.verificationStatus === "STALE"
      || row.verificationStatus === "NORMATIVE"
      || row.verificationStatus === "STRUCTURAL"
      || row.verificationStatus === "RESEARCHED"
      || row.verificationStatus === "PENDING_VERIFY"
      || row.verificationStatus === "INCOMPLETE"
      || row.verificationStatus === "CONFLICTED"
      || row.verificationStatus === "REJECTED"
      || row.verificationStatus === "SUPERSEDED"
        ? row.verificationStatus
        : "STRUCTURAL",
    validationState:
      row.validationState === "PASS"
      || row.validationState === "INCOMPLETE"
      || row.validationState === "CONFLICT"
      || row.validationState === "REJECTED"
        ? row.validationState
        : "INCOMPLETE",
    lifecycleState:
      row.lifecycleState === "ACTIVE"
      || row.lifecycleState === "SUPERSEDED"
      || row.lifecycleState === "REJECTED"
        ? row.lifecycleState
        : "ACTIVE",
    contentHash,
    verifiedAt: typeof row.verifiedAt === "string" ? row.verifiedAt : null,
    verifiedBy: typeof row.verifiedBy === "string" ? row.verifiedBy : null,
    createdAt:
      typeof row.createdAt === "string" ? row.createdAt : KNR_CATALOG_DEFAULT_UPDATED_AT,
    updatedAt:
      typeof row.updatedAt === "string" ? row.updatedAt : KNR_CATALOG_DEFAULT_UPDATED_AT,
    supersededBy: typeof row.supersededBy === "string" ? row.supersededBy : null,
    emptyNormsWithEvidence: row.emptyNormsWithEvidence === true ? true : undefined,
  };
}

export function rebuildKnrAliasIndex(
  entries: Record<string, KnrCatalogEntry>,
): Record<string, string[]> {
  const aliasIndex: Record<string, string[]> = {};
  for (const entry of Object.values(entries)) {
    const alias = entry.evidenceKeyV1.trim();
    if (!alias) continue;
    const list = aliasIndex[alias] ?? [];
    if (!list.includes(entry.identityKeyV2)) {
      list.push(entry.identityKeyV2);
      aliasIndex[alias] = list.sort();
    }
  }
  return aliasIndex;
}

export function emptyKnrCatalogStore(updatedAtIso = KNR_CATALOG_DEFAULT_UPDATED_AT): KnrCatalogStore {
  const store: KnrCatalogStore = {
    schemaVersion: KNR_CATALOG_STORE_SCHEMA_VERSION,
    updatedAt: updatedAtIso,
    etag: fnv1aHex("empty"),
    entries: {},
    aliasIndex: {},
    tombstones: [],
  };
  store.etag = buildStoreEtag(store);
  return store;
}

export function normalizeKnrCatalogStore(
  raw: unknown,
  updatedAtIso = KNR_CATALOG_DEFAULT_UPDATED_AT,
): KnrCatalogStore {
  if (!raw || typeof raw !== "object") return emptyKnrCatalogStore(updatedAtIso);
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== KNR_CATALOG_STORE_SCHEMA_VERSION) {
    return emptyKnrCatalogStore(updatedAtIso);
  }

  const entries: Record<string, KnrCatalogEntry> = {};
  if (row.entries && typeof row.entries === "object") {
    for (const [key, value] of Object.entries(row.entries as Record<string, unknown>)) {
      const entry = normalizeKnrCatalogEntry(value);
      if (entry) entries[key.trim()] = entry;
    }
  }

  const aliasIndex =
    row.aliasIndex && typeof row.aliasIndex === "object"
      ? rebuildKnrAliasIndex(entries)
      : rebuildKnrAliasIndex(entries);

  const tombstones = Array.isArray(row.tombstones)
    ? row.tombstones.filter((t): t is string => typeof t === "string")
    : [];

  const store: KnrCatalogStore = {
    schemaVersion: KNR_CATALOG_STORE_SCHEMA_VERSION,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : updatedAtIso,
    etag: typeof row.etag === "string" ? row.etag : "",
    entries,
    aliasIndex,
    tombstones,
  };
  store.etag = buildStoreEtag(store);
  return store;
}

export function loadKnrCatalogStoreLocal(): KnrCatalogStore {
  try {
    if (typeof localStorage === "undefined") return emptyKnrCatalogStore();
    const raw = localStorage.getItem(KNR_CATALOG_STORAGE_KEY);
    if (!raw) return emptyKnrCatalogStore();
    return normalizeKnrCatalogStore(JSON.parse(raw));
  } catch {
    return emptyKnrCatalogStore();
  }
}

export function saveKnrCatalogStoreLocal(
  store: KnrCatalogStore,
  updatedAtIso?: string,
): KnrCatalogStore {
  if (typeof localStorage === "undefined") return normalizeKnrCatalogStore(store, updatedAtIso);
  const next = normalizeKnrCatalogStore(
    {
      ...store,
      updatedAt: updatedAtIso ?? store.updatedAt,
      aliasIndex: rebuildKnrAliasIndex(store.entries),
    },
    updatedAtIso ?? store.updatedAt,
  );
  localStorage.setItem(KNR_CATALOG_STORAGE_KEY, JSON.stringify(next));
  return loadKnrCatalogStoreLocal();
}

export function casWriteKnrCatalogStore(input: {
  expectedEtag: string;
  next: KnrCatalogStore;
  baselineForGuard?: KnrCatalogStore;
}): KnrCatalogCasResult {
  const current = loadKnrCatalogStoreLocal();
  if (current.etag !== input.expectedEtag) {
    return {
      ok: false,
      reason: "etag_mismatch",
      store: current,
      messagePl: "KNR Catalog CAS conflict — reload and retry.",
    };
  }
  const normalized = normalizeKnrCatalogStore(input.next);
  const baseline = input.baselineForGuard ?? current;
  if (
    Object.keys(normalized.entries).length === 0
    && Object.keys(baseline.entries).length > 0
  ) {
    const hasVerified = Object.values(baseline.entries).some(
      (e) => e.verificationStatus === "VERIFIED" && e.lifecycleState === "ACTIVE",
    );
    if (hasVerified) {
      return {
        ok: false,
        reason: "empty_destructive",
        store: current,
        messagePl: "Refusing empty CAS write over non-empty VERIFIED KNR catalog.",
      };
    }
  }
  saveKnrCatalogStoreLocal(normalized);
  return { ok: true, store: loadKnrCatalogStoreLocal() };
}

export function clearKnrCatalogStoreLocalForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KNR_CATALOG_STORAGE_KEY);
}
