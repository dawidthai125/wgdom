/**
 * Public KNR Discovery Engine — BY_KEY preferred · registry fallback · multi-source validate.
 *
 * Extends runKnrDiscoveryOnDemand — does not replace it.
 * SEARCH LOCAL FIRST (catalog HIT → HTTP=0).
 */

import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import type { KnrDiscoveryAllowlistEntry } from "./knr-knowledge/knr-discovery-allowlist";
import {
  emptyKnrCatalogStore,
  type KnrCatalogStore,
} from "./knr-knowledge/knr-catalog-store";
import { lookupKnrCatalog } from "./knr-knowledge/knr-catalog-lookup";
import {
  emptyKnrDiscoveryEvidenceStore,
  type KnrDiscoveryEvidenceStore,
} from "./knr-knowledge/knr-discovery-evidence-store";
import { lookupKnrKnowledgeWithDiscoveryEvidence } from "./knr-knowledge/knr-discovery-evidence-lookup";
import {
  runKnrDiscoveryOnDemand,
  type KnrOnDemandMissKey,
  clearKnrDiscoveryOnDemandBudgetForTests,
} from "./knr-knowledge/knr-discovery-on-demand";
import { stageDiscoveryFactToPendingCatalog } from "./knr-knowledge/knr-discovery-catalog-stage";
import type { KnrDiscoveryFactCandidate } from "./knr-knowledge/knr-discovery-fact-extract";
import type { KnrDiscoveryHttpExecuteResult } from "./knr-knowledge/knr-discovery-http-types";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "./knr-knowledge/knr-identity-v2";
import { buildPublicKnrQueryPlan } from "./ik-public-knr-query";
import {
  buildPublicKnrEffectiveAllowlist,
  selectPublicKnrDiscoverySources,
  type PublicKnrRegistryEntry,
} from "./ik-public-knr-source-registry";
import {
  runPublicKnrScraperChainSync,
  createPublicDocumentTextAdapter,
  type PublicKnrSourceAdapter,
} from "./ik-public-knr-scraper";
import { validateMultiSourcePublicKnr } from "./ik-public-knr-validation";
import type {
  PublicKnrDiscoveryTrace,
  PublicKnrRecord,
  PublicKnrRejectReason,
  PublicKnrReanalysisTarget,
} from "./ik-public-knr-types";
import type { IkPublicKnrResearchCodeInput } from "./ik-public-knr-research-engine";

export { clearKnrDiscoveryOnDemandBudgetForTests };

export const PUBLIC_KNR_DISCOVERY_BUDGET = Object.freeze({
  maxQueries: 10,
  maxSources: 10,
  maxPages: 20,
  maxPdfBytes: 12 * 1024 * 1024,
  timeoutMs: 30_000,
});

export type RunPublicKnrDiscoveryOpts = {
  codes: readonly IkPublicKnrResearchCodeInput[];
  nowIso?: string;
  nowMs?: number;
  featureEnabled?: boolean;
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
  keyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  familyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  sourceIdsOverride?: readonly string[] | null;
  discoveryStore?: KnrDiscoveryEvidenceStore;
  catalogStore?: KnrCatalogStore;
  fakeExecForSource?: (
    sourceId: string,
  ) => KnrDiscoveryHttpExecuteResult | Promise<KnrDiscoveryHttpExecuteResult>;
  scraperAdapters?: readonly PublicKnrSourceAdapter[] | null;
  scraperUrlsByEvidenceKey?: Readonly<Record<string, readonly string[]>> | null;
  stagePendingOnFullFact?: boolean;
  ignoreProcessBudget?: boolean;
  /** Optional reanalysis scope from tender BOQ line. */
  reanalysisContext?: Readonly<
    Partial<Pick<PublicKnrReanalysisTarget, "tenderId" | "dwellingId" | "lineId">>
  >;
};

function missFromCodeInput(code: IkPublicKnrResearchCodeInput): KnrOnDemandMissKey | null {
  const basis =
    (code.rawCode ? buildCatalogBasisFromRawCode(code.rawCode) : null)
    ?? (code.description
      ? buildCatalogBasisFromRawCode(
          (code.description.match(
            /\b((?:KNR-W|KNR|KNNR)\s+\d{1,4}(?:-\d{1,2})?\s+\d{3,4}-\d{2})\b/i,
          ) ?? [])[1] ?? "",
        )
      : null);
  if (!basis?.normalizedKey && !basis?.tableCode) return null;
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 = String(basis.normalizedKey ?? "").trim();
  if (!evidenceKeyV1 || !identityKeyV2) return null;
  return {
    evidenceKeyV1,
    identityKeyV2,
    family: String(partial.family ?? "KNR"),
    displayCode: String(basis.rawCode ?? evidenceKeyV1),
    normalizedKey: evidenceKeyV1,
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      column: partial.column,
      item: partial.item,
    },
  };
}

