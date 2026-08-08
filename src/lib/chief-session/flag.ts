/**
 * WIRE-CHIEF-SESSION-01 + EXPERT-AI-PRODUCTION-ENABLEMENT-01 —
 * Feature flag Session.
 *
 * Precedence (LOCKED): LS "0" > LS "1" > AppSettings.expertAiDecydentEnabled > false
 * Legacy LS = kill-switch / OV force only — NOT a new master flag system.
 */

import { loadAppSettingsLocal } from "@/lib/app-settings";

export const CHIEF_ORCHESTRATOR_SESSION_DEFAULT = false;

export const CHIEF_ORCHESTRATOR_SESSION_LS_KEY = "kw-chief-orchestrator-session";

let chiefSessionFlagForTests: boolean | null = null;

/** Test-only override (null = użyj LS / AppSettings / default). */
export function forceChiefOrchestratorSessionForTests(on: boolean | null): void {
  chiefSessionFlagForTests = on;
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
 * Czy Session Chief może startować w runtime.
 * OFF ⇒ tip parity (brak runChiefOrchestrator z app) gdy AppSettings OFF i brak LS OV.
 */
export function isChiefOrchestratorSessionEnabled(): boolean {
  if (chiefSessionFlagForTests != null) return chiefSessionFlagForTests;
  const tri = resolveLegacyTriState(CHIEF_ORCHESTRATOR_SESSION_LS_KEY);
  if (tri === "force_off") return false;
  if (tri === "force_on") return true;
  return loadAppSettingsLocal().expertAiDecydentEnabled === true;
}
