/**
 * P0.2 — kontrakt Eksperta Kosztu.
 */

import type {
  CostExpertBlocker,
  CostExpertConfidence,
  CostExpertContract,
  CostPcrAlignment,
  RealCostBreakdown,
} from "./types";

export function buildCostExpertContract(opts: {
  completenessOk: boolean;
  inputBlockers: CostExpertBlocker[];
  breakdown: RealCostBreakdown;
  executionAligned: boolean;
  materialsAligned: boolean;
}): CostExpertContract {
  const { completenessOk, inputBlockers, breakdown, executionAligned, materialsAligned } = opts;

  const blockers = [...inputBlockers];
  if (completenessOk && breakdown.realCostPln == null) {
    blockers.push({
      code: "COST_ASSEMBLE_FAIL",
      messagePl: "Nie udało się złożyć Real Cost mimo pozytywnej kompletności wejść.",
    });
  }

  let pewnosc: CostExpertConfidence = "low";
  if (completenessOk && breakdown.realCostPln != null) {
    pewnosc = inputBlockers.some((b) => b.code === "COST_PARTIAL_PURCHASE" || b.code === "COST_PE_NO_MARKET")
      ? "medium"
      : "high";
  } else if (breakdown.directPln != null) {
    pewnosc = "medium";
  }

  let zgodnosc: CostPcrAlignment = "not_aligned";
  let zgodnoscOpisPl = "Real Cost nie jest spięty z rozumieniem wykonania / materiałami.";
  if (!executionAligned || !materialsAligned || !completenessOk) {
    zgodnosc = "not_aligned";
    zgodnoscOpisPl =
      "Wejścia EE/ME nie są wystarczająco zgodne lub kompletne — Real Cost zablokowany lub niepewny.";
  } else if (blockers.length > 0 || pewnosc !== "high") {
    zgodnosc = "partial";
    zgodnoscOpisPl =
      "Real Cost wyliczony częściowo / z zastrzeżeniami — sprawdź Purchase i kompletność.";
  } else {
    zgodnosc = "aligned";
    zgodnoscOpisPl =
      "Real Cost dotyczy potwierdzonego planu wykonania i systemu materiałowego (bez Market w sumie).";
  }

  const co =
    breakdown.realCostPln != null
      ? `Wyliczono Real Cost: ${breakdown.realCostPln} PLN (M+R+S+pomocnicze+narzuty wewnętrzne).`
      : "Nie wyliczono Real Cost — brak kompletnych składowych / blokery.";

  const dlaczego = completenessOk
    ? "Składanie kosztu firmy z BOM (ilości EE), Purchase materiałów, stawek R/S oraz narzutów wewnętrznych. Market z PE nie wchodzi do sumy."
    : "Kompletność wejść niespełniona — zgodnie z regułą seniora nie domykamy kosztu wykonania.";

  const basis = [
    "ExecutionExpertAnalysisResult (BOM M/S/R)",
    "MaterialExpertAnalysisResult (kompletność)",
    "PricingExpertAnalysisResult (porównanie RO)",
    "CompanyCost RO (Purchase / stawki / narzuty)",
    `direct=${breakdown.directPln ?? "—"}`,
    `realCost=${breakdown.realCostPln ?? "—"}`,
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
