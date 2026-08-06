/**
 * NG-TENDERS-COST-KNOWLEDGE-01 A1 — FEATURE-DATA seed specs (TOP Library Gap).
 * EXTEND FIRST · multi-word keywords · no bare tokens (false-map hygiene).
 * Pure data — ops script applies via WC store + commitMarketQuotesImport.
 */

export interface CostKnowledgeA1WorkSpec {
  id: string;
  tradeId: string;
  namePl: string;
  unit: string;
  companyPricePln: number;
  descriptionPl: string;
  keywords: string[];
  /** Gap group from CATALOG-COVERAGE AUDIT. */
  gapGroup: string;
}

/**
 * TOP Library Gap seed — Hydraulika / Elewacje / Przygotowanie / Rozbiórki / Elektryka.
 * IDs prefix `ck-a1-` — nie kolidują z cc-p0c-*.
 */
export const COST_KNOWLEDGE_A1_SEED_WORKS: readonly CostKnowledgeA1WorkSpec[] = [
  {
    id: "ck-a1-rura-winidur",
    tradeId: "HYDRAULIKA",
    namePl: "Montaż instalacji rurowej Winidurowej",
    unit: "mb",
    companyPricePln: 48,
    descriptionPl: "Montaż instalacji z rur Winidurowych w bruzdzie",
    keywords: ["rura winidur", "rury winidur", "instalacja winidur"],
    gapGroup: "HYDRAULIKA_CO",
  },
  {
    id: "ck-a1-gzyms-elewacyjny",
    tradeId: "PRZYGOTOWANIE",
    namePl: "Montaż / naprawa gzymsu elewacyjnego",
    unit: "mb",
    companyPricePln: 95,
    descriptionPl: "Montaż lub naprawa gzymsu elewacyjnego",
    keywords: ["gzyms elewacyjny", "naprawa gzymsu", "montaż gzymsu"],
    gapGroup: "ELEWACJE_OCIEPLENIA",
  },
  {
    id: "ck-a1-impregnacja-podloza",
    tradeId: "PRZYGOTOWANIE",
    namePl: "Warstwa gruntująca podłoża przed posadzką",
    unit: "m2",
    companyPricePln: 18,
    descriptionPl: "Gruntowanie podłoża przed posadzką / izolacją",
    keywords: ["impregnacja podłoża", "impregnacja podloza", "zagruntowanie podłoża"],
    gapGroup: "PRZYGOTOWANIE_PODLOZA",
  },
  {
    id: "ck-a1-demontaz-pieca-kaflowego",
    tradeId: "ROZBIORKI",
    namePl: "Demontaż pieca kaflowego",
    unit: "szt",
    companyPricePln: 650,
    descriptionPl: "Demontaż / rozebranie pieca kaflowego",
    keywords: ["demontaż pieca kaflowego", "rozebranie pieca kaflowego", "demontaz pieca kaflowego"],
    gapGroup: "ROZBIORKI",
  },
  {
    id: "ck-a1-kolki-montazowe-elektryczne",
    tradeId: "ELEKTRYKA",
    namePl: "Mocowanie instalacji elektrycznej kołkami montażowymi",
    unit: "szt",
    companyPricePln: 3.5,
    descriptionPl: "Mocowanie instalacji elektrycznej kołkami montażowymi",
    keywords: ["kołki montażowe elektryczne", "kolki montazowe elektryczne", "mocowanie kołkami elektryka"],
    gapGroup: "ELEKTRYKA_TELETECH",
  },
] as const;

export const COST_KNOWLEDGE_A1_SEED_IDS = COST_KNOWLEDGE_A1_SEED_WORKS.map((w) => w.id);

/** Bare tokens forbidden as sole keyword (false-map). */
export const COST_KNOWLEDGE_A1_BANNED_BARE = [
  "winidur",
  "gzyms",
  "impregnacja",
  "piec",
  "kołki",
  "kolki",
  "rura",
  "folia",
  "bruzd",
] as const;

export function assertCostKnowledgeA1KeywordHygiene(spec: CostKnowledgeA1WorkSpec): void {
  for (const kw of spec.keywords) {
    const fold = kw
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    const tokens = fold.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
      throw new Error(`A1 hygiene: keyword must be multi-word: "${kw}" (${spec.id})`);
    }
  }
  // Name/description: no standalone banned bare token (mapper scores name tokens ≥4 chars).
  const surface = `${spec.namePl} ${spec.descriptionPl}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const surfaceTokens = new Set(surface.split(/[^a-z0-9]+/).filter((t) => t.length >= 4));
  for (const bare of COST_KNOWLEDGE_A1_BANNED_BARE) {
    const bareFold = bare
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (surfaceTokens.has(bareFold)) {
      throw new Error(`A1 hygiene: banned bare token in name/description: "${bare}" (${spec.id})`);
    }
  }
}
