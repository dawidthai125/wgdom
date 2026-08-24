/**
 * IK-OWNER-CREATE-A01-LP4 — Owner-approved CatalogWork seed (WM Paczka VII LP9).
 * REUSE catalog-wave-2-ops `makeWork` field contract · zero alias-pack / classification.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";

export const IK_OWNER_CREATE_A01_LP4_WORK_ID =
  "cc-w2-oczyszczenie-podloza" as const;

/** WM Paczka VII tender — Owner CREATE evidence SSOT. */
export const IK_OWNER_CREATE_A01_LP4_TENDER_ID =
  "08decd1d-542e-312b-5fad-9500015f7011" as const;

export const IK_OWNER_CREATE_A01_LP4_ALIAS_LP9 =
  "Przygotowanie i naprawa podłoża-oczyszczenie powierzchni muru" as const;

/** Build CatalogWork draft — caller persists via saveWorkCatalogRouted / OPS seed. */
export function buildIkOwnerCreateA01Lp4CatalogWork(
  nowIso: string,
): CatalogWork {
  return {
    id: IK_OWNER_CREATE_A01_LP4_WORK_ID,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Oczyszczenie / zmywanie podłoża",
    unit: "m2",
    companyPricePln: 18,
    updatedAt: nowIso,
    freshnessStatus: "ok",
    descriptionPl: "Oczyszczenie i zmywanie podłoża / powierzchni muru",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0.6, laborRatio: 0.4 },
  };
}
