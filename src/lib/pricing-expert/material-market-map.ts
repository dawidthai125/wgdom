/**
 * P0.1 — cienkie mapowanie materialKey → workId (Market Quotes).
 * PRICE-INTELLIGENCE-01 P2 — coverage: seed workId + real catalogWorkId candidates.
 * Nie jest drugim silnikiem Quotes · SSOT = CatalogWork.marketQuotes.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { MaterialMarketMapEntry } from "./types";

/** Seed P0 + P2 candidates (real TF catalogWorkId + legacy test wc.market.*). */
export const DEFAULT_MATERIAL_MARKET_MAP: readonly MaterialMarketMapEntry[] = [
  {
    materialKey: "mat.eps_graph",
    workId: "wc.market.eps_graph",
    candidateWorkIds: ["cw.etics.boards", "wc.market.eps_graph"],
    marketProductId: "mp.eps_graph",
    labelPl: "Płyta EPS grafit (rynek)",
  },
  {
    materialKey: "mat.glue_etics",
    workId: "wc.market.glue_etics",
    candidateWorkIds: ["cw.etics.substrate", "cw.etics.boards", "wc.market.glue_etics"],
    marketProductId: "mp.glue_etics",
    labelPl: "Klej ETICS (rynek)",
  },
  {
    materialKey: "mat.mesh",
    workId: "wc.market.mesh",
    candidateWorkIds: ["cw.etics.mesh", "wc.market.mesh"],
    marketProductId: "mp.mesh",
    labelPl: "Siatka zbrojąca (rynek)",
  },
  {
    materialKey: "mat.render",
    workId: "wc.market.render",
    candidateWorkIds: ["cw.etics.render", "wc.market.render"],
    marketProductId: "mp.render",
    labelPl: "Tynk mineralny (rynek)",
  },
  {
    materialKey: "mat.cubes_beton",
    workId: "wc.market.cubes_beton",
    candidateWorkIds: ["cw.paving.cubes", "wc.market.cubes_beton"],
    marketProductId: "mp.cubes_beton",
    labelPl: "Kostka betonowa (rynek)",
  },
  {
    materialKey: "mat.sand",
    workId: "wc.market.sand",
    candidateWorkIds: ["cw.paving.base", "wc.market.sand"],
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

function workHasMarketQuotes(work: CatalogWork | null | undefined): work is CatalogWork {
  if (!work?.marketQuotes || typeof work.marketQuotes !== "object") return false;
  return Object.keys(work.marketQuotes).length > 0;
}

function labelTokens(labelPl: string): string[] {
  return foldPolishText(labelPl || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4);
}

/**
 * P2 — materialKey → real CatalogWork z marketQuotes (bez wymyślania ceny).
 * Kolejność: candidateWorkIds / workId → soft label overlap w katalogu.
 */
export function resolveMaterialMarketCoverage(
  materialKey: string,
  worksById: ReadonlyMap<string, CatalogWork>,
  index: Map<string, MaterialMarketMapEntry> = buildMaterialMarketMapIndex(),
): { map: MaterialMarketMapEntry; work: CatalogWork } | null {
  const map = mapMaterialToMarketWork(materialKey, index);
  if (!map) return null;

  const tried = new Set<string>();
  const tryId = (id: string): CatalogWork | null => {
    const key = String(id || "").trim();
    if (!key || tried.has(key)) return null;
    tried.add(key);
    const work = worksById.get(key) ?? null;
    return workHasMarketQuotes(work) ? work : null;
  };

  for (const id of map.candidateWorkIds ?? []) {
    const work = tryId(id);
    if (work) {
      return { map: { ...map, workId: work.id }, work };
    }
  }
  {
    const work = tryId(map.workId);
    if (work) return { map: { ...map, workId: work.id }, work };
  }

  // Soft coverage: istniejący work z Quotes, nazwa ≈ label mapy (nie invent price)
  const tokens = labelTokens(map.labelPl);
  if (tokens.length === 0) return null;
  let best: CatalogWork | null = null;
  let bestHits = 0;
  for (const work of worksById.values()) {
    if (!workHasMarketQuotes(work)) continue;
    if (tried.has(work.id)) continue;
    const name = foldPolishText(work.namePl || "");
    const kw = (work.keywords ?? []).map((k) => foldPolishText(String(k))).join(" ");
    const hay = `${name} ${kw}`;
    let hits = 0;
    for (const t of tokens) {
      if (hay.includes(t)) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      best = work;
    }
  }
  // Wymagaj ≥2 tokenów albo 1 gdy label ma tylko 1 istotny token
  const need = tokens.length >= 2 ? 2 : 1;
  if (best && bestHits >= need) {
    return { map: { ...map, workId: best.id }, work: best };
  }

  return null;
}