function stageFromPublicRecord(opts: {
  record: PublicKnrRecord;
  miss: KnrOnDemandMissKey;
  catalogStore: KnrCatalogStore;
  nowIso: string;
}): { store: KnrCatalogStore; inserted: boolean; duplicate: boolean } {
  const fact: KnrDiscoveryFactCandidate = {
    knrCode: opts.miss.displayCode ?? opts.miss.evidenceKeyV1,
    normalizedKnrCode: opts.miss.evidenceKeyV1,
    description: opts.record.description,
    unit: opts.record.unit,
    sourceId: opts.record.sourceId,
    sourceUrlHash: opts.record.sourceHash,
    evidenceRef: opts.record.sourceHash,
    confidence: "medium",
    extractionStatus:
      opts.record.description && opts.record.unit ? "FULL" : "PARTIAL_DISCOVERY",
  };
  const staged = stageDiscoveryFactToPendingCatalog({
    fact,
    identityKeyV2: opts.miss.identityKeyV2,
    evidenceKeyV1: opts.miss.evidenceKeyV1,
    identity: opts.miss.identity ?? { family: opts.miss.family as "KNR", catalog: "" },
    displayCode: opts.miss.displayCode ?? opts.miss.evidenceKeyV1,
    nowIso: opts.nowIso,
    catalogStore: opts.catalogStore,
    sourceIdentifier: opts.record.sourceId,
  });
  if (!staged.ok) {
    return { store: opts.catalogStore, inserted: false, duplicate: false };
  }
  if (staged.outcome === "NOOP_EXISTING") {
    return { store: staged.store, inserted: false, duplicate: true };
  }
  if (staged.outcome === "STAGED_PENDING") {
    return { store: staged.store, inserted: true, duplicate: false };
  }
  return { store: staged.store, inserted: false, duplicate: false };
}

/**
 * Discovery for one code — returns full trace + updated stores.
 */
