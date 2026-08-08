/**
 * DECISION-WORKSPACE-01 — etykiety PL (presentational).
 */

import type { DecydentActionId, DecisionWorkspaceUiPhase } from "./types";
import type { ValidationVerdict } from "@/lib/validation-expert";

export const DECISION_WORKSPACE_TITLE_PL = "Decyzja Decydenta";
export const DECISION_WORKSPACE_SUBTITLE_PL =
  "PRIMARY decyzja człowieka (Expert-effective) — zapis lokalny Persist";

export const TRE01_NOTE_PL =
  "TRE-01 = rekomendacja ceny / procesu — nie decyzja Decydenta";

export function labelVerdictPl(verdict: ValidationVerdict | null): string | null {
  if (!verdict) return null;
  switch (verdict) {
    case "validated":
      return "Zweryfikowany";
    case "needs_review":
      return "Wymaga przeglądu";
    case "blocked":
      return "Zablokowany (jakość)";
    default:
      return String(verdict);
  }
}

export function labelActionPl(action: DecydentActionId): string {
  switch (action) {
    case "approve":
      return "Zatwierdź";
    case "reject":
      return "Odrzuć";
    case "needs_review":
      return "Do przeglądu";
    case "return":
      return "Wróć";
    default:
      return String(action);
  }
}

export function labelProcessStatusPl(
  sessionStatus: string,
  caseStatus: string | null,
): string {
  if (caseStatus === "blocked" || sessionStatus === "blocked") {
    return "Zablokowany";
  }
  if (
    sessionStatus === "running" ||
    sessionStatus === "checking" ||
    sessionStatus === "waiting" ||
    caseStatus === "running" ||
    caseStatus === "waiting_return"
  ) {
    return "W toku";
  }
  if (
    sessionStatus === "ready_for_decydent" ||
    caseStatus === "ready_for_decydent"
  ) {
    return "Gotowe dla Decydenta";
  }
  if (sessionStatus === "cancelled") return "Anulowany";
  if (sessionStatus === "finished") return "Zakończony";
  if (sessionStatus === "idle") return "Bezczynny";
  return sessionStatus || caseStatus || "—";
}

export function processChipPl(processStatusLabelPl: string): string {
  return `Proces: ${processStatusLabelPl}`;
}

export function qaChipPl(verdictLabelPl: string | null): string {
  if (!verdictLabelPl) return "Walidacja: brak";
  return `Walidacja: ${verdictLabelPl}`;
}

export function businessDecisionChipPl(
  action: DecydentActionId | null,
): string {
  if (!action || action === "return") return "Decyzja: brak";
  switch (action) {
    case "approve":
      return "Decyzja: zatwierdzono";
    case "reject":
      return "Decyzja: odrzucono";
    case "needs_review":
      return "Decyzja: do przeglądu";
    default:
      return "Decyzja: brak";
  }
}

export function emptyMessageForPhase(
  phase: DecisionWorkspaceUiPhase,
): string | null {
  switch (phase) {
    case "hidden":
      return null;
    case "no_dossier":
      return "Brak dossier Chief — Decision Workspace niedostępny.";
    case "process_running":
      return "Trwa orkiestracja ekspertów…";
    case "process_blocked":
      return "Proces zablokowany — decyzja Approve niedostępna.";
    case "error":
      return "Nie udało się odczytać walidacji";
    default:
      return null;
  }
}
