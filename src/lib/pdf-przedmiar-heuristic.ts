/**
 * P2-H.5B — heurystyczny odczyt pozycji z natywnych PDF przedmiaru (bez OCR).
 * P0 WM PDF Recovery — M1 unit norm · M2 BOQ split · extended norms (KNR-W, ZKNR, NNRNKB, KNR AT).
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
  { id: "unit", re: /\b(?:m\s*2|m²|m2|m\s*3|m³|m3|mb|kpl|szt\.?|t|kg|rbh)\b/i },
];

/** Extended WM norms — dłuższe tokeny przed KNR (ZKNR/NNRNKB); KNR nie łapie końcówki ZKNR. */
const KNR_IN_LINE =
  /\b(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)\s*[\dA-Za-z]+(?:[-.\s/]*[\dA-Za-z]+)*/i;

const UNIT_RE = /\b(m\s*2|m²|m2|m\s*3|m³|m3|mb|kpl|szt\.?|t|kg|rbh)\b/i;

/** M2 — split segmentów BOQ (normy WM + markery d.X.Y). */
const PDF_BOQ_SPLIT_RE =
  /(?=(?:\d+\s+)?d\.\d+\.\d+\s+(?:(?:NNRNKB|ZKNR|KNNR|KSNR|KNR(?:-W)?(?:\s+AT)?)|kalk\.?\s*własn)|(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)(?:[\s-]*[\dA-Za-z]))/gi;

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

/** M1 — normalizacja j.m. z eksportu WM (m 2 → m2, szt. → szt). */
export function normalizePdfBoqUnits(text: string): string {
  return text
    .replace(/\bm\s+2\b/gi, "m2")
    .replace(/\bm\s+3\b/gi, "m3")
    .replace(/\bszt\./gi, "szt")
    .replace(/\bkpl\./gi, "kpl");
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
  return raw.replace(/\s+/g, "").replace("²", "2").replace("³", "3").toLowerCase();
}

function parseQuantityToken(raw: string): string {
  const t = raw.trim().replace(/\s/g, "");
  if (!/^[\d]+([.,]\d+)?$/.test(t)) return "";
  return raw.trim();
}

/** Pojedyncza linia tekstu PDF z pozycją KNR + j.m. + ilość. */
export function parsePdfPrzedmiarLine(line: string): AthPreviewRow | null {
  const trimmed = normalizePdfBoqUnits(line.replace(/\s+/g, " ").trim());
  if (trimmed.length < 12 || HEADER_NOISE.test(trimmed)) return null;
  if (!KNR_IN_LINE.test(trimmed)) return null;

  const lpMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+/);
  const lp = lpMatch?.[1] ?? "";

  const knrMatch = trimmed.match(KNR_IN_LINE);
  const code = knrMatch ? extractKnrCode(knrMatch[0]) : "";
  if (!code) return null;

  const unitMatch = trimmed.match(UNIT_RE);
  const unit = unitMatch ? normalizeUnitToken(unitMatch[1]) : "";
  if (!unit) return null;

  let quantity = "";
  const afterUnit = trimmed.slice((unitMatch?.index ?? 0) + unitMatch[0].length);
  const qtyAfterUnit = afterUnit.match(/^\s*([\d]+(?:[.,]\d+)?)/);
  if (qtyAfterUnit) quantity = parseQuantityToken(qtyAfterUnit[1]);
  if (!quantity) {
    const endQty = trimmed.match(/([\d]+(?:[.,]\d+)?)\s*$/);
    quantity = endQty ? parseQuantityToken(endQty[1]) : "";
  }
  if (!quantity) return null;

  const knrStart = knrMatch?.index ?? 0;
  const unitStart = unitMatch?.index ?? trimmed.length;
  let description = trimmed.slice(knrStart + (knrMatch?.[0]?.length ?? 0), unitStart).trim();
  description = description.replace(/^[-–—]\s*/, "").trim();
  if (description.length < 4) {
    description = trimmed.slice((lpMatch?.[0]?.length ?? 0), unitStart).replace(code, "").trim();
  }
  if (description.length < 4) return null;

  return {
    lp: lp || "",
    code,
    description: description.slice(0, 240),
    unit,
    quantity: quantity,
    unitPrice: "",
    total: "",
    category: "UNKNOWN",
  };
}

export function extractPdfPrzedmiarRows(text: string): AthPreviewRow[] {
  const segments = splitPdfBoqText(text);
  const rows: AthPreviewRow[] = [];
  const seen = new Set<string>();

  for (const line of segments) {
    const row = parsePdfPrzedmiarLine(line);
    if (!row) continue;
    const key = `${row.code}|${row.description.slice(0, 40)}|${row.quantity}`;
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
