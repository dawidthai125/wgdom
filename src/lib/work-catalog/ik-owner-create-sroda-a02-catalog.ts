/**
 * EPIC A / A0.2 — Owner GO CatalogWork coverage (Środa WEAK LPs).
 * Design freeze A0.2 — CREATE only · ZERO mapper/F5/scoring/P1–P3/Owner Map.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import type { TradeId } from "@/lib/work-catalog/trades";
import type { WgdomCostCategoryId, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { withFreshnessStatus } from "@/lib/work-catalog/freshness";

/** Środa / OCDS tender used in A0–A0.2 audits. */
export const IK_OWNER_SRODA_A02_TENDER_ID =
  "08deff6c-bc34-619e-b346-0300010ce2e5" as const;

export type SrodaA02WorkSpec = {
  id: string;
  namePl: string;
  descriptionPl: "";
  tradeId: TradeId;
  unit: WgdomCostUnit;
  keywords: readonly string[];
  /**
   * A0.2 sim: HYDRAULIKA / ROZBIORKI keep legacyCategoryId = trade
   * (L+T+U structural path). OKNA / LAZIENKA omit (not cost-category ids).
   */
  legacyCategoryId?: WgdomCostCategoryId;
  intendedLps: readonly string[];
};

/** Frozen 8 CatalogWork — exact A0.2 Owner GO metadata. */
export const IK_OWNER_SRODA_A02_WORKS: readonly SrodaA02WorkSpec[] = Object.freeze([
  {
    id: "p2b-wymiana-brodzika-kabiny-kpl",
    namePl: "Zestaw-kabina (kpl)",
    descriptionPl: "",
    tradeId: "HYDRAULIKA",
    unit: "kpl",
    keywords: Object.freeze([
      "wymiana brodzika i kabiny",
      "brodzika i kabiny natryskowej",
      "brodzika i kabiny",
    ]),
    legacyCategoryId: "HYDRAULIKA",
    intendedLps: Object.freeze(["3"]),
  },
  {
    id: "p2b-wymiana-syfonu-szt",
    namePl: "Syfon-PVC50 (szt)",
    descriptionPl: "",
    tradeId: "HYDRAULIKA",
    unit: "szt",
    keywords: Object.freeze([
      "wymiana syfonu z tworzywa sztucznego",
      "syfonu z tworzywa sztucznego",
      "wymiana syfonu",
    ]),
    legacyCategoryId: "HYDRAULIKA",
    intendedLps: Object.freeze(["4"]),
  },
  {
    id: "p2b-wymiana-podejscia-pvc-szt",
    namePl: "Podejscie-PVC (szt)",
    descriptionPl: "",
    tradeId: "HYDRAULIKA",
    unit: "szt",
    keywords: Object.freeze([
      "wymiana podejścia z rur z pvc",
      "podejścia z rur z pvc",
      "łączonych metodą wciskową",
      "podejście dopływowe do płuczek",
    ]),
    legacyCategoryId: "HYDRAULIKA",
    intendedLps: Object.freeze(["5", "11", "12"]),
  },
  {
    id: "p2b-wymiana-ustepu-kompakt-kpl",
    namePl: "Kompakt-WC (kpl)",
    descriptionPl: "",
    tradeId: "HYDRAULIKA",
    unit: "kpl",
    keywords: Object.freeze([
      "wymiana ustępu z miską",
      "ustępu z miską porcelanową",
      "miską porcelanową 'kompakt'",
    ]),
    legacyCategoryId: "HYDRAULIKA",
    intendedLps: Object.freeze(["10"]),
  },
  {
    id: "p2b-wypelnienie-spoin-silikonem-mb",
    namePl: "Spoiny-silikon (mb)",
    descriptionPl: "",
    tradeId: "LAZIENKA",
    unit: "mb",
    keywords: Object.freeze([
      "wypełnienie spoin masą silikonową",
      "spoin masą silikonową",
      "masą silikonową o wym",
    ]),
    intendedLps: Object.freeze(["13"]),
  },
  {
    id: "p2b-wymiana-okien-m2",
    namePl: "Okna-PCV (m2)",
    descriptionPl: "",
    tradeId: "OKNA",
    unit: "m2",
    keywords: Object.freeze([
      "montaż nowych okien rozwieranych",
      "okien rozwieranych i",
      "uchylno-rozwieranych",
      "okien rozwieranych",
    ]),
    intendedLps: Object.freeze(["16"]),
  },
  {
    id: "p2b-demontaz-oscieznic-krat-okiennych-m2",
    namePl: "Kraty-oscieznice (m2)",
    descriptionPl: "",
    tradeId: "ROZBIORKI",
    unit: "m2",
    keywords: Object.freeze([
      "demontaż ościeżnic stalowych",
      "ościeżnic stalowych lub krat",
      "krat okiennych o",
      "krat okiennych",
    ]),
    legacyCategoryId: "ROZBIORKI",
    intendedLps: Object.freeze(["18"]),
  },
  {
    id: "p2b-wymiana-parapetow-zewnetrznych-mb",
    namePl: "Parapety-zewn (mb)",
    descriptionPl: "",
    tradeId: "OKNA",
    unit: "mb",
    keywords: Object.freeze([
      "montaż nowych parapetów zewnętrznych",
      "parapetów zewnętrznych",
    ]),
    intendedLps: Object.freeze(["20"]),
  },
]);

export const IK_OWNER_SRODA_A02_WORK_IDS = Object.freeze(
  IK_OWNER_SRODA_A02_WORKS.map((w) => w.id),
);

export function getSrodaA02WorkSpec(workId: string): SrodaA02WorkSpec | undefined {
  return IK_OWNER_SRODA_A02_WORKS.find((w) => w.id === workId);
}

/** Build one CatalogWork draft — caller persists via OPS / saveWorkCatalogRouted. */
export function buildSrodaA02CatalogWork(
  spec: SrodaA02WorkSpec,
  nowIso: string,
): CatalogWork {
  const work: CatalogWork = {
    id: spec.id,
    tradeId: spec.tradeId,
    namePl: spec.namePl,
    unit: spec.unit,
    companyPricePln: 0,
    ...(spec.legacyCategoryId ? { legacyCategoryId: spec.legacyCategoryId } : {}),
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl: "",
    keywords: [...spec.keywords],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0, laborRatio: 1 },
  };
  return withFreshnessStatus(work, Date.parse(nowIso));
}

export function buildAllSrodaA02CatalogWorks(nowIso: string): CatalogWork[] {
  return IK_OWNER_SRODA_A02_WORKS.map((spec) => buildSrodaA02CatalogWork(spec, nowIso));
}

/** Strict metadata match vs design freeze (builder / pre-normalize). */
export function workMatchesSrodaA02Spec(
  work: CatalogWork | null | undefined,
  spec: SrodaA02WorkSpec,
): boolean {
  if (!work) return false;
  const descOk =
    work.descriptionPl === "" ||
    work.descriptionPl == null ||
    (typeof work.descriptionPl === "string" && work.descriptionPl.trim() === "");
  const kwOk =
    Array.isArray(work.keywords) &&
    work.keywords.length === spec.keywords.length &&
    spec.keywords.every((k, i) => work.keywords[i] === k);
  const legacyOk = spec.legacyCategoryId
    ? work.legacyCategoryId === spec.legacyCategoryId
    : work.legacyCategoryId == null;
  return (
    work.id === spec.id &&
    work.namePl === spec.namePl &&
    descOk &&
    work.tradeId === spec.tradeId &&
    work.unit === spec.unit &&
    kwOk &&
    legacyOk &&
    work.active === true
  );
}
