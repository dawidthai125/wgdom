/**
 * GO53 / OD-52 — Labor Evidence reuse sufficiency (STATE_ONLY freshness).
 *
 * Pure · deterministic · read-only · no network · no persistence · ≠ OUR RATE.
 *
 * Catalog First order (caller):
 *   CURRENT OUR RATE → REUSE
 *   STALE OUR RATE → never suppress (refresh required)
 *   MISSING → evaluate Evidence → SUFFICIENT may suppress HTTP
 */

import {
  deriveLaborSourceEvidenceMidpoint,
  type LaborSourceEvidenceIdentityMethod,
  type LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence";
import {
  isWorkRateEvidenceScopeAllowed,
  listAllowedWorkRateEvidenceScopeTags,
} from "@/lib/work-catalog/work-rate-evidence-scope";
import {
  WORK_RATE_REGION_FALLBACK_CHAIN,
  type WorkRateRegionScope,
} from "@/lib/work-catalog/work-rate-types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const OD52_EVIDENCE_FRESHNESS_MODE = "STATE_ONLY" as const;
export const GO53_LABOR_EVIDENCE_SUFFICIENCY_ID =
  "GO53-LABOR-EVIDENCE-REUSE-SUFFICIENCY" as const;

/** Identity methods eligible for automatic HTTP suppress (exact / Owner-curated only). */
export const EVIDENCE_SUPPRESS_IDENTITY_METHODS: readonly LaborSourceEvidenceIdentityMethod[] =
  Object.freeze([
    "exact_name",
    "owner_synonym",
    "owner_identity_mapping",
  ]);

export type LaborEvidenceReuseSufficiencyStatus =
  | "SUFFICIENT"
  | "INSUFFICIENT"
  | "NO_EVIDENCE"
  | "STALE"
  | "CONFLICT"
  | "INCOMPATIBLE_SCOPE"
  | "INCOMPATIBLE_REGION"
  | "INVALID"
  | "BLOCKED_STALE_OUR_RATE"
  | "N_A_OUR_RATE_CURRENT";

export type EvaluateLaborEvidenceReuseSufficiencyInput = {
  workId: string;
  unit: WgdomCostUnit | string;
  namePl: string;
  /** Catalog First OUR RATE freshness — STALE blocks suppress. */
  ourRateFreshness: "CURRENT" | "STALE" | "MISSING";
  observations: readonly LaborSourceEvidenceObservation[];
  /**
   * Optional explicit required region. When omitted, any region in
   * WORK_RATE_REGION_FALLBACK_CHAIN is acceptable (no new region policy).
   */
  requiredRegion?: WorkRateRegionScope | null;
};

export type EvaluateLaborEvidenceReuseSufficiencyResult = {
  seamId: typeof GO53_LABOR_EVIDENCE_SUFFICIENCY_ID;
  freshnessMode: typeof OD52_EVIDENCE_FRESHNESS_MODE;
  status: LaborEvidenceReuseSufficiencyStatus;
  sufficient: boolean;
  /** Eligible VALID observations after all hard gates (empty unless SUFFICIENT). */
  eligible: LaborSourceEvidenceObservation[];
  reasonPl: string;
  /** Never an OUR RATE. */
  isOurRate: false;
  ourRateWritten: false;
};

function normUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase();
}

function isSuppressIdentity(
  m: LaborSourceEvidenceIdentityMethod | string | null | undefined,
): boolean {
  return (EVIDENCE_SUPPRESS_IDENTITY_METHODS as readonly string[]).includes(
    String(m || ""),
  );
}

function isKnownRegion(r: string): r is WorkRateRegionScope {
  return (WORK_RATE_REGION_FALLBACK_CHAIN as readonly string[]).includes(r);
}

function priceKey(o: LaborSourceEvidenceObservation): string | null {
  const mid = deriveLaborSourceEvidenceMidpoint(o);
  if (mid == null || !(mid > 0)) return null;
  return String(Math.round(mid * 100) / 100);
}

/**
 * Fail-closed Evidence sufficiency for Labor Research HTTP suppress.
 */