export async function runPublicKnrDiscoveryForCode(opts: {
  code: IkPublicKnrResearchCodeInput;
  nowIso: string;
  nowMs?: number;
  featureEnabled?: boolean;
  effectiveAllowlist: readonly KnrDiscoveryAllowlistEntry[];
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
  keyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  familyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  sourceIdsOverride?: readonly string[] | null;
  discoveryStore: KnrDiscoveryEvidenceStore;
  catalogStore: KnrCatalogStore;
  fakeExecForSource?: RunPublicKnrDiscoveryOpts["fakeExecForSource"];
  scraperAdapters?: readonly PublicKnrSourceAdapter[] | null;
  scraperUrlsByEvidenceKey?: Readonly<Record<string, readonly string[]>> | null;
  stagePendingOnFullFact?: boolean;
  ignoreProcessBudget?: boolean;
  reanalysisContext?: RunPublicKnrDiscoveryOpts["reanalysisContext"];
}): Promise<{
  trace: PublicKnrDiscoveryTrace;
  discoveryStore: KnrDiscoveryEvidenceStore;
  catalogStore: KnrCatalogStore;
  httpRequestCount: number;
  catalogInserted: boolean;
  reanalysisTarget?: PublicKnrReanalysisTarget;
}> {
  const queryPlan = buildPublicKnrQueryPlan({
    rawCode: opts.code.rawCode,
    description: opts.code.description,
  });
  const miss = missFromCodeInput(opts.code);
  const emptyTrace = (overrides: Partial<PublicKnrDiscoveryTrace>): PublicKnrDiscoveryTrace => ({
    requestedCode: queryPlan.displayCode,
    normalizedCode: queryPlan.evidenceKeyV1,
    queries: queryPlan.queries.slice(0, PUBLIC_KNR_DISCOVERY_BUDGET.maxQueries),
    sourcesTried: [],
    sourcesAccepted: [],
    sourcesRejected: [],
    evidence: [],
    extractedRecords: [],
    catalogAction: "NONE",
    verificationStatus: "UNCHANGED",
    confidence: "NONE",
    bomStatus: "BOM_NOT_AVAILABLE",
    discoveryStatus: "NO_PUBLIC_EVIDENCE",
    reanalysisRequired: false,
    httpRequestCount: 0,
    invent: false,
    ...overrides,
  });

  if (!miss) {
    return {
      trace: emptyTrace({ evidence: ["INVALID_OR_INCOMPLETE_CODE"] }),
      discoveryStore: opts.discoveryStore,
      catalogStore: opts.catalogStore,
      httpRequestCount: 0,
      catalogInserted: false,
    };
  }

  // L0 — catalog HIT → HTTP=0
  const local = lookupKnrCatalog(
    { identityKeyV2: miss.identityKeyV2, evidenceKeyV1: miss.evidenceKeyV1 },
    opts.catalogStore,
  );
  if (local.status === "LOCAL_HIT") {
    const entry = local.entry;
    const bomComplete =
      (entry.norms?.materialNorms?.length ?? 0) > 0
      && entry.norms.materialNorms.every(
        (m) =>
          String(m.code ?? "").trim()
          && Number.isFinite(m.quantity)
          && String(m.unit ?? "").trim(),
      );
    return {
      trace: emptyTrace({
        requestedCode: miss.displayCode ?? queryPlan.displayCode,
        normalizedCode: miss.evidenceKeyV1,
        catalogAction: "SKIP_LOCAL_HIT",
        verificationStatus: "ALREADY_VERIFIED",
        bomStatus: bomComplete ? "BOM_COMPLETE" : "BOM_NOT_COMPLETE",
        discoveryStatus: "SKIP_CATALOG_HIT",
        confidence: "HIGH",
        evidence: ["L0_CATALOG_HIT_HTTP_0"],
      }),
      discoveryStore: opts.discoveryStore,
      catalogStore: opts.catalogStore,
      httpRequestCount: 0,
      catalogInserted: false,
    };
  }

  const pending =
    opts.catalogStore.entries[miss.identityKeyV2]?.verificationStatus === "PENDING_VERIFY";
  const prior = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: {
      identityKeyV2: miss.identityKeyV2,
      evidenceKeyV1: miss.evidenceKeyV1,
    },
    catalogStore: opts.catalogStore,
    discoveryStore: opts.discoveryStore,
  });
  if (pending || prior.outcome === "EVIDENCE_HIT") {
    return {
      trace: emptyTrace({
        requestedCode: miss.displayCode ?? queryPlan.displayCode,
        normalizedCode: miss.evidenceKeyV1,
        catalogAction: "SKIP_DUPLICATE",
        verificationStatus: "PENDING_VERIFY",
        bomStatus: "BOM_NOT_COMPLETE",
        discoveryStatus: "KNR_FOUND",
        confidence: "MEDIUM",
        evidence: ["ALREADY_PENDING_OR_EVIDENCE_HTTP_0"],
      }),
      discoveryStore: opts.discoveryStore,
      catalogStore: opts.catalogStore,
      httpRequestCount: 0,
      catalogInserted: false,
    };
  }

  const selection = selectPublicKnrDiscoverySources({
    miss,
    queries: queryPlan.queries,
    maxSources: PUBLIC_KNR_DISCOVERY_BUDGET.maxSources,
    sourceIdsOverride: opts.sourceIdsOverride,
    keyMapOverride: opts.keyMapOverride,
    familyMapOverride: opts.familyMapOverride,
    registryOverride: opts.registryOverride,
  });

  let catalogStore = opts.catalogStore;
  let discoveryStore = opts.discoveryStore;
  let httpRequestCount = 0;
  const extractedRecords: PublicKnrRecord[] = [];
  const sourcesTried: PublicKnrDiscoveryTrace["sourcesTried"] = [];
  const sourcesAccepted: PublicKnrDiscoveryTrace["sourcesAccepted"] = [];
  const sourcesRejected: PublicKnrDiscoveryTrace["sourcesRejected"] = [];

  // Optional sync scraper path (fixtures / injected fetch)
  const urls =
    opts.scraperUrlsByEvidenceKey?.[miss.evidenceKeyV1]
    ?? opts.scraperUrlsByEvidenceKey?.[miss.normalizedKey ?? ""]
    ?? [];
  if (opts.scraperAdapters?.length && urls.length) {
    const chain = runPublicKnrScraperChainSync({
      adapters: opts.scraperAdapters,
      urls,
      expectedCode: miss.displayCode ?? miss.evidenceKeyV1,
      maxSources: PUBLIC_KNR_DISCOVERY_BUDGET.maxSources,
    });
    for (const r of chain.records) extractedRecords.push(r);
  }

  // HTTP discovery via on-demand + effective allowlist (BY_KEY or registry)
  if (selection.sourceIds.length && opts.featureEnabled !== false) {
    const od = await runKnrDiscoveryOnDemand({
      missing: [miss],
      nowIso: opts.nowIso,
      nowMs: opts.nowMs,
      featureEnabled: true,
      allowlistOverride: opts.effectiveAllowlist,
      sourceIdsOverride: selection.sourceIds,
      keyMapOverride: opts.keyMapOverride,
      discoveryStore,
      catalogStore,
      fakeExecForSource: opts.fakeExecForSource,
      stagePendingOnFullFact: opts.stagePendingOnFullFact !== false,
      ignoreProcessBudget: opts.ignoreProcessBudget,
    });
    discoveryStore = od.discoveryStore;
    catalogStore = od.catalogStore;
    httpRequestCount += od.httpRequestCount;

    const keyOut = od.perKey[0];
    for (const sid of selection.sourceIds) {
      sourcesTried.push({
        sourceUrl: sid,
        sourceKind: "OTHER_PUBLIC",
        retrievedAt: opts.nowIso,
        accessible: keyOut?.fact != null,
        paywall: false,
      });
    }
    if (keyOut?.fact?.description && keyOut.fact.unit) {
      sourcesAccepted.push({
        sourceUrl: keyOut.fact.sourceId ?? selection.sourceIds[0] ?? "",
        sourceKind: "PUBLIC_TENDER",
        retrievedAt: opts.nowIso,
        accessible: true,
        paywall: false,
      });
      extractedRecords.push({
        family: miss.family as PublicKnrRecord["family"],
        chapter: null,
        catalogId: miss.identity?.catalog ?? null,
        positionCode: miss.identity?.table && miss.identity?.item
          ? `${miss.identity.table}-${miss.identity.item}`
          : miss.evidenceKeyV1,
        description: keyOut.fact.description,
        unit: keyOut.fact.unit,
        materials: null,
        sourceUrl: keyOut.fact.sourceId ?? "",
        sourceHash: keyOut.fact.sourceUrlHash ?? "",
        sourceKind: "PUBLIC_TENDER",
        sourceTier: "PUBLIC_TENDER_OFFICIAL",
        sourceId: keyOut.fact.sourceId ?? "on_demand",
        retrievedAt: opts.nowIso,
        bomComplete: false,
      });
    } else if (keyOut?.reason === "NO_SOURCE_SELECTION") {
      sourcesRejected.push({
        sourceUrl: "",
        sourceKind: "OTHER_PUBLIC",
        retrievedAt: opts.nowIso,
        accessible: false,
        paywall: false,
        reason: "NO_KNR_MATCH" as PublicKnrRejectReason,
      });
    }
  } else if (!selection.sourceIds.length) {
    sourcesRejected.push({
      sourceUrl: "",
      sourceKind: "OTHER_PUBLIC",
      retrievedAt: opts.nowIso,
      accessible: false,
      paywall: false,
      reason: "NOT_ALLOWLISTED",
    });
  }

  const validation = validateMultiSourcePublicKnr({
    records: extractedRecords,
    miss,
    descriptionHint: opts.code.description,
  });

  let catalogInserted = false;
  let catalogAction: PublicKnrDiscoveryTrace["catalogAction"] = "NONE";
  let verificationStatus: PublicKnrDiscoveryTrace["verificationStatus"] = "UNCHANGED";

  if (validation.validated.length) {
    const best = validation.validated[0]!;
    const alreadyPending =
      catalogStore.entries[miss.identityKeyV2]?.verificationStatus === "PENDING_VERIFY";
    if (!alreadyPending) {
      const st = stageFromPublicRecord({
        record: best.record,
        miss,
        catalogStore,
        nowIso: opts.nowIso,
      });
      catalogStore = st.store;
      catalogInserted = st.inserted;
      if (st.inserted) {
        catalogAction = "STAGED_PENDING";
        verificationStatus = "PENDING_VERIFY";
      } else if (st.duplicate) {
        catalogAction = "SKIP_DUPLICATE";
        verificationStatus = "PENDING_VERIFY";
      }
    } else {
      catalogAction = "SKIP_DUPLICATE";
      verificationStatus = "PENDING_VERIFY";
    }
  }

  const reanalysisRequired = catalogInserted;
  const reanalysisTarget: PublicKnrReanalysisTarget | undefined = reanalysisRequired
    ? {
        tenderId: opts.reanalysisContext?.tenderId,
        dwellingId: opts.reanalysisContext?.dwellingId,
        lineId: opts.reanalysisContext?.lineId,
        knrCode: miss.displayCode ?? miss.evidenceKeyV1,
        evidenceKeyV1: miss.evidenceKeyV1,
        identityKeyV2: miss.identityKeyV2,
      }
    : undefined;

  const trace: PublicKnrDiscoveryTrace = {
    requestedCode: miss.displayCode ?? queryPlan.displayCode,
    normalizedCode: miss.evidenceKeyV1,
    queries: queryPlan.queries.slice(0, PUBLIC_KNR_DISCOVERY_BUDGET.maxQueries),
    sourcesTried,
    sourcesAccepted,
    sourcesRejected,
    evidence: validation.validated.flatMap((v) => v.evidenceUrls),
    extractedRecords: validation.validated.map((v) => v.record),
    catalogAction,
    verificationStatus,
    confidence: validation.confidence,
    bomStatus: validation.validated[0]?.bomStatus ?? "BOM_NOT_AVAILABLE",
    discoveryStatus: catalogInserted ? "KNR_STAGED" : validation.discoveryStatus,
    reanalysisRequired,
    selectionReason: selection.selectionReason,
    httpRequestCount,
    invent: false,
  };

  return {
    trace,
    discoveryStore,
    catalogStore,
    httpRequestCount,
    catalogInserted,
    reanalysisTarget,
  };
}

