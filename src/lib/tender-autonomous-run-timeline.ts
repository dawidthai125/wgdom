/**
 * NG10-UX-01 — Live Timeline (prezentacja only).
 * Projekcja 12 kroków + 5 makrogrup z deriveAutonomousRunPhase — bez mutacji runtime.
 */

import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { countTenderAttachments, buildTenderAnalysisStatusRows } from "@/lib/tender-analysis-status-ux";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";
import {
  deriveAutonomousPipelineComplete,
  deriveAutonomousScoringReady,
  type AutonomousRunPhaseView,
  type DeriveAutonomousRunPhaseInput,
} from "@/lib/tender-autonomous-run-phase";
import type { AutonomousRunPhaseId } from "@/lib/tender-autonomous-run-ux";

/** 12 kroków timeline (bez terminala `complete`). */
export const AUTONOMOUS_TIMELINE_STEP_ORDER = [
  "doc_fetch",
  "doc_found",
  "swz_found",
  "boq_detect",
  "doc_analyze",
  "scope_infer",
  "dossier_build",
  "labor_calc",
  "material_calc",
  "risk_assess",
  "profitability",
  "recommendation_prep",
] as const;

export type AutonomousTimelineStepId = (typeof AUTONOMOUS_TIMELINE_STEP_ORDER)[number];

export type AutonomousTimelineStepStatus =
  | "pending"
  | "active"
  | "done"
  | "partial"
  | "skipped";

export type AutonomousTimelineMacroId =
  | "dokumenty"
  | "zalaczniki"
  | "analiza"
  | "wycena"
  | "rekomendacja";

export const AUTONOMOUS_TIMELINE_STEP_LABELS: Record<AutonomousTimelineStepId, string> = {
  doc_fetch: "Pobieranie dokumentów",
  doc_found: "Dokumenty znalezione",
  swz_found: "Wykrycie SWZ",
  boq_detect: "Wyszukiwanie przedmiaru / kosztorysu",
  doc_analyze: "Analiza dokumentacji",
  scope_infer: "Rozpoznanie zakresu robót",
  dossier_build: "Budowa kosztorysu",
  labor_calc: "Wyliczenie robocizny",
  material_calc: "Wyliczenie materiałów",
  risk_assess: "Analiza ryzyka",
  profitability: "Ocena opłacalności",
  recommendation_prep: "Przygotowanie rekomendacji",
};

export const AUTONOMOUS_TIMELINE_MACRO_LABELS: Record<AutonomousTimelineMacroId, string> = {
  dokumenty: "Dokumenty",
  zalaczniki: "Załączniki",
  analiza: "Analiza",
  wycena: "Wycena",
  rekomendacja: "Rekomendacja",
};

const STEP_MACRO: Record<AutonomousTimelineStepId, AutonomousTimelineMacroId> = {
  doc_fetch: "dokumenty",
  doc_found: "dokumenty",
  swz_found: "dokumenty",
  boq_detect: "zalaczniki",
  doc_analyze: "analiza",
  scope_infer: "analiza",
  dossier_build: "analiza",
  risk_assess: "analiza",
  labor_calc: "wycena",
  material_calc: "wycena",
  profitability: "wycena",
  recommendation_prep: "rekomendacja",
};

const MACRO_STEP_ORDER: Record<AutonomousTimelineMacroId, AutonomousTimelineStepId[]> = {
  dokumenty: ["doc_fetch", "doc_found", "swz_found"],
  zalaczniki: ["boq_detect"],
  analiza: ["doc_analyze", "scope_infer", "dossier_build", "risk_assess"],
  wycena: ["labor_calc", "material_calc", "profitability"],
  rekomendacja: ["recommendation_prep"],
};

const MACRO_AGGREGATE_ORDER: AutonomousTimelineStepStatus[] = [
  "active",
  "partial",
  "pending",
  "skipped",
  "done",
];

export interface AutonomousTimelineStepView {
  id: AutonomousTimelineStepId;
  label: string;
  macroId: AutonomousTimelineMacroId;
  status: AutonomousTimelineStepStatus;
}

export interface AutonomousTimelineMacroView {
  id: AutonomousTimelineMacroId;
  label: string;
  status: AutonomousTimelineStepStatus;
  steps: AutonomousTimelineStepId[];
}

export interface AutonomousRunTimelineView {
  steps: AutonomousTimelineStepView[];
  macros: AutonomousTimelineMacroView[];
  activeStepId: AutonomousTimelineStepId | null;
  activeMacroId: AutonomousTimelineMacroId | null;
}

