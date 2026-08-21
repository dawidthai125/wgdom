/**
 * IK-KNR KL-0 — KnrSourceProvider interface (no implementations).
 *
 * L5 scraper: DEFAULT OFF · L6 LLM: NEVER authoritative.
 */

import type { KnrSourceLevel } from "../types";
import type { KnrIdentityV2Partial } from "../knr-identity-v2";
import type { KnrRawEvidence } from "../knr-provenance-types";

export type KnrAcquisitionRequest = {
  partialIdentity: KnrIdentityV2Partial;
  identityKeyV2: string;
  evidenceKeyV1?: string | null;
  tenderId: string;
};

export interface KnrSourceProvider {
  readonly level: KnrSourceLevel;
  readonly originId: string;
  readonly providerId: string;
  /** L5 scraper providers must return false when DEFAULT OFF. */
  canHandle(partial: KnrIdentityV2Partial): boolean;
  /** KL-0: implementors forbidden until Owner GO + Legal Gate (KL-5+). */
  acquire(request: KnrAcquisitionRequest): Promise<KnrRawEvidence>;
}

/** Marker — no KL-0 provider implementations shipped. */
export const KNR_KL0_NO_SOURCE_PROVIDERS = true as const;
