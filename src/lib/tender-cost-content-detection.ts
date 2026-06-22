/**
 * P1 Smart Cost Document Detection — klasyfikacja kosztorysu/przedmiaru po treści (budowlanka).
 * Sygnał dodatkowy — nie zastępuje ATH ani reguł nazwy pliku.
 */

import * as XLSX from "xlsx";

export type CostContentClassification =
  | "cost_estimate"
  | "bill_of_quantities"
  | "offer_form"
  | "contract"
  | "unknown";

export interface CostContentScoreResult {
  score: number;
  positiveMatches: string[];
  negativeMatches: string[];
  confidence: number;
  classification: CostContentClassification;
}

const MEASURE_UNITS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bm\s*2\b|\bm²\b|\bm2\b/i, label: "m2" },
  { pattern: /\bm\s*3\b|\bm³\b|\bm3\b/i, label: "m3" },
  { pattern: /\bmb\b/i, label: "mb" },
  { pattern: /\bszt\.?\b/i, label: "szt" },
  { pattern: /\bkpl\.?\b/i, label: "kpl" },
  { pattern: /\bkg\b/i, label: "kg" },
  { pattern: /\bt\b(?!\w)/i, label: "t" },
  { pattern: /\br-g\b/i, label: "r-g" },
  { pattern: /\bkm\b/i, label: "km" },
  { pattern: /\bm\b(?![²³23.\w])/i, label: "m" },
];

const KNR_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bknnr\b/i, label: "KNNR" },
  { pattern: /\bksnr\b/i, label: "KSNR" },
  { pattern: /\btzkbnk\b/i, label: "TZKNBK" },
  { pattern: /\bknr\b/i, label: "KNR" },
];

const TRADE_WORDS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bmalowanie\b/i, label: "malowanie" },
  { pattern: /\btynkowanie\b/i, label: "tynkowanie" },
  { pattern: /\bgładzie\b|\bgladzie\b/i, label: "gładzie" },
  { pattern: /\bszpachlowanie\b/i, label: "szpachlowanie" },
  { pattern: /\bmurowanie\b/i, label: "murowanie" },
  { pattern: /\brozbiórka\b|\brozbiorka\b/i, label: "rozbiórka" },
  { pattern: /\bdemontaż\b|\bdemontaz\b/i, label: "demontaż" },
  { pattern: /\bwykucie\b/i, label: "wykucie" },
  { pattern: /\bocieplenie\b/i, label: "ocieplenie" },
  { pattern: /\belewacja\b/i, label: "elewacja" },
  { pattern: /\bizolacja\b/i, label: "izolacja" },
  { pattern: /\bposadzka\b/i, label: "posadzka" },
  { pattern: /\bwylewka\b/i, label: "wylewka" },
  { pattern: /\bpłytki\b|\bplytki\b/i, label: "płytki" },
  { pattern: /\bgres\b/i, label: "gres" },
  { pattern: /\bglazura\b/i, label: "glazura" },
  { pattern: /\broboty\s+budowlane\b/i, label: "roboty budowlane" },
  { pattern: /\broboty\s+wykończeniowe\b|\broboty\s+wykonczeniowe\b/i, label: "roboty wykończeniowe" },
  { pattern: /\binstalacja\b/i, label: "instalacja" },
  { pattern: /\binstalacje\s+sanitarne\b/i, label: "instalacje sanitarne" },
  { pattern: /\bkanalizacja\b/i, label: "kanalizacja" },
  { pattern: /\bwodociąg\b|\bwodociag\b/i, label: "wodociąg" },
  { pattern: /\bwentylacja\b/i, label: "wentylacja" },
  { pattern: /\bstolarka\b/i, label: "stolarka" },
  { pattern: /\bokna\b/i, label: "okna" },
  { pattern: /\bdrzwi\b/i, label: "drzwi" },
  { pattern: /\bdach\b/i, label: "dach" },
  { pattern: /\bpokrycie\s+dachowe\b/i, label: "pokrycie dachowe" },
  { pattern: /\brynny\b/i, label: "rynny" },
  { pattern: /\brusztowanie\b/i, label: "rusztowanie" },
  { pattern: /\bkonstrukcja\b/i, label: "konstrukcja" },
  { pattern: /\bprzedmiar\b/i, label: "przedmiar" },
  { pattern: /\bobmiar\b/i, label: "obmiar" },
  { pattern: /\bkosztorys\b/i, label: "kosztorys" },
];

