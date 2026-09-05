/**
 * IK Composite Position Orchestration — BOTH_HOLD consumer (thin adapter).
 *
 * REUSE: decomposeOfferBoqLine · findActiveTechnologyPacksForWorkId ·
 *        resolveTechnologyBomForWork · resolveLaborInputFromOurWorkRate ·
 *        resolveMaterialInputFromPriceMemory · computePositionCost
 *
 * NOT a Composite Engine / Orchestrator / Research engine.
 * Parent COMPOUND classification UNCHANGED — this file only consumes BOTH_HOLD.
 *
 * HARD: P5∧P6 · leaf only · GAP ≠ 0 PLN · labor=null / materials=[] never as success
 *       when those components are required · ZERO auto-Accept · ZERO HTTP writes.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { TechnologyPack } from "@/lib/technology-foundation";
import { decomposeOfferBoqLine } from "@/lib/execution-expert/technology-decomposition";
import type { OfferBoqLineLike } from "@/lib/execution-expert/offer-boq-adapter";
import {
  findActiveTechnologyPacksForWorkId,
  resolveTechnologyBomForWork,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import { computePositionCost } from "@/lib/tender-position-cost/engine";
import { resolveLaborInputFromOurWorkRate } from "@/lib/tender-position-cost/our-rate-labor-adapter";
import { resolveMaterialInputFromPriceMemory } from "@/lib/tender-position-cost/material-sell-adapter";
import type {
  PositionCostInput,
  PositionCostResult,
  PositionLaborInput,
  PositionMaterialInput,
} from "@/lib/tender-position-cost/types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  isInvoicePurchaseCatalogWorkId,
  isInvoicePurchaseMaterialKey,
} from "@/lib/price-intelligence/invoice-purchase-host";
import { resolveDemandProductIdentityExact } from "@/lib/pricing-expert/material-market-map";
import {
  assertMaterialResearchAllowed,
  classifyEstimatorPricingPlane,
  isLaborGapJobAllowed,
} from "./classification-gate";
import {
  runIkMasterBoqClassification,
  type IkClassificationReport,
  type IkClassifiedMasterLine,
} from "./ik-classification";
import {
  runIkDocumentExpert,
  type IkDocumentExpertReport,
} from "./ik-document-expert";
import { expertChainMayProceedFromReport } from "./ik-expert-admission";
import { researchEligible } from "./ik-material-expert";

export const IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION = 1 as const;

export const IK_COMPOSITE_P2_KEEP_GAP_WORK_IDS = [
  "cc-w2-zawor-odcinajacy",
  "cc-p0c-w1-zawor-odpowietrzajacy",
] as const;

const WGDOM_UNITS = new Set<string>(["m2", "mb", "szt", "rbh", "m3", "kpl", "kg", "l", "prob"]);

function isWgdomCostUnit(unit: string): unit is WgdomCostUnit {
  return WGDOM_UNITS.has(unit);
}

export type IkCompositeLineStatus =
  | "COMPLETE"
  | "GAP"
  | "HOLD"
  | "SKIPPED";

export type IkCompositeGapCode =
  | "P5_P6_HOLD"
  | "MASTER_BOQ_NOT_READY"
  | "NOT_BOTH_HOLD"
  | "NO_PACK"
  | "AMBIGUOUS_BOM"
  | "UNBOUND_DECOMP"
  | "UNKNOWN_COMPONENT"
  | "EQUIPMENT_UNPRICED"
  | "NO_MATERIAL_IDENTITY"
  | "NO_LABOR_IDENTITY"
  | "HOURS_ONLY_LABOR"
  | "P1_INVOICE_HOST"
  | "P2_PRODUCT_IDENTITY_GAP"
  | "MATERIAL_MISS"
  | "LABOR_MISS"
  | "UNIT_NOT_WGDOM"
  | "UNIT_MISMATCH"
  | "PARTIAL_GAP";

export type IkCompositeMaterialJob = {
  materialKey: string | null;
  labelPl: string;
  quantity: number | null;
  unit: string | null;
  provenance: {
    factorSourceKind: string | null;
    factorSourceRef: string | null;
    packId: string | null;
    packVersion: string | null;
  };
  identityLegal: boolean;
  researchEligible: boolean;
  researchHttpExecuted: false;
  autoAcceptExecuted: false;
  pmStatus: string;
  positionMaterial: PositionMaterialInput;
  gapCode: IkCompositeGapCode | null;
};

export type IkCompositeLaborJob = {
  workId: string | null;
  description: string;
  quantity: number;
  unit: string;
  provenance: {
    packId: string | null;
    packVersion: string | null;
    stepId: string | null;
  };
  researchAllowed: boolean;
  researchHttpExecuted: false;
  autoAcceptExecuted: false;
  rateStatus: string;
  sellRatePln: number | null;
  gapCode: IkCompositeGapCode | null;
};

export type IkCompositeLineResult = {
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  unit: string;
  catalogWorkId: string | null;
  plane: IkClassifiedMasterLine["plane"];
  handoff: IkClassifiedMasterLine["handoff"];
  parentRemainsCompound: true;
  decompStatus: string;
  packId: string | null;
  packVersion: string | null;
  materialJobs: IkCompositeMaterialJob[];
  laborJobs: IkCompositeLaborJob[];
  engineInput: PositionCostInput | null;
  engineResult: PositionCostResult | null;
  status: IkCompositeLineStatus;
  gapCodes: IkCompositeGapCode[];
  positionComplete: boolean;
  totalPositionCostPln: number | null;
  autoAcceptExecuted: false;
  researchHttpExecuted: false;
  feedsP7Bid: false;
};

export type IkCompositeBothHoldReport = {
  schemaVersion: typeof IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION;
  tenderId: string;
  status: "ready" | "partial" | "gap" | "hold" | "blocked";
  p5Active: boolean;
  p6Active: boolean;
  bothHoldLineCount: number;
  completeLineCount: number;
  gapLineCount: number;
  skippedLineCount: number;
  autoAcceptExecuted: false;
  researchHttpExecuted: false;
  catalogWorkWrite: false;
  priceMemoryWrite: false;
  feedsP7Bid: false;
  computePositionCostChanged: false;
  lines: IkCompositeLineResult[];
  reasons: string[];
};

function emptyHold(tenderId: string, reason: IkCompositeGapCode, p5: boolean, p6: boolean): IkCompositeBothHoldReport {
  return {
    schemaVersion: IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION,
    tenderId,
    status: reason === "MASTER_BOQ_NOT_READY" ? "blocked" : "hold",
    p5Active: p5,
    p6Active: p6,
    bothHoldLineCount: 0,
    completeLineCount: 0,
    gapLineCount: 0,
    skippedLineCount: 0,
    autoAcceptExecuted: false,
    researchHttpExecuted: false,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    feedsP7Bid: false,
    computePositionCostChanged: false,
    lines: [],
    reasons: [reason],
  };
}

function toOfferLike(row: IkClassifiedMasterLine): OfferBoqLineLike {
  return {
    lineId: row.lineId,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    catalogWorkId: row.catalogWorkId,
    isNoise: false,
    normalizedDescription: row.description,
  };
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function gapLine(
  row: IkClassifiedMasterLine,
  codes: IkCompositeGapCode[],
  extra: Partial<IkCompositeLineResult> = {},
): IkCompositeLineResult {
  return {
    lineId: row.lineId,
    lp: row.lp,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    catalogWorkId: row.catalogWorkId,
    plane: row.plane,
    handoff: row.handoff,
    parentRemainsCompound: true,
    decompStatus: extra.decompStatus ?? "",
    packId: extra.packId ?? null,
    packVersion: extra.packVersion ?? null,
    materialJobs: extra.materialJobs ?? [],
    laborJobs: extra.laborJobs ?? [],
    engineInput: extra.engineInput ?? null,
    engineResult: extra.engineResult ?? null,
    status: "GAP",
    gapCodes: codes,
    positionComplete: false,
    totalPositionCostPln: null,
    autoAcceptExecuted: false,
    researchHttpExecuted: false,
    feedsP7Bid: false,
  };
}

/**
 * BOTH_HOLD consumer. Caller (IkEntryHost) passes existing P5/P6 levers.
 * execute*Research flags are recorded for eligibility only — this adapter never HTTP.
 */
