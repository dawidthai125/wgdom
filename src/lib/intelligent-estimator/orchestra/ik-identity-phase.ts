/**
 * W2 — PHASE 3 Identity pipeline (pure · no LS write).
 * Document structural + Slice D → Mapper + F5 resolve → postIdentityExpert + persist plan.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type {
  IkDocumentExpertReport,
  IkMasterBoqLineRef,
} from "@/lib/intelligent-estimator/ik-document-expert";
import { isCenyMaterialow01Enabled } from "@/lib/ceny-materialow-01-flag";
import {
  OFFER_BOQ_SCHEMA_VERSION,
  type OfferBoqConfidence,
  type OfferBoqDocument,
  type OfferBoqLine,
  type OfferBoqMatchCandidate,
} from "@/lib/tender-offer-boq";
import {
  mapOfferBoqLine,
  type OfferBoqMappingContext,
} from "@/lib/tender-offer-boq-mapping";
import { resolveWorkIdentityFromOfferBoqLine } from "@/lib/tender-position-cost/boq-shadow-adapter";
import {
  hasProvisionalSeamRationale,
  isIkProvisionalEstimationEnabled,
  resolveProvisionalMapperLinePatch,
} from "@/lib/intelligent-estimator/ik-provisional-estimation";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { computeOfferBoqIdentityPayloadHash } from "./ik-identity-persist-glue";

/** OD-05 minimal seam — no-op when caller omits or passes empty array. */
export type OwnerManualIdentityOverride = {
  dwellingId: string;
  lineId: string;
  catalogWorkId: string;
  matchMethod: "manual";
  matchConfidence?: OfferBoqConfidence;
  candidateMatches?: OfferBoqMatchCandidate[];
};

export type IkIdentityLineResult = {
  dwellingId: string;
  lineId: string;
  mappedLine: OfferBoqLine;
  f5Status: string;
  workId: string | null;
  matchMethod: OfferBoqLine["matchMethod"] | null;
};

export type IkIdentityPersistPlan = {
  dwellingId: string;
  identityHash: string;
  offerBoq: OfferBoqDocument;
};

export type IkIdentityContext = {
  status: "ready" | "blocked" | "partial";
  lineCount: number;
  trustedOkCount: number;
  provisionalBindingCount: number;
  ambiguousCount: number;
  noIdentityCount: number;
  persistPlans: IkIdentityPersistPlan[];
  reasons: string[];
};

export type IkIdentityPhaseInput = {
  structuralReport: IkDocumentExpertReport;
  sliceDExpert: IkDocumentExpertReport;
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  manualOverrides?: readonly OwnerManualIdentityOverride[] | null;
  works?: readonly CatalogWork[];
  nowMs?: number;
};

export type IkIdentityPhaseResult = {
  postIdentityExpert: IkDocumentExpertReport;
  context: IkIdentityContext;
};

function emptyTotals(lineCount: number): OfferBoqDocument["totals"] {
  return {
    materialsPln: null,
    laborPln: null,
    equipmentPln: null,
    directPln: null,
    kpPln: null,
    overheadPln: null,
    costPricePln: null,
    marginPln: null,
    recommendedBidPln: null,
    profitPln: null,
    profitabilityPct: null,
    estimatedDurationDays: null,
    workingCapitalPln: null,
    lineCount,
    pricedLineCount: 0,
  };
}

function applyManualOverride(
  line: OfferBoqLine,
  ref: IkMasterBoqLineRef,
  overrides: readonly OwnerManualIdentityOverride[] | null | undefined,
): OfferBoqLine {
  if (!overrides?.length) return line;
  const ov = overrides.find(
    (o) =>
      o.dwellingId === ref.dwellingId
      && o.lineId === ref.line.lineId,
  );
  if (!ov) return line;
  return {
    ...line,
    catalogWorkId: ov.catalogWorkId,
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: ov.matchConfidence ?? "high",
    candidateMatches: ov.candidateMatches ?? [],
  };
}

function buildPersistOfferBoq(opts: {
  tenderId: string;
  dwellingId: string;
  lines: OfferBoqLine[];
  existing: OfferBoqDocument | null;
  mappedAt: string;
}): OfferBoqDocument {
  const existing = opts.existing;
  return {
    schemaVersion: existing?.schemaVersion ?? OFFER_BOQ_SCHEMA_VERSION,
    tenderId: opts.tenderId,
    version: existing?.version ?? 1,
    builtAt: existing?.builtAt ?? opts.mappedAt,
    parserSnapshotRef: existing?.parserSnapshotRef ?? {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: opts.lines.length,
      pdfPrzedmiarCase: null,
    },
    lines: opts.lines,
    totals: existing?.totals ?? emptyTotals(opts.lines.length),
    recomputeToken: existing?.recomputeToken ?? `ik-w2-${opts.dwellingId}`,
    buildStatus: "mapped",
    mappingStats: existing?.mappingStats ?? null,
    mappingAppliedAt: opts.mappedAt,
    costIntelligenceStats: existing?.costIntelligenceStats ?? null,
    costIntelligenceAppliedAt: existing?.costIntelligenceAppliedAt ?? null,
    pricingStats: existing?.pricingStats ?? null,
    pricingAppliedAt: existing?.pricingAppliedAt ?? null,
    userEditStats: existing?.userEditStats ?? null,
    warnings: existing?.warnings ?? [],
  };
}