const NEGATIVE_FORMAL: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bkrs\b/i, label: "KRS" },
  { pattern: /\bregon\b/i, label: "REGON" },
  { pattern: /\bceidg\b/i, label: "CEIDG" },
  { pattern: /\bnip\b/i, label: "NIP" },
  { pattern: /\bwykonawca\b/i, label: "Wykonawca" },
  { pattern: /\boferent\b/i, label: "Oferent" },
  { pattern: /\bpodpis\b/i, label: "Podpis" },
  { pattern: /\boferta\b/i, label: "Oferta" },
  { pattern: /\bformularz\s+ofert/i, label: "Formularz oferty" },
  { pattern: /\boświadczenie\b|\boswiadczenie\b/i, label: "Oświadczenie" },
  { pattern: /\bpełnomocnictwo\b|\bpelnomocnictwo\b/i, label: "Pełnomocnictwo" },
  { pattern: /\brodo\b/i, label: "RODO" },
  { pattern: /\bdane\s+wykonawcy\b/i, label: "Dane wykonawcy" },
  { pattern: /\badres\s+wykonawcy\b/i, label: "Adres wykonawcy" },
  { pattern: /\btelefon\b/i, label: "Telefon" },
  { pattern: /\be-?mail\b/i, label: "E-mail" },
];

const CONTRACT_MARKERS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bwz[oó]r\s+umowy\b/i, label: "wzor umowy" },
  { pattern: /\bprojekt\s+umowy\b/i, label: "projekt umowy" },
  { pattern: /\bumowa\s+zamówienia\b/i, label: "umowa zamówienia" },
];

function collectMatches(
  text: string,
  rules: readonly { pattern: RegExp; label: string }[],
): string[] {
  const found: string[] = [];
  for (const rule of rules) {
    if (rule.pattern.test(text)) found.push(rule.label);
  }
  return found;
}

function hasQuantityPattern(text: string): boolean {
  return /\b\d{1,6}([.,]\d{1,3})?\b/.test(text);
}

function resolveClassification(
  text: string,
  score: number,
  units: string[],
  knr: string[],
  trades: string[],
  negatives: string[],
  contracts: string[],
): { classification: CostContentClassification; confidence: number } {
  const unitHits = units.length;
  const tradeHits = trades.length;
  const knrHits = knr.length;
  const negHits = negatives.length;

  if (contracts.length >= 1 && unitHits === 0 && knrHits === 0) {
    const conf = Math.min(0.95, 0.55 + contracts.length * 0.15);
    return { classification: "contract", confidence: conf };
  }

  if (negHits >= 2 && unitHits === 0 && knrHits === 0 && tradeHits <= 1) {
    const conf = Math.min(0.98, 0.7 + negHits * 0.08);
    return { classification: "offer_form", confidence: conf };
  }

  if (negHits >= 1 && score <= 0 && unitHits === 0) {
    const conf = Math.min(0.95, 0.65 + negHits * 0.1);
    return { classification: "offer_form", confidence: conf };
  }

  if (knrHits >= 1 && unitHits >= 1) {
    const conf = Math.min(0.98, 0.72 + knrHits * 0.08 + unitHits * 0.04 + tradeHits * 0.02);
    return { classification: "cost_estimate", confidence: conf };
  }

  if (unitHits >= 2 && (tradeHits >= 1 || hasQuantityPattern(text))) {
    const conf = Math.min(0.96, 0.68 + unitHits * 0.06 + tradeHits * 0.04);
    return { classification: "bill_of_quantities", confidence: conf };
  }

  if (unitHits >= 1 && tradeHits >= 2) {
    const conf = Math.min(0.92, 0.62 + unitHits * 0.05 + tradeHits * 0.05);
    return { classification: "bill_of_quantities", confidence: conf };
  }

  if (score > 8 && tradeHits >= 1) {
    return { classification: "bill_of_quantities", confidence: 0.55 };
  }

  if (negHits > 0 && score < 5) {
    return { classification: "offer_form", confidence: 0.5 };
  }

  return { classification: "unknown", confidence: 0.25 };
}