export function runIkCompositeBothHold(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  expert?: IkDocumentExpertReport | null;
  classification?: IkClassificationReport | null;
  /** Test DI — classified lines without Document Expert. */
  lines?: IkClassifiedMasterLine[];
  store?: WorkCatalogStore;
  packs?: readonly TechnologyPack[];
  nowMs?: number;
  p5LaborActive: boolean;
  p6MaterialActive: boolean;
  executeLaborResearch?: boolean;
  executeMaterialResearch?: boolean;
}): IkCompositeBothHoldReport {
  const item = opts.item;
  const tenderId = item.id || item.tenderId || "";
  const p5 = opts.p5LaborActive === true;
  const p6 = opts.p6MaterialActive === true;
  const nowMs = opts.nowMs ?? Date.now();

  if (!p5 || !p6) {
    return emptyHold(tenderId, "P5_P6_HOLD", p5, p6);
  }

  const expert =
    opts.expert
    ?? (opts.lines ? null : runIkDocumentExpert({ item, package: opts.package ?? null }));

  if (!opts.lines && expert && !expertChainMayProceedFromReport(expert)) {
    return emptyHold(tenderId, "MASTER_BOQ_NOT_READY", p5, p6);
  }

  const classification =
    opts.classification
    ?? (opts.lines
      ? null
      : runIkMasterBoqClassification({
          item,
          package: opts.package ?? null,
          expert,
        }));

  const allLines = opts.lines ?? classification?.lines ?? [];
  const store = opts.store ?? loadWorkCatalogStoreLocal();
  const reasons: string[] = [];
  const results: IkCompositeLineResult[] = [];
  let skipped = 0;

  for (const row of allLines) {
    if (row.handoff !== "BOTH_HOLD") {
      skipped += 1;
      continue;
    }
    results.push(
      processBothHoldLine(row, {
        store,
        packs: opts.packs,
        nowMs,
        executeLaborResearch: opts.executeLaborResearch === true,
        executeMaterialResearch: opts.executeMaterialResearch === true,
      }),
    );
  }

  const completeLineCount = results.filter((l) => l.status === "COMPLETE").length;
  const gapLineCount = results.filter((l) => l.status === "GAP").length;
  let status: IkCompositeBothHoldReport["status"] = "gap";
  if (results.length === 0) status = "hold";
  else if (completeLineCount === results.length) status = "ready";
  else if (completeLineCount > 0) status = "partial";

  if (results.length === 0) reasons.push("NO_BOTH_HOLD_LINES");

  return {
    schemaVersion: IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION,
    tenderId,
    status,
    p5Active: p5,
    p6Active: p6,
    bothHoldLineCount: results.length,
    completeLineCount,
    gapLineCount,
    skippedLineCount: skipped,
    autoAcceptExecuted: false,
    researchHttpExecuted: false,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    feedsP7Bid: false,
    computePositionCostChanged: false,
    lines: results,
    reasons,
  };
}

