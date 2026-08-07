/**
 * P0.5 — ryzyka dostępności (bez cen) + kompletność systemu materiałowego.
 */

import type {
  MaterialGapOrRisk,
  MaterialLineAssessment,
  MaterialSystemCompleteness,
  MaterialVariantSet,
} from "./types";

/** Lokalne ryzyka dostępności dla znanych kluczy fixtures — bez PLN / API. */
const AVAILABILITY_HINTS: ReadonlyArray<{
  materialKey: string;
  code: string;
  messagePl: string;
}> = [
  {
    materialKey: "mat.eps_graph",
    code: "MAT_AVAIL_EPS",
    messagePl:
      "Ryzyko dostępności: EPS grafit bywa sezonowo ograniczony — rozważyć wariant przy ograniczonej dostępności.",
  },
  {
    materialKey: "mat.mesh",
    code: "MAT_AVAIL_MESH",
    messagePl: "Ryzyko dostępności: siatka zbrojąca systemowa — weryfikacja zgodności z klejem/tynkiem.",
  },
  {
    materialKey: "mat.cubes_beton",
    code: "MAT_AVAIL_CUBES",
    messagePl:
      "Ryzyko dostępności: kostka betonowa — lead time produkcji/koloru bywa długi; zaplanować zamiennik formatu.",
  },
  {
    materialKey: "mat.render",
    code: "MAT_AVAIL_RENDER",
    messagePl: "Ryzyko dostępności: tynk mineralny — zależność od partii koloru / sezonu prac elewacyjnych.",
  },
];

export function detectAvailabilityRisks(
  lines: MaterialLineAssessment[],
  variants: MaterialVariantSet[],
): MaterialGapOrRisk[] {
  const out: MaterialGapOrRisk[] = [];
  const keys = new Set(lines.map((l) => l.materialKey));

  for (const hint of AVAILABILITY_HINTS) {
    if (!keys.has(hint.materialKey)) continue;
    out.push({
      kind: "availability_risk",
      code: hint.code,
      messagePl: hint.messagePl,
      materialKey: hint.materialKey,
    });
  }

  // Jeśli jest wariant „ograniczona dostępność” — przypomnij bez ceny
  for (const v of variants) {
    const limited = v.options.find((o) => o.kind === "ograniczona_dostepnosc");
    if (!limited) continue;
    if (out.some((g) => g.materialKey === v.baseMaterialKey && g.kind === "availability_risk")) continue;
    out.push({
      kind: "availability_risk",
      code: "MAT_AVAIL_VARIANT",
      messagePl: `Dla „${v.baseNamePl}” przygotowano wariant przy ograniczonej dostępności: ${limited.namePl}.`,
      materialKey: v.baseMaterialKey,
    });
  }

  return out;
}

export function assessMaterialSystemCompleteness(opts: {
  packRequired: number;
  conforming: number;
  techMissing: number;
  incompatible: number;
  hasExecutionBasis: boolean;
}): { completeness: MaterialSystemCompleteness; notePl: string } {
  const { packRequired, conforming, techMissing, incompatible, hasExecutionBasis } = opts;

  if (!hasExecutionBasis || packRequired === 0) {
    return {
      completeness: "niekompletny",
      notePl: "Brak podstawy technologicznej (Pack/BOM) — system materiałowy niekompletny.",
    };
  }

  if (techMissing === 0 && incompatible === 0 && conforming >= packRequired) {
    return {
      completeness: "kompletny",
      notePl: "Wszystkie materiały receptury obecne w BOM i zgodne z technologią.",
    };
  }

  if (conforming > 0 && (techMissing > 0 || incompatible > 0 || conforming < packRequired)) {
    return {
      completeness: "czesciowy",
      notePl: `Pokrycie częściowe: zgodne ${conforming}/${packRequired}; braki tech. ${techMissing}; niezgodne ${incompatible}.`,
    };
  }

  return {
    completeness: "niekompletny",
    notePl: "System materiałowy nie spełnia receptury technologii.",
  };
}
