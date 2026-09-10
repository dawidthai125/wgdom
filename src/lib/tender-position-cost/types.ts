/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 0 — Position Cost Engine types.
 * Pure contract · ZERO HTTP · ZERO store · ZERO zewnętrznych lookupów.
 */

/**
 * Status labor przekazany przez adapter (Faza 0 nie lookupuje).
 * GO86: PROVISIONAL = estimate-only (companyPrice / seam) — ≠ finance-authoritative CURRENT.
 */
export type PositionLaborStatus =
  | "CURRENT"
  | "STALE"
  | "MISSING"
  | "NO_IDENTITY"
  | "PROVISIONAL";

/**
 * GO86 B+C — pricing authority for Position Cost.
 * - `finance` (default): BidCutover / Finance — PROVISIONAL labor not computable
 * - `estimate`: P7 / UI / research preview — PROVISIONAL may compute
 */
export type PositionPricingAuthority = "finance" | "estimate";

/** Status materiału przekazany przez adapter (Faza 0 nie lookupuje). */
export type PositionMaterialStatus =
  | "CURRENT"
  | "STALE"
  | "MISSING"
  | "NO_KEY"
  | "NO_BOM"
  | "NO_NORM";

export type PositionCostIssueCode =
  | "BRAK_IDENTITY_ROBOTY"
  | "BRAK_OUR_RATE"
  | "STALE_OUR_RATE"
  | "BRAK_MATERIAL_KEY"
  | "BRAK_CENY_MATERIALU"
  | "STALE_MATERIAL_PRICE"
  | "BRAK_BOM"
  | "BRAK_NORMY_MATERIALU"
  | "INVALID_QUANTITY"
  | "INVALID_LABOR_RATE"
  | "INVALID_MATERIAL_QUANTITY"
  | "INVALID_MATERIAL_PRICE"
  | "PROVISIONAL_LABOR_NOT_AUTHORITATIVE";

export interface PositionCostIssue {
  code: PositionCostIssueCode;
  messagePl: string;
  /** Indeks w `materials[]` gdy dotyczy materiału. */
  materialIndex?: number;
}

/**
 * Labor: gotowa stawka OUR RATE (zł / unit pozycji).
 * `null` na poziomie PositionCostInput.labor = brak komponentu labor (material-only).
 */
export interface PositionLaborInput {
  status: PositionLaborStatus;
  /** zł / unit pozycji · labor-only OUR RATE — NIE stawka godzinowa. */
  ourRatePln: number | null;
}

/**
 * Materiał: gotowa SELL PRICE (po marży materiału) × ilość absolutna na pozycję.
 * Engine NIE liczy BOM / marży / Price Memory.
 */
export interface PositionMaterialInput {
  materialKey: string | null;
  status: PositionMaterialStatus;
  /** Ilość materiału na całą pozycję (nie per unit roboty — to ustala adapter/BOM później). */
  quantity: number | null;
  quantityUnit: string | null;
  /** Cena sprzedaży zł / quantityUnit — już po commercialPricing. */
  sellPricePln: number | null;
}

/**
 * Wejście pure engine.
 * - `labor === null` → material-only (laborCost = 0, bez wymogu OUR RATE)
 * - `materials.length === 0` → labor-only (materialCost = 0)
 */
export interface PositionCostInput {
  /** Ilość pozycji przedmiaru (jm linii). */
  quantity: number;
  /** Jm linii — metadane; Faza 0 nie waliduje słownika jednostek. */
  unit: string;
  labor: PositionLaborInput | null;
  materials: PositionMaterialInput[];
  /**
   * GO86 — default `finance` (fail-closed for BidCutover).
   * Estimate/P7 pass `estimate` so provisional companyPrice remains preview-computable.
   */
  pricingAuthority?: PositionPricingAuthority;
}

export interface PositionCostResult {
  laborCostPln: number | null;
  materialCostPln: number | null;
  totalPositionCostPln: number | null;
  laborComputable: boolean;
  materialsComputable: boolean;
  /** Labor + materiały spełniają wymagania trybu (labor-only / material-only / both). */
  positionComplete: boolean;
  issues: PositionCostIssue[];
}