function rowById(
  input: DeriveAutonomousRunPhaseInput,
  id: "notice" | "documents" | "kosztorys" | "pricing",
) {
  const rows = buildTenderAnalysisStatusRows({
    item: input.item,
    swz: input.item.swzAnalysis,
    bidProposal: input.ownerFinanceProposal,
    autoRunning: input.autoRunning,
    dossierBuilding: input.dossierBuilding,
    dossierSaving: input.dossierSaving,
    kosztorysSession: input.kosztorysProcessSession,
  });
  return rows.find((r) => r.id === id);
}

function costStackLine(
  proposal: TenderBidProposal | null,
  keywords: string[],
): { label: string; pln: number } | null {
  if (!proposal?.costStack?.length) return null;
  const line = proposal.costStack.find((entry) =>
    keywords.some((kw) => entry.label.toLowerCase().includes(kw)),
  );
  return line ?? null;
}

function countTrustRisks(trust: TenderTrustAssessment | null): number {
  if (!trust) return 0;
  return trust.dimensions.reduce((sum, dim) => {
    return sum + dim.reasons.filter((r) => r.severity === "warn" || r.severity === "error").length;
  }, 0);
}

function riskCount(input: DeriveAutonomousRunPhaseInput): number {
  const blocks = input.intelligenceCtx?.overlay.allBlocks.length ?? 0;
  return blocks + countTrustRisks(input.trustAssessment);
}

function scopeCount(input: DeriveAutonomousRunPhaseInput): number {
  const rowCount = input.item.tenderDossier?.kosztorys?.rowCount ?? 0;
  if (rowCount > 0) return rowCount;
  return input.executiveMainWorksCount
    ?? input.intelligenceCtx?.executive?.mainWorks.length
    ?? 0;
}

function attachmentCount(input: DeriveAutonomousRunPhaseInput): number {
  return countTenderAttachments(input.item);
}

function isDocFetchComplete(input: DeriveAutonomousRunPhaseInput): boolean {
  return (
    isDocumentDiscoverySettled(input.item)
    && !input.autoRunning
    && input.pipelineState !== PipelineState.External
  );
}

function isSpecPhaseComplete(
  stepId: Exclude<AutonomousTimelineStepId, "doc_found">,
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
): boolean {
  switch (stepId) {
    case "doc_fetch":
      return isDocFetchComplete(input);
    case "swz_found":
      return Boolean(input.item.swzAnalysis);
    case "boq_detect":
      return resolvedCostStatus(input.item) !== "NOT_FOUND";
    case "doc_analyze": {
      const notice = rowById(input, "notice");
      const docs = rowById(input, "documents");
      return notice?.state === "ready" && docs?.state === "ready";
    }
    case "scope_infer":
      return scopeCount(input) > 0;
    case "dossier_build":
      return tenderDossierHeavyParseDone(input.item.tenderDossier);
    case "labor_calc": {
      const line = costStackLine(input.ownerFinanceProposal, ["robociz", "robocizn"]);
      return Boolean(line)
        || (input.ownerFinanceProposal?.ok && input.ownerFinanceProposal.costPricePln != null);
    }
    case "material_calc": {
      const line = costStackLine(input.ownerFinanceProposal, ["materiał", "material"]);
      return Boolean(line) || input.ownerFinanceProposal?.ok === true;
    }
    case "risk_assess":
      return (
        input.intelligenceCtx != null
        && (riskCount(input) > 0 || deriveAutonomousPipelineComplete(input))
      );
    case "profitability":
      return input.intelligenceCtx?.finance.marginPct != null;
    case "recommendation_prep":
      return deriveAutonomousScoringReady(input);
    default:
      return phaseView.achievements.some((a) => a.phaseId === stepId);
  }
}

function isStepSkipped(
  stepId: AutonomousTimelineStepId,
  input: DeriveAutonomousRunPhaseInput,
): boolean {
  const settled = isDocumentDiscoverySettled(input.item);
  const docs = attachmentCount(input);

  switch (stepId) {
    case "doc_found":
      return settled && docs === 0;
    case "swz_found":
      return settled && docs === 0;
    case "boq_detect":
      return settled && docs === 0;
    case "scope_infer":
      return settled && docs === 0 && !input.dossierBuilding && !input.dossierSaving;
    case "dossier_build":
      return (
        settled
        && docs === 0
        && !tenderDossierHeavyParseDone(input.item.tenderDossier)
        && deriveAutonomousPipelineComplete(input)
      );
    default:
      return false;
  }
}

