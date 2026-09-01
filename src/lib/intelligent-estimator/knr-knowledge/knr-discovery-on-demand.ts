/**
 * IK-KNR Phase 2 — On-demand KNR Discovery learning loop.
 *
 * missing KNR only → sourceIds → orchestrateKnrDiscoveryP2c → evidence →
 * FACT extract → optional PENDING stage → re-lookup.
 *
 * ZERO mass crawl · ZERO auto VERIFIED · ZERO OWNER_KNR_MAPPINGS · ZERO A1/P4/F5.
 * Production: feature default OFF · allowlist EMPTY → HTTP=0.
 */

import type { KnrDiscoveryAllowlistEntry } from "./knr-discovery-allowlist";
import {
  isKnrDiscoveryAllowlistEmpty,
  listKnrDiscoveryAllowlist,
} from "./knr-discovery-allowlist";
import { emptyKnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-store";
import {
  lookupKnrDiscoveryEvidence,
  lookupKnrKnowledgeWithDiscoveryEvidence,
} from "./knr-discovery-evidence-lookup";
import type { KnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-types";
import {
  extractKnrDiscoveryFactCandidate,
  type KnrDiscoveryFactCandidate,
} from "./knr-discovery-fact-extract";
import {
  stageDiscoveryFactToPendingCatalog,
} from "./knr-discovery-catalog-stage";
import {
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT,
} from "./knr-discovery-http-types";
import {
  createMemoryAtomicKnrDiscoveryJobStore,
  type AtomicKnrDiscoveryJobStore,
} from "./knr-discovery-job-lease";
import {
  orchestrateKnrDiscoveryP2c,
  type KnrDiscoveryOrchHttpMode,
  type OrchestrateKnrDiscoveryP2cInput,
} from "./knr-discovery-orch";
import { selectKnrDiscoverySourceIds } from "./knr-discovery-source-selection";
import {
  buildPublicKnrEffectiveAllowlist,
  selectPublicKnrDiscoverySources,
  type PublicKnrRegistryEntry,
} from "../ik-public-knr-source-registry";
import { buildPublicKnrQueryPlan } from "../ik-public-knr-query";
import {
  resolveKnrDiscoveryL3DocumentsForSources,
} from "./knr-discovery-l3-document-resolver";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { emptyKnrCatalogStore } from "./knr-catalog-store";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import type { KnrDiscoveryHttpExecuteResult } from "./knr-discovery-http-types";
import { clearKnrDiscoveryDocumentCacheForTests } from "./knr-discovery-document-cache";

/** Per-process budget: max 1 orch attempt per evidenceKeyV1 (anti-storm). */
const attemptedEvidenceKeys = new Set<string>();

export function clearKnrDiscoveryOnDemandBudgetForTests(): void {
  attemptedEvidenceKeys.clear();
  clearKnrDiscoveryDocumentCacheForTests();
}

export type KnrOnDemandMissKey = {
  evidenceKeyV1: string;
  identityKeyV2: string;
  family: string;
  displayCode?: string;
  normalizedKey?: string;
  identity?: KnrIdentityV2Partial;
};

export type KnrOnDemandKeyOutcomeReason =
  | "SKIP_HIT_OR_EVIDENCE"
  | "FEATURE_OFF"
  | "ALLOWLIST_EMPTY"
  | "NO_SOURCE_SELECTION"
  | "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED"
  | "BUDGET_EXHAUSTED"
  | "ORCH_DONE"
  | "INVALID_KEY"
  | "REGISTRY_FALLBACK";

export type KnrOnDemandKeyOutcome = {
  evidenceKeyV1: string;
  reason: KnrOnDemandKeyOutcomeReason;
  httpRequestCount: number;
  sourceIds: readonly string[];
  fact: KnrDiscoveryFactCandidate | null;
  stagedPending: boolean;
  lookupAfter:
    | "CATALOG_HIT"
    | "EVIDENCE_HIT"
    | "DISCOVERY_REQUIRED"
    | "INVALID_LOOKUP"
    | "PENDING_IN_CATALOG"
    | null;
};

export type RunKnrDiscoveryOnDemandResult = {
  httpRequestCount: number;
  discoveryStore: KnrDiscoveryEvidenceStore;
  catalogStore: KnrCatalogStore;
  perKey: KnrOnDemandKeyOutcome[];
  dedupedMissCount: number;
  skippedDuplicateInputCount: number;
  authorityWrites: {
    catalogVerified: false;
    ownerKnrMappings: false;
    a1: false;
    p4: false;
    f5: false;
    familyBridge: false;
  };
};

function dedupeMissKeys(missing: readonly KnrOnDemandMissKey[]): {
  unique: KnrOnDemandMissKey[];
  skippedDuplicateInputCount: number;
} {
  const seen = new Set<string>();
  const unique: KnrOnDemandMissKey[] = [];
  let skippedDuplicateInputCount = 0;
  for (const row of missing) {
    const ek = String(row.evidenceKeyV1 ?? "").trim();
    if (!ek) continue;
    if (seen.has(ek)) {
      skippedDuplicateInputCount += 1;
      continue;
    }
    seen.add(ek);
    unique.push({ ...row, evidenceKeyV1: ek });
  }
  return { unique, skippedDuplicateInputCount };
}

/**
 * On-demand discovery for missing KNR keys only (learning loop).
 */
export async function runKnrDiscoveryOnDemand(input: {
  missing: readonly KnrOnDemandMissKey[];
  nowIso: string;
  nowMs?: number;
  claimantId?: string;
  featureEnabled?: boolean;
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  discoveryStore?: KnrDiscoveryEvidenceStore;
  catalogStore?: KnrCatalogStore;
  leaseStore?: AtomicKnrDiscoveryJobStore;
  sourceIdsOverride?: readonly string[] | null;
  keyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  familyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  httpMode?: KnrDiscoveryOrchHttpMode;
  fakeExecForSource?: (
    sourceId: string,
  ) => KnrDiscoveryHttpExecuteResult | Promise<KnrDiscoveryHttpExecuteResult>;
  stagePendingOnFullFact?: boolean;
  /** When true, ignore process budget (still SF/cooldown inside orch). Tests only. */
  ignoreProcessBudget?: boolean;
  /**
   * BY_KEY preferred · PublicKnrSourceRegistry fallback when BY_KEY empty.
   * Default true — still fail-closed when feature OFF / effective allowlist empty.
   * Explicit `allowlistOverride: []` never merges registry (G-P2-01).
   */
  publicRegistryFallback?: boolean;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
  /** Optional description hint for registry query scoring (per-line BOQ). */
  lineDescriptionByEvidenceKey?: Readonly<Record<string, string>> | null;
}): Promise<RunKnrDiscoveryOnDemandResult> {
  const featureEnabled =
    input.featureEnabled === true
      ? true
      : input.featureEnabled === false
        ? false
        : KNR_DISCOVERY_HTTP_FEATURE_DEFAULT;

  let discoveryStore =
    input.discoveryStore ?? emptyKnrDiscoveryEvidenceStore(input.nowIso);
  let catalogStore = input.catalogStore ?? emptyKnrCatalogStore(input.nowIso);
  const leaseStore =
    input.leaseStore ?? createMemoryAtomicKnrDiscoveryJobStore();
  const claimantId = input.claimantId ?? "knr-on-demand-p2";
  const stagePending = input.stagePendingOnFullFact !== false;
  const publicRegistryFallback = input.publicRegistryFallback !== false;

  // G-P2-01 — distinguish: omitted override | explicit empty | explicit non-empty.
  // Explicit [] = fail-closed empty allowlist (no silent registry merge).
  const effectiveAllowlist =
    Array.isArray(input.allowlistOverride) && input.allowlistOverride.length === 0
      ? Object.freeze([])
      : publicRegistryFallback
        ? buildPublicKnrEffectiveAllowlist({
            baseAllowlist:
              input.allowlistOverride ?? listKnrDiscoveryAllowlist(null),
            registryOverride: input.registryOverride,
          })
        : listKnrDiscoveryAllowlist(input.allowlistOverride);

  const { unique, skippedDuplicateInputCount } = dedupeMissKeys(input.missing);
  const perKey: KnrOnDemandKeyOutcome[] = [];
  let httpRequestCount = 0;

  const authorityWrites = {
    catalogVerified: false as const,
    ownerKnrMappings: false as const,
    a1: false as const,
    p4: false as const,
    f5: false as const,
    familyBridge: false as const,
  };

  for (const miss of unique) {
    const ek = miss.evidenceKeyV1;
    if (!ek || !miss.identityKeyV2) {
      perKey.push({
        evidenceKeyV1: ek || "",
        reason: "INVALID_KEY",
        httpRequestCount: 0,
        sourceIds: [],
        fact: null,
        stagedPending: false,
        lookupAfter: null,
      });
      continue;
    }

    // Learn-once: existing evidence or catalog servable → no HTTP
    const priorLookup = lookupKnrKnowledgeWithDiscoveryEvidence({
      request: {
        identityKeyV2: miss.identityKeyV2,
        evidenceKeyV1: ek,
      },
      catalogStore,
      discoveryStore,
    });
    if (
      priorLookup.outcome === "CATALOG_HIT"
      || priorLookup.outcome === "EVIDENCE_HIT"
    ) {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "SKIP_HIT_OR_EVIDENCE",
        httpRequestCount: 0,
        sourceIds: [],
        fact: null,
        stagedPending: false,
        lookupAfter: priorLookup.outcome,
      });
      continue;
    }

    if (catalogStore.entries[miss.identityKeyV2]?.verificationStatus === "PENDING_VERIFY") {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "SKIP_HIT_OR_EVIDENCE",
        httpRequestCount: 0,
        sourceIds: [],
        fact: null,
        stagedPending: false,
        lookupAfter: "PENDING_IN_CATALOG",
      });
      continue;
    }

    if (!featureEnabled) {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "FEATURE_OFF",
        httpRequestCount: 0,
        sourceIds: [],
        fact: null,
        stagedPending: false,
        lookupAfter: "DISCOVERY_REQUIRED",
      });
      continue;
    }

    if (isKnrDiscoveryAllowlistEmpty(effectiveAllowlist)) {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "ALLOWLIST_EMPTY",
        httpRequestCount: 0,
        sourceIds: [],
        fact: null,
        stagedPending: false,
        lookupAfter: "DISCOVERY_REQUIRED",
      });
      continue;
    }

    const queryPlan = buildPublicKnrQueryPlan({
      rawCode: miss.displayCode,
      evidenceKeyV1: ek,
      description: input.lineDescriptionByEvidenceKey?.[ek] ?? null,
    });

    const selected = publicRegistryFallback
      ? selectPublicKnrDiscoverySources({
          miss,
          queries: queryPlan.queries,
          sourceIdsOverride: input.sourceIdsOverride,
          keyMapOverride: input.keyMapOverride,
          familyMapOverride: input.familyMapOverride,
          registryOverride: input.registryOverride,
        })
      : {
          ...selectKnrDiscoverySourceIds({
            evidenceKeyV1: ek,
            normalizedKey: miss.normalizedKey ?? ek,
            family: miss.family,
            sourceIdsOverride: input.sourceIdsOverride,
            keyMapOverride: input.keyMapOverride,
            familyMapOverride: input.familyMapOverride,
          }),
          selectionReason: undefined as string | undefined,
        };

    if (!selected.sourceIds.length) {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "NO_SOURCE_SELECTION",
        httpRequestCount: 0,
        sourceIds: [],
        fact: null,
        stagedPending: false,
        lookupAfter: "DISCOVERY_REQUIRED",
      });
      continue;
    }

    // L3: sourceId → allowlist document URL only (no rawUrl · no portal crawl)
    const docs = resolveKnrDiscoveryL3DocumentsForSources(
      selected.sourceIds,
      effectiveAllowlist,
    );
    if (!docs.ok) {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED",
        httpRequestCount: 0,
        sourceIds: selected.sourceIds,
        fact: null,
        stagedPending: false,
        lookupAfter: "DISCOVERY_REQUIRED",
      });
      continue;
    }

    const resolvedSourceIds = docs.documents.map((d) => d.sourceId);

    if (!input.ignoreProcessBudget && attemptedEvidenceKeys.has(ek)) {
      perKey.push({
        evidenceKeyV1: ek,
        reason: "BUDGET_EXHAUSTED",
        httpRequestCount: 0,
        sourceIds: resolvedSourceIds,
        fact: null,
        stagedPending: false,
        lookupAfter: "DISCOVERY_REQUIRED",
      });
      continue;
    }

    attemptedEvidenceKeys.add(ek);

    const orchInput: OrchestrateKnrDiscoveryP2cInput = {
      evidenceKeyV1: ek,
      family: miss.family,
      sourceIds: resolvedSourceIds,
      claimantId,
      leaseStore,
      nowIso: input.nowIso,
      nowMs: input.nowMs,
      featureEnabled: true,
      allowlistOverride: effectiveAllowlist,
      discoveryStore,
      identityKeyV2: miss.identityKeyV2,
      displayCode: miss.displayCode ?? ek,
      httpMode: input.httpMode ?? "p2b",
      fakeExecForSource: input.fakeExecForSource,
    };

    const orch = await orchestrateKnrDiscoveryP2c(orchInput);
    if (orch.discoveryStore) discoveryStore = orch.discoveryStore;
    httpRequestCount += orch.httpRequestCount;

    let fact: KnrDiscoveryFactCandidate | null = null;
    let stagedPending = false;

    const evidence =
      lookupKnrDiscoveryEvidence(
        { evidenceKeyV1: ek, identityKeyV2: miss.identityKeyV2 },
        discoveryStore,
      )
      ?? discoveryStore.entries[ek]
      ?? null;

    if (evidence) {
      fact = extractKnrDiscoveryFactCandidate(evidence, ek);
      if (stagePending && fact.extractionStatus === "FULL") {
        const staged = stageDiscoveryFactToPendingCatalog({
          fact,
          identityKeyV2: miss.identityKeyV2,
          evidenceKeyV1: ek,
          identity: miss.identity ?? { family: miss.family as "KNR", catalog: "" },
          displayCode: miss.displayCode ?? ek,
          nowIso: input.nowIso,
          catalogStore,
          sourceIdentifier: fact.sourceId,
        });
        if (staged.ok) {
          catalogStore = staged.store;
          stagedPending = staged.outcome === "STAGED_PENDING";
        }
      }
    }

    const after = lookupKnrKnowledgeWithDiscoveryEvidence({
      request: {
        identityKeyV2: miss.identityKeyV2,
        evidenceKeyV1: ek,
      },
      catalogStore,
      discoveryStore,
    });

    let lookupAfter: KnrOnDemandKeyOutcome["lookupAfter"] = after.outcome;
    if (
      catalogStore.entries[miss.identityKeyV2]?.verificationStatus === "PENDING_VERIFY"
      && after.outcome !== "CATALOG_HIT"
    ) {
      lookupAfter = "PENDING_IN_CATALOG";
    }

    perKey.push({
      evidenceKeyV1: ek,
      reason: "ORCH_DONE",
      httpRequestCount: orch.httpRequestCount,
      sourceIds: selected.sourceIds,
      fact,
      stagedPending,
      lookupAfter,
    });
  }

  return {
    httpRequestCount,
    discoveryStore,
    catalogStore,
    perKey,
    dedupedMissCount: unique.length,
    skippedDuplicateInputCount,
    authorityWrites,
  };
}

export const KNR_DISCOVERY_ON_DEMAND_P2_IMPLEMENTED = true as const;

/** Global IK — PublicKnrSourceRegistry wired into on-demand MISS path. */
export const KNR_DISCOVERY_PUBLIC_REGISTRY_FALLBACK_WIRED = true as const;
