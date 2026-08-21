/**
 * IK-KNR KL-0 — KnrKnowledgeEnvelope (side-channel · report immutable).
 *
 * KNR Expert READ consumer (KL-4+) · does NOT mutate catalogBasis / knrHint / catalogWorkId.
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrLookupStatus } from "./types";
import type { KnrNormBundle } from "./knr-catalog-entry-types";

export type KnrKnowledgeLineResult = {
  lineId: string;
  catalogBasis: CatalogBasis;
  lookupStatus: KnrLookupStatus;
  identityKeyV2?: string | null;
  evidenceKeyV1?: string | null;
  normBundle?: KnrNormBundle;
  stale?: boolean;
  gapReason?: string | null;
};

export type KnrKnowledgeSummary = {
  hits: number;
  misses: number;
  staleHits: number;
  conflicts: number;
  legalBlocks: number;
  researchExecuted: boolean;
  httpRequestCount: number;
};

/** Alias: KnrKnowledge contract per DESIGN FREEZE §7.3 */
export type KnrKnowledgeEnvelope = {
  tenderId: string;
  schemaVersion: 1;
  lineResults: KnrKnowledgeLineResult[];
  summary: KnrKnowledgeSummary;
};

export const EMPTY_KNR_KNOWLEDGE_SUMMARY: KnrKnowledgeSummary = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  conflicts: 0,
  legalBlocks: 0,
  researchExecuted: false,
  httpRequestCount: 0,
};

export function createEmptyKnrKnowledgeEnvelope(tenderId: string): KnrKnowledgeEnvelope {
  return {
    tenderId,
    schemaVersion: 1,
    lineResults: [],
    summary: { ...EMPTY_KNR_KNOWLEDGE_SUMMARY },
  };
}

export function summarizeKnrKnowledgeLines(
  lines: readonly KnrKnowledgeLineResult[],
  extras?: { researchExecuted?: boolean; httpRequestCount?: number },
): KnrKnowledgeSummary {
  let hits = 0;
  let misses = 0;
  let staleHits = 0;
  let conflicts = 0;
  let legalBlocks = 0;

  for (const line of lines) {
    switch (line.lookupStatus) {
      case "LOCAL_HIT":
        hits += 1;
        break;
      case "STALE_HIT":
        staleHits += 1;
        hits += 1;
        break;
      case "LOCAL_MISS":
      case "RESEARCH_REQUIRED":
      case "RESEARCH_DISABLED":
      case "RESEARCH_NO_RESULT":
      case "RESEARCH_UNAVAILABLE":
      case "PENDING_VERIFY":
      case "INCOMPLETE":
        misses += 1;
        break;
      case "CONFLICT":
        conflicts += 1;
        break;
      case "LEGAL_BLOCK":
        legalBlocks += 1;
        break;
      default:
        misses += 1;
    }
  }

  return {
    hits,
    misses,
    staleHits,
    conflicts,
    legalBlocks,
    researchExecuted: extras?.researchExecuted === true,
    httpRequestCount: extras?.httpRequestCount ?? 0,
  };
}
