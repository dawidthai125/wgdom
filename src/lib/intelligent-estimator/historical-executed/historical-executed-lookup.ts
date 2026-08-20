/**
 * IK-HISTORICAL-EXECUTED-ATH — pure lookup (READ-ONLY · deterministic).
 *
 * L0–L5 frozen (DF). L4 SEMANTIC = OFF (returns not used as EXACT).
 * CONFLICT fail-closed · MISS first-class · authority always false.
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import {
  buildFamilyCatalogKey,
  displayKeysFromCatalogBasis,
  normalizeHistoricalDisplayCode,
} from "./historical-executed-normalize";
import type {
  HistoricalConfidence,
  HistoricalExecutedIndex,
  HistoricalExecutedOccurrence,
  HistoricalLookupResult,
  HistoricalMatchKind,
  HistoricalMatchLevel,
} from "./historical-executed-types";
import { HISTORICAL_EXECUTED_SCHEMA_VERSION } from "./historical-executed-types";

export type HistoricalLookupQuery = {
  lineId: string;
  catalogBasis: CatalogBasis | null;
  description?: string | null;
  /** Only when truly known — NEVER invent from PDF. */
  identityKeyV2?: string | null;
};

function miss(lineId: string): HistoricalLookupResult {
  return {
    schemaVersion: HISTORICAL_EXECUTED_SCHEMA_VERSION,
    lineId,
    kind: "HISTORICAL_MISS",
    matchLevel: 5,
    confidence: null,
    authority: false,
    occurrenceCount: 0,
    exactOccurrenceCount: 0,
    familyOccurrenceCount: 0,
    distinctJobCount: 0,
    distinctSourceCount: 0,
    fullRmsCount: 0,
    rmsAgreement: "N_A",
    displayCode: null,
    identityKeyV2: null,
    contentHashSet: [],
    sourceJobs: [],
    sourceAth: [],
    sampleDescriptions: [],
    chapters: [],
    conflict: null,
    evidenceRef: `hist:miss:${lineId}`,
    softLaborHintPl: null,
    softMaterialHintPl: null,
  };
}

function uniqueJobs(rows: HistoricalExecutedOccurrence[]): Array<{ jobId: string; address: string }> {
  const m = new Map<string, string>();
  for (const r of rows) m.set(r.source.jobId, r.source.address);
  return [...m.entries()].map(([jobId, address]) => ({ jobId, address }));
}

function uniqueAth(rows: HistoricalExecutedOccurrence[]) {
  const m = new Map<string, HistoricalExecutedOccurrence["source"]>();
  for (const r of rows) m.set(r.source.storagePath || r.source.contentSha256, r.source);
  return [...m.values()].map((s) => ({
    filename: s.filename,
    storagePath: s.storagePath,
    contentSha256: s.contentSha256,
  }));
}

function pack(
  lineId: string,
  kind: HistoricalMatchKind,
  matchLevel: HistoricalMatchLevel,
  confidence: HistoricalConfidence,
  rows: HistoricalExecutedOccurrence[],
  conflict: HistoricalLookupResult["conflict"],
  familyOccurrenceCount: number,
): HistoricalLookupResult {
  const full = rows.filter((r) => r.rmsClass === "FULL_RMS");
  const hashes = [...new Set(full.map((r) => r.contentHash).filter((x): x is string => Boolean(x)))];
  const jobs = uniqueJobs(rows);
  const ath = uniqueAth(rows);
  const chapters = [...new Set(rows.map((r) => r.chapter).filter((x): x is string => Boolean(x)))];
  const identities = [...new Set(rows.map((r) => r.identityKeyV2).filter((x): x is string => Boolean(x)))];

  let rmsAgreement: HistoricalLookupResult["rmsAgreement"] = "N_A";
  if (conflict) rmsAgreement = "CONFLICT";
  else if (full.length === 0) rmsAgreement = "UNKNOWN";
  else if (hashes.length <= 1) rmsAgreement = "CONSISTENT";
  else rmsAgreement = "MIXED";

  const softLabor =
    full[0]?.norms?.laborNorms?.[0]
      ? `Historyczne wykonanie WGDOM zawierało nakład R=${full[0].norms.laborNorms[0].quantity} ${full[0].norms.laborNorms[0].unit} (tylko evidence — nie aktualna stawka robocizny).`
      : null;
  const softMat =
    full[0]?.norms?.materialNorms?.[0]
      ? `Historyczne wykonanie WGDOM zawierało materiał: ${full[0].norms.materialNorms[0].description} (tylko evidence — nie aktualna cena rynkowa).`
      : null;

  return {
    schemaVersion: HISTORICAL_EXECUTED_SCHEMA_VERSION,
    lineId,
    kind,
    matchLevel,
    confidence,
    authority: false,
    occurrenceCount: rows.length,
    exactOccurrenceCount: kind === "HISTORICAL_FAMILY" || kind === "HISTORICAL_MISS" ? 0 : rows.length,
    familyOccurrenceCount,
    distinctJobCount: jobs.length,
    distinctSourceCount: ath.length,
    fullRmsCount: full.length,
    rmsAgreement,
    displayCode: rows[0]?.displayCode ?? null,
    identityKeyV2: identities.length === 1 ? identities[0]! : identities[0] ?? null,
    contentHashSet: hashes,
    sourceJobs: jobs,
    sourceAth: ath,
    sampleDescriptions: [...new Set(rows.map((r) => r.description))].slice(0, 5),
    chapters,
    conflict,
    evidenceRef: `hist:${kind}:${lineId}:${rows[0]?.displayCode ?? "none"}`,
    softLaborHintPl: kind === "HISTORICAL_CONFLICT" ? null : softLabor,
    softMaterialHintPl: kind === "HISTORICAL_CONFLICT" ? null : softMat,
  };
}

