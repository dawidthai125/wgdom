/**
 * PRICE-PATH-01 — product CatalogWork host specs (structure only).
 * ZERO invent PLN — Quotes/Purchase only after Owner Accept / explicit apply with real prices.
 */

import { mapMaterialToMarketWork } from "@/lib/pricing-expert/material-market-map";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

/** Structural ensure timestamp (not a price approval). */
export const ECONOMY_PRODUCT_HOSTS_ENSURED_AT = "2026-08-11T00:00:00.000Z";

export interface EconomyProductHostSpec {
  materialKey: string;
  catalogWorkId: string;
  marketProductId: string;
  /** MUST match BOM consumption unit. */
  unit: Extract<WgdomCostUnit, "l" | "kg">;
  namePl: string;
  workNamePl: string;
}

/**
 * Locked DF hosts — exact identity, no fuzzy, no alternate workId, no PLN.
 */
export const ECONOMY_PRODUCT_HOST_SPECS: readonly EconomyProductHostSpec[] = [
  {
    materialKey: "mat.grunt",
    catalogWorkId: "cw.product.grunt",
    marketProductId: "mp.grunt",
    unit: "l",
    namePl: "Grunt podłoża",
    workNamePl: "Grunt podłoża (product host)",
  },
  {
    materialKey: "mat.farba_lateksowa_wewnetrzna",
    catalogWorkId: "cw.product.farba_lateksowa_wewnetrzna",
    marketProductId: "mp.farba_lateksowa_wewnetrzna",
    unit: "l",
    namePl: "Farba lateksowa wewnętrzna",
    workNamePl: "Farba lateksowa wewnętrzna (product host)",
  },
  {
    materialKey: "mat.jastrych_cementowy",
    catalogWorkId: "cw.product.jastrych_cementowy",
    marketProductId: "mp.jastrych_cementowy",
    unit: "kg",
    namePl: "Jastrych / posadzka cementowa",
    workNamePl: "Jastrych cementowy (product host)",
  },
] as const;

export function economyProductHostByMaterialKey(
  materialKey: string,
): EconomyProductHostSpec | null {
  const key = String(materialKey || "").trim();
  return ECONOMY_PRODUCT_HOST_SPECS.find((s) => s.materialKey === key) ?? null;
}

/** Map alignment guard — identity must match material-market-map. */
export function assertEconomyProductHostsMapAligned(): void {
  for (const s of ECONOMY_PRODUCT_HOST_SPECS) {
    const map = mapMaterialToMarketWork(s.materialKey);
    if (!map) {
      throw new Error(`PRICE-PATH-01: brak mapy dla ${s.materialKey}`);
    }
    if (map.workId !== s.catalogWorkId) {
      throw new Error(
        `PRICE-PATH-01: workId mismatch ${s.materialKey}: map=${map.workId} host=${s.catalogWorkId}`,
      );
    }
    if (map.marketProductId && map.marketProductId !== s.marketProductId) {
      throw new Error(
        `PRICE-PATH-01: marketProductId mismatch ${s.materialKey}`,
      );
    }
  }
}
