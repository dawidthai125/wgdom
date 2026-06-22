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
    re: /\b(?:m\s*2|m²|m2|m\s*3|m³|m3|mb|kpl|szt\.?|t|kg|rbh|wyp\.?|otw\.?|podej\.?|aparat\.?|lokal\.?|pomiar|pom\.?|prób\.?|prob\.?)\b/i,
  },
];

/** TP201A — sam prefiks normy (bez opisu pozycji). */
const KNR_PREFIX_RE =
  /\b(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?)\b/i;

/** Wykrywanie linii z normą — tylko prefiks (nie greedy na opis). */
const KNR_IN_LINE = KNR_PREFIX_RE;

/** Tokeny opisu / modyfikatora — nie wchodzą do kodu normy. */
const KNR_NORM_STOP_WORDS = new Set(["analogia", "ana-", "logia"]);

/** TP201A — czy token należy do kodu normy WM (numery, AT-xx, INSTAL, GEBERIT). */
export function isPdfBoqNormToken(token: string): boolean {
  let t = token.trim().replace(/^[,;]+|[,;]+$/g, "");
  if (!t) return false;
  if (KNR_NORM_STOP_WORDS.has(t.toLowerCase())) return false;
  if (/^AT-\d+$/i.test(t)) return true;
  if (/^INSTAL$/i.test(t)) return true;
  if (/^C-\d+$/i.test(t)) return true;
  if (/^\d+(?:[-./]\d+)*\/?$/.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^[A-Z]{2,15}$/.test(t) && !/^(RAZEM|UWAGA|LP|PODSTAWA)$/.test(t)) return true;
  return false;
}

/** TP201A — kod normy + indeks końca w linii (bez słów opisu pozycji). */
export function extractKnrCodeSpan(trimmed: string): {
  code: string;
  knrStart: number;
  codeEnd: number;
} | null {
  const prefixMatch = trimmed.match(KNR_PREFIX_RE);
  if (!prefixMatch || prefixMatch.index == null) return null;

  const knrStart = prefixMatch.index;
  const tokens = [prefixMatch[0]];
  let cursor = knrStart + prefixMatch[0].length;

  while (cursor < trimmed.length) {
    const rest = trimmed.slice(cursor);
    const ws = rest.match(/^\s+/);
    if (!ws) break;
    cursor += ws[0].length;
    const word = rest.slice(ws[0].length).match(/^(\S+)/);
    if (!word) break;
    if (!isPdfBoqNormToken(word[1])) break;
    tokens.push(word[1]);
    cursor += word[1].length;
  }

  const code = tokens.join(" ").replace(/\s+/g, " ").trim();
  return { code, knrStart, codeEnd: knrStart + code.length };
}

/** M5 (TP197) — kalkulacja własna bez normy KNR. TP201C-B — alias „Kalkulacja”. */
const KALK_WLASNA_RE =
  /\b(?:kalk\.?\s*własn[aą]|kalkulacj[aą]\s+własn[aą]|wycena\s+własn[aą]|Kalkulacja)\b/i;

/** Odrzuca luźny tekst SWZ przypadkowo zawierający słowa „własna”. */
const KALK_SWZ_FALSE_POSITIVE_RE =
  /\b(?:wadium|kryteria\s+oceny|termin\s+składania|specyfikacja\s+warunków|zamówienia)\b/i;

/** Kotwica BOQ WM — Lp. lub d.X.Y przed kalk. własna. */
const KALK_BOQ_ANCHOR_RE =
  /^(\d+(?:\.\d+)*\s+)?(d\.\d+\.\d+\s+)?(?:kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn|Kalkulacja)/i;

/** TP201C-B — wiersz tylko z d.X.Y + kalk. własna (LP na wierszu wyżej). */
const PDF_BOQ_KALK_DSEC_ROW_RE =
  /^d\.\d+\.\d+\s+(?:kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn)/i;

/** TP201C-B — wiersz z LP + opisem sekcji (nie start BOQ). */
const PDF_BOQ_LP_DESC_ROW_RE =
  /^(\d{1,3})\s+(?!d\.\d)(?!(?:NNRNKB|ZKNR|KNNR|KSNR|KNR)\b)(?!kalk)/i;