/**
 * Pure historical lookup for one Master BOQ / tender line.
 */
export function lookupHistoricalExecuted(
  query: HistoricalLookupQuery,
  index: HistoricalExecutedIndex | null | undefined,
): HistoricalLookupResult {
  const lineId = String(query.lineId ?? "").trim() || "unknown";
  if (!index || index.occurrences.length === 0) return miss(lineId);

  const displayKeys = displayKeysFromCatalogBasis(query.catalogBasis, query.description);
  const identityQ = String(query.identityKeyV2 ?? "").trim() || null;
  const familyKey = buildFamilyCatalogKey(
    query.catalogBasis?.family,
    query.catalogBasis?.catalogId,
  );

  // CONFLICT on any candidate display key — fail-closed (no majority).
  for (const dk of displayKeys) {
    const conflict = index.conflictsByDisplayCode.get(dk) ?? null;
    if (conflict) {
      const rows = index.byDisplayCode.get(dk) ?? [];
      const familyRows = familyKey ? (index.byFamilyCatalog.get(familyKey) ?? []) : [];
      return pack(
        lineId,
        "HISTORICAL_CONFLICT",
        2,
        null,
        rows.length ? rows : familyRows,
        conflict,
        familyRows.length,
      );
    }
  }

  // L0 / L1 — only with real identityKeyV2 (never invent).
  if (identityQ) {
    const idRows = index.byIdentityKeyV2.get(identityQ) ?? [];
    if (idRows.length > 0) {
      // If any display of these rows is in conflict map — conflict
      for (const r of idRows) {
        const c = index.conflictsByDisplayCode.get(normalizeHistoricalDisplayCode(r.displayCode));
        if (c) {
          return pack(lineId, "HISTORICAL_CONFLICT", 1, null, idRows, c, idRows.length);
        }
      }
      const fullConsistent =
        idRows.some((r) => r.rmsClass === "FULL_RMS")
        && new Set(
          idRows
            .filter((r) => r.rmsClass === "FULL_RMS" && r.contentHash)
            .map((r) => r.contentHash as string),
        ).size <= 1;

      if (fullConsistent && idRows.some((r) => r.rmsClass === "FULL_RMS")) {
        const fullRows = idRows.filter((r) => r.rmsClass === "FULL_RMS");
        return pack(lineId, "HISTORICAL_EXACT_RMS", 0, "HIGH", fullRows, null, idRows.length);
      }
      return pack(lineId, "HISTORICAL_EXACT", 1, "HIGH", idRows, null, idRows.length);
    }
  }

  // L2 — exact display
  for (const dk of displayKeys) {
    const rows = index.byDisplayCode.get(dk) ?? [];
    if (rows.length === 0) continue;
    const full = rows.filter((r) => r.rmsClass === "FULL_RMS");
    const hashes = new Set(full.map((r) => r.contentHash).filter(Boolean));
    if (full.length > 0 && hashes.size <= 1 && !identityQ) {
      // Display-exact with FULL RMS but no query identity → EXACT (L2), not L0
      return pack(lineId, "HISTORICAL_EXACT", 2, "MED", rows, null, rows.length);
    }
    if (full.length > 0 && hashes.size <= 1 && identityQ) {
      return pack(lineId, "HISTORICAL_EXACT_RMS", 0, "HIGH", full, null, rows.length);
    }
    return pack(lineId, "HISTORICAL_EXACT", 2, "MED", rows, null, rows.length);
  }

  // L3 — family only
  if (familyKey) {
    const familyRows = index.byFamilyCatalog.get(familyKey) ?? [];
    if (familyRows.length > 0) {
      return pack(lineId, "HISTORICAL_FAMILY", 3, "LOW", familyRows, null, familyRows.length);
    }
  }

  // L4 SEMANTIC — OFF in MVP (DF OD-HDF-1)
  return miss(lineId);
}

export function summarizeHistoricalKinds(
  results: HistoricalLookupResult[],
): Record<HistoricalMatchKind, number> {
  const out: Record<HistoricalMatchKind, number> = {
    HISTORICAL_EXACT_RMS: 0,
    HISTORICAL_EXACT: 0,
    HISTORICAL_FAMILY: 0,
    HISTORICAL_CONFLICT: 0,
    HISTORICAL_MISS: 0,
  };
  for (const r of results) out[r.kind] += 1;
  return out;
}
