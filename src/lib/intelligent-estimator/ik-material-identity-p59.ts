/**
 * IK-MIGRATION-01 P5.9 — Material identity blocker classification (IDENTITY ONLY).
 *
 * Owner GO: register TechnologyPack / Work→mat.* map ONLY when existing SSOT evidence
 * provides materialKey+qtyFactor or an unambiguous existing product identity.
 *
 * Repo evidence (2026-08-15):
 * - Wave1 packs = [] (PENDING_OWNER_NORM · missing materialKey+qtyFactor)
 * - cc-p0c-w1-zawor-odpowietrzajacy → no mat.* / cw.product.* in Product Mapper
 *
 * ZERO invent · ZERO Price Memory · ZERO research · ZERO Accept.
 */

import { resolveDemandProductIdentityExact } from "@/lib/pricing-expert/material-market-map";
import {
  countWave1RegisteredMaterialsPacks,
  getWave1MaterialsRequiredPendingRow,
  isWave1MaterialsRequiredPending,
  listWave1RegisteredMaterialsPacks,
  type Wave1PendingMissingNormField,
} from "@/lib/tender-position-cost/wave1-materials-required";
import { findActiveTechnologyPacksForWorkId } from "@/lib/tender-position-cost/bom-technology-adapter";
import { ESTIMATOR_OWNER_CLASSIFICATION_MAP } from "@/lib/intelligent-estimator/owner-classification-map";

/** P5.9/P5.11 success outcomes (honest — not forced identity). */
export type IkMaterialIdentityP59Outcome =
  | "TRUSTED_MATERIAL_IDENTITY"
  | "OWNER_REVIEW_REQUIRED"
  | "PENDING_OWNER_NORM"
  | "PRODUCT_IDENTITY_GAP"
  /** P5.11: pricing plane LABOR — not a material opportunity. */
  | "LABOR_NO_MATERIAL_COMPONENT";

export type IkMaterialIdentityP59Resolved = {
  materialKey: string;
  catalogWorkId: string;
  labelPl: string;
  via: "materialKey" | "alias" | "catalogWorkId";
};

export type IkMaterialIdentityP59LineInput = {
  lineId: string;
  dwellingId: string;
  branch: string;
  description: string;
  unit: string;
  quantity: number;
  workId: string | null;
  /** Optional pre-bound materialKey (never invent). */
  materialKey?: string | null;
};

export type IkMaterialIdentityP59LineResult = {
  lineId: string;
  dwellingId: string;
  branch: string;
  description: string;
  unit: string;
  quantity: number;
  workId: string | null;
  outcome: IkMaterialIdentityP59Outcome;
  materialIdentity: IkMaterialIdentityP59Resolved | null;
  technologyPackIds: readonly string[];
  missing: readonly Wave1PendingMissingNormField[];
  reasonPl: string;
  provenance: string;
  /** Integrity: quantity/unit/dwelling/branch unchanged from input. */
  quantityUnchanged: true;
  sourceUnitUnchanged: true;
  dwellingPreserved: true;
  branchPreserved: true;
};

export type IkMaterialIdentityP59Counts = {
  inputLineCount: number;
  trustedMaterialIdentity: number;
  ownerReviewRequired: number;
  pendingOwnerNorm: number;
  productIdentityGap: number;
  laborNoMaterialComponent: number;
  technologyPackBefore: number;
  technologyPackAfter: number;
  inventedMaterialKeys: 0;
  inventedQtyFactors: 0;
  inventedProducts: 0;
  quantityChanges: 0;
};

export type IkMaterialIdentityP59Report = {
  status: "COMPLETE" | "PARTIAL" | "BLOCKED";
  counts: IkMaterialIdentityP59Counts;
  lines: IkMaterialIdentityP59LineResult[];
  /** Explicit: no pricing/research executed. */
  pricing: false;
  research: false;
  autoAccept: false;
};

export const P59_FOCUS_WORK_ZAWOR = "cc-p0c-w1-zawor-odpowietrzajacy" as const;
export const P59_FOCUS_WORK_ZAPRAWIANIE = "cc-p0c-w1-zaprawianie-bruzd" as const;

/**
 * Classify one work/line for material identity (no invent, no pricing).
 */