function processBothHoldLine(
  row: IkClassifiedMasterLine,
  ctx: {
    store: WorkCatalogStore;
    packs?: readonly TechnologyPack[];
    nowMs: number;
    executeLaborResearch: boolean;
    executeMaterialResearch: boolean;
  },
): IkCompositeLineResult {
  const parentId = (row.catalogWorkId || "").trim();
  const decomp = decomposeOfferBoqLine(toOfferLike(row));
  const decompStatus = decomp.lineStatus;

  if (
    decomp.lineStatus === "UNBOUND"
    || decomp.lineStatus === "DECOMPOSED_BLOCKED"
    || decomp.units.some((u) => u.status === "UNBOUND" && u.family === "installation" && !parentId)
  ) {
    // Still try pack bind when parent has workId — UNBOUND without pack = GAP below.
  }

  if (!parentId) {
    return gapLine(row, ["NO_PACK", "UNKNOWN_COMPONENT"], { decompStatus });
  }

  if (IK_COMPOSITE_P2_KEEP_GAP_WORK_IDS.includes(parentId as typeof IK_COMPOSITE_P2_KEEP_GAP_WORK_IDS[number])) {
    return gapLine(row, ["P2_PRODUCT_IDENTITY_GAP"], { decompStatus });
  }

  if (isInvoicePurchaseCatalogWorkId(parentId)) {
    return gapLine(row, ["P1_INVOICE_HOST"], { decompStatus });
  }

  const matches = findActiveTechnologyPacksForWorkId(parentId, ctx.packs);
  if (matches.length === 0) {
    return gapLine(row, ["NO_PACK"], { decompStatus });
  }
  if (matches.length > 1) {
    return gapLine(row, ["AMBIGUOUS_BOM"], { decompStatus });
  }

  const pack = matches[0]!;
  if ((pack.equipment?.length ?? 0) > 0) {
    return gapLine(row, ["EQUIPMENT_UNPRICED", "UNKNOWN_COMPONENT"], {
      decompStatus,
      packId: pack.packId,
      packVersion: pack.packVersion,
    });
  }

  if (!isWgdomCostUnit(row.unit)) {
    return gapLine(row, ["UNIT_NOT_WGDOM"], {
      decompStatus,
      packId: pack.packId,
      packVersion: pack.packVersion,
    });
  }

  const bom = resolveTechnologyBomForWork({
    workId: parentId,
    unit: row.unit,
    positionQuantity: row.quantity,
    packs: ctx.packs ?? matches,
  });

  const materialJobs: IkCompositeMaterialJob[] = [];
  const materialGapCodes: IkCompositeGapCode[] = [];

  if (bom.status === "UNIT_CONVERSION_GAP") {
    materialGapCodes.push("UNIT_MISMATCH");
  }

  const recipeMaterials = pack.materials ?? [];
  if (recipeMaterials.length === 0 || bom.status === "EMPTY_RECIPE") {
    materialGapCodes.push("NO_MATERIAL_IDENTITY");
  }

  const specs =
    bom.status === "OK" && bom.materialSpecs.length > 0
      ? bom.components.map((c) => ({
          materialKey: c.materialKey,
          quantity: c.totalQuantity,
          quantityUnit: c.unit,
          namePl: c.namePl,
          factorSourceKind: c.factorSourceKind,
          factorSourceRef: c.factorSourceRef,
        }))
      : recipeMaterials.map((m) => ({
          materialKey: m.materialKey,
          quantity: Number((row.quantity * m.qtyFactor).toFixed(6)),
          quantityUnit: m.unit,
          namePl: m.namePl,
          factorSourceKind: m.factorSourceKind ?? null,
          factorSourceRef: m.factorSourceRef ?? null,
        }));

  for (const spec of specs) {
    const key = String(spec.materialKey || "").trim();
    const job = resolveMaterialJob(spec, key, pack, ctx);
    materialJobs.push(job);
    if (job.gapCode) materialGapCodes.push(job.gapCode);
  }

  const laborJobs: IkCompositeLaborJob[] = [];
  const laborGapCodes: IkCompositeGapCode[] = [];

  const stepWorkIds = uniqueIds(
    (pack.steps ?? [])
      .map((s) => String(s.catalogWorkId || "").trim())
      .filter((id) => id && id !== parentId),
  );

  const labourKeyIds = uniqueIds(
    (pack.labour ?? [])
      .map((l) => String(l.labourKey || "").trim())
      .filter((id) => id && getWorkByIdFromStore(ctx.store, id) != null),
  );

  const leafLaborIds = uniqueIds([...stepWorkIds, ...labourKeyIds]);
  const hoursOnly =
    (pack.labour?.length ?? 0) > 0
    && leafLaborIds.length === 0
    && (pack.labour ?? []).every((l) => Number.isFinite(l.hoursPerUnit));

  if (leafLaborIds.length === 0) {
    laborGapCodes.push(hoursOnly ? "HOURS_ONLY_LABOR" : "NO_LABOR_IDENTITY");
    laborJobs.push({
      workId: null,
      description: hoursOnly ? "labour[] hoursPerUnit without workId" : "no leaf catalogWorkId",
      quantity: row.quantity,
      unit: row.unit,
      provenance: { packId: pack.packId, packVersion: pack.packVersion, stepId: null },
      researchAllowed: false,
      researchHttpExecuted: false,
      autoAcceptExecuted: false,
      rateStatus: "NO_IDENTITY",
      sellRatePln: null,
      gapCode: hoursOnly ? "HOURS_ONLY_LABOR" : "NO_LABOR_IDENTITY",
    });
  } else {
    for (const workId of leafLaborIds) {
      const step = (pack.steps ?? []).find((s) => s.catalogWorkId === workId);
      const job = resolveLaborJob(workId, step?.namePl || workId, step?.stepId ?? null, row, pack, ctx);
      laborJobs.push(job);
      if (job.gapCode) laborGapCodes.push(job.gapCode);
    }
  }

  const allGap = uniqueIds([...materialGapCodes, ...laborGapCodes]) as IkCompositeGapCode[];
  const materialsRequired = recipeMaterials.length > 0;
  const laborRequired = true;
  const materialsHit =
    materialsRequired
    && materialJobs.length > 0
    && materialJobs.every((j) => j.positionMaterial.status === "CURRENT" && j.gapCode == null);
  const laborHit =
    laborJobs.length > 0
    && laborJobs.every((j) => j.rateStatus === "CURRENT" && j.gapCode == null && j.sellRatePln != null);

  // HARD: never labor=null / materials=[] as success when components required.
  const laborInput: PositionLaborInput = laborHit
    ? {
        status: "CURRENT",
        ourRatePln: round2(laborJobs.reduce((s, j) => s + (j.sellRatePln ?? 0), 0)),
      }
    : laborJobs.some((j) => j.rateStatus === "STALE")
      ? { status: "STALE", ourRatePln: null }
      : leafLaborIds.length === 0
        ? { status: "NO_IDENTITY", ourRatePln: null }
        : { status: "MISSING", ourRatePln: null };

  const materialsInput: PositionMaterialInput[] = materialsRequired
    ? materialJobs.map((j) => j.positionMaterial)
    : [{
        materialKey: null,
        status: "NO_KEY",
        quantity: null,
        quantityUnit: null,
        sellPricePln: null,
      }];

  const engineInput: PositionCostInput = {
    quantity: row.quantity,
    unit: row.unit,
    labor: laborInput,
    materials: materialsInput,
  };
  const engineResult = computePositionCost(engineInput);

  const complete =
    materialsHit
    && laborHit
    && engineResult.positionComplete === true
    && engineResult.totalPositionCostPln != null
    && allGap.length === 0;

  if (!complete) {
    const codes: IkCompositeGapCode[] = allGap.length > 0 ? allGap : ["PARTIAL_GAP"];
    if (materialsHit && !laborHit) codes.push("LABOR_MISS");
    if (!materialsHit && laborHit) codes.push("MATERIAL_MISS");
    if (!materialsHit && !laborHit && allGap.length === 0) {
      codes.push("MATERIAL_MISS", "LABOR_MISS");
    }
    return gapLine(row, [...new Set(codes)], {
      decompStatus,
      packId: pack.packId,
      packVersion: pack.packVersion,
      materialJobs,
      laborJobs,
      engineInput,
      engineResult,
    });
  }

  void laborRequired;

  return {
    lineId: row.lineId,
    lp: row.lp,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    catalogWorkId: row.catalogWorkId,
    plane: row.plane,
    handoff: row.handoff,
    parentRemainsCompound: true,
    decompStatus,
    packId: pack.packId,
    packVersion: pack.packVersion,
    materialJobs,
    laborJobs,
    engineInput,
    engineResult,
    status: "COMPLETE",
    gapCodes: [],
    positionComplete: true,
    totalPositionCostPln: engineResult.totalPositionCostPln,
    autoAcceptExecuted: false,
    researchHttpExecuted: false,
    feedsP7Bid: false,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveMaterialJob(
  spec: {
    materialKey: string;
    quantity: number;
    quantityUnit: string;
    namePl: string;
    factorSourceKind: string | null;
    factorSourceRef: string | null;
  },
  key: string,
  pack: TechnologyPack,
  ctx: { store: WorkCatalogStore; nowMs: number; executeMaterialResearch: boolean },
): IkCompositeMaterialJob {
  const provenance = {
    factorSourceKind: spec.factorSourceKind,
    factorSourceRef: spec.factorSourceRef,
    packId: pack.packId,
    packVersion: pack.packVersion,
  };
  const base = {
    labelPl: spec.namePl,
    quantity: spec.quantity,
    unit: spec.quantityUnit,
    provenance,
    researchHttpExecuted: false as const,
    autoAcceptExecuted: false as const,
  };

  if (!key || !key.startsWith("mat.")) {
    return {
      ...base,
      materialKey: key || null,
      identityLegal: false,
      researchEligible: false,
      pmStatus: "NO_KEY",
      positionMaterial: {
        materialKey: key || null,
        status: "NO_KEY",
        quantity: spec.quantity,
        quantityUnit: spec.quantityUnit,
        sellPricePln: null,
      },
      gapCode: "NO_MATERIAL_IDENTITY",
    };
  }

  if (isInvoicePurchaseMaterialKey(key)) {
    return {
      ...base,
      materialKey: key,
      identityLegal: false,
      researchEligible: false,
      pmStatus: "P1_BLOCK",
      positionMaterial: {
        materialKey: key,
        status: "NO_KEY",
        quantity: spec.quantity,
        quantityUnit: spec.quantityUnit,
        sellPricePln: null,
      },
      gapCode: "P1_INVOICE_HOST",
    };
  }

  const identity = resolveDemandProductIdentityExact({ materialKey: key });
  if (!identity) {
    return {
      ...base,
      materialKey: key,
      identityLegal: false,
      researchEligible: false,
      pmStatus: "NO_KEY",
      positionMaterial: {
        materialKey: key,
        status: "NO_KEY",
        quantity: spec.quantity,
        quantityUnit: spec.quantityUnit,
        sellPricePln: null,
      },
      gapCode: "NO_MATERIAL_IDENTITY",
    };
  }

  const classify = classifyEstimatorPricingPlane({
    materialKey: identity.materialKey,
    workId: null,
    namePl: identity.labelPl,
    unit: spec.quantityUnit,
  });
  const assertOk = assertMaterialResearchAllowed({
    materialKey: identity.materialKey,
    catalogWorkId: identity.catalogWorkId,
    namePl: identity.labelPl,
    unit: spec.quantityUnit,
  });
  const eligible = researchEligible(
    {
      materialKey: identity.materialKey,
      catalogWorkId: identity.catalogWorkId,
      labelPl: identity.labelPl,
      via: identity.via,
    },
    "MATERIAL",
    classify.plane,
  );
  void ctx.executeMaterialResearch;
  void assertOk;

  const resolved = resolveMaterialInputFromPriceMemory(
    ctx.store,
    { materialKey: identity.materialKey, quantity: spec.quantity, quantityUnit: spec.quantityUnit },
    ctx.nowMs,
  );

  const hit = resolved.status === "CURRENT" && resolved.material.status === "CURRENT";
  return {
    ...base,
    materialKey: identity.materialKey,
    identityLegal: true,
    researchEligible: eligible && assertOk.ok === true,
    pmStatus: resolved.status,
    positionMaterial: resolved.material,
    gapCode: hit ? null : "MATERIAL_MISS",
  };
}

function resolveLaborJob(
  workId: string,
  description: string,
  stepId: string | null,
  row: IkClassifiedMasterLine,
  pack: TechnologyPack,
  ctx: { store: WorkCatalogStore; nowMs: number; executeLaborResearch: boolean },
): IkCompositeLaborJob {
  const provenance = {
    packId: pack.packId,
    packVersion: pack.packVersion,
    stepId,
  };
  if (isInvoicePurchaseCatalogWorkId(workId)) {
    return {
      workId,
      description,
      quantity: row.quantity,
      unit: row.unit,
      provenance,
      researchAllowed: false,
      researchHttpExecuted: false,
      autoAcceptExecuted: false,
      rateStatus: "P1_BLOCK",
      sellRatePln: null,
      gapCode: "P1_INVOICE_HOST",
    };
  }
  if (IK_COMPOSITE_P2_KEEP_GAP_WORK_IDS.includes(workId as typeof IK_COMPOSITE_P2_KEEP_GAP_WORK_IDS[number])) {
    return {
      workId,
      description,
      quantity: row.quantity,
      unit: row.unit,
      provenance,
      researchAllowed: false,
      researchHttpExecuted: false,
      autoAcceptExecuted: false,
      rateStatus: "P2_GAP",
      sellRatePln: null,
      gapCode: "P2_PRODUCT_IDENTITY_GAP",
    };
  }
  if (!isWgdomCostUnit(row.unit)) {
    return {
      workId,
      description,
      quantity: row.quantity,
      unit: row.unit,
      provenance,
      researchAllowed: false,
      researchHttpExecuted: false,
      autoAcceptExecuted: false,
      rateStatus: "UNIT_GAP",
      sellRatePln: null,
      gapCode: "UNIT_NOT_WGDOM",
    };
  }

  const researchAllowed = isLaborGapJobAllowed(workId);
  void ctx.executeLaborResearch;

  const resolved = resolveLaborInputFromOurWorkRate(ctx.store, workId, row.unit, ctx.nowMs);
  const work = getWorkByIdFromStore(ctx.store, workId);
  if (work && work.unit !== row.unit) {
    // Existing lookup already keys by workId+unit — MISS if unit differs. No remap.
  }

  const hit = resolved.status === "CURRENT" && resolved.labor.status === "CURRENT" && resolved.sellPricePln != null;
  return {
    workId,
    description,
    quantity: row.quantity,
    unit: row.unit,
    provenance,
    researchAllowed,
    researchHttpExecuted: false,
    autoAcceptExecuted: false,
    rateStatus: resolved.status,
    sellRatePln: hit ? resolved.sellPricePln : null,
    gapCode: hit ? null : resolved.status === "NO_IDENTITY" ? "NO_LABOR_IDENTITY" : "LABOR_MISS",
  };
}
