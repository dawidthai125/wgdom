/**
 * IK-MIGRATION-01 P5.5 — Real Identity Coverage (Work + Material).
 * P5.6 — Wave 2 seed audit attached (`wave2SeedAudit`, seedCreated always 0).
 *
 * AUDIT / DIAGNOSTIC only:
 *   Master BOQ line
 *   → mapOfferBoqLine (Product Mapper · Quotes gate unchanged)
 *   → resolveWorkIdentityFromOfferBoqLine
 *   → resolveCatalogCoverageAlias (diagnostic · requireQuotes false/true)
 *   → resolveDemandProductIdentityExact
 *   → resolveLaborIdentityMapping (Owner exact registry · research-oriented)
 *
 * ZERO invent from namePl · ZERO fuzzy auto-trust · ZERO pricing · ZERO research · ZERO Accept.
 * Does NOT mutate Master BOQ · Does NOT change mapOfferBoqLine Quotes gate.
 * Does NOT write Work Catalog (Wave 2 seed = existing OPS / prod KV only).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import {
  mapOfferBoqLine,
  type OfferBoqMappingContext,
} from "@/lib/tender-offer-boq-mapping";
import {
  resolveWorkIdentityFromOfferBoqLine,
  type ShadowWorkIdentityResolve,
} from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { isCenyMaterialow01Enabled } from "@/lib/ceny-materialow-01-flag";
import { resolveDemandProductIdentityExact } from "@/lib/pricing-expert/material-market-map";
import { resolveCatalogCoverageAlias } from "@/lib/catalog-coverage/alias-resolver";
import { normalizeOfferBoqDescription } from "@/lib/catalog-coverage/normalize-description";
import { CATALOG_WAVE2_PRODUCT_ID_SET } from "@/lib/catalog-coverage/alias-pack-wave2";
import {
  resolveLaborIdentityMapping,
  type LaborIdentityResolveResult,
} from "@/lib/work-catalog/work-rate-identity-mapping";
import { classifyEstimatorPricingPlane } from "./classification-gate";
import type {
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";
import {
  runIkDocumentExpert,
  type IkDocumentExpertReport,
} from "./ik-document-expert";
import type { DwellingLineProvenance } from "@/lib/multi-boq/types";

/** Exclusive primary status — every Master BOQ line has exactly one. */
export type IkIdentityCoverageStatus =
  | "NON_COST"
  | "TRUSTED_WORK"
  | "TRUSTED_MATERIAL"
  | "TRUSTED_BOTH"
  | "APPROVED_ALIAS"
  | "OWNER_MAPPING_POSSIBLE"
  | "AMBIGUOUS"
  | "IDENTITY_GAP";

export type IkIdentityCoverageLineResult = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  unit: string;
  branch: string | null;
  sourceDocumentId: string | null;
  sourceLineKey: string | null;
  lineProvenance: DwellingLineProvenance | null;
  plane: EstimatorPricingPlane;
  classify: EstimatorClassifyResult;
  workIdentity: ShadowWorkIdentityResolve;
  /** Product Mapper bind (Quotes gate) — may be null even when pack matched. */
  mapperCatalogWorkId: string | null;
  mapperMatchMethod: string | null;
  trustedWorkIdentity: boolean;
  trustedMaterialIdentity: boolean;
  materialKey: string | null;
  materialCatalogWorkId: string | null;
  materialVia: "materialKey" | "alias" | "catalogWorkId" | null;
  /** Catalog Coverage Alias Pack — Owner-approved text rules. */
  approvedAliasHit: boolean;
  aliasRuleId: string | null;
  aliasPackProductId: string | null;
  aliasResolvedWithQuotes: string | null;
  aliasMissingWork: boolean;
  aliasMissingQuotes: boolean;
  /** WR labor identity registry (exact_normalized) — usually research-source oriented. */
  laborIdentityRegistry: LaborIdentityResolveResult["status"] | null;
  laborIdentityWorkId: string | null;
  ownerMappingPossible: boolean;
  status: IkIdentityCoverageStatus;
  reasonPl: string;
  mappingSource: string | null;
};

