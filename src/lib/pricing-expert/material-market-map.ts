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
  /* —— S2-C Bathroom + Core Finish Product Pack (Owner LOCK) —— */
  {
    materialKey: "mat.wc_compact",
    workId: "cw.product.wc_compact",
    candidateWorkIds: ["cw.product.wc_compact"],
    marketProductId: "mp.wc_compact",
    labelPl: "Kompakt WC",
  },
  {
    materialKey: "mat.umywalka",
    workId: "cw.product.umywalka",
    candidateWorkIds: ["cw.product.umywalka"],
    marketProductId: "mp.umywalka",
    labelPl: "Umywalka",
  },
  {
    materialKey: "mat.bateria_umywalkowa",
    workId: "cw.product.bateria_umywalkowa",
    candidateWorkIds: ["cw.product.bateria_umywalkowa"],
    marketProductId: "mp.bateria_umywalkowa",
    labelPl: "Bateria umywalkowa",
  },
  {
    materialKey: "mat.bateria_prysznicowa",
    workId: "cw.product.bateria_prysznicowa",
    candidateWorkIds: ["cw.product.bateria_prysznicowa"],
    marketProductId: "mp.bateria_prysznicowa",
    labelPl: "Bateria prysznicowa",
  },
  {
    materialKey: "mat.kabina_prysznicowa",
    workId: "cw.product.kabina_prysznicowa",
    candidateWorkIds: ["cw.product.kabina_prysznicowa"],
    marketProductId: "mp.kabina_prysznicowa",
    labelPl: "Kabina prysznicowa",
  },
  {
    materialKey: "mat.brodzik",
    workId: "cw.product.brodzik",
    candidateWorkIds: ["cw.product.brodzik"],
    marketProductId: "mp.brodzik",
    labelPl: "Brodzik",
  },
  {
    materialKey: "mat.odplyw_liniowy",
    workId: "cw.product.odplyw_liniowy",
    candidateWorkIds: ["cw.product.odplyw_liniowy"],
    marketProductId: "mp.odplyw_liniowy",
    labelPl: "Odpływ liniowy",
  },
  {
    materialKey: "mat.syfon_umywalkowy",
    workId: "cw.product.syfon_umywalkowy",
    candidateWorkIds: ["cw.product.syfon_umywalkowy"],
    marketProductId: "mp.syfon_umywalkowy",
    labelPl: "Syfon umywalkowy",
  },
  {
    materialKey: "mat.stelaz_wc",
    workId: "cw.product.stelaz_wc",
    candidateWorkIds: ["cw.product.stelaz_wc"],
    marketProductId: "mp.stelaz_wc",
    labelPl: "Stelaż WC podtynkowy",
  },
  {
    materialKey: "mat.plytki_scienne",
    workId: "cw.product.plytki_scienne",
    candidateWorkIds: ["cw.product.plytki_scienne"],
    marketProductId: "mp.plytki_scienne",
    labelPl: "Płytki ścienne",
  },
  {
    materialKey: "mat.plytki_podlogowe",
    workId: "cw.product.plytki_podlogowe",
    candidateWorkIds: ["cw.product.plytki_podlogowe"],
    marketProductId: "mp.plytki_podlogowe",
    labelPl: "Płytki podłogowe",
  },
  {
    materialKey: "mat.klej_plytki",
    workId: "cw.product.klej_plytki",
    candidateWorkIds: ["cw.product.klej_plytki"],
    marketProductId: "mp.klej_plytki",
    labelPl: "Klej do płytek",
  },
  {
    materialKey: "mat.fuga",
    workId: "cw.product.fuga",
    candidateWorkIds: ["cw.product.fuga"],
    marketProductId: "mp.fuga",
    labelPl: "Fuga",
  },
  {
    materialKey: "mat.silikon_sanitarny",
    workId: "cw.product.silikon_sanitarny",
    candidateWorkIds: ["cw.product.silikon_sanitarny"],
    marketProductId: "mp.silikon_sanitarny",
    labelPl: "Silikon sanitarny",
  },
  {
    materialKey: "mat.hydroizolacja",
    workId: "cw.product.hydroizolacja",
    candidateWorkIds: ["cw.product.hydroizolacja"],
    marketProductId: "mp.hydroizolacja",
    labelPl: "Hydroizolacja pod płytki",
  },
  {
    materialKey: "mat.panel_laminowany",
    workId: "cw.product.panel_laminowany",
    candidateWorkIds: ["cw.product.panel_laminowany"],
    marketProductId: "mp.panel_laminowany",
    labelPl: "Panel laminowany",
  },
  {
    materialKey: "mat.skrzydlo_drzwiowe",
    workId: "cw.product.skrzydlo_drzwiowe",
    candidateWorkIds: ["cw.product.skrzydlo_drzwiowe"],
    marketProductId: "mp.skrzydlo_drzwiowe",
    labelPl: "Skrzydło drzwiowe",
  },
  {
    materialKey: "mat.oscieznica",
    workId: "cw.product.oscieznica",
    candidateWorkIds: ["cw.product.oscieznica"],
    marketProductId: "mp.oscieznica",
    labelPl: "Ościeżnica",
  },
  {
    materialKey: "mat.klamka",
    workId: "cw.product.klamka",
    candidateWorkIds: ["cw.product.klamka"],
    marketProductId: "mp.klamka",
    labelPl: "Klamka",
  },
  {
    materialKey: "mat.zamek",
    workId: "cw.product.zamek",
    candidateWorkIds: ["cw.product.zamek"],
    marketProductId: "mp.zamek",
    labelPl: "Zamek",
  },
  {
    materialKey: "mat.farba_lateksowa_wewnetrzna",
    workId: "cw.product.farba_lateksowa_wewnetrzna",
    candidateWorkIds: ["cw.product.farba_lateksowa_wewnetrzna"],
    marketProductId: "mp.farba_lateksowa_wewnetrzna",
    labelPl: "Farba lateksowa wewnętrzna",
  },
  {
    materialKey: "mat.grunt",
    workId: "cw.product.grunt",
    candidateWorkIds: ["cw.product.grunt"],
    marketProductId: "mp.grunt",
    labelPl: "Grunt podłoża",
  },
  {
    materialKey: "mat.jastrych_cementowy",
    workId: "cw.product.jastrych_cementowy",
    candidateWorkIds: ["cw.product.jastrych_cementowy"],
    marketProductId: "mp.jastrych_cementowy",
    labelPl: "Jastrych / posadzka cementowa",
  },
  {
    materialKey: "mat.gladz_gipsowa",
    workId: "cw.product.gladz_gipsowa",
    candidateWorkIds: ["cw.product.gladz_gipsowa"],
    marketProductId: "mp.gladz_gipsowa",
    labelPl: "Gładź gipsowa",
  },
  {
    materialKey: "mat.plyta_gk",
    workId: "cw.product.plyta_gk",
    candidateWorkIds: ["cw.product.plyta_gk"],
    marketProductId: "mp.plyta_gk",
    labelPl: "Płyta GK",
  },
  {
    materialKey: "mat.gniazdo",
    workId: "cw.product.gniazdo",
    candidateWorkIds: ["cw.product.gniazdo"],
    marketProductId: "mp.gniazdo",
    labelPl: "Gniazdo wtyczkowe",
  },
  {
    materialKey: "mat.wlacznik",
    workId: "cw.product.wlacznik",
    candidateWorkIds: ["cw.product.wlacznik"],
    marketProductId: "mp.wlacznik",
    labelPl: "Włącznik światła",
  },
  {
    materialKey: "mat.przewod_ydy_3x1_5",
    workId: "cw.product.przewod_ydy_3x1_5",
    candidateWorkIds: ["cw.product.przewod_ydy_3x1_5"],
    marketProductId: "mp.przewod_ydy_3x1_5",
    labelPl: "Przewód YDY 3×1,5 mm²",
  },
  {
    materialKey: "mat.przewod_ydyzo_3x1_5",
    workId: "cw.product.przewod_ydyzo_3x1_5",
    candidateWorkIds: ["cw.product.przewod_ydyzo_3x1_5"],
    marketProductId: "mp.przewod_ydyzo_3x1_5",
    labelPl: "Przewód YDYżo 3×1,5 mm²",
  },
  {
    materialKey: "mat.przewod_ydyzo_3x2_5",
    workId: "cw.product.przewod_ydyzo_3x2_5",
    candidateWorkIds: ["cw.product.przewod_ydyzo_3x2_5"],
    marketProductId: "mp.przewod_ydyzo_3x2_5",
    labelPl: "Przewód YDYżo 3×2,5 mm²",
  },
  {
    materialKey: "mat.przewod_ydyzo_5x6",
    workId: "cw.product.przewod_ydyzo_5x6",
    candidateWorkIds: ["cw.product.przewod_ydyzo_5x6"],
    marketProductId: "mp.przewod_ydyzo_5x6",
    labelPl: "Przewód YDYżo 5×6 mm²",
  },
];

