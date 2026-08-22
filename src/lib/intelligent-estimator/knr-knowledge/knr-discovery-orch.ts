/**
 * KL-7-P2C — Discovery orchestration (OFF-mode capable).
 * REUSE P2B planner/exec/ingest · P2A upsert + clampDiscoveryStatusForSources.
 * ZERO catalog / VERIFIED / PLN · ZERO live HTTP by default.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import type { KnrDiscoveryAllowlistEntry } from "./knr-discovery-allowlist";
import {
  emptyKnrDiscoveryEvidenceStore,
  upsertKnrDiscoveryEvidenceOffline,
  clampDiscoveryStatusForSources,
} from "./knr-discovery-evidence-store";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
  KnrDiscoverySourcePriority,
  KnrDiscoverySourceRef,
  KnrDiscoveryStatus,
} from "./knr-discovery-evidence-types";
import { planKnrDiscoveryHttp } from "./knr-discovery-http-planner";
import { executeKnrDiscoveryHttpPlan } from "./knr-discovery-http-exec";
import { ingestKnrDiscoveryHttpResultToEvidence } from "./knr-discovery-http-ingest";
import {
  emptyKnrDiscoveryHttpAccounting,
  type KnrDiscoveryHttpExecuteResult,
  type KnrDiscoveryHttpPlan,
} from "./knr-discovery-http-types";
import {
  claimKnrDiscoveryJobLease,
  releaseKnrDiscoveryJobLease,
  type AtomicKnrDiscoveryJobStore,
} from "./knr-discovery-job-lease";
import { runKnrDiscoveryClientSingleFlight } from "./knr-discovery-client-sf";
import { runWithKnrDiscoveryOrchPool } from "./knr-discovery-orch-pool";
import {
  KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT,
  KNR_DISCOVERY_ORCH_BATCH_MAX,
  KNR_DISCOVERY_ORCH_CONCURRENCY_MAX,
  type KnrDiscoveryOrchResult,
  type KnrDiscoveryOrchSourceResult,
} from "./knr-discovery-orch-types";

export type KnrDiscoveryOrchHttpMode = "p2b" | "fake";

export type OrchestrateKnrDiscoveryP2cInput = {
  evidenceKeyV1: string;
  family: string;
  sourceIds: readonly string[];
  claimantId: string;
  leaseStore: AtomicKnrDiscoveryJobStore;
  nowIso: string;
  nowMs?: number;
  leaseMs?: number;
  /** Production MUST omit / false. */
  featureEnabled?: boolean;
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  discoveryStore?: KnrDiscoveryEvidenceStore;
  identityKeyV2?: string | null;
  displayCode?: string;
  /**
   * "p2b" = real planner→exec (OFF ⇒ HTTP=0).
   * "fake" = OFF-mode fixtures — no outbound; still claims lease + P2A ingest path.
   */
  httpMode?: KnrDiscoveryOrchHttpMode;
  /** Required when httpMode=fake — deterministic exec result per sourceId. */
  fakeExecForSource?: (
    sourceId: string,
  ) => KnrDiscoveryHttpExecuteResult | Promise<KnrDiscoveryHttpExecuteResult>;
  /** Test hook — observe pool telemetry. */
  onPoolTelemetry?: (t: { maxInFlight: number; currentInFlight: number }) => void;
  planHttp?: typeof planKnrDiscoveryHttp;
  executePlan?: typeof executeKnrDiscoveryHttpPlan;
};