export type IkIdentityCoverageCounts = {
  inputLineCount: number;
  outputLineCount: number;
  nonCost: number;
  trustedWorkIdentity: number;
  trustedMaterialIdentity: number;
  approvedAlias: number;
  ownerMappingPossible: number;
  ambiguous: number;
  identityGap: number;
  unresolved: number;
  /** Exclusive primary status buckets — must sum to outputLineCount. */
  byStatus: Record<IkIdentityCoverageStatus, number>;
};

/**
 * P5.6 — Wave 2 seed audit (read-only). Never invents Work Catalog entries.
 * `seedCreated` is always 0 in coverage (writes only via existing OPS allowlist).
 */
export type IkWave2SeedAudit = {
  seedEligibleMissingWork: number;
  seedCreated: 0;
  alreadyPresentProductIds: string[];
  invalidUnitAliasHits: number;
  wave2IdsPresentInCatalog: number;
  wave2IdsExpected: number;
  source: "existing_work_catalog" | "catalog_empty_or_partial";
  duplicateWorkIds: string[];
};

export type IkIdentityCoverageReport = {
  tenderId: string;
  status: "ready" | "blocked" | "partial";
  counts: IkIdentityCoverageCounts;
  reconciliation: {
    ok: boolean;
    unexplainedLoss: number;
    unexplainedDuplication: number;
    reasons: string[];
  };
  dwellingPreservation: boolean;
  branchPreservation: boolean;
  provenancePreservation: boolean;
  pricingExecuted: false;
  researchExecuted: false;
  autoAcceptExecuted: false;
  identityInvention: false;
  lines: IkIdentityCoverageLineResult[];
  /** Top unresolved examples for Owner (description + reason). */
  unresolvedExamples: Array<{
    lineId: string;
    dwellingId: string;
    description: string;
    reasonPl: string;
  }>;
  reasons: string[];
  /** P5.6 Wave 2 seed audit — no fake works. */
  wave2SeedAudit: IkWave2SeedAudit;
};

function emptyByStatus(): Record<IkIdentityCoverageStatus, number> {
  return {
    NON_COST: 0,
    TRUSTED_WORK: 0,
    TRUSTED_MATERIAL: 0,
    TRUSTED_BOTH: 0,
    APPROVED_ALIAS: 0,
    OWNER_MAPPING_POSSIBLE: 0,
    AMBIGUOUS: 0,
    IDENTITY_GAP: 0,
  };
}

function emptyCounts(input: number): IkIdentityCoverageCounts {
  return {
    inputLineCount: input,
    outputLineCount: 0,
    nonCost: 0,
    trustedWorkIdentity: 0,
    trustedMaterialIdentity: 0,
    approvedAlias: 0,
    ownerMappingPossible: 0,
    ambiguous: 0,
    identityGap: 0,
    unresolved: 0,
    byStatus: emptyByStatus(),
  };
}

function emptyWave2SeedAudit(): IkWave2SeedAudit {
  return {
    seedEligibleMissingWork: 0,
    seedCreated: 0,
    alreadyPresentProductIds: [],
    invalidUnitAliasHits: 0,
    wave2IdsPresentInCatalog: 0,
    wave2IdsExpected: CATALOG_WAVE2_PRODUCT_ID_SET.size,
    source: "catalog_empty_or_partial",
    duplicateWorkIds: [],
  };
}

