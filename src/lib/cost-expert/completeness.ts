/**
 * P0.1 — walidacja kompletności wejść Eksperta Kosztu.
 */

import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { MaterialExpertAnalysisResult } from "@/lib/material-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";
import type { CompanyCostRo, CostExpertBlocker } from "./types";

export interface CostInputCompleteness {
  ok: boolean;
  blockers: CostExpertBlocker[];
}

export function validateCostExpertInputs(opts: {
  execution: ExecutionExpertAnalysisResult;
  materials: MaterialExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
}): CostInputCompleteness {
  const blockers: CostExpertBlocker[] = [];
  const { execution, materials, pricing, company } = opts;

  if (!execution.bom || !execution.pack) {
    blockers.push({
      code: "COST_NO_EXEC_BOM",
      messagePl: "Brak BOM/Pack z Eksperta Wykonania — nie można liczyć Real Cost.",
    });
  }

  if (execution.technologyDecision === "deny") {
    blockers.push({
      code: "COST_EXEC_DENIED",
      messagePl: "Ekspert Wykonania odrzucił technologię (deny) — Real Cost zablokowany.",
    });
  }

  if (materials.completeness === "niekompletny") {
    blockers.push({
      code: "COST_ME_INCOMPLETE",
      messagePl: "System materiałowy niekompletny — Real Cost nie powinien domykać wyceny.",
    });
  }

  if (materials.contract.blokery.some((b) => b.kind === "incompatible" || b.kind === "tech_missing")) {
    blockers.push({
      code: "COST_ME_BLOCKERS",
      messagePl: "Ekspert Materiałów zgłosił blokery technologiczne / niezgodności.",
    });
  }

  if (!(company.defaultLaborPlnPerHour > 0)) {
    blockers.push({
      code: "COST_NO_LABOR_RATE",
      messagePl: "Brak stawki robocizny firmy (CompanyCost RO).",
    });
  }

  if (
    company.auxiliaryPctOfDirect < 0 ||
    company.internalOverheadPct < 0 ||
    company.auxiliaryPctOfDirect > 1 ||
    company.internalOverheadPct > 1
  ) {
    blockers.push({
      code: "COST_BAD_PCT",
      messagePl: "Niepoprawne procenty pomocnicze / narzutu wewnętrznego (oczekiwane 0–1).",
    });
  }

  // PE high risk na wszystkich pozycjach — ostrzeżenie jako bloker miękki? Plan: critical high-risk
  const priced = pricing.lines.filter((l) => l.marketPricePln != null);
  if (pricing.lines.length > 0 && priced.length === 0) {
    blockers.push({
      code: "COST_PE_NO_MARKET",
      messagePl:
        "Ekspert Cen nie dostarczył żadnej ceny rynkowej — porównanie ograniczone; Real Cost może iść na Purchase, lecz kompletność rynkowa słaba.",
    });
  }

  // Brak purchase dla materiałów z BOM — zbierzemy w assemble; tu flaga gdy BOM ma M a purchase pusty
  const bomMats = execution.bom?.materials ?? [];
  if (bomMats.length > 0) {
    const missingPurchase = bomMats.filter(
      (m) => !(company.purchaseByMaterialKey[m.materialKey]?.unitPricePln > 0),
    );
    if (missingPurchase.length === bomMats.length) {
      blockers.push({
        code: "COST_NO_PURCHASE",
        messagePl: "Brak cen Purchase dla wszystkich materiałów BOM.",
      });
    } else if (missingPurchase.length > 0) {
      blockers.push({
        code: "COST_PARTIAL_PURCHASE",
        messagePl: `Brak Purchase dla ${missingPurchase.length} materiałów — Real Cost niekompletny.`,
      });
    }
  }

  // Krytyczne blokery uniemożliwiające Real Cost
  const critical = new Set([
    "COST_NO_EXEC_BOM",
    "COST_EXEC_DENIED",
    "COST_ME_INCOMPLETE",
    "COST_NO_LABOR_RATE",
    "COST_BAD_PCT",
    "COST_NO_PURCHASE",
  ]);
  const hasCritical = blockers.some((b) => critical.has(b.code));

  return { ok: !hasCritical, blockers };
}
