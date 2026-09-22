/**
 * GO-AUTO-IDENTITY-01 — durable research/identity continuation sidecar.
 *
 * NOT a Research Engine 2 — schedules existing P5/P6/ATESD/Identity retry via epochs.
 * Stored on TenderPackage.ikContinuation (wrapper · OfferBoq schema untouched).
 */

import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { getTenderPackage, upsertTenderPackage } from "@/lib/multi-dwelling/store";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

export const IK_RESEARCH_CONTINUATION_SCHEMA_VERSION = 1 as const;
export const IK_RESEARCH_CONTINUATION_MAX_ATTEMPTS = 3 as const;
export const IK_RESEARCH_CONTINUATION_COOLDOWN_MS = 30_000 as const;

export type IkContinuationDomain = "identity" | "labor" | "material" | "technology";

export type IkContinuationStatus =
  | "SCHEDULED"
  | "EXECUTING"
  | "EVIDENCE_PERSISTED"
  | "RESOLVED"
  | "RETRY_DUE"
  | "OWNER_EXCEPTION"
  | "EXHAUSTED";

export type IkContinuationExecutorOutcome =
  | "no_change"
  | "evidence_persisted"
  | "canonical_mutation_persisted"
  | "retry_due"
  | "owner_exception";

export type IkResearchContinuationRecord = {
  key: string;
  tenderId: string;
  dwellingId: string;
  lineId: string;
  domain: IkContinuationDomain;
  reasonFingerprint: string;
  status: IkContinuationStatus;
  attempts: number;
  maxAttempts: number;
  lastOutcome: IkContinuationExecutorOutcome | null;
  updatedAt: string;
  cooldownUntilIso: string | null;
  notes: string[];
};

export type IkContinuationSidecar = {
  schemaVersion: typeof IK_RESEARCH_CONTINUATION_SCHEMA_VERSION;
  records: IkResearchContinuationRecord[];
  updatedAt: string;
};

export function buildIkContinuationRecordKey(input: {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  domain: IkContinuationDomain;
  reasonFingerprint: string;
}): string {
  return [
    String(input.tenderId || "").trim(),
    normalizeDwellingId(input.dwellingId),
    String(input.lineId || "").trim(),
    input.domain,
    String(input.reasonFingerprint || "").trim(),
  ].join("|");
}

export function emptyIkContinuationSidecar(nowIso = new Date().toISOString()): IkContinuationSidecar {
  return {
    schemaVersion: IK_RESEARCH_CONTINUATION_SCHEMA_VERSION,
    records: [],
    updatedAt: nowIso,
  };
}

export function normalizeIkContinuationSidecar(raw: unknown): IkContinuationSidecar | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<IkContinuationSidecar>;
  if (r.schemaVersion !== 1) return null;
  const records: IkResearchContinuationRecord[] = [];
  if (Array.isArray(r.records)) {
    for (const item of r.records) {
      if (!item || typeof item !== "object") continue;
      const x = item as Partial<IkResearchContinuationRecord>;
      const key = String(x.key || "").trim();
      const tenderId = String(x.tenderId || "").trim();
      const lineId = String(x.lineId || "").trim();
      const domain = x.domain;
      if (!key || !tenderId || !lineId) continue;
      if (
        domain !== "identity"
        && domain !== "labor"
        && domain !== "material"
        && domain !== "technology"
      ) {
        continue;
      }
      records.push({
        key,
        tenderId,
        dwellingId: normalizeDwellingId(x.dwellingId),
        lineId,
        domain,
        reasonFingerprint: String(x.reasonFingerprint || "").trim() || "default",
        status: (x.status as IkContinuationStatus) || "SCHEDULED",
        attempts: typeof x.attempts === "number" ? Math.max(0, Math.floor(x.attempts)) : 0,
        maxAttempts:
          typeof x.maxAttempts === "number"
            ? Math.max(1, Math.floor(x.maxAttempts))
            : IK_RESEARCH_CONTINUATION_MAX_ATTEMPTS,
        lastOutcome: (x.lastOutcome as IkContinuationExecutorOutcome) || null,
        updatedAt: String(x.updatedAt || "") || new Date().toISOString(),
        cooldownUntilIso: x.cooldownUntilIso ? String(x.cooldownUntilIso) : null,
        notes: Array.isArray(x.notes) ? x.notes.map(String) : [],
      });
    }
  }
  return {
    schemaVersion: IK_RESEARCH_CONTINUATION_SCHEMA_VERSION,
    records,
    updatedAt: String(r.updatedAt || "") || new Date().toISOString(),
  };
}

