/**
 * WORK-CATALOG-REBUILD-01 P0 — research BOUNDARY (stub BLOCKED).
 * ZERO HTTP · ZERO KB.pl adapter · ZERO full catalogue.
 */

import { WORK_RATE_LEGAL_GATE, isWorkRateResearchAllowed } from "@/lib/work-catalog/work-rate-legal";
import type { WorkRateIdentity, WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export type WorkRateResearchRequest = {
  workId: string;
  unit: WorkRateIdentity["unit"];
  regionScope?: WorkRateRegionScope;
};

export type WorkRateResearchResult =
  | {
      status: "BLOCKED";
      reason: "WORK_RATE_LEGAL_GATE";
      gate: typeof WORK_RATE_LEGAL_GATE;
    }
  | {
      status: "NOT_IMPLEMENTED";
      reason: "ADAPTER_ABSENT";
    };

/**
 * Jedyny publiczny entry research robót w P0.
 * Zawsze BLOCKED gdy gate ≠ PASS; nigdy nie wykonuje sieci.
 */
export function requestWorkRateResearch(
  _request: WorkRateResearchRequest,
): WorkRateResearchResult {
  if (!isWorkRateResearchAllowed()) {
    return {
      status: "BLOCKED",
      reason: "WORK_RATE_LEGAL_GATE",
      gate: WORK_RATE_LEGAL_GATE,
    };
  }
  return {
    status: "NOT_IMPLEMENTED",
    reason: "ADAPTER_ABSENT",
  };
}

/** P0: brak adaptera KB.pl dla stawek robót (osobna domena od marketQuotes materials). */
export function isWorkRateKbPlAdapterImplemented(): boolean {
  return false;
}

export function isWorkRateFullCatalogueResearchImplemented(): boolean {
  return false;
}