/** M6 (TP198C) + TP201C-B — WM skróty j.m. + pomiar/prób. (elektryka). */
const UNIT_RE =
  /\b(m\s*2|m²|m2|m\s*3|m³|m3|mb|kpl|szt\.?|t|kg|rbh|wyp\.?|otw\.?|podej\.?|aparat\.?|lokal\.?|pomiar|pom\.?|prób\.?|prob\.?)\b/i;

const WM_UNIT_ALIAS_TO_SZT = new Set(["wyp", "otw", "podej", "aparat", "lokal"]);

/** M2 — split segmentów BOQ (normy WM + markery d.X.Y + kalk. własna). */
const PDF_BOQ_SPLIT_RE =
  /(?=(?:\d+\s+)?d\.\d+\.\d+\s+(?:(?:NNRNKB|ZKNR|KNNR|KSNR|KNR(?:-W)?(?:\s+AT)?)|kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn)|(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)(?:[\s-]*[\dA-Za-z]))/gi;

/** TP201B-B — LP + d.X.Y lub LP + KNR (granice pozycji w płaskiej linii). */
const PDF_BOQ_LP_SPLIT_RE =
  /(?=\b\d+\s+d\.\d+\.\d+\s+(?:(?:NNRNKB|ZKNR|KNNR|KSNR|KNR(?:-W)?(?:\s+AT)?)|kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn)|\b\d+\s+(?:(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)|kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn))/gi;

/** TP201B-B — początek layout-row = nowa pozycja BOQ (łączenie kontynuacji opisu). */
const PDF_BOQ_LINE_START_RE =
  /^(\d+(?:\.\d+)*\s+)?(?:d\.\d+\.\d+\s+)?(?:(?:NNRNKB|ZKNR|KNNR|KSNR|(?<![A-Z])KNR(?:-W)?(?:\s+AT)?)|kalk\.?\s*własn|kalkulacj[aą]\s+własn|wycena\s+własn)/i;

/** TP201B-B — sam numer LP (kolumna tabeli). */
const PDF_BOQ_LP_ONLY_RE = /^\d+(?:\.\d+)*\s*$/;

/** TP201B-B — wiersz pomocniczy tabeli (nie pozycja). */
const PDF_BOQ_SKIP_ROW_RE = /^(?:RAZEM\b|STRONA\b|\d+\s*\/\s*\d+)/i;

/** TP201B-B — kontynuacja: d.X.Y + kod, wzór obmiaru, sama ilość+j.m. */
const PDF_BOQ_CONTINUATION_ROW_RE =
  /^(?:d\.\d+\.\d+\b|[\d.,*+]+\s+(?:m\s*[23]?|mb|m2|m3|szt|kpl|kg|t|rbh|wyp|pomiar|pom|prób|prob)|[\d.,]+\s+(?:m\s*[23]?|mb|m2|m3|szt|kpl|kg|t|rbh|wyp|pomiar|pom|prób|prob))/i;

/** TP201C-B — myślnik na końcu wiersza layout (kontynuacja słowa). */
const PDF_BOQ_HYPHEN_EOL_RE = /\b([a-ząćęłńóśźż]{2,})-\s*$/i;

/** TP201B-B — fałszywy opis = sam marker rozdziału. */
const PDF_BOQ_MARKER_ONLY_DESC_RE = /^d\.\d+\.\d+(?:\s+[\d.,]+)?\s*$/i;

const HEADER_NOISE = /^(?:podstawa|opis|nazwa|cena|warto|razem|suma|strona|\d+\s*\/\s*\d+)/i;

export const PDF_PRZEDMIAR_UX_LINES: Record<PdfPrzedmiarUxCase, string> = {
  1: "Rozpoznano pozycje robót w PDF.",
  2: "Znaleziono przedmiar PDF, ale nie udało się odczytać pozycji.",
  3: "PDF zawiera skan i wymaga OCR.",
};

/** P2-H.5C — brak warstwy tekstowej (CAD / pdf.js bez stron). */
export const PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE =
  "PDF nie zawiera warstwy tekstowej (np. eksport CAD) i wymaga OCR lub pliku ATH/XLS.";