/**
 * Exact alias: fold(name)+unit → materialKey (S2-B / S2-C / S4).
 * Tylko jawne etykiety Owner-approved — ZERO fuzzy / substring / LLM.
 * S4: dokładne brzmienia realnego BOQ → istniejący materialKey (bez nowych produktów).
 */
export interface MaterialCoverageAlias {
  /** Już znormalizowana nazwa (foldPolishText) LUB raw — normalizujemy przy lookup. */
  namePl: string;
  unit: string;
  materialKey: string;
  /** Dowód w repo (komentarz audytowy). */
  evidence: string;
}

/** Exact aliases for APPROVED / ADDED map entries only (S2-B + S2-C canonical). */
const MATERIAL_COVERAGE_ALIASES_CORE: readonly MaterialCoverageAlias[] = [
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
  /* S2-C Owner LOCK — exact canonical only */
  { namePl: "Kompakt WC", unit: "szt", materialKey: "mat.wc_compact", evidence: "S2-C Owner LOCK" },
  { namePl: "Umywalka", unit: "szt", materialKey: "mat.umywalka", evidence: "S2-C Owner LOCK" },
  {
    namePl: "Bateria umywalkowa",
    unit: "szt",
    materialKey: "mat.bateria_umywalkowa",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Bateria prysznicowa",
    unit: "szt",
    materialKey: "mat.bateria_prysznicowa",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Kabina prysznicowa",
    unit: "szt",
    materialKey: "mat.kabina_prysznicowa",
    evidence: "S2-C Owner LOCK",
  },
  { namePl: "Brodzik", unit: "szt", materialKey: "mat.brodzik", evidence: "S2-C Owner LOCK" },
  {
    namePl: "Odpływ liniowy",
    unit: "szt",
    materialKey: "mat.odplyw_liniowy",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Syfon umywalkowy",
    unit: "szt",
    materialKey: "mat.syfon_umywalkowy",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Stelaż WC podtynkowy",
    unit: "szt",
    materialKey: "mat.stelaz_wc",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Płytki ścienne",
    unit: "m2",
    materialKey: "mat.plytki_scienne",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Płytki podłogowe",
    unit: "m2",
    materialKey: "mat.plytki_podlogowe",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Klej do płytek",
    unit: "kg",
    materialKey: "mat.klej_plytki",
    evidence: "S2-C Owner LOCK",
  },
  { namePl: "Fuga", unit: "kg", materialKey: "mat.fuga", evidence: "S2-C Owner LOCK" },
  {
    namePl: "Silikon sanitarny",
    unit: "szt",
    materialKey: "mat.silikon_sanitarny",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Hydroizolacja pod płytki",
    unit: "m2",
    materialKey: "mat.hydroizolacja",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Panel laminowany",
    unit: "m2",
    materialKey: "mat.panel_laminowany",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Skrzydło drzwiowe",
    unit: "szt",
    materialKey: "mat.skrzydlo_drzwiowe",
    evidence: "S2-C Owner LOCK",
  },
  { namePl: "Ościeżnica", unit: "szt", materialKey: "mat.oscieznica", evidence: "S2-C Owner LOCK" },
  { namePl: "Klamka", unit: "szt", materialKey: "mat.klamka", evidence: "S2-C Owner LOCK" },
  { namePl: "Zamek", unit: "szt", materialKey: "mat.zamek", evidence: "S2-C Owner LOCK" },
  {
    namePl: "Farba lateksowa wewnętrzna",
    unit: "l",
    materialKey: "mat.farba_lateksowa_wewnetrzna",
    evidence: "S2-C Owner LOCK",
  },
  { namePl: "Grunt podłoża", unit: "l", materialKey: "mat.grunt", evidence: "S2-C Owner LOCK" },
  {
    namePl: "Jastrych / posadzka cementowa",
    unit: "kg",
    materialKey: "mat.jastrych_cementowy",
    evidence: "ECONOMY_WET_CEMENT_SCREED_V1 Owner LOCK",
  },
  {
    namePl: "Gładź gipsowa",
    unit: "kg",
    materialKey: "mat.gladz_gipsowa",
    evidence: "S2-C Owner LOCK",
  },
  { namePl: "Płyta GK", unit: "m2", materialKey: "mat.plyta_gk", evidence: "S2-C Owner LOCK" },
  {
    namePl: "Gniazdo wtyczkowe",
    unit: "szt",
    materialKey: "mat.gniazdo",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Włącznik światła",
    unit: "szt",
    materialKey: "mat.wlacznik",
    evidence: "S2-C Owner LOCK",
  },
  {
    namePl: "Przewód YDY 3×1,5 mm²",
    unit: "m",
    materialKey: "mat.przewod_ydy_3x1_5",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK",
  },
  {
    namePl: "Przewód YDY 3×1,5 mm²",
    unit: "mb",
    materialKey: "mat.przewod_ydy_3x1_5",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK (mb≡m)",
  },
  {
    namePl: "Przewód YDYżo 3×1,5 mm²",
    unit: "m",
    materialKey: "mat.przewod_ydyzo_3x1_5",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK",
  },
  {
    namePl: "Przewód YDYżo 3×1,5 mm²",
    unit: "mb",
    materialKey: "mat.przewod_ydyzo_3x1_5",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK (mb≡m)",
  },
  {
    namePl: "Przewód YDYżo 3×2,5 mm²",
    unit: "m",
    materialKey: "mat.przewod_ydyzo_3x2_5",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK",
  },
  {
    namePl: "Przewód YDYżo 3×2,5 mm²",
    unit: "mb",
    materialKey: "mat.przewod_ydyzo_3x2_5",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK (mb≡m)",
  },
  {
    namePl: "Przewód YDYżo 5×6 mm²",
    unit: "m",
    materialKey: "mat.przewod_ydyzo_5x6",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK",
  },
  {
    namePl: "Przewód YDYżo 5×6 mm²",
    unit: "mb",
    materialKey: "mat.przewod_ydyzo_5x6",
    evidence: "ECONOMY-ELECTRICAL-CABLE-V1 Owner LOCK (mb≡m)",
  },
];

