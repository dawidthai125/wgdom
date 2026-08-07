/**
 * CATALOG-WAVE-2 — Alias Pack MED (8 reguł).
 * DF: CATALOG-WAVE-2-DESIGN-FREEZE · TOP100 only · wąskie frazy · OUT service/noise/BIZ.
 * Kolejność ewaluacji w Resolverze: Wave1 → ten pack (first match).
 */

export type CatalogCoverageAliasWave2RuleId =
  | "przebijanie_otworow"
  | "mocowanie_aparatow"
  | "przygotowanie_pod_osprzet"
  | "wykwity_zacieki"
  | "oczyszczenie_podloza"
  | "plyta_gk_zabudowa"
  | "zawor_odcinajacy_15"
  | "wykucie_wnek";

/** Product IDs reserved Wave 2 (DATA FIRST seed). */
export const CATALOG_WAVE2_PRODUCT_IDS = {
  przebijanie_otworow: "cc-w2-przebijanie-otworow",
  mocowanie_aparatow: "cc-w2-mocowanie-aparatow",
  przygotowanie_pod_osprzet: "cc-w2-przygotowanie-osprzet",
  wykwity_zacieki: "cc-w2-wykwity-zacieki",
  oczyszczenie_podloza: "cc-w2-oczyszczenie-podloza",
  plyta_gk_zabudowa: "cc-w2-plyta-gk-zabudowa",
  zawor_odcinajacy_15: "cc-w2-zawor-odcinajacy",
  wykucie_wnek: "cc-w2-wykucie-wnek",
} as const;

export const CATALOG_WAVE2_PRODUCT_ID_SET: ReadonlySet<string> = new Set(
  Object.values(CATALOG_WAVE2_PRODUCT_IDS),
);

export function isCatalogWave2ProductId(id: string | null | undefined): boolean {
  return !!id && CATALOG_WAVE2_PRODUCT_ID_SET.has(id);
}

/**
 * OUT-BIZ / OUT-SERVICE hay (DF) — zakaz bindu na cc-w2-* Alias i Core.
 * Wąskie: podokienniki · lekka-mokra/docieplenie · Winidur · gzyms · warstwa odcinająca (piasek).
 */
export function isCatalogWave2OutBizHay(foldedHay: string): boolean {
  if (!foldedHay) return false;
  return (
    /podokiennik/.test(foldedHay) ||
    /lekka-?mokr/.test(foldedHay) ||
    /docieplen/.test(foldedHay) ||
    /winidur/.test(foldedHay) ||
    /gzyms/.test(foldedHay) ||
    /warstwa\s+odcinajac/.test(foldedHay)
  );
}

export interface CatalogCoverageAliasWave2PackRule {
  order: number;
  aliasRuleId: CatalogCoverageAliasWave2RuleId;
  labelPl: string;
  productId: string;
  test: (foldedHay: string) => boolean;
}

/**
 * Alias Pack Wave 2 MED — SSOT.
 * order lokalny 1…8; w combined pack idzie po Wave1.
 */
