/**
 * IK Autonomous Pricing Fallback — Slice 3A policy / legal plane.
 *
 * Owner GO 2026-08-27: APF-only route authorization (NOT KEEP-4).
 * Policy authorization ≠ verified live content — HTTP uses bounded adapter.
 */

import { isApfLaborOnlyUnit } from "./labor-units";
import type { ApfResearchQuery } from "./types";
import {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  assertApfHostsNotInKeep4,
  type ApfEphemeralSelectiveAuthorizedRoute,
} from "./apf-source-authorization";

export {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  type ApfEphemeralSelectiveAuthorizedRoute,
} from "./apf-source-authorization";

export const APF_EPHEMERAL_SELECTIVE_RESEARCH_PLANE =
  "APF_EPHEMERAL_SELECTIVE_RESEARCH" as const;

export type ApfEphemeralSelectiveResearchPlane =
  typeof APF_EPHEMERAL_SELECTIVE_RESEARCH_PLANE;

export const APF_EPHEMERAL_SELECTIVE_AUTHORIZED_UNITS = Object.freeze([
  "pomiar",
  "prob",
  "prób",
  "prob.",
  "prób.",
] as const);

export type ApfEphemeralSelectiveResearchPolicySideEffects = {
  httpCalls: 0;
  catalogWorkCreateCalls: 0;
  catalogWorkUpdateCalls: 0;
  kvWriteCalls: 0;
  acceptCalls: 0;
  ourRateWriteCalls: 0;
};

export type ApfEphemeralSelectiveResearchExecutionBlockReason =
  | "NO_AUTHORIZED_SOURCE_ROUTE"
  | "POLICY_DENIED"
  | "NOT_APF_LABOR_UNIT"
  | "KEEP4_COLLISION"
  | "HTTP_NOT_AUTHORIZED";

export type ApfEphemeralSelectiveResearchPolicyResult = {
  researchPlane: ApfEphemeralSelectiveResearchPlane;
  policyAuthorization: "GRANTED" | "DENIED";
  denyReason?: string | null;
  routeAuthorized: boolean;
  httpPermitted: boolean;
  executionPermitted: boolean;
  executionBlockReason: ApfEphemeralSelectiveResearchExecutionBlockReason;
  sideEffects: ApfEphemeralSelectiveResearchPolicySideEffects;
};

const ZERO_SIDE_EFFECTS: ApfEphemeralSelectiveResearchPolicySideEffects = {
  httpCalls: 0,
  catalogWorkCreateCalls: 0,
  catalogWorkUpdateCalls: 0,
  kvWriteCalls: 0,
  acceptCalls: 0,
  ourRateWriteCalls: 0,
};

export function evaluateApfEphemeralSelectiveResearchPolicy(
  query: Pick<ApfResearchQuery, "unit">,
): ApfEphemeralSelectiveResearchPolicyResult {
  if (!isApfLaborOnlyUnit(query.unit)) {
    return {
      researchPlane: APF_EPHEMERAL_SELECTIVE_RESEARCH_PLANE,
      policyAuthorization: "DENIED",
      denyReason: "NOT_APF_LABOR_UNIT",
      routeAuthorized: false,
      httpPermitted: false,
      executionPermitted: false,
      executionBlockReason: "NOT_APF_LABOR_UNIT",
      sideEffects: ZERO_SIDE_EFFECTS,
    };
  }

  if (!assertApfHostsNotInKeep4()) {
    return {
      researchPlane: APF_EPHEMERAL_SELECTIVE_RESEARCH_PLANE,
      policyAuthorization: "DENIED",
      denyReason: "KEEP4_COLLISION",
      routeAuthorized: false,
      httpPermitted: false,
      executionPermitted: false,
      executionBlockReason: "KEEP4_COLLISION",
      sideEffects: ZERO_SIDE_EFFECTS,
    };
  }

  const routeAuthorized = APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.length > 0;
  const httpPermitted = routeAuthorized;
  const executionPermitted = routeAuthorized;

  return {
    researchPlane: APF_EPHEMERAL_SELECTIVE_RESEARCH_PLANE,
    policyAuthorization: "GRANTED",
    routeAuthorized,
    httpPermitted,
    executionPermitted,
    executionBlockReason: routeAuthorized
      ? "HTTP_NOT_AUTHORIZED"
      : "NO_AUTHORIZED_SOURCE_ROUTE",
    sideEffects: ZERO_SIDE_EFFECTS,
  };
}

export function isApfEphemeralSelectiveResearchPolicyGranted(
  query: Pick<ApfResearchQuery, "unit">,
): boolean {
  return (
    evaluateApfEphemeralSelectiveResearchPolicy(query).policyAuthorization ===
    "GRANTED"
  );
}

/** NORMAL work-rate must never resolve APF-only hosts. */
export function isApfRouteBlockedFromNormalWorkRate(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    return APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.some(
      (r) => host.includes(r.host) || r.host.includes(host.replace(/^www\./, "")),
    );
  } catch {
    return false;
  }
}