export function evaluateLaborEvidenceReuseSufficiency(
  input: EvaluateLaborEvidenceReuseSufficiencyInput,
): EvaluateLaborEvidenceReuseSufficiencyResult {
  const base = {
    seamId: GO53_LABOR_EVIDENCE_SUFFICIENCY_ID,
    freshnessMode: OD52_EVIDENCE_FRESHNESS_MODE,
    isOurRate: false as const,
    ourRateWritten: false as const,
  };

  if (input.ourRateFreshness === "CURRENT") {
    return {
      ...base,
      status: "N_A_OUR_RATE_CURRENT",
      sufficient: false,
      eligible: [],
      reasonPl: "OUR RATE CURRENT — Evidence does not override Catalog First REUSE.",
    };
  }

  if (input.ourRateFreshness === "STALE") {
    return {
      ...base,
      status: "BLOCKED_STALE_OUR_RATE",
      sufficient: false,
      eligible: [],
      reasonPl: "OUR RATE STALE — Evidence must not suppress required refresh.",
    };
  }

  const workId = String(input.workId || "").trim();
  const unitNorm = normUnit(String(input.unit || ""));
  const obsIn = input.observations || [];

  if (!workId || !unitNorm) {
    return {
      ...base,
      status: "INVALID",
      sufficient: false,
      eligible: [],
      reasonPl: "Missing workId or unit for Evidence sufficiency.",
    };
  }

  if (obsIn.length === 0) {
    return {
      ...base,
      status: "NO_EVIDENCE",
      sufficient: false,
      eligible: [],
      reasonPl: "No Evidence observations.",
    };
  }

  const allowedScopes = listAllowedWorkRateEvidenceScopeTags({
    workId,
    namePl: input.namePl || "",
  });

  const byWork = obsIn.filter((o) => o.workId === workId);
  if (byWork.length === 0) {
    return {
      ...base,
      status: "INSUFFICIENT",
      sufficient: false,
      eligible: [],
      reasonPl: "No Evidence with exact canonical workId.",
    };
  }

  const byUnit = byWork.filter((o) => normUnit(o.unit) === unitNorm);
  if (byUnit.length === 0) {
    return {
      ...base,
      status: "INSUFFICIENT",
      sufficient: false,
      eligible: [],
      reasonPl: "No Evidence with exact unit.",
    };
  }

  // OD-52 STATE_ONLY: only qualityStatus=VALID is freshness-eligible
  const staleOnly =
    byUnit.length > 0 && byUnit.every((o) => o.qualityStatus === "STALE");
  if (staleOnly) {
    return {
      ...base,
      status: "STALE",
      sufficient: false,
      eligible: [],
      reasonPl: "Evidence qualityStatus=STALE — not eligible for suppress (STATE_ONLY).",
    };
  }

  const validFresh: LaborSourceEvidenceObservation[] = [];
  let sawPackageOrMaterial = false;
  for (const o of byUnit) {
    if (o.qualityStatus === "STALE") continue;
    if (o.qualityStatus === "REJECTED_PACKAGE") {
      sawPackageOrMaterial = true;
      continue;
    }
    if (o.qualityStatus !== "VALID") continue;
    if (!o.laborOnly || o.includesMaterial) {
      sawPackageOrMaterial = true;
      continue;
    }
    validFresh.push(o);
  }

  if (validFresh.length === 0) {
    if (byUnit.some((o) => o.qualityStatus === "REJECTED_SCOPE")) {
      return {
        ...base,
        status: "INCOMPATIBLE_SCOPE",
        sufficient: false,
        eligible: [],
        reasonPl: "Evidence scope incompatible with canonical labor work.",
      };
    }
    if (sawPackageOrMaterial) {
      return {
        ...base,
        status: "INCOMPATIBLE_SCOPE",
        sufficient: false,
        eligible: [],
        reasonPl: "Package/material Evidence cannot satisfy labor leaf suppress.",
      };
    }
    return {
      ...base,
      status: "INSUFFICIENT",
      sufficient: false,
      eligible: [],
      reasonPl: "No VALID labor-only Evidence for workId|unit.",
    };
  }

  // Identity — names_loosely / unmatched never suppress
  const byIdentity = validFresh.filter((o) => isSuppressIdentity(o.identityMethod));
  if (byIdentity.length === 0) {
    return {
      ...base,
      status: "INSUFFICIENT",
      sufficient: false,
      eligible: [],
      reasonPl: "names_loosely / unmatched identity is not sufficient for automatic suppress.",
    };
  }

  // Scope allowlist (painting → walls_ceilings etc.)
  const byScope = byIdentity.filter((o) =>
    isWorkRateEvidenceScopeAllowed(o.scopeTag, allowedScopes),
  );
  if (byScope.length === 0) {
    return {
      ...base,
      status: "INCOMPATIBLE_SCOPE",
      sufficient: false,
      eligible: [],
      reasonPl: "Evidence scope incompatible with canonical labor work.",
    };
  }

  // Region — known FALLBACK_CHAIN only; optional requiredRegion
  const byRegion = byScope.filter((o) => {
    if (!isKnownRegion(String(o.region || ""))) return false;
    if (input.requiredRegion) return o.region === input.requiredRegion;
    return true;
  });
  if (byRegion.length === 0) {
    return {
      ...base,
      status: "INCOMPATIBLE_REGION",
      sufficient: false,
      eligible: [],
      reasonPl: input.requiredRegion
        ? `No Evidence in required region ${input.requiredRegion}.`
        : "Evidence region missing or outside known region scopes.",
    };
  }

  // Price conflict — fail closed (no average / median / newest)
  const prices = new Set<string>();
  for (const o of byRegion) {
    const k = priceKey(o);
    if (k == null) {
      return {
        ...base,
        status: "INVALID",
        sufficient: false,
        eligible: [],
        reasonPl: "Evidence observation missing comparable price point.",
      };
    }
    prices.add(k);
  }
  if (prices.size > 1) {
    return {
      ...base,
      status: "CONFLICT",
      sufficient: false,
      eligible: [],
      reasonPl: "Multiple VALID Evidence prices conflict — fail closed (no invent aggregate).",
    };
  }

  // One VALID observation MAY be sufficient
  return {
    ...base,
    status: "SUFFICIENT",
    sufficient: true,
    eligible: byRegion.slice(),
    reasonPl: `Evidence SUFFICIENT (STATE_ONLY) count=${byRegion.length} — HTTP suppress authorized (≠ OUR RATE).`,
  };
}