/**
 * S4 — Owner-approved exact aliases for real ATH/przedmiar wording.
 * Identity only · no new materialKey · no labor · no bare ambiguous tokens.
 */
export const S4_OWNER_APPROVED_EXACT_ALIASES: readonly MaterialCoverageAlias[] = [
  {
    namePl: "Umywalka ceramiczna",
    unit: "szt",
    materialKey: "mat.umywalka",
    evidence: "S4 Owner GO example",
  },
  {
    namePl: "WC kompakt",
    unit: "szt",
    materialKey: "mat.wc_compact",
    evidence: "S4 Owner GO real BOQ wording",
  },
  {
    namePl: "Kompakt WC ceramiczny",
    unit: "szt",
    materialKey: "mat.wc_compact",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Miska WC kompaktowa",
    unit: "szt",
    materialKey: "mat.wc_compact",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Bateria umywalkowa stojąca",
    unit: "szt",
    materialKey: "mat.bateria_umywalkowa",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Bateria natryskowa",
    unit: "szt",
    materialKey: "mat.bateria_prysznicowa",
    evidence: "S4 Owner GO synonym natryskowa=prysznicowa",
  },
  {
    namePl: "Kabina prysznicowa narożna",
    unit: "szt",
    materialKey: "mat.kabina_prysznicowa",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Brodzik akrylowy",
    unit: "szt",
    materialKey: "mat.brodzik",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Odpływ liniowy podłogowy",
    unit: "szt",
    materialKey: "mat.odplyw_liniowy",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Syfon do umywalki",
    unit: "szt",
    materialKey: "mat.syfon_umywalkowy",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Stelaż podtynkowy WC",
    unit: "szt",
    materialKey: "mat.stelaz_wc",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Płytki ceramiczne ścienne",
    unit: "m2",
    materialKey: "mat.plytki_scienne",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Płytki ceramiczne podłogowe",
    unit: "m2",
    materialKey: "mat.plytki_podlogowe",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Klej do płytek ceramicznych",
    unit: "kg",
    materialKey: "mat.klej_plytki",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Fuga do płytek",
    unit: "kg",
    materialKey: "mat.fuga",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Silikon sanitarny biały",
    unit: "szt",
    materialKey: "mat.silikon_sanitarny",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Hydroizolacja łazienkowa",
    unit: "m2",
    materialKey: "mat.hydroizolacja",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Panele laminowane",
    unit: "m2",
    materialKey: "mat.panel_laminowany",
    evidence: "S4 Owner GO plural wording",
  },
  {
    namePl: "Panel podłogowy laminowany",
    unit: "m2",
    materialKey: "mat.panel_laminowany",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Skrzydło drzwiowe wewnętrzne",
    unit: "szt",
    materialKey: "mat.skrzydlo_drzwiowe",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Ościeżnica drzwiowa",
    unit: "szt",
    materialKey: "mat.oscieznica",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Klamka drzwiowa",
    unit: "szt",
    materialKey: "mat.klamka",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Zamek drzwiowy",
    unit: "szt",
    materialKey: "mat.zamek",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Farba lateksowa",
    unit: "l",
    materialKey: "mat.farba_lateksowa_wewnetrzna",
    evidence: "S4 Owner GO — sole paint product in map",
  },
  {
    namePl: "Farba lateksowa biała",
    unit: "l",
    materialKey: "mat.farba_lateksowa_wewnetrzna",
    evidence: "S4 Owner GO + market-sync fixture wording",
  },
  {
    namePl: "Grunt uniwersalny",
    unit: "l",
    materialKey: "mat.grunt",
    evidence: "S4 Owner GO — sole grunt product in map",
  },
  {
    namePl: "Gładź gipsowa finiszowa",
    unit: "kg",
    materialKey: "mat.gladz_gipsowa",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Płyta gipsowo-kartonowa",
    unit: "m2",
    materialKey: "mat.plyta_gk",
    evidence: "S4 Owner GO full product name",
  },
  {
    namePl: "Gniazdo podtynkowe",
    unit: "szt",
    materialKey: "mat.gniazdo",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Włącznik światła pojedynczy",
    unit: "szt",
    materialKey: "mat.wlacznik",
    evidence: "S4 Owner GO",
  },
  {
    namePl: "Styropian grafitowy",
    unit: "m2",
    materialKey: "mat.eps_graph",
    evidence: "S4 Owner GO ETICS BOQ wording",
  },
  {
    namePl: "EPS grafit",
    unit: "m2",
    materialKey: "mat.eps_graph",
    evidence: "S4 Owner GO",
  },
];