/** Klasyfikacja treści dokumentu kosztorysowego (plain text). */
export function scoreCostDocumentContent(text: string): CostContentScoreResult {
  const sample = (text ?? "").slice(0, 120_000);
  if (!sample.trim()) {
    return {
      score: 0,
      positiveMatches: [],
      negativeMatches: [],
      confidence: 0,
      classification: "unknown",
    };
  }

  const folded = sample
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  const units = collectMatches(folded, MEASURE_UNITS);
  const knr = collectMatches(folded, KNR_PATTERNS);
  const trades = collectMatches(folded, TRADE_WORDS);
  const negatives = collectMatches(folded, NEGATIVE_FORMAL);
  const contracts = collectMatches(folded, CONTRACT_MARKERS);

  let score = 0;
  const positiveMatches: string[] = [];

  for (const u of [...new Set(units)]) {
    score += 3;
    positiveMatches.push(u);
  }
  for (const k of [...new Set(knr)]) {
    score += 8;
    positiveMatches.push(k);
  }
  for (const t of [...new Set(trades)]) {
    score += 2;
    positiveMatches.push(t);
  }
  if (hasQuantityPattern(folded) && units.length > 0) {
    score += 4;
    positiveMatches.push("ilości numeryczne");
  }

  const negativeMatches = [...new Set(negatives)];
  for (const _n of negativeMatches) {
    score -= 6;
  }

  const { classification, confidence } = resolveClassification(
    folded,
    score,
    units,
    knr,
    trades,
    negatives,
    contracts,
  );

  return {
    score,
    positiveMatches: [...new Set(positiveMatches)],
    negativeMatches,
    confidence,
    classification,
  };
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v).trim();
}

/** Ekstrakcja tekstu z XLSX do content scoringu. */
export function extractPlainTextFromXlsxBytes(bytes: Uint8Array): string {
  try {
    const wb = XLSX.read(bytes, { type: "array" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames.slice(0, 6)) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      parts.push(sheetName);
      const grid = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
        header: 1,
        defval: "",
      });
      for (const row of grid.slice(0, 400)) {
        const line = row.map(cellStr).filter(Boolean).join(" ");
        if (line) parts.push(line);
      }
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

/** XLSX bytes → content score (helper dla pipeline). */
export function scoreCostDocumentFromXlsxBytes(bytes: Uint8Array): CostContentScoreResult {
  return scoreCostDocumentContent(extractPlainTextFromXlsxBytes(bytes));
}

/** Czy XLSX to formularz ofertowy (treść). */
export function isOfferFormXlsxBytes(bytes: Uint8Array): boolean {
  return isOfferFormByContent(scoreCostDocumentFromXlsxBytes(bytes));
}

const CONTENT_SKIP_CONFIDENCE = 0.6;

/** Czy treść wyklucza dokument z discovery kosztorysu. */
export function isOfferFormByContent(score: CostContentScoreResult | null | undefined): boolean {
  if (!score) return false;
  return score.classification === "offer_form" && score.confidence >= CONTENT_SKIP_CONFIDENCE;
}

/** Boost confidence discovery z content score (ATH priorytet bez zmian). */
export function contentScoreDiscoveryBoost(score: CostContentScoreResult | null | undefined): number {
  if (!score) return 0;
  if (score.classification === "offer_form") return -0.5;
  if (score.classification === "contract") return -0.2;
  if (score.confidence < CONTENT_SKIP_CONFIDENCE) return 0;
  if (score.classification === "cost_estimate") return 0.14;
  if (score.classification === "bill_of_quantities") return 0.1;
  return 0;
}
