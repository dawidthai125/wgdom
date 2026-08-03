/**
 * SMART-PRICING-01 — typy P0 + P1 (Evidence · Confidence · One-shot).
 * Quotes = SSOT · P1: zero Quotes write · zero Cloud · One-shot session only.
 */

/** Powód braku użytecznej ceny rynkowej (Detect P0). */
export type SmartPricingMissingReason =
  | "unmapped"
  | "work_missing"
  | "no_quote"
  | "low_confidence"
  | "stale";

export type SmartPricingDetectStatus = "ok" | "missing";

/** Kontekst pozycji wyceny (wejście Detect). */
export interface SmartPricingLineContext {
  lineId: string;
  lp: string;
  description: string;
  catalogWorkId: string | null;
}

/** Wynik Detect dla jednej pozycji. */
export interface SmartPricingDetectLineResult {
  lineId: string;
  lp: string;
  description: string;
  catalogWorkId: string | null;
  workNamePl: string | null;
  status: SmartPricingDetectStatus;
  reason: SmartPricingMissingReason | null;
  regionCode: string | null;
  bestConfidence: number | null;
  newestAcquiredAt: string | null;
}

export interface SmartPricingDetectSummary {
  lineCount: number;
  missingCount: number;
  okCount: number;
  byReason: Record<SmartPricingMissingReason, number>;
  missingLines: SmartPricingDetectLineResult[];
  lines: SmartPricingDetectLineResult[];
  regionCode: string;
  computedAtIso: string;
  minConfidence: number;
  staleDays: number;
}

export interface SmartPricingDetectOptions {
  regionCode: string;
  computedAtIso: string;
  minConfidence?: number;
  staleDays?: number;
}

/**
 * Snapshot RO z Product Quotes (P0) — wejście do Evidence P1.
 */
export interface SmartPricingQuoteCellRo {
  origin: string;
  regionCode: string;
  price: number;
  confidence: number;
  acquiredAt: string;
  useful: boolean;
  rejectReason: SmartPricingMissingReason | null;
}

/** DF §7.1 — P1: product_quotes · P2: + market_sync_staging. */
export type SmartPricingEvidenceSource = "product_quotes" | "market_sync_staging";

export type SmartPricingMatchMethod =
  | "ean"
  | "provider_sku"
  | "mfr_name_unit"
  | "alias"
  | "manual"
  | "direct_work_quote";

/** Price Evidence (jeden model — DF-P1-03). */
export interface SmartPricingPriceEvidence {
  id: string;
  source: SmartPricingEvidenceSource;
  provider: string;
  price: number;
  currency: "PLN";
  acquiredAt: string;
  confidence: number;
  matchMethod: SmartPricingMatchMethod;
  matchDetail: string;
  region: string | null;
  workId?: string | null;
  origin?: string | null;
  unit?: string | null;
  warnings?: string[];
  /** Ref diagnostyczny — bez mutacji źródła. */
  rawRef?: string | null;
}

export type SmartPricingDecisionConfidence = "READY" | "REVIEW" | "MANUAL";

/**
 * One-shot overlay — wyłącznie session/in-memory (DF-P1-01).
 * Zakaz: LocalStorage · Cloud · Quotes write.
 */
export interface SmartPricingOneShotOverlay {
  lineId: string;
  tenderId: string | null;
  evidenceId: string;
  price: number;
  currency: "PLN";
  provider: string;
  appliedAtIso: string;
}

export type SmartPricingExtensionPhase =
  | "P1_evidence"
  | "P1_one_shot"
  | "P2_ms_staging"
  | "P3_save";

export interface SmartPricingExtensionPoint {
  phase: SmartPricingExtensionPhase;
  available: boolean;
  notePl: string;
}
