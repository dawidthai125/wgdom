/**
 * Biblioteka Robót i Cennik v3.0 — ukryty podział ceny (tylko silnik / adapter).
 * UI: jedna robota = jedna cena (`companyPricePln`). Silnik legacy: materiał + rbh × stawka/h.
 */

import type { WorkCostSplit } from "@/lib/work-catalog/types";

/**
 * Stała referencyjna dla migracji v1→v3 i golden tests (D2 — determinizm).
 * Nie jest widoczna w UI; adapter P1.6 może przyjąć hourly z modelu kosztów.
 */
export const WORK_CATALOG_REFERENCE_HOURLY_PLN = 85;

export interface LegacyRateComponents {
  materialPlnPerUnit: number;
  laborRbhPerUnit: number;
}

export interface ResolvedLegacyRates extends LegacyRateComponents {
  laborCostPlnPerUnit: number;
}

export function roundWorkCatalogPln(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function resolveReferenceHourlyPln(referenceHourlyPln?: number): number {
  const hourly = referenceHourlyPln ?? WORK_CATALOG_REFERENCE_HOURLY_PLN;
  const safe = clampNonNegative(hourly);
  return safe > 0 ? safe : WORK_CATALOG_REFERENCE_HOURLY_PLN;
}

/** Normalizuje proporcje tak, aby materialRatio + laborRatio = 1. */
export function normalizeCostSplit(split: WorkCostSplit): WorkCostSplit {
  const material = clampNonNegative(split.materialRatio);
  const labor = clampNonNegative(split.laborRatio);
  const total = material + labor;
  if (total <= 0) {
    return { materialRatio: 1, laborRatio: 0 };
  }
  return {
    materialRatio: material / total,
    laborRatio: labor / total,
  };
}

/** Legacy material + rbh → ukryty cost split (suma ratio = 1). */
export function deriveCostSplitFromLegacyRate(
  materialPlnPerUnit: number,
  laborRbhPerUnit: number,
  referenceHourlyPln?: number,
): WorkCostSplit {
  const material = clampNonNegative(materialPlnPerUnit);
  const laborRbh = clampNonNegative(laborRbhPerUnit);
  const hourly = resolveReferenceHourlyPln(referenceHourlyPln);
  const laborCost = roundWorkCatalogPln(laborRbh * hourly);
  const total = roundWorkCatalogPln(material + laborCost);

  if (total <= 0) {
    return { materialRatio: 1, laborRatio: 0 };
  }

  return normalizeCostSplit({
    materialRatio: material / total,
    laborRatio: laborCost / total,
  });
}

/** Legacy material + rbh → jedna cena firmy (UI). */
export function computeCompanyPriceFromLegacyRate(
  materialPlnPerUnit: number,
  laborRbhPerUnit: number,
  referenceHourlyPln?: number,
): number {
  const material = clampNonNegative(materialPlnPerUnit);
  const laborRbh = clampNonNegative(laborRbhPerUnit);
  const hourly = resolveReferenceHourlyPln(referenceHourlyPln);
  return roundWorkCatalogPln(material + laborRbh * hourly);
}

/** Alias zgodny z Technical Execution Plan P1.4. */
export function mergeCompanyPriceFromLegacyRate(
  materialPlnPerUnit: number,
  laborRbhPerUnit: number,
  referenceHourlyPln?: number,
): number {
  return computeCompanyPriceFromLegacyRate(materialPlnPerUnit, laborRbhPerUnit, referenceHourlyPln);
}

/**
 * Stawka/h do przeliczenia kosztu robocizny → rbh (odwrotny kierunek split).
 * Brak wartości → referencja 85; jawnie niepoprawna (0, ujemna, NaN) → rbh = 0.
 */
function resolveHourlyForRbhConversion(referenceHourlyPln?: number): number {
  if (referenceHourlyPln === undefined) {
    return WORK_CATALOG_REFERENCE_HOURLY_PLN;
  }
  const safe = clampNonNegative(referenceHourlyPln);
  return safe > 0 ? safe : 0;
}

/** Jedna cena firmy + cost split → składowe legacy dla silnika. */
export function splitCompanyPrice(
  companyPricePln: number,
  costSplit: WorkCostSplit,
  referenceHourlyPln?: number,
): ResolvedLegacyRates {
  const price = clampNonNegative(companyPricePln);
  const normalized = normalizeCostSplit(costSplit);
  const hourly = resolveHourlyForRbhConversion(referenceHourlyPln);
  const materialPlnPerUnit = roundWorkCatalogPln(price * normalized.materialRatio);
  const laborCostPlnPerUnit = roundWorkCatalogPln(price * normalized.laborRatio);
  const laborRbhPerUnit =
    hourly > 0 && laborCostPlnPerUnit > 0
      ? roundWorkCatalogPln(laborCostPlnPerUnit / hourly)
      : 0;

  return {
    materialPlnPerUnit,
    laborRbhPerUnit,
    laborCostPlnPerUnit,
  };
}

export interface LegacyRateRoundTripResult {
  pass: boolean;
  companyPricePln: number;
  costSplit: WorkCostSplit;
  reconstructed: ResolvedLegacyRates;
}

/** Weryfikacja round-trip legacy → cena + split → legacy (tolerancja zaokrągleń). */
export function verifyLegacyRateRoundTrip(
  materialPlnPerUnit: number,
  laborRbhPerUnit: number,
  referenceHourlyPln?: number,
  epsilonPln = 0.01,
): LegacyRateRoundTripResult {
  const hourly = resolveReferenceHourlyPln(referenceHourlyPln);
  const companyPricePln = computeCompanyPriceFromLegacyRate(materialPlnPerUnit, laborRbhPerUnit, hourly);
  const costSplit = deriveCostSplitFromLegacyRate(materialPlnPerUnit, laborRbhPerUnit, hourly);
  const reconstructed = splitCompanyPrice(companyPricePln, costSplit, hourly);

  const expectedMaterial = clampNonNegative(materialPlnPerUnit);
  const expectedLaborRbh = clampNonNegative(laborRbhPerUnit);
  const materialOk = Math.abs(reconstructed.materialPlnPerUnit - expectedMaterial) <= epsilonPln;
  const laborOk = Math.abs(reconstructed.laborRbhPerUnit - expectedLaborRbh) <= epsilonPln;
  const priceOk =
    Math.abs(
      computeCompanyPriceFromLegacyRate(
        reconstructed.materialPlnPerUnit,
        reconstructed.laborRbhPerUnit,
        hourly,
      ) - companyPricePln,
    ) <= epsilonPln;

  return {
    pass: materialOk && laborOk && priceOk,
    companyPricePln,
    costSplit,
    reconstructed,
  };
}