/** Merge continuation sidecars — union by key · prefer higher attempts / later updatedAt. */
export function mergeIkContinuationSidecar(
  local: IkContinuationSidecar | null | undefined,
  cloud: IkContinuationSidecar | null | undefined,
): IkContinuationSidecar | null {
  if (!local && !cloud) return null;
  if (local && !cloud) return local;
  if (!local && cloud) return cloud;
  const map = new Map<string, IkResearchContinuationRecord>();
  for (const rec of [...(local!.records), ...(cloud!.records)]) {
    const prev = map.get(rec.key);
    if (!prev) {
      map.set(rec.key, rec);
      continue;
    }
    if (rec.attempts > prev.attempts) map.set(rec.key, rec);
    else if (rec.attempts === prev.attempts && rec.updatedAt > prev.updatedAt) {
      map.set(rec.key, rec);
    }
  }
  const updatedAt =
    local!.updatedAt > cloud!.updatedAt ? local!.updatedAt : cloud!.updatedAt;
  return {
    schemaVersion: IK_RESEARCH_CONTINUATION_SCHEMA_VERSION,
    records: [...map.values()],
    updatedAt,
  };
}

export function upsertIkContinuationRecord(
  sidecar: IkContinuationSidecar,
  record: IkResearchContinuationRecord,
): IkContinuationSidecar {
  const records = sidecar.records.filter((r) => r.key !== record.key);
  records.push(record);
  return {
    schemaVersion: IK_RESEARCH_CONTINUATION_SCHEMA_VERSION,
    records,
    updatedAt: record.updatedAt,
  };
}

export function scheduleIkContinuation(input: {
  tenderId: string;
  dwellingId?: string;
  lineId: string;
  domain: IkContinuationDomain;
  reasonFingerprint: string;
  nowIso?: string;
  notes?: string[];
}): IkResearchContinuationRecord {
  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    key: buildIkContinuationRecordKey({
      tenderId: input.tenderId,
      dwellingId: input.dwellingId ?? "default",
      lineId: input.lineId,
      domain: input.domain,
      reasonFingerprint: input.reasonFingerprint,
    }),
    tenderId: String(input.tenderId).trim(),
    dwellingId: normalizeDwellingId(input.dwellingId),
    lineId: String(input.lineId).trim(),
    domain: input.domain,
    reasonFingerprint: String(input.reasonFingerprint || "default").trim(),
    status: "SCHEDULED",
    attempts: 0,
    maxAttempts: IK_RESEARCH_CONTINUATION_MAX_ATTEMPTS,
    lastOutcome: null,
    updatedAt: nowIso,
    cooldownUntilIso: null,
    notes: input.notes ?? [],
  };
}

/**
 * Advance one record from executor outcome.
 * Only canonical_mutation_persisted / evidence_persisted / owner_exception / retry_due change status.
 */
export function applyIkContinuationExecutorOutcome(
  record: IkResearchContinuationRecord,
  outcome: IkContinuationExecutorOutcome,
  nowIso = new Date().toISOString(),
): IkResearchContinuationRecord {
  const attempts = record.attempts + (outcome === "no_change" ? 0 : 1);
  let status: IkContinuationStatus = record.status;
  let cooldownUntilIso = record.cooldownUntilIso;

  if (outcome === "owner_exception") {
    status = "OWNER_EXCEPTION";
  } else if (outcome === "canonical_mutation_persisted") {
    status = "RESOLVED";
  } else if (outcome === "evidence_persisted") {
    status = "EVIDENCE_PERSISTED";
  } else if (outcome === "retry_due") {
    if (attempts >= record.maxAttempts) {
      status = "EXHAUSTED";
    } else {
      status = "RETRY_DUE";
      cooldownUntilIso = new Date(
        Date.parse(nowIso) + IK_RESEARCH_CONTINUATION_COOLDOWN_MS,
      ).toISOString();
    }
  } else if (outcome === "no_change") {
    // Stay SCHEDULED / EXECUTING — do not fake success
    if (record.status === "SCHEDULED") status = "EXECUTING";
  }

  return {
    ...record,
    attempts: Math.max(record.attempts, attempts),
    status,
    lastOutcome: outcome,
    updatedAt: nowIso,
    cooldownUntilIso,
    notes: [...record.notes, `outcome=${outcome}`],
  };
}

