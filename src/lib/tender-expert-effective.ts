/**
 * TENDER-MODERNIZATION-01 / S2 + EXPERT-AI-P0-DUAL-ENABLEMENT
 *
 * AXIS-M: isTenderExpertEffective = module ACCESS only (adminCanViewTendersTab).
 * AXIS-D: AppSettings Decydent master → Session/Decision runtime.
 *
 * Presentation / Dual Outcome / Offer PLN / stacks follow D Session —
 * NEVER raw M alone (P0 DF).
 */

import {
  adminCanViewTendersTab,
  type AdminRole,
} from "@/lib/admin-auth";
import {
  loadAppSettingsLocal,
  type AppSettings,
} from "@/lib/app-settings";
import { isChiefOrchestratorSessionEnabled } from "@/lib/chief-session";
import { isDecisionWorkspaceEnabled } from "@/lib/decision-workspace-ui";

export type TenderExpertEffectiveSettings = {
  tendersTabForStaffEnabled?: boolean;
};

let expertEffectiveForTests: boolean | null = null;
let chiefStackForTests: boolean | null = null;
let dwStackForTests: boolean | null = null;
let runtimeEffectiveForTests: boolean | null = null;

/** Test-only override (null = compute). ACCESS axis only. */
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

/** Test-only Expert AI runtime override (null = Session flag). */
export function forceExpertAiRuntimeEffectiveForTests(on: boolean | null): void {
  runtimeEffectiveForTests = on;
}

/**
 * AXIS-M — module access (S1). Does NOT imply Chief/Decydent runtime.
 */
export function isTenderExpertEffective(
  role: AdminRole | null | undefined,
  settings: TenderExpertEffectiveSettings | AppSettings,
): boolean {
  if (expertEffectiveForTests != null) return expertEffectiveForTests;
  if (!role) return false;
  return adminCanViewTendersTab(role, settings);
}

/** Convenience: ACCESS + local AppSettings. */
export function resolveTenderExpertEffective(
  role: AdminRole | null | undefined,
): boolean {
  return isTenderExpertEffective(role, loadAppSettingsLocal());
}

/**
 * AXIS-D Session — Expert AI runtime active (thin alias).
 * = isChiefOrchestratorSessionEnabled() · no new storage.
 */
export function isExpertAiRuntimeEffective(): boolean {
  if (runtimeEffectiveForTests != null) return runtimeEffectiveForTests;
  return isChiefOrchestratorSessionEnabled();
}

/**
 * Chief Session stack visibility.
 * P0: delegates to D Session flag (LS already inside). Ignores M.
 * `_accessEffective` retained for call-site API stability only.
 */
export function isChiefSessionStackEnabled(_accessEffective?: boolean): boolean {
  if (chiefStackForTests != null) return chiefStackForTests;
  return isChiefOrchestratorSessionEnabled();
}

/**
 * Decision Workspace stack visibility.
 * P0: delegates to D Decision flag (coupling + LS inside). Ignores M.
 */
export function isDecisionWorkspaceStackEnabled(_accessEffective?: boolean): boolean {
  if (dwStackForTests != null) return dwStackForTests;
  return isDecisionWorkspaceEnabled();
}

/**
 * True when Expert AI runtime ON but DW stack killed (Decision LS "0").
 * Legacy human CTAs stay non-PRIMARY.
 */
export function isTenderExpertDwKillActive(_accessEffective?: boolean): boolean {
  return isExpertAiRuntimeEffective() && !isDecisionWorkspaceStackEnabled();
}
