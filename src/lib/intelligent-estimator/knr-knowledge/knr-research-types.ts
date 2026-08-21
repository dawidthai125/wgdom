/**
 * IK-KNR KL-0 — Research result contract (no HTTP · no acquire impl).
 */

import type { KnrSourceLevel } from "./types";
import type { KnrVerificationStatus } from "./types";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import type { KnrRawEvidence } from "./knr-provenance-types";

export type KnrResearchExecutionMetadata = {
  researchExecuted: boolean;
  httpRequestCount: number;
  providerLevel: KnrSourceLevel | null;
  providerId: string | null;
  startedAt: string;
  finishedAt: string;
  cooldownKey?: string | null;
};

export type KnrResearchRequest = {
  tenderId: string;
  partialIdentity: KnrIdentityV2Partial;
  identityKeyV2: string;
  evidenceKeyV1?: string | null;
  executeKnrResearch: boolean;
};

export type KnrResearchResult =
  | {
      status: "DISABLED";
      reason: "EXECUTE_KNR_RESEARCH_FALSE" | "KL0_CONTRACT_ONLY";
      metadata: KnrResearchExecutionMetadata;
    }
  | {
      status: "LEGAL_BLOCK";
      reason: string;
      metadata: KnrResearchExecutionMetadata;
    }
  | {
      status: "NOT_IMPLEMENTED";
      reason: "KL0_NO_PROVIDER";
      metadata: KnrResearchExecutionMetadata;
    }
  | {
      status: "ACQUIRED";
      rawEvidence: KnrRawEvidence;
      candidate: KnrCatalogEntry;
      verificationStatus: Exclude<KnrVerificationStatus, "VERIFIED">;
      metadata: KnrResearchExecutionMetadata;
    };

/** KL-0 default — research path not implemented. */
export function stubKnrResearchResult(
  request: KnrResearchRequest,
  nowIso: string,
): KnrResearchResult {
  const metadata: KnrResearchExecutionMetadata = {
    researchExecuted: false,
    httpRequestCount: 0,
    providerLevel: null,
    providerId: null,
    startedAt: nowIso,
    finishedAt: nowIso,
    cooldownKey: request.identityKeyV2,
  };

  if (!request.executeKnrResearch) {
    return {
      status: "DISABLED",
      reason: "EXECUTE_KNR_RESEARCH_FALSE",
      metadata,
    };
  }

  return {
    status: "NOT_IMPLEMENTED",
    reason: "KL0_NO_PROVIDER",
    metadata,
  };
}