export function classifyIkMaterialIdentityP59(opts: {
  workId: string | null | undefined;
  namePl?: string | null;
  unit?: string | null;
  materialKey?: string | null;
}): {
  outcome: IkMaterialIdentityP59Outcome;
  materialIdentity: IkMaterialIdentityP59Resolved | null;
  technologyPackIds: readonly string[];
  missing: readonly Wave1PendingMissingNormField[];
  reasonPl: string;
  provenance: string;
} {
  const workId = typeof opts.workId === "string" ? opts.workId.trim() : "";
  const packs = workId
    ? findActiveTechnologyPacksForWorkId(workId, [
        ...listWave1RegisteredMaterialsPacks(),
      ])
    : [];
  const packIds = packs.map((p) => `${p.packId}@${p.packVersion}`);

  const exact = resolveDemandProductIdentityExact({
    materialKey: opts.materialKey,
    namePl: opts.namePl,
    unit: opts.unit,
    catalogWorkId: workId || null,
  });

  if (exact) {
    return {
      outcome: "TRUSTED_MATERIAL_IDENTITY",
      materialIdentity: {
        materialKey: exact.materialKey,
        catalogWorkId: exact.catalogWorkId,
        labelPl: exact.labelPl,
        via: exact.via,
      },
      technologyPackIds: packIds,
      missing: [],
      reasonPl: `Trusted material identity via ${exact.via} (${exact.materialKey}).`,
      provenance: `resolveDemandProductIdentityExact:${exact.via}`,
    };
  }

  if (workId && isWave1MaterialsRequiredPending(workId)) {
    const row = getWave1MaterialsRequiredPendingRow(workId);
    const missing = row?.missing ?? (["materialKey", "qtyFactor"] as const);
    return {
      outcome: "PENDING_OWNER_NORM",
      materialIdentity: null,
      technologyPackIds: packIds,
      missing,
      reasonPl:
        row?.reasonPl ??
        "Wave1 MATERIALS_REQUIRED — brak Owner-approved materialKey + qtyFactor (no invent).",
      provenance: "wave1-materials-required:PENDING_OWNER_NORM",
    };
  }

  const plane = workId
    ? ESTIMATOR_OWNER_CLASSIFICATION_MAP[workId] ?? null
    : null;

  // P5.11: LABOR plane is not a material opportunity (no invent mat.* from work name).
  if (plane === "LABOR") {
    return {
      outcome: "LABOR_NO_MATERIAL_COMPONENT",
      materialIdentity: null,
      technologyPackIds: packIds,
      missing: [],
      reasonPl:
        "Owner pricing plane LABOR — Material Expert input = 0 (service/robocizna, not material).",
      provenance: "owner-classification-map:LABOR",
    };
  }

  if (
    workId === P59_FOCUS_WORK_ZAWOR ||
    plane === "MATERIAL" ||
    plane === "COMPOUND"
  ) {
    return {
      outcome: "PRODUCT_IDENTITY_GAP",
      materialIdentity: null,
      technologyPackIds: packIds,
      missing: [],
      reasonPl:
        "Work Identity / MATERIAL|COMPOUND plane exists, but no existing mat.* or cw.product.* in Product Mapper (no invent product).",
      provenance: "material-market-map:PRODUCT_IDENTITY_GAP",
    };
  }

  return {
    outcome: "PRODUCT_IDENTITY_GAP",
    materialIdentity: null,
    technologyPackIds: packIds,
    missing: [],
    reasonPl:
      "No trusted material identity (resolveDemandProductIdentityExact = null · no invent).",
    provenance: "material-market-map:null",
  };
}

/**
 * Classify focus lines — identity only · preserves qty/unit/dwelling/branch.
 */
