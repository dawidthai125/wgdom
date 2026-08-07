/**
 * P0.4 — porównanie Market / Purchase / Real (informacyjne).
 */

import type { CostComparativeAnalysis, RealCostBreakdown } from "./types";
import type { CostMaterialLine } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pctDelta(a: number, b: number): number | null {
  if (!(b > 0) || !Number.isFinite(a)) return null;
  return round2(((a - b) / b) * 100);
}

export function buildCostComparativeAnalysis(opts: {
  materialLines: CostMaterialLine[];
  breakdown: RealCostBreakdown;
}): CostComparativeAnalysis {
  const { materialLines, breakdown } = opts;
  const notesPl: string[] = [];

  const marketVals = materialLines.map((m) => m.marketTotalPln);
  const purchaseVals = materialLines.map((m) => m.purchaseTotalPln);

  const marketMaterialsPln = marketVals.every((v) => v != null)
    ? round2(marketVals.reduce((a, b) => a + (b as number), 0))
    : null;
  const purchaseMaterialsPln = purchaseVals.every((v) => v != null)
    ? round2(purchaseVals.reduce((a, b) => a + (b as number), 0))
    : null;

  const purchaseVsMarketPct =
    purchaseMaterialsPln != null && marketMaterialsPln != null
      ? pctDelta(purchaseMaterialsPln, marketMaterialsPln)
      : null;

  const realVsPurchaseMaterialsPct =
    breakdown.realCostPln != null && purchaseMaterialsPln != null
      ? pctDelta(breakdown.realCostPln, purchaseMaterialsPln)
      : null;

  const realVsMarketMaterialsPct =
    breakdown.realCostPln != null && marketMaterialsPln != null
      ? pctDelta(breakdown.realCostPln, marketMaterialsPln)
      : null;

  if (purchaseVsMarketPct != null && purchaseVsMarketPct < -5) {
    notesPl.push(`Purchase poniżej Market o ${Math.abs(purchaseVsMarketPct)}% (korzystny zakup).`);
  } else if (purchaseVsMarketPct != null && purchaseVsMarketPct > 5) {
    notesPl.push(`Purchase powyżej Market o ${purchaseVsMarketPct}% — sprawdzić rabaty.`);
  }

  if (realVsMarketMaterialsPct != null) {
    notesPl.push(
      `Real Cost obejmuje R+S+narzuty — różnica vs sam Market materiałów: ${realVsMarketMaterialsPct}%.`,
    );
  }

  notesPl.push("Porównanie wyłącznie informacyjne — nie zmienia Real Cost.");

  return {
    marketMaterialsPln,
    purchaseMaterialsPln,
    realCostPln: breakdown.realCostPln,
    purchaseVsMarketPct,
    realVsPurchaseMaterialsPct,
    realVsMarketMaterialsPct,
    notesPl,
  };
}
