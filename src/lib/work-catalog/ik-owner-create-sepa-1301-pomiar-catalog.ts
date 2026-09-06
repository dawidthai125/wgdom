/**
 * Sępa — KNNR 5·1301-01/02 CatalogWork (Owner IMPLEMENT GO #2).
 *
 * A1/A2 only · unit `pomiar` · ZERO OUR RATE · ZERO companyPrice as rate
 * · ZERO G1 bind · ZERO LP269 · NEVER alias pomiar↔prob · 1305 untouched.
 *
 * REUSE: CatalogWork field contract (C2/LP48) · insertWorkBothRegions.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { withFreshnessStatus } from "@/lib/work-catalog/freshness";

export const SEPA_KNNR_1301_01_WORK_ID = "knnr-wc-knnr-5-1301-01-pomiar" as const;
export const SEPA_KNNR_1301_02_WORK_ID = "knnr-wc-knnr-5-1301-02-pomiar" as const;

export const SEPA_KNNR_1301_WORK_IDS = [
  SEPA_KNNR_1301_01_WORK_ID,
  SEPA_KNNR_1301_02_WORK_ID,
] as const;

export const SEPA_KNNR_1301_01_SOURCE_CODE = "KNNR|5|1301-01" as const;
export const SEPA_KNNR_1301_02_SOURCE_CODE = "KNNR|5|1301-02" as const;

/** Design identity scope — documentation only; NOT auto-bound. */
export const SEPA_KNNR_1301_01_TARGET_LPS = ["200", "217", "266"] as const;
export const SEPA_KNNR_1301_02_TARGET_LPS = ["201", "265"] as const;
/** Explicit hold — do not assign A1/A2. */
export const SEPA_KNNR_1301_HOLD_LP = "269" as const;

export type SepaKnr1301TableCode = "1301-01" | "1301-02";

export type SepaKnr1301WorkSpec = {
  id: (typeof SEPA_KNNR_1301_WORK_IDS)[number];
  tableCode: SepaKnr1301TableCode;
  sourceCode: typeof SEPA_KNNR_1301_01_SOURCE_CODE | typeof SEPA_KNNR_1301_02_SOURCE_CODE;
  namePl: string;
  sourceDescription: string;
  unit: "pomiar";
  tradeId: "ELEKTRYKA";
  targetLps: readonly string[];
};

export const SEPA_KNNR_1301_WORKS: readonly SepaKnr1301WorkSpec[] = Object.freeze([
  {
    id: SEPA_KNNR_1301_01_WORK_ID,
    tableCode: "1301-01",
    sourceCode: SEPA_KNNR_1301_01_SOURCE_CODE,
    namePl:
      "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia (KNNR 5·1301-01)",
    sourceDescription:
      "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    tradeId: "ELEKTRYKA",
    targetLps: SEPA_KNNR_1301_01_TARGET_LPS,
  },
  {
    id: SEPA_KNNR_1301_02_WORK_ID,
    tableCode: "1301-02",
    sourceCode: SEPA_KNNR_1301_02_SOURCE_CODE,
    namePl:
      "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia (KNNR 5·1301-02)",
    sourceDescription:
      "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    tradeId: "ELEKTRYKA",
    targetLps: SEPA_KNNR_1301_02_TARGET_LPS,
  },
]);

export function getSepaKnr1301WorkSpec(
  workId: string,
): SepaKnr1301WorkSpec | null {
  return SEPA_KNNR_1301_WORKS.find((w) => w.id === workId) ?? null;
}

export function isSepaKnr1301PomiarWorkId(
  workId: string | null | undefined,
): boolean {
  const id = String(workId ?? "").trim();
  return (
    id === SEPA_KNNR_1301_01_WORK_ID || id === SEPA_KNNR_1301_02_WORK_ID
  );
}

/**
 * Owner-approved CatalogWork draft.
 * CatalogWork schema has no sourceCode field — SSOT constant + descriptionPl.
 * companyPricePln=0 · no ourWorkRate · laborRatio=1 · materialRatio=0.
 */
export function buildSepaKnr1301PomiarCatalogWork(
  spec: SepaKnr1301WorkSpec,
  nowIso: string,
): CatalogWork {
  const work: CatalogWork = {
    id: spec.id,
    tradeId: spec.tradeId,
    namePl: spec.namePl,
    unit: "pomiar",
    companyPricePln: 0,
    legacyCategoryId: "ELEKTRYKA",
    commercialPricing: {
      marginPct: 0,
      updatedAt: nowIso,
      source: "owner",
    },
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl: `${spec.sourceDescription} · ${spec.sourceCode}`,
    keywords: [
      "sprawdzenie",
      "pomiar",
      "obwodu",
      "elektrycznego",
      "niskiego",
      "napięcia",
      spec.tableCode,
      "knnr",
    ],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0, laborRatio: 1 },
  };
  return withFreshnessStatus(work, Date.parse(nowIso));
}

export function workMatchesSepaKnr1301Spec(
  work: CatalogWork,
  spec: SepaKnr1301WorkSpec,
): boolean {
  return (
    work.id === spec.id &&
    work.unit === "pomiar" &&
    work.namePl === spec.namePl &&
    work.tradeId === "ELEKTRYKA" &&
    work.companyPricePln === 0 &&
    work.costSplit?.laborRatio === 1 &&
    work.costSplit?.materialRatio === 0 &&
    work.active === true &&
    !work.ourWorkRate &&
    String(work.descriptionPl ?? "").includes(spec.sourceCode)
  );
}
