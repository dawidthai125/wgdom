/**
 * IK-OWNER-CREATE-A09-PACKAGE — Owner-approved PACKAGE CatalogWork draft (G177).
 * REUSE catalog-wave-2-ops field contract · zero alias-pack / identity / LABOR host reuse.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";

export const IK_OWNER_CREATE_A09_PACKAGE_WORK_ID =
  "cc-w2-scianki-dzialowe-gr-pakiet-m2" as const;

/** Owner REJECTED LABOR host — must not seed, alias, or rate-copy. */
export const IK_OWNER_A09_REJECTED_LABOR_HOST_ID =
  "p2b-scianka-gk-na-stelazu-m2" as const;

/** G177 verbatim BOQ (P525 batch-38) — provenance only, not identity alias. */
export const IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ =
  "Ścianki działowe GR z płyt gipsowo-kartonowych na rusztach metalowych pojedynczych z pokryciem obustronnym jednowarstwowo 55-01" as const;

/** PACKAGE plane via costSplit (classifyCatalogWorkDomain ≥0.25/0.25). */
export const IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT = Object.freeze({
  materialRatio: 0.5,
  laborRatio: 0.5,
});

/**
 * Build CatalogWork draft — caller persists via OPS seed.
 * Rate: PENDING_OWNER — no ourWorkRate · companyPricePln=0 · freshness missing.
 * Must NOT copy internalBase 118 or LABOR host pricing.
 */
export function buildIkOwnerCreateA09PackageCatalogWork(
  nowIso: string,
): CatalogWork {
  return {
    id: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    tradeId: "SCIANY_GK",
    namePl: "Ścianki działowe GR — pakiet GK (ruszt, obustronnie)",
    unit: "m2",
    companyPricePln: 0,
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl:
      "Ścianki działowe GR z płyt GK na rusztach metalowych — pokrycie obustronne jednowarstwowe (G177 P525 · KNR 55-01)",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT },
  };
}
