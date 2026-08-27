/**
 * IK Autonomous Pricing Fallback — Slice 2 orchestrator.
 *
 * OfferBoq line (catalogWorkId MISS)
 *   → research query (no CatalogWork)
 *   → KNR knowledge evidence (≠ PLN)
 *   → allowlisted/legal labor market research
 *   → PricingCandidate (market only)
 *   → EphemeralResearchBasis (Slice 1)
 *
 * ZERO CatalogWork CREATE · ZERO Accept · ZERO OUR RATE write · ZERO P7 unlock.
 */

import { isApfLaborOnlyUnit } from "./labor-units"; // Slice 2 LABOR gate (pomiar/prob)
import { createDefaultApfKnrKnowledgePort } from "./knr-knowledge";
import { createDefaultApfLaborMarketPort, createProductionApfLaborMarketPort } from "./labor-market";
import {
  buildApfPricingCandidateFromEvidence,
  isApfKnowledgeOnlyEvidence,
  marketObservationsToResearchEvidence,
} from "./candidate";
import { pricingCandidateToEphemeralResearchBasis } from "./to-ephemeral";
import { apfDistinctIdentityKey, buildApfResearchQuery } from "./query";
import type {
  ApfHoldCode,
  ApfKnrKnowledgePort,
  ApfLaborMarketPort,
  ApfResearchEvidence,
  ApfResearchQuery,
  ApfRunCounters,
  ApfRunHold,
  ApfRunSuccess,
} from "./types";
import type { ApfLineLike } from "./query";
import type { EphemeralResearchBasis } from "@/lib/tender-position-cost/position-cost-basis";

export type RunAutonomousPricingFallbackInput = {
  tenderId: string;
  dwellingId?: string | null;
  query?: ApfResearchQuery;
  line?: ApfLineLike;
  knrKnowledgePort?: ApfKnrKnowledgePort;
  laborMarketPort?: ApfLaborMarketPort;
  /**
   * Opt-in production HTTP via APF adapter only.
   * Default `off` — fail-closed NO_SOURCES without fetchPort.
   */
  httpResearch?: "off" | "production";
  nowIso?: string;
};

export type RunAutonomousPricingFallbackSuccess = ApfRunSuccess & {
  ephemeralBasis: EphemeralResearchBasis;
};

export type RunAutonomousPricingFallbackResult =
  | RunAutonomousPricingFallbackSuccess
  | ApfRunHold;

function emptyCounters(): ApfRunCounters {
  return {
    httpCalls: 0,
    catalogWorkCreateCalls: 0,
    kvWriteCalls: 0,
    acceptCalls: 0,
  };
}

function hold(
  query: ApfResearchQuery,
  holdCode: ApfHoldCode,
  messagePl: string,
  evidence: ApfResearchEvidence[],
  counters: ApfRunCounters,
): ApfRunHold {
  return {
    status: "HOLD",
    holdCode,
    query,
    evidence,
    candidate: null,
    messagePl,
    counters,
  };
}

/**
 * Run APF for one OfferBoq line without CatalogWork identity.
 * Does not write KV / Accept / OUR RATE / CatalogWork.
 */
export async function runAutonomousPricingFallback(
  input: RunAutonomousPricingFallbackInput,
): Promise<RunAutonomousPricingFallbackResult> {
  const counters = emptyCounters();

  const query: ApfResearchQuery | null =
    input.query ??
    (input.line
      ? buildApfResearchQuery({
          tenderId: input.tenderId,
          dwellingId: input.dwellingId,
          line: input.line,
        })
      : null);

  if (
    !query ||
    !query.tenderId ||
    !query.lineId ||
    !query.description ||
    !query.unit
  ) {
    return hold(
      query ?? {
        tenderId: String(input.tenderId ?? ""),
        lineId: "",
        description: "",
        unit: "",
      },
      "INVALID_QUERY",
      "APF wymaga tenderId, lineId, description i unit.",
      [],
      counters,
    );
  }

  if (!isApfLaborOnlyUnit(query.unit)) {
    return hold(
      query,
      "NOT_LABOR_UNIT",
      `Slice 2 obsługuje tylko LABOR (pomiar/prob). Unit=${query.unit}.`,
      [],
      counters,
    );
  }

  const knrPort = input.knrKnowledgePort ?? createDefaultApfKnrKnowledgePort();
  const laborPort =
    input.laborMarketPort ??
    (input.httpResearch === "production"
      ? createProductionApfLaborMarketPort()
      : createDefaultApfLaborMarketPort());

  const knrEvidence = knrPort.lookup(query);
  const laborResult = await Promise.resolve(laborPort.research(query));
  counters.httpCalls += laborResult.httpCalls;

  if (laborResult.status === "POLICY_DENY") {
    return hold(
      query,
      "POLICY_DENY",
      laborResult.messagePl,
      knrEvidence,
      counters,
    );
  }

  const marketEvidence = marketObservationsToResearchEvidence(
    laborResult.status === "OK" ? laborResult.observations : [],
  );
  const evidence: ApfResearchEvidence[] = [...knrEvidence, ...marketEvidence];

  if (laborResult.status === "NO_SOURCES") {
    if (isApfKnowledgeOnlyEvidence(evidence) || knrEvidence.length > 0) {
      return hold(
        query,
        knrEvidence.length ? "KNOWLEDGE_ONLY" : "NO_SOURCES",
        knrEvidence.length
          ? `KNR knowledge only (klucz ${apfDistinctIdentityKey(query)}) — brak rynkowej stawki labor. ${laborResult.messagePl}`
          : laborResult.messagePl,
        evidence,
        counters,
      );
    }
    return hold(query, "NO_SOURCES", laborResult.messagePl, evidence, counters);
  }

  if (laborResult.status === "EMPTY" || laborResult.observations.length === 0) {
    if (
      isApfKnowledgeOnlyEvidence(evidence) ||
      (knrEvidence.length > 0 && marketEvidence.length === 0)
    ) {
      return hold(
        query,
        "KNOWLEDGE_ONLY",
        "Znaleziono wyłącznie wiedzę KNR — nie wolno z niej budować labor PLN.",
        evidence,
        counters,
      );
    }
    return hold(
      query,
      "EMPTY_EVIDENCE",
      "Brak użytecznych obserwacji rynkowych labor.",
      evidence,
      counters,
    );
  }

  const candidate = buildApfPricingCandidateFromEvidence({
    query,
    evidence,
    marketObservations: laborResult.observations,
    nowIso: input.nowIso,
  });

  if (!candidate) {
    if (isApfKnowledgeOnlyEvidence(evidence)) {
      return hold(
        query,
        "KNOWLEDGE_ONLY",
        "KNR knowledge only — RESEARCH_NO_PRICE (brak market labor).",
        evidence,
        counters,
      );
    }
    return hold(
      query,
      "RESEARCH_NO_PRICE",
      "Obserwacje rynkowe nie dały kwalifikowalnej mediany labor.",
      evidence,
      counters,
    );
  }

  const ephemeralBasis = pricingCandidateToEphemeralResearchBasis(
    candidate,
    evidence,
  );
  if (!ephemeralBasis) {
    return hold(
      query,
      "RESEARCH_NO_PRICE",
      "PricingCandidate nie przeszedł walidacji EphemeralResearchBasis (Slice 1).",
      evidence,
      counters,
    );
  }

  counters.catalogWorkCreateCalls = 0;
  counters.kvWriteCalls = 0;
  counters.acceptCalls = 0;

  return {
    status: "CANDIDATE",
    query,
    evidence,
    candidate,
    ephemeralBasis,
    counters,
  };
}
