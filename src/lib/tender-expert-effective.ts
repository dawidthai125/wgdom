/**
 * TENDER-MODERNIZATION-01 / S2 — Expert-effective = Module effective.
 * REUSE adminCanViewTendersTab · NO NEW FLAG · LS = kill-switch only.
 */

import {
  adminCanViewTendersTab,
  type AdminRole,
} from "@/lib/admin-auth";
import {
  loadAppSettingsLocal,
  type AppSettings,
} from "@/lib/app-settings";
import {
  CHIEF_ORCHESTRATOR_SESSION_LS_KEY,
  isChiefOrchestratorSessionEnabled,
} from "@/lib/chief-session";
import {
  DECISION_WORKSPACE_LS_KEY,
  isDecisionWorkspaceEnabled,
} from "@/lib/decision-workspace-ui";

export type TenderExpertEffectiveSettings = {
  tendersTabForStaffEnabled?: boolean;
};

let expertEffectiveForTests: boolean | null = null;
let chiefStackForTests: boolean | null = null;
let dwStackForTests: boolean | null = null;

/** Test-only override (null = compute). */
export function forceTenderExpertEffectiveForTests(on: boolean | null): void {
  expertEffectiveForTests = on;
}

/** Test-only Session stack override. */
export function forceChiefSessionStackForTests(on: boolean | null): void {
  chiefStackForTests = on;
}

/** Test-only DW stack override. */
export function forceDecisionWorkspaceStackForTests(on: boolean | null): void {
  dwStackForTests = on;
}

/**
 * Production Expert-effective = Module access (S1 gate).
 */
export function isTenderExpertEffective(
  role: AdminRole | null | undefined,
  settings: TenderExpertEffectiveSettings | AppSettings,
): boolean {
  if (expertEffectiveForTests != null) return expertEffectiveForTests;
  if (!role) return false;
  return adminCanViewTendersTab(role, settings);
}

/** Convenience: role + local AppSettings. */
export function resolveTenderExpertEffective(
  role: AdminRole | null | undefined,
): boolean {
  return isTenderExpertEffective(role, loadAppSettingsLocal());
}

type KillMode = "force_off" | "force_on" | "unset";

function readKillMode(lsKey: string): KillMode {
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
 * Chief Session stack visibility.
 * Expert ON → ON unless LS kill "0".
 * Expert OFF → legacy isChiefOrchestratorSessionEnabled() (tip default OFF).
 */
export function isChiefSessionStackEnabled(expertEffective: boolean): boolean {
  if (chiefStackForTests != null) return chiefStackForTests;
  const kill = readKillMode(CHIEF_ORCHESTRATOR_SESSION_LS_KEY);
  if (kill === "force_off") return false;
  if (kill === "force_on") return true;
  if (expertEffective) return true;
  return isChiefOrchestratorSessionEnabled();
}

/**
 * Decision Workspace stack visibility.
 * Expert ON → ON unless LS kill "0".
 * Expert OFF → legacy isDecisionWorkspaceEnabled() (tip default OFF).
 */
export function isDecisionWorkspaceStackEnabled(expertEffective: boolean): boolean {
  if (dwStackForTests != null) return dwStackForTests;
  const kill = readKillMode(DECISION_WORKSPACE_LS_KEY);
  if (kill === "force_off") return false;
  if (kill === "force_on") return true;
  if (expertEffective) return true;
  return isDecisionWorkspaceEnabled();
}

/** True when Expert ON but DW stack killed — legacy human CTAs stay non-PRIMARY. */
export function isTenderExpertDwKillActive(expertEffective: boolean): boolean {
  return expertEffective && !isDecisionWorkspaceStackEnabled(expertEffective);
}
