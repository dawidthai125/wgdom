/**
 * KL-7-P2B — HTTP result → discovery evidence ONLY (never catalog / VERIFIED / PLN).
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import {
  emptyKnrDiscoveryEvidenceStore,
  upsertKnrDiscoveryEvidenceOffline,
} from "./knr-discovery-evidence-store";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
} from "./knr-discovery-evidence-types";
import type { KnrDiscoveryHttpExecuteResult } from "./knr-discovery-http-types";

export type IngestKnrDiscoveryHttpResultInput = {
  exec: KnrDiscoveryHttpExecuteResult;
  evidenceKeyV1: string;
  family: string;
  identityKeyV2?: string | null;
  sourceId: string;
  displayCode?: string;
  queryHash?: string;
  nowIso: string;
  storeOverride?: KnrDiscoveryEvidenceStore;
};

/**
 * Persist HTTP body fragment as discovery evidence.
 * Rejects when exec.evidenceWritable=false. Never sets VERIFIED / PLN.
 */
export function ingestKnrDiscoveryHttpResultToEvidence(
  input: IngestKnrDiscoveryHttpResultInput,
):
  | { ok: true; store: KnrDiscoveryEvidenceStore; record: KnrDiscoveryEvidenceRecord }
  | { ok: false; reason: string } {
  if (!input.exec.evidenceWritable || !input.exec.bodyText || !input.exec.finalUrl) {
    return { ok: false, reason: "NOT_EVIDENCE_WRITABLE" };
  }

  let hostname = "";
  try {
    hostname = new URL(input.exec.finalUrl).hostname.toLowerCase();
  } catch {
    return { ok: false, reason: "BAD_FINAL_URL" };
  }

  const contentHash = fnv1aHex(input.exec.bodyText.slice(0, 64_000));
  const urlHash = fnv1aHex(input.exec.finalUrl);
  const fragment = input.exec.bodyText.slice(0, 500).replace(/\s+/g, " ").trim();

  const record: KnrDiscoveryEvidenceRecord = {
    schemaVersion: 1,
    evidenceKeyV1: input.evidenceKeyV1,
    identityKeyV2: input.identityKeyV2 ?? null,
    family: input.family,
    displayCode: input.displayCode ?? input.evidenceKeyV1,
    description: undefined,
    unit: undefined,
    discoveryStatus: "DISCOVERED",
    lifecycleState: "ACTIVE",
    sources: [
      {
        sourceId: input.sourceId,
        urlHash,
        title: hostname,
        fragment,
        contentHash,
        fetchedAt: input.exec.fetchedAtIso ?? input.nowIso,
        priority: "OTHER",
      },
    ],
    norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
    queryHashes: input.queryHash ? [input.queryHash] : [],
    freshness: "FRESH",
    contentHash,
    lastFetchedAt: input.exec.fetchedAtIso ?? input.nowIso,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    catalogRevisionLink: null,
  };

  // Hard deny authority spoof if caller tried to inject
  const spoof = record as unknown as Record<string, unknown>;
  if (spoof.verificationStatus || spoof.ourRate || spoof.companyPrice) {
    return { ok: false, reason: "AUTHORITY_SPOOF" };
  }

  const base = input.storeOverride ?? emptyKnrDiscoveryEvidenceStore(input.nowIso);
  return upsertKnrDiscoveryEvidenceOffline({
    record,
    nowIso: input.nowIso,
    storeOverride: base,
  });
}

export const KNR_DISCOVERY_HTTP_INGEST_P2B_IMPLEMENTED = true as const;
