/**
 * PricingCandidate → EphemeralResearchBasis (Slice 1 consumer).
 * Does NOT invent catalogWorkId / workId.
 */

import type {
  EphemeralResearchBasis,
  ResearchEvidence,
} from "@/lib/tender-position-cost/position-cost-basis";
import { validateEphemeralResearchBasis } from "@/lib/tender-position-cost/position-cost-basis";
import type { ApfPricingCandidate, ApfResearchEvidence } from "./types";

export function apfEvidenceToSlice1ResearchEvidence(
  evidence: readonly ApfResearchEvidence[],
): ResearchEvidence[] {
  return evidence.map((e) => ({
    evidenceId: e.evidenceId,
    kind: e.kind === "KNR_DOC_FACT" ? "KNR_DOC_FACT" : "MARKET_LABOR_OBS",
    summaryPl: e.summaryPl,
    sourceId: e.sourceId,
    retrievedAt: e.retrievedAt,
  }));
}

/**
 * Convert a labor PricingCandidate into Slice-1 EphemeralResearchBasis.
 * Returns null if candidate lacks labor component or fails Slice-1 validation.
 */
export function pricingCandidateToEphemeralResearchBasis(
  candidate: ApfPricingCandidate,
  evidenceCatalog?: readonly ApfResearchEvidence[] | null,
): EphemeralResearchBasis | null {
  const labor = candidate.components.labor;
  if (!labor) return null;

  const basis: EphemeralResearchBasis = {
    type: "EPHEMERAL_RESEARCH",
    candidateId: candidate.candidateId,
    unit: labor.unit,
    components: {
      labor: {
        unitRatePln: labor.unitRatePln,
        unit: labor.unit,
        method: labor.method,
        evidenceIds: labor.evidenceIds,
        confidence: labor.confidence,
      },
    },
    provenance: {
      evidenceIds: candidate.provenance.evidenceIds,
      builtAt: candidate.provenance.builtAt,
      builderVersion: candidate.provenance.builderVersion,
    },
    limitations: [...candidate.limitations, "FROM_APF_PRICING_CANDIDATE"],
  };

  const slice1Evidence = evidenceCatalog
    ? apfEvidenceToSlice1ResearchEvidence(evidenceCatalog)
    : null;
  const validation = validateEphemeralResearchBasis(basis, slice1Evidence);
  if (!validation.ok) return null;
  return validation.basis;
}
