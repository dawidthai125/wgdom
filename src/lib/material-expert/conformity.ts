/**
 * P0.1 / P0.5 — zgodność linii BOM.materials z TechnologyPack.materials.
 * REUSE BOM — bez projectBom.
 */

import type { GeneratedBom, TechnologyPack } from "@/lib/technology-foundation";
import type { MaterialLineAssessment } from "./types";

export function assessBomMaterialsAgainstPack(
  bom: GeneratedBom | null,
  pack: TechnologyPack | null,
): MaterialLineAssessment[] {
  if (!bom || !pack) return [];

  const packKeys = new Map(pack.materials.map((m) => [m.materialKey, m]));
  const out: MaterialLineAssessment[] = [];

  for (const line of bom.materials ?? []) {
    const recipe = packKeys.get(line.materialKey);
    if (!recipe) {
      out.push({
        materialKey: line.materialKey,
        namePl: line.namePl,
        unit: line.unit,
        quantity: line.quantity,
        conformity: "niezgodny",
        notePl: "Klucz materiału spoza receptury Pack — niespójny z technologią.",
      });
      continue;
    }

    const unitOk = !recipe.unit || !line.unit || recipe.unit === line.unit;
    const nameClose =
      fold(recipe.namePl) === fold(line.namePl) ||
      fold(line.namePl).includes(fold(recipe.namePl).slice(0, 8));

    if (!unitOk) {
      out.push({
        materialKey: line.materialKey,
        namePl: line.namePl,
        unit: line.unit,
        quantity: line.quantity,
        conformity: "niepewny",
        notePl: `Jm BOM (${line.unit}) ≠ jm Pack (${recipe.unit}).`,
      });
      continue;
    }

    out.push({
      materialKey: line.materialKey,
      namePl: line.namePl,
      unit: line.unit,
      quantity: line.quantity,
      conformity: nameClose ? "zgodny" : "niepewny",
      notePl: nameClose
        ? "Zgodny z recepturą technologii (Pack)."
        : "Klucz zgodny z Pack, nazwa różni się od receptury — weryfikacja.",
    });
  }

  return out;
}

function fold(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}
