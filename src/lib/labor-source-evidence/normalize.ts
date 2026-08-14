/**
 * WR-SOURCE-EVIDENCE-DB-01 — normalize + empty store + etag fingerprint.
 */

import { buildLaborSourceEvidenceDedupeKey } from "@/lib/labor-source-evidence/dedupe";
import { resolveLaborSourceEvidenceSourceRole } from "@/lib/labor-source-evidence/source-roles";
import {
  LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
  type LaborSourceEvidenceIdentityMethod,
  type LaborSourceEvidenceObservation,
  type LaborSourceEvidencePriceKind,
  type LaborSourceEvidenceProvenance,
  type LaborSourceEvidenceQualityStatus,
  type LaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/types";
import type { WorkRateEvidenceScopeTag } from "@/lib/work-catalog/work-rate-evidence-scope";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";
import { WORK_RATE_REGION_SCOPES } from "@/lib/work-catalog/work-rate-types";

const QUALITY: readonly LaborSourceEvidenceQualityStatus[] = [
  "VALID",
  "REJECTED_SCOPE",
  "REJECTED_IDENTITY",
  "REJECTED_UNIT",
  "REJECTED_PACKAGE",
  "REJECTED_OUTLIER",
  "STALE",
  "UNMATCHED",
];

const PRICE_KINDS: readonly LaborSourceEvidencePriceKind[] = [
  "point",
  "range",
  "from_floor",
  "unknown",
];

const IDENTITY: readonly LaborSourceEvidenceIdentityMethod[] = [
  "exact_name",
  "owner_synonym",
  "names_loosely",
  "unmatched",
];

const SCOPES: readonly WorkRateEvidenceScopeTag[] = [
  "walls_ceilings",
  "joinery",
  "artistic",
  "unscoped",
];

function asIso(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim() && !Number.isNaN(Date.parse(v))) return v.trim();
  return fallback;
}

function asNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBool(v: unknown, d: boolean): boolean {
  if (typeof v === "boolean") return v;
  return d;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function fingerprintObservations(obs: LaborSourceEvidenceObservation[]): string {
  const parts = obs
    .map((o) => `${o.dedupeKey}:${o.evidenceId}:${o.retrievedAt}:${o.qualityStatus}`)
    .sort();
  let h = 0;
  const s = parts.join(";");
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export function computeLaborSourceEvidenceEtag(
  revision: number,
  observations: LaborSourceEvidenceObservation[],
): string {
  return `r${revision}-${fingerprintObservations(observations)}`;
}

export function emptyLaborSourceEvidenceStore(nowIso = "1970-01-01T00:00:00.000Z"): LaborSourceEvidenceStore {
  const observations: LaborSourceEvidenceObservation[] = [];
  const revision = 0;
  return {
    schemaVersion: LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
    revision,
    etag: computeLaborSourceEvidenceEtag(revision, observations),
    updatedAt: nowIso,
    observations,
    tombstones: [],
  };
}

export function normalizeLaborSourceEvidenceObservation(
  raw: unknown,
  nowIso = new Date().toISOString(),
): LaborSourceEvidenceObservation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sourceId = typeof r.sourceId === "string" ? r.sourceId.trim() : "";
  const sourceUrl = typeof r.sourceUrl === "string" ? r.sourceUrl.trim() : "";
  const observedName = typeof r.observedName === "string" ? r.observedName.trim() : "";
  const unit = typeof r.unit === "string" ? r.unit.trim() : "";
  if (!sourceId || !sourceUrl || !observedName || !unit) return null;

  const priceKind = PRICE_KINDS.includes(r.priceKind as LaborSourceEvidencePriceKind)
    ? (r.priceKind as LaborSourceEvidencePriceKind)
    : "unknown";
  const region = WORK_RATE_REGION_SCOPES.includes(r.region as WorkRateRegionScope)
    ? (r.region as WorkRateRegionScope)
    : "POLSKA";
  const scopeTag = SCOPES.includes(r.scopeTag as WorkRateEvidenceScopeTag)
    ? (r.scopeTag as WorkRateEvidenceScopeTag)
    : "unscoped";
  const identityMethod = IDENTITY.includes(r.identityMethod as LaborSourceEvidenceIdentityMethod)
    ? (r.identityMethod as LaborSourceEvidenceIdentityMethod)
    : "unmatched";
  const qualityStatus = QUALITY.includes(r.qualityStatus as LaborSourceEvidenceQualityStatus)
    ? (r.qualityStatus as LaborSourceEvidenceQualityStatus)
    : "UNMATCHED";

  const workId =
    typeof r.workId === "string" && r.workId.trim() ? r.workId.trim() : null;
  const priceMin = asNum(r.priceMin);
  const priceMax = asNum(r.priceMax);
  const pricePoint = asNum(r.pricePoint);
  const synonymUsed =
    typeof r.synonymUsed === "string" && r.synonymUsed.trim() ? r.synonymUsed.trim() : null;
  const retrievedAt = asIso(r.retrievedAt, nowIso);
  const observedAt = asIso(r.observedAt, retrievedAt);
  const laborOnly = asBool(r.laborOnly, true);
  const includesMaterial = asBool(r.includesMaterial, false);
  const identityMatched = asBool(r.identityMatched, identityMethod !== "unmatched");

  const dedupeKey =
    typeof r.dedupeKey === "string" && r.dedupeKey.trim()
      ? r.dedupeKey.trim()
      : buildLaborSourceEvidenceDedupeKey({
          workId,
          sourceId,
          sourceUrl,
          observedName,
          unit,
          region,
          priceKind,
          priceMin,
          priceMax,
          pricePoint,
        });

  const provenanceRaw =
    r.provenance && typeof r.provenance === "object"
      ? (r.provenance as Record<string, unknown>)
      : {};
  const provenance: LaborSourceEvidenceProvenance = {
    sourceId: typeof provenanceRaw.sourceId === "string" ? provenanceRaw.sourceId : sourceId,
    sourceUrl: typeof provenanceRaw.sourceUrl === "string" ? provenanceRaw.sourceUrl : sourceUrl,
    observedName:
      typeof provenanceRaw.observedName === "string" ? provenanceRaw.observedName : observedName,
    region: WORK_RATE_REGION_SCOPES.includes(provenanceRaw.region as WorkRateRegionScope)
      ? (provenanceRaw.region as WorkRateRegionScope)
      : region,
    unit: typeof provenanceRaw.unit === "string" ? provenanceRaw.unit : unit,
    priceKind: PRICE_KINDS.includes(provenanceRaw.priceKind as LaborSourceEvidencePriceKind)
      ? (provenanceRaw.priceKind as LaborSourceEvidencePriceKind)
      : priceKind,
    priceMin: asNum(provenanceRaw.priceMin) ?? priceMin,
    priceMax: asNum(provenanceRaw.priceMax) ?? priceMax,
    pricePoint: asNum(provenanceRaw.pricePoint) ?? pricePoint,
    retrievedAt: asIso(provenanceRaw.retrievedAt, retrievedAt),
    identityMethod: IDENTITY.includes(
      provenanceRaw.identityMethod as LaborSourceEvidenceIdentityMethod,
    )
      ? (provenanceRaw.identityMethod as LaborSourceEvidenceIdentityMethod)
      : identityMethod,
    synonymUsed:
      typeof provenanceRaw.synonymUsed === "string" && provenanceRaw.synonymUsed.trim()
        ? provenanceRaw.synonymUsed.trim()
        : synonymUsed,
    scopeTag: SCOPES.includes(provenanceRaw.scopeTag as WorkRateEvidenceScopeTag)
      ? (provenanceRaw.scopeTag as WorkRateEvidenceScopeTag)
      : scopeTag,
    pageTitle: typeof provenanceRaw.pageTitle === "string" ? provenanceRaw.pageTitle : null,
    sectionHint: typeof provenanceRaw.sectionHint === "string" ? provenanceRaw.sectionHint : null,
    fetchTraceId:
      typeof provenanceRaw.fetchTraceId === "string" ? provenanceRaw.fetchTraceId : null,
  };

  // UNMATCHED must not invent workId
  const finalWorkId = qualityStatus === "UNMATCHED" ? null : workId;
  const finalQuality =
    finalWorkId == null && qualityStatus === "VALID" ? "UNMATCHED" : qualityStatus;

  return {
    evidenceId:
      typeof r.evidenceId === "string" && r.evidenceId.trim() ? r.evidenceId.trim() : newId(),
    workId: finalWorkId,
    sourceId,
    sourceUrl,
    categoryKey:
      typeof r.categoryKey === "string" && r.categoryKey.trim() ? r.categoryKey.trim() : null,
    observedName,
    unit,
    priceMin,
    priceMax,
    pricePoint,
    priceKind,
    currency: "PLN",
    region,
    country: "POLSKA",
    scopeTag,
    identityMethod,
    synonymUsed,
    identityMatched,
    laborOnly,
    includesMaterial,
    observedAt,
    retrievedAt,
    provenance,
    qualityStatus: finalQuality,
    dedupeKey,
    sourceRole: resolveLaborSourceEvidenceSourceRole(sourceId),
    parserVersion: typeof r.parserVersion === "string" ? r.parserVersion : null,
    staleAt: typeof r.staleAt === "string" ? r.staleAt : null,
    schemaVersion: LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
  };
}

export function normalizeLaborSourceEvidenceStore(raw: unknown): LaborSourceEvidenceStore {
  if (!raw || typeof raw !== "object") return emptyLaborSourceEvidenceStore();
  const r = raw as Record<string, unknown>;
  const nowIso =
    typeof r.updatedAt === "string" && r.updatedAt.trim()
      ? r.updatedAt.trim()
      : "1970-01-01T00:00:00.000Z";
  const list = Array.isArray(r.observations) ? r.observations : [];
  const observations: LaborSourceEvidenceObservation[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    const o = normalizeLaborSourceEvidenceObservation(row, nowIso);
    if (!o) continue;
    if (seen.has(o.evidenceId)) continue;
    seen.add(o.evidenceId);
    observations.push(o);
  }
  const revision =
    typeof r.revision === "number" && Number.isFinite(r.revision) && r.revision >= 0
      ? Math.floor(r.revision)
      : 0;
  const tombstones = Array.isArray(r.tombstones)
    ? r.tombstones.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  const etag =
    typeof r.etag === "string" && r.etag.trim()
      ? r.etag.trim()
      : computeLaborSourceEvidenceEtag(revision, observations);
  return {
    schemaVersion: LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
    revision,
    etag,
    updatedAt: nowIso,
    observations,
    tombstones,
  };
}

export function isEmptyLaborSourceEvidenceStore(store: LaborSourceEvidenceStore): boolean {
  return store.observations.length === 0;
}