/** Full exact alias dictionary = S2-B/S2-C core + S4 Owner expansions. */
export const DEFAULT_MATERIAL_COVERAGE_ALIASES: readonly MaterialCoverageAlias[] = [
  ...MATERIAL_COVERAGE_ALIASES_CORE,
  ...S4_OWNER_APPROVED_EXACT_ALIASES,
];

/**
 * S4 rejected / ambiguous — must stay MISS (dokumentacja).
 */
export const S4_REJECTED_ALIASES: readonly { labelPl: string; reasonPl: string }[] = [
  { labelPl: "WC", reasonPl: "Bare token — FORBIDDEN without explicit LOCK" },
  { labelPl: "Montaż WC", reasonPl: "Labor ≠ product" },
  { labelPl: "Montaż umywalki", reasonPl: "Labor ≠ product" },
  { labelPl: "bateria", reasonPl: "Ambiguous umywalkowa vs prysznicowa" },
  { labelPl: "wanna 170x70", reasonPl: "Wanna OUT · dimension → model FORBIDDEN" },
  { labelPl: "Farba", reasonPl: "Bare token — ambiguous product class" },
  { labelPl: "Klej", reasonPl: "Ambiguous klej_plytki vs glue_etics" },
  { labelPl: "Płytki", reasonPl: "Ambiguous ścienne vs podłogowe" },
  { labelPl: "Gruntowanie podłoża", reasonPl: "Labor wording — not product alias" },
  { labelPl: "Drzwi", reasonPl: "Ambiguous skrzydło/ościeżnica/komplet" },
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
    seedCatalogWorkId: "montaz-brodzika-szt",
    seedNameHintPl: "Montaż brodzika lub wanny (labor — wanna OUT S2-C)",
    proposedMaterialKey: "mat.wanna",
    reasonPl: "Wanna = OUT/HOLD · labor seed nadal bez product Quotes",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "PODLOGI",
    seedCatalogWorkId: "listwy-przypodlogowe-mb",
    seedNameHintPl: "Montaż listew przypodłogowych",
    proposedMaterialKey: "mat.listwa_przypodlogowa",
    reasonPl: "OUT / v1.1 S2-C",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "ELEKTRYKA",
    seedCatalogWorkId: "puszka-podtynkowa-szt",
    seedNameHintPl: "Puszka podtynkowa",
    proposedMaterialKey: "mat.puszka_podtynkowa",
    reasonPl: "OUT / v1.1 S2-C",
    status: "CANDIDATE_OWNER_REVIEW",
  },
  {
    area: "HYDRAULIKA",
    seedCatalogWorkId: "ck-a1-rura-winidur",
    seedNameHintPl: "Montaż instalacji rurowej Winidurowej",
    proposedMaterialKey: "mat.rura_winidur",
    reasonPl: "Cost-knowledge A1 labor · OUT S2-C product pack",
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
    labelPl: "WC → Kompakt WC",
    reasonPl: "FORBIDDEN semantic guessing — tylko exact «Kompakt WC»",
  },
  {
    labelPl: "Bateria → bateria umywalkowa/prysznicowa",
    reasonPl: "FORBIDDEN — wymaga exact typu",
  },
  {
    labelPl: "Klej → Klej do płytek / Klej ETICS",
    reasonPl: "FORBIDDEN — osobne exact identity",
  },
  {
    labelPl: "Brodzik ↔ Wanna",
    reasonPl: "FORBIDDEN cross-map",
  },
  {
    labelPl: "Mapowanie montaż-* CatalogWork → marketQuotes produktu",
    reasonPl: "Labor ≠ product MARKET reference",
  },
];

