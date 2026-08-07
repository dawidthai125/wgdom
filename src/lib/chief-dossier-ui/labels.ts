/**
 * WIRE-CHIEF-UI-DOSSIER-01 — enum → PL labels (presentational only).
 */

import type { ChiefCaseStatus, ChiefTaskId, ChiefTaskStatus } from "@/lib/chief-orchestrator";
import type { ChiefSessionStatus } from "@/lib/chief-session";
import type { ChiefDossierColorToken, ChiefDossierIconKey, ChiefTraceRole } from "./types";

export const CHIEF_DOSSIER_SURFACE_TITLE_PL = "Przebieg ekspertów";
export const CHIEF_DOSSIER_SURFACE_SUBTITLE_PL = "Dossier Chief — tylko odczyt";

export function labelSessionStatusPl(status: ChiefSessionStatus): string {
  switch (status) {
    case "idle":
      return "Bezczynna";
    case "checking":
      return "Sprawdzanie";
    case "running":
      return "W toku";
    case "waiting":
      return "Oczekiwanie RETURN";
    case "blocked":
      return "Zablokowana";
    case "ready_for_decydent":
      return "Gotowe dla Decydenta";
    case "cancelled":
      return "Anulowana";
    case "finished":
      return "Zakończona";
    default:
      return status;
  }
}

export function labelCaseStatusPl(status: ChiefCaseStatus): string {
  switch (status) {
    case "idle":
      return "Bezczynny";
    case "running":
      return "W toku";
    case "waiting_return":
      return "Oczekiwanie RETURN";
    case "blocked":
      return "Zablokowany";
    case "ready_for_decydent":
      return "Gotowy dla Decydenta";
    default:
      return status;
  }
}

export function labelTaskIdPl(id: ChiefTaskId | string): string {
  switch (id) {
    case "T1_execution":
      return "T1 · Wykonanie";
    case "T2_materials":
      return "T2 · Materiały";
    case "T3_pricing":
      return "T3 · Ceny rynkowe";
    case "T2_materials_return":
      return "T2 · Materiały (RETURN)";
    case "T3_pricing_return":
      return "T3 · Ceny (RETURN)";
    case "T4_cost":
      return "T4 · Koszt";
    case "T5_offer":
      return "T5 · Oferta";
    case "T6_assemble_dossier":
      return "T6 · Dossier";
    default:
      return String(id);
  }
}

export function labelTaskStatusPl(status: ChiefTaskStatus | string): string {
  switch (status) {
    case "pending":
      return "Oczekuje";
    case "running":
      return "W toku";
    case "done":
      return "Gotowe";
    case "failed":
      return "Błąd";
    case "skipped":
      return "Pominięte";
    default:
      return String(status);
  }
}

export function taskStatusColor(status: ChiefTaskStatus | string): ChiefDossierColorToken {
  switch (status) {
    case "done":
      return "success";
    case "failed":
      return "destructive";
    case "running":
      return "primary";
    case "skipped":
      return "muted";
    default:
      return "muted";
  }
}

export function taskStatusIconKey(status: ChiefTaskStatus | string): ChiefDossierIconKey {
  switch (status) {
    case "done":
      return "taskDone";
    case "failed":
      return "taskFailed";
    case "running":
      return "taskRunning";
    case "skipped":
      return "taskSkipped";
    default:
      return "taskPending";
  }
}

export function labelTraceRolePl(role: ChiefTraceRole): string {
  switch (role) {
    case "execution":
      return "Wykonanie";
    case "materials":
      return "Materiały";
    case "pricing":
      return "Ceny rynkowe";
    case "cost":
      return "Koszt";
    case "offer":
      return "Oferta";
    default:
      return role;
  }
}

export function traceRoleIconKey(role: ChiefTraceRole): ChiefDossierIconKey {
  switch (role) {
    case "execution":
      return "hammer";
    case "materials":
      return "package";
    case "pricing":
      return "trending";
    case "cost":
      return "calculator";
    case "offer":
      return "badge";
    default:
      return "flag";
  }
}

export function labelPewnoscPl(pewnosc: string): string {
  switch (pewnosc) {
    case "high":
      return "Wysoka";
    case "medium":
      return "Średnia";
    case "low":
      return "Niska";
    default:
      return pewnosc;
  }
}

export function labelZgodnoscPl(z: string): string {
  switch (z) {
    case "aligned":
      return "Zgodne";
    case "partial":
      return "Częściowo";
    case "not_aligned":
      return "Niezgodne";
    default:
      return z;
  }
}

export function labelSessionErrorPl(error: string | null): string | null {
  if (!error) return null;
  switch (error) {
    case "not_ready_for_chief_input":
      return "Brak gotowego przedmiaru / OfferBoq do orkiestracji.";
    case "pricing_not_ready":
      return "Kosztorys / pricing pipeline jeszcze niegotowy.";
    case "cancelled":
      return "Sesja anulowana — dane Case nieważne.";
    default:
      return error;
  }
}

export function phaseStatusIconKey(
  phase: import("./types").ChiefDossierUiPhase,
): ChiefDossierIconKey {
  switch (phase) {
    case "checking":
      return "search";
    case "running":
      return "loader";
    case "blocked":
      return "ban";
    case "ready":
      return "check";
    case "cancelled":
      return "x";
    case "error":
      return "alert";
    case "not_ready":
      return "alert";
    case "no_case":
      return "idle";
    default:
      return "flag";
  }
}

export function phaseStatusColor(
  phase: import("./types").ChiefDossierUiPhase,
): ChiefDossierColorToken {
  switch (phase) {
    case "ready":
      return "success";
    case "blocked":
    case "error":
      return "destructive";
    case "running":
    case "checking":
      return "primary";
    case "not_ready":
    case "cancelled":
      return "warning";
    default:
      return "muted";
  }
}
