/**
 * AUT-R1 — Evidence REUSE → Candidate → Autonomous Accept (generic Orchestra seam).
 *
 * Closes the Labor Expert gap where GO53 EVIDENCE_REUSE suppressed HTTP but
 * never built a WorkRateResearchCandidate, so §0.2 AUT-R1 could not run and
 * the path stalled as Owner Exception / HTTP-suppressed hold.
 *
 * REUSE: buildCandidateFromDurableLaborEvidence · tryAutR1AcceptLaborCandidate
 * ZERO second rate engine · ZERO invent · fail-closed on contract EXCEPTION.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { LaborSourceEvidenceObservation } from "@/lib/labor-source-evidence";
import type { OfferBoqMatchMethod } from "@/lib/tender-offer-boq";
import { buildCandidateFromDurableLaborEvidence } from "@/lib/intelligent-estimator/apf-labor-evidence-persist";
import {
  tryAutR1AcceptLaborCandidate,
  type TryAutR1AcceptResult,
} from "@/lib/work-catalog/aut-r1-accept";

export const AUT_R1_FROM_DURABLE_EVIDENCE_SEAM_ID =
  "AUT_R1_GENERIC_RUNTIME_EVIDENCE_REUSE_V1" as const;

export type TryAutR1FromDurableEvidenceInput = {
  store: WorkCatalogStore;
  workId: string;
  workNamePl: string;
  unit: string;
  observations: readonly LaborSourceEvidenceObservation[];
  identityTrusted: boolean;
  matchMethod?: OfferBoqMatchMethod | string | null;
  marginPct?: number;
  nowMs?: number;
  persist?: boolean;
  save?: TryAutR1AcceptInputSave;
};

type TryAutR1AcceptInputSave = NonNullable<
  Parameters<typeof tryAutR1AcceptLaborCandidate>[0]["save"]
>;

export type TryAutR1FromDurableEvidenceResult =
  | {
      ok: true;
      seamId: typeof AUT_R1_FROM_DURABLE_EVIDENCE_SEAM_ID;
      candidateBuilt: true;
      accept: TryAutR1AcceptResult;
    }
  | {
      ok: false;
      seamId: typeof AUT_R1_FROM_DURABLE_EVIDENCE_SEAM_ID;
      candidateBuilt: false;
      reason: "NO_CANDIDATE_FROM_DURABLE_EVIDENCE" | "NOT_TRUSTED_IDENTITY";
      accept: null;
    };

/**
 * Build Candidate from durable Evidence observations → evaluate/apply AUT-R1.
 * Does not invent rates; does not use companyPrice; does not Owner Accept.
 */
export async function tryAutR1AcceptFromDurableEvidence(
  input: TryAutR1FromDurableEvidenceInput,
): Promise<TryAutR1FromDurableEvidenceResult> {
  const seamId = AUT_R1_FROM_DURABLE_EVIDENCE_SEAM_ID;
  if (!input.identityTrusted) {
    return {
      ok: false,
      seamId,
      candidateBuilt: false,
      reason: "NOT_TRUSTED_IDENTITY",
      accept: null,
    };
  }

  const candidate = buildCandidateFromDurableLaborEvidence({
    workId: input.workId,
    workNamePl: input.workNamePl,
    unit: input.unit,
    observations: input.observations,
    marginPct: input.marginPct,
  });

  if (!candidate) {
    return {
      ok: false,
      seamId,
      candidateBuilt: false,
      reason: "NO_CANDIDATE_FROM_DURABLE_EVIDENCE",
      accept: null,
    };
  }

  const accept = await tryAutR1AcceptLaborCandidate({
    store: input.store,
    candidate,
    identityTrusted: true,
    matchMethod: input.matchMethod,
    evidenceObservations: input.observations,
    nowMs: input.nowMs,
    persist: input.persist,
    save: input.save,
  });

  return {
    ok: true,
    seamId,
    candidateBuilt: true,
    accept,
  };
}
