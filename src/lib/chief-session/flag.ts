/**
 * WIRE-CHIEF-SESSION-01 — Feature flag Session (default OFF).
 * LS `kw-chief-orchestrator-session` · wartość `'1'` = ON.
 * Bez auto-start dla wszystkich użytkowników.
 */

export const CHIEF_ORCHESTRATOR_SESSION_DEFAULT = false;

export const CHIEF_ORCHESTRATOR_SESSION_LS_KEY = "kw-chief-orchestrator-session";

let chiefSessionFlagForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceChiefOrchestratorSessionForTests(on: boolean | null): void {
  chiefSessionFlagForTests = on;
}

/**
 * Czy Session Chief może startować w runtime.
 * OFF ⇒ tip parity (brak runChiefOrchestrator z app).
 */
export function isChiefOrchestratorSessionEnabled(): boolean {
  if (chiefSessionFlagForTests != null) return chiefSessionFlagForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(CHIEF_ORCHESTRATOR_SESSION_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return CHIEF_ORCHESTRATOR_SESSION_DEFAULT;
}
