/**
 * KNR knowledge collector for APF.
 * Emits KNR_DOC_FACT only — NEVER PLN / PricingCandidate.
 */

import { apfDistinctIdentityKey } from "./query";
import type {
  ApfKnrKnowledgePort,
  ApfResearchEvidence,
  ApfResearchQuery,
} from "./types";

/** Default knowledge port — local/catalog-basis facts only (HTTP=0). */
export function createDefaultApfKnrKnowledgePort(): ApfKnrKnowledgePort {
  return {
    lookup(query: ApfResearchQuery): ApfResearchEvidence[] {
      return collectKnrKnowledgeEvidenceFromQuery(query);
    },
  };
}

export function collectKnrKnowledgeEvidenceFromQuery(
  query: ApfResearchQuery,
): ApfResearchEvidence[] {
  const basis = query.catalogBasis;
  const tableCode = String(basis?.tableCode ?? "").trim();
  const family = String(basis?.family ?? "").trim();
  const catalogId = String(basis?.catalogId ?? "").trim();
  const distinctKey = apfDistinctIdentityKey(query);

  if (!tableCode && !basis?.normalizedKey && !basis?.rawCode) {
    return [];
  }

  const label = [family, catalogId, tableCode].filter(Boolean).join(" ");
  const summaryPl = label
    ? `Wiedza KNR/KNNR: ${label} — opis/zakres katalogowy (nie stawka PLN).`
    : `Wiedza katalogowa dla klucza ${distinctKey} (nie stawka PLN).`;

  return [
    {
      evidenceId: `knr-fact:${distinctKey}`,
      kind: "KNR_DOC_FACT",
      summaryPl,
      sourceId: "apf-knr-knowledge-local",
      retrievedAt: new Date().toISOString(),
      distinctKey,
      marketUnitRatePln: null,
      marketUnit: null,
    },
  ];
}
