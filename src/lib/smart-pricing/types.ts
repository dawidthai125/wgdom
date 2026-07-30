/**
 * SMART-PRICING-01 — typy P0 + punkty rozszerzeń P1+ (kontrakt, bez implementacji).
 * Quotes = SSOT · zero write · zero MS ownership.
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
  /** Region użyty przy Quotes-first (activeRegion wyceny). */
  regionCode: string | null;
  /** Najlepsza confidence Quotes w regionie (gdy była jakakolwiek komórka). */
  bestConfidence: number | null;
  /** Najnowszy acquiredAt Quotes w regionie (ISO), gdy dostępny. */
  newestAcquiredAt: string | null;
}

export interface SmartPricingDetectSummary {
  lineCount: number;
  missingCount: number;
  okCount: number;
  byReason: Record<SmartPricingMissingReason, number>;
  /** Pozycje ze status=missing (sort: lp). */
  missingLines: SmartPricingDetectLineResult[];
  /** Wszystkie linie (ok + missing). */
  lines: SmartPricingDetectLineResult[];
  regionCode: string;
  /** ISO „as of” Detect (deterministyczny — bez Date.now w silniku). */
  computedAtIso: string;
  minConfidence: number;
  staleDays: number;
}

/** Opcje Detect (Quotes-first). */
export interface SmartPricingDetectOptions {
  /** Region SSOT wyceny (domyślnie activeRegion katalogu). */
  regionCode: string;
  /** ISO — bez Date.now w pure detect. */
  computedAtIso: string;
  /** DF O-SP-F default 0.50 */
  minConfidence?: number;
  /** DF O-SP-F default 180 */
  staleDays?: number;
}

/**
 * Snapshot RO z Product Quotes (P0) — nie jest pełnym Price Evidence (P1).
 * Extension point: P1 zbuduje PriceEvidence z tych pól + matchMethod.
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

/** Extension points — kontrakt na P1–P3 (P0: stub / nie wywoływać z UI). */
export type SmartPricingExtensionPhase = "P1_evidence" | "P1_one_shot" | "P2_ms_staging" | "P3_save";

export interface SmartPricingExtensionPoint {
  phase: SmartPricingExtensionPhase;
  available: false;
  notePl: string;
}
