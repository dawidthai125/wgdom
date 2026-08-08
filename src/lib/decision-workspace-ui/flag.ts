/**
 * DECISION-WORKSPACE-01 + EXPERT-AI-PRODUCTION-ENABLEMENT-01 —
 * Feature flag Decision Workspace.
 *
 * Coupling (LOCKED): Decision effective ⇒ Session effective.
 * Precedence (LOCKED): LS "0" > LS "1" > AppSettings.expertAiDecydentEnabled > false
 * Legacy LS = kill-switch / OV force only.
 */

import { loadAppSettingsLocal } from "@/lib/app-settings";
import { isChiefOrchestratorSessionEnabled } from "@/lib/chief-session/flag";

export const DECISION_WORKSPACE_DEFAULT = false;

export const DECISION_WORKSPACE_LS_KEY = "kw-decision-workspace";

let decisionWorkspaceFlagForTests: boolean | null = null;

/** Test-only override (null = użyj LS / AppSettings / default). */
export function forceDecisionWorkspaceForTests(on: boolean | null): void {
  decisionWorkspaceFlagForTests = on;
}

type LegacyTriState = "force_off" | "force_on" | "unset";

function resolveLegacyTriState(lsKey: string): LegacyTriState {
  if (typeof localStorage === "undefined") return "unset";
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw === "0") return "force_off";
    if (raw === "1") return "force_on";
  } catch {
    /* private mode */
  }
  return "unset";
}

/**
 * Czy Decision Workspace może się renderować.
 * OFF ⇒ brak DOM surface (tip parity) gdy AppSettings OFF i brak LS OV.
 * Coupling: Session OFF ⇒ Decision OFF.
 */
export function isDecisionWorkspaceEnabled(): boolean {
  if (decisionWorkspaceFlagForTests != null) return decisionWorkspaceFlagForTests;
  // Coupling: Decision ⇒ Session
  if (!isChiefOrchestratorSessionEnabled()) return false;
  const tri = resolveLegacyTriState(DECISION_WORKSPACE_LS_KEY);
  if (tri === "force_off") return false;
  if (tri === "force_on") return true;
  return loadAppSettingsLocal().expertAiDecydentEnabled === true;
}