function buildWave2SeedAudit(
  works: CatalogWork[],
  lines: IkIdentityCoverageLineResult[],
): IkWave2SeedAudit {
  const seen = new Set<string>();
  const duplicateWorkIds: string[] = [];
  for (const w of works) {
    if (seen.has(w.id)) duplicateWorkIds.push(w.id);
    else seen.add(w.id);
  }
  const wave2Present = [...CATALOG_WAVE2_PRODUCT_ID_SET].filter((id) =>
    works.some((w) => w.id === id && w.active !== false),
  );
  const alreadyPresent = new Set<string>();
  let seedEligibleMissingWork = 0;
  let invalidUnitAliasHits = 0;
  for (const row of lines) {
    if (!row.approvedAliasHit || !row.aliasPackProductId) continue;
    const pid = row.aliasPackProductId;
    if (row.aliasMissingWork) {
      if (CATALOG_WAVE2_PRODUCT_ID_SET.has(pid)) seedEligibleMissingWork += 1;
    } else {
      alreadyPresent.add(pid);
    }
    if (
      row.workIdentity.status === "INVALID_UNIT"
      && row.mapperCatalogWorkId
      && !row.trustedWorkIdentity
    ) {
      invalidUnitAliasHits += 1;
    }
  }
  return {
    seedEligibleMissingWork,
    seedCreated: 0,
    alreadyPresentProductIds: [...alreadyPresent].sort(),
    invalidUnitAliasHits,
    wave2IdsPresentInCatalog: wave2Present.length,
    wave2IdsExpected: CATALOG_WAVE2_PRODUCT_ID_SET.size,
    source:
      wave2Present.length === CATALOG_WAVE2_PRODUCT_ID_SET.size
        ? "existing_work_catalog"
        : "catalog_empty_or_partial",
    duplicateWorkIds,
  };
}

function isNonCost(work: ShadowWorkIdentityResolve): boolean {
  return (
    work.status === "NOISE_SKIP"
    || work.status === "EQUIPMENT_GAP"
    || work.status === "AUXILIARY_GAP"
    || work.status === "TRANSPORT_GAP"
  );
}

function isTrustedWork(work: ShadowWorkIdentityResolve): boolean {
  return work.status === "OK" && Boolean(work.workId);
}

/**
 * Exclusive primary status (priority order).
 * Metrics (trustedWorkIdentity etc.) are counted independently.
 */
function primaryStatus(opts: {
  nonCost: boolean;
  trustedWork: boolean;
  trustedMaterial: boolean;
  ambiguous: boolean;
  approvedAliasHit: boolean;
  ownerMappingPossible: boolean;
}): IkIdentityCoverageStatus {
  if (opts.nonCost) return "NON_COST";
  if (opts.trustedWork && opts.trustedMaterial) return "TRUSTED_BOTH";
  if (opts.trustedWork) return "TRUSTED_WORK";
  if (opts.trustedMaterial) return "TRUSTED_MATERIAL";
  if (opts.ambiguous) return "AMBIGUOUS";
  // Alias pack hit but Quotes/work blocked bind → Owner can seed quotes / confirm.
  if (opts.ownerMappingPossible) return "OWNER_MAPPING_POSSIBLE";
  if (opts.approvedAliasHit) return "APPROVED_ALIAS";
  return "IDENTITY_GAP";
}

/**
 * Identity coverage pass over READY Master BOQ.
 * Read-only · no P4/P5 research · no pricing · no Accept.
 */
