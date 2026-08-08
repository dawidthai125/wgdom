/**
 * TM-01 S6 — Persist action → legacy owner decision (GO / HOLD / NO-GO).
 * Pure · ZERO I/O · ZERO scoring · ZERO Persist.
 */

import type { DecisionPersistAction } from "@/lib/decision-persist";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";

/**
 * Map Decision Persist action → legacy `kw-tender-decisions` enum.
 * Mapping LOCKED (epic DF §4.3 / S6 DF):
 *   approve → GO · reject → NO-GO · needs_review → HOLD
 */
export function mapPersistActionToLegacyOwnerDecision(
  action: DecisionPersistAction | string,
): TenderDecision | null {
  if (action === "approve") return "GO";
  if (action === "reject") return "NO-GO";
  if (action === "needs_review") return "HOLD";
  return null;
}
