/**
 * IK-KNR KL-3 HOST — lookup-only adapter (OD-KNR-KL3-HOST-1 Q1=A).
 *
 * Thin loop over resolveKnrKnowledgeKl3b · explicitResearch=false always.
 * ZERO research · ZERO persist · ZERO HTTP · side-channel envelope only.
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { loadKnrCatalogStoreLocal } from "./knr-catalog-store";
import type { KnrKnowledgeEnvelope } from "./knr-knowledge-envelope";
import { summarizeKnrKnowledgeLines } from "./knr-knowledge-envelope";
import { resolveKnrKnowledgeKl3b } from "./knr-research-kl3b";
import {
  buildKnrHostDiscoverySideChannel,
  type KnrHostDiscoverySideChannel,
} from "./knr-host-discovery-sidechannel";
import type { KnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-types";

export const KNR_HOST_KL3_LOOKUP_ONLY = true as const;
export const KNR_HOST_KL3_EXPLICIT_RESEARCH = false as const;
/** Host KL-3 closeout marker — lookup-only path wired (not VERIFY / not pricing). */
export const KNR_KNOWLEDGE_KL3_HOST_MARKER = true as const;
/** KL-7-P2B — discovery side-channel attached (HTTP still OFF by default). */
export const KNR_HOST_DISCOVERY_SIDECHANNEL_WIRED = true as const;

export type KnrHostKnowledgeLineInput = {
  lineId: string;
  catalogBasis: CatalogBasis | null;
};

export type KnrHostKnowledgeResolveInput = {
  tenderId: string;
  lines: readonly KnrHostKnowledgeLineInput[];
  /** Default: loadKnrCatalogStoreLocal() read-only for lookup. */
  catalogStore?: KnrCatalogStore;
  /** Optional discovery evidence store for P2A side-channel. */
  discoveryStore?: KnrDiscoveryEvidenceStore;
  nowIso: string;
};

export type KnrHostKnowledgeResolveResult = {
  envelope: KnrKnowledgeEnvelope;
  httpRequestCount: 0;
  researchExecuted: false;
  lookupOnly: true;
  /** KL-7-P2B — P2A discovery outcomes · never PRICED / never VERIFIED · HTTP=0 default. */
  discoverySideChannel: KnrHostDiscoverySideChannel;
};

/** Deterministic BOQ fingerprint for host memo keys (no authority mutation). */
export function buildKnrHostKnowledgeAttemptKey(
  tenderId: string,
  lines: readonly KnrHostKnowledgeLineInput[],
): string {
  const basisKey = lines
    .map((l) => `${l.lineId}:${l.catalogBasis?.normalizedKey ?? ""}`)
    .join("|");
  return `${tenderId}|${lines.length}|${basisKey}|lookup-only`;
}

/**
 * Host lookup-only orchestrator. Not a second resolver — loops existing KL-3B.
 */
export async function resolveHostKnrKnowledgeLookupOnly(
  input: KnrHostKnowledgeResolveInput,
): Promise<KnrHostKnowledgeResolveResult> {
  let catalogStore = input.catalogStore ?? loadKnrCatalogStoreLocal();
  const lineResults = [];

  for (const line of input.lines) {
    const row = await resolveKnrKnowledgeKl3b({
      tenderId: input.tenderId,
      lineId: line.lineId,
      catalogBasis: line.catalogBasis,
      catalogStore,
      explicitResearch: KNR_HOST_KL3_EXPLICIT_RESEARCH,
      nowIso: input.nowIso,
    });
    catalogStore = row.catalogStore;
    lineResults.push(...row.envelope.lineResults);
  }

  const envelope: KnrKnowledgeEnvelope = {
    tenderId: input.tenderId,
    schemaVersion: 1,
    lineResults,
    summary: summarizeKnrKnowledgeLines(lineResults, {
      researchExecuted: false,
      httpRequestCount: 0,
    }),
  };

  const discoverySideChannel = buildKnrHostDiscoverySideChannel({
    lines: input.lines,
    catalogStore,
    discoveryStore: input.discoveryStore,
  });

  return {
    envelope,
    httpRequestCount: 0,
    researchExecuted: false,
    lookupOnly: true,
    discoverySideChannel,
  };
}
