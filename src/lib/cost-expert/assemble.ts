/**
 * P0.3 — składanie Real Cost (Purchase M + R + S + pomocnicze + narzuty).
 * Market NIE wchodzi do sumy.
 */

import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";
import type {
  CompanyCostRo,
  CostEquipmentLine,
  CostLabourLine,
  CostMaterialLine,
  RealCostBreakdown,
} from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function assembleRealCost(opts: {
  execution: ExecutionExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
}): {
  materialLines: CostMaterialLine[];
  labourLines: CostLabourLine[];
  equipmentLines: CostEquipmentLine[];
  breakdown: RealCostBreakdown;
} {
  const { execution, pricing, company } = opts;
  const bom = execution.bom;

  const marketByKey = new Map(
    (pricing.lines ?? []).map((l) => [l.materialKey, l.marketPricePln] as const),
  );

  const materialLines: CostMaterialLine[] = (bom?.materials ?? []).map((m) => {
    const purchase = company.purchaseByMaterialKey[m.materialKey];
    const purchaseUnit = purchase && purchase.unitPricePln > 0 ? purchase.unitPricePln : null;
    const marketUnit = marketByKey.get(m.materialKey) ?? null;
    return {
      materialKey: m.materialKey,
      namePl: m.namePl,
      quantity: m.quantity,
      unit: m.unit,
      purchaseUnitPln: purchaseUnit,
      purchaseTotalPln:
        purchaseUnit != null ? round2(purchaseUnit * m.quantity) : null,
      marketUnitPln: marketUnit,
      marketTotalPln: marketUnit != null ? round2(marketUnit * m.quantity) : null,
    };
  });

  const labourLines: CostLabourLine[] = (bom?.labour ?? []).map((l) => {
    const rate =
      company.laborPlnPerHourByKey?.[l.labourKey] ?? company.defaultLaborPlnPerHour;
    const ok = rate > 0;
    return {
      labourKey: l.labourKey,
      namePl: l.namePl,
      hours: l.hours,
      ratePlnPerHour: ok ? rate : null,
      totalPln: ok ? round2(rate * l.hours) : null,
    };
  });

  const equipmentLines: CostEquipmentLine[] = (bom?.equipment ?? []).map((e) => {
    const rate = company.equipmentRateByKey[e.equipmentKey];
    const unitPrice = rate && rate.unitPricePln > 0 ? rate.unitPricePln : null;
    return {
      equipmentKey: e.equipmentKey,
      namePl: e.namePl,
      quantity: e.quantity,
      unit: e.unit,
      rateUnitPln: unitPrice,
      totalPln: unitPrice != null ? round2(unitPrice * e.quantity) : null,
    };
  });

  const sumOrNull = (vals: Array<number | null>): number | null => {
    if (vals.some((v) => v == null)) return null;
    if (vals.length === 0) return 0;
    return round2(vals.reduce((a, b) => a + (b as number), 0));
  };

  const materialsPurchasePln = sumOrNull(materialLines.map((m) => m.purchaseTotalPln));
  const labourPln = sumOrNull(labourLines.map((l) => l.totalPln));
  const equipmentPln = sumOrNull(equipmentLines.map((e) => e.totalPln));

  let directPln: number | null = null;
  if (materialsPurchasePln != null && labourPln != null && equipmentPln != null) {
    directPln = round2(materialsPurchasePln + labourPln + equipmentPln);
  }

  let auxiliaryPln: number | null = null;
  let internalOverheadPln: number | null = null;
  let realCostPln: number | null = null;

  if (directPln != null) {
    auxiliaryPln = round2(directPln * company.auxiliaryPctOfDirect);
    const afterAux = round2(directPln + auxiliaryPln);
    internalOverheadPln = round2(afterAux * company.internalOverheadPct);
    realCostPln = round2(afterAux + internalOverheadPln);
  }

  return {
    materialLines,
    labourLines,
    equipmentLines,
    breakdown: {
      materialsPurchasePln,
      labourPln,
      equipmentPln,
      directPln,
      auxiliaryPln,
      internalOverheadPln,
      realCostPln,
    },
  };
}
