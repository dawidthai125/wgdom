/**
 * Ekspert Kosztu — czynność domenowa (P0). Real Cost only.
 */

import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { MaterialExpertAnalysisResult } from "@/lib/material-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";
import { assembleRealCost } from "./assemble";
import { validateCostExpertInputs } from "./completeness";
import { buildCostComparativeAnalysis } from "./comparative";
import { buildCostExpertContract } from "./interpret";
import type {
  CompanyCostRo,
  CostExpertAnalysisResult,
  CostOfferHandoffPayload,
} from "./types";

export function analyzeRealCostFromExperts(opts: {
  execution: ExecutionExpertAnalysisResult;
  materials: MaterialExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
}): CostExpertAnalysisResult {
  const { execution, materials, pricing, company } = opts;

  const completeness = validateCostExpertInputs({
    execution,
    materials,
    pricing,
    company,
  });

  const assembled = assembleRealCost({ execution, pricing, company });
  const comparative = buildCostComparativeAnalysis({
    materialLines: assembled.materialLines,
    breakdown: assembled.breakdown,
  });

  // Jeśli krytyczna niekompletność — nie uznajemy realCost za domknięty (nawet gdy assemble coś policzył częściowo)
  const breakdown = completeness.ok
    ? assembled.breakdown
    : {
        ...assembled.breakdown,
        realCostPln: null,
        // zachowaj składowe diagnostyczne
      };

  const executionAligned =
    execution.contract.zgodnoscZRozumieniemWykonania === "aligned" ||
    execution.contract.zgodnoscZRozumieniemWykonania === "partial";
  const materialsAligned =
    materials.contract.zgodnoscZRozumieniemWykonania === "aligned" ||
    materials.contract.zgodnoscZRozumieniemWykonania === "partial";

  const contract = buildCostExpertContract({
    completenessOk: completeness.ok,
    inputBlockers: completeness.blockers,
    breakdown,
    executionAligned,
    materialsAligned,
  });

  const handoffBlockersPl: string[] = [];
  if (!completeness.ok) {
    for (const b of completeness.blockers) handoffBlockersPl.push(b.messagePl);
  }
  if (breakdown.realCostPln == null) {
    handoffBlockersPl.push("Brak wyliczonego realCostPln — Oferta nie powinna startować.");
  }
  if (contract.zgodnoscZRozumieniemWykonania === "not_aligned") {
    handoffBlockersPl.push("Real Cost nie jest zgodny z rozumieniem wykonania.");
  }

  const handoffToOfferExpert =
    completeness.ok &&
    breakdown.realCostPln != null &&
    contract.zgodnoscZRozumieniemWykonania !== "not_aligned" &&
    handoffBlockersPl.length === 0;

  let offerHandoffPayload: CostOfferHandoffPayload | null = null;
  if (handoffToOfferExpert && breakdown.realCostPln != null) {
    offerHandoffPayload = {
      realCostPln: breakdown.realCostPln,
      breakdown,
      comparative,
      contractSummaryPl: contract.co,
      pewnosc: contract.pewnosc,
    };
  }

  return {
    contract,
    completenessOk: completeness.ok,
    materialLines: assembled.materialLines,
    labourLines: assembled.labourLines,
    equipmentLines: assembled.equipmentLines,
    breakdown,
    comparative,
    handoffToOfferExpert,
    handoffBlockersPl: handoffToOfferExpert ? [] : [...new Set(handoffBlockersPl)],
    offerHandoffPayload,
  };
}