export function isIkContinuationDue(
  record: IkResearchContinuationRecord,
  nowMs = Date.now(),
): boolean {
  if (record.status === "OWNER_EXCEPTION" || record.status === "EXHAUSTED" || record.status === "RESOLVED") {
    return false;
  }
  if (record.status === "RETRY_DUE" || record.status === "SCHEDULED" || record.status === "EVIDENCE_PERSISTED") {
    if (record.cooldownUntilIso) {
      const t = Date.parse(record.cooldownUntilIso);
      if (Number.isFinite(t) && t > nowMs) return false;
    }
    return true;
  }
  return false;
}

/**
 * Map executor outcome → Orchestra refreshPhase kind (or null = no refresh).
 * HARD: only canonical_mutation_persisted may refresh.
 */
export function resolveContinuationRefreshPhase(
  domain: IkContinuationDomain,
  outcome: IkContinuationExecutorOutcome,
): "labor_accept" | "material_accept" | "catalog_accept" | null {
  if (outcome !== "canonical_mutation_persisted") return null;
  if (domain === "labor") return "labor_accept";
  if (domain === "material" || domain === "technology") return "material_accept";
  if (domain === "identity") return "catalog_accept";
  return null;
}

/** Persist sidecar onto package (idempotent upsert). */
export function persistIkContinuationOnPackage(input: {
  tenderId: string;
  package?: TenderPackage | null;
  sidecar: IkContinuationSidecar;
}): TenderPackage | null {
  const tid = String(input.tenderId || "").trim();
  if (!tid) return null;
  const pkg = input.package ?? getTenderPackage(tid);
  if (!pkg) return null;
  return upsertTenderPackage({
    ...pkg,
    ikContinuation: input.sidecar,
  });
}

export function loadIkContinuationFromPackage(
  pkg: TenderPackage | null | undefined,
): IkContinuationSidecar {
  return normalizeIkContinuationSidecar(pkg?.ikContinuation) ?? emptyIkContinuationSidecar();
}

/**
 * Schedule many line continuations (identity/labor) — merge into existing sidecar.
 */
export function scheduleManyIkContinuations(input: {
  tenderId: string;
  package?: TenderPackage | null;
  lineIds: readonly string[];
  domain: IkContinuationDomain;
  reasonFingerprint: string;
  dwellingId?: string;
  nowIso?: string;
}): IkContinuationSidecar {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const pkg = input.package ?? getTenderPackage(input.tenderId);
  let sidecar = loadIkContinuationFromPackage(pkg);
  for (const lineId of input.lineIds) {
    const lid = String(lineId || "").trim();
    if (!lid) continue;
    const rec = scheduleIkContinuation({
      tenderId: input.tenderId,
      dwellingId: input.dwellingId,
      lineId: lid,
      domain: input.domain,
      reasonFingerprint: input.reasonFingerprint,
      nowIso,
    });
    const existing = sidecar.records.find((r) => r.key === rec.key);
    if (existing && (existing.status === "RESOLVED" || existing.status === "OWNER_EXCEPTION")) {
      continue;
    }
    if (existing && !isIkContinuationDue(existing, Date.parse(nowIso))) {
      continue;
    }
    sidecar = upsertIkContinuationRecord(sidecar, existing
      ? {
          ...existing,
          status: existing.status === "RETRY_DUE" ? "RETRY_DUE" : "SCHEDULED",
          updatedAt: nowIso,
        }
      : rec);
  }
  persistIkContinuationOnPackage({
    tenderId: input.tenderId,
    package: pkg,
    sidecar,
  });
  return sidecar;
}

/**
 * Pure tick: which due records should arm existing research (P5/P6) — no HTTP here.
 */
export function planIkContinuationResearchArm(input: {
  sidecar: IkContinuationSidecar;
  nowMs?: number;
}): {
  laborLineIds: string[];
  materialLineIds: string[];
  identityLineIds: string[];
  technologyLineIds: string[];
} {
  const nowMs = input.nowMs ?? Date.now();
  const laborLineIds: string[] = [];
  const materialLineIds: string[] = [];
  const identityLineIds: string[] = [];
  const technologyLineIds: string[] = [];
  for (const rec of input.sidecar.records) {
    if (!isIkContinuationDue(rec, nowMs)) continue;
    if (rec.domain === "labor") laborLineIds.push(rec.lineId);
    else if (rec.domain === "material") materialLineIds.push(rec.lineId);
    else if (rec.domain === "identity") identityLineIds.push(rec.lineId);
    else if (rec.domain === "technology") technologyLineIds.push(rec.lineId);
  }
  return { laborLineIds, materialLineIds, identityLineIds, technologyLineIds };
}
