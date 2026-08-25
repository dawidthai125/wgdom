/**
 * KL-7-P2B — HTTP result → discovery evidence ONLY (never catalog / VERIFIED / PLN).
 * Phase 2D: targeted context window from shared PDF/HTML document body.
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
import {
  extractKnrDiscoveryFactFromDocumentText,
  sliceKnrDiscoveryTargetContext,
} from "./knr-discovery-fact-extract";
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
 * Persist HTTP/PDF body fragment as discovery evidence.
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
  const targetCode = input.displayCode ?? input.evidenceKeyV1;
  const fragment = sliceKnrDiscoveryTargetContext(
    input.exec.bodyText,
    targetCode,
    500,
  );

  const targeted = extractKnrDiscoveryFactFromDocumentText(input.exec.bodyText, {
    expectedCode: targetCode,
    evidenceKeyV1: input.evidenceKeyV1,
    sourceId: input.sourceId,
    sourceUrlHash: urlHash,
  });

  const record: KnrDiscoveryEvidenceRecord = {
    schemaVersion: 1,
    evidenceKeyV1: input.evidenceKeyV1,
    identityKeyV2: input.identityKeyV2 ?? null,
    family: input.family,
    displayCode: input.displayCode ?? input.evidenceKeyV1,
    description: targeted.description ?? undefined,
    unit: targeted.unit ?? undefined,
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
