/**
 * DECISION-WORKSPACE-01 — presentational ViewModel types.
 * Zero domain logic · zero Expert/Chief/Validation BC.
 */

import type {
  DecisionMakerSignalPayload,
  OfferPrimaryRecommendation,
  OfferScenario,
} from "@/lib/offer-expert";
import type { CostOfferHandoffPayload } from "@/lib/cost-expert";
import type {
  ValidationFindingSeverity,
  ValidationVerdict,
} from "@/lib/validation-expert";

export type DecisionWorkspaceUiPhase =
  | "hidden"
  | "no_dossier"
  | "process_running"
  | "process_blocked"
  | "error"
  | "ready_for_decision"
  | "decision_recorded";

export type DecydentActionId =
  | "approve"
  | "reject"
  | "needs_review"
  | "return";

export interface DecydentLocalDecision {
  action: DecydentActionId;
  scenarioStrategy: string | null;
  decidedAt: string;
  caseId: string;
}

export interface DecisionFindingRowView {
  id: string;
  severity: ValidationFindingSeverity;
  code: string;
  messagePl: string;
  recommendationPl: string;
  evidencePath: string | null;
}

export interface DecisionChainCoverageView {
  execution: boolean;
  materials: boolean;
  pricing: boolean;
  cost: boolean;
  offer: boolean;
}

export interface DecisionWorkspaceViewModel {
  uiPhase: DecisionWorkspaceUiPhase;
  titlePl: string;
  subtitlePl: string;
  caseId: string | null;
  caseIdShort: string | null;
  emptyMessagePl: string | null;

  processStatus: string;
  processStatusLabelPl: string;
  processChipPl: string;
  readyForDecisionProcess: boolean;

  verdict: ValidationVerdict | null;
  verdictLabelPl: string | null;
  qaChipPl: string;
  reportSummaryPl: string | null;
  hardCount: number;
  softCount: number;
  softLimit: number;
  notesPl: string[];
  chainCoverage: DecisionChainCoverageView | null;

  primaryRecommendation: OfferPrimaryRecommendation | null;
  scenarios: OfferScenario[];
  decisionMakerPayload: DecisionMakerSignalPayload | null;
  offerHandoffPayload: CostOfferHandoffPayload | null;
  hasPrimary: boolean;

  findingRows: DecisionFindingRowView[];

  canApprove: boolean;
  canReject: boolean;
  canNeedsReview: boolean;
  canReturn: boolean;
  disabledReasonPl: string | null;
  selectedScenarioStrategy: string | null;

  businessDecisionChipPl: string;
  localDecision: DecydentLocalDecision | null;
  tre01NotePl: string;
}
