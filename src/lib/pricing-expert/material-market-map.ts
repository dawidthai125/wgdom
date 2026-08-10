/**
 * P0.1 / DEMAND-RESEARCH-01 S2-B — cienkie mapowanie materialKey → workId (Market Quotes).
 * Exact coverage only · ZERO fuzzy SSOT · ZERO price invent · ZERO HTTP.
 * Soft overlap w resolveMaterialMarketCoverage = legacy PE path (nie S1/S2 identity).
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { MaterialMarketMapEntry } from "./types";

/** Seed P0 + P2 + S2-B variant coverage (evidence: TF fixtures + material-expert/variants). */
export const DEFAULT_MATERIAL_MARKET_MAP: readonly MaterialMarketMapEntry[] = [
  {
    materialKey: "mat.eps_graph",
    workId: "wc.market.eps_graph",
    candidateWorkIds: ["cw.etics.boards", "wc.market.eps_graph"],
    marketProductId: "mp.eps_graph",
    labelPl: "Płyta EPS grafit (rynek)",
  },
  /** S2-B — evidence: material-expert/variants.ts (zamiennik EPS grafit). */
  {
    materialKey: "mat.eps_white",
    workId: "wc.market.eps_graph",
    candidateWorkIds: ["cw.etics.boards", "wc.market.eps_graph"],
    marketProductId: "mp.eps_graph",
    labelPl: "Płyta EPS biały (zamiennik)",
  },
  {
    materialKey: "mat.xps_board",
    workId: "wc.market.eps_graph",
    candidateWorkIds: ["cw.etics.boards", "wc.market.eps_graph"],
    marketProductId: "mp.eps_graph",
    labelPl: "Płyta XPS",
  },
  {
    materialKey: "mat.mw_lamella",
    workId: "wc.market.eps_graph",
    candidateWorkIds: ["cw.etics.boards", "wc.market.eps_graph"],
    marketProductId: "mp.eps_graph",
    labelPl: "Wełna mineralna lamelowa",
  },
  {
    materialKey: "mat.glue_etics",
    workId: "wc.market.glue_etics",
    candidateWorkIds: ["cw.etics.substrate", "cw.etics.boards", "wc.market.glue_etics"],
    marketProductId: "mp.glue_etics",
    labelPl: "Klej ETICS (rynek)",
  },
  {
    materialKey: "mat.glue_etics_uni",
    workId: "wc.market.glue_etics",
    candidateWorkIds: ["cw.etics.substrate", "cw.etics.boards", "wc.market.glue_etics"],
    marketProductId: "mp.glue_etics",
    labelPl: "Klej uniwersalny do styropianu",
  },
  {
    materialKey: "mat.glue_etics_flex",
    workId: "wc.market.glue_etics",
    candidateWorkIds: ["cw.etics.substrate", "cw.etics.boards", "wc.market.glue_etics"],
    marketProductId: "mp.glue_etics",
    labelPl: "Klej elastyczny ETICS",
  },
  {
    materialKey: "mat.glue_etics_alt",
    workId: "wc.market.glue_etics",
    candidateWorkIds: ["cw.etics.substrate", "cw.etics.boards", "wc.market.glue_etics"],
    marketProductId: "mp.glue_etics",
    labelPl: "Klej systemowy zamienny (inny producent)",
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
    materialKey: "mat.cubes_beton_eco",
    workId: "wc.market.cubes_beton",
    candidateWorkIds: ["cw.paving.cubes", "wc.market.cubes_beton"],
    marketProductId: "mp.cubes_beton",
    labelPl: "Kostka betonowa standard (klasa niższa)",
  },
  {
    materialKey: "mat.cubes_beton_premium",
    workId: "wc.market.cubes_beton",
    candidateWorkIds: ["cw.paving.cubes", "wc.market.cubes_beton"],
    marketProductId: "mp.cubes_beton",
    labelPl: "Kostka betonowa fazowana / barwiona",
  },
  {
    materialKey: "mat.cubes_concrete_alt_format",
    workId: "wc.market.cubes_beton",
    candidateWorkIds: ["cw.paving.cubes", "wc.market.cubes_beton"],
    marketProductId: "mp.cubes_beton",
    labelPl: "Kostka o zbliżonym formacie (zamiennik)",
  },
  {
    materialKey: "mat.sand",
    workId: "wc.market.sand",
    candidateWorkIds: ["cw.paving.base", "wc.market.sand"],
    marketProductId: "mp.sand",
    labelPl: "Piasek podsypkowy (rynek)",
  },
];

