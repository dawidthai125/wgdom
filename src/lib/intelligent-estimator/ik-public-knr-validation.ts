/**
 * Multi-source validation + cross-family safety for public KNR discovery.
 * HIGH confidence still → PENDING_VERIFY (never auto VERIFIED).
 */

import type { PublicKnrRecord } from "./ik-public-knr-types";
import type { KnrOnDemandMissKey } from "./knr-knowledge/knr-discovery-on-demand";
import {
  foldKnrDiscoveryCode,
  parseKnrDiscoveryExpectedTarget,
} from "./knr-knowledge/knr-discovery-fact-extract";
import {
  pickBestPublicKnrRecords,
  type PublicKnrScoredRecord,
} from "./ik-public-knr-scoring";

export type PublicKnrBomStatus =
  | "BOM_NOT_AVAILABLE"
  | "BOM_PARTIAL"
  | "BOM_COMPLETE"
  | "BOM_NOT_COMPLETE";

export type PublicKnrDiscoveryStatus =
  | "KNR_FOUND"
  | "KNR_VERIFIED_BY_MULTI_SOURCE"
  | "KNR_STAGED"
  | "NO_PUBLIC_EVIDENCE"
  | "IDENTITY_MISMATCH"
  | "CROSS_FAMILY_REJECT";

export type PublicKnrValidationConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type PublicKnrValidatedRecord = {
  record: PublicKnrRecord;
  score: number;
  confidence: PublicKnrValidationConfidence;
  verificationStatus: "PENDING_VERIFY";
  bomStatus: PublicKnrBomStatus;
  independentSourceCount: number;
  evidenceUrls: string[];
};

function normalizeDesc(s: string | null | undefined): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function normalizeUnit(s: string | null | undefined): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
}

function recordIdentityKey(record: PublicKnrRecord): string {
  const target = parseKnrDiscoveryExpectedTarget(
    [record.family, record.catalogId, record.positionCode].filter(Boolean).join(" "),
  );
  if (target) {
    return foldKnrDiscoveryCode(
      `${target.family}|${target.catalog}|${target.table}|${target.item}`,
    );
  }
  return foldKnrDiscoveryCode(`${record.family}|${record.catalogId}|${record.positionCode}`);
}

function recordsAgree(a: PublicKnrRecord, b: PublicKnrRecord): boolean {
  if (recordIdentityKey(a) !== recordIdentityKey(b)) return false;
  const da = normalizeDesc(a.description);
  const db = normalizeDesc(b.description);
  if (da && db) {
    const aWords = da.split(" ").filter((w) => w.length > 4);
    const overlap = aWords.filter((w) => db.includes(w)).length;
    if (overlap < 2 && da.slice(0, 20) !== db.slice(0, 20)) return false;
  }
  const ua = normalizeUnit(a.unit);
  const ub = normalizeUnit(b.unit);
  if (ua && ub && ua !== ub && !(ua.startsWith("szt") && ub.startsWith("szt"))) {
    return false;
  }
  return true;
}

export function derivePublicKnrBomStatus(record: PublicKnrRecord): PublicKnrBomStatus {
  if (record.bomComplete && record.materials?.length) return "BOM_COMPLETE";
  if (record.materials?.length) return "BOM_PARTIAL";
  if (record.description && record.unit) return "BOM_NOT_COMPLETE";
  return "BOM_NOT_AVAILABLE";
}

/**
 * Hard gate: reject when family+section+item conflicts with expected miss identity.
 */
