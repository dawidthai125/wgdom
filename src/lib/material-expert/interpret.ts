/**
 * P0.2 — kontrakt Eksperta Materiałów (Transparent Reasoning).
 */

import type {
  MaterialExpertBlocker,
  MaterialExpertConfidence,
  MaterialExpertContract,
  MaterialGapOrRisk,
  MaterialLineAssessment,
  MaterialPcrAlignment,
  MaterialSystemCompleteness,
  MaterialVariantSet,
} from "./types";

export function buildMaterialExpertContract(opts: {
  hasExecutionBasis: boolean;
  packNamePl: string | null;
  lines: MaterialLineAssessment[];
  gapsAndRisks: MaterialGapOrRisk[];
  variants: MaterialVariantSet[];
  completeness: MaterialSystemCompleteness;
  completenessNotePl: string;
  packMaterialCoverage: { required: number; present: number; conforming: number };
}): MaterialExpertContract {
  const {
    hasExecutionBasis,
    packNamePl,
    lines,
    gapsAndRisks,
    variants,
    completeness,
    completenessNotePl,
    packMaterialCoverage,
  } = opts;

  const blockers: MaterialExpertBlocker[] = [];

  if (!hasExecutionBasis) {
    blockers.push({
      code: "MAT_NO_EXECUTION",
      messagePl: "Brak wyniku Eksperta Wykonania (Pack/BOM) — materiały nieustalone.",
      kind: "tech_missing",
    });
  }

  for (const g of gapsAndRisks) {
    if (g.kind === "tech_missing" || g.kind === "incompatible") {
      blockers.push({
        code: g.code,
        messagePl: g.messagePl,
        kind: g.kind,
        materialKey: g.materialKey,
      });
    }
  }

  const techMissing = gapsAndRisks.filter((g) => g.kind === "tech_missing").length;
  const incompatible = gapsAndRisks.filter((g) => g.kind === "incompatible").length;
  const avail = gapsAndRisks.filter((g) => g.kind === "availability_risk").length;
  const conforming = lines.filter((l) => l.conformity === "zgodny").length;

  let pewnosc: MaterialExpertConfidence = "low";
  if (hasExecutionBasis && completeness === "kompletny" && incompatible === 0) {
    pewnosc = avail > 2 ? "medium" : "high";
  } else if (hasExecutionBasis && conforming > 0) {
    pewnosc = "medium";
  }

  let zgodnosc: MaterialPcrAlignment = "not_aligned";
  let zgodnoscOpisPl = "Brak zgodności materiałowej z rozumieniem wykonania.";
  if (!hasExecutionBasis) {
    zgodnosc = "not_aligned";
    zgodnoscOpisPl = "Nie można ocenić materiałów bez technologii wykonania.";
  } else if (blockers.length > 0 || completeness === "niekompletny") {
    zgodnosc = "not_aligned";
    zgodnoscOpisPl =
      "Materiały niespójne lub niekompletne względem technologii — wymagana korekta przed wyceną.";
  } else if (completeness === "czesciowy" || techMissing > 0 || avail > 0) {
    zgodnosc = "partial";
    zgodnoscOpisPl =
      "Materiały częściowo zgodne z technologią; wykryto braki, ryzyka dostępności lub niepewności.";
  } else {
    zgodnosc = "aligned";
    zgodnoscOpisPl = "Zestaw materiałów jest zgodny z rozumieniem wykonania i recepturą technologii.";
  }

  const co = !hasExecutionBasis
    ? "Nie potwierdzono systemu materiałowego — brak podstawy z Eksperta Wykonania."
    : `Potwierdzono ${conforming} pozycji materiałowych zgodnych z technologią` +
      (packNamePl ? ` „${packNamePl}”` : "") +
      `; kompletność: ${completeness}; wariantów: ${variants.length}.`;

  const dlaczego = !hasExecutionBasis
    ? "Bez Pack/BOM Wykonania Ekspert Materiałów nie dobiera materiałów samodzielnie (REUSE FIRST)."
    : `Ocena względem receptury Pack i BOM.materials (bez cen). ${completenessNotePl}` +
      (variants.length
        ? ` Zaproponowano warianty jakościowe dla ${variants.length} pozycji bazowych.`
        : " Brak zdefiniowanych map wariantów dla obecnych kluczy.");

  const basis = [
    "wynik Eksperta Wykonania (Plan / Bundle / BOM / kontrakt)",
    packNamePl ? `Pack: ${packNamePl}` : "Pack: brak",
    `BOM materials: ${lines.length}`,
    `pokrycie Pack: ${packMaterialCoverage.conforming}/${packMaterialCoverage.required}`,
    `luki/ryzyka: ${gapsAndRisks.length}`,
    "Technology Foundation BOM (REUSE, bez projectBom)",
  ].join(" · ");

  return {
    co,
    dlaczego,
    naPodstawieCzego: basis,
    pewnosc,
    blokery: blockers,
    zgodnoscZRozumieniemWykonania: zgodnosc,
    zgodnoscOpisPl,
  };
}
