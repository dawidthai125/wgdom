/**
 * Source + extraction scoring for public KNR discovery.
 * Never auto-select first Google result — rank by evidence strength.
 */

import type { PublicKnrRecord, PublicKnrSourceKind } from "./ik-public-knr-types";
import type { KnrOnDemandMissKey } from "./knr-knowledge/knr-discovery-on-demand";
import {
  foldKnrDiscoveryCode,
  parseKnrDiscoveryExpectedTarget,
} from "./knr-knowledge/knr-discovery-fact-extract";

export type PublicKnrScoreContext = {
  miss: KnrOnDemandMissKey;
  expectedDisplayCode?: string;
  descriptionHint?: string | null;
  unitHint?: string | null;
};

export type PublicKnrScoredSource = {
  sourceId: string;
  sourceUrl: string;
  sourceKind: PublicKnrSourceKind;
  score: number;
  reasons: string[];
  paywall: boolean;
  accessible: boolean;
};

export type PublicKnrScoredRecord = {
  record: PublicKnrRecord;
  score: number;
  reasons: string[];
  crossFamilyRejected: boolean;
};

const OFFICIAL_KINDS = new Set<PublicKnrSourceKind>([
  "BIP",
  "GOVERNMENT",
  "LOCAL_GOV",
  "UNIVERSITY",
  "PUBLIC_TENDER",
]);

export function scorePublicKnrSource(
  source: {
    sourceId: string;
    sourceUrl: string;
    sourceKind: PublicKnrSourceKind;
    paywall?: boolean;
    accessible?: boolean;
    httpStatus?: number;
    hasStructuredTable?: boolean;
    hasExplicitPodstawa?: boolean;
  },
  ctx: PublicKnrScoreContext,
): PublicKnrScoredSource {
  let score = 0;
  const reasons: string[] = [];
  const paywall = source.paywall === true;
  const accessible = source.accessible !== false && !paywall;

  if (paywall) {
    return {
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl,
      sourceKind: source.sourceKind,
      score: -100,
      reasons: ["PAYWALL"],
      paywall: true,
      accessible: false,
    };
  }
  if (!accessible || (source.httpStatus != null && source.httpStatus >= 400)) {
    return {
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl,
      sourceKind: source.sourceKind,
      score: -100,
      reasons: ["SOURCE_INACCESSIBLE"],
      paywall: false,
      accessible: false,
    };
  }

  if (OFFICIAL_KINDS.has(source.sourceKind)) {
    score += 10;
    reasons.push("OFFICIAL_PUBLIC");
  }
  if (source.hasStructuredTable) {
    score += 10;
    reasons.push("STRUCTURED_TABLE");
  }
  if (source.hasExplicitPodstawa) {
    score += 5;
    reasons.push("EXPLICIT_PODSTAWA");
  }

  return {
    sourceId: source.sourceId,
    sourceUrl: source.sourceUrl,
    sourceKind: source.sourceKind,
    score,
    reasons,
    paywall: false,
    accessible: true,
  };
}

function familySectionItemKey(
  family: string,
  catalog: string | null,
  table: string,
  item: string,
): string {
  return [family, catalog ?? "", table, item].map((x) => String(x).trim().toUpperCase()).join("|");
}

export function scorePublicKnrExtractedRecord(
  record: PublicKnrRecord,
  ctx: PublicKnrScoreContext,
): PublicKnrScoredRecord {
  let score = 0;
  const reasons: string[] = [];
  const expected =
    parseKnrDiscoveryExpectedTarget(
      ctx.expectedDisplayCode ?? ctx.miss.displayCode ?? ctx.miss.evidenceKeyV1,
    ) ?? null;

  const recCatalog = record.catalogId ?? "";
  const recParts = String(record.positionCode ?? "").split("-");
  const recTable = recParts[0] ?? "";
  const recItem = recParts.slice(1).join("-") || record.positionCode;

  let crossFamilyRejected = false;

  if (expected) {
    const expKey = familySectionItemKey(
      expected.family,
      expected.catalog,
      expected.table,
      expected.item,
    );
    const recKey = familySectionItemKey(
      record.family === "OTHER" ? expected.family : record.family,
      recCatalog || expected.catalog,
      recTable || expected.table,
      recItem || expected.item,
    );
    const expFold = foldKnrDiscoveryCode(expKey);
    const recFold = foldKnrDiscoveryCode(recKey);

    if (expFold === recFold || foldKnrDiscoveryCode(record.positionCode) === `${expected.table}-${expected.item}`) {
      score += 40;
      reasons.push("EXACT_KNR_CODE");
    } else if (
      recTable === expected.table
      && recItem === expected.item
      && record.family !== expected.family
    ) {
      score -= 80;
      crossFamilyRejected = true;
      reasons.push("CROSS_FAMILY_MISMATCH");
    } else if (recTable !== expected.table || recItem !== expected.item) {
      score -= 80;
      reasons.push("CODE_MISMATCH");
    }
  }

  const descHint = String(ctx.descriptionHint ?? "").trim().toLowerCase();
  const recDesc = String(record.description ?? "").trim().toLowerCase();
  if (descHint && recDesc) {
    const words = descHint.split(/\s+/).filter((w) => w.length > 4).slice(0, 6);
    const hits = words.filter((w) => recDesc.includes(w)).length;
    if (hits >= 2) {
      score += 20;
      reasons.push("DESCRIPTION_FRAGMENT_MATCH");
    } else if (hits === 0 && words.length >= 2) {
      score -= 50;
      reasons.push("DESCRIPTION_CONFLICT");
    }
  }

  const unitHint = String(ctx.unitHint ?? "").trim().toLowerCase().replace(/\./g, "");
  const recUnit = String(record.unit ?? "").trim().toLowerCase().replace(/\./g, "");
  if (unitHint && recUnit) {
    if (unitHint === recUnit || (unitHint === "szt" && recUnit.startsWith("szt"))) {
      score += 10;
      reasons.push("UNIT_MATCH");
    } else {
      score -= 50;
      reasons.push("UNIT_CONFLICT");
    }
  }

  if (record.materials?.length) {
    score += 5;
    reasons.push("QUANTITY_OR_MATERIAL_PRESENT");
  }

  if (record.bomComplete) {
    score += 5;
    reasons.push("BOM_COMPLETE_HARD");
  }

  return {
    record,
    score: crossFamilyRejected ? Math.min(score, -80) : score,
    reasons,
    crossFamilyRejected,
  };
}

export function pickBestPublicKnrRecords(
  records: readonly PublicKnrRecord[],
  ctx: PublicKnrScoreContext,
  minScore = 0,
): PublicKnrScoredRecord[] {
  return records
    .map((r) => scorePublicKnrExtractedRecord(r, ctx))
    .filter((s) => !s.crossFamilyRejected && s.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