export function validateCrossFamilySafety(
  record: PublicKnrRecord,
  miss: KnrOnDemandMissKey,
): { ok: boolean; reason?: "CROSS_FAMILY_MISMATCH" | "CODE_MISMATCH" } {
  const expected = parseKnrDiscoveryExpectedTarget(
    miss.displayCode ?? miss.evidenceKeyV1,
  );
  if (!expected) return { ok: true };

  const parts = String(record.positionCode ?? "").split("-");
  const recTable = parts[0] ?? "";
  const recItem = parts.slice(1).join("-") || record.positionCode;
  const recCatalog = String(record.catalogId ?? "").trim();

  const tableMatch = !recTable || recTable === expected.table;
  const itemMatch = !recItem || recItem === expected.item;
  const familyMatch =
    record.family === "OTHER"
    || record.family === expected.family
    || foldKnrDiscoveryCode(record.family) === foldKnrDiscoveryCode(expected.family);

  const catalogMatch =
    !recCatalog
    || !expected.catalog
    || recCatalog.replace(/\s/g, "") === expected.catalog.replace(/\s/g, "");

  if (!tableMatch || !itemMatch) {
    return { ok: false, reason: "CODE_MISMATCH" };
  }
  if (!catalogMatch && recTable === expected.table && recItem === expected.item) {
    return { ok: false, reason: "CROSS_FAMILY_MISMATCH" };
  }
  if (!familyMatch && recTable === expected.table && recItem === expected.item) {
    return { ok: false, reason: "CROSS_FAMILY_MISMATCH" };
  }
  return { ok: true };
}

export function validateMultiSourcePublicKnr(opts: {
  records: readonly PublicKnrRecord[];
  miss: KnrOnDemandMissKey;
  descriptionHint?: string | null;
  unitHint?: string | null;
}): {
  validated: PublicKnrValidatedRecord[];
  discoveryStatus: PublicKnrDiscoveryStatus;
  confidence: PublicKnrValidationConfidence;
  rejectedCrossFamily: number;
} {
  const ctx = {
    miss: opts.miss,
    expectedDisplayCode: opts.miss.displayCode,
    descriptionHint: opts.descriptionHint,
    unitHint: opts.unitHint,
  };

  let rejectedCrossFamily = 0;
  const safeRecords: PublicKnrRecord[] = [];
  for (const r of opts.records) {
    const gate = validateCrossFamilySafety(r, opts.miss);
    if (!gate.ok) {
      rejectedCrossFamily += 1;
      continue;
    }
    safeRecords.push(r);
  }

  const scored = pickBestPublicKnrRecords(safeRecords, ctx, -79);
  if (!scored.length) {
    return {
      validated: [],
      discoveryStatus: rejectedCrossFamily
        ? "CROSS_FAMILY_REJECT"
        : "NO_PUBLIC_EVIDENCE",
      confidence: "NONE",
      rejectedCrossFamily,
    };
  }

  const best = scored[0]!;
  const independentUrls = new Set<string>();
  const agreeing: PublicKnrRecord[] = [best.record];
  for (const s of scored.slice(1)) {
    if (recordsAgree(best.record, s.record)) {
      agreeing.push(s.record);
      independentUrls.add(s.record.sourceUrl);
    }
  }
  independentUrls.add(best.record.sourceUrl);
  const independentSourceCount = independentUrls.size;

  let confidence: PublicKnrValidationConfidence = "LOW";
  if (independentSourceCount >= 3 && best.score >= 50) confidence = "HIGH";
  else if (independentSourceCount >= 2 && best.score >= 30) confidence = "HIGH";
  else if (best.score >= 20) confidence = "MEDIUM";

  const discoveryStatus: PublicKnrDiscoveryStatus =
    independentSourceCount >= 2
      ? "KNR_VERIFIED_BY_MULTI_SOURCE"
      : "KNR_FOUND";

  const bomStatus = derivePublicKnrBomStatus(best.record);

  return {
    validated: [
      {
        record: best.record,
        score: best.score,
        confidence,
        verificationStatus: "PENDING_VERIFY",
        bomStatus,
        independentSourceCount,
        evidenceUrls: [...independentUrls],
      },
    ],
    discoveryStatus,
    confidence,
    rejectedCrossFamily,
  };
}

export function groupScoredRecordsBySource(
  scored: readonly PublicKnrScoredRecord[],
): Map<string, PublicKnrScoredRecord[]> {
  const m = new Map<string, PublicKnrScoredRecord[]>();
  for (const s of scored) {
    const k = s.record.sourceId;
    const arr = m.get(k) ?? [];
    arr.push(s);
    m.set(k, arr);
  }
  return m;
}
