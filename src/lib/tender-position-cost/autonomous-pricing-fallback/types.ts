/**
 * IK Autonomous Pricing Fallback — Slice 2 types.
 *
 * IDENTITY MISS → legal research → evidence → PricingCandidate → EphemeralResearchBasis
 * CatalogWork remains canonical reusable identity — NOT required for one-off costing.
 *
 * KNR knowledge ≠ PLN. Market labor obs may become a candidate. Never auto-Accept / OUR RATE.
 */

import type { PricingConfidence } from "@/lib/tender-position-cost/position-cost-basis";

export type ApfCatalogBasis = {
  family?: string | null;
  catalogId?: string | null;
  tableCode?: string | null;
  rawCode?: string | null;
  normalizedKey?: string | null;
};

export type ApfResearchQuery = {
  tenderId: string;
  dwellingId?: string | null;
  lineId: string;
  lp?: string | null;
  description: string;
  unit: string;
  quantity?: number | null;
  catalogBasis?: ApfCatalogBasis | null;
};

export type ApfHoldCode =
  | "NO_SOURCES"
  | "EMPTY_EVIDENCE"
  | "UNIT_MISMATCH"
  | "AMBIGUOUS"
  | "POLICY_DENY"
  | "RESEARCH_NO_PRICE"
  | "KNOWLEDGE_ONLY"
  | "NOT_LABOR_UNIT"
  | "INVALID_QUERY";

export type ApfResearchEvidenceKind = "KNR_DOC_FACT" | "MARKET_LABOR_OBS";

/**
 * Auditable research evidence.
 * Intentionally has NO required unitRatePln — evidence is not a price.
 * Market rates may be staged on MARKET_LABOR_OBS for candidate building only.
 */
export type ApfResearchEvidence = {
  evidenceId: string;
  kind: ApfResearchEvidenceKind;
  summaryPl: string;
  sourceId?: string;
  retrievedAt?: string;
  marketUnitRatePln?: number | null;
  marketUnit?: string | null;
  sourceUrl?: string | null;
  /** Keeps 1205-05 ≠ 1205-06. */
  distinctKey?: string | null;
};

export type ApfPricingCandidate = {
  candidateId: string;
  lineRef: {
    tenderId: string;
    dwellingId?: string | null;
    lineId: string;
    lp?: string | null;
  };
  basisKind: "EPHEMERAL_RESEARCH";
  components: {
    labor?: {
      unitRatePln: number;
      unit: string;
      method: string;
      evidenceIds: string[];
      confidence: PricingConfidence;
    };
  };
  classificationHint: "LABOR";
  confidence: PricingConfidence;
  provenance: {
    evidenceIds: string[];
    builtAt: string;
    builderVersion: string;
    queryKeys: {
      normalizedKey?: string | null;
      tableCode?: string | null;
      description?: string | null;
      unit?: string | null;
    };
  };
  limitations: string[];
};

export type ApfRunCounters = {
  httpCalls: number;
  catalogWorkCreateCalls: number;
  kvWriteCalls: number;
  acceptCalls: number;
};

export type ApfRunSuccess = {
  status: "CANDIDATE";
  query: ApfResearchQuery;
  evidence: ApfResearchEvidence[];
  candidate: ApfPricingCandidate;
  counters: ApfRunCounters;
};

export type ApfRunHold = {
  status: "HOLD";
  holdCode: ApfHoldCode;
  query: ApfResearchQuery;
  evidence: ApfResearchEvidence[];
  candidate: null;
  messagePl: string;
  counters: ApfRunCounters;
};

export type ApfRunResult = ApfRunSuccess | ApfRunHold;

export type ApfLaborMarketObservation = {
  evidenceId: string;
  unitRatePln: number;
  unit: string;
  sourceUnit?: "pomiar" | string;
  sourceId: string;
  sourceRole?: "PRIMARY" | "SECONDARY" | "BENCHMARK_ONLY";
  sourceUrl?: string | null;
  pricingBasis?: "PER_MEASUREMENT";
  netGross?: "netto" | "brutto" | "unknown";
  observedAt: string;
  summaryPl: string;
  distinctKey?: string | null;
  tableCode?: string | null;
  knrInferred?: boolean;
};

export type ApfLaborMarketPortResult =
  | {
      status: "OK";
      observations: ApfLaborMarketObservation[];
      httpCalls: number;
    }
  | {
      status: "POLICY_DENY" | "NO_SOURCES" | "EMPTY";
      observations: [];
      httpCalls: number;
      messagePl: string;
    };

export type ApfLaborMarketPort = {
  research(
    query: ApfResearchQuery,
  ): Promise<ApfLaborMarketPortResult> | ApfLaborMarketPortResult;
};

export type ApfKnrKnowledgePort = {
  lookup(query: ApfResearchQuery): ApfResearchEvidence[];
};