export function runIkMaterialIdentityP59(opts: {
  lines: readonly IkMaterialIdentityP59LineInput[];
}): IkMaterialIdentityP59Report {
  const technologyPackBefore = countWave1RegisteredMaterialsPacks();
  const lines: IkMaterialIdentityP59LineResult[] = opts.lines.map((line) => {
    const classified = classifyIkMaterialIdentityP59({
      workId: line.workId,
      namePl: line.description,
      unit: line.unit,
      materialKey: line.materialKey,
    });
    return {
      lineId: line.lineId,
      dwellingId: line.dwellingId,
      branch: line.branch,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      workId: line.workId,
      outcome: classified.outcome,
      materialIdentity: classified.materialIdentity,
      technologyPackIds: classified.technologyPackIds,
      missing: classified.missing,
      reasonPl: classified.reasonPl,
      provenance: classified.provenance,
      quantityUnchanged: true,
      sourceUnitUnchanged: true,
      dwellingPreserved: true,
      branchPreserved: true,
    };
  });

  const technologyPackAfter = countWave1RegisteredMaterialsPacks();

  let trustedMaterialIdentity = 0;
  let ownerReviewRequired = 0;
  let pendingOwnerNorm = 0;
  let productIdentityGap = 0;
  let laborNoMaterialComponent = 0;
  for (const row of lines) {
    if (row.outcome === "TRUSTED_MATERIAL_IDENTITY") trustedMaterialIdentity += 1;
    else if (row.outcome === "OWNER_REVIEW_REQUIRED") ownerReviewRequired += 1;
    else if (row.outcome === "PENDING_OWNER_NORM") pendingOwnerNorm += 1;
    else if (row.outcome === "LABOR_NO_MATERIAL_COMPONENT") laborNoMaterialComponent += 1;
    else productIdentityGap += 1;
  }

  const counts: IkMaterialIdentityP59Counts = {
    inputLineCount: lines.length,
    trustedMaterialIdentity,
    ownerReviewRequired,
    pendingOwnerNorm,
    productIdentityGap,
    laborNoMaterialComponent,
    technologyPackBefore,
    technologyPackAfter,
    inventedMaterialKeys: 0,
    inventedQtyFactors: 0,
    inventedProducts: 0,
    quantityChanges: 0,
  };

  const status: IkMaterialIdentityP59Report["status"] =
    trustedMaterialIdentity === lines.length && lines.length > 0
      ? "COMPLETE"
      : trustedMaterialIdentity > 0
        ? "PARTIAL"
        : lines.length > 0
          ? "PARTIAL"
          : "BLOCKED";

  return {
    status,
    counts,
    lines,
    pricing: false,
    research: false,
    autoAccept: false,
  };
}

/** ZZK focus snapshot (P5.8) — identity audit inputs only. */
export const P59_ZZK_FOCUS_LINE_SPECS: readonly IkMaterialIdentityP59LineInput[] = [
  {
    lineId: "obl_95b8d9fa",
    dwellingId: "kotlarska",
    branch: "sanitary",
    description: "Montaż odpowietrzników automatycznych na pionach instalacji C.O. DN 20 mm",
    unit: "szt.",
    quantity: 3,
    workId: P59_FOCUS_WORK_ZAWOR,
  },
  {
    lineId: "obl_f676979e",
    dwellingId: "ptasia",
    branch: "sanitary",
    description: "Montaż odpowietrzników automatycznych na pionach instalacji C.O. DN 20 mm",
    unit: "szt.",
    quantity: 2,
    workId: P59_FOCUS_WORK_ZAWOR,
  },
  {
    lineId: "obl_26853c8f",
    dwellingId: "ptasia",
    branch: "electrical",
    description: "Zaprawianie bruzd o szer. do 100 mm",
    unit: "m",
    quantity: 14.5,
    workId: P59_FOCUS_WORK_ZAPRAWIANIE,
  },
  {
    lineId: "obl_c37c8c1f",
    dwellingId: "ptasia",
    branch: "electrical",
    description: "Zaprawianie bruzd o szer. do 100 mm",
    unit: "m",
    quantity: 69.44,
    workId: P59_FOCUS_WORK_ZAPRAWIANIE,
  },
  {
    lineId: "obl_9829c554",
    dwellingId: "zernicka",
    branch: "electrical",
    description: "Zaprawianie bruzd o szer. do 100 mm",
    unit: "m",
    quantity: 8.5,
    workId: P59_FOCUS_WORK_ZAPRAWIANIE,
  },
  {
    lineId: "obl_4e8f0754",
    dwellingId: "zernicka",
    branch: "electrical",
    description: "Zaprawianie bruzd o szer. do 100 mm",
    unit: "m",
    quantity: 114.24,
    workId: P59_FOCUS_WORK_ZAPRAWIANIE,
  },
];
