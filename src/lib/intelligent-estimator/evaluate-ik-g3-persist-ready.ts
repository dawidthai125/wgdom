/**
 * AUT-G3-PERSIST ready gate — shared by Owner g3Accept + autonomous persist.
 * recommendedBidPln ≠ ikFinalBid ≠ submittedBidPln (never conflated).
 */

import type { IkP7PositionCostBidReport } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import type { IkP8RiskDecisionReport } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import { resolveIkExpertAdmission } from "@/lib/intelligent-estimator/ik-expert-admission";
import { readIkG3FinalBid } from "@/lib/intelligent-estimator/ik-g3-final-bid";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export type IkG3PersistReadyInput = {
  expert: Parameters<typeof resolveIkExpertAdmission>[0] | null | undefined;
  p7: IkP7PositionCostBidReport | null | undefined;
  risk?: IkP8RiskDecisionReport | null;
  /** When true, require cutoverGatePass (BidCutover). */
  requireBidCutover?: boolean;
};

export type IkG3PersistReadyResult =
  | { ready: true; reasons: string[] }
  | { ready: false; reason: string; reasons: string[] };

export function evaluateIkG3PersistReady(
  input: IkG3PersistReadyInput,
): IkG3PersistReadyResult {
  const reasons: string[] = [];
  if (!input.expert) {
    return { ready: false, reason: "EXPERT_MISSING", reasons };
  }
  const admission = resolveIkExpertAdmission(input.expert);
  if (admission.unresolvedCount > 0) {
    return {
      ready: false,
      reason: "ADMISSION_UNRESOLVED",
      reasons: [`unresolved=${admission.unresolvedCount}`],
    };
  }
  reasons.push("admission_clean");

  const p7 = input.p7;
  if (!p7) {
    return { ready: false, reason: "P7_MISSING", reasons };
  }
  if ((p7.gapLineCount ?? 0) > 0) {
    return {
      ready: false,
      reason: "P7_GAPS",
      reasons: [...reasons, `gaps=${p7.gapLineCount}`],
    };
  }
  reasons.push("p7_gaps_0");

  if (p7.packageGatePass === false) {
    return { ready: false, reason: "PACKAGE_GATE_FAIL", reasons };
  }
  reasons.push("package_gate_ok");

  const billable = p7.billableLineCount ?? 0;
  const complete = p7.completeLineCount ?? 0;
  if (billable <= 0 || complete < billable) {
    return {
      ready: false,
      reason: "BILLABLE_INCOMPLETE",
      reasons: [...reasons, `complete=${complete}/${billable}`],
    };
  }
  reasons.push("billable_100pct");

  const requireCutover = input.requireBidCutover !== false;
  if (requireCutover && p7.cutoverGatePass !== true) {
    return {
      ready: false,
      reason: "BID_CUTOVER_FAIL",
      reasons: [...reasons, "cutoverGatePass=false"],
    };
  }
  if (p7.cutoverGatePass === true) reasons.push("bid_cutover_pass");

  if (p7.recommendedBidPln == null || !(p7.recommendedBidPln > 0) || p7.bidOk !== true) {
    return {
      ready: false,
      reason: "NO_RECOMMENDED_BID",
      reasons: [...reasons, "recommendedBidPln invalid"],
    };
  }
  reasons.push("recommended_bid_ok");

  const risk = input.risk;
  if (risk && (risk.status === "blocked" || risk.status === "hold")) {
    return {
      ready: false,
      reason: "RISK_BLOCKING",
      reasons: [...reasons, `risk=${risk.status}`],
    };
  }
  if (risk) reasons.push(`risk=${risk.status}`);

  return { ready: true, reasons };
}

/**
 * READY_TO_BID derive — conjunction only · no parallel state machine.
 * finance ok + BidCutover + durable ikFinalBid + no unresolved gaps.
 */
export function isIkReadyToBid(input: {
  item: TenderPipelineItem | null | undefined;
  expert?: Parameters<typeof resolveIkExpertAdmission>[0] | null;
  p7?: IkP7PositionCostBidReport | null;
  risk?: IkP8RiskDecisionReport | null;
  financeOk?: boolean;
}): boolean {
  if (input.financeOk === false) return false;
  const gate = evaluateIkG3PersistReady({
    expert: input.expert,
    p7: input.p7,
    risk: input.risk,
    requireBidCutover: true,
  });
  if (!gate.ready) return false;
  const g3 = readIkG3FinalBid(input.item);
  if (!g3 || !(g3.netPln > 0)) return false;
  return true;
}
