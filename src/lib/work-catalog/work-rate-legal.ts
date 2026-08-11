/**
 * WORK-CATALOG-REBUILD-01 P0 — Legal Gate stawek robót.
 * OSOBNY od MARKET_SYNC_P3_LEGAL_GATE — NIE reuse / NIE flip materiałów.
 */

export type WorkRateLegalGateStatus = "BLOCKED" | "NOT_READY" | "PASS" | "FAIL";

/**
 * P0: BLOCKED — live research / KB.pl / HTTP FORBIDDEN.
 * Flip tylko po Owner Legal Enablement (osobny GO).
 */
export const WORK_RATE_LEGAL_GATE: WorkRateLegalGateStatus = "BLOCKED";

export function isWorkRateLegalPass(): boolean {
  return WORK_RATE_LEGAL_GATE === "PASS";
}

export function isWorkRateResearchAllowed(): boolean {
  return isWorkRateLegalPass();
}
