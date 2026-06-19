/**
 * P2-H.5B — heurystyczny odczyt pozycji z natywnych PDF przedmiaru (bez OCR).
 * P0 WM PDF Recovery — M1 unit norm · M2 BOQ split · M4 m→mb · M5 kalk. własna · M6 WM unit aliases · extended norms.
 */

import type { AthPreviewResult, AthPreviewRow } from "@/lib/ath-parser";

export type PdfPrzedmiarUxCase = 1 | 2 | 3;

export interface PdfPrzedmiarHeuristicResult {
  /** CASE 1 = pozycje, CASE 2 = brak pozycji, CASE 3 = skan/OCR */
  uxCase: PdfPrzedmiarUxCase;
  rows: AthPreviewRow[];
  signals: string[];
  signalCount: number;
  warnings: string[];
}

const MIN_SIGNALS = 3;

const SIGNAL_CHECKS: { id: string; re: RegExp }[] = [
  { id: "knr", re: /\b(?:KNR|KNNR|KSNR|ZKNR|NNRNKB|TZKNBK)\b/i },
  { id: "lp", re: /\b(?:Lp\.?|L\.?\s*P\.?)\b/ },
  { id: "ilosc", re: /\b(?:Ilo[sś][ćc]?|Obmiar)\b/i },
  { id: "jm", re: /\b(?:J\.?\s*m\.?|Jedn\.?)\b/i },
  {
    id: "unit",
    re: /\b(?:m\s*2|m²|m2|m\s*3|m³|m3|mb|kpl|szt\.?|t|kg|rbh|wyp\.?|otw\.?|podej\.?|aparat\.?|lokal\.?)\b/i,
  },
];

/** Extended WM norms — dłuższe tokeny przed KNR (ZKNR/NNRNKB); KNR nie łapie końcówki ZKNR. */
const KNR_IN_LINE =
  /\b(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)\s*[\dA-Za-z]+(?:[-.\s/]*[\dA-Za-z]+)*/i;

/** M5 (TP197) — kalkulacja własna bez normy KNR. */
const KALK_WLASNA_RE =
  /\b(?:kalk\.?\s*własn[aą]|kalkulacj[aą]\s+własn[aą]|wycena\s+własn[aą])\b/i;

/** Odrzuca luźny tekst SWZ przypadkowo zawierający słowa „własna”. */
const KALK_SWZ_FALSE_POSITIVE_RE =
  /\b(?:wadium|kryteria\s+oceny|termin\s+składania|specyfikacja\s+warunków|zamówienia)\b/i;

/** Kotwica BOQ WM — Lp. lub d.X.Y przed kalk. własna. */
const KALK_BOQ_ANCHOR_RE =
  /^(\d+(?:\.\d+)*\s+)?(d\.\d+\.\d+\s+)?(?:kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn)/i;

/** M6 (TP198C) — WM skróty j.m. (wyp./otw./podej./aparat/lokal.) mapowane do szt w normalizeUnitToken. */
const UNIT_RE =
  /\b(m\s*2|m²|m2|m\s*3|m³|m3|mb|kpl|szt\.?|t|kg|rbh|wyp\.?|otw\.?|podej\.?|aparat\.?|lokal\.?)\b/i;

const WM_UNIT_ALIAS_TO_SZT = new Set(["wyp", "otw", "podej", "aparat", "lokal"]);

/** M2 — split segmentów BOQ (normy WM + markery d.X.Y + kalk. własna). */
const PDF_BOQ_SPLIT_RE =
  /(?=(?:\d+\s+)?d\.\d+\.\d+\s+(?:(?:NNRNKB|ZKNR|KNNR|KSNR|KNR(?:-W)?(?:\s+AT)?)|kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn)|(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)(?:[\s-]*[\dA-Za-z]))/gi;

const HEADER_NOISE = /^(?:podstawa|opis|nazwa|cena|warto|razem|suma|strona|\d+\s*\/\s*\d+)/i;

export const PDF_PRZEDMIAR_UX_LINES: Record<PdfPrzedmiarUxCase, string> = {
  1: "Rozpoznano pozycje robót w PDF.",
  2: "Znaleziono przedmiar PDF, ale nie udało się odczytać pozycji.",
  3: "PDF zawiera skan i wymaga OCR.",
};

/** P2-H.5C — brak warstwy tekstowej (CAD / pdf.js bez stron). */
export const PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE =
  "PDF nie zawiera warstwy tekstowej (np. eksport CAD) i wymaga OCR lub pliku ATH/XLS.";

export const PDF_PRZEDMIAR_NO_TEXT_LAYER_SHORT =
  "PDF zawiera skan lub dane CAD bez tekstu.";

