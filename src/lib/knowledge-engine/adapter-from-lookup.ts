/**
 * KE-E1 — adapter: AI-COST lookup results → KnowledgeCandidate.
 * Mapowanie origin → warstwa KE (bez zmiany Work Catalog / Alias).
 */

import { freshnessFromAsOf } from "./eligibility";
import type { KnowledgeCandidate, KnowledgeConfidenceLevel, KnowledgeSourceKind } from "./types";
import { KE_DEFAULT_POLICY } from "./types";

export interface PriceLookupLike {
  unitPricePln: number | null;
  origin: {
    kind: string;
    refId?: string;
    labelPl: string;
    regionCode?: string;
    asOf?: string;
  };
  confidence: KnowledgeConfidenceLevel;
  rationale: string;
  companyKnowledge?: {
    entryId: string;
    occurrenceCount: number;
    lastUsedAt: string | null;
    confidenceBoosted: boolean;
    approvedCount?: number;
  };
  controlledMarket?: {
    workId: string;
    regionCode: string | null;
    asOf: string | null;
    originCount: number;
    legacyFallbackUsed: boolean;
  };
}

function mapOriginToSource(kind: string): KnowledgeSourceKind {
  if (kind === "company_knowledge") return "company";
  if (kind === "controlled_market") return "market";
  // companyPricePln — w DF Company plane; w łańcuchu po Market → chain-order parity.
  if (kind === "work_catalog") return "company";
  return "global";
}

/**
 * Buduje kandydata KE z wyniku providera.
 * work_catalog: n = nMin (lista firmowa = ustalona pozycja katalogu, nie sparse CK).
 */
export function lookupToKnowledgeCandidate(
  hit: PriceLookupLike,
  chainIndex: number,
  nowIso: string,
  opts?: { nMin?: number },
): KnowledgeCandidate | null {
  if (hit.unitPricePln == null || !(hit.unitPricePln > 0)) return null;
  const kind = hit.origin.kind;
  const source = mapOriginToSource(kind);
  const nMin = opts?.nMin ?? KE_DEFAULT_POLICY.nMin;

  let n = 1;
  let nApprovals = 0;
  let asOf: string | null = hit.origin.asOf ?? null;
  let freshness = freshnessFromAsOf(asOf, nowIso, KE_DEFAULT_POLICY.freshDays);

  if (kind === "company_knowledge") {
    n = hit.companyKnowledge?.occurrenceCount ?? 1;
    nApprovals = hit.companyKnowledge?.approvedCount ?? 0;
    asOf = hit.companyKnowledge?.lastUsedAt ?? asOf;
    freshness = asOf
      ? freshnessFromAsOf(asOf, nowIso, KE_DEFAULT_POLICY.freshDays)
      : "ok";
  } else if (kind === "controlled_market") {
    n = Math.max(1, hit.controlledMarket?.originCount ?? 1);
    asOf = hit.controlledMarket?.asOf ?? asOf;
    freshness = freshnessFromAsOf(asOf, nowIso, KE_DEFAULT_POLICY.freshDays);
    if (hit.controlledMarket?.legacyFallbackUsed) {
      // obniżamy przez confidence na hit — adapter nie zmienia confidence
    }
  } else if (kind === "work_catalog") {
    // Katalog firmowy — eligible jako Company z n=N_min (nie sparse UI CK)
    n = nMin;
    freshness = "ok";
  } else {
    n = 1;
    freshness = "missing";
  }

  return {
    id: `${kind}:${hit.origin.refId ?? chainIndex}:${chainIndex}`,
    source,
    unitPricePln: hit.unitPricePln,
    chainIndex,
    confidence: hit.confidence,
    freshness,
    n,
    nApprovals,
    variance: null,
    asOf,
    refId: hit.origin.refId ?? null,
    labelPl: hit.origin.labelPl,
    originKind: kind,
    raw: hit,
  };
}
