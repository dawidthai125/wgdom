/**
 * IK-OWNER-CREATE-A01-LP5 — Owner-approved CatalogWork seed (WM Paczka V LP5/LP10).
 * REUSE catalog-wave-2-ops `makeWork` field contract · zero alias-pack / classification.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";

export const IK_OWNER_CREATE_A01_LP5_WORK_ID =
  "cc-w2-impregnacja-biobojcza-m2" as const;

/** WM Paczka V tender — Owner CREATE evidence SSOT. */
export const IK_OWNER_CREATE_A01_LP5_TENDER_ID =
  "08decd21-9cc2-012f-5fad-9500015f70fa" as const;

export const IK_OWNER_CREATE_A01_LP5_ALIAS_LP5 =
  "Impregnacja biobójcza ręczna m2 d.1.1 0103-01 Krotność = 2 .2 poz.4" as const;

export const IK_OWNER_CREATE_A01_LP5_ALIAS_LP10 =
  "Impregnacja biobójcza ręczna m2 d.1.1 0103-01 Krotność = 2 poz.8" as const;

/** Build CatalogWork draft — caller persists via saveWorkCatalogRouted / OPS seed. */
export function buildIkOwnerCreateA01Lp5CatalogWork(
  nowIso: string,
): CatalogWork {
  return {
    id: IK_OWNER_CREATE_A01_LP5_WORK_ID,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Impregnacja biobójcza ręczna",
    unit: "m2",
    companyPricePln: 22,
    updatedAt: nowIso,
    freshnessStatus: "ok",
    descriptionPl:
      "Impregnacja biobójcza ręczna powierzchni muru / podłoża (WM Paczka V LP5/LP10)",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0.6, laborRatio: 0.4 },
  };
}
