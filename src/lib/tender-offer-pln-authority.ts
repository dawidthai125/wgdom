/**
 * TENDER-MODERNIZATION-01 / S3 — authoritative OFFER PLN presentation helper.
 * Thin only · NO third PLN SSOT · NO Bid/Offer formula.
 * P0: expertEffective arg = Expert AI RUNTIME (D Session), not module ACCESS (M).
 */

import { isExpertAiRuntimeEffective } from "@/lib/tender-expert-effective";
import type { AdminRole } from "@/lib/admin-auth";
import type { AppSettings } from "@/lib/app-settings";

export type OfferPlnSource = "offer_expert" | "bid_legacy" | "none";

export type ParityVerdict = "MATCH" | "EXPECTED_DELTA" | "UNEXPECTED_DELTA";

export type ParityDifferenceSource =
  | "none"
  | "margin_model"
  | "company_stack"
  | "competitive_trim"
  | "swz_constraint"
  | "partial_pricing"
  | "our_estimate_override"
  | "variant_not_primary"
  | "readiness_flags"
  | "unknown";

export type AuthoritativeOfferPlnResult = {
  /** Existing field only — never a new SSOT key. */
  primaryPln: number | null;
  source: OfferPlnSource;
  secondaryBidPln: number | null;
  expertEffective: boolean;
  hardParityPass: boolean | null;
  mismatch: boolean;
};

/** DF §5.4 hardParityPass. */
export function isOfferBidHardParityPass(
  recommendedBidPln: number | null | undefined,
  offerPricePln: number | null | undefined,
): boolean {
  if (
    recommendedBidPln == null ||
    offerPricePln == null ||
    !(offerPricePln > 0) ||
    !Number.isFinite(recommendedBidPln) ||
    !Number.isFinite(offerPricePln)
  ) {
    return false;
  }
  const thr = Math.max(500, 0.02 * offerPricePln);
  return Math.abs(recommendedBidPln - offerPricePln) <= thr;
}

export function classifyOfferBidParity(input: {
  recommendedBidPln: number | null | undefined;
  offerPricePln: number | null | undefined;
  /** Caller-declared expected gap (dual engines, variants, etc.). */
  expectedDifferenceSource?: ParityDifferenceSource | null;
}): {
  deltaPln: number | null;
  deltaPct: number | null;
  hardParityPass: boolean;
  verdict: ParityVerdict;
  differenceSource: ParityDifferenceSource;
} {
  const bid = input.recommendedBidPln;
  const offer = input.offerPricePln;
  const expected = input.expectedDifferenceSource ?? null;

  if (
    bid == null ||
    offer == null ||
    !Number.isFinite(bid) ||
    !Number.isFinite(offer) ||
    !(offer > 0)
  ) {
    return {
      deltaPln: null,
      deltaPct: null,
      hardParityPass: false,
      verdict: "EXPECTED_DELTA",
      differenceSource: expected ?? "partial_pricing",
    };
  }

  const deltaPln = bid - offer;
  const deltaPct = (deltaPln / offer) * 100;
  const hardParityPass = isOfferBidHardParityPass(bid, offer);

  if (hardParityPass) {
    return {
      deltaPln,
      deltaPct,
      hardParityPass: true,
      verdict: "MATCH",
      differenceSource: "none",
    };
  }

  if (expected && expected !== "none" && expected !== "unknown") {
    return {
      deltaPln,
      deltaPct,
      hardParityPass: false,
      verdict: "EXPECTED_DELTA",
      differenceSource: expected,
    };
  }

  return {
    deltaPln,
    deltaPct,
    hardParityPass: false,
    verdict: "UNEXPECTED_DELTA",
    differenceSource: expected ?? "unknown",
  };
}

/**
 * Expert AI runtime ON → Offer primary; runtime OFF → Bid primary.
 * Does not invent a third PLN — selects among existing values.
 * `expertEffective` = D Session runtime (P0), not module access.
 */
export function resolveAuthoritativeOfferPln(input: {
  expertEffective: boolean;
  offerPricePln?: number | null;
  recommendedBidPln?: number | null;
}): AuthoritativeOfferPlnResult {
  const offer =
    input.offerPricePln != null && Number.isFinite(input.offerPricePln)
      ? input.offerPricePln
      : null;
  const bid =
    input.recommendedBidPln != null && Number.isFinite(input.recommendedBidPln)
      ? input.recommendedBidPln
      : null;
  const hard =
    offer != null && bid != null ? isOfferBidHardParityPass(bid, offer) : null;

  if (input.expertEffective) {
    return {
      primaryPln: offer,
      source: offer != null ? "offer_expert" : "none",
      secondaryBidPln: bid,
      expertEffective: true,
      hardParityPass: hard,
      mismatch: hard === false,
    };
  }

  return {
    primaryPln: bid,
    source: bid != null ? "bid_legacy" : "none",
    secondaryBidPln: null,
    expertEffective: false,
    hardParityPass: hard,
    mismatch: false,
  };
}

export function resolveAuthoritativeOfferPlnForRole(input: {
  role: AdminRole | null | undefined;
  settings: Pick<AppSettings, "tendersTabForStaffEnabled">;
  offerPricePln?: number | null;
  recommendedBidPln?: number | null;
}): AuthoritativeOfferPlnResult {
  void input.role;
  void input.settings;
  return resolveAuthoritativeOfferPln({
    expertEffective: isExpertAiRuntimeEffective(),
    offerPricePln: input.offerPricePln,
    recommendedBidPln: input.recommendedBidPln,
  });
}
