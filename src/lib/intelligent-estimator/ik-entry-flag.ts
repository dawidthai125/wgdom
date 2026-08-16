/**
 * IK-MIGRATION-01 P1/P2/P3 — first-screen + controlled P2/P3 flags.
 * SSOT: AppSettings (kw-app-settings). Defaults OFF.
 * Independent of Decydent / Dual Outcome master.
 */

import { loadAppSettingsLocal } from "@/lib/app-settings";

export type IkDetailFirstScreen = "ng10_gate" | "ik_entry";

let ikEntryForTests: boolean | null = null;
let ikAutoIngestForTests: boolean | null = null;
let ikIdentityCoverageForTests: boolean | null = null;

/** Test-only override (null = AppSettings). */
export function forceIkEntryEnabledForTests(on: boolean | null): void {
  ikEntryForTests = on;
}

/** Test-only override for P2 AUTO_INGEST (null = AppSettings). */
export function forceIkAutoIngestForTests(on: boolean | null): void {
  ikAutoIngestForTests = on;
}

/** Test-only override for P3 IDENTITY_COVERAGE (null = AppSettings). */
export function forceIkIdentityCoverageForTests(on: boolean | null): void {
  ikIdentityCoverageForTests = on;
}

export function isIkEntryEnabled(): boolean {
  if (ikEntryForTests != null) return ikEntryForTests;
  return loadAppSettingsLocal().ikEntryEnabled === true;
}

/**
 * P2 Documents→BOQ auto-ingest preference (AppSettings).
 * Default OFF. Does NOT imply research/experts.
 */
export function isIkAutoIngestEnabled(): boolean {
  if (ikAutoIngestForTests != null) return ikAutoIngestForTests;
  return loadAppSettingsLocal().ikAutoIngestEnabled === true;
}

/**
 * P3 Identity Coverage preference (AppSettings).
 * Default OFF. Sole P3 lever. Does NOT enable research/experts.
 */
export function isIkIdentityCoverageEnabled(): boolean {
  if (ikIdentityCoverageForTests != null) return ikIdentityCoverageForTests;
  return loadAppSettingsLocal().ikIdentityCoverageEnabled === true;
}

/**
 * P2 active seam: IK Entry ON ∧ AUTO_INGEST ON.
 * IK ON alone does NOT run Documents→BOQ.
 */
export function isIkP2DocumentsBoqActive(): boolean {
  return isIkEntryEnabled() === true && isIkAutoIngestEnabled() === true;
}

/**
 * P3 Identity Coverage active seam: IK Entry ON ∧ IDENTITY_COVERAGE ON.
 * Does NOT imply EXECUTE_RESEARCH / RUN_RATE_EXPERTS.
 */
export function isIkP3IdentityCoverageActive(): boolean {
  return isIkEntryEnabled() === true && isIkIdentityCoverageEnabled() === true;
}

export function resolveIkDetailFirstScreen(
  ikEntryEnabled: boolean,
): IkDetailFirstScreen {
  return ikEntryEnabled === true ? "ik_entry" : "ng10_gate";
}
