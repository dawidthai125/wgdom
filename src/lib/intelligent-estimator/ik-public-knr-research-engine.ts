/**
 * IK Public KNR Research Engine
 *
 * L0 local catalog (HTTP=0)
 * → L1 public discovery (reuse runKnrDiscoveryOnDemand / allowlist)
 * → optional scraper adapters (fixture / injected)
 * → validate → stage PENDING_VERIFY (alias VERIFIED_PUBLIC)
 * → reanalyzeRequired
 *
 * NEVER auto VERIFIED · NEVER invent BOM · NEVER TechPack/P7/G3
 */

import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "./knr-knowledge/knr-identity-v2";
import {
  emptyKnrCatalogStore,
  type KnrCatalogStore,
} from "./knr-knowledge/knr-catalog-store";
import { lookupKnrCatalog } from "./knr-knowledge/knr-catalog-lookup";
import {
  emptyKnrDiscoveryEvidenceStore,
  type KnrDiscoveryEvidenceStore,
} from "./knr-knowledge/knr-discovery-evidence-store";
import { stageDiscoveryFactToPendingCatalog } from "./knr-knowledge/knr-discovery-catalog-stage";
import { createKnrCatalogEntrySkeleton } from "./knr-knowledge/knr-catalog-entry-types";
import { buildKnrNormContentHash } from "./knr-knowledge/knr-content-hash";
import { normalizeKnrCatalogStore, rebuildKnrAliasIndex } from "./knr-knowledge/knr-catalog-store";
import type { KnrDiscoveryAllowlistEntry } from "./knr-knowledge/knr-discovery-allowlist";
import type { KnrDiscoveryHttpExecuteResult } from "./knr-knowledge/knr-discovery-http-types";
import { buildPublicKnrQueryPlan } from "./ik-public-knr-query";
import {
  runPublicKnrScraperChainSync,
  type PublicKnrSourceAdapter,
} from "./ik-public-knr-scraper";
import {
  runPublicKnrDiscovery,
} from "./ik-public-knr-discovery-engine";
import type { KnrOnDemandMissKey } from "./knr-knowledge/knr-discovery-on-demand";
import { clearKnrDiscoveryOnDemandBudgetForTests } from "./ik-public-knr-discovery-engine";
import type {
  IkPublicKnrCodeResult,
  IkPublicKnrResearchResult,
  IkPublicKnrResearchTelemetry,
  PublicKnrDiscoveryTrace,
  PublicKnrRecord,
  PublicKnrReanalysisTarget,
} from "./ik-public-knr-types";
import {
  IK_PUBLIC_KNR_RESEARCH_RESOLVER_ID,
  IK_PUBLIC_KNR_RESEARCH_SCHEMA_VERSION,
} from "./ik-public-knr-types";
import type { KnrDiscoveryFactCandidate } from "./knr-knowledge/knr-discovery-fact-extract";

export { clearKnrDiscoveryOnDemandBudgetForTests };

export type IkPublicKnrResearchCodeInput = {
  rawCode?: string | null;
  description?: string | null;
  /** When true — KNR may be found but workId stays unresolved. */
  identityRequired?: boolean;
};

export type RunIkPublicKnrResearchOpts = {
  codes: readonly IkPublicKnrResearchCodeInput[];
  nowIso?: string;
  nowMs?: number;
  featureEnabled?: boolean;
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  keyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  sourceIdsOverride?: readonly string[] | null;
  discoveryStore?: KnrDiscoveryEvidenceStore;
  catalogStore?: KnrCatalogStore;
  fakeExecForSource?: (
    sourceId: string,
  ) => KnrDiscoveryHttpExecuteResult | Promise<KnrDiscoveryHttpExecuteResult>;
  /** Optional scraper adapters + candidate URLs (tests / injected discovery). */
  scraperAdapters?: readonly PublicKnrSourceAdapter[] | null;
  scraperUrlsByEvidenceKey?: Readonly<Record<string, readonly string[]>> | null;
  stagePendingOnFullFact?: boolean;
  ignoreProcessBudget?: boolean;
  /** Per-line reanalysis scope (tender BOQ). */
  reanalysisContext?: Readonly<
    Partial<Pick<PublicKnrReanalysisTarget, "tenderId" | "dwellingId" | "lineId">>
  >;
};

