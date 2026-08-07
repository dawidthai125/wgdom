/**
 * P0.4 — warianty materiałowe (jakościowe, bez cen).
 * Lokalna mapa dla kluczy fixtures B0 — rozszerzalna.
 */

import type { MaterialVariantOption, MaterialVariantSet } from "./types";

type VariantDef = {
  baseKey: string;
  options: Array<{
    kind: MaterialVariantOption["kind"];
    materialKey: string;
    namePl: string;
    rationalePl: string;
  }>;
};

/** REUSE kluczy Pack ETICS / kostka — bez PLN. */
const VARIANT_DEFS: readonly VariantDef[] = [
  {
    baseKey: "mat.eps_graph",
    options: [
      {
        kind: "rekomendowany",
        materialKey: "mat.eps_graph",
        namePl: "Płyta EPS grafit",
        rationalePl: "Zgodny z recepturą Pack ETICS — standard technologii.",
      },
      {
        kind: "ekonomiczny",
        materialKey: "mat.eps_white",
        namePl: "Płyta EPS biały (zamiennik)",
        rationalePl: "Dopuszczalny zamiennik izolacji przy niższych wymaganiach estetycznych/λ — bez wyceny.",
      },
      {
        kind: "premium",
        materialKey: "mat.xps_board",
        namePl: "Płyta XPS",
        rationalePl: "Wyższa odporność na wilgoć / obciążenie — wariant premium jakościowy.",
      },
      {
        kind: "ograniczona_dostepnosc",
        materialKey: "mat.mw_lamella",
        namePl: "Wełna mineralna lamelowa",
        rationalePl: "Zamiennik przy niedostępności EPS grafit — wymaga potwierdzenia systemu ETICS.",
      },
    ],
  },
  {
    baseKey: "mat.glue_etics",
    options: [
      {
        kind: "rekomendowany",
        materialKey: "mat.glue_etics",
        namePl: "Klej do ETICS",
        rationalePl: "Klej systemowy zgodny z recepturą.",
      },
      {
        kind: "ekonomiczny",
        materialKey: "mat.glue_etics_uni",
        namePl: "Klej uniwersalny do styropianu",
        rationalePl: "Zamiennik ekonomiczny — sprawdzić aprobatę systemu.",
      },
      {
        kind: "premium",
        materialKey: "mat.glue_etics_flex",
        namePl: "Klej elastyczny ETICS",
        rationalePl: "Lepsza praca przy trudnym podłożu — wariant premium.",
      },
      {
        kind: "ograniczona_dostepnosc",
        materialKey: "mat.glue_etics_alt",
        namePl: "Klej systemowy zamienny (inny producent)",
        rationalePl: "Przy braku kleju bazowego — ten sam system, inny producent.",
      },
    ],
  },
  {
    baseKey: "mat.cubes_beton",
    options: [
      {
        kind: "rekomendowany",
        materialKey: "mat.cubes_beton",
        namePl: "Kostka betonowa",
        rationalePl: "Receptura Pack kostka brukowa.",
      },
      {
        kind: "ekonomiczny",
        materialKey: "mat.cubes_beton_eco",
        namePl: "Kostka betonowa standard (klasa niższa)",
        rationalePl: "Zamiennik ekonomiczny przy ruchu lekkim.",
      },
      {
        kind: "premium",
        materialKey: "mat.cubes_beton_premium",
        namePl: "Kostka betonowa fazowana / barwiona",
        rationalePl: "Wyższy standard wykończenia — bez wyceny.",
      },
      {
        kind: "ograniczona_dostepnosc",
        materialKey: "mat.cubes_concrete_alt_format",
        namePl: "Kostka o zbliżonym formacie (zamiennik)",
        rationalePl: "Przy braku formatu bazowego — wymaga korekty ilości.",
      },
    ],
  },
];

export function proposeMaterialVariants(materialKeys: string[]): MaterialVariantSet[] {
  const keys = new Set(materialKeys);
  const out: MaterialVariantSet[] = [];

  for (const def of VARIANT_DEFS) {
    if (!keys.has(def.baseKey)) continue;
    const recommended = def.options.find((o) => o.kind === "rekomendowany");
    out.push({
      baseMaterialKey: def.baseKey,
      baseNamePl: recommended?.namePl ?? def.baseKey,
      options: def.options.map((o) => ({ ...o })),
    });
  }

  return out;
}
