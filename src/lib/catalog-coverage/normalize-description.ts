/**
 * CATALOG-COVERAGE-01 P0b — Description Normalizer (pure / ephemeral).
 * DF §2.2 · forma only · bez zmiany semantyki · zero zapisu Library/Quotes.
 *
 * REUSE: foldPolishText (porównania) · normalizeWgdomCostUnit (hint jm).
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type {
  CatalogCoverageNormalizeResult,
  CatalogCoverageNormalizeStats,
} from "@/lib/catalog-coverage/types";

const RE_KNR_LABEL = /\b(?:KNR|KNNR|NNR)\s*[\d][\d\s./-]*/gi;
const RE_KNR_CODE = /\b\d{3,4}-\d{2}\b/g;
const RE_DX_BLOCK = /\bd\.\d+(?:\.\d+)*/gi;
const RE_KROTNOSC = /\bKrotno[sś][cć]\s*=\s*[^\n;]*/gi;
const RE_ANALIZA = /\banaliza\s+indywidualna\b/gi;
const RE_MULT = /\b\d+[.,]\d+\s*\*\s*\d+\b/g;
/** ATH „m d.” / „m.d.” — nie jm materiałowa. */
const RE_M_D = /\bm\.?\s*d\.?\b/gi;
/** Prefiks branżowy ATH typu `[E]` / `[W]`. */
const RE_BRACKET_TAG = /^\[[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]\]\s*/;

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function extractKnrHint(raw: string): string | null {
  const label = raw.match(/\b(?:KNR|KNNR|NNR)\s*[\d][\d\s./-]*/i);
  if (label) return collapseWs(label[0]);
  const code = raw.match(/\b\d{3,4}-\d{2}\b/);
  if (code) return code[0];
  return null;
}

function extractUnitHint(raw: string): string | null {
  const m = raw.match(/\b(m2|m²|m3|m³|mb|m\.b\.|szt\.?|kpl|kg|rbh)\b/i);
  if (!m) return null;
  return normalizeWgdomCostUnit(m[1]) ?? m[1].toLowerCase().replace("²", "2").replace("³", "3");
}

function extractDiameterHint(raw: string): string | null {
  const patterns = [
    /[øØ⌀]\s*(\d+(?:[.,]\d+)?)/,
    /\b[sś]r\.?\s*(\d+(?:[.,]\d+)?)/i,
    /\bDN\s*(\d+)/i,
    /\bfi\s*(\d+(?:[.,]\d+)?)/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return `fi${m[1].replace(",", ".")}`;
  }
  return null;
}

/**
 * Standaryzuje opis ATH do formy pod scoring Mappera.
 * Pure · deterministyczny · idempotentny.
 * NIE dopisuje materiału · NIE zmienia znaczenia produktu.
 */
export function normalizeOfferBoqDescription(raw: string): CatalogCoverageNormalizeResult {
  const input = String(raw ?? "");
  const trimmedIn = input.trim();

  const knrHint = extractKnrHint(trimmedIn);
  const unitHint = extractUnitHint(trimmedIn);
  const diameterHint = extractDiameterHint(trimmedIn);

  let s = trimmedIn;
  s = s.replace(RE_BRACKET_TAG, "");
  s = s.replace(RE_KROTNOSC, " ");
  s = s.replace(RE_ANALIZA, " ");
  s = s.replace(RE_KNR_LABEL, " ");
  s = s.replace(RE_KNR_CODE, " ");
  s = s.replace(RE_DX_BLOCK, " ");
  s = s.replace(RE_MULT, " ");
  s = s.replace(RE_M_D, " ");

  // Średnice → kanoniczne `fiNN` (bez usuwania informacji średnicy).
  s = s.replace(/[øØ⌀]\s*(\d+(?:[.,]\d+)?)/g, " fi$1 ");
  s = s.replace(/\b[sś]r\.?\s*(\d+(?:[.,]\d+)?)/gi, " fi$1 ");
  s = s.replace(/\bDN\s*(\d+)/gi, " fi$1 ");
  s = s.replace(/\bfi\s+(\d+(?:[.,]\d+)?)/gi, " fi$1 ");
  s = s.replace(/\bfi(\d+(?:[.,]\d+)?)/gi, (_, n: string) => ` fi${n.replace(",", ".")} `);

  // jm w tekście — kanoniczne tokeny (bez usuwania).
  s = s.replace(/\bm²\b/gi, " m2 ");
  s = s.replace(/\bm³\b/gi, " m3 ");
  s = s.replace(/\bm\.?\s*b\.?\b/gi, " mb ");
  s = s.replace(/\bszt\.?\b/gi, " szt ");

  // Znaki specjalne ATH / śmieci interpunkcyjne (bez usuwania liter/cyfr produktu).
  s = s.replace(/[|;]+/g, " ");
  s = s.replace(/\s+([,.:])/g, "$1");
  s = collapseWs(s);

  // Idempotencja: drugi przebieg fi/ws.
  s = s.replace(/\bfi\s+(\d+)/gi, "fi$1");
  s = collapseWs(s);

  const normalizedDescription = s || trimmedIn;
  const changed =
    foldPolishText(normalizedDescription) !== foldPolishText(trimmedIn) ||
    normalizedDescription !== trimmedIn;

  return {
    normalizedDescription,
    changed,
    knrHint,
    unitHint,
    diameterHint,
  };
}

/** Idempotentny wrapper — normalize(normalize(x)) === normalize(x). */
export function normalizeOfferBoqDescriptionStable(raw: string): CatalogCoverageNormalizeResult {
  const once = normalizeOfferBoqDescription(raw);
  const twice = normalizeOfferBoqDescription(once.normalizedDescription);
  return {
    ...twice,
    // Hints z pierwszego przebiegu (pełniejszy ATH raw).
    knrHint: once.knrHint ?? twice.knrHint,
    unitHint: once.unitHint ?? twice.unitHint,
    diameterHint: once.diameterHint ?? twice.diameterHint,
    changed: once.changed || twice.changed,
  };
}

export function summarizeNormalizeResults(
  results: ReadonlyArray<CatalogCoverageNormalizeResult>,
): CatalogCoverageNormalizeStats {
  let changedCount = 0;
  let withKnrHint = 0;
  let withUnitHint = 0;
  let withDiameterHint = 0;
  for (const r of results) {
    if (r.changed) changedCount += 1;
    if (r.knrHint) withKnrHint += 1;
    if (r.unitHint) withUnitHint += 1;
    if (r.diameterHint) withDiameterHint += 1;
  }
  const lineCount = results.length;
  return {
    lineCount,
    changedCount,
    unchangedCount: lineCount - changedCount,
    withKnrHint,
    withUnitHint,
    withDiameterHint,
    changedPct: lineCount === 0 ? 0 : Math.round((changedCount / lineCount) * 1000) / 10,
  };
}
