/**
 * IK-KNR KL-3 HOST — OD-KNR-FLAG-1 YES + Phase 2 on-demand Discovery wire.
 *
 * Thin loop over resolveKnrKnowledgeKl3b (REUSE — no second resolver).
 * Phase 2: after MISS / no L1 result, optional runKnrDiscoveryOnDemand
 * when featureEnabled + source selection + allowlist pass.
 *
 * ZERO auto-VERIFY · ZERO OWNER_KNR_MAPPINGS · ZERO A1/P4/F5.
 * Production Discovery defaults: FEATURE OFF · allowlist EMPTY → HTTP=0.
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { loadKnrCatalogStoreLocal, saveKnrCatalogStoreLocal } from "./knr-catalog-store";
import type { KnrRawEvidenceStore } from "./knr-evidence-store";
import type { KnrKnowledgeEnvelope } from "./knr-knowledge-envelope";
import { summarizeKnrKnowledgeLines } from "./knr-knowledge-envelope";
import {
  resolveKnrKnowledgeKl3b,
  type KnrKl3bAthFile,
} from "./knr-research-kl3b";
import type { KnrVerifyActor } from "./knr-verify-orchestrator";
import {
  buildKnrHostDiscoverySideChannel,
  type KnrHostDiscoverySideChannel,
} from "./knr-host-discovery-sidechannel";
import type { KnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-types";
import type { KnrDiscoveryAllowlistEntry } from "./knr-discovery-allowlist";
import {
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT,
} from "./knr-discovery-http-types";
import {
  runKnrDiscoveryOnDemand,
  type KnrOnDemandMissKey,
  type RunKnrDiscoveryOnDemandResult,
} from "./knr-discovery-on-demand";
import {
  createMemoryAtomicKnrDiscoveryJobStore,
  type AtomicKnrDiscoveryJobStore,
} from "./knr-discovery-job-lease";
import type { KnrDiscoveryOrchHttpMode } from "./knr-discovery-orch";
import type { KnrDiscoveryHttpExecuteResult } from "./knr-discovery-http-types";
import { foldIdentityKeyV2, parseIdentityPartialFromCatalogBasis } from "./knr-identity-v2";
import { isKnrLocalHitStatus } from "./types";

/**
 * Historical name: host is no longer hard lookup-only after OD-KNR-FLAG-1 YES.
 * Still true that this adapter does not VERIFY / price / map.
 */
export const KNR_HOST_KL3_LOOKUP_ONLY = false as const;

/** OD-KNR-FLAG-1 = YES — host may invoke existing KL3B research-on-MISS. */
export const KNR_HOST_KL3_EXPLICIT_RESEARCH = true as const;

/** Host KL-3 closeout marker — wired (not VERIFY / not pricing). */
export const KNR_KNOWLEDGE_KL3_HOST_MARKER = true as const;

/** KL-7-P2B — discovery side-channel attached (HTTP still OFF · empty allowlist by default). */
export const KNR_HOST_DISCOVERY_SIDECHANNEL_WIRED = true as const;

/** Phase 2 — on-demand Discovery wire + PublicKnrSourceRegistry fallback (global IK). */
export const KNR_HOST_DISCOVERY_ON_DEMAND_WIRED = true as const;

/** Registry fallback active in host MISS path (BY_KEY preferred). */
export const KNR_HOST_PUBLIC_REGISTRY_FALLBACK_WIRED = true as const;

export type KnrHostKnowledgeLineInput = {
  lineId: string;
  /** Multi-dwelling reanalysis target — per line, not flattened. */
  dwellingId?: string | null;
  catalogBasis: CatalogBasis | null;
  /** Optional BOQ description — improves public registry query scoring. */
  description?: string | null;
};

export type KnrHostReanalysisTarget = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  evidenceKeyV1: string;
  identityKeyV2: string;
  knrCode: string;
  previousLookupStatus: string | null;
  newLookupStatus: string | null;
};