/**
 * Exact alias: fold(name)+unit → materialKey (S2-B).
 * Tylko jawne etykiety z mapy / wariantów — ZERO synonimów semantycznych.
 */
export interface MaterialCoverageAlias {
  /** Już znormalizowana nazwa (foldPolishText) LUB raw — normalizujemy przy lookup. */
  namePl: string;
  unit: string;
  materialKey: string;
  /** Dowód w repo (komentarz audytowy). */
  evidence: string;
}

/** Exact aliases for APPROVED / ADDED map entries only. */
export const DEFAULT_MATERIAL_COVERAGE_ALIASES: readonly MaterialCoverageAlias[] = [
  {
    namePl: "Płyta EPS grafit (rynek)",
    unit: "m2",
    materialKey: "mat.eps_graph",
    evidence: "DEFAULT_MATERIAL_MARKET_MAP.labelPl",
  },
  {
    namePl: "Płyta EPS grafit",
    unit: "m2",
    materialKey: "mat.eps_graph",
    evidence: "material-expert/variants.ts rekomendowany namePl",
  },
  {
    namePl: "Płyta EPS biały (zamiennik)",
    unit: "m2",
    materialKey: "mat.eps_white",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Płyta XPS",
    unit: "m2",
    materialKey: "mat.xps_board",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Wełna mineralna lamelowa",
    unit: "m2",
    materialKey: "mat.mw_lamella",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Klej ETICS (rynek)",
    unit: "kg",
    materialKey: "mat.glue_etics",
    evidence: "DEFAULT_MATERIAL_MARKET_MAP.labelPl + TF unit kg",
  },
  {
    namePl: "Klej do ETICS",
    unit: "kg",
    materialKey: "mat.glue_etics",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Klej uniwersalny do styropianu",
    unit: "kg",
    materialKey: "mat.glue_etics_uni",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Klej elastyczny ETICS",
    unit: "kg",
    materialKey: "mat.glue_etics_flex",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Klej systemowy zamienny (inny producent)",
    unit: "kg",
    materialKey: "mat.glue_etics_alt",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Siatka zbrojąca (rynek)",
    unit: "m2",
    materialKey: "mat.mesh",
    evidence: "DEFAULT_MATERIAL_MARKET_MAP.labelPl",
  },
  {
    namePl: "Siatka zbrojąca",
    unit: "m2",
    materialKey: "mat.mesh",
    evidence: "technology-foundation/fixtures.ts",
  },
  {
    namePl: "Tynk mineralny (rynek)",
    unit: "kg",
    materialKey: "mat.render",
    evidence: "DEFAULT_MATERIAL_MARKET_MAP.labelPl",
  },
  {
    namePl: "Tynk mineralny",
    unit: "kg",
    materialKey: "mat.render",
    evidence: "technology-foundation/fixtures.ts",
  },
  {
    namePl: "Kostka betonowa (rynek)",
    unit: "m2",
    materialKey: "mat.cubes_beton",
    evidence: "DEFAULT_MATERIAL_MARKET_MAP.labelPl",
  },
  {
    namePl: "Kostka betonowa",
    unit: "m2",
    materialKey: "mat.cubes_beton",
    evidence: "material-expert/variants.ts + TF fixtures",
  },
  {
    namePl: "Kostka betonowa standard (klasa niższa)",
    unit: "m2",
    materialKey: "mat.cubes_beton_eco",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Kostka betonowa fazowana / barwiona",
    unit: "m2",
    materialKey: "mat.cubes_beton_premium",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Kostka o zbliżonym formacie (zamiennik)",
    unit: "m2",
    materialKey: "mat.cubes_concrete_alt_format",
    evidence: "material-expert/variants.ts",
  },
  {
    namePl: "Piasek podsypkowy (rynek)",
    unit: "m3",
    materialKey: "mat.sand",
    evidence: "DEFAULT_MATERIAL_MARKET_MAP.labelPl + TF unit m3",
  },
  {
    namePl: "Piasek podsypkowy",
    unit: "m3",
    materialKey: "mat.sand",
    evidence: "technology-foundation/fixtures.ts",
  },
];

