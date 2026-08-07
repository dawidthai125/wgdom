/**
 * P0.1 — cienkie mapowanie materialKey → workId (Market Quotes).
 * Nie jest drugim silnikiem Quotes.
 */

import type { MaterialMarketMapEntry } from "./types";

/** Seed P0 — klucze fixtures ETICS / kostka → wirtualne workId pod testy i P0. */
export const DEFAULT_MATERIAL_MARKET_MAP: readonly MaterialMarketMapEntry[] = [
  {
    materialKey: "mat.eps_graph",
    workId: "wc.market.eps_graph",
    marketProductId: "mp.eps_graph",
    labelPl: "Płyta EPS grafit (rynek)",
  },
  {
    materialKey: "mat.glue_etics",
    workId: "wc.market.glue_etics",
    marketProductId: "mp.glue_etics",
    labelPl: "Klej ETICS (rynek)",
  },
  {
    materialKey: "mat.mesh",
    workId: "wc.market.mesh",
    marketProductId: "mp.mesh",
    labelPl: "Siatka zbrojąca (rynek)",
  },
  {
    materialKey: "mat.render",
    workId: "wc.market.render",
    marketProductId: "mp.render",
    labelPl: "Tynk mineralny (rynek)",
  },
  {
    materialKey: "mat.cubes_beton",
    workId: "wc.market.cubes_beton",
    marketProductId: "mp.cubes_beton",
    labelPl: "Kostka betonowa (rynek)",
  },
  {
    materialKey: "mat.sand",
    workId: "wc.market.sand",
    marketProductId: "mp.sand",
    labelPl: "Piasek podsypkowy (rynek)",
  },
];

export function buildMaterialMarketMapIndex(
  entries: readonly MaterialMarketMapEntry[] = DEFAULT_MATERIAL_MARKET_MAP,
): Map<string, MaterialMarketMapEntry> {
  const m = new Map<string, MaterialMarketMapEntry>();
  for (const e of entries) {
    m.set(e.materialKey, e);
  }
  return m;
}

export function mapMaterialToMarketWork(
  materialKey: string,
  index: Map<string, MaterialMarketMapEntry> = buildMaterialMarketMapIndex(),
): MaterialMarketMapEntry | null {
  return index.get(materialKey) ?? null;
}
