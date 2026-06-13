/**
 * P2-G.1A — WGDOM Cost Catalog (MVP seed + chmura kw-wgdom-cost-catalog).
 * Źródło stawek materiałowych i norm rbh per kategoria × j.m. × region.
 */

export type WgdomCostCategoryId =
  | "ROZBIORKI"
  | "ROBOTY_OGOLNOBUDOWLANE"
  | "TRANSPORT_UTYLIZACJA"
  | "GK"
  | "GLADZIE_TYNKI"
  | "MALOWANIE"
  | "GLAZURA"
  | "PODLOGI"
  | "ELEKTRYKA"
  | "INSTALACJE_GAZ"
  | "INSTALACJE_CO"
  | "HYDRAULIKA"
  | "WENTYLACJA"
  | "STOLARKA"
  | "WYPOSAZENIE"
  | "UNKNOWN";

export type WgdomCostUnit = "m2" | "mb" | "szt" | "rbh" | "m3" | "kpl";

export type WgdomCostRegion = "wroclaw" | "dolnyslask";

/** Kolejność = priorytet klasyfikacji seed katalogu (P2-G.2C). */
export const WGDOM_COST_CATEGORY_IDS: WgdomCostCategoryId[] = [
  "ROZBIORKI",
  "ROBOTY_OGOLNOBUDOWLANE",
  "TRANSPORT_UTYLIZACJA",
  "GK",
  "GLADZIE_TYNKI",
  "MALOWANIE",
  "GLAZURA",
  "PODLOGI",
  "ELEKTRYKA",
  "INSTALACJE_GAZ",
  "INSTALACJE_CO",
  "HYDRAULIKA",
  "WENTYLACJA",
  "STOLARKA",
  "WYPOSAZENIE",
];

export interface WgdomCategoryRate {
  unit: WgdomCostUnit;
  materialPlnPerUnit: number;
  laborRbhPerUnit: number;
}

export interface WgdomCostCategoryDef {
  id: WgdomCostCategoryId;
  labelPl: string;
  rates: WgdomCategoryRate[];
  keywords: string[];
  marketRefNote?: string;
}

export interface WgdomUnknownFallback {
  materialPlnPerUnit: number;
  laborRbhPerUnit: number;
  defaultUnit: WgdomCostUnit;
}

export interface WgdomCostCatalog {
  schemaVersion: 1;
  region: WgdomCostRegion;
  regionMultiplier: number;
  categories: WgdomCostCategoryDef[];
  unknownFallback: WgdomUnknownFallback;
  updatedAt: string;
}

export interface WgdomCostCatalogStore {
  schemaVersion: 1;
  activeRegion: WgdomCostRegion;
  catalogs: Record<WgdomCostRegion, WgdomCostCatalog>;
  updatedAt?: string;
}

const REGION_MULTIPLIERS: Record<WgdomCostRegion, number> = {
  wroclaw: 1.0,
  dolnyslask: 0.92,
};