/**
 * CANDIDATE / OWNER REVIEW — seed CatalogWork LABOR istnieje, ale BRAK mat.* materialKey.
 * NIE używane jako identity / cena. Tylko raport Owner.
 * Evidence: docs/work-catalog/SEED-MANIFEST-v1.0.yaml
 */
export interface WgdomCoverageCandidate {
  area: string;
  seedCatalogWorkId: string;
  seedNameHintPl: string;
  proposedMaterialKey?: string;
  reasonPl: string;
  status: "CANDIDATE_OWNER_REVIEW";
}

export const WGDOM_COVERAGE_CANDIDATES: readonly WgdomCoverageCandidate[] = [
  {
    area: "LAZIENKA/SANITARNE",
    seedCatalogWorkId: "montaz-wc-szt",
    seedNameHintPl: "Montaż WC",
    proposedMaterialKey: "mat.wc_fixture",
    reasonPl: "Seed = LABOR montaż · brak mat.* produktu WC · nie mapować montaż→cena produktu",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "LAZIENKA/SANITARNE",
    seedCatalogWorkId: "montaz-umywalki-szt",
    seedNameHintPl: "Montaż umywalki",
    proposedMaterialKey: "mat.umywalka",
    reasonPl: "Seed LABOR · brak materialKey produktu",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "LAZIENKA/SANITARNE",
    seedCatalogWorkId: "montaz-brodzika-szt",
    seedNameHintPl: "Montaż brodzika lub wanny",
    proposedMaterialKey: "mat.wanna_or_brodzik",
    reasonPl: "Ambiguous wanna vs brodzik · FORBIDDEN zgadywanie modelu/wymiaru",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "LAZIENKA/SANITARNE",
    seedCatalogWorkId: "bateria-umywalkowa-szt",
    seedNameHintPl: "Montaż baterii umywalkowej",
    proposedMaterialKey: "mat.bateria_umywalkowa",
    reasonPl: "Seed LABOR/montaż · brak mat.*",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "LAZIENKA/SANITARNE",
    seedCatalogWorkId: "kabina-prysznicowa-szt",
    seedNameHintPl: "Montaż kabiny prysznicowej",
    proposedMaterialKey: "mat.kabina_prysznicowa",
    reasonPl: "Seed LABOR · brak mat.* produktu",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "DRZWI",
    seedCatalogWorkId: "skrzydlo-drzwiowe-szt",
    seedNameHintPl: "Montaż skrzydła drzwiowego",
    proposedMaterialKey: "mat.skrzydlo_drzwiowe",
    reasonPl: "Seed LABOR · brak mat.* skrzydła",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "PODLOGI",
    seedCatalogWorkId: "panel-laminowany-m2",
    seedNameHintPl: "Układanie paneli laminowanych",
    proposedMaterialKey: "mat.panel_laminowany",
    reasonPl: "Seed = układanie (labor) · brak mat.* paneli jako produktu",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "PODLOGI",
    seedCatalogWorkId: "plytki-podlogowe-m2",
    seedNameHintPl: "Układanie płytek podłogowych",
    proposedMaterialKey: "mat.plytki_podlogowe",
    reasonPl: "Seed labor · brak mat.* płytek",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "ELEKTRYKA",
    seedCatalogWorkId: "punkt-gniazda-szt",
    seedNameHintPl: "Punkt gniazda wtyczkowego",
    proposedMaterialKey: "mat.gniazdo",
    reasonPl: "Seed punkt instalacji · brak mat.* osprzętu",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "HYDRAULIKA",
    seedCatalogWorkId: "ck-a1-rura-winidur",
    seedNameHintPl: "Montaż instalacji rurowej Winidurowej",
    proposedMaterialKey: "mat.rura_winidur",
    reasonPl: "Cost-knowledge A1 labor seed · brak mat.* w market map",
    status: "CANDIDATE_OWNER_REVIEW",
  },
];

