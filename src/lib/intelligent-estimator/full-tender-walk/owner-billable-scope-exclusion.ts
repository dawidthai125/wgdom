/**
 * IK-CLOSURE-WAVE1 — Owner-gated EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE.
 *
 * Thin CONNECT only · NOT a pricing/research/finance engine.
 * Exclusion requires literal ownerApproved === true — never inferred.
 * EXCLUSION ≠ POSITION_COMPLETE ≠ CALCULATED ≠ READY_TO_BID.
 *
 * Durable on TenderPackage wrapper (same pattern as ikContinuation).
 * OfferBoq schema untouched.
 */

import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { getTenderPackage, upsertTenderPackage } from "@/lib/multi-dwelling/store";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

export const IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON =
  "EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE" as const;

export const IK_OWNER_BILLABLE_SCOPE_EXCLUSION_SCHEMA_VERSION = 1 as const;

export type IkOwnerBillableScopeExclusionRecord = {
  tenderId: string;
  lineId: string;
  dwellingId: string;
  /** HARD gate — only literal true admits exclusion. */
  ownerApproved: true;
  approvedAt: string;
  approvedBy: string | null;
  reason: typeof IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON;
  notes: string | null;
};

export type IkOwnerBillableScopeExclusionSidecar = {
  schemaVersion: typeof IK_OWNER_BILLABLE_SCOPE_EXCLUSION_SCHEMA_VERSION;
  records: IkOwnerBillableScopeExclusionRecord[];
  updatedAt: string;
};

export function emptyOwnerBillableScopeExclusionSidecar(
  nowIso = new Date().toISOString(),
): IkOwnerBillableScopeExclusionSidecar {
  return {
    schemaVersion: IK_OWNER_BILLABLE_SCOPE_EXCLUSION_SCHEMA_VERSION,
    records: [],
    updatedAt: nowIso,
  };
}

/**
 * Pure admission — absence / false / non-true ⇒ EXCLUSION = FALSE.
 */
export function isOwnerApprovedBillableScopeExclusion(
  raw: unknown,
): raw is IkOwnerBillableScopeExclusionRecord {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Partial<IkOwnerBillableScopeExclusionRecord>;
  if (r.ownerApproved !== true) return false;
  if (r.reason !== IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON) return false;
  const tenderId = String(r.tenderId ?? "").trim();
  const lineId = String(r.lineId ?? "").trim();
  if (!tenderId || !lineId) return false;
  return true;
}

export function normalizeOwnerBillableScopeExclusionSidecar(
  raw: unknown,
): IkOwnerBillableScopeExclusionSidecar | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<IkOwnerBillableScopeExclusionSidecar>;
  if (r.schemaVersion !== 1) return null;
  const records: IkOwnerBillableScopeExclusionRecord[] = [];
  if (Array.isArray(r.records)) {
    for (const item of r.records) {
      if (!isOwnerApprovedBillableScopeExclusion(item)) continue;
      records.push({
        tenderId: String(item.tenderId).trim(),
        lineId: String(item.lineId).trim(),
        dwellingId: normalizeDwellingId(item.dwellingId),
        ownerApproved: true,
        approvedAt: String(item.approvedAt || "") || new Date().toISOString(),
        approvedBy: item.approvedBy != null ? String(item.approvedBy) : null,
        reason: IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON,
        notes: item.notes != null ? String(item.notes) : null,
      });
    }
  }
  return {
    schemaVersion: 1,
    records,
    updatedAt: String(r.updatedAt || "") || new Date().toISOString(),
  };
}

export function buildOwnerBillableScopeExclusionKey(input: {
  tenderId: string;
  dwellingId?: string | null;
  lineId: string;
}): string {
  return [
    String(input.tenderId || "").trim(),
    normalizeDwellingId(input.dwellingId),
    String(input.lineId || "").trim(),
  ].join("|");
}

/**
 * LineIds with Owner-approved exclusion for tender (optional dwelling filter).
 * Soft HOLD / CONFLICT / MISS never appear here without ownerApproved===true record.
 */