function dedupePreserveOrder(ids: readonly string[]): {
  unique: string[];
  duplicatesDropped: string[];
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  const duplicatesDropped: string[] = [];
  for (const raw of ids) {
    const id = String(raw ?? "").trim();
    if (!id) continue;
    if (seen.has(id)) {
      duplicatesDropped.push(id);
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return { unique, duplicatesDropped };
}

function mergeIngestedSource(
  store: KnrDiscoveryEvidenceStore,
  input: {
    evidenceKeyV1: string;
    family: string;
    identityKeyV2?: string | null;
    displayCode?: string;
    source: KnrDiscoverySourceRef;
    nowIso: string;
    preferredStatus: KnrDiscoveryStatus;
  },
): KnrDiscoveryEvidenceStore {
  const existing = store.entries[input.evidenceKeyV1];
  const priorSources = existing?.sources ?? [];
  const withoutDup = priorSources.filter((s) => s.sourceId !== input.source.sourceId);
  const sources = [...withoutDup, input.source];
  const discoveryStatus = clampDiscoveryStatusForSources(input.preferredStatus, sources);
  const record: KnrDiscoveryEvidenceRecord = {
    schemaVersion: 1,
    evidenceKeyV1: input.evidenceKeyV1,
    identityKeyV2: input.identityKeyV2 ?? existing?.identityKeyV2 ?? null,
    family: input.family,
    displayCode: input.displayCode ?? existing?.displayCode ?? input.evidenceKeyV1,
    description: existing?.description,
    unit: existing?.unit,
    discoveryStatus,
    lifecycleState: "ACTIVE",
    sources,
    norms: existing?.norms ?? { laborNorms: [], materialNorms: [], equipmentNorms: [] },
    queryHashes: existing?.queryHashes ?? [],
    freshness: "FRESH",
    contentHash: input.source.contentHash,
    lastFetchedAt: input.source.fetchedAt,
    createdAt: existing?.createdAt ?? input.nowIso,
    updatedAt: input.nowIso,
    catalogRevisionLink: null,
  };
  return upsertKnrDiscoveryEvidenceOffline({
    record,
    nowIso: input.nowIso,
    storeOverride: store,
  }).store;
}

async function runOneSource(
  input: OrchestrateKnrDiscoveryP2cInput,
  sourceId: string,
  storeRef: { current: KnrDiscoveryEvidenceStore; chain: Promise<unknown> },
  nowMs: number,
): Promise<KnrDiscoveryOrchSourceResult> {
  const leaseMs = input.leaseMs ?? KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT;
  const claim = await claimKnrDiscoveryJobLease(
    input.leaseStore,
    {
      evidenceKeyV1: input.evidenceKeyV1,
      sourceId,
      claimantId: input.claimantId,
      leaseMs,
    },
    nowMs,
  );

  if (!claim.acquired) {
    return {
      sourceId,
      orchStatus: "HELD_BY_OTHER",
      httpJobStatus: null,
      denyCode: null,
      leaseReason: claim.reason ?? "held_by_other",
      accounting: emptyKnrDiscoveryHttpAccounting(),
    };
  }

  const withStoreLock = async <T>(fn: () => T): Promise<T> => {
    const run = storeRef.chain.then(() => fn());
    storeRef.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  try {
    return await runKnrDiscoveryClientSingleFlight(
      input.evidenceKeyV1,
      sourceId,
      async () => {
        const planFn = input.planHttp ?? planKnrDiscoveryHttp;
        const execFn = input.executePlan ?? executeKnrDiscoveryHttpPlan;
        const mode = input.httpMode ?? "p2b";

        let plan: KnrDiscoveryHttpPlan;
        let exec: KnrDiscoveryHttpExecuteResult;

        if (mode === "fake") {
          if (!input.fakeExecForSource) {
            return {
              sourceId,
              orchStatus: "FAILED" as const,
              httpJobStatus: "FAILED" as const,
              denyCode: "UPSTREAM_ERROR" as const,
              leaseReason: claim.reason ?? null,
              accounting: emptyKnrDiscoveryHttpAccounting(),
            };
          }
          plan = {
            allowed: true,
            sourceId,
            requestUrl: `https://p2c-fake.test/${encodeURIComponent(sourceId)}`,
            hostname: "p2c-fake.test",
            originId: "knr_government_public",
            jobStatus: "PLANNED",
            denyCode: null,
            accounting: emptyKnrDiscoveryHttpAccounting(),
            featureEnabled: false,
          };
          exec = await input.fakeExecForSource(sourceId);
        } else {
          plan = planFn({
            sourceId,
            featureEnabled: input.featureEnabled === true,
            allowlistOverride: input.allowlistOverride,
          });
          if (!plan.allowed) {
            return {
              sourceId,
              orchStatus: "DENIED" as const,
              httpJobStatus: plan.jobStatus,
              denyCode: plan.denyCode,
              leaseReason: claim.reason ?? null,
              accounting: plan.accounting,
            };
          }
          exec = await execFn(plan, {
            allowlistOverride: input.allowlistOverride,
            nowIso: input.nowIso,
          });
        }

        if (!exec.evidenceWritable) {
          return {
            sourceId,
            orchStatus: exec.denyCode ? ("DENIED" as const) : ("FAILED" as const),
            httpJobStatus: exec.jobStatus,
            denyCode: exec.denyCode,
            leaseReason: claim.reason ?? null,
            accounting: exec.accounting,
          };
        }

        const ingested = ingestKnrDiscoveryHttpResultToEvidence({
          exec,
          evidenceKeyV1: input.evidenceKeyV1,
          family: input.family,
          identityKeyV2: input.identityKeyV2,
          sourceId,
          displayCode: input.displayCode,
          nowIso: input.nowIso,
          storeOverride: emptyKnrDiscoveryEvidenceStore(input.nowIso),
        });

        if (!ingested.ok) {
          return {
            sourceId,
            orchStatus: "FAILED" as const,
            httpJobStatus: exec.jobStatus,
            denyCode: null,
            leaseReason: claim.reason ?? null,
            accounting: exec.accounting,
          };
        }

        const src = ingested.record.sources[0]!;
        await withStoreLock(() => {
          const preferred: KnrDiscoveryStatus =
            (storeRef.current.entries[input.evidenceKeyV1]?.sources.length ?? 0) + 1 >= 2
              ? "CORROBORATED"
              : "DISCOVERED";
          storeRef.current = mergeIngestedSource(storeRef.current, {
            evidenceKeyV1: input.evidenceKeyV1,
            family: input.family,
            identityKeyV2: input.identityKeyV2,
            displayCode: input.displayCode,
            source: src,
            nowIso: input.nowIso,
            preferredStatus: preferred,
          });
        });

        return {
          sourceId,
          orchStatus: "ORCH_INGESTED" as const,
          httpJobStatus: exec.jobStatus,
          denyCode: null,
          leaseReason: claim.reason ?? null,
          accounting: exec.accounting,
        };
      },
    );
  } finally {
    await releaseKnrDiscoveryJobLease(input.leaseStore, {
      evidenceKeyV1: input.evidenceKeyV1,
      sourceId,
      claimantId: input.claimantId,
      nowMs,
    });
  }
}

/**
 * Orchestrate discovery for one evidenceKey across sourceIds (OFF-mode safe).
 */
export async function orchestrateKnrDiscoveryP2c(
  input: OrchestrateKnrDiscoveryP2cInput,
): Promise<KnrDiscoveryOrchResult> {
  const nowMs = input.nowMs ?? Date.parse(input.nowIso) ?? Date.now();
  const { unique, duplicatesDropped } = dedupePreserveOrder(input.sourceIds);
  const plannedSourceIds = unique.slice(0, KNR_DISCOVERY_ORCH_BATCH_MAX);
  const truncatedSourceIds = unique.slice(KNR_DISCOVERY_ORCH_BATCH_MAX);

  const storeRef = {
    current: input.discoveryStore ?? emptyKnrDiscoveryEvidenceStore(input.nowIso),
    chain: Promise.resolve() as Promise<unknown>,
  };

  const truncatedResults: KnrDiscoveryOrchSourceResult[] = truncatedSourceIds.map(
    (sourceId) => ({
      sourceId,
      orchStatus: "BATCH_TRUNCATED_SKIP",
      httpJobStatus: null,
      denyCode: null,
      leaseReason: null,
      accounting: emptyKnrDiscoveryHttpAccounting(),
    }),
  );

  const tasks = plannedSourceIds.map(
    (sourceId) => () => runOneSource(input, sourceId, storeRef, nowMs),
  );

  const ran = await runWithKnrDiscoveryOrchPool(tasks, {
    concurrency: KNR_DISCOVERY_ORCH_CONCURRENCY_MAX,
    onTelemetry: input.onPoolTelemetry,
  });

  const sourceResults = [...ran, ...truncatedResults];
  const httpRequestCount = sourceResults.reduce(
    (sum, r) => sum + (r.accounting.httpRequestCount || 0),
    0,
  );

  const entry = storeRef.current.entries[input.evidenceKeyV1];
  let discoveryStatus: KnrDiscoveryStatus | null = entry?.discoveryStatus ?? null;
  if (entry) {
    discoveryStatus = clampDiscoveryStatusForSources(entry.discoveryStatus, entry.sources);
  }

  return {
    evidenceKeyV1: input.evidenceKeyV1,
    family: input.family,
    plannedSourceIds,
    truncatedSourceIds,
    duplicateSourceIdsDropped: duplicatesDropped,
    sourceResults,
    httpRequestCount,
    discoveryStatus,
    authorityWrites: {
      catalog: false,
      ath: false,
      verified: false,
      priced: false,
    },
    offMode: (input.httpMode ?? "p2b") === "fake" || input.featureEnabled !== true,
  };
}

/** Helper: build a fake successful exec body for OFF-mode tests (no network). */
export function buildFakeKnrDiscoveryHttpSuccess(
  sourceId: string,
  nowIso: string,
  priority: KnrDiscoverySourcePriority = "GOVERNMENT",
): KnrDiscoveryHttpExecuteResult {
  const body = `<html><body>KNR fixture ${sourceId} ${priority} norms R:1.0 enough text for min length gate xxxxxxxxxx</body></html>`;
  return {
    jobStatus: "SUCCEEDED",
    denyCode: null,
    accounting: { httpRequestCount: 0, attemptedFetch: false },
    finalUrl: `https://p2c-fake.test/${encodeURIComponent(sourceId)}`,
    contentType: "text/html",
    bodyText: body,
    fetchedAtIso: nowIso,
    evidenceWritable: true,
  };
}

/** Content-hash helper for tests asserting merge. */
export function fakeSourceContentHash(sourceId: string): string {
  return fnv1aHex(`fake:${sourceId}`);
}

export const KNR_DISCOVERY_ORCH_P2C_RUNTIME_IMPLEMENTED = true as const;