function resolveExistingDwellingOfferBoq(
  pkg: TenderPackage | null | undefined,
  dwellingId: string,
): OfferBoqDocument | null {
  if (!pkg) return null;
  const unit = pkg.dwellings.find((d) => d.dwellingId === dwellingId);
  return unit?.offerBoq ?? null;
}

/**
 * Pure PHASE 3 — builds postIdentityExpert and persist plans (no attach / no LS write).
 */
export function runIkIdentityPhase(input: IkIdentityPhaseInput): IkIdentityPhaseResult {
  const structural = input.structuralReport;
  const tenderId = input.item.id || input.item.tenderId || structural.tenderId || "";

  if (!structural.masterBoq.readyForExperts) {
    return {
      postIdentityExpert: structural,
      context: {
        status: "blocked",
        lineCount: structural.masterBoq.lineCount,
        trustedOkCount: 0,
        provisionalBindingCount: 0,
        ambiguousCount: 0,
        noIdentityCount: 0,
        persistPlans: [],
        reasons: ["MASTER_BOQ_NOT_READY"],
      },
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const mappedAt = new Date(nowMs).toISOString();
  const store = loadWorkCatalogStoreLocal();
  const works =
    input.works ?? listActiveWorksForRegion(store, store.activeRegion);
  const mapCtx: OfferBoqMappingContext = {
    works,
    mappedAt,
    documentContext: input.item.title ?? null,
    cenyMaterialowUplift: isCenyMaterialow01Enabled(),
  };

  const sliceRefs = input.sliceDExpert.masterBoqLines ?? [];
  const lineResults: IkIdentityLineResult[] = [];
  const resolvedRefs: IkMasterBoqLineRef[] = [];

  let trustedOkCount = 0;
  let provisionalBindingCount = 0;
  let ambiguousCount = 0;
  let noIdentityCount = 0;

  for (const ref of sliceRefs) {
    const mapped = mapOfferBoqLine(ref.line, mapCtx);
    const withManual = applyManualOverride(mapped, ref, input.manualOverrides);
    let identity = resolveWorkIdentityFromOfferBoqLine(withManual);
    let lineForOut = withManual;
    let hadProvisionalPatch = false;

    if (isIkProvisionalEstimationEnabled()) {
      for (let pass = 0; pass < 3; pass += 1) {
        const patch = resolveProvisionalMapperLinePatch(lineForOut, identity, works);
        if (!patch) break;
        lineForOut = { ...lineForOut, ...patch };
        hadProvisionalPatch = true;
        identity = resolveWorkIdentityFromOfferBoqLine(lineForOut);
      }
    }

    if (hadProvisionalPatch || hasProvisionalSeamRationale(lineForOut.aiRationale ?? [])) {
      provisionalBindingCount += 1;
    }

    if (identity.status === "OK" && identity.workId && !hadProvisionalPatch) {
      trustedOkCount += 1;
    } else if (identity.status === "AMBIGUOUS") {
      ambiguousCount += 1;
    } else if (identity.status === "NO_IDENTITY" || !identity.workId) {
      noIdentityCount += 1;
    }

    const outLine: OfferBoqLine = {
      ...lineForOut,
      catalogWorkId: identity.workId ?? lineForOut.catalogWorkId ?? null,
    };

    resolvedRefs.push({
      dwellingId: ref.dwellingId,
      line: outLine,
      provenance: ref.provenance,
    });

    lineResults.push({
      dwellingId: ref.dwellingId,
      lineId: ref.line.lineId,
      mappedLine: outLine,
      f5Status: identity.status,
      workId: identity.workId,
      matchMethod: outLine.matchMethod ?? null,
    });
  }

  const byDwelling = new Map<string, OfferBoqLine[]>();
  for (const r of resolvedRefs) {
    const list = byDwelling.get(r.dwellingId) ?? [];
    list.push(r.line);
    byDwelling.set(r.dwellingId, list);
  }

  const persistPlans: IkIdentityPersistPlan[] = [];
  for (const [dwellingId, lines] of byDwelling.entries()) {
    const identityHash = computeOfferBoqIdentityPayloadHash(lines);
    const existing = resolveExistingDwellingOfferBoq(input.package ?? null, dwellingId);
    persistPlans.push({
      dwellingId,
      identityHash,
      offerBoq: buildPersistOfferBoq({
        tenderId,
        dwellingId,
        lines,
        existing,
        mappedAt,
      }),
    });
  }

  const postIdentityExpert: IkDocumentExpertReport = {
    ...structural,
    masterBoqLines: resolvedRefs,
  };

  return {
    postIdentityExpert,
    context: {
      status: "ready",
      lineCount: resolvedRefs.length,
      trustedOkCount,
      provisionalBindingCount,
      ambiguousCount,
      noIdentityCount,
      persistPlans,
      reasons: [],
    },
  };
}
