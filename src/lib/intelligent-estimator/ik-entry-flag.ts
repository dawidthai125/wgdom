/**
 * IK-MIGRATION-01 P1/P2/P3/P4 — first-screen + controlled P2–P4 flags.
 * SSOT: AppSettings (kw-app-settings). Defaults OFF.
 * Independent of Decydent / Dual Outcome master (D).
 */

import { loadAppSettingsLocal } from "@/lib/app-settings";

export type IkDetailFirstScreen = "ng10_gate" | "ik_entry";

export type IkP4BoqGateStatus =
  | "ready"
  | "partial"
  | "hold"
  | "gap"
  | "pending"
  | null
  | undefined;

export type IkP4ChiefEligibilityInput = {
  ikEntryEnabled: boolean;
  ikChiefWiringEnabled: boolean;
  pricingReady: boolean;
  /** When known — HOLD/GAP block P4 Chief even if pricingReady is stale. */
  boqStatus?: IkP4BoqGateStatus;
};

let ikEntryForTests: boolean | null = null;
let ikAutoIngestForTests: boolean | null = null;
let ikIdentityCoverageForTests: boolean | null = null;
let ikChiefWiringForTests: boolean | null = null;

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

/** Test-only override for P4 Chief Wiring (null = AppSettings). */
export function forceIkChiefWiringForTests(on: boolean | null): void {
  ikChiefWiringForTests = on;
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
 * P4 Chief Wiring preference (AppSettings).
 * Default OFF. Does NOT flip Dual Outcome master (D).
 * Does NOT enable Labor/Material research.
 */
export function isIkChiefWiringEnabled(): boolean {
  if (ikChiefWiringForTests != null) return ikChiefWiringForTests;
  return loadAppSettingsLocal().ikChiefWiringEnabled === true;
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

/**
 * Pure P4 Chief eligibility (testable).
 * Requires IK ON ∧ P4 enable ∧ pricingReady ∧ not HOLD/GAP.
 */
export function resolveIkP4ChiefEligible(input: IkP4ChiefEligibilityInput): boolean {
  if (input.ikEntryEnabled !== true) return false;
  if (input.ikChiefWiringEnabled !== true) return false;
  if (input.pricingReady !== true) return false;
  if (input.boqStatus === "hold" || input.boqStatus === "gap") return false;
  return true;
}

/**
 * P4 Chief-under-IK preference active (flags only — still needs pricingReady at call site).
 * Does NOT imply Dual Outcome / D.
 */
export function isIkP4ChiefWiringPreferenceActive(): boolean {
  return isIkEntryEnabled() === true && isIkChiefWiringEnabled() === true;
}

/**
 * Runtime P4 Chief seam: preference ∧ pricingReady ∧ optional BOQ gate.
 */
export function isIkP4ChiefSessionEligible(opts: {
  pricingReady: boolean;
  boqStatus?: IkP4BoqGateStatus;
}): boolean {
  return resolveIkP4ChiefEligible({
    ikEntryEnabled: isIkEntryEnabled(),
    ikChiefWiringEnabled: isIkChiefWiringEnabled(),
    pricingReady: opts.pricingReady === true,
    boqStatus: opts.boqStatus,
  });
}

export function resolveIkDetailFirstScreen(
  ikEntryEnabled: boolean,
): IkDetailFirstScreen {
  return ikEntryEnabled === true ? "ik_entry" : "ng10_gate";
}