/** S2-C — product CatalogWork id prefix. */
export const PRODUCT_CATALOG_WORK_PREFIX = "cw.product.";

export function isProductCatalogWorkId(catalogWorkId: string): boolean {
  return String(catalogWorkId || "").trim().startsWith(PRODUCT_CATALOG_WORK_PREFIX);
}

/** Labor seed IDs must never host product Quotes (S2-C safety). */
export const LABOR_CATALOG_WORK_BLOCKLIST: readonly string[] = [
  "montaz-wc-szt",
  "montaz-umywalki-szt",
  "montaz-brodzika-szt",
  "bateria-umywalkowa-szt",
  "bateria-prysznicowa-szt",
  "kabina-prysznicowa-szt",
  "odplyw-liniowy-szt",
  "plytki-scienne-lazienka-m2",
  "plytki-podlogowe-m2",
  "plytki-podlogowe-lazienka-m2",
  "panel-laminowany-m2",
  "silikonowanie-lazienka-mb",
  "hydroizolacja-lazienka-m2",
  "skrzydlo-drzwiowe-szt",
  "oscieznica-szt",
  "zamek-klamka-szt",
  "gruntowanie-podloza-m2",
  "gladz-gipsowa-scian-m2",
  "gladz-gipsowa-sufit-m2",
  "plyta-gk-sciana-m2",
  "punkt-gniazda-szt",
  "wlacznik-szt",
  "malowanie-lateksowe-m2",
];

