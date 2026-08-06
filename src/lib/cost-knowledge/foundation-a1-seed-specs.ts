/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 TS-A1 — Library Depth FEATURE-DATA seeds.
 * Prefix `kf-a1-` — nie koliduje z `ck-a1-*` / `cc-p0c-*`.
 * Pure data — bez KV / sync.
 */

import { assertKeywordHygieneSpec } from "@/lib/cost-knowledge/keyword-hygiene";

export interface FoundationA1WorkSpec {
  id: string;
  tradeId: string;
  namePl: string;
  unit: string;
  companyPricePln: number;
  descriptionPl: string;
  keywords: string[];
  gapGroup: string;
}

export const FOUNDATION_A1_SEED_WORKS: readonly FoundationA1WorkSpec[] = [
  {
    id: "kf-a1-tynk-cementowo-wapienny",
    tradeId: "TYNKI",
    namePl: "Wykonanie wyprawy cementowo-wapiennej kategorii III",
    unit: "m2",
    companyPricePln: 72,
    descriptionPl: "Wyprawa cementowo-wapienna kat. III na ścianie wewnętrznej",
    keywords: ["tynk cementowo wapienny", "tynk cementowo-wapienny", "wyprawa cementowo wapienna"],
    gapGroup: "TYNKI_WEWNETRZNE",
  },
  {
    id: "kf-a1-malowanie-scian-dwukrotne",
    tradeId: "MALARSKIE",
    namePl: "Malowanie ścian emulsją dwukrotnie",
    unit: "m2",
    companyPricePln: 28,
    descriptionPl: "Dwukrotne malowanie ścian emulsją wewnętrzną",
    keywords: [
      "malowanie scian dwukrotne",
      "malowanie ścian emulsja",
      "farba emulsyjna sciany",
    ],
    gapGroup: "MALARSKIE",
  },
  {
    id: "kf-a1-ukladanie-kabla-ydy",
    tradeId: "ELEKTRYKA",
    namePl: "Układanie przewodu YDY w bruzdzie ściennej",
    unit: "mb",
    companyPricePln: 22,
    descriptionPl: "Prowadzenie przewodu YDY w bruzdzie wraz z mocowaniem",
    keywords: ["ukladanie kabla ydy", "przewod ydy bruza", "prowadzenie ydy sciana"],
    gapGroup: "ELEKTRYKA_TELETECH",
  },
  {
    id: "kf-a1-izolacja-pozioma-papa",
    tradeId: "IZOLACJE",
    namePl: "Izolacja pozioma przeciwwilgociowa z papy",
    unit: "m2",
    companyPricePln: 55,
    descriptionPl: "Wykonanie izolacji poziomej z papy na ławie fundamentowej",
    keywords: ["izolacja pozioma papa", "izolacja przeciwwilgociowa papa", "papa izolacyjna pozioma"],
    gapGroup: "IZOLACJE",
  },
  {
    id: "kf-a1-demontaz-posadzki-lastrykowej",
    tradeId: "ROZBIORKI",
    namePl: "Demontaż posadzki lastrykowej",
    unit: "m2",
    companyPricePln: 85,
    descriptionPl: "Rozebranie posadzki lastrykowej wraz z wywozem gruzu",
    keywords: ["demontaz posadzki lastrykowej", "rozebranie lastryka", "demontaż lastryko posadzka"],
    gapGroup: "ROZBIORKI",
  },
] as const;

export const FOUNDATION_A1_SEED_IDS = FOUNDATION_A1_SEED_WORKS.map((w) => w.id);

export function assertFoundationA1KeywordHygiene(spec: FoundationA1WorkSpec): void {
  assertKeywordHygieneSpec(spec);
}

/** Run hygiene on all Foundation A1 seeds (fail-loud). */
export function assertAllFoundationA1Hygiene(): void {
  for (const spec of FOUNDATION_A1_SEED_WORKS) {
    assertFoundationA1KeywordHygiene(spec);
  }
}
