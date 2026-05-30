/** Propozycja ceny ofertowej — robocizna, materiały, Kp, ZUS, stałe, marża, konkurencja. */

import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-doc-parse";
import {
  fullyLoadedHourly,
  weeklyAncillaryLines,
  weeklyFixedOverheadShare,
} from "@/lib/company-labor-cost";

export interface TenderBidCostLine {
  label: string;
  pln: number;
  detail?: string;
}

export interface TenderBidProposal {
  ok: boolean;
  recommendedBidPln: number | null;
  floorBidPln: number | null;
  aggressiveBidPln: number | null;
  safeBidPln: number | null;
  costPricePln: number | null;
  costStack: TenderBidCostLine[];
  assumptions: string[];
  warnings: string[];
  computedAt: string;
}

function parseQty(s: string | undefined): number {
  if (!s?.trim()) return 0;
  const n = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseRowTotal(s: string | undefined): number {
  if (!s?.trim()) return 0;
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const m = cleaned.match(/[\d.]+/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 100) * 100;
}

/** Udział robocizny w pozycji wg j.m. i opisu (heurystyka remont/wykończenia). */
function laborShareOfRow(unit: string, description: string): number {
  const u = unit.toLowerCase().replace(/\s/g, "");
  const d = description.toLowerCase();
  if (/^(rbh|r[\s-]?bh|r[\s-]?g|h|godz|m[gh]|rob(?:\.|-)?g(?:\.|-)?h)$/i.test(u)) return 0.92;
  if (/^(szt|kpl|kompl)$/i.test(u) && /(urządzen|agregat|klimatyz|kotł|grzejnik|okno|drzwi|instal)/.test(d)) return 0.35;
  if (/^(szt|kpl)$/i.test(u) && /(monta|demonta|wymian|napraw)/.test(d)) return 0.72;
  if (/^(m2|m²|mp)$/i.test(u)) {
    if (/malow|emali|tapet|farbow|gruntow/.test(d)) return 0.62;
    if (/gład|tynk|szpachl|tynkar/.test(d)) return 0.58;
    if (/glazur|płytk|kafel|hydro/.test(d)) return 0.52;
    if (/podłog|parkiet|panele|wylew|posadzk/.test(d)) return 0.48;
    return 0.55;
  }
  if (/^(mb|m\.b\.|m)$/i.test(u)) return 0.58;
  if (/^(m3|m³)$/i.test(u)) return 0.42;
  if (/^(t|kg)$/i.test(u)) return 0.25;
  return 0.52;
}

/** Szacunek rbh z pozycji kosztorysu (normy przybliżone). */
function estimateLaborHours(unit: string, quantity: string, description: string): number {
  const q = parseQty(quantity);
  if (q <= 0) return 0;
  const u = unit.toLowerCase().replace(/\s/g, "");
  if (/^(rbh|r[\s-]?bh|h|godz|m[gh]|rob(?:\.|-)?g(?:\.|-)?h)$/i.test(u)) return q;
  if (/^r[\s-]?g$/i.test(u)) return q * 8;
  const d = description.toLowerCase();
  if (/^(m2|m²|mp)$/i.test(u)) {
    if (/malow|emali|tapet/.test(d)) return q * 0.16;
    if (/gład|szpachl|tynk/.test(d)) return q * 0.26;
    if (/glazur|płytk|kafel/.test(d)) return q * 0.42;
    if (/podłog|parkiet|panele/.test(d)) return q * 0.32;
    return q * 0.2;
  }
  if (/^(mb|m\.b\.|m)$/i.test(u)) return q * 0.12;
  if (/^szt$/i.test(u) && /(monta|demonta|wymian)/.test(d)) return q * 2.2;
  return 0;
}

function fullyLoadedHourlyFromModel(model: TenderCompanyCostModel): number {
  return fullyLoadedHourly(model);
}

function projectMonths(
  implementationDays: number | null | undefined,
  minProjectDays: number,
  athTotalPln: number,
  model: TenderCompanyCostModel,
): number {
  if (implementationDays != null && implementationDays > 0) {
    return Math.max(implementationDays / 22, minProjectDays / 22, 0.5);
  }
  const dailyCapacity = model.activeWorkersOnSite * 8 * 0.72;
  const impliedDays = dailyCapacity > 0 && athTotalPln > 0
    ? athTotalPln / (dailyCapacity * fullyLoadedHourly(model) * 0.55)
    : minProjectDays;
  return Math.max(impliedDays / 22, minProjectDays / 22, 0.5);
}

export function computeTenderBidProposal(opts: {
  kosztorys: TenderKosztorysSnapshot | null | undefined;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  costModel: TenderCompanyCostModel;
  minProjectDays: number;
  maxConcurrentProjects: number;
}): TenderBidProposal {
  const { kosztorys, swz, fit, costModel, minProjectDays, maxConcurrentProjects } = opts;
  const assumptions: string[] = [];
  const warnings: string[] = [];
  const costStack: TenderBidCostLine[] = [];

  const athTotal = kosztorys?.ok
    ? (parsePlnFromKosztorysTotal(kosztorys.totalValue, kosztorys.currency)
      ?? kosztorys.rows.reduce((s, r) => s + parseRowTotal(r.total), 0))
    : null;

  if (athTotal == null || athTotal <= 0) {
    return {
      ok: false,
      recommendedBidPln: null,
      floorBidPln: null,
      aggressiveBidPln: null,
      safeBidPln: null,
      costPricePln: null,
      costStack: [],
      assumptions: [],
      warnings: ["Brak kosztorysu ATH/XLSX — wczytaj załącznik, aby wyliczyć ofertę."],
      computedAt: new Date().toISOString(),
    };
  }

  const flHourly = fullyLoadedHourlyFromModel(costModel);
  assumptions.push(
    `${costModel.headcount} prac. (${costModel.activeWorkersOnSite} na budowie), `
    + `stawka brutto ${costModel.avgGrossHourlyPln} zł/h (lista płac) + ZUS ${costModel.employerBurdenPct}% `
    + `= ${flHourly.toFixed(2)} zł/h`,
  );
  assumptions.push(
    `Indeksy rynkowe: materiały ×${(costModel.materialPriceIndexPct / 100).toFixed(2)}, `
    + `robocizna norm ×${(costModel.laborNormIndexPct / 100).toFixed(2)}`,
  );

  let laborCostReal = 0;
  let materialCostReal = 0;
  let hoursSum = 0;
  let athLaborPortion = 0;
  let athMaterialPortion = 0;
  let rowsUsed = 0;

  for (const row of kosztorys!.rows) {
    const total = parseRowTotal(row.total);
    if (total <= 0) continue;
    rowsUsed += 1;
    const share = laborShareOfRow(row.unit, row.description);
    const hours = estimateLaborHours(row.unit, row.quantity, row.description);
    hoursSum += hours;

    const rowLaborAth = total * share;
    const rowMatAth = total * (1 - share);
    athLaborPortion += rowLaborAth;
    athMaterialPortion += rowMatAth;

    if (hours > 0) {
      laborCostReal += hours * flHourly * (costModel.laborNormIndexPct / 100);
      materialCostReal += rowMatAth * (costModel.materialPriceIndexPct / 100);
    } else {
      laborCostReal += rowLaborAth * (costModel.laborNormIndexPct / 100);
      materialCostReal += rowMatAth * (costModel.materialPriceIndexPct / 100);
    }
  }

  if (rowsUsed === 0) {
    const defaultLaborShare = 0.54;
    athLaborPortion = athTotal * defaultLaborShare;
    athMaterialPortion = athTotal * (1 - defaultLaborShare);
    laborCostReal = athLaborPortion * (costModel.laborNormIndexPct / 100);
    materialCostReal = athMaterialPortion * (costModel.materialPriceIndexPct / 100);
    warnings.push("Brak pozycji z kwotami — użyto domyślnego podziału 54% robocizna / 46% materiały.");
  } else {
    const partialSum = laborCostReal + materialCostReal;
    const athRowsSum = athLaborPortion + athMaterialPortion;
    if (kosztorys!.rowCount > rowsUsed && athRowsSum > 0 && athTotal > athRowsSum * 1.03) {
      const scale = athTotal / athRowsSum;
      laborCostReal *= scale;
      materialCostReal *= scale;
      assumptions.push(
        `Skalowanie do pełnej sumy kosztorysu (${kosztorys!.rowCount} poz., przeanalizowano ${rowsUsed}).`,
      );
    }
    if (hoursSum > 0) {
      assumptions.push(`Z pozycji kosztorysu: ~${Math.round(hoursSum)} rbh (normy przybliżone).`);
    }
  }

  const directCost = laborCostReal + materialCostReal;
  costStack.push({
    label: "Robocizna (rynkowa + ZUS/składki pracodawcy)",
    pln: roundPln(laborCostReal),
    detail: hoursSum > 0 ? `${Math.round(hoursSum)} rbh × ${flHourly.toFixed(2)} zł` : undefined,
  });
  costStack.push({
    label: "Materiały (indeks cen rynkowych)",
    pln: roundPln(materialCostReal),
    detail: `Norma ATH ${roundPln(athMaterialPortion)} zł × ${costModel.materialPriceIndexPct}%`,
  });

  const kp = directCost * (costModel.kpPct / 100);
  costStack.push({
    label: `Koszty pośrednie Kp (${costModel.kpPct}% — norma remonty)`,
    pln: roundPln(kp),
    detail: "Zaplecze budowy, logistyka, drobny transport",
  });

  const months = projectMonths(swz?.implementationDays, minProjectDays, athTotal, costModel);
  const weeks = Math.max(months * 4.33, 1);
  const weeklyAncillaryTotal = weeklyAncillaryLines(costModel).reduce((s, l) => s + l.pln, 0);
  const ancillaryProject = weeklyAncillaryTotal * weeks;
  costStack.push({
    label: "Koszty poboczne tygodniowe (paliwo, narzędzia, BHP…)",
    pln: roundPln(ancillaryProject),
    detail: `${roundPln(weeklyAncillaryTotal)} zł/tyg. × ${weeks.toFixed(1)} tyg. · ${costModel.vehicleCount} aut`,
  });

  const overhead = weeklyFixedOverheadShare(costModel, maxConcurrentProjects) * weeks;
  costStack.push({
    label: "Stałe firmy — KZP (admin, biuro, księgowość)",
    pln: roundPln(overhead),
    detail: `${roundPln(costModel.fixedOverheadMonthlyPln)} zł/m-c ÷ ${maxConcurrentProjects} robót × ${weeks.toFixed(1)} tyg.`,
  });

  const subtotal = directCost + kp + ancillaryProject + overhead;
  const profit = subtotal * (costModel.profitPct / 100);
  costStack.push({
    label: `Zysk (${costModel.profitPct}%)`,
    pln: roundPln(profit),
  });

  const risk = (subtotal + profit) * (costModel.riskReservePct / 100);
  if (risk > 0) {
    costStack.push({
      label: `Rezerwa ryzyka (${costModel.riskReservePct}%)`,
      pln: roundPln(risk),
      detail: "Niewidoczne ubytki, przeróbki, wahań cen",
    });
  }

  const costPrice = subtotal + profit + risk;
  const floorBid = costPrice * (1 + costModel.minMarginPct / 100);

  costStack.push({
    label: "Koszt własny + marża minimalna",
    pln: roundPln(floorBid),
    detail: `Próg opłacalności (${costModel.minMarginPct}% nad kosztem)`,
  });

  const estVal = swz?.estimatedValuePln ?? athTotal;
  const priceWeight = fit?.priceWeightPct ?? null;

  let recommended = costPrice * (1 + costModel.profitPct / 100);
  if (priceWeight != null && priceWeight >= 80) {
    const competitive = estVal * (1 - costModel.targetPriceDiscountPct / 100);
    recommended = Math.max(floorBid, Math.min(competitive, estVal * 0.995));
    assumptions.push(
      `Kryterium ceny ~${priceWeight}% — cel konkurencyjny ${roundPln(competitive).toLocaleString("pl-PL")} zł `
      + `(−${costModel.targetPriceDiscountPct}% od wartości ref. ${roundPln(estVal).toLocaleString("pl-PL")} zł).`,
    );
    if (floorBid > competitive) {
      warnings.push(
        "Koszt własny przekracza bezpieczną cenę przy dominacji kryterium ceny — rozważ rezygnację lub podwykonawców.",
      );
    }
  } else {
    recommended = Math.max(floorBid, recommended);
    assumptions.push("Mieszane kryteria oceny — rekomendacja z pełną marżą docelową.");
  }

  const aggressive = priceWeight != null && priceWeight >= 85
    ? Math.max(floorBid, roundPln(estVal * (1 - (costModel.targetPriceDiscountPct + 3) / 100)))
    : roundPln(recommended * 0.97);

  const safe = roundPln(recommended * 1.04);

  if (Math.abs(recommended - athTotal) / athTotal > 0.25) {
    warnings.push(
      `Rekomendacja odbiega >25% od sumy kosztorysu inwestora (${roundPln(athTotal).toLocaleString("pl-PL")} zł) — zweryfikuj indeksy i normy rbh.`,
    );
  }

  return {
    ok: true,
    recommendedBidPln: roundPln(recommended),
    floorBidPln: roundPln(floorBid),
    aggressiveBidPln: roundPln(aggressive),
    safeBidPln: safe,
    costPricePln: roundPln(costPrice),
    costStack,
    assumptions,
    warnings,
    computedAt: new Date().toISOString(),
  };
}