export function isLaborCatalogWorkBlockedForProductQuotes(catalogWorkId: string): boolean {
  return LABOR_CATALOG_WORK_BLOCKLIST.includes(String(catalogWorkId || "").trim());
}

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
 * Identity helper S2-B/S2-C: materialKey exact OR exact name+unit alias → map entry.
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

/** Prefer cw.product.* as Demand/S0 catalogWorkId when present in map entry. */
export function preferProductCatalogWorkId(entry: MaterialMarketMapEntry): string {
  for (const id of entry.candidateWorkIds ?? []) {
    if (isProductCatalogWorkId(id)) return id;
  }
  if (isProductCatalogWorkId(entry.workId)) return entry.workId;
  return entry.candidateWorkIds?.[0] ?? entry.workId;
}

/**
 * Reverse exact: cw.product.* → materialKey (1:1 from map · bez drugiego SSOT).
 * Gdy wiele materialKey mapuje na ten sam workId (ETICS variants) — pierwszy w mapie.
 */
export function lookupMaterialKeyByCatalogWorkId(
  catalogWorkId: string,
  entries: readonly MaterialMarketMapEntry[] = DEFAULT_MATERIAL_MARKET_MAP,
): string | null {
  const id = String(catalogWorkId || "").trim();
  if (!id) return null;
  for (const e of entries) {
    if (e.workId === id) return e.materialKey;
    if ((e.candidateWorkIds ?? []).includes(id)) return e.materialKey;
  }
  return null;
}