export function listOwnerApprovedExcludedLineIds(input: {
  sidecar: IkOwnerBillableScopeExclusionSidecar | null | undefined;
  tenderId: string;
  dwellingId?: string | null;
}): string[] {
  const tid = String(input.tenderId || "").trim();
  if (!tid || !input.sidecar?.records?.length) return [];
  const dwFilter =
    input.dwellingId != null && String(input.dwellingId).trim()
      ? normalizeDwellingId(input.dwellingId)
      : null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const rec of input.sidecar.records) {
    if (!isOwnerApprovedBillableScopeExclusion(rec)) continue;
    if (rec.tenderId !== tid) continue;
    // When dwelling scoped: match that dwelling or DEFAULT (package-wide Owner mark).
    if (
      dwFilter
      && rec.dwellingId !== dwFilter
      && rec.dwellingId !== "DEFAULT"
    ) {
      continue;
    }
    if (seen.has(rec.lineId)) continue;
    seen.add(rec.lineId);
    out.push(rec.lineId);
  }
  return out;
}

export function lineIdSetFromOwnerExclusions(
  lineIds: readonly string[],
): ReadonlySet<string> {
  return new Set(
    lineIds.map((id) => String(id || "").trim()).filter(Boolean),
  );
}

export function upsertOwnerBillableScopeExclusion(input: {
  sidecar: IkOwnerBillableScopeExclusionSidecar;
  tenderId: string;
  lineId: string;
  dwellingId?: string | null;
  /** Must be literal true — otherwise no-op (safety). */
  ownerApproved: true;
  approvedBy?: string | null;
  notes?: string | null;
  nowIso?: string;
}): IkOwnerBillableScopeExclusionSidecar {
  if (input.ownerApproved !== true) {
    return input.sidecar;
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  const tenderId = String(input.tenderId || "").trim();
  const lineId = String(input.lineId || "").trim();
  if (!tenderId || !lineId) return input.sidecar;
  const dwellingId = normalizeDwellingId(input.dwellingId);
  const nextRec: IkOwnerBillableScopeExclusionRecord = {
    tenderId,
    lineId,
    dwellingId,
    ownerApproved: true,
    approvedAt: nowIso,
    approvedBy: input.approvedBy != null ? String(input.approvedBy) : null,
    reason: IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON,
    notes: input.notes != null ? String(input.notes) : null,
  };
  const key = buildOwnerBillableScopeExclusionKey(nextRec);
  const records = input.sidecar.records.filter(
    (r) => buildOwnerBillableScopeExclusionKey(r) !== key,
  );
  records.push(nextRec);
  return {
    schemaVersion: 1,
    records,
    updatedAt: nowIso,
  };
}

export function removeOwnerBillableScopeExclusion(input: {
  sidecar: IkOwnerBillableScopeExclusionSidecar;
  tenderId: string;
  lineId: string;
  dwellingId?: string | null;
  nowIso?: string;
}): IkOwnerBillableScopeExclusionSidecar {
  const key = buildOwnerBillableScopeExclusionKey({
    tenderId: input.tenderId,
    dwellingId: input.dwellingId,
    lineId: input.lineId,
  });
  return {
    schemaVersion: 1,
    records: input.sidecar.records.filter(
      (r) => buildOwnerBillableScopeExclusionKey(r) !== key,
    ),
    updatedAt: input.nowIso ?? new Date().toISOString(),
  };
}

export function loadOwnerBillableScopeExclusionFromPackage(
  pkg: TenderPackage | null | undefined,
): IkOwnerBillableScopeExclusionSidecar {
  return (
    normalizeOwnerBillableScopeExclusionSidecar(pkg?.ikBillableScopeExclusions)
    ?? emptyOwnerBillableScopeExclusionSidecar()
  );
}

export function persistOwnerBillableScopeExclusionOnPackage(input: {
  tenderId: string;
  package?: TenderPackage | null;
  sidecar: IkOwnerBillableScopeExclusionSidecar;
}): TenderPackage {
  const tid = String(input.tenderId || "").trim();
  const base =
    input.package
    ?? getTenderPackage(tid)
    ?? ({
      tenderId: tid,
      expectedDwellingCount: 1,
      dwellings: [],
      mode: "legacy_single" as const,
      documentToDwelling: {},
    } satisfies TenderPackage);
  const next: TenderPackage = {
    ...base,
    tenderId: tid || base.tenderId,
    ikBillableScopeExclusions: {
      schemaVersion: 1,
      records: input.sidecar.records.filter(isOwnerApprovedBillableScopeExclusion),
      updatedAt: input.sidecar.updatedAt,
    },
  };
  upsertTenderPackage(next);
  return next;
}
