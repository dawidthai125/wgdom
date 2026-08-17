/**
 * IK-MIGRATION-01 P1–P8 — first-screen + controlled P2–P8 flags.
 * SSOT: AppSettings (kw-app-settings).
 * P5/P6/P7/P8: AUTO|ON = MODE A / RO · OFF = HOLD · Research remains separate boolean === true.
 * Independent of Decydent / Dual Outcome master (D).
 */

import { isIkE2eModeActive, loadAppSettingsLocal, type IkE2eMode } from "@/lib/app-settings";

/** P10 — NG-10 first-screen removed; sole first-screen class is IK entry. */
export type IkDetailFirstScreen = "ik_entry";

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
  /** Boolean MODE A capability — NEVER pass raw "AUTO"|"OFF"|"ON". */
  ikLaborE2eEnabled: boolean;
  ikLaborResearchEnabled: boolean;
};

export type IkP6MaterialExecuteResearchInput = {
  ikEntryEnabled: boolean;
  /** Boolean MODE A capability — NEVER pass raw "AUTO"|"OFF"|"ON". */
  ikMaterialE2eEnabled: boolean;
  ikMaterialResearchEnabled: boolean;
};

export type IkP7F5E2eEligibilityInput = {
  ikEntryEnabled: boolean;
  /** Boolean MODE A capability — NEVER pass raw "AUTO"|"OFF"|"ON". */
  ikF5E2eEnabled: boolean;
};

export type IkP8RiskDecisionE2eEligibilityInput = {
  ikEntryEnabled: boolean;
  /** Boolean MODE A capability — NEVER pass raw "AUTO"|"OFF"|"ON". */
  ikRiskDecisionE2eEnabled: boolean;
};

let ikEntryForTests: boolean | null = null;
let ikAutoIngestForTests: boolean | null = null;
let ikIdentityCoverageForTests: boolean | null = null;
let ikChiefWiringForTests: boolean | null = null;
let ikLaborE2eForTests: boolean | IkE2eMode | null = null;
let ikLaborResearchForTests: boolean | null = null;
let ikMaterialE2eForTests: boolean | IkE2eMode | null = null;
let ikMaterialResearchForTests: boolean | null = null;
let ikF5E2eForTests: boolean | IkE2eMode | null = null;
let ikRiskDecisionE2eForTests: boolean | IkE2eMode | null = null;

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

/**
 * Test-only override for P5 Labor E2E (null = AppSettings).
 * boolean true → ON · boolean false → OFF · "AUTO"|"OFF"|"ON" → that mode.
 */
export function forceIkLaborE2eForTests(on: boolean | IkE2eMode | null): void {
  ikLaborE2eForTests = on;
}

/** Test-only override for P5 Labor research (null = AppSettings). */
export function forceIkLaborResearchForTests(on: boolean | null): void {
  ikLaborResearchForTests = on;
}

/**
 * Test-only override for P6 Material E2E (null = AppSettings).
 * boolean true → ON · boolean false → OFF · "AUTO"|"OFF"|"ON" → that mode.
 */
export function forceIkMaterialE2eForTests(on: boolean | IkE2eMode | null): void {
  ikMaterialE2eForTests = on;
}

/** Test-only override for P6 Material research (null = AppSettings). */
export function forceIkMaterialResearchForTests(on: boolean | null): void {
  ikMaterialResearchForTests = on;
}

/**
 * Test-only override for P7 F5/Bid (null = AppSettings).
 * boolean true → ON · boolean false → OFF · "AUTO"|"OFF"|"ON" → that mode.
 */
export function forceIkF5E2eForTests(on: boolean | IkE2eMode | null): void {
  ikF5E2eForTests = on;
}

/**
 * Test-only override for P8 Risk/Decision (null = AppSettings).
 * boolean true → ON · boolean false → OFF · "AUTO"|"OFF"|"ON" → that mode.
 */
export function forceIkRiskDecisionE2eForTests(on: boolean | IkE2eMode | null): void {
  ikRiskDecisionE2eForTests = on;
}

/**
 * Resolve test override or stored mode to MODE A capability (boolean).
 * true/"AUTO"/"ON" → active · false/"OFF" → HOLD.
 * Never treats a raw enum string as `=== true` for Research.
 */
function isForcedIkE2eActive(forced: boolean | IkE2eMode | null): boolean | null {
  if (forced == null) return null;
  if (forced === true || forced === "AUTO" || forced === "ON") return true;
  return false;
}

export function isIkEntryEnabled(): boolean {
  if (ikEntryForTests != null) return ikEntryForTests;
  return loadAppSettingsLocal().ikEntryEnabled === true;
}

/**
 * Leftover P2 preference reader (IK-MIGRATION-01 P2).
 * IK AUTONOMY-08 P0: NOT a Documents→BOQ runtime gate.
 * Runtime gate = isIkP2DocumentsBoqActive() := ikEntryEnabled === true.
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
 * P5 Labor E2E preference — MODE A capable (AUTO or ON). Default AUTO.
 * Does NOT enable Material · Does NOT flip Chief · Does NOT flip D.
 * Does NOT enable Research.
 */