/**
 * Batch public KNR discovery for multiple codes (tender-wide learning loop).
 */
export async function runPublicKnrDiscovery(
  opts: RunPublicKnrDiscoveryOpts,
): Promise<{
  traces: PublicKnrDiscoveryTrace[];
  discoveryStore: KnrDiscoveryEvidenceStore;
  catalogStore: KnrCatalogStore;
  httpRequestCount: number;
  catalogInsertedTotal: number;
  reanalyzeRequired: boolean;
  reanalysisTargets: PublicKnrReanalysisTarget[];
}> {
  const nowIso = opts.nowIso ?? new Date().toISOString();
  let discoveryStore =
    opts.discoveryStore ?? emptyKnrDiscoveryEvidenceStore(nowIso);
  let catalogStore = opts.catalogStore ?? emptyKnrCatalogStore(nowIso);
  const effectiveAllowlist = buildPublicKnrEffectiveAllowlist({
    baseAllowlist: opts.allowlistOverride,
    registryOverride: opts.registryOverride,
  });

  const traces: PublicKnrDiscoveryTrace[] = [];
  const reanalysisTargets: PublicKnrReanalysisTarget[] = [];
  let httpRequestCount = 0;
  let catalogInsertedTotal = 0;

  for (const code of opts.codes) {
    const result = await runPublicKnrDiscoveryForCode({
      code,
      nowIso,
      nowMs: opts.nowMs,
      featureEnabled: opts.featureEnabled,
      effectiveAllowlist,
      registryOverride: opts.registryOverride,
      keyMapOverride: opts.keyMapOverride,
      familyMapOverride: opts.familyMapOverride,
      sourceIdsOverride: opts.sourceIdsOverride,
      discoveryStore,
      catalogStore,
      fakeExecForSource: opts.fakeExecForSource,
      scraperAdapters: opts.scraperAdapters,
      scraperUrlsByEvidenceKey: opts.scraperUrlsByEvidenceKey,
      stagePendingOnFullFact: opts.stagePendingOnFullFact,
      ignoreProcessBudget: opts.ignoreProcessBudget,
      reanalysisContext: opts.reanalysisContext,
    });
    discoveryStore = result.discoveryStore;
    catalogStore = result.catalogStore;
    httpRequestCount += result.httpRequestCount;
    if (result.catalogInserted) catalogInsertedTotal += 1;
    traces.push(result.trace);
    if (result.reanalysisTarget) reanalysisTargets.push(result.reanalysisTarget);
  }

  return {
    traces,
    discoveryStore,
    catalogStore,
    httpRequestCount,
    catalogInsertedTotal,
    reanalyzeRequired: catalogInsertedTotal > 0,
    reanalysisTargets,
  };
}

/** Default document adapter for registry-backed fetch (requires fetchImpl in tests). */
export function createRegistryPublicDocumentAdapter(
  sourceId: string,
  sourceKind: PublicKnrRecord["sourceKind"],
): PublicKnrSourceAdapter {
  return createPublicDocumentTextAdapter({
    sourceId,
    sourceKind,
    sourceTier: "PUBLIC_TENDER_OFFICIAL",
  });
}

export const PUBLIC_KNR_DISCOVERY_ENGINE_IMPLEMENTED = true as const;