function isStepPartial(
  stepId: AutonomousTimelineStepId,
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
): boolean {
  if (isStepSkipped(stepId, input)) return false;

  const settled = isDocumentDiscoverySettled(input.item);
  const docs = attachmentCount(input);

  if (stepId === "doc_fetch" && settled && docs === 0) return true;

  if (
    stepId === "boq_detect"
    && settled
    && docs > 0
    && resolvedCostStatus(input.item) === "NOT_FOUND"
    && deriveAutonomousPipelineComplete(input)
  ) {
    return true;
  }

  if (
    stepId === "profitability"
    && input.intelligenceCtx != null
    && input.intelligenceCtx.finance.marginPct == null
    && phaseView.scoringReady
  ) {
    return true;
  }

  if (
    stepId === "profitability"
    && input.intelligenceCtx != null
    && input.intelligenceCtx.finance.marginPct == null
    && !tenderDossierHeavyParseDone(input.item.tenderDossier)
    && deriveAutonomousPipelineComplete(input)
  ) {
    return true;
  }

  return false;
}

function isStepComplete(
  stepId: AutonomousTimelineStepId,
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
): boolean {
  if (stepId === "doc_found") {
    return isDocumentDiscoverySettled(input.item) && attachmentCount(input) > 0;
  }
  return isSpecPhaseComplete(stepId, input, phaseView);
}

function resolveActiveStepId(
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
): AutonomousTimelineStepId | null {
  if (phaseView.runComplete) return null;

  const raw = phaseView.activePhaseId;
  if (raw === "complete") return null;

  if (AUTONOMOUS_TIMELINE_STEP_ORDER.includes(raw as AutonomousTimelineStepId)) {
    return raw as AutonomousTimelineStepId;
  }

  return "doc_fetch";
}

function deriveStepStatus(
  stepId: AutonomousTimelineStepId,
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
  activeStepId: AutonomousTimelineStepId | null,
): AutonomousTimelineStepStatus {
  if (isStepSkipped(stepId, input)) return "skipped";
  if (isStepPartial(stepId, input, phaseView)) return "partial";
  if (isStepComplete(stepId, input, phaseView)) return "done";
  if (activeStepId === stepId) return "active";
  return "pending";
}

function aggregateMacroStatus(
  statuses: AutonomousTimelineStepStatus[],
): AutonomousTimelineStepStatus {
  for (const status of MACRO_AGGREGATE_ORDER) {
    if (statuses.includes(status)) return status;
  }
  return "done";
}

export function deriveAutonomousRunTimelineView(
  input: DeriveAutonomousRunPhaseInput,
  phaseView: AutonomousRunPhaseView,
): AutonomousRunTimelineView {
  const activeStepId = resolveActiveStepId(input, phaseView);

  const steps: AutonomousTimelineStepView[] = AUTONOMOUS_TIMELINE_STEP_ORDER.map((id) => {
    const status = deriveStepStatus(id, input, phaseView, activeStepId);
    return {
      id,
      label: AUTONOMOUS_TIMELINE_STEP_LABELS[id],
      macroId: STEP_MACRO[id],
      status,
    };
  });

  const macros: AutonomousTimelineMacroView[] = (
    Object.keys(MACRO_STEP_ORDER) as AutonomousTimelineMacroId[]
  ).map((macroId) => {
    const stepIds = MACRO_STEP_ORDER[macroId];
    const childStatuses = steps
      .filter((s) => stepIds.includes(s.id))
      .map((s) => s.status);
    return {
      id: macroId,
      label: AUTONOMOUS_TIMELINE_MACRO_LABELS[macroId],
      status: aggregateMacroStatus(childStatuses),
      steps: stepIds,
    };
  });

  const activeMacroId = activeStepId ? STEP_MACRO[activeStepId] : null;

  return {
    steps,
    macros,
    activeStepId,
    activeMacroId,
  };
}

/** Mapowanie phaseId (runtime) → timeline step (12 kroków). */
export function autonomousPhaseIdToTimelineStep(
  phaseId: AutonomousRunPhaseId,
): AutonomousTimelineStepId | null {
  if (phaseId === "complete") return null;
  if (AUTONOMOUS_TIMELINE_STEP_ORDER.includes(phaseId as AutonomousTimelineStepId)) {
    return phaseId as AutonomousTimelineStepId;
  }
  return null;
}
