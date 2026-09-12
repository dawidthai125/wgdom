/**
 * Autonomous labor research path — NORMAL selective vs APF measurement.
 *
 * P5.27: unit=pomiar is OUT_OF_RESEARCH on NORMAL KEEP-4 selective plane.
 * Canonical exception: APF_EPHEMERAL_SELECTIVE_RESEARCH (energospin / electrico).
 *
 * ZERO Accept · ZERO OUR RATE write · ZERO P5.27 bypass on NORMAL plane.
 */

import { isP527MeasurementOutOfResearch } from "@/lib/work-catalog/work-rate-discovery-allowlist";
import { evaluateApfEphemeralSelectiveResearchPolicy } from "@/lib/tender-position-cost/autonomous-pricing-fallback/apf-ephemeral-selective-research-policy";

export type AutonomousLaborResearchPath =
  | "NORMAL_SELECTIVE_WORK_RATE"
  | "APF_MEASUREMENT_EPHEMERAL"
  | "BLOCKED";

export type ResolveAutonomousLaborResearchPathResult = {
  path: AutonomousLaborResearchPath;
  unit: string;
  p527MeasurementOutOfResearch: boolean;
  apfPolicyGranted: boolean;
  reasonPl: string;
};

export function resolveAutonomousLaborResearchPath(input: {
  unit?: string | null;
  namePl?: string | null;
}): ResolveAutonomousLaborResearchPathResult {
  const unit = String(input.unit || "").trim();
  const p527 = isP527MeasurementOutOfResearch({
    unit,
    namePl: input.namePl,
  });
  const apf = evaluateApfEphemeralSelectiveResearchPolicy({ unit });

  if (p527 && apf.policyAuthorization === "GRANTED" && apf.routeAuthorized) {
    return {
      path: "APF_MEASUREMENT_EPHEMERAL",
      unit,
      p527MeasurementOutOfResearch: true,
      apfPolicyGranted: true,
      reasonPl:
        "P5.27 measurement OUT_OF_RESEARCH on NORMAL selective — use APF ephemeral measurement routes",
    };
  }
  if (p527) {
    return {
      path: "BLOCKED",
      unit,
      p527MeasurementOutOfResearch: true,
      apfPolicyGranted: false,
      reasonPl:
        "P5.27 measurement OUT_OF_RESEARCH and APF policy not granted — fail-closed",
    };
  }
  return {
    path: "NORMAL_SELECTIVE_WORK_RATE",
    unit,
    p527MeasurementOutOfResearch: false,
    apfPolicyGranted: false,
    reasonPl: "NORMAL KEEP-4 selective work-rate research",
  };
}
