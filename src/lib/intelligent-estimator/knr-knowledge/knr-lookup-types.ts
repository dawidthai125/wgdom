/**
 * IK-KNR KL-0 — LOCAL-FIRST lookup result contract (impl = KL-2).
 */

import type { KnrLookupStatus } from "./types";
import type { KnrNormBundle } from "./knr-catalog-entry-types";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";

export type KnrCatalogLookupRequest = {
  identityKeyV2: string;
  evidenceKeyV1?: string | null;
  partialIdentity?: KnrIdentityV2Partial;
};

export type KnrCatalogLookupHit = {
  status: "LOCAL_HIT" | "STALE_HIT";
  identityKeyV2: string;
  normBundle: KnrNormBundle;
  verificationStatus: "VERIFIED" | "STALE";
  httpRequestCount: 0;
  researchExecuted: false;
};

export type KnrCatalogLookupMiss = {
  status: Exclude<
    KnrLookupStatus,
    "LOCAL_HIT" | "STALE_HIT" | "RESEARCH_REQUIRED" | "RESEARCH_DISABLED"
  >;
  identityKeyV2: string;
  httpRequestCount: 0;
  researchExecuted: false;
};

export type KnrCatalogLookupResearchGate = {
  status: "RESEARCH_REQUIRED" | "RESEARCH_DISABLED";
  identityKeyV2: string;
  executeKnrResearch: boolean;
  httpRequestCount: 0;
  researchExecuted: false;
};

export type KnrCatalogLookupResult =
  | KnrCatalogLookupHit
  | KnrCatalogLookupMiss
  | KnrCatalogLookupResearchGate;

/** KL-0 stub — always RESEARCH_DISABLED (no lookup store). */
export function stubLookupKnrCatalog(
  request: KnrCatalogLookupRequest,
  executeKnrResearch: boolean,
): KnrCatalogLookupResearchGate {
  return {
    status: executeKnrResearch ? "RESEARCH_REQUIRED" : "RESEARCH_DISABLED",
    identityKeyV2: request.identityKeyV2,
    executeKnrResearch,
    httpRequestCount: 0,
    researchExecuted: false,
  };
}
