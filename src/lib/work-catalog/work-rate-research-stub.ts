/**
 * WORK-RATE research BOUNDARY — sync probe + adapter flags.
 * Live research = async runSelectiveWorkRateResearch (P2).
 * FULL CATALOGUE nadal FORBIDDEN · ZERO HTTP w sync probe.
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
      status: "READY";
      reason: "SELECTIVE_ASYNC";
      gate: typeof WORK_RATE_LEGAL_GATE;
      selectiveAuthorized: true;
      fullCatalogueForbidden: true;
      adaptersImplemented: true;
    };

/**
 * Sync probe — nie wykonuje HTTP.
 * gate ≠ PASS → BLOCKED.
 * gate PASS → READY (użyj runSelectiveWorkRateResearch).
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
    status: "READY",
    reason: "SELECTIVE_ASYNC",
    gate: WORK_RATE_LEGAL_GATE,
    selectiveAuthorized: true,
    fullCatalogueForbidden: isWorkRateFullCatalogueForbidden(),
    adaptersImplemented: true,
  };
}

/** Selective adapters wired (Edge + parse + orchestrate). Live HTML = fail-soft. */
export function isWorkRateKbPlAdapterImplemented(): boolean {
  return true;
}

export function isWorkRateFullCatalogueResearchImplemented(): boolean {
  return false;
}
