/**
 * DECISION-WORKSPACE-01 — Feature flag (default OFF).
 * LS `kw-decision-workspace` · wartość `'1'` = ON.
 * Read-only flag · zero write decyzji.
 */

export const DECISION_WORKSPACE_DEFAULT = false;

export const DECISION_WORKSPACE_LS_KEY = "kw-decision-workspace";

let decisionWorkspaceFlagForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceDecisionWorkspaceForTests(on: boolean | null): void {
  decisionWorkspaceFlagForTests = on;
}

/**
 * Czy Decision Workspace może się renderować.
 * OFF ⇒ brak DOM surface (tip parity).
 */
export function isDecisionWorkspaceEnabled(): boolean {
  if (decisionWorkspaceFlagForTests != null) return decisionWorkspaceFlagForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(DECISION_WORKSPACE_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return DECISION_WORKSPACE_DEFAULT;
}