/** TP190C-2E-B — błąd ekstrakcji pdf.js (nie mylić ze skanem/CAD). */
export const PDF_PRZEDMIAR_EXTRACT_ERROR_LINE =
  "Nie udało się odczytać warstwy tekstowej PDF (błąd ekstrakcji).";

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
    .replace(/\bpom\./gi, "pomiar")
    .replace(/\bprób\./gi, "prob")
    .replace(/\bprob\./gi, "prob")
    // M4 — WM „m” jako metry bieżące (po m2/m3, żeby nie psuć powierzchni/objętości)
    .replace(/\bm\b(?=\s+[\d])/gi, "mb");
}

/** TP201C-B — alias Kalkulacja + trailing „d.X.Y własna” z layoutu WM. */
function normalizePdfBoqAliases(text: string): string {
  return text
    .replace(/\bKalkulacja\b/g, "kalk. własna")
    .replace(/\s+d\.\d+\.\d+\s+własna\b/gi, "");
}

/** TP201C-B — sklejanie rozbitých sylab (nis- kiego, gipsowo - karton). */
export function rejoinPdfBoqHyphens(text: string): string {
  return text
    // Sylaba: myślnik przy pierwszym fragmencie (nis- kiego, pojem- ności).
    .replace(/\b([a-ząćęłńóśźż]{2,})-\s+([a-ząćęłńóśźż]{1,14})\b/gi, "$1$2")
    // Spacja wokół myślnika między członami jednego wyrazu (gipsowo - kartonowymi).
    .replace(/\b([a-ząćęłńóśźż]{2,})\s+-\s+([a-ząćęłńóśźż]{2,})\b/gi, "$1-$2");
}

/** TP201C-B — LP z wiersza wyżej + d.X.Y kalk. własna. */
function applyLpLookaheadKalk(layoutRows: string[]): string[] {
  const out: string[] = [];
  for (const raw of layoutRows) {
    const row = raw.trim();
    if (!row) continue;
    if (PDF_BOQ_KALK_DSEC_ROW_RE.test(row) && out.length > 0) {
      const prev = out[out.length - 1]!;
      const lpDesc = prev.match(PDF_BOQ_LP_DESC_ROW_RE);
      if (lpDesc && !PDF_BOQ_LINE_START_RE.test(prev)) {
        out[out.length - 1] = `${lpDesc[1]} ${row}`;
        continue;
      }
    }
    out.push(row);
  }
  return out;
}

