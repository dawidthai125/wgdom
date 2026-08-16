/**
 * IK-MIGRATION-01 P1–P6 — first-screen + controlled P2–P6 flags.
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

export type IkP5LaborExecuteResearchInput = {
  ikEntryEnabled: boolean;
  ikLaborE2eEnabled: boolean;
  ikLaborResearchEnabled: boolean;
};

export type IkP6MaterialExecuteResearchInput = {
  ikEntryEnabled: boolean;
  ikMaterialE2eEnabled: boolean;
  ikMaterialResearchEnabled: boolean;
};

let ikEntryForTests: boolean | null = null;
let ikAutoIngestForTests: boolean | null = null;
let ikIdentityCoverageForTests: boolean | null = null;
let ikChiefWiringForTests: boolean | null = null;
let ikLaborE2eForTests: boolean | null = null;
let ikLaborResearchForTests: boolean | null = null;
let ikMaterialE2eForTests: boolean | null = null;
let ikMaterialResearchForTests: boolean | null = null;

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

/** Test-only override for P5 Labor E2E (null = AppSettings). */
export function forceIkLaborE2eForTests(on: boolean | null): void {
  ikLaborE2eForTests = on;
}

/** Test-only override for P5 Labor research (null = AppSettings). */
export function forceIkLaborResearchForTests(on: boolean | null): void {
  ikLaborResearchForTests = on;
}

/** Test-only override for P6 Material E2E (null = AppSettings). */
export function forceIkMaterialE2eForTests(on: boolean | null): void {
  ikMaterialE2eForTests = on;
}

/** Test-only override for P6 Material research (null = AppSettings). */
export function forceIkMaterialResearchForTests(on: boolean | null): void {
  ikMaterialResearchForTests = on;
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
 * P5 Labor E2E preference (MODE A capable). Default OFF.
 * Does NOT enable Material · Does NOT flip Chief · Does NOT flip D.
 */
export function isIkLaborE2eEnabled(): boolean {
  if (ikLaborE2eForTests != null) return ikLaborE2eForTests;
  return loadAppSettingsLocal().ikLaborE2eEnabled === true;
}

/**
 * P5 Labor selective research preference (MODE B). Default OFF.
 * Alone does NOT run Labor — requires Labor E2E + IK Entry.
 */
export function isIkLaborResearchEnabled(): boolean {
  if (ikLaborResearchForTests != null) return ikLaborResearchForTests;
  return loadAppSettingsLocal().ikLaborResearchEnabled === true;
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

/** P5 MODE A active: IK ON ∧ Labor E2E ON. */
export function isIkP5LaborE2eActive(): boolean {
  return isIkEntryEnabled() === true && isIkLaborE2eEnabled() === true;
}

/**
 * Pure P5 MODE B research permission (flags only).
 * MUST be `=== true` on all three — never undefined→research.
 */
export function resolveIkP5LaborExecuteResearch(
  input: IkP5LaborExecuteResearchInput,
): boolean {
  return (
    input.ikEntryEnabled === true
    && input.ikLaborE2eEnabled === true
    && input.ikLaborResearchEnabled === true
  );
}

/** Runtime: explicit MODE B executeResearch flag for Labor Expert call site. */
export function isIkP5LaborExecuteResearchActive(): boolean {
  return resolveIkP5LaborExecuteResearch({
    ikEntryEnabled: isIkEntryEnabled(),
    ikLaborE2eEnabled: isIkLaborE2eEnabled(),
    ikLaborResearchEnabled: isIkLaborResearchEnabled(),
  });
}

/**
 * P6 Material E2E preference (MODE A capable). Default OFF.
 * Does NOT enable Labor · Does NOT flip Chief · Does NOT flip D.
 */
export function isIkMaterialE2eEnabled(): boolean {
  if (ikMaterialE2eForTests != null) return ikMaterialE2eForTests;
  return loadAppSettingsLocal().ikMaterialE2eEnabled === true;
}

/**
 * P6 Material selective research preference (MODE B). Default OFF.
 * Alone does NOT run Material — requires Material E2E + IK Entry.
 */
export function isIkMaterialResearchEnabled(): boolean {
  if (ikMaterialResearchForTests != null) return ikMaterialResearchForTests;
  return loadAppSettingsLocal().ikMaterialResearchEnabled === true;
}

/** P6 MODE A active: IK ON ∧ Material E2E ON. */
export function isIkP6MaterialE2eActive(): boolean {
  return isIkEntryEnabled() === true && isIkMaterialE2eEnabled() === true;
}

/**
 * Pure P6 MODE B research permission (flags only).
 * MUST be `=== true` on all three — never undefined→research.
 */
export function resolveIkP6MaterialExecuteResearch(
  input: IkP6MaterialExecuteResearchInput,
): boolean {
  return (
    input.ikEntryEnabled === true
    && input.ikMaterialE2eEnabled === true
    && input.ikMaterialResearchEnabled === true
  );
}

/** Runtime: explicit MODE B executeResearch flag for Material Expert call site. */
export function isIkP6MaterialExecuteResearchActive(): boolean {
  return resolveIkP6MaterialExecuteResearch({
    ikEntryEnabled: isIkEntryEnabled(),
    ikMaterialE2eEnabled: isIkMaterialE2eEnabled(),
    ikMaterialResearchEnabled: isIkMaterialResearchEnabled(),
  });
}

export function resolveIkDetailFirstScreen(
  ikEntryEnabled: boolean,
): IkDetailFirstScreen {
  return ikEntryEnabled === true ? "ik_entry" : "ng10_gate";
}