function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** M1 + M4 (TP196) — normalizacja j.m. z eksportu WM (m 2→m2, m→mb przed ilością). */
export function normalizePdfBoqUnits(text: string): string {
  return text
    .replace(/\bm\s+2\b/gi, "m2")
    .replace(/\bm\s+3\b/gi, "m3")
    .replace(/\bszt\./gi, "szt")
    .replace(/\bkpl\./gi, "kpl")
    // M4 — WM „m” jako metry bieżące (po m2/m3, żeby nie psuć powierzchni/objętości)
    .replace(/\bm\b(?=\s+[\d])/gi, "mb");
}

/** M2 — rozbij tekst stron PDF na segmenty pozycji BOQ. */
export function splitPdfBoqText(text: string): string[] {
  const hay = normalizePdfText(text);
  if (!hay) return [];

  const pageLines = hay.split("\n");
  const segments: string[] = [];

  for (const pageLine of pageLines) {
    const trimmed = pageLine.trim();
    if (trimmed.length < 8) continue;

    const parts = trimmed
      .split(PDF_BOQ_SPLIT_RE)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);

    if (parts.length > 0) segments.push(...parts);
    else segments.push(trimmed);
  }

  return segments;
}

export function detectPdfPrzedmiarSignals(text: string): string[] {
  const hay = normalizePdfText(text);
  return SIGNAL_CHECKS.filter((s) => s.re.test(hay)).map((s) => s.id);
}

function extractKnrCode(fragment: string): string {
  const m = fragment.match(
    /\b((?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)\s*[\dA-Za-z]+(?:[-.\s/]*[\dA-Za-z]+)*)/i,
  );
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeUnitToken(raw: string): string {
  const norm = raw
    .replace(/\s+/g, "")
    .replace("²", "2")
    .replace("³", "3")
    .toLowerCase()
    .replace(/\.$/, "");
  if (norm === "m") return "mb";
  if (WM_UNIT_ALIAS_TO_SZT.has(norm)) return "szt";
  return norm;
}

function parseQuantityToken(raw: string): string {
  const t = raw.trim().replace(/\s/g, "");
  if (!/^[\d]+([.,]\d+)?$/.test(t)) return "";
  return raw.trim();
}

function extractUnitAndQuantity(trimmed: string): {
  unit: string;
  quantity: string;
  unitStart: number;
  unitMatch: RegExpMatchArray;
} | null {
  const unitMatch = trimmed.match(UNIT_RE);
  if (!unitMatch || unitMatch.index == null) return null;
  const unit = normalizeUnitToken(unitMatch[1]);
  if (!unit) return null;

  let quantity = "";
  const afterUnit = trimmed.slice(unitMatch.index + unitMatch[0].length);
  const qtyAfterUnit = afterUnit.match(/^\s*([\d]+(?:[.,]\d+)?)/);
  if (qtyAfterUnit) quantity = parseQuantityToken(qtyAfterUnit[1]);
  if (!quantity) {
    const endQty = trimmed.match(/([\d]+(?:[.,]\d+)?)\s*$/);
    quantity = endQty ? parseQuantityToken(endQty[1]) : "";
  }
  if (!quantity) return null;

  return { unit, quantity, unitStart: unitMatch.index, unitMatch };
}

/** M5 — pozycja kalk. własna / kalkulacja własna / wycena własna (bez KNR). */
function parseKalkWlasnaPrzedmiarLine(trimmed: string): AthPreviewRow | null {
  if (!KALK_WLASNA_RE.test(trimmed)) return null;
  if (KALK_SWZ_FALSE_POSITIVE_RE.test(trimmed)) return null;
  // TP198B — kalk. własna po kotwicy KNR (bez Lp./d.X.Y na początku segmentu).
  if (!KALK_BOQ_ANCHOR_RE.test(trimmed) && !KNR_IN_LINE.test(trimmed)) return null;

  const lpMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+/);
  const lp = lpMatch?.[1] ?? "";

  const kalkMatch = trimmed.match(KALK_WLASNA_RE);
  if (!kalkMatch || kalkMatch.index == null) return null;
  const code = kalkMatch[0].replace(/\s+/g, " ").trim();

  const uq = extractUnitAndQuantity(trimmed);
  if (!uq) return null;

  const kalkEnd = kalkMatch.index + kalkMatch[0].length;
  let description = trimmed.slice(kalkEnd, uq.unitStart).trim();
  description = description.replace(/^[-–—]\s*/, "").trim();
  if (description.length < 4) {
    description = trimmed.slice((lpMatch?.[0]?.length ?? 0), uq.unitStart).replace(code, "").trim();
  }
  if (description.length < 4) return null;

  return {
    lp: lp || "",
    code,
    description: description.slice(0, 240),
    unit: uq.unit,
    quantity: uq.quantity,
    unitPrice: "",
    total: "",
    category: "UNKNOWN",
  };
}