export type KnrHostKnowledgeResolveInput = {
  tenderId: string;
  lines: readonly KnrHostKnowledgeLineInput[];
  /** Default: loadKnrCatalogStoreLocal() for lookup / optional in-memory research staging. */
  catalogStore?: KnrCatalogStore;
  /** Optional discovery evidence store for P2A/P2 on-demand. */
  discoveryStore?: KnrDiscoveryEvidenceStore;
  /**
   * Override OD-KNR-FLAG-1 default (`KNR_HOST_KL3_EXPLICIT_RESEARCH`).
   * Tests use `false` to prove OFF → RESEARCH_DISABLED.
   */
  explicitResearch?: boolean;
  /** Required by KL3B for L1 research (Super Admin). Omitted → ACL gate inside KL3B. */
  actor?: KnrVerifyActor;
  /** L1 licensed ATH files — empty/omitted → RESEARCH_NO_RESULT when research runs. */
  athFiles?: readonly KnrKl3bAthFile[];
  /** Optional evidence store for L1 ingest staging (KL3B default empty if omitted). */
  evidenceStore?: KnrRawEvidenceStore;
  nowIso: string;
  /**
   * Phase 2 Discovery feature wire.
   * Default = KNR_DISCOVERY_HTTP_FEATURE_DEFAULT (true on pilot) — override false for fail-closed tests.
   */
  discoveryFeatureEnabled?: boolean;
  /** Test / Owner-wired allowlist override — production omit. */
  discoveryAllowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  /** Force sourceIds for all misses (tests). Else thin source-selection maps. */
  discoverySourceIdsOverride?: readonly string[] | null;
  discoveryLeaseStore?: AtomicKnrDiscoveryJobStore;
  discoveryHttpMode?: KnrDiscoveryOrchHttpMode;
  discoveryFakeExecForSource?: (
    sourceId: string,
  ) => KnrDiscoveryHttpExecuteResult | Promise<KnrDiscoveryHttpExecuteResult>;
  discoveryClaimantId?: string;
  /** BY_KEY → registry fallback for public discovery (default true). */
  publicRegistryFallback?: boolean;
};

export type KnrHostKnowledgeResolveResult = {
  envelope: KnrKnowledgeEnvelope;
  /** Includes Discovery HTTP when Phase 2 feature+allowlist+selection pass. */
  httpRequestCount: number;
  researchExecuted: boolean;
  /** True when this call forced explicitResearch=false (lookup-only pass). */
  lookupOnly: boolean;
  /** KL-7-P2B — P2A discovery outcomes · never PRICED / never VERIFIED. */
  discoverySideChannel: KnrHostDiscoverySideChannel;
  /** Phase 2 on-demand result (null when feature OFF or no misses). */
  onDemandDiscovery: RunKnrDiscoveryOnDemandResult | null;
  /** True when KL3B re-ran after public discovery staged PENDING_VERIFY. */
  reanalysisExecuted: boolean;
  /** lineIds refreshed after catalog staging. */
  reanalysisLineIds: readonly string[];
  /** Orchestra seam — downstream must invalidate Identity/Labor/F5. */
  reanalysisRequired: boolean;
  reanalysisTargets: readonly KnrHostReanalysisTarget[];
};

/** Deterministic BOQ fingerprint for host memo keys (no authority mutation). */
export function buildKnrHostKnowledgeAttemptKey(
  tenderId: string,
  lines: readonly KnrHostKnowledgeLineInput[],
  explicitResearch: boolean = KNR_HOST_KL3_EXPLICIT_RESEARCH,
): string {
  const basisKey = lines
    .map((l) => `${l.lineId}:${l.catalogBasis?.normalizedKey ?? ""}`)
    .join("|");
  const mode = explicitResearch ? "research-on-miss" : "lookup-only";
  return `${tenderId}|${lines.length}|${basisKey}|${mode}`;
}

