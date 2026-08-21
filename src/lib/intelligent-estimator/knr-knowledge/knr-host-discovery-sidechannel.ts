/**
 * KL-7-P2B — Host side-channel: P2A lookup outcomes (no pricing · no HTTP when OFF).
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { loadKnrCatalogStoreLocal } from "./knr-catalog-store";
import {
  lookupKnrKnowledgeWithDiscoveryEvidence,
  type KnrDiscoveryLookupOutcome,
} from "./knr-discovery-evidence-lookup";
import {
  loadKnrDiscoveryEvidenceStoreLocal,
} from "./knr-discovery-evidence-store";
import type { KnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-types";
import { gateKnrDiscoveryHttpAfterRequired } from "./knr-discovery-http-planner";
import type { KnrDiscoveryHttpPlan } from "./knr-discovery-http-types";
import { foldIdentityKeyV2, parseIdentityPartialFromCatalogBasis } from "./knr-identity-v2";

export type KnrHostDiscoverySideChannelLine = {
  lineId: string;
  outcome: KnrDiscoveryLookupOutcome;
  identityKeyV2: string;
  evidenceKeyV1?: string;
  /** Always 0 on Host path with production defaults (feature OFF / empty allowlist). */
  httpRequestCount: 0;
  /** Present only when outcome=DISCOVERY_REQUIRED — plan is deny/stop under defaults. */
  httpPlan?: KnrDiscoveryHttpPlan;
  /** Never PRICED / never VERIFIED from this channel. */
  priced: false;
  verified: false;
};

export type KnrHostDiscoverySideChannel = {
  lines: KnrHostDiscoverySideChannelLine[];
  httpRequestCount: 0;
  priced: false;
  verified: false;
};

function identityFromBasis(basis: CatalogBasis | null): {
  identityKeyV2: string;
  evidenceKeyV1?: string;
} {
  if (!basis) return { identityKeyV2: "" };
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 =
    String(basis.normalizedKey ?? "").trim()
    || (partial.family && partial.catalog
      ? `${partial.family}|${partial.catalog}|${partial.table ?? ""}`
      : undefined);
  return { identityKeyV2, evidenceKeyV1 };
}

/**
 * Pure side-channel over existing P2A lookup.
 * Does not mutate catalog · does not price · does not VERIFY.
 * On DISCOVERY_REQUIRED runs planner gate (default OFF → HTTP=0).
 */
export function buildKnrHostDiscoverySideChannel(input: {
  lines: readonly { lineId: string; catalogBasis: CatalogBasis | null }[];
  catalogStore?: KnrCatalogStore;
  discoveryStore?: KnrDiscoveryEvidenceStore;
  /** Optional sourceId for planner — ignored when feature OFF / allowlist empty. */
  discoverySourceId?: string | null;
}): KnrHostDiscoverySideChannel {
  const catalogStore = input.catalogStore ?? loadKnrCatalogStoreLocal();
  const discoveryStore =
    input.discoveryStore ?? loadKnrDiscoveryEvidenceStoreLocal();

  const lines: KnrHostDiscoverySideChannelLine[] = [];

  for (const row of input.lines) {
    const { identityKeyV2, evidenceKeyV1 } = identityFromBasis(row.catalogBasis);
    if (!identityKeyV2) {
      lines.push({
        lineId: row.lineId,
        outcome: "INVALID_LOOKUP",
        identityKeyV2: "",
        httpRequestCount: 0,
        priced: false,
        verified: false,
      });
      continue;
    }

    const lookup = lookupKnrKnowledgeWithDiscoveryEvidence({
      request: { identityKeyV2, evidenceKeyV1 },
      catalogStore,
      discoveryStore,
    });

    let httpPlan: KnrDiscoveryHttpPlan | undefined;
    if (lookup.outcome === "DISCOVERY_REQUIRED") {
      // Production defaults: FEATURE_OFF or ALLOWLIST_EMPTY → HTTP=0
      httpPlan = gateKnrDiscoveryHttpAfterRequired({
        sourceId: input.discoverySourceId,
        featureEnabled: false,
      });
    }

    lines.push({
      lineId: row.lineId,
      outcome: lookup.outcome,
      identityKeyV2,
      evidenceKeyV1:
        lookup.outcome === "CATALOG_HIT" || lookup.outcome === "EVIDENCE_HIT"
          ? lookup.evidenceKeyV1
          : evidenceKeyV1,
      httpRequestCount: 0,
      httpPlan,
      priced: false,
      verified: false,
    });
  }

  return {
    lines,
    httpRequestCount: 0,
    priced: false,
    verified: false,
  };
}

export const KNR_HOST_DISCOVERY_SIDECHANNEL_P2B_IMPLEMENTED = true as const;