/** Pojedyncza linia tekstu PDF z pozycją KNR lub kalk. własna + j.m. + ilość. */
export function parsePdfPrzedmiarLine(line: string): AthPreviewRow | null {
  const trimmed = normalizePdfBoqUnits(line.replace(/\s+/g, " ").trim());
  if (trimmed.length < 12 || HEADER_NOISE.test(trimmed)) return null;

  if (KALK_WLASNA_RE.test(trimmed)) {
    const kalkRow = parseKalkWlasnaPrzedmiarLine(trimmed);
    if (kalkRow) return kalkRow;
  }
  if (!KNR_IN_LINE.test(trimmed)) return null;

  const lpMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+/);
  const lp = lpMatch?.[1] ?? "";

  const knrMatch = trimmed.match(KNR_IN_LINE);
  const code = knrMatch ? extractKnrCode(knrMatch[0]) : "";
  if (!code) return null;

  const uq = extractUnitAndQuantity(trimmed);
  if (!uq) return null;

  const knrStart = knrMatch?.index ?? 0;
  let description = trimmed.slice(knrStart + (knrMatch?.[0]?.length ?? 0), uq.unitStart).trim();
  description = description.replace(/^[-–—]\s*/, "").trim();
  if (description.length < 4) {
    description = trimmed.slice((lpMatch?.[0]?.length ?? 0), uq.unitStart).replace(code, "").trim();
  }
  if (description.length < 4) return null;

  return {
    lp: lp || "",
    code,
    description: description.slice(0, 240),
    unit: uq.unit,
    quantity: uq.quantity,
    unitPrice: "",
    total: "",
    category: "UNKNOWN",
  };
}

/** TP198A — klucz dedup pozycji PDF (lp + code + unit + qty + opis). */
export function pdfPrzedmiarRowDedupKey(
  row: Pick<AthPreviewRow, "lp" | "code" | "unit" | "quantity" | "description">,
): string {
  return `${row.lp}|${row.code}|${row.unit}|${row.quantity}|${row.description}`;
}

export function extractPdfPrzedmiarRows(text: string): AthPreviewRow[] {
  const segments = splitPdfBoqText(text);
  const rows: AthPreviewRow[] = [];
  const seen = new Set<string>();

  for (const line of segments) {
    const row = parsePdfPrzedmiarLine(line);
    if (!row) continue;
    const key = pdfPrzedmiarRowDedupKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!row.lp) row.lp = String(rows.length + 1);
    rows.push(row);
    if (rows.length >= 500) break;
  }

  return rows;
}

/** Główna heurystyka P2-H.5B — tekst z extractPdfText(), bez OCR. */
export function parsePdfPrzedmiarHeuristic(
  text: string,
  opts?: { likelyScan?: boolean; noTextLayer?: boolean },
): PdfPrzedmiarHeuristicResult {
  const warnings: string[] = [];

  if (opts?.likelyScan) {
    warnings.push(PDF_PRZEDMIAR_UX_LINES[3]);
    return {
      uxCase: 3,
      rows: [],
      signals: detectPdfPrzedmiarSignals(text),
      signalCount: 0,
      warnings,
    };
  }

  if (opts?.noTextLayer) {
    warnings.push(PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE);
    return {
      uxCase: 3,
      rows: [],
      signals: detectPdfPrzedmiarSignals(text),
      signalCount: 0,
      warnings,
    };
  }

  const signals = detectPdfPrzedmiarSignals(text);
  const signalCount = signals.length;

  if (signalCount < MIN_SIGNALS) {
    warnings.push(PDF_PRZEDMIAR_UX_LINES[2]);
    return { uxCase: 2, rows: [], signals, signalCount, warnings };
  }

  const rows = extractPdfPrzedmiarRows(text);
  if (rows.length > 0) {
    warnings.push(PDF_PRZEDMIAR_UX_LINES[1]);
    return { uxCase: 1, rows, signals, signalCount, warnings };
  }

  warnings.push(PDF_PRZEDMIAR_UX_LINES[2]);
  return { uxCase: 2, rows: [], signals, signalCount, warnings };
}

/** Mapowanie heurystyki → AthPreviewResult (integracja z parseDocumentToKosztorys). */
export function pdfPrzedmiarHeuristicToPreview(
  text: string,
  filename: string,
  opts?: { likelyScan?: boolean; noTextLayer?: boolean },
): AthPreviewResult {
  const base = filename.split(" → ").pop() ?? filename;
  const parsed = parsePdfPrzedmiarHeuristic(text, opts);
  return {
    ok: true,
    format: "text",
    documentType: "PDF_PRZEDMIAR",
    title: base.split("/").pop() ?? base,
    rows: parsed.rows,
    warnings: parsed.warnings,
    pdfPrzedmiarCase: parsed.uxCase,
    pdfPrzedmiarNoTextLayer: Boolean(opts?.noTextLayer && parsed.uxCase === 3),
  };
}
