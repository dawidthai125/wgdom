/**
 * KL-7-P2B — HTTP planner (DEFAULT OFF · empty allowlist · no raw URL).
 * Planning never performs fetch. httpRequestCount stays 0 on deny.
 */

import {
  isKnrDiscoveryAllowlistEmpty,
  resolveKnrDiscoveryAllowlistSource,
  type KnrDiscoveryAllowlistEntry,
} from "./knr-discovery-allowlist";
import { evaluateKnrDiscoveryHttpLegalGate } from "./knr-discovery-http-legal";
import {
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT,
  knrDiscoveryHttpPlanDenied,
  type KnrDiscoveryHttpPlan,
} from "./knr-discovery-http-types";
import { assertKnrDiscoveryUrlSafeForFetch } from "./knr-discovery-ssrf";

export type PlanKnrDiscoveryHttpInput = {
  sourceId?: string | null;
  /** Forbidden — presence always denies. */
  rawUrl?: string | null;
  /**
   * Feature gate. Production callers MUST omit / pass false.
   * Isolated tests may pass true WITH fixture allowlist only.
   */
  featureEnabled?: boolean;
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
};

/**
 * Build a fetch plan. Never fetches. Deny ⇒ httpRequestCount=0.
 */
export function planKnrDiscoveryHttp(
  input: PlanKnrDiscoveryHttpInput = {},
): KnrDiscoveryHttpPlan {
  const featureEnabled =
    input.featureEnabled === true
      ? true
      : input.featureEnabled === false
        ? false
        : KNR_DISCOVERY_HTTP_FEATURE_DEFAULT;

  if (input.rawUrl != null && String(input.rawUrl).trim() !== "") {
    return knrDiscoveryHttpPlanDenied("ARBITRARY_URL_FORBIDDEN", "DENIED", {
      sourceId: input.sourceId ? String(input.sourceId) : null,
      featureEnabled,
    });
  }

  if (!featureEnabled) {
    return knrDiscoveryHttpPlanDenied("FEATURE_OFF", "FEATURE_OFF", {
      sourceId: input.sourceId ? String(input.sourceId) : null,
      featureEnabled: false,
    });
  }

  if (isKnrDiscoveryAllowlistEmpty(input.allowlistOverride)) {
    return knrDiscoveryHttpPlanDenied("ALLOWLIST_EMPTY", "ALLOWLIST_EMPTY", {
      sourceId: input.sourceId ? String(input.sourceId) : null,
      featureEnabled: true,
    });
  }

  const sourceId = String(input.sourceId ?? "").trim();
  if (!sourceId) {
    return knrDiscoveryHttpPlanDenied("UNKNOWN_SOURCE", "SOURCE_DENIED", {
      featureEnabled: true,
    });
  }

  const resolved = resolveKnrDiscoveryAllowlistSource(sourceId, input.allowlistOverride);
  if (!resolved.ok) {
    const code =
      resolved.reason === "SOURCE_INACTIVE" ? "SOURCE_INACTIVE" : "UNKNOWN_SOURCE";
    return knrDiscoveryHttpPlanDenied(
      code === "SOURCE_INACTIVE" ? "SOURCE_INACTIVE" : "UNKNOWN_SOURCE",
      "SOURCE_DENIED",
      { sourceId, featureEnabled: true },
    );
  }

  const legal = evaluateKnrDiscoveryHttpLegalGate(resolved.entry.originId);
  if (!legal.ok) {
    return knrDiscoveryHttpPlanDenied("LEGAL_DENIED", "LEGAL_DENIED", {
      sourceId,
      featureEnabled: true,
    });
  }

  const safe = assertKnrDiscoveryUrlSafeForFetch(resolved.entry.url);
  if (!safe.ok) {
    if (safe.reason === "SSRF_DENIED") {
      return knrDiscoveryHttpPlanDenied("SSRF_DENIED", "SSRF_DENIED", {
        sourceId,
        featureEnabled: true,
      });
    }
    return knrDiscoveryHttpPlanDenied("INVALID_URL", "DENIED", {
      sourceId,
      featureEnabled: true,
    });
  }

  return {
    allowed: true,
    sourceId,
    requestUrl: safe.url.toString(),
    hostname: safe.url.hostname.toLowerCase(),
    originId: resolved.entry.originId,
    jobStatus: "PLANNED",
    denyCode: null,
    accounting: { httpRequestCount: 0, attemptedFetch: false },
    featureEnabled: true,
  };
}

/**
 * High-level gate used after DISCOVERY_REQUIRED.
 * When production defaults → always deny with HTTP=0.
 */
export function gateKnrDiscoveryHttpAfterRequired(
  input: PlanKnrDiscoveryHttpInput = {},
): KnrDiscoveryHttpPlan {
  return planKnrDiscoveryHttp(input);
}

export const KNR_DISCOVERY_HTTP_PLANNER_P2B_IMPLEMENTED = true as const;
