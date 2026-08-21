/**
 * IK-KNR KL-0 — Legal gate contract (REUSE global-knowledge/legal-gate.ts at KL-5+).
 *
 * No execution · no licence registry · OD-KNR-LICENSE-1 OPEN.
 */

import type { GlobalKnowledgeAllowedUse } from "@/lib/global-knowledge/types";

/** Proposed KNR origins — extend whitelist at implementation (DESIGN FREEZE §13.2). */
export type KnrKnowledgeOriginId =
  | "knr_licensed_export"
  | "knr_oem_bundle"
  | "knr_manual_owner"
  | "scrape_knr_public";

/** Proposed allowed-use scope for norm persist — enum extension OPEN. */
export type KnrKnowledgeAllowedUse =
  | GlobalKnowledgeAllowedUse
  | "knr_norm_persist"
  | "knr_norm_serve";

export type KnrLegalGateInput = {
  licenceId: string;
  originId: string;
  allowedUse: KnrKnowledgeAllowedUse[];
  nowIso?: string;
};

export type KnrLegalGateContractResult = {
  ok: boolean;
  codes: string[];
  /** KL-0: always false — use evaluateLegalGate() at KL-5+. */
  evaluated: false;
};

/** KL-0 placeholder — defers to global-knowledge/legal-gate at runtime. */
export function knrLegalGateNotImplemented(
  _input: KnrLegalGateInput,
): KnrLegalGateContractResult {
  return {
    ok: false,
    codes: ["KL0_LEGAL_GATE_NOT_WIRED"],
    evaluated: false,
  };
}

/** Scraper origins blocked by default (DESIGN FREEZE §14). */
export const KNR_SCRAPER_ORIGIN_DENY_DEFAULT = true;

export function isKnrScraperOrigin(originId: string): boolean {
  return originId.startsWith("scrape_");
}
