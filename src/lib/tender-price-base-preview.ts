/**
 * #5C-3B — prezentacja wierszy podglądu stawek w Ustawieniach wyceny.
 * Pure · bez I/O · mapuje adapted WgdomCostCatalog → wiersze tabeli UI.
 */

import {
  WGDOM_COST_CATEGORY_IDS,
  type WgdomCostCatalog,
  type WgdomCostCategoryId,
  type WgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";

export interface PriceBasePreviewRow {
  id: WgdomCostCategoryId;
  labelPl: string;
  unit: WgdomCostUnit;
  materialPlnPerUnit: number;
  laborRbhPerUnit: number;
}

/** Mapuje katalog z resolveActiveCatalogForTender() → wiersze tabeli (primary rate per kategoria). */
export function buildPriceBasePreviewRows(catalog: WgdomCostCatalog): PriceBasePreviewRow[] {
  return WGDOM_COST_CATEGORY_IDS.map((id) => {
    const cat = catalog.categories.find((c) => c.id === id);
    const primary = cat?.rates[0];
    return {
      id,
      labelPl: cat?.labelPl ?? id,
      unit: primary?.unit ?? "m2",
      materialPlnPerUnit: primary?.materialPlnPerUnit ?? 0,
      laborRbhPerUnit: primary?.laborRbhPerUnit ?? 0,
    };
  });
}
