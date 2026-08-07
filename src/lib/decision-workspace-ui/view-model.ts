/**
 * DECISION-WORKSPACE-01 — buildDecisionWorkspaceViewModel (thin presentational).
 * IN: session + validation RO + localDecision · ZERO domain calc / re-QA.
 */

import type { ChiefSessionOutput } from "@/lib/chief-session";
import type { ValidationExpertAnalysisResult } from "@/lib/validation-expert";
import {
  DECISION_WORKSPACE_SUBTITLE_PL,
  DECISION_WORKSPACE_TITLE_PL,
  TRE01_NOTE_PL,
  businessDecisionChipPl,
  emptyMessageForPhase,
  labelProcessStatusPl,
  labelVerdictPl,
  processChipPl,
  qaChipPl,
} from "./labels";
import type {
  DecydentLocalDecision,
  DecisionFindingRowView,
  DecisionWorkspaceUiPhase,
  DecisionWorkspaceViewModel,
} from "./types";

export interface BuildDecisionWorkspaceViewModelInput {
  session: ChiefSessionOutput;
  validation: ValidationExpertAnalysisResult | null;
  localDecision: DecydentLocalDecision | null;
  flagEnabled: boolean;
  selectedScenarioStrategy?: string | null;
  validationFailed?: boolean;
}

function shortCaseId(caseId: string | null): string | null {
  if (!caseId) return null;
  if (caseId.length <= 24) return caseId;
  return `${caseId.slice(0, 12)}…${caseId.slice(-6)}`;
}

function resolveUiPhase(input: BuildDecisionWorkspaceViewModelInput): DecisionWorkspaceUiPhase {
  const {
    flagEnabled,
    session,
    validation,
    localDecision,
    validationFailed = false,
  } = input;

  if (!flagEnabled) return "hidden";

  if (localDecision != null && localDecision.action !== "return") {
    return "decision_recorded";
  }

  if (validationFailed) return "error";

  const { status, caseState, running, dossier, error } = session;

  if (
    running ||
    status === "running" ||
    status === "checking" ||
    status === "waiting" ||
    caseState === "running" ||
    caseState === "waiting_return"
  ) {
    return "process_running";
  }

  if (status === "blocked" || caseState === "blocked" || dossier?.status === "blocked") {
    return "process_blocked";
  }

  if (!dossier || !session.caseId) {
    if (error) return "error";
    return "no_dossier";
  }

  if (validation == null) {
    return "error";
  }

  return "ready_for_decision";
}

function mapFindings(
  validation: ValidationExpertAnalysisResult | null,
): DecisionFindingRowView[] {
  if (!validation) return [];
  const hard = validation.hardFindings ?? [];
  const soft = validation.softFindings ?? [];
  const ordered = [...hard, ...soft];
  return ordered.map((f) => ({
    id: f.id,
    severity: f.severity,
    code: f.code,
    messagePl: f.messagePl,
    recommendationPl: f.recommendationPl,
    evidencePath: f.evidence?.path ?? null,
  }));
}

export function buildDecisionWorkspaceViewModel(
  input: BuildDecisionWorkspaceViewModelInput,
): DecisionWorkspaceViewModel {
  const {
    session,
    validation,
    localDecision,
    flagEnabled,
    selectedScenarioStrategy = null,
    validationFailed = false,
  } = input;

  const uiPhase = resolveUiPhase(input);
  const dossier = session.dossier;
  const caseId = session.caseId ?? dossier?.caseId ?? null;

  const processStatus = session.status;
  const processStatusLabel = labelProcessStatusPl(session.status, session.caseState);
  const verdict = validation?.verdict ?? null;
  const verdictLabel = labelVerdictPl(verdict);

  const primaryRecommendation = dossier?.primaryRecommendation ?? null;
  const hasPrimary = primaryRecommendation != null;

  const effectiveLocal =
    localDecision != null && localDecision.action !== "return"
      ? localDecision
      : null;

  const canReturn = flagEnabled && uiPhase !== "hidden";
  const dossierAvailable = dossier != null && uiPhase !== "hidden" && uiPhase !== "no_dossier";
  const canReject = dossierAvailable;
  const canNeedsReview = dossierAvailable;

  let canApprove = false;
  let disabledReasonPl: string | null = null;

  if (
    (uiPhase === "ready_for_decision" || uiPhase === "decision_recorded") &&
    hasPrimary &&
    validation != null &&
    verdict !== "blocked"
  ) {
    canApprove = true;
  } else if (uiPhase === "hidden" || uiPhase === "no_dossier") {
    disabledReasonPl = null;
  } else if (verdict === "blocked") {
    disabledReasonPl = "Walidacja zablokowana — Approve niedostępny (P0).";
  } else if (!hasPrimary) {
    disabledReasonPl = "Brak rekomendacji Oferty.";
  } else if (uiPhase === "process_blocked") {
    disabledReasonPl = "Proces zablokowany — Approve niedostępny.";
  } else if (uiPhase === "error" || validationFailed) {
    disabledReasonPl = "Nie udało się odczytać walidacji";
  } else if (uiPhase === "process_running") {
    disabledReasonPl = "Proces w toku.";
  }

  let emptyMessagePl = emptyMessageForPhase(uiPhase);
  if (validationFailed) {
    emptyMessagePl = "Nie udało się odczytać walidacji";
  }

  const chainCoverage = validation?.report?.chainCoverage
    ? {
        execution: Boolean(validation.report.chainCoverage.execution),
        materials: Boolean(validation.report.chainCoverage.materials),
        pricing: Boolean(validation.report.chainCoverage.pricing),
        cost: Boolean(validation.report.chainCoverage.cost),
        offer: Boolean(validation.report.chainCoverage.offer),
      }
    : null;

  return {
    uiPhase,
    titlePl: DECISION_WORKSPACE_TITLE_PL,
    subtitlePl: DECISION_WORKSPACE_SUBTITLE_PL,
    caseId,
    caseIdShort: shortCaseId(caseId),
    emptyMessagePl,

    processStatus,
    processStatusLabelPl: processStatusLabel,
    processChipPl: processChipPl(processStatusLabel),
    readyForDecisionProcess: session.readyForDecision === true,

    verdict,
    verdictLabelPl: verdictLabel,
    qaChipPl: qaChipPl(verdictLabel),
    reportSummaryPl: validation?.report?.summaryPl ?? null,
    hardCount: validation?.report?.hardCount ?? 0,
    softCount: validation?.report?.softCount ?? 0,
    softLimit: validation?.report?.softLimit ?? 0,
    notesPl: validation?.report?.notesPl ? [...validation.report.notesPl] : [],
    chainCoverage,

    primaryRecommendation,
    scenarios: dossier?.scenarios ? [...dossier.scenarios] : [],
    decisionMakerPayload: dossier?.decisionMakerPayload ?? null,
    offerHandoffPayload: dossier?.offerHandoffPayload ?? null,
    hasPrimary,

    findingRows: mapFindings(validation),

    canApprove,
    canReject,
    canNeedsReview,
    canReturn,
    disabledReasonPl,
    selectedScenarioStrategy,

    businessDecisionChipPl: businessDecisionChipPl(
      effectiveLocal?.action ?? null,
    ),
    localDecision: effectiveLocal,
    tre01NotePl: TRE01_NOTE_PL,
  };
}