function missKeyFromLine(
  line: KnrHostKnowledgeLineInput,
): KnrOnDemandMissKey | null {
  const basis = line.catalogBasis;
  if (!basis) return null;
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 =
    String(basis.normalizedKey ?? "").trim() || partial.evidenceKeyV1;
  if (!identityKeyV2 || !evidenceKeyV1) return null;
  return {
    evidenceKeyV1,
    identityKeyV2,
    family: String(partial.family ?? basis.family ?? "OTHER"),
    displayCode: String(basis.rawCode ?? evidenceKeyV1),
    normalizedKey: evidenceKeyV1,
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      column: partial.column,
      item: partial.item,
      chapter: partial.chapter,
    },
  };
}

/**
 * Host orchestrator. Not a second resolver — loops existing KL-3B.
 * OD-KNR-FLAG-1 YES: default explicitResearch=true; gates remain inside KL3B.
 * Phase 2: on-demand Discovery for remaining MISSes (fail-closed defaults).
 */
export async function resolveHostKnrKnowledgeLookupOnly(
  input: KnrHostKnowledgeResolveInput,
): Promise<KnrHostKnowledgeResolveResult> {
  const explicitResearch = input.explicitResearch ?? KNR_HOST_KL3_EXPLICIT_RESEARCH;
  const discoveryFeatureEnabled =
    input.discoveryFeatureEnabled === true
      ? true
      : input.discoveryFeatureEnabled === false
        ? false
        : KNR_DISCOVERY_HTTP_FEATURE_DEFAULT;

  let catalogStore = input.catalogStore ?? loadKnrCatalogStoreLocal();
  let evidenceStore = input.evidenceStore;
  let discoveryStore = input.discoveryStore;
  const lineResults = [];
  let researchExecuted = false;
  let httpRequestCount = 0;

  for (const line of input.lines) {
    const row = await resolveKnrKnowledgeKl3b({
      tenderId: input.tenderId,
      lineId: line.lineId,
      catalogBasis: line.catalogBasis,
      catalogStore,
      evidenceStore,
      actor: input.actor,
      athFiles: input.athFiles,
      explicitResearch,
      nowIso: input.nowIso,
    });
    catalogStore = row.catalogStore;
    evidenceStore = row.evidenceStore;
    lineResults.push(...row.envelope.lineResults);
    if (row.researchExecuted) researchExecuted = true;
    httpRequestCount += row.httpRequestCount;
  }

  // Phase 2 — collect MISSes (not local HIT / PENDING_VERIFY from L1)
  const missing: KnrOnDemandMissKey[] = [];
  for (const line of input.lines) {
    const result = lineResults.find((r) => r.lineId === line.lineId);
    const lookupStatus = result?.lookupStatus;
    if (lookupStatus && isKnrLocalHitStatus(lookupStatus)) continue;
    if (lookupStatus === "PENDING_VERIFY") continue;
    const mk = missKeyFromLine(line);
    if (mk) missing.push(mk);
  }

  let onDemandDiscovery: RunKnrDiscoveryOnDemandResult | null = null;
  let reanalysisExecuted = false;
  const reanalysisLineIds: string[] = [];
  const reanalysisTargets: KnrHostReanalysisTarget[] = [];

  if (missing.length > 0 && explicitResearch) {
    const lineDescriptionByEvidenceKey: Record<string, string> = {};
    for (const line of input.lines) {
      const mk = missKeyFromLine(line);
      if (!mk || !line.description) continue;
      lineDescriptionByEvidenceKey[mk.evidenceKeyV1] = String(line.description);
    }

    onDemandDiscovery = await runKnrDiscoveryOnDemand({
      missing,
      nowIso: input.nowIso,
      featureEnabled: discoveryFeatureEnabled,
      allowlistOverride: input.discoveryAllowlistOverride,
      discoveryStore,
      catalogStore,
      leaseStore:
        input.discoveryLeaseStore ?? createMemoryAtomicKnrDiscoveryJobStore(),
      sourceIdsOverride: input.discoverySourceIdsOverride,
      httpMode: input.discoveryHttpMode ?? "p2b",
      fakeExecForSource: input.discoveryFakeExecForSource,
      claimantId: input.discoveryClaimantId ?? `host:${input.tenderId}`,
      stagePendingOnFullFact: true,
      publicRegistryFallback: input.publicRegistryFallback !== false,
      lineDescriptionByEvidenceKey,
    });
    discoveryStore = onDemandDiscovery.discoveryStore;
    catalogStore = onDemandDiscovery.catalogStore;
    httpRequestCount += onDemandDiscovery.httpRequestCount;

    const stagedEvidenceKeys = new Set(
      onDemandDiscovery.perKey
        .filter((k) => k.stagedPending || k.lookupAfter === "PENDING_IN_CATALOG")
        .map((k) => k.evidenceKeyV1),
    );

    if (stagedEvidenceKeys.size > 0) {
      catalogStore = saveKnrCatalogStoreLocal(catalogStore, input.nowIso);
      for (const line of input.lines) {
        const mk = missKeyFromLine(line);
        if (!mk || !stagedEvidenceKeys.has(mk.evidenceKeyV1)) continue;
        const previous = lineResults.find((r) => r.lineId === line.lineId);
        const previousLookupStatus = previous?.lookupStatus ?? null;
        const row = await resolveKnrKnowledgeKl3b({
          tenderId: input.tenderId,
          lineId: line.lineId,
          catalogBasis: line.catalogBasis,
          catalogStore,
          evidenceStore,
          actor: input.actor,
          athFiles: input.athFiles,
          explicitResearch,
          nowIso: input.nowIso,
        });
        catalogStore = row.catalogStore;
        evidenceStore = row.evidenceStore;
        const refreshed = row.envelope.lineResults[0];
        const idx = lineResults.findIndex((r) => r.lineId === line.lineId);
        if (idx >= 0 && refreshed) lineResults[idx] = refreshed;
        else if (refreshed) lineResults.push(refreshed);
        reanalysisLineIds.push(line.lineId);
        reanalysisTargets.push({
          tenderId: input.tenderId,
          dwellingId: String(line.dwellingId ?? "").trim(),
          lineId: line.lineId,
          evidenceKeyV1: mk.evidenceKeyV1,
          identityKeyV2: mk.identityKeyV2,
          knrCode: mk.displayCode,
          previousLookupStatus,
          newLookupStatus: refreshed?.lookupStatus ?? null,
        });
      }
      reanalysisExecuted = reanalysisLineIds.length > 0;
    }
  }

  const envelope: KnrKnowledgeEnvelope = {
    tenderId: input.tenderId,
    schemaVersion: 1,
    lineResults,
    summary: summarizeKnrKnowledgeLines(lineResults, {
      researchExecuted,
      httpRequestCount,
    }),
  };

  const discoverySideChannel = buildKnrHostDiscoverySideChannel({
    lines: input.lines,
    catalogStore,
    discoveryStore,
    featureEnabled: discoveryFeatureEnabled,
    discoverySourceId: input.discoverySourceIdsOverride?.[0] ?? null,
  });

  httpRequestCount += discoverySideChannel.httpRequestCount;

  const stagedPendingCount =
    onDemandDiscovery?.perKey.filter(
      (k) => k.stagedPending || k.lookupAfter === "PENDING_IN_CATALOG",
    ).length ?? 0;
  const reanalysisRequired = reanalysisExecuted || stagedPendingCount > 0;

  return {
    envelope,
    httpRequestCount,
    researchExecuted,
    lookupOnly: explicitResearch === false,
    discoverySideChannel,
    onDemandDiscovery,
    reanalysisExecuted,
    reanalysisLineIds,
    reanalysisRequired,
    reanalysisTargets,
  };
}
