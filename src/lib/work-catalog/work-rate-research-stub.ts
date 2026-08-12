/**
 * WORK-RATE research BOUNDARY — stub.
 * Legal PASS ≠ live HTTP. Adaptery = NOT IMPLEMENTED do OWNER GO P2.
 * ZERO HTTP · ZERO full catalogue.
 */

import {
  WORK_RATE_LEGAL_GATE,
  isWorkRateFullCatalogueForbidden,
  isWorkRateResearchAllowed,
} from "@/lib/work-catalog/work-rate-legal";
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
      gate: typeof WORK_RATE_LEGAL_GATE;
      selectiveAuthorized: true;
      fullCatalogueForbidden: true;
    };

/**
 * Publiczny entry research robót.
 * gate ≠ PASS → BLOCKED.
 * gate PASS → NOT_IMPLEMENTED (brak adaptera; ZERO sieci).
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
    gate: WORK_RATE_LEGAL_GATE,
    selectiveAuthorized: true,
    fullCatalogueForbidden: isWorkRateFullCatalogueForbidden(),
  };
}

/** Brak adaptera KB.pl / pozostałych źródeł robót — P2 dopiero po GO. */
export function isWorkRateKbPlAdapterImplemented(): boolean {
  return false;
}

export function isWorkRateFullCatalogueResearchImplemented(): boolean {
  return false;
}
