/**
 * IK-KNR-WC-P4-MAPPING-TRUST-SEAM — thin trust promotion.
 *
 * Slice D HIT (catalogWorkId only)
 *   → complete OfferBoq trusted tuple (exact_knr + non-low confidence)
 *   → Identity Phase preserveOfferBoqLineIfTrusted
 *   → F5 TRUSTED_MATCH (unchanged)
 *
 * ZERO second mapper · ZERO catalogBasis→knrHint · ZERO Slice D rule rewrite.
 * ZERO A1 / Labor / Material / F5 engine / TRUSTED_MATCH mutation.
 */

import type { IkDocumentExpertReport, IkMasterBoqLineRef } from "@/lib/intelligent-estimator/ik-document-expert";
import type { OwnerKnrMappingApplyResult } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import { isKnrWcIdentityBridgeP4TrustSeamEnabled } from "@/lib/intelligent-estimator/knr-wc-identity-bridge-feature";
import type { OfferBoqConfidence, OfferBoqMatchMethod } from "@/lib/tender-offer-boq";

/** Owner-approved exact KNR mapping → existing TRUSTED_MATCH member. */
export const P4_TRUST_MATCH_METHOD: OfferBoqMatchMethod = "exact_knr";

/** Established non-low confidence for Owner-approved exact identity (mirror manual/alias). */
export const P4_TRUST_MATCH_CONFIDENCE: OfferBoqConfidence = "high";

export type PromoteSliceDHitToTrustedTupleInput = {
  sliceD: OwnerKnrMappingApplyResult;
  /** Test override — null/undefined uses feature flag (Owner Enable GO / ENABLED). */
  enabled?: boolean | null;
};

export type PromoteSliceDHitToTrustedTupleResult = {
  expert: IkDocumentExpertReport;
  appliedLineIds: string[];
  catalogWorkIdWritten: number;
  promotedLineIds: string[];
  promotedCount: number;
};

function cloneMasterRefs(refs: readonly IkMasterBoqLineRef[]): IkMasterBoqLineRef[] {
  return refs.map((ref) => ({
    ...ref,
    line: { ...ref.line },
  }));
}

function passthrough(sliceD: OwnerKnrMappingApplyResult): PromoteSliceDHitToTrustedTupleResult {
  return {
    expert: sliceD.expert,
    appliedLineIds: sliceD.appliedLineIds,
    catalogWorkIdWritten: sliceD.catalogWorkIdWritten,
    promotedLineIds: [],
    promotedCount: 0,
  };
}

/**
 * Promote Slice D applied lines to a complete OfferBoq trusted identity tuple.
 * Fail-closed: flag OFF · no applied HIT · missing catalogWorkId → no promotion.
 * Does not re-evaluate OWNER_KNR_MAPPINGS (Slice D remains mapping authority).
 * Does not mutate knrHint or catalogBasis.
 */
export function promoteSliceDHitToTrustedTuple(
  input: PromoteSliceDHitToTrustedTupleInput,
): PromoteSliceDHitToTrustedTupleResult {
  const sliceD = input.sliceD;
  const enabled = isKnrWcIdentityBridgeP4TrustSeamEnabled(input.enabled);

  if (!enabled) return passthrough(sliceD);
  if (!sliceD.appliedLineIds.length || sliceD.catalogWorkIdWritten <= 0) {
    return passthrough(sliceD);
  }

  const applied = new Set(sliceD.appliedLineIds.map((id) => String(id ?? "").trim()).filter(Boolean));
  if (applied.size === 0) return passthrough(sliceD);

  const overlayRefs = cloneMasterRefs(sliceD.expert.masterBoqLines ?? []);
  const promotedLineIds: string[] = [];

  for (const ref of overlayRefs) {
    const lineId = String(ref.line.lineId ?? "").trim();
    if (!lineId || !applied.has(lineId)) continue;

    const workId = String(ref.line.catalogWorkId ?? "").trim();
    if (!workId) continue;

    const knrHint = ref.line.knrHint;
    const catalogBasis = ref.line.catalogBasis;

    ref.line = {
      ...ref.line,
      catalogWorkId: workId,
      matchMethod: P4_TRUST_MATCH_METHOD,
      matchedBy: P4_TRUST_MATCH_METHOD,
      matchConfidence: P4_TRUST_MATCH_CONFIDENCE,
      // Isolation invariant: never hydrate / rewrite these from P4.
      knrHint,
      catalogBasis,
    };
    promotedLineIds.push(lineId);
  }

  return {
    expert: {
      ...sliceD.expert,
      masterBoqLines: overlayRefs,
    },
    appliedLineIds: sliceD.appliedLineIds,
    catalogWorkIdWritten: sliceD.catalogWorkIdWritten,
    promotedLineIds,
    promotedCount: promotedLineIds.length,
  };
}