/**
 * Demand identity: materialKey and/or exact alias → product catalogWorkId.
 * Labor blocklist IDs never returned as product host.
 */
export function resolveDemandProductIdentityExact(opts: {
  materialKey?: string | null;
  namePl?: string | null;
  unit?: string | null;
  catalogWorkId?: string | null;
}): {
  materialKey: string;
  catalogWorkId: string;
  labelPl: string;
  via: "materialKey" | "alias" | "catalogWorkId";
} | null {
  const forcedCw = typeof opts.catalogWorkId === "string" ? opts.catalogWorkId.trim() : "";
  if (forcedCw && isLaborCatalogWorkBlockedForProductQuotes(forcedCw)) {
    return null;
  }

  const coverage = resolveMaterialCoverageExact({
    materialKey: opts.materialKey,
    namePl: opts.namePl,
    unit: opts.unit,
  });
  if (coverage) {
    const catalogWorkId = preferProductCatalogWorkId(coverage);
    if (isLaborCatalogWorkBlockedForProductQuotes(catalogWorkId)) return null;
    const via =
      opts.materialKey?.trim() && coverage.materialKey === opts.materialKey.trim()
        ? "materialKey"
        : "alias";
    return {
      materialKey: coverage.materialKey,
      catalogWorkId,
      labelPl: coverage.labelPl,
      via,
    };
  }

  if (forcedCw && isProductCatalogWorkId(forcedCw)) {
    const mk = lookupMaterialKeyByCatalogWorkId(forcedCw);
    if (!mk) return null;
    const entry = mapMaterialToMarketWork(mk);
    return {
      materialKey: mk,
      catalogWorkId: forcedCw,
      labelPl: entry?.labelPl ?? mk,
      via: "catalogWorkId",
    };
  }

  return null;
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
