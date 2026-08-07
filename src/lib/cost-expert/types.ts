/**
 * Ekspert Kosztu — typy (P0). Wyłącznie Real Cost.
 */

export type CostExpertConfidence = "high" | "medium" | "low";

export type CostPcrAlignment = "aligned" | "partial" | "not_aligned";

export interface CostExpertBlocker {
  code: string;
  messagePl: string;
}

/** Dane firmy RO — Purchase / stawki / narzuty (nie Market, nie Bid). */
export interface CompanyCostRo {
  /** Purchase PLN / j.m. per materialKey. */
  purchaseByMaterialKey: Readonly<
    Record<string, { unitPricePln: number; labelPl?: string }>
  >;
  /** Stawka robocizny PLN/h (domyślna). */
  defaultLaborPlnPerHour: number;
  /** Opcjonalnie per labourKey. */
  laborPlnPerHourByKey?: Readonly<Record<string, number>>;
  /** Stawka sprzętu PLN / j.m. per equipmentKey. */
  equipmentRateByKey: Readonly<
    Record<string, { unitPricePln: number; labelPl?: string }>
  >;
  /** % kosztów pomocniczych od bazy bezpośredniej (0–1). */
  auxiliaryPctOfDirect: number;
  /** % narzutu wewnętrznego (Kp/Z) od (bezpośrednie + pomocnicze), 0–1 — nie marża oferty. */
  internalOverheadPct: number;
}

export interface CostMaterialLine {
  materialKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  purchaseUnitPln: number | null;
  purchaseTotalPln: number | null;
  marketUnitPln: number | null;
  marketTotalPln: number | null;
}

export interface CostLabourLine {
  labourKey: string;
  namePl: string;
  hours: number;
  ratePlnPerHour: number | null;
  totalPln: number | null;
}

export interface CostEquipmentLine {
  equipmentKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  rateUnitPln: number | null;
  totalPln: number | null;
}

export interface RealCostBreakdown {
  materialsPurchasePln: number | null;
  labourPln: number | null;
  equipmentPln: number | null;
  /** Baza bezpośrednia M+R+S. */
  directPln: number | null;
  auxiliaryPln: number | null;
  internalOverheadPln: number | null;
  /** Real Cost = direct + auxiliary + overhead. */
  realCostPln: number | null;
}

/** Porównanie informacyjne — nie wpływa na Real Cost. */
export interface CostComparativeAnalysis {
  marketMaterialsPln: number | null;
  purchaseMaterialsPln: number | null;
  realCostPln: number | null;
  /** (Purchase - Market) / Market * 100 gdy możliwe. */
  purchaseVsMarketPct: number | null;
  /** (Real - Purchase materials-only) — Real obejmuje R+S+narzuty. */
  realVsPurchaseMaterialsPct: number | null;
  /** (Real - Market materials) / Market * 100. */
  realVsMarketMaterialsPct: number | null;
  notesPl: string[];
}

export interface CostExpertContract {
  co: string;
  dlaczego: string;
  naPodstawieCzego: string;
  pewnosc: CostExpertConfidence;
  blokery: CostExpertBlocker[];
  zgodnoscZRozumieniemWykonania: CostPcrAlignment;
  zgodnoscOpisPl: string;
}

/** Payload RO dla przyszłego Eksperta Oferty — bez Bid. */
export interface CostOfferHandoffPayload {
  realCostPln: number;
  breakdown: RealCostBreakdown;
  comparative: CostComparativeAnalysis;
  contractSummaryPl: string;
  pewnosc: CostExpertConfidence;
}

export interface CostExpertAnalysisResult {
  contract: CostExpertContract;
  completenessOk: boolean;
  materialLines: CostMaterialLine[];
  labourLines: CostLabourLine[];
  equipmentLines: CostEquipmentLine[];
  breakdown: RealCostBreakdown;
  comparative: CostComparativeAnalysis;
  handoffToOfferExpert: boolean;
  handoffBlockersPl: string[];
  offerHandoffPayload: CostOfferHandoffPayload | null;
}