function splitPdfBoqLongLine(trimmed: string): string[] {
  const byKnr = trimmed
    .split(PDF_BOQ_SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  if (byKnr.length > 1) return byKnr;

  const byLp = trimmed
    .split(PDF_BOQ_LP_SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  if (byLp.length > 1) return byLp;

  return trimmed.length > 8 ? [trimmed] : [];
}

/** M2 + TP201B-B — layout rows → segmenty pozycji (merge kontynuacji + split LP/KNR). */
export function splitPdfBoqText(text: string): string[] {
  const hay = rejoinPdfBoqHyphens(normalizePdfBoqAliases(normalizePdfText(text)));
  if (!hay) return [];

  const layoutRows = applyLpLookaheadKalk(hay.split("\n"));
  const merged: string[] = [];
  let buffer = "";

  const flushBuffer = () => {
    if (buffer.trim().length >= 8) merged.push(buffer.trim());
    buffer = "";
  };

  for (let ri = 0; ri < layoutRows.length; ri += 1) {
    let trimmed = layoutRows[ri]!.trim();
    if (trimmed.length < 2) continue;

    if (PDF_BOQ_HYPHEN_EOL_RE.test(trimmed) && ri + 1 < layoutRows.length) {
      const next = layoutRows[ri + 1]!.trim();
      if (next.length > 0 && !PDF_BOQ_LINE_START_RE.test(next)) {
        trimmed = `${trimmed.replace(PDF_BOQ_HYPHEN_EOL_RE, (_, p1: string) => p1)}${next}`;
        ri += 1;
      }
    }

    if (PDF_BOQ_SKIP_ROW_RE.test(trimmed)) {
      flushBuffer();
      continue;
    }

    if (PDF_BOQ_LP_ONLY_RE.test(trimmed)) {
      flushBuffer();
      buffer = `${trimmed} `;
      continue;
    }

    if (PDF_BOQ_LINE_START_RE.test(trimmed)) {
      flushBuffer();
      buffer = trimmed;
      continue;
    }

    if (buffer) {
      buffer = `${buffer} ${trimmed}`;
      continue;
    }

    if (PDF_BOQ_CONTINUATION_ROW_RE.test(trimmed) && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${trimmed}`;
      continue;
    }

    merged.push(...splitPdfBoqLongLine(trimmed));
  }
  flushBuffer();

  const segments: string[] = [];
  for (const chunk of merged) {
    if (chunk.length < 8) continue;
    const parts = splitPdfBoqLongLine(rejoinPdfBoqHyphens(chunk));
    if (parts.length > 0) segments.push(...parts);
  }

  return segments;
}

export function detectPdfPrzedmiarSignals(text: string): string[] {
  const hay = normalizePdfText(text);
  return SIGNAL_CHECKS.filter((s) => s.re.test(hay)).map((s) => s.id);
}

function extractKnrCode(fragment: string): string {
  return extractKnrCodeSpan(fragment.trim())?.code ?? "";
}

function normalizeUnitToken(raw: string): string {
  const norm = raw
    .replace(/\s+/g, "")
    .replace("²", "2")
    .replace("³", "3")
    .toLowerCase()
    .replace(/\.$/, "");
  if (norm === "m") return "mb";
  if (norm === "pom") return "pomiar";
  if (norm === "prób" || norm === "prob") return "prob";
  if (WM_UNIT_ALIAS_TO_SZT.has(norm)) return "szt";
  return norm;
}

function parseQuantityToken(raw: string): string {
  const t = raw.trim().replace(/\s/g, "");
  if (!/^[\d]+([.,]\d+)?$/.test(t)) return "";
  return raw.trim();
}

function resolveUnitQuantityAtMatch(
  trimmed: string,
  unitMatch: RegExpMatchArray,
): { unit: string; quantity: string; unitStart: number; unitMatch: RegExpMatchArray } | null {
  if (unitMatch.index == null) return null;
  const unit = normalizeUnitToken(unitMatch[1]);
  if (!unit) return null;

  let quantity = "";
  const afterUnit = trimmed.slice(unitMatch.index + unitMatch[0].length);
  const qtyAfterUnit = afterUnit.match(/^\s*([\d]+(?:[.,]\d+)?)/);
  if (qtyAfterUnit) quantity = parseQuantityToken(qtyAfterUnit[1]);
  if (!quantity) {
    const tail = trimmed.slice(unitMatch.index);
    const endQty = tail.match(/([\d]+(?:[.,]\d+)?)\s*$/);
    quantity = endQty ? parseQuantityToken(endQty[1]) : "";
  }
  if (!quantity) return null;

  return { unit, quantity, unitStart: unitMatch.index, unitMatch };
}

function extractUnitAndQuantity(trimmed: string): {
  unit: string;
  quantity: string;
  unitStart: number;
  unitMatch: RegExpMatchArray;
} | null {
  const unitRe = new RegExp(UNIT_RE.source, "gi");
  const matches = [...trimmed.matchAll(unitRe)];
  if (!matches.length) return null;

  if (matches.length === 1) {
    return resolveUnitQuantityAtMatch(trimmed, matches[0]!);
  }

  const firstIdx = matches[0]!.index ?? 0;
  const lastIdx = matches[matches.length - 1]!.index ?? 0;
  // TP201B-B — długi złączony wiersz: ostatnia j.m. (unika „pi- m 2” w środku opisu).
  const pickLast = trimmed.length >= 80 && lastIdx - firstIdx >= 30;
  const chosen = pickLast ? matches[matches.length - 1]! : matches[0]!;
  return resolveUnitQuantityAtMatch(trimmed, chosen);
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
  const code = "kalk. własna";

  const uq = extractUnitAndQuantity(trimmed);
  if (!uq) return null;

  const kalkEnd = kalkMatch.index + kalkMatch[0].length;
  let description = trimmed.slice(kalkEnd, uq.unitStart).trim();
  description = description.replace(/^[-–—]\s*/, "").trim();
  if (description.length < 4) {
    const dsec = trimmed.match(/\bd\.\d+\.\d+\b/)?.[0];
    if (dsec) {
      const afterDsec = trimmed
        .slice(trimmed.indexOf(dsec) + dsec.length, uq.unitStart)
        .replace(KALK_WLASNA_RE, "")
        .trim();
      if (afterDsec.length >= 4) description = afterDsec;
    }
  }
  if (description.length < 4) {
    description = trimmed.slice((lpMatch?.[0]?.length ?? 0), uq.unitStart).replace(code, "").trim();
  }
  if (description.length < 4) description = "Kalkulacja własna";
  if (PDF_BOQ_MARKER_ONLY_DESC_RE.test(description)) return null;

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
  const trimmed = normalizePdfBoqUnits(
    rejoinPdfBoqHyphens(normalizePdfBoqAliases(line.replace(/\s+/g, " ").trim())),
  );
  if (trimmed.length < 12 || HEADER_NOISE.test(trimmed)) return null;

  if (KALK_WLASNA_RE.test(trimmed)) {
    const kalkRow = parseKalkWlasnaPrzedmiarLine(trimmed);
    if (kalkRow) return kalkRow;
  }
  if (!KNR_IN_LINE.test(trimmed)) return null;

  const lpMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+/);
  const lp = lpMatch?.[1] ?? "";

  const knrSpan = extractKnrCodeSpan(trimmed);
  const code = knrSpan?.code ?? "";
  if (!code) return null;

  const uq = extractUnitAndQuantity(trimmed);
  if (!uq) return null;

  let description = trimmed.slice(knrSpan.codeEnd, uq.unitStart).trim();
  description = description.replace(/^[-–—]\s*/, "").trim();
  if (description.length < 4) {
    description = trimmed.slice((lpMatch?.[0]?.length ?? 0), uq.unitStart).replace(code, "").trim();
  }
  if (description.length < 4) return null;
  if (PDF_BOQ_MARKER_ONLY_DESC_RE.test(description)) return null;

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

/** TP201C-B — semantyczny klucz: ten sam kod KNR przy innym LP nie jest deduplikowany. */
export function pdfPrzedmiarRowLpCodeKey(
  row: Pick<AthPreviewRow, "lp" | "code">,
): string {
  return `${row.lp}|${row.code}`;
}

function assignRowLpFromSegment(row: AthPreviewRow, segment: string): void {
  if (row.lp) return;
  const lp = segment.match(/^(\d+(?:\.\d+)*)\s+/)?.[1];
  if (lp) row.lp = lp;
}

export function extractPdfPrzedmiarRows(text: string): AthPreviewRow[] {
  const segments = splitPdfBoqText(text);
  const rows: AthPreviewRow[] = [];
  const seen = new Set<string>();

  for (const line of segments) {
    const row = parsePdfPrzedmiarLine(line);
    if (!row) continue;
    assignRowLpFromSegment(row, line);
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
  opts?: { likelyScan?: boolean; noTextLayer?: boolean; extractError?: boolean },
): PdfPrzedmiarHeuristicResult {
  const warnings: string[] = [];

  if (opts?.extractError) {
    warnings.push(PDF_PRZEDMIAR_EXTRACT_ERROR_LINE);
    return {
      uxCase: 3,
      rows: [],
      signals: detectPdfPrzedmiarSignals(text),
      signalCount: 0,
      warnings,
    };
  }

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
  opts?: { likelyScan?: boolean; noTextLayer?: boolean; extractError?: boolean },
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
    pdfPrzedmiarNoTextLayer: Boolean(opts?.noTextLayer && !opts?.extractError && parsed.uxCase === 3),
    pdfPrzedmiarExtractError: Boolean(opts?.extractError && parsed.uxCase === 3),
  };
}