export const CATALOG_COVERAGE_WAVE2_PACK: readonly CatalogCoverageAliasWave2PackRule[] = [
  {
    order: 1,
    aliasRuleId: "przebijanie_otworow",
    labelPl: "Przebijanie otworów w ścianach/stropach",
    productId: CATALOG_WAVE2_PRODUCT_IDS.przebijanie_otworow,
    // TOP100: „Mechaniczne przebijanie otworów…” — nie gołe „otwór”
    test: (h) => /przebijan\w*\s+otwor/.test(h),
  },
  {
    order: 2,
    aliasRuleId: "mocowanie_aparatow",
    labelPl: "Mocowanie aparatów / osprzętu na gotowym podłożu",
    productId: CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow,
    // TOP100: mocowanie aparatów · przykręcanie · montaż na gotowym podłożu (puszki/przyciski/haczyki/aparaty)
    test: (h) =>
      /mocowanie\s+(na\s+gotowym\.?\s*)?podloz\w*.*aparat/.test(h) ||
      /mocowanie\s+.*\saparat\w*.*otwor\w*\s+mocuj/.test(h) ||
      /przykrecanie\s+drobnych\s+elementow\s+konstrukcji/.test(h) ||
      /montaz\s+na\s+gotowym\.?\s*podloz/.test(h) ||
      /montaz\s+aparat\w*/.test(h),
  },
  {
    order: 3,
    aliasRuleId: "przygotowanie_pod_osprzet",
    labelPl: "Przygotowanie podłoża pod aparaty / osprzęt (kołki, ślepe otwory)",
    productId: CATALOG_WAVE2_PRODUCT_IDS.przygotowanie_pod_osprzet,
    test: (h) =>
      /przygotowanie\s+podloza\s+do\s+zabudowania\s+aparat/.test(h) ||
      /przygotowanie\s+podloza\s+pod\s+mocowanie\s+osprzet/.test(h) ||
      /przygotowanie\s+podloza\s+pod\s+montaz\s+(koryt|puszek)/.test(h) ||
      /slepe\w*\s+otwor\w*.*cegl/.test(h) ||
      /(reczne|mechaniczne)\s+wykonanie\s+slep\w*\s+otwor/.test(h),
  },
  {
    order: 4,
    aliasRuleId: "wykwity_zacieki",
    labelPl: "Skasowanie wykwitów / zacieków",
    productId: CATALOG_WAVE2_PRODUCT_IDS.wykwity_zacieki,
    test: (h) => /skasowanie\s+wykwit|wykwit\w*\s*\(?\s*zaciek|usuniecie\s+wykwit/.test(h),
  },
  {
    order: 5,
    aliasRuleId: "oczyszczenie_podloza",
    labelPl: "Oczyszczenie / zmywanie podłoża",
    productId: CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza,
    // OUT-BIZ: docieplenie / lekka-mokra — zakaz
    // DF §2.2: kategoria IN obejmuje też impregnację (TOP100 przeciwsolna/biobójcza)
    test: (h) => {
      if (/lekka-?mokr|docieplen/.test(h)) return false;
      return (
        /oczyszczenie\s+i\s+zmyw\w*\s+podloza/.test(h) ||
        /oczyszczenie\s+(i\s+zmyci\w*\s+)?podloza/.test(h) ||
        /oczyszczenie\s+(i\s+naprawa\s+)?podloza/.test(h) ||
        /oczyszczenie\s+powierzchni\s+(muru|scian)/.test(h) ||
        /przygotowanie\s+i\s+naprawa\s+podloza.*oczyszczen/.test(h) ||
        /zmyw\w*\s+podloz/.test(h) ||
        /zmyci\w*\s+podloz/.test(h) ||
        /impregnacj\w*\s+(przeciwsol|bioboj)/.test(h)
      );
    },
  },
  {
    order: 6,
    aliasRuleId: "plyta_gk_zabudowa",
    labelPl: "Obudowa GK belek / słupów",
    productId: CATALOG_WAVE2_PRODUCT_IDS.plyta_gk_zabudowa,
    test: (h) =>
      /obudowa\s+(belek|slupow|podciag\w*).*gipsowo-?karton/.test(h) ||
      /obudowa\s+elementow\s+konstrukcji\s+plytami\s+gipsowo/.test(h) ||
      /plytami\s+gipsowo-?\s*kartonowymi\s+na\s+rusztach/.test(h),
  },
  {
    order: 7,
    aliasRuleId: "zawor_odcinajacy_15",
    labelPl: "Zawory odcinające pod mywalką / zlewem / bojlerem",
    productId: CATALOG_WAVE2_PRODUCT_IDS.zawor_odcinajacy_15,
    // nie odpowietrzający (Wave1)
    test: (h) =>
      /zawor\w*\s*\/?\s*pod\s+(mywalk|zlew|bojler)/.test(h) && !/odpowietrz/.test(h),
  },
  {
    order: 8,
    aliasRuleId: "wykucie_wnek",
    labelPl: "Wykucie wnęk w murze",
    productId: CATALOG_WAVE2_PRODUCT_IDS.wykucie_wnek,
    // OUT BIZ: podokienniki — zakaz
    test: (h) => /wykucie\s+wnek/.test(h) && !/podokiennik/.test(h),
  },
];

export const CATALOG_COVERAGE_WAVE2_RULE_IDS: readonly CatalogCoverageAliasWave2RuleId[] =
  CATALOG_COVERAGE_WAVE2_PACK.map((r) => r.aliasRuleId);

/** Combined SSOT: Wave1 then Wave2 (DF kolejność). */
export function buildCatalogCoverageAliasPackCombined<
  T extends { order: number; aliasRuleId: string; labelPl: string; productId: string; test: (h: string) => boolean },
>(wave1: readonly T[], wave2: readonly T[] = CATALOG_COVERAGE_WAVE2_PACK as readonly T[]): readonly T[] {
  return [...wave1, ...wave2];
}
