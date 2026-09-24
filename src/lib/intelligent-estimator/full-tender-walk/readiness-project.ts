/**
 * Single readiness projection — reuses isIkReadyToBid · no second gate math.
 */

import { isIkReadyToBid } from "@/lib/intelligent-estimator/evaluate-ik-g3-persist-ready";
import { readIkG3FinalBid } from "@/lib/intelligent-estimator/ik-g3-final-bid";
import type { IkP7PositionCostBidReport } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import type { IkP8RiskDecisionReport } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { formatIkG3FinalBidStatusIsolatedPl, resolveIkG3UiSourceLabel } from "./g3-isolation";
import type {
  IkFullWalkTenderLedger,
  IkReadinessProjection,
  IkTenderWalkStatus,
} from "./types";

export type ProjectIkReadinessInput = {
  item: TenderPipelineItem | null | undefined;
  expert?: Parameters<typeof isIkReadyToBid>[0]["expert"];
  p7?: IkP7PositionCostBidReport | null;
  risk?: IkP8RiskDecisionReport | null;
  financeOk?: boolean;
  ledger?: IkFullWalkTenderLedger | null;
  currentWalkId?: string | null;
  currentWalkStartedAt?: string | null;
};

function deriveTenderStatus(opts: {
  ready: boolean;
  ledger: IkFullWalkTenderLedger | null | undefined;
  p7: IkP7PositionCostBidReport | null | undefined;
}): IkTenderWalkStatus {
  if (opts.ready) return "READY_TO_BID";
  const p7 = opts.p7;
  if (p7 && p7.cutoverGatePass === false) return "TENDER_FINANCE_FAILED";
  const c = opts.ledger?.counts;
  if (!c || c.total <= 0) return "TENDER_ANALYSIS_PENDING";
  if (c.visited < c.total) return "TENDER_ANALYSIS_RUNNING";
  if (c.complete < c.total) return "TENDER_PARTIAL";
  if (p7 && p7.cutoverGatePass !== true) return "TENDER_FINANCE_PENDING";
  return "TENDER_PARTIAL";
}

export function projectIkReadiness(input: ProjectIkReadinessInput): IkReadinessProjection {
  const ready = isIkReadyToBid({
    item: input.item,
    expert: input.expert,
    p7: input.p7,
    risk: input.risk,
    financeOk: input.financeOk,
  });
  const g3 = readIkG3FinalBid(input.item);
  const g3SourceLabel = resolveIkG3UiSourceLabel({
    record: g3,
    currentWalkId: input.currentWalkId,
    currentWalkStartedAt: input.currentWalkStartedAt ?? input.ledger?.startedAt,
  });
  const g3NotePl = formatIkG3FinalBidStatusIsolatedPl(g3, {
    currentWalkId: input.currentWalkId,
    currentWalkStartedAt: input.currentWalkStartedAt ?? input.ledger?.startedAt,
  });
  const tenderStatus = deriveTenderStatus({
    ready,
    ledger: input.ledger,
    p7: input.p7,
  });
  const partial = tenderStatus === "TENDER_PARTIAL";
  const financeFailed = tenderStatus === "TENDER_FINANCE_FAILED";
  const linesTotal = input.ledger?.counts.total ?? 0;
  const linesVisited = input.ledger?.counts.visited ?? 0;

  let summaryPl: string;
  if (ready) {
    summaryPl = "READY_TO_BID — bramy IK spełnione.";
  } else if (financeFailed) {
    summaryPl =
      "TENDER_FINANCE_FAILED — CutoverGate FAIL. G3 Owner Override nie oznacza gotowości oferty.";
  } else if (partial) {
    const holds = input.ledger?.counts.hold ?? 0;
    const ownerEx = input.ledger?.counts.ownerException ?? 0;
    summaryPl =
      ownerEx > 0
        ? `TENDER_PARTIAL — ${ownerEx} linii OWNER_EXCEPTION / EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE (≠ COMPLETE). To nie jest kompletna wycena IK.`
        : holds > 0
          ? `TENDER_PARTIAL — ${holds} linii HOLD widocznych. To nie jest kompletna wycena IK.`
          : "TENDER_PARTIAL — analiza linii zakończona częściowo. To nie jest kompletna wycena IK.";
  } else if (tenderStatus === "TENDER_ANALYSIS_RUNNING") {
    summaryPl = `Pełna analiza w toku (${linesVisited}/${linesTotal} linii).`;
  } else {
    summaryPl = "Analiza IK oczekuje / niegotowa do oferty.";
  }

  return {
    readyToBid: ready,
    tenderStatus,
    summaryPl,
    g3SourceLabel,
    g3NotePl,
    partial,
    financeFailed,
    linesVisited,
    linesTotal,
  };
}