/** Bazowe definicje kategorii (kolejność = priorytet klasyfikacji katalogu). */
const BASE_CATEGORY_DEFS: Omit<WgdomCostCategoryDef, "id"> & { id: Exclude<WgdomCostCategoryId, "UNKNOWN"> }[] = [
  {
    id: "ROZBIORKI",
    labelPl: "Rozbiórki",
    rates: [
      { unit: "m2", materialPlnPerUnit: 3, laborRbhPerUnit: 0.14 },
      { unit: "mb", materialPlnPerUnit: 8, laborRbhPerUnit: 0.1 },
      { unit: "m3", materialPlnPerUnit: 25, laborRbhPerUnit: 0.35 },
    ],
    keywords: ["rozbior", "demonta", "wyburz", "skucie", "zdjec", "usuwanie", "sciagniecie tapety", "skuwanie tapety"],
  },
  {
    id: "ROBOTY_OGOLNOBUDOWLANE",
    labelPl: "Roboty ogólnobudowlane",
    rates: [
      { unit: "szt", materialPlnPerUnit: 25, laborRbhPerUnit: 0.45 },
      { unit: "mb", materialPlnPerUnit: 18, laborRbhPerUnit: 0.2 },
      { unit: "m2", materialPlnPerUnit: 12, laborRbhPerUnit: 0.18 },
    ],
    keywords: ["przebicie otwor", "przebicia otwor", "zamurowanie", "zamurowania", "zamurowanie przebic", "zagospodarowanie terenu", "zagospodarowanie dzialki", "nasadzenia", "trawnik", "pokrycie dachowe", "blachodachowka"],
    marketRefNote: "P2-G.2C — przebicia, zamurowania (WM/ZZK/MOPS pustostany)",
  },
  {
    id: "TRANSPORT_UTYLIZACJA",
    labelPl: "Transport i utylizacja",
    rates: [
      { unit: "m3", materialPlnPerUnit: 45, laborRbhPerUnit: 0.08 },
      { unit: "kpl", materialPlnPerUnit: 800, laborRbhPerUnit: 2.0 },
    ],
    keywords: ["gruz", "wywoz", "wywiezienie", "transport", "utyliz", "odpad", "kontener", "skladowisko", "zagospodarowanie odpad"],
    marketRefNote: "P2-G.2B — wywóz gruzu/odpadów (≠ rozbiórka)",
  },
  {
    id: "GK",
    labelPl: "Zabudowa GK",
    rates: [{ unit: "m2", materialPlnPerUnit: 14, laborRbhPerUnit: 0.28 }],
    keywords: ["g-k", "regips", "profil cd", "profil ud", "plyta gk", "sufit podwiesz", "zabudowa gk", "sciana dzialowa", "plyta g-k"],
    marketRefNote: "P2-G.2C — płyty GK, profile CD/UD, sufity (≠ gładzie/tynki)",
  },
  {
    id: "GLADZIE_TYNKI",
    labelPl: "Gładzie / tynki",
    rates: [
      /* MVP konserwatywne — wykończenie ścian m² */
      { unit: "m2", materialPlnPerUnit: 12, laborRbhPerUnit: 0.26 },
      /* narożniki, listwy — mb */
      { unit: "mb", materialPlnPerUnit: 8, laborRbhPerUnit: 0.12 },
    ],
    keywords: ["glad", "szpachl", "tynk", "listwa tynkar", "szlifowanie gladzi", "naroznik tynkar", "naroznik aluminiow"],
    marketRefNote: "P2-G.2C — gładzie, szpachlowanie, tynki, narożniki mb",
  },
  {
    id: "MALOWANIE",
    labelPl: "Malowanie",
    rates: [{ unit: "m2", materialPlnPerUnit: 8, laborRbhPerUnit: 0.16 }],
    keywords: ["malow", "emali", "farb", "gruntow", "tapet", "lakier"],
    marketRefNote: "Pakiet materiałowy średni — farba + grunt",
  },
  {
    id: "GLAZURA",
    labelPl: "Glazura / płytki",
    rates: [{ unit: "m2", materialPlnPerUnit: 45, laborRbhPerUnit: 0.42 }],
    keywords: ["glazur", "plytk", "kafel", "fugow", "hydroizol", "ceram"],
  },
  {
    id: "PODLOGI",
    labelPl: "Podłogi",
    rates: [
      { unit: "m2", materialPlnPerUnit: 55, laborRbhPerUnit: 0.32 },
      { unit: "mb", materialPlnPerUnit: 18, laborRbhPerUnit: 0.12 },
    ],
    keywords: ["podlog", "parkiet", "panele", "wykladzin", "posadzk", "wylewka"],
  },
  {
    id: "ELEKTRYKA",
    labelPl: "Elektryka",
    rates: [
      { unit: "szt", materialPlnPerUnit: 85, laborRbhPerUnit: 1.2 },
      { unit: "mb", materialPlnPerUnit: 22, laborRbhPerUnit: 0.18 },
      { unit: "rbh", materialPlnPerUnit: 0, laborRbhPerUnit: 1 },
    ],
    keywords: [
      "elektr", "gniazd", "wlacznik", "oswietl", "przewod", "rozdziel", "instalac.*elektr",
      "zerow", "pomiar", "protokol", "odbior instal", "skutecznosci zerowania",
    ],
  },
  {
    id: "INSTALACJE_GAZ",
    labelPl: "Instalacje gazowe",
    rates: [
      { unit: "szt", materialPlnPerUnit: 140, laborRbhPerUnit: 1.6 },
      { unit: "mb", materialPlnPerUnit: 42, laborRbhPerUnit: 0.28 },
      { unit: "rbh", materialPlnPerUnit: 0, laborRbhPerUnit: 1 },
    ],
    keywords: [
      "instalac.*gaz", "gazomier", "zawor gaz", "przylacze gaz", "rurociag.*gaz",
      "miedziane lutowane",
    ],
    marketRefNote: "P2-G.2C — instalacje gazowe (≠ wyposażenie AGD/kuchnia)",
  },
  {
    id: "INSTALACJE_CO",
    labelPl: "Instalacje centralnego ogrzewania",
    rates: [
      { unit: "szt", materialPlnPerUnit: 130, laborRbhPerUnit: 1.5 },
      { unit: "mb", materialPlnPerUnit: 38, laborRbhPerUnit: 0.24 },
      { unit: "rbh", materialPlnPerUnit: 0, laborRbhPerUnit: 1 },
    ],
    keywords: [
      "grzejnik", "grzejnikow", "grzejniki", "grzejnikowe",
      "konwektor", "drabinkow",
      "glowic.* termostat", "termostatycz",
      "zawor grzejnik", "zawor przelot", "przelotow", "zawor.* co",
      "instalac.* co", "instalac.* c.o", "centralne ogrzew", "uklad co", "uklad c.o",
      "napelnienie instal", "spuszczenie wod", "odpowietrzenie instalacji co",
      "ogrzewanie wodne", "wymiana grzejnik", "montaz grzejnik", "regulacja instalacji co",
    ],
    marketRefNote: "P2-G.2D — C.O. WM/ZZK/MOPS (≠ wod-kan HYDRAULIKA)",
  },
  {
    id: "HYDRAULIKA",
    labelPl: "Hydraulika / wod-kan",
    rates: [
      { unit: "szt", materialPlnPerUnit: 120, laborRbhPerUnit: 1.5 },
      { unit: "mb", materialPlnPerUnit: 35, laborRbhPerUnit: 0.22 },
      { unit: "rbh", materialPlnPerUnit: 0, laborRbhPerUnit: 1 },
    ],
    keywords: [
      "hydrau", "rura", "rurociag", "kanaliz", "wod-kan", "wodociag", "armatur", "wc", "sanit",
      "instalac.*wod", "bateri", "umywalk", "zlewozmywak", "ustep", "miska ustep", "polipropylen",
      "thermaflex", "zawor czerpal", "podejscie doplyw", "pvc",
    ],
  },
  {
    id: "WENTYLACJA",
    labelPl: "Wentylacja",
    rates: [
      { unit: "szt", materialPlnPerUnit: 65, laborRbhPerUnit: 0.8 },
      { unit: "mb", materialPlnPerUnit: 35, laborRbhPerUnit: 0.15 },
    ],
    keywords: ["wentyl", "kratk", "nawiew", "wywiew", "anemostat", "kanal wentyl"],
    marketRefNote: "P2-G.2B — kratki, nawiewniki",
  },
  {
    id: "STOLARKA",
    labelPl: "Stolarka",
    rates: [
      { unit: "szt", materialPlnPerUnit: 450, laborRbhPerUnit: 2.5 },
      { unit: "mb", materialPlnPerUnit: 95, laborRbhPerUnit: 0.35 },
    ],
    keywords: ["drzwi", "okno", "osciezn", "stolark", "montaz drzwi", "montaz okien"],
  },
  {
    id: "WYPOSAZENIE",
    labelPl: "Wyposażenie pomocnicze",
    rates: [
      /* MVP — tabliczki, oznaczenia; niski materiał, krótki rbh */
      { unit: "szt", materialPlnPerUnit: 15, laborRbhPerUnit: 0.3 },
      { unit: "kpl", materialPlnPerUnit: 120, laborRbhPerUnit: 1.0 },
    ],
    keywords: [
      "tabliczk", "oznaczen", "oznakow", "numeracja pomieszczen", "etykiet", "wyposazen",
      "kuchni gaz", "kuchnia gaz", "piekarnik", "agd",
    ],
    marketRefNote: "P2-G.2C — tabliczki, oznaczenia; kuchnie gazowe / AGD (≠ instalacja gazowa)",
  },
];