export function isIkLaborE2eEnabled(): boolean {
  const forced = isForcedIkE2eActive(ikLaborE2eForTests);
  if (forced != null) return forced;
  return isIkE2eModeActive(loadAppSettingsLocal().ikLaborE2eEnabled);
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
 * P2 Documents→BOQ active seam (IK AUTONOMY-08 P0 · OD-08-1).
 * IK ON ⇒ ingest may run (still needs needsIkNg02Ingest / onUpdate / pipeline idle).
 * Leftover ikAutoIngestEnabled is NOT part of this gate (true/false/missing/malformed ignored).
 */
export function isIkP2DocumentsBoqActive(): boolean {
  return isIkEntryEnabled() === true;
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

/** P5 MODE A active: IK ON ∧ Labor mode ∈ {AUTO, ON}. OFF = HOLD. */
export function isIkP5LaborE2eActive(): boolean {
  return isIkEntryEnabled() === true && isIkLaborE2eEnabled() === true;
}

/**
 * Pure P5 MODE B research permission (flags only).
 * MUST be `=== true` on all three booleans — never raw enum → research.
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
 * P6 Material E2E preference — MODE A capable (AUTO or ON). Default AUTO.
 * Does NOT enable Labor · Does NOT flip Chief · Does NOT flip D.
 * Does NOT enable Research.
 */
export function isIkMaterialE2eEnabled(): boolean {
  const forced = isForcedIkE2eActive(ikMaterialE2eForTests);
  if (forced != null) return forced;
  return isIkE2eModeActive(loadAppSettingsLocal().ikMaterialE2eEnabled);
}

/**
 * P6 Material selective research preference (MODE B). Default OFF.
 * Alone does NOT run Material — requires Material E2E + IK Entry.
 */
export function isIkMaterialResearchEnabled(): boolean {
  if (ikMaterialResearchForTests != null) return ikMaterialResearchForTests;
  return loadAppSettingsLocal().ikMaterialResearchEnabled === true;
}

/** P6 MODE A active: IK ON ∧ Material mode ∈ {AUTO, ON}. OFF = HOLD. */
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

/**
 * P7 Position Cost → F5 → Bid preference — MODE A capable (AUTO or ON). Default AUTO.
 * Does NOT enable research · Does NOT Accept · Does NOT flip P4–P6 · Does NOT flip D.
 * Final Bid remains OWNER.
 */
export function isIkF5E2eEnabled(): boolean {
  const forced = isForcedIkE2eActive(ikF5E2eForTests);
  if (forced != null) return forced;
  return isIkE2eModeActive(loadAppSettingsLocal().ikF5E2eEnabled);
}

/** Pure P7 eligibility (flags only — boolean capability, never raw enum). */
export function resolveIkP7F5E2eActive(input: IkP7F5E2eEligibilityInput): boolean {
  return input.ikEntryEnabled === true && input.ikF5E2eEnabled === true;
}

/**
 * P7 active seam: IK Entry ON ∧ F5/Bid mode ∈ {AUTO, ON}.
 * RESEARCH stays 0 even when active (no research lever).
 */
export function isIkP7F5E2eActive(): boolean {
  return resolveIkP7F5E2eActive({
    ikEntryEnabled: isIkEntryEnabled(),
    ikF5E2eEnabled: isIkF5E2eEnabled(),
  });
}

/**
 * P8 Risk → Validation → DW prepare — MODE A capable (AUTO or ON). Default AUTO.
 * Does NOT enable research · Does NOT Accept · Does NOT flip D / P4–P7.
 * Accept / Price Commit / Final Bid remain OWNER.
 */
export function isIkRiskDecisionE2eEnabled(): boolean {
  const forced = isForcedIkE2eActive(ikRiskDecisionE2eForTests);
  if (forced != null) return forced;
  return isIkE2eModeActive(loadAppSettingsLocal().ikRiskDecisionE2eEnabled);
}

/** Pure P8 eligibility (flags only — boolean capability, never raw enum). */
export function resolveIkP8RiskDecisionE2eActive(
  input: IkP8RiskDecisionE2eEligibilityInput,
): boolean {
  return input.ikEntryEnabled === true && input.ikRiskDecisionE2eEnabled === true;
}

/**
 * P8 active seam: IK Entry ON ∧ Risk/Decision mode ∈ {AUTO, ON}.
 * RESEARCH/HTTP stay 0 · D stays UNCHANGED.
 */
export function isIkP8RiskDecisionE2eActive(): boolean {
  return resolveIkP8RiskDecisionE2eActive({
    ikEntryEnabled: isIkEntryEnabled(),
    ikRiskDecisionE2eEnabled: isIkRiskDecisionE2eEnabled(),
  });
}

/**
 * P10 — always IK first-screen class (NG-10 Gate absent).
 * `ikEntryEnabled` still gates IkEntryHost mount; does not revive NG-10.
 */
export function resolveIkDetailFirstScreen(
  _ikEntryEnabled?: boolean,
): IkDetailFirstScreen {
  return "ik_entry";
}
