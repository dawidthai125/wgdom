/**
 * P2-H.5B — heurystyczny odczyt pozycji z natywnych PDF przedmiaru (bez OCR).
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
  { id: "knr", re: /\b(?:KNR|KNNR|KSNR|TZKNBK)\b/i },
  { id: "lp", re: /\b(?:Lp\.?|L\.?\s*P\.?)\b/ },
  { id: "ilosc", re: /\b(?:Ilo[sś][ćc]?|Obmiar)\b/i },
  { id: "jm", re: /\b(?:J\.?\s*m\.?|Jedn\.?)\b/i },
  { id: "unit", re: /\b(?:m2|m²|m3|mb|kpl|szt|t|kg|rbh)\b/i },
];

const KNR_IN_LINE = /\b(?:KNR|KNNR|KSNR)\s*[\d]+(?:[-.\s/]*\d+)*/i;
const UNIT_RE = /\b(m2|m²|m3|mb|kpl|szt|t|kg|rbh)\b/i;
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

export function detectPdfPrzedmiarSignals(text: string): string[] {
  const hay = normalizePdfText(text);
  return SIGNAL_CHECKS.filter((s) => s.re.test(hay)).map((s) => s.id);
}

function extractKnrCode(fragment: string): string {
  const m = fragment.match(/\b((?:KNR|KNNR|KSNR)\s*[\d]+(?:[-.\s/]*\d+)*)/i);
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function parseQuantityToken(raw: string): string {
  const t = raw.trim().replace(/\s/g, "");
  if (!/^[\d]+([.,]\d+)?$/.test(t)) return "";
  return raw.trim();
}

/** Pojedyncza linia tekstu PDF z pozycją KNR + j.m. + ilość. */
export function parsePdfPrzedmiarLine(line: string): AthPreviewRow | null {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (trimmed.length < 12 || HEADER_NOISE.test(trimmed)) return null;
  if (!KNR_IN_LINE.test(trimmed)) return null;

  const lpMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+/);
  const lp = lpMatch?.[1] ?? "";

  const knrMatch = trimmed.match(KNR_IN_LINE);
  const code = knrMatch ? extractKnrCode(knrMatch[0]) : "";
  if (!code) return null;

  const unitMatch = trimmed.match(UNIT_RE);
  const unit = unitMatch?.[1]?.replace("²", "2").toLowerCase() ?? "";
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
  const lines = normalizePdfText(text).split("\n");
  const rows: AthPreviewRow[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
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
