/**
 * KE-E1 — Eligibility gates (DF §4). Pure.
 */

import {
  KE_DEFAULT_POLICY,
  type KnowledgeCandidate,
  type KnowledgeFreshness,
  type KnowledgeReasonCode,
  type KnowledgeResolverPolicy,
} from "./types";

export function mergeKePolicy(
  partial?: Partial<KnowledgeResolverPolicy>,
): KnowledgeResolverPolicy {
  return { ...KE_DEFAULT_POLICY, ...(partial ?? {}) };
}

export function daysBetween(isoA: string | null | undefined, isoB: string): number | null {
  if (!isoA) return null;
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(b - a) / (24 * 3600 * 1000);
}

export function freshnessFromAsOf(
  asOf: string | null | undefined,
  nowIso: string,
  freshDays: number,
): KnowledgeFreshness {
  if (!asOf) return "missing";
  const d = daysBetween(asOf, nowIso);
  if (d == null) return "missing";
  if (d <= freshDays / 2) return "fresh";
  if (d <= freshDays) return "ok";
  return "stale";
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: KnowledgeReasonCode[];
}

/** Owner: eligible ⇔ explicit lock (obsługiwane w resolverze osobno). */
export function isOwnerEligible(hasLock: boolean): EligibilityResult {
  return hasLock
    ? { eligible: true, reasons: ["OWNER_LOCK"] }
    : { eligible: false, reasons: [] };
}

/**
 * Company eligible ⇔
 * (n ≥ N_min OR (approvals≥2 ∧ będzie agreement w score — approvals gate tu))
 * ∧ freshness OK ∧ variance OK
 */
export function isCompanyEligible(
  c: KnowledgeCandidate,
  policy: KnowledgeResolverPolicy,
  nowIso: string,
): EligibilityResult {
  const reasons: KnowledgeReasonCode[] = [];
  const n = c.n ?? 0;
  const approvals = c.nApprovals ?? 0;
  const nOk = n >= policy.nMin || approvals >= 2;
  if (!nOk) {
    reasons.push("COMPANY_N_BELOW_MIN");
    reasons.push("COMPANY_INELIGIBLE");
    return { eligible: false, reasons };
  }

  const fresh =
    c.freshness ??
    freshnessFromAsOf(c.asOf, nowIso, policy.freshDays);
  if (fresh === "stale" || fresh === "missing") {
    // missing asOf na CK historycznym: traktuj jako ok (nie blokuj), stale blokuje
    if (fresh === "stale") {
      reasons.push("COMPANY_STALE");
      reasons.push("COMPANY_INELIGIBLE");
      return { eligible: false, reasons };
    }
  }

  const v = c.variance;
  if (typeof v === "number" && Number.isFinite(v) && v > policy.capMarket) {
    reasons.push("COMPANY_VARIANCE");
    reasons.push("COMPANY_INELIGIBLE");
    return { eligible: false, reasons };
  }

  reasons.push("COMPANY_ELIGIBLE");
  return { eligible: true, reasons };
}

export function isMarketEligible(
  c: KnowledgeCandidate,
  policy: KnowledgeResolverPolicy,
  nowIso: string,
): EligibilityResult {
  const reasons: KnowledgeReasonCode[] = [];
  if (!(c.unitPricePln > 0)) {
    reasons.push("MARKET_INELIGIBLE");
    return { eligible: false, reasons };
  }
  const fresh =
    c.freshness ??
    freshnessFromAsOf(c.asOf, nowIso, policy.freshDays);
  if (fresh === "stale") {
    reasons.push("MARKET_STALE");
    // stale market nadal eligible, ale score zdemotowany — DF: freshness w score
  }
  reasons.push("MARKET_ELIGIBLE");
  return { eligible: true, reasons };
}

export function isGlobalPriceEligible(c: KnowledgeCandidate): EligibilityResult {
  if (!(c.unitPricePln > 0)) return { eligible: false, reasons: [] };
  return { eligible: true, reasons: ["GLOBAL_FALLBACK"] };
}

export function evaluateCandidateEligibility(
  c: KnowledgeCandidate,
  policy: KnowledgeResolverPolicy,
  nowIso: string,
): EligibilityResult {
  switch (c.source) {
    case "owner":
      return isOwnerEligible(true);
    case "company":
      return isCompanyEligible(c, policy, nowIso);
    case "market":
      return isMarketEligible(c, policy, nowIso);
    case "global":
      return isGlobalPriceEligible(c);
    default:
      return { eligible: false, reasons: [] };
  }
}
