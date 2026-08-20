/**
 * IK-HISTORICAL-EXECUTED-ATH — build in-memory index (READ-ONLY).
 *
 * REUSE parseAthKnrNormExport · ZERO Catalog / KL-6 / write-router.
 */

import { buildKnrNormContentHash } from "@/lib/intelligent-estimator/knr-knowledge/knr-content-hash";
import {
  parseAthKnrNormExport,
  type KnrParsedAthPosition,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-export-parser";
import type { KnrNormBundle } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-entry-types";
import {
  buildDisplayKeyFromParts,
  buildFamilyCatalogKey,
  normalizeHistoricalDisplayCode,
  parseDisplayCodeParts,
  summarizeMaterialNorms,
} from "./historical-executed-normalize";
import type {
  HistoricalConflict,
  HistoricalConflictVariant,
  HistoricalExecutedIndex,
  HistoricalExecutedOccurrence,
  HistoricalExecutedSourceRef,
  HistoricalRmsClass,
} from "./historical-executed-types";
import { HISTORICAL_EXECUTED_SCHEMA_VERSION } from "./historical-executed-types";

export type HistoricalAthSourceInput = {
  bytes: Uint8Array;
  jobId: string;
  address: string;
  filename: string;
  storagePath: string;
  contentSha256: string;
  jobStatus?: string;
};

function isFullNorms(norms: KnrNormBundle): boolean {
  return (
    norms.laborNorms.length > 0
    && norms.materialNorms.length > 0
    && norms.equipmentNorms.length > 0
  );
}

function rmsClassOf(norms: KnrNormBundle): HistoricalRmsClass {
  if (isFullNorms(norms)) return "FULL_RMS";
  if (
    norms.laborNorms.length
    || norms.materialNorms.length
    || norms.equipmentNorms.length
  ) {
    return "PARTIAL_RMS";
  }
  return "NO_RMS";
}

function emptyNorms(): KnrNormBundle {
  return { laborNorms: [], materialNorms: [], equipmentNorms: [] };
}

function positionToOccurrence(
  pos: KnrParsedAthPosition,
  source: HistoricalExecutedSourceRef,
  ordinal: number,
): HistoricalExecutedOccurrence {
  const parts = parseDisplayCodeParts(pos.displayCode) ?? {
    family: pos.identity.family,
    catalogId: pos.identity.catalog,
    tableCode: `${pos.identity.table}-${pos.identity.column}`,
  };
  const norms = pos.norms ?? emptyNorms();
  const rmsClass = rmsClassOf(norms);
  const contentHash = rmsClass === "FULL_RMS" ? buildKnrNormContentHash(norms) : null;
  return {
    occurrenceId: `${source.jobId}:${source.contentSha256.slice(0, 12)}:${ordinal}:${normalizeHistoricalDisplayCode(pos.displayCode)}`,
    source,
    displayCode: normalizeHistoricalDisplayCode(pos.displayCode),
    family: parts.family,
    catalogId: parts.catalogId,
    tableCode: parts.tableCode,
    description: pos.description,
    unit: pos.unit,
    quantity: Number.isFinite(pos.positionQuantity) ? pos.positionQuantity : null,
    identityKeyV2: pos.identityKeyV2 || null,
    chapter: pos.chapter,
    publisher: pos.publisher || null,
    edition: pos.edition || null,
    rmsClass,
    norms: rmsClass === "NO_RMS" ? null : norms,
    contentHash,
    observedCost: null,
  };
}

function detectConflictForDisplay(
  displayCode: string,
  rows: HistoricalExecutedOccurrence[],
): HistoricalConflict | null {
  if (rows.length < 2) return null;

  const identityKeys = new Set(
    rows.map((r) => r.identityKeyV2).filter((x): x is string => Boolean(x)),
  );
  const chapters = new Set(
    rows.map((r) => (r.chapter ?? "").trim()).filter(Boolean),
  );
  const fullHashes = new Set(
    rows
      .filter((r) => r.rmsClass === "FULL_RMS" && r.contentHash)
      .map((r) => r.contentHash as string),
  );

  const reasonCodes: string[] = [];
  let kind: HistoricalConflict["kind"] | null = null;

  if (identityKeys.size >= 2) {
    kind = "IDENTITY_SPLIT";
    reasonCodes.push("MULTIPLE_IDENTITY_KEY_V2");
  }
  if (fullHashes.size >= 2) {
    kind = kind ?? "RMS_HASH_SPLIT";
    reasonCodes.push("MULTIPLE_FULL_CONTENT_HASH");
  }
  if (identityKeys.size >= 2 && chapters.size >= 2) {
    kind = "CHAPTER_DOMAIN";
    reasonCodes.push("CHAPTER_DOMAIN_FOLD");
  }

  // Material qty regime split (same identity, different primary M qty signature)
  if (!kind && identityKeys.size <= 1 && fullHashes.size >= 2) {
    kind = "RMS_HASH_SPLIT";
  }

  // Explicit material summary divergence with different hashes or chapters
  const matSigs = new Set(
    rows.map((r) => summarizeMaterialNorms(r.norms)).filter((x): x is string => Boolean(x)),
  );
  if (!kind && matSigs.size >= 2 && (identityKeys.size >= 2 || fullHashes.size >= 2 || chapters.size >= 2)) {
    kind = "MATERIAL_VARIANT";
    reasonCodes.push("MATERIAL_VARIANT_SPLIT");
  }

  if (!kind) return null;

  const variantMap = new Map<string, HistoricalConflictVariant>();
  for (const r of rows) {
    const vk = `${r.identityKeyV2 ?? ""}|${r.contentHash ?? ""}|${r.chapter ?? ""}`;
    const existing = variantMap.get(vk);
    if (existing) {
      if (!existing.sourceJobIds.includes(r.source.jobId)) {
        existing.sourceJobIds.push(r.source.jobId);
      }
      continue;
    }
    variantMap.set(vk, {
      identityKeyV2: r.identityKeyV2,
      chapter: r.chapter,
      contentHash: r.contentHash,
      description: r.description,
      materialSummary: summarizeMaterialNorms(r.norms),
      sourceJobIds: [r.source.jobId],
    });
  }

  return {
    kind,
    displayCode,
    reasonCodes: [...new Set(reasonCodes)],
    variants: [...variantMap.values()],
  };
}

/** Build index from pre-normalized occurrences (tests / shadow). */
export function buildHistoricalExecutedIndexFromOccurrences(
  occurrences: HistoricalExecutedOccurrence[],
): HistoricalExecutedIndex {
  const byDisplayCode = new Map<string, HistoricalExecutedOccurrence[]>();
  const byIdentityKeyV2 = new Map<string, HistoricalExecutedOccurrence[]>();
  const byFamilyCatalog = new Map<string, HistoricalExecutedOccurrence[]>();
  const conflictsByDisplayCode = new Map<string, HistoricalConflict>();
  const sources = new Set<string>();

  for (const occ of occurrences) {
    const dc = normalizeHistoricalDisplayCode(occ.displayCode);
    sources.add(occ.source.contentSha256 || occ.source.storagePath);
    if (!byDisplayCode.has(dc)) byDisplayCode.set(dc, []);
    byDisplayCode.get(dc)!.push(occ);

    if (occ.identityKeyV2) {
      if (!byIdentityKeyV2.has(occ.identityKeyV2)) byIdentityKeyV2.set(occ.identityKeyV2, []);
      byIdentityKeyV2.get(occ.identityKeyV2)!.push(occ);
    }

    const fk = buildFamilyCatalogKey(occ.family, occ.catalogId);
    if (fk) {
      if (!byFamilyCatalog.has(fk)) byFamilyCatalog.set(fk, []);
      byFamilyCatalog.get(fk)!.push(occ);
    }
  }

  for (const [dc, rows] of byDisplayCode) {
    const conflict = detectConflictForDisplay(dc, rows);
    if (conflict) conflictsByDisplayCode.set(dc, conflict);
  }

  return {
    schemaVersion: HISTORICAL_EXECUTED_SCHEMA_VERSION,
    occurrences: [...occurrences],
    byDisplayCode,
    byIdentityKeyV2,
    byFamilyCatalog,
    conflictsByDisplayCode,
    sourceCount: sources.size,
    authority: false,
  };
}

/** Parse ATH bytes → occurrences → index (includeIncompleteRms). */
export function buildHistoricalExecutedIndexFromAthSources(
  sources: HistoricalAthSourceInput[],
): HistoricalExecutedIndex {
  const occurrences: HistoricalExecutedOccurrence[] = [];
  let ordinal = 0;

  for (const src of sources) {
    const source: HistoricalExecutedSourceRef = {
      jobId: src.jobId,
      address: src.address,
      filename: src.filename,
      storagePath: src.storagePath,
      contentSha256: src.contentSha256,
      jobStatus: src.jobStatus ?? "completed",
    };
    const parsed = parseAthKnrNormExport(src.bytes, {
      knrFamilyOnly: true,
      includeIncompleteRms: true,
    });
    if (!parsed.ok) continue;
    for (const pos of parsed.positions) {
      occurrences.push(positionToOccurrence(pos, source, ordinal++));
    }
  }

  return buildHistoricalExecutedIndexFromOccurrences(occurrences);
}

export function emptyHistoricalExecutedIndex(): HistoricalExecutedIndex {
  return buildHistoricalExecutedIndexFromOccurrences([]);
}

/** Helper for tests — occurrence factory. */
export function makeHistoricalOccurrence(
  partial: Partial<HistoricalExecutedOccurrence> & {
    displayCode: string;
    jobId: string;
  },
): HistoricalExecutedOccurrence {
  const parts = parseDisplayCodeParts(partial.displayCode) ?? {
    family: "KNR",
    catalogId: "0-00",
    tableCode: "0000-00",
  };
  const displayCode = normalizeHistoricalDisplayCode(partial.displayCode);
  const norms = partial.norms ?? null;
  const rmsClass =
    partial.rmsClass
    ?? (norms ? rmsClassOf(norms) : "NO_RMS");
  return {
    occurrenceId: partial.occurrenceId ?? `${partial.jobId}:${displayCode}`,
    source: partial.source ?? {
      jobId: partial.jobId,
      address: partial.source?.address ?? `addr-${partial.jobId}`,
      filename: partial.source?.filename ?? `${partial.jobId}.ath`,
      storagePath: partial.source?.storagePath ?? `jobs/${partial.jobId}/kosztorys.ath`,
      contentSha256: partial.source?.contentSha256 ?? `sha-${partial.jobId}`,
      jobStatus: "completed",
    },
    displayCode,
    family: partial.family ?? parts.family,
    catalogId: partial.catalogId ?? parts.catalogId,
    tableCode: partial.tableCode ?? parts.tableCode,
    description: partial.description ?? "historical occurrence",
    unit: partial.unit ?? "m2",
    quantity: partial.quantity ?? 1,
    identityKeyV2: partial.identityKeyV2 ?? null,
    chapter: partial.chapter ?? null,
    publisher: partial.publisher ?? null,
    edition: partial.edition ?? null,
    rmsClass,
    norms,
    contentHash: partial.contentHash ?? null,
    observedCost: partial.observedCost ?? null,
  };
}

export function displayKeyFromOccurrence(occ: HistoricalExecutedOccurrence): string {
  return (
    buildDisplayKeyFromParts(occ.family, occ.catalogId, occ.tableCode)
    ?? normalizeHistoricalDisplayCode(occ.displayCode)
  );
}