function missFromRaw(code: IkPublicKnrResearchCodeInput): KnrOnDemandMissKey | null {
  const basis =
    (code.rawCode ? buildCatalogBasisFromRawCode(code.rawCode) : null)
    ?? (code.description
      ? buildCatalogBasisFromRawCode(
          // try first KNR-like token from description
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
 * Async public KNR research — production path via PublicKnrDiscoveryEngine.
 * BY_KEY preferred · registry fallback · never auto VERIFIED.
 */
export async function runIkPublicKnrResearch(
  opts: RunIkPublicKnrResearchOpts,
): Promise<IkPublicKnrResearchResult> {
  const discovery = await runPublicKnrDiscovery({
    codes: opts.codes,
    nowIso: opts.nowIso,
    nowMs: opts.nowMs,
    featureEnabled: opts.featureEnabled,
    allowlistOverride: opts.allowlistOverride,
    keyMapOverride: opts.keyMapOverride,
    sourceIdsOverride: opts.sourceIdsOverride,
    discoveryStore: opts.discoveryStore,
    catalogStore: opts.catalogStore,
    fakeExecForSource: opts.fakeExecForSource,
    scraperAdapters: opts.scraperAdapters,
    scraperUrlsByEvidenceKey: opts.scraperUrlsByEvidenceKey,
    stagePendingOnFullFact: opts.stagePendingOnFullFact,
    ignoreProcessBudget: opts.ignoreProcessBudget,
    reanalysisContext: opts.reanalysisContext,
  });

  const perCode: IkPublicKnrCodeResult[] = [];
  let bomTotal = 0;

  for (let i = 0; i < opts.codes.length; i++) {
    const code = opts.codes[i]!;
    const trace = discovery.traces[i]!;
    const identityRequired = code.identityRequired === true;
    const miss = missFromRaw(code);
    const queryPlan = buildPublicKnrQueryPlan({
      rawCode: code.rawCode,
      description: code.description,
    });

    const knrEvidenceFound =
      trace.discoveryStatus === "KNR_FOUND"
      || trace.discoveryStatus === "KNR_VERIFIED_BY_MULTI_SOURCE"
      || trace.discoveryStatus === "KNR_STAGED"
      || trace.discoveryStatus === "SKIP_CATALOG_HIT"
      || trace.catalogAction === "SKIP_DUPLICATE"
      || trace.catalogAction === "STAGED_PENDING";

    const bomComplete = trace.bomStatus === "BOM_COMPLETE";
    if (bomComplete) bomTotal += 1;

    let catalogLifecycle: IkPublicKnrCodeResult["catalogLifecycle"] = "UNCHANGED";
    if (trace.catalogAction === "STAGED_PENDING") catalogLifecycle = "PENDING_VERIFY";
    else if (trace.verificationStatus === "ALREADY_VERIFIED") catalogLifecycle = "ALREADY_VERIFIED";
    else if (trace.catalogAction === "SKIP_DUPLICATE") catalogLifecycle = "ALREADY_PENDING";

    const holdReasons: string[] = [];
    if (trace.discoveryStatus === "NO_PUBLIC_EVIDENCE") {
      holdReasons.push("NO_PUBLIC_EVIDENCE");
    }
    if (trace.discoveryStatus === "CROSS_FAMILY_REJECT") {
      holdReasons.push("CROSS_FAMILY_REJECT");
    }
    if (knrEvidenceFound && !bomComplete) {
      holdReasons.push("BOM_NOT_COMPLETE");
    }
    if (identityRequired) holdReasons.push("IDENTITY_REQUIRED");

    let nextAction: IkPublicKnrResearchTelemetry["nextAction"] = "NO_PUBLIC_EVIDENCE";
    if (trace.discoveryStatus === "SKIP_CATALOG_HIT") {
      nextAction = bomComplete
        ? "CONTINUE_ANALYSIS_WITH_VERIFIED_KNR"
        : "CONTINUE_WITH_PENDING_KNR_BOM_HOLD";
    } else if (knrEvidenceFound && identityRequired) {
      nextAction = "IDENTITY_REQUIRED";
    } else if (knrEvidenceFound && bomComplete) {
      nextAction = "CONTINUE_ANALYSIS_WITH_VERIFIED_KNR";
    } else if (knrEvidenceFound) {
      nextAction = "CONTINUE_WITH_PENDING_KNR_BOM_HOLD";
    } else if (trace.selectionReason === "EMPTY" && !trace.sourcesTried.length) {
      nextAction = "FEATURE_OR_ALLOWLIST_OFF";
    }

    const telemetry: IkPublicKnrResearchTelemetry = {
      evidenceKeyV1: miss?.evidenceKeyV1 ?? queryPlan.evidenceKeyV1,
      displayCode: miss?.displayCode ?? queryPlan.displayCode,
      catalogBefore:
        trace.discoveryStatus === "SKIP_CATALOG_HIT"
          ? "HIT"
          : trace.catalogAction === "SKIP_DUPLICATE"
            ? "PENDING"
            : "MISS",
      queries: trace.queries,
      sourcesTried: trace.sourcesTried.length,
      sourcesAccepted: trace.sourcesAccepted.length,
      sourcesRejected: trace.sourcesRejected.length,
      rejectReasons: trace.sourcesRejected.map((s) => s.reason),
      recordsExtracted: trace.extractedRecords.length,
      recordsValidated: trace.extractedRecords.filter((r) => r.description && r.unit).length,
      catalogInserted: trace.catalogAction === "STAGED_PENDING" ? 1 : 0,
      catalogSkippedDuplicate: trace.catalogAction === "SKIP_DUPLICATE" ? 1 : 0,
      bomCandidates: bomComplete ? 1 : 0,
      httpRequestCount: trace.httpRequestCount,
      holdReasons,
      nextAction,
    };

    perCode.push({
      evidenceKeyV1: miss?.evidenceKeyV1 ?? queryPlan.evidenceKeyV1,
      identityKeyV2: miss?.identityKeyV2 ?? "",
      displayCode: miss?.displayCode ?? queryPlan.displayCode,
      catalogLifecycle,
      knrEvidenceFound,
      bomComplete,
      identityRequired,
      telemetry,
      messagePl: knrEvidenceFound
        ? bomComplete
          ? "Public KNR + BOM candidate (hard qty)."
          : `KNR RESEARCH OK · ${trace.discoveryStatus} · BOM=${trace.bomStatus} · next=${nextAction}`
        : `NO_PUBLIC_EVIDENCE · ${trace.discoveryStatus} · selection=${trace.selectionReason ?? "?"}`,
    });
  }

  return {
    schemaVersion: IK_PUBLIC_KNR_RESEARCH_SCHEMA_VERSION,
    resolverId: IK_PUBLIC_KNR_RESEARCH_RESOLVER_ID,
    perCode,
    httpRequestCount: discovery.httpRequestCount,
    catalogInsertedTotal: discovery.catalogInsertedTotal,
    catalogSkippedDuplicateTotal: perCode.reduce(
      (n, p) => n + p.telemetry.catalogSkippedDuplicate,
      0,
    ),
    bomCandidatesTotal: bomTotal,
    reanalyzeRequired: discovery.reanalyzeRequired,
    reanalysisTargets: discovery.reanalysisTargets,
    traces: discovery.traces,
    authorityWrites: {
      catalogVerified: false,
      technologyPackActive: false,
      priceMemoryAccept: false,
      p7Persist: false,
      g3: false,
      invent: false,
    },
    discoveryStore: discovery.discoveryStore,
    catalogStore: discovery.catalogStore,
  };
}

/**
 * Sync research for Auto Gap / tests — scraper adapters only (no async HTTP orch).
 * Still stages PENDING_VERIFY into provided catalog store.
 */
export function runIkPublicKnrResearchSync(opts: {
  codes: readonly IkPublicKnrResearchCodeInput[];
  nowIso?: string;
  catalogStore?: KnrCatalogStore;
  scraperAdapters: readonly PublicKnrSourceAdapter[];
  scraperUrlsByEvidenceKey: Readonly<Record<string, readonly string[]>>;
}): IkPublicKnrResearchResult {
  const nowIso = opts.nowIso ?? new Date().toISOString();
  let catalogStore = opts.catalogStore ?? emptyKnrCatalogStore(nowIso);
  const discoveryStore = emptyKnrDiscoveryEvidenceStore(nowIso);
  const perCode: IkPublicKnrCodeResult[] = [];
  let insertedTotal = 0;
  let dupTotal = 0;
  let bomTotal = 0;

  for (const code of opts.codes) {
    const queryPlan = buildPublicKnrQueryPlan({
      rawCode: code.rawCode,
      description: code.description,
    });
    const miss = missFromRaw(code);
    const identityRequired = code.identityRequired === true;
    if (!miss) {
      perCode.push({
        evidenceKeyV1: queryPlan.evidenceKeyV1,
        identityKeyV2: "",
        displayCode: queryPlan.displayCode,
        catalogLifecycle: "UNCHANGED",
        knrEvidenceFound: false,
        bomComplete: false,
        identityRequired,
        telemetry: {
          evidenceKeyV1: queryPlan.evidenceKeyV1,
          displayCode: queryPlan.displayCode,
          catalogBefore: "MISS",
          queries: queryPlan.queries,
          sourcesTried: 0,
          sourcesAccepted: 0,
          sourcesRejected: 0,
          rejectReasons: [],
          recordsExtracted: 0,
          recordsValidated: 0,
          catalogInserted: 0,
          catalogSkippedDuplicate: 0,
          bomCandidates: 0,
          httpRequestCount: 0,
          holdReasons: ["INVALID_OR_INCOMPLETE_CODE"],
          nextAction: "NO_PUBLIC_EVIDENCE",
        },
        messagePl: "Niepełny kod.",
      });
      continue;
    }

    const local = lookupKnrCatalog(
      { identityKeyV2: miss.identityKeyV2, evidenceKeyV1: miss.evidenceKeyV1 },
      catalogStore,
    );
    if (local.status === "LOCAL_HIT") {
      perCode.push({
        evidenceKeyV1: miss.evidenceKeyV1,
        identityKeyV2: miss.identityKeyV2,
        displayCode: miss.displayCode ?? miss.evidenceKeyV1,
        catalogLifecycle: "ALREADY_VERIFIED",
        knrEvidenceFound: true,
        bomComplete: false,
        identityRequired,
        telemetry: {
          evidenceKeyV1: miss.evidenceKeyV1,
          displayCode: miss.displayCode ?? miss.evidenceKeyV1,
          catalogBefore: "HIT",
          queries: queryPlan.queries,
          sourcesTried: 0,
          sourcesAccepted: 0,
          sourcesRejected: 0,
          rejectReasons: [],
          recordsExtracted: 0,
          recordsValidated: 0,
          catalogInserted: 0,
          catalogSkippedDuplicate: 0,
          bomCandidates: 0,
          httpRequestCount: 0,
          holdReasons: [],
          nextAction: "SKIP_LOCAL_HIT",
        },
        messagePl: "L0 HIT — HTTP=0",
      });
      continue;
    }

    if (catalogStore.entries[miss.identityKeyV2]?.verificationStatus === "PENDING_VERIFY") {
      dupTotal += 1;
      perCode.push({
        evidenceKeyV1: miss.evidenceKeyV1,
        identityKeyV2: miss.identityKeyV2,
        displayCode: miss.displayCode ?? miss.evidenceKeyV1,
        catalogLifecycle: "ALREADY_PENDING",
        knrEvidenceFound: true,
        bomComplete: false,
        identityRequired,
        telemetry: {
          evidenceKeyV1: miss.evidenceKeyV1,
          displayCode: miss.displayCode ?? miss.evidenceKeyV1,
          catalogBefore: "PENDING",
          queries: queryPlan.queries,
          sourcesTried: 0,
          sourcesAccepted: 0,
          sourcesRejected: 0,
          rejectReasons: ["DUPLICATE_EVIDENCE"],
          recordsExtracted: 0,
          recordsValidated: 0,
          catalogInserted: 0,
          catalogSkippedDuplicate: 1,
          bomCandidates: 0,
          httpRequestCount: 0,
          holdReasons: ["BOM_NOT_COMPLETE"],
          nextAction: identityRequired
            ? "IDENTITY_REQUIRED"
            : "CONTINUE_WITH_PENDING_KNR_BOM_HOLD",
        },
        messagePl: "Duplicate canonical skipped.",
      });
      continue;
    }

    const urls =
      opts.scraperUrlsByEvidenceKey[miss.evidenceKeyV1]
      ?? opts.scraperUrlsByEvidenceKey[miss.normalizedKey ?? ""]
      ?? [];
    const chain = runPublicKnrScraperChainSync({
      adapters: opts.scraperAdapters,
      urls,
      expectedCode: miss.displayCode ?? miss.evidenceKeyV1,
    });

    let catalogInserted = 0;
    let catalogSkippedDuplicate = 0;
    let bomComplete = false;
    for (const rec of chain.records) {
      if (!rec.description || !rec.unit) continue;
      const st = stageFromPublicRecord({
        record: rec,
        miss,
        catalogStore,
        nowIso,
      });
      catalogStore = st.store;
      if (st.inserted) {
        catalogInserted += 1;
        insertedTotal += 1;
      }
      if (st.duplicate) {
        catalogSkippedDuplicate += 1;
        dupTotal += 1;
      }
      if (rec.bomComplete) {
        bomComplete = true;
        bomTotal += 1;
      }
    }

    const knrEvidenceFound = catalogInserted > 0 || catalogSkippedDuplicate > 0;
    perCode.push({
      evidenceKeyV1: miss.evidenceKeyV1,
      identityKeyV2: miss.identityKeyV2,
      displayCode: miss.displayCode ?? miss.evidenceKeyV1,
      catalogLifecycle: catalogInserted > 0 ? "PENDING_VERIFY" : "UNCHANGED",
      knrEvidenceFound,
      bomComplete,
      identityRequired,
      telemetry: {
        evidenceKeyV1: miss.evidenceKeyV1,
        displayCode: miss.displayCode ?? miss.evidenceKeyV1,
        catalogBefore: "MISS",
        queries: queryPlan.queries,
        sourcesTried: chain.sourcesTried,
        sourcesAccepted: chain.sourcesAccepted,
        sourcesRejected: chain.sourcesRejected,
        rejectReasons: chain.rejectReasons,
        recordsExtracted: chain.records.length,
        recordsValidated: catalogInserted + catalogSkippedDuplicate,
        catalogInserted,
        catalogSkippedDuplicate,
        bomCandidates: bomComplete ? 1 : 0,
        httpRequestCount: 0,
        holdReasons: knrEvidenceFound
          ? bomComplete
            ? []
            : ["PUBLIC_SOURCE_HAS_NO_MATERIAL_QTY", "BOM_NOT_COMPLETE"]
          : ["NO_PUBLIC_EVIDENCE"],
        nextAction: !knrEvidenceFound
          ? "NO_PUBLIC_EVIDENCE"
          : identityRequired
            ? "IDENTITY_REQUIRED"
            : bomComplete
              ? "CONTINUE_ANALYSIS_WITH_VERIFIED_KNR"
              : "CONTINUE_WITH_PENDING_KNR_BOM_HOLD",
      },
      messagePl: knrEvidenceFound
        ? `KNR staged PENDING_VERIFY · BOM=${bomComplete ? "COMPLETE" : "HOLD"}`
        : "NO_PUBLIC_EVIDENCE",
    });
  }

  return {
    schemaVersion: IK_PUBLIC_KNR_RESEARCH_SCHEMA_VERSION,
    resolverId: IK_PUBLIC_KNR_RESEARCH_RESOLVER_ID,
    perCode,
    httpRequestCount: 0,
    catalogInsertedTotal: insertedTotal,
    catalogSkippedDuplicateTotal: dupTotal,
    bomCandidatesTotal: bomTotal,
    reanalyzeRequired: insertedTotal > 0,
    authorityWrites: {
      catalogVerified: false,
      technologyPackActive: false,
      priceMemoryAccept: false,
      p7Persist: false,
      g3: false,
      invent: false,
    },
    discoveryStore,
    catalogStore,
  };
}

/** Seed a VERIFIED-like local hit for tests (direct store write — tests only). */
export function seedPendingKnrCatalogForTests(opts: {
  rawCode: string;
  description: string;
  unit: string;
  nowIso: string;
  catalogStore?: KnrCatalogStore;
}): KnrCatalogStore {
  const basis = buildCatalogBasisFromRawCode(opts.rawCode);
  if (!basis) return opts.catalogStore ?? emptyKnrCatalogStore(opts.nowIso);
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 = String(basis.normalizedKey ?? "").trim();
  const store = opts.catalogStore ?? emptyKnrCatalogStore(opts.nowIso);
  const skeleton = createKnrCatalogEntrySkeleton(
    {
      identityKeyV2,
      evidenceKeyV1,
      identity: {
        family: partial.family,
        catalog: partial.catalog,
        table: partial.table,
      },
      originalSourceCode: opts.rawCode,
      displayCode: opts.rawCode,
    },
    opts.nowIso,
  );
  const norms = {
    laborNorms: [] as never[],
    materialNorms: [] as never[],
    equipmentNorms: [] as never[],
  };
  const contentHash = buildKnrNormContentHash(norms);
  const entry = {
    ...skeleton,
    description: opts.description,
    unit: opts.unit,
    norms,
    contentHash,
    verificationStatus: "PENDING_VERIFY" as const,
    validationState: "INCOMPLETE" as const,
    lifecycleState: "ACTIVE" as const,
    emptyNormsWithEvidence: true,
    verifiedAt: null,
    verifiedBy: null,
  };
  const entries = { ...store.entries, [identityKeyV2]: entry };
  return normalizeKnrCatalogStore(
    {
      ...store,
      entries,
      aliasIndex: rebuildKnrAliasIndex(entries),
      updatedAt: opts.nowIso,
    },
    opts.nowIso,
  );
}