export function runIkMasterBoqIdentityCoverage(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  expert?: IkDocumentExpertReport | null;
  store?: WorkCatalogStore;
  works?: CatalogWork[];
  nowMs?: number;
}): IkIdentityCoverageReport {
  const item = opts.item;
  const tenderId = item.id || item.tenderId || "";
  const expert =
    opts.expert
    ?? runIkDocumentExpert({ item, package: opts.package ?? null });
  const nowMs = opts.nowMs ?? Date.now();
  const pricingExecuted = false as const;
  const researchExecuted = false as const;
  const autoAcceptExecuted = false as const;
  const identityInvention = false as const;
  const reasons: string[] = [];

  if (!expert.masterBoq.readyForExperts) {
    return {
      tenderId,
      status: "blocked",
      counts: emptyCounts(expert.masterBoq.lineCount),
      reconciliation: {
        ok: false,
        unexplainedLoss: expert.masterBoq.lineCount,
        unexplainedDuplication: 0,
        reasons: ["MASTER_BOQ_NOT_READY"],
      },
      dwellingPreservation: false,
      branchPreservation: false,
      provenancePreservation: false,
      pricingExecuted,
      researchExecuted,
      autoAcceptExecuted,
      identityInvention,
      lines: [],
      unresolvedExamples: [],
      reasons: ["MASTER_BOQ_NOT_READY", ...expert.reasons.slice(0, 4)],
      wave2SeedAudit: emptyWave2SeedAudit(),
    };
  }

  const store = opts.store ?? loadWorkCatalogStoreLocal();
  const works =
    opts.works ?? listActiveWorksForRegion(store, store.activeRegion);
  const mapCtx: OfferBoqMappingContext = {
    works,
    mappedAt: new Date(nowMs).toISOString(),
    documentContext: item.title ?? null,
    cenyMaterialowUplift: isCenyMaterialow01Enabled(),
  };
  const knownWorkIds = new Set(works.map((w) => w.id));

  const inputRefs = expert.masterBoqLines;
  const inputLineCount = expert.masterBoq.lineCount;
  if (inputRefs.length !== inputLineCount) {
    reasons.push(
      `MASTER_LINES_COUNT_MISMATCH lineCount=${inputLineCount} refs=${inputRefs.length}`,
    );
  }

  const lines: IkIdentityCoverageLineResult[] = [];

  for (const ref of inputRefs) {
    const structural: OfferBoqLine = ref.line;
    const mapped = mapOfferBoqLine(structural, mapCtx);
    const workIdentity = resolveWorkIdentityFromOfferBoqLine(mapped);
    const workId = workIdentity.workId;
    const classify = classifyEstimatorPricingPlane({
      workId,
      materialKey: null,
      namePl: structural.description,
      unit: structural.unit,
      lineKindHint: mapped.workCategory,
    });
    const branch =
      (ref.provenance?.branchHint && ref.provenance.branchHint !== "unknown"
        ? ref.provenance.branchHint
        : null)
      ?? (structural.workCategory ? String(structural.workCategory) : null);

    const norm = normalizeOfferBoqDescription(structural.description);
    const normalizedText = norm.normalizedDescription || structural.description;

    // Diagnostic: Pack match WITHOUT changing Quotes gate on Mapper.
    const aliasDiag = resolveCatalogCoverageAlias({
      description: normalizedText,
      isNoise: Boolean(mapped.isNoise),
      works,
      requireQuotes: false,
    });
    const aliasWithQuotes = resolveCatalogCoverageAlias({
      description: normalizedText,
      isNoise: Boolean(mapped.isNoise),
      works,
      requireQuotes: true,
    });

    const materialExact = resolveDemandProductIdentityExact({
      catalogWorkId: workId ?? mapped.catalogWorkId ?? null,
      namePl: structural.description,
      unit: structural.unit,
    });

    const laborReg = resolveLaborIdentityMapping({
      observedName: structural.description,
      observedUnit: structural.unit,
      sourceId: "*",
      laborOnly: true,
      includesMaterial: false,
      knownWorkIds,
    });

    const trustedWork = isTrustedWork(workIdentity);
    const trustedMaterial = Boolean(materialExact);
    const nonCost = isNonCost(workIdentity);
    const ambiguous = workIdentity.status === "AMBIGUOUS";
    const approvedAliasHit = aliasDiag.matched === true && Boolean(aliasDiag.aliasRuleId);
    // Owner can act when Pack hit but Mapper cannot bind (missing work / quotes).
    const ownerMappingPossible =
      approvedAliasHit
      && (aliasDiag.missingWork || aliasDiag.missingQuotes)
      && !trustedWork
      && !trustedMaterial
      && !nonCost;

    const status = primaryStatus({
      nonCost,
      trustedWork,
      trustedMaterial,
      ambiguous,
      approvedAliasHit,
      ownerMappingPossible,
    });

    let reasonPl: string;
    let mappingSource: string | null = null;
    switch (status) {
      case "NON_COST":
        reasonPl = `Pozycja non-cost (${workIdentity.status}).`;
        mappingSource = workIdentity.matchMethod;
        break;
      case "TRUSTED_BOTH":
        reasonPl = `Trusted Work (${workIdentity.matchMethod}) + Material (${materialExact!.via}).`;
        mappingSource = `${workIdentity.matchMethod}+material_${materialExact!.via}`;
        break;
      case "TRUSTED_WORK":
        reasonPl = `Trusted Work Identity via Product Mapper (${workIdentity.matchMethod}).`;
        mappingSource = workIdentity.matchMethod;
        break;
      case "TRUSTED_MATERIAL":
        reasonPl = `Trusted Material Identity via exact map (${materialExact!.via}).`;
        mappingSource = `material_${materialExact!.via}`;
        break;
      case "AMBIGUOUS":
        reasonPl = "Ambiguous work candidates — bez silent pick.";
        mappingSource = workIdentity.matchMethod;
        break;
      case "OWNER_MAPPING_POSSIBLE":
        reasonPl = aliasDiag.missingWork
          ? `Approved Alias Pack trafił (${aliasDiag.aliasRuleId}) → ${aliasDiag.packProductId}, ale brak aktywnego work w katalogu.`
          : `Approved Alias Pack trafił (${aliasDiag.aliasRuleId}) → ${aliasDiag.packProductId}, ale Quotes gate blokuje bind (brak useful Quotes).`;
        mappingSource = aliasDiag.aliasRuleId;
        break;
      case "APPROVED_ALIAS":
        reasonPl = `Approved Alias Pack trafił (${aliasDiag.aliasRuleId}) — identity nie zbindowana przez Mapper.`;
        mappingSource = aliasDiag.aliasRuleId;
        break;
      default:
        reasonPl =
          "Brak trusted Work/Material identity · brak Approved Alias Pack · namePl ≠ identity.";
        mappingSource = null;
    }

    lines.push({
      tenderId,
      dwellingId: ref.dwellingId,
      lineId: structural.lineId,
      lp: structural.lp,
      description: structural.description,
      quantity: structural.quantity,
      unit: structural.unit,
      branch,
      sourceDocumentId: ref.provenance?.sourceDocumentId ?? null,
      sourceLineKey: ref.provenance?.sourceLineKey ?? null,
      lineProvenance: ref.provenance,
      plane: classify.plane,
      classify,
      workIdentity,
      mapperCatalogWorkId: mapped.catalogWorkId ?? null,
      mapperMatchMethod: mapped.matchMethod ?? null,
      trustedWorkIdentity: trustedWork,
      trustedMaterialIdentity: trustedMaterial,
      materialKey: materialExact?.materialKey ?? null,
      materialCatalogWorkId: materialExact?.catalogWorkId ?? null,
      materialVia: materialExact?.via ?? null,
      approvedAliasHit,
      aliasRuleId: aliasDiag.aliasRuleId,
      aliasPackProductId: aliasDiag.packProductId,
      aliasResolvedWithQuotes: aliasWithQuotes.resolvedProductId,
      aliasMissingWork: aliasDiag.missingWork,
      aliasMissingQuotes: aliasDiag.missingQuotes,
      laborIdentityRegistry: laborReg.status,
      laborIdentityWorkId: laborReg.status === "HIT" ? laborReg.workId : null,
      ownerMappingPossible,
      status,
      reasonPl,
      mappingSource,
    });
  }

  const counts = emptyCounts(inputLineCount);
  counts.outputLineCount = lines.length;
  for (const row of lines) {
    counts.byStatus[row.status] += 1;
    if (row.status === "NON_COST") counts.nonCost += 1;
    if (row.trustedWorkIdentity) counts.trustedWorkIdentity += 1;
    if (row.trustedMaterialIdentity) counts.trustedMaterialIdentity += 1;
    if (row.approvedAliasHit) counts.approvedAlias += 1;
    if (row.ownerMappingPossible) counts.ownerMappingPossible += 1;
    if (row.status === "AMBIGUOUS") counts.ambiguous += 1;
    if (row.status === "IDENTITY_GAP") counts.identityGap += 1;
    if (
      !row.trustedWorkIdentity
      && !row.trustedMaterialIdentity
      && row.status !== "NON_COST"
    ) {
      counts.unresolved += 1;
    }
  }

  const statusSum = Object.values(counts.byStatus).reduce((a, b) => a + b, 0);
  const unexplainedLoss = Math.max(0, inputLineCount - counts.outputLineCount);
  const excess = Math.max(0, counts.outputLineCount - inputLineCount);
  const seen = new Set<string>();
  let unexplainedDuplication = 0;
  for (const row of lines) {
    const k = `${row.dwellingId}|${row.lineId}`;
    if (seen.has(k)) unexplainedDuplication += 1;
    else seen.add(k);
  }
  const reconciliationOk =
    unexplainedLoss === 0
    && unexplainedDuplication === 0
    && excess === 0
    && statusSum === counts.outputLineCount
    && counts.outputLineCount === inputLineCount
    && inputRefs.length === inputLineCount;

  if (!reconciliationOk) {
    reasons.push(
      `RECONCILIATION_FAIL in=${inputLineCount} out=${counts.outputLineCount} statusSum=${statusSum}`,
    );
  }

  let dwellingPreservation = true;
  let branchPreservation = true;
  let provenancePreservation = true;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i]!;
    const src = inputRefs[i]!;
    if (row.dwellingId !== src.dwellingId) dwellingPreservation = false;
    const srcBranch =
      (src.provenance?.branchHint && src.provenance.branchHint !== "unknown"
        ? src.provenance.branchHint
        : null)
      ?? (src.line.workCategory ? String(src.line.workCategory) : null);
    if (srcBranch && row.branch !== srcBranch) branchPreservation = false;
    if (src.provenance) {
      if (
        !row.lineProvenance
        || row.sourceDocumentId !== src.provenance.sourceDocumentId
        || row.sourceLineKey !== src.provenance.sourceLineKey
      ) {
        provenancePreservation = false;
      }
    }
    if (
      row.description !== src.line.description
      || row.quantity !== src.line.quantity
      || row.unit !== src.line.unit
    ) {
      provenancePreservation = false;
      reasons.push(`LINE_FIELD_MUTATION line=${row.lineId}`);
    }
  }

  const unresolvedExamples = lines
    .filter((l) => l.status === "IDENTITY_GAP" || l.status === "OWNER_MAPPING_POSSIBLE")
    .slice(0, 12)
    .map((l) => ({
      lineId: l.lineId,
      dwellingId: l.dwellingId,
      description: l.description,
      reasonPl: l.reasonPl,
    }));

  const reportStatus: IkIdentityCoverageReport["status"] =
    !reconciliationOk
      ? "partial"
      : counts.trustedWorkIdentity + counts.trustedMaterialIdentity > 0
        ? "ready"
        : "partial";

  const wave2SeedAudit = buildWave2SeedAudit(works, lines);

  return {
    tenderId,
    status: reportStatus,
    counts,
    reconciliation: {
      ok: reconciliationOk,
      unexplainedLoss,
      unexplainedDuplication: unexplainedDuplication + excess,
      reasons: reasons.filter((r) => r.startsWith("RECONCILIATION") || r.startsWith("MASTER_LINES")),
    },
    dwellingPreservation,
    branchPreservation,
    provenancePreservation,
    pricingExecuted,
    researchExecuted,
    autoAcceptExecuted,
    identityInvention,
    lines,
    unresolvedExamples,
    reasons,
    wave2SeedAudit,
  };
}