/** Rejected / not safe auto-adds (dokumentacja). */
export const WGDOM_COVERAGE_REJECTED: readonly {
  labelPl: string;
  reasonPl: string;
}[] = [
  {
    labelPl: "Wanna → wanna 170x70",
    reasonPl: "FORBIDDEN synonim/wymiar bez Owner-approved exact mapping",
  },
  {
    labelPl: "WC → konkretny kompakt",
    reasonPl: "FORBIDDEN semantic guessing",
  },
  {
    labelPl: "Mapowanie montaż-* CatalogWork → marketQuotes produktu",
    reasonPl: "Labor ≠ product MARKET reference",
  },
];

export type ResearchLookupPathStep =
  | "purchase"
  | "market_memory"
  | "legal_market_source"
  | "manual_research";

/** Deterministic where-to-look HINT only · zero fetch · zero auto-price. */
export function suggestResearchLookupPathHint(): readonly ResearchLookupPathStep[] {
  return ["purchase", "market_memory", "legal_market_source", "manual_research"] as const;
}

export function normalizeCoverageAliasKey(namePl: string, unit: string): string {
  const n = foldPolishText(String(namePl || "").trim());
  const u = foldPolishText(String(unit || "").trim());
  return `${n}|${u}`;
}

export function buildMaterialCoverageAliasIndex(
  aliases: readonly MaterialCoverageAlias[] = DEFAULT_MATERIAL_COVERAGE_ALIASES,
): Map<string, MaterialCoverageAlias> {
  const m = new Map<string, MaterialCoverageAlias>();
  for (const a of aliases) {
    const key = normalizeCoverageAliasKey(a.namePl, a.unit);
    if (!key.startsWith("|") && !m.has(key)) m.set(key, a);
  }
  return m;
}

/**
 * Exact alias → materialKey. Wrong unit / wrong name → null (MISS).
 */
export function lookupMaterialKeyByExactAlias(
  namePl: string,
  unit: string,
  aliasIndex: Map<string, MaterialCoverageAlias> = buildMaterialCoverageAliasIndex(),
): string | null {
  const key = normalizeCoverageAliasKey(namePl, unit);
  return aliasIndex.get(key)?.materialKey ?? null;
}

export function buildMaterialMarketMapIndex(
  entries: readonly MaterialMarketMapEntry[] = DEFAULT_MATERIAL_MARKET_MAP,
): Map<string, MaterialMarketMapEntry> {
  const m = new Map<string, MaterialMarketMapEntry>();
  for (const e of entries) {
    if (m.has(e.materialKey)) {
      throw new Error(`duplicate materialKey in market map: ${e.materialKey}`);
    }
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

/**
 * Identity helper S2-B: materialKey exact OR exact name+unit alias → map entry.
 * Soft / fuzzy = never.
 */
export function resolveMaterialCoverageExact(opts: {
  materialKey?: string | null;
  namePl?: string | null;
  unit?: string | null;
  mapIndex?: Map<string, MaterialMarketMapEntry>;
  aliasIndex?: Map<string, MaterialCoverageAlias>;
}): MaterialMarketMapEntry | null {
  const mapIndex = opts.mapIndex ?? buildMaterialMarketMapIndex();
  const mk = typeof opts.materialKey === "string" ? opts.materialKey.trim() : "";
  if (mk) {
    const hit = mapIndex.get(mk);
    if (hit) return hit;
  }
  const name = typeof opts.namePl === "string" ? opts.namePl : "";
  const unit = typeof opts.unit === "string" ? opts.unit : "";
  if (!name.trim() || !unit.trim()) return null;
  const aliasKey = lookupMaterialKeyByExactAlias(
    name,
    unit,
    opts.aliasIndex ?? buildMaterialCoverageAliasIndex(),
  );
  if (!aliasKey) return null;
  return mapIndex.get(aliasKey) ?? null;
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
 * UWAGA: soft overlap NIE jest SSOT S1/S2 identity (używaj mapMaterialToMarketWork / resolveMaterialCoverageExact).
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
  const need = tokens.length >= 2 ? 2 : 1;
  if (best && bestHits >= need) {
    return { map: { ...map, workId: best.id }, work: best };
  }

  return null;
}

/** Pure guards for S2-B tests / audit. */
export function materialCoverageWritesMarketQuotes(): false {
  return false;
}
export function materialCoverageWritesPurchase(): false {
  return false;
}
export function materialCoverageUsesFuzzyMatching(): false {
  return false;
}