const DEFAULT_UNKNOWN_FALLBACK: WgdomUnknownFallback = {
  materialPlnPerUnit: 15,
  laborRbhPerUnit: 0.2,
  defaultUnit: "m2",
};

export function defaultWgdomCostCatalog(region: WgdomCostRegion = "wroclaw"): WgdomCostCatalog {
  return {
    schemaVersion: 1,
    region,
    regionMultiplier: REGION_MULTIPLIERS[region],
    categories: BASE_CATEGORY_DEFS.map((c) => ({ ...c, rates: c.rates.map((r) => ({ ...r })) })),
    unknownFallback: { ...DEFAULT_UNKNOWN_FALLBACK },
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}

export function defaultWgdomCostCatalogStore(): WgdomCostCatalogStore {
  return {
    schemaVersion: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: defaultWgdomCostCatalog("wroclaw"),
      dolnyslask: defaultWgdomCostCatalog("dolnyslask"),
    },
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}

/** Reguły klasyfikacji — keywords z seed katalogu (kolejność = priorytet). */
export function getCatalogClassificationRules(
  catalog: WgdomCostCatalog = defaultWgdomCostCatalog(),
): { id: WgdomCostCategoryId; keywords: string[] }[] {
  return catalog.categories.map((c) => ({ id: c.id, keywords: c.keywords }));
}

export function findCategoryDef(
  catalog: WgdomCostCatalog,
  categoryId: WgdomCostCategoryId,
): WgdomCostCategoryDef | null {
  if (categoryId === "UNKNOWN") return null;
  return catalog.categories.find((c) => c.id === categoryId) ?? null;
}

/** Normalizacja j.m. z ATH do kanonicznej WgdomCostUnit. */
export function normalizeWgdomCostUnit(raw: string | undefined | null): WgdomCostUnit | null {
  if (!raw?.trim()) return null;
  const u = raw.toLowerCase().replace(/\s/g, "").replace("²", "2");
  if (/^(m2|m²|mp)$/.test(u)) return "m2";
  if (/^(mb|m\.b\.|mb\.|m)$/.test(u)) return "mb";
  if (/^(szt|szt\.|kpl|kompl)$/.test(u)) return "szt";
  if (/^(rbh|r[\s-]?bh|r[\s-]?g|h|godz|m[gh]|rob(?:\.|-)?g(?:\.|-)?h)$/.test(u)) return "rbh";
  if (/^(m3|m³)$/.test(u)) return "m3";
  return null;
}

/**
 * Stawka kategorii × j.m. z uwzględnieniem mnożnika regionu (materiał).
 * Norma rbh bez mnożnika regionu.
 */
export function getCategoryRate(
  catalog: WgdomCostCatalog,
  categoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
): WgdomCategoryRate | null {
  const def = findCategoryDef(catalog, categoryId);
  const base = def?.rates.find((r) => r.unit === unit) ?? null;
  if (!base) return null;
  return {
    unit: base.unit,
    materialPlnPerUnit: base.materialPlnPerUnit * catalog.regionMultiplier,
    laborRbhPerUnit: base.laborRbhPerUnit,
  };
}

/** Fallback rate dla UNKNOWN lub braku dopasowania j.m. */
export function getUnknownFallbackRate(catalog: WgdomCostCatalog): WgdomCategoryRate {
  const fb = catalog.unknownFallback;
  return {
    unit: fb.defaultUnit,
    materialPlnPerUnit: fb.materialPlnPerUnit * catalog.regionMultiplier,
    laborRbhPerUnit: fb.laborRbhPerUnit,
  };
}
