/** Parsowanie SWZ / ogłoszenia BZP — wadium, kwota, referencje, terminy (best-effort). */

import {
  extractFormalRequirements,
  type FormalRequirement,
} from "@/lib/tender-formal-requirements";
import {
  extractParticipationRequirements,
  mergeParticipationRequirements,
  type TenderParticipationRequirement,
} from "@/lib/tender-participation-requirements";

export interface TenderCostLine {
  lp: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export type TenderProfitabilityHint = "good" | "caution" | "risky" | "unknown";

export interface TenderSwzAnalysis {
  estimatedValuePln: number | null;
  estimatedValueRaw: string | null;
  wadiumPln: number | null;
  wadiumRaw: string | null;
  referenceRequirement: string | null;
  /** @deprecated Używaj formalRequirements — zachowane dla merge/sync. */
  qualificationHints: string[];
  /** P2-F.0 — wymagania formalne (personel, uprawnienia, członkostwo, doświadczenie). */
  formalRequirements?: FormalRequirement[];
  /** P2-F.1 — warunki udziału w postępowaniu (porównanie z profilem wykonawcy). */
  participationRequirements?: TenderParticipationRequirement[];
  /** Termin / okres realizacji zamówienia. */
  implementationDeadlineRaw: string | null;
  implementationDays: number | null;
  /** Wymagania techniczne / jakościowe (fragmenty). */
  technicalRequirements: string[];
  /** Wiersze przypominające pozycje kosztorysu / tabelę. */
  tableExtracts: string[];
  /** Ustrukturyzowane pozycje kosztorysu (heurystyka PDF/tekst). */
  costLines: TenderCostLine[];
  parsedAt: string;
  source: "html" | "pdf" | "docx" | "manual";
  sourceFilename?: string;
  profitabilityHint: TenderProfitabilityHint;
  profitabilityNote: string;
  /** Kryteria oceny wyciągnięte z SWZ/PDF. */
  awardCriteria?: {
    name: string;
    weightPct: number | null;
    maxPoints: number | null;
    description: string;
  }[];
  /** Wadium jako % wartości zamówienia. */
  wadiumPercent?: number | null;
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Prosta ekstrakcja tekstu z PDF (bez pdf.js) — zachowuje więcej struktury wierszy. */
export function extractPdfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw))) {
    const chunk = m[1]
      .replace(/[^\x09\x0a\x0d\x20-\x7EąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, " ")
      .replace(/(\d)\s+(\d)/g, "$1.$2")
      .replace(/\s{2,}/g, " | ");
    if (chunk.length > 30) chunks.push(chunk);
  }
  const parenRe = /\(([^)\\]{4,300})\)/g;
  while ((m = parenRe.exec(raw))) {
    if (/[a-zA-Ząćęłńóśźż]{3}/.test(m[1])) chunks.push(m[1]);
  }
  return chunks.join("\n");
}

export function parsePlnAmount(raw: string | null | undefined): { value: number | null; label: string | null } {
  if (!raw) return { value: null, label: null };
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const withCurrency = cleaned.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*(?:zł|PLN|pln)/i);
  if (withCurrency) {
    const num = parseFloat(withCurrency[1].replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(num) && num > 0) {
      return { value: num, label: cleaned.slice(0, 120) || null };
    }
  }
  const thousands = cleaned.match(/([\d]{1,3}(?:\s[\d]{3})+(?:[.,]\d{2})?)/);
  if (thousands) {
    const num = parseFloat(thousands[1].replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(num) && num >= 100) {
      return { value: num, label: cleaned.slice(0, 120) || null };
    }
  }
  return { value: null, label: cleaned.slice(0, 120) || null };
}

function parsePercentToken(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
  return n;
}

function extractWadiumPercentLocal(text: string): number | null {
  const folded = text.replace(/\s+/g, " ");
  const patterns = [
    /wadium[^.]{0,400}?(\d+[,.]?\d*)\s*%\s*(?:warto|szacunk|zamówienia|netto|brutto)/i,
    /(\d+[,.]?\d*)\s*%\s*[^.]{0,60}warto[^.]{0,60}zamówienia/i,
    /wysokość wadium[^.]{0,120}(\d+[,.]?\d*)\s*%/i,
    /wadium[^.]{0,400}?(\d+[,.]?\d*)\s*%/i,
  ];
  for (const p of patterns) {
    const m = folded.match(p);
    if (m?.[1]) {
      const n = parsePercentToken(m[1]);
      if (n != null) return n;
    }
  }
  return null;
}

function extractTakPercentHint(snippet: string, window: string): number | null {
  const scope = `${snippet} ${window}`.replace(/\s+/g, " ");
  if (/%/.test(scope) || /\b(?:zł|PLN|pln)\b/i.test(scope)) return null;
  const m = snippet.trim().match(/^tak\b[,\s]*(\d{1,2})$/i);
  if (!m?.[1]) return null;
  return parsePercentToken(m[1]);
}

function extractWadiumWindow(text: string): string {
  const folded = text.replace(/\s+/g, " ");
  const m = folded.match(/(?:wniesieni[ea]\s+)?(?:wysokość\s+)?wadium[^.]{0,480}/i);
  return m?.[0] ?? "";
}

export function isWeakWadiumRaw(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const t = raw.trim();
  if (/^tak\b[,\s]*(\d{1,2})$/i.test(t)) return true;
  if (/^tak\b/i.test(t) && !/\d{3,}/.test(t) && !/%/.test(t)) return true;
  if (/^nie\b/i.test(t)) return true;
  if (/^\d{1,2}\s*(?:zł|PLN|pln)?$/i.test(t)) return true;
  return false;
}

export function formatWadiumPercentLabel(percent: number): string {
  const label = Number.isInteger(percent) ? String(percent) : String(percent).replace(".", ",");
  return `${label}% wartości zamówienia`;
}

/** Etykieta wadium do UI/toast — pomija słabe „Tak 6”. */
export function formatSwzWadiumDisplay(
  swz: Pick<TenderSwzAnalysis, "wadiumRaw" | "wadiumPln" | "wadiumPercent">,
): string | null {
  if (swz.wadiumPercent != null) return formatWadiumPercentLabel(swz.wadiumPercent);
  if (swz.wadiumPln != null && swz.wadiumPln >= 100) return fmtPln(swz.wadiumPln);
  if (swz.wadiumRaw && !isWeakWadiumRaw(swz.wadiumRaw)) return swz.wadiumRaw;
  return null;
}

/** Wadium — odróżnia „Tak/6%” od błędnego „6 zł” i nie myli z wartością zamówienia. */
export function parseWadiumFromSwzText(
  text: string,
  wadiumSnippet: string | null,
  estimatedValuePln: number | null,
): { wadiumPln: number | null; wadiumRaw: string | null; wadiumPercent: number | null } {
  const snippet = (wadiumSnippet || "").trim();
  const window = extractWadiumWindow(text);
  const ctx = snippet.length >= 5 ? snippet : (window || text.replace(/\s+/g, " ").slice(0, 400));

  if (/^tak[,\s.]*$/i.test(snippet) || /^nie[,\s.]*$/i.test(snippet)) {
    return { wadiumPln: null, wadiumRaw: null, wadiumPercent: null };
  }

  const wadiumPercent = extractWadiumPercentLocal(window)
    ?? extractWadiumPercentLocal(ctx)
    ?? extractTakPercentHint(snippet, window);

  if (wadiumPercent != null) {
    const wadiumPln = estimatedValuePln != null
      ? Math.round(estimatedValuePln * wadiumPercent / 100)
      : null;
    return {
      wadiumPln,
      wadiumRaw: formatWadiumPercentLabel(wadiumPercent),
      wadiumPercent,
    };
  }

  let wadiumPln: number | null = null;
  let wadiumRaw: string | null = snippet || window || null;
  const plnScope = window || ctx;

  const plnPatterns = [
    /wadium[^.]{0,160}?([\d\s]{1,12}[,.]\d{2})\s*(?:zł|PLN|pln)/i,
    /wadium[^.]{0,160}?([\d]{1,3}(?:\s[\d]{3})+(?:[,.]\d{2})?)\s*(?:zł|PLN|pln)/i,
    /([\d\s]{1,12}[,.]\d{2})\s*(?:zł|PLN|pln)[^.]{0,40}wadium/i,
  ];
  for (const p of plnPatterns) {
    const m = plnScope.match(p);
    if (m?.[1]) {
      const parsed = parsePlnAmount(`${m[1]} zł`);
      if (parsed.value != null && parsed.value >= 100) {
        if (estimatedValuePln != null && parsed.value >= estimatedValuePln * 0.5) continue;
        wadiumPln = parsed.value;
        wadiumRaw = m[0].trim().slice(0, 140);
        break;
      }
    }
  }

  if (wadiumRaw && isWeakWadiumRaw(wadiumRaw)) wadiumRaw = null;
  if (wadiumPln != null && wadiumPln < 100) wadiumPln = null;

  return { wadiumPln, wadiumRaw, wadiumPercent: null };
}

export function pickBetterWadiumPln(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a ?? null;
  if (a < 100 && b >= 100) return b;
  if (b < 100 && a >= 100) return a;
  return a;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim().slice(0, 500);
  }
  return null;
}

function allMatches(text: string, pattern: RegExp, limit = 5): string[] {
  const out: string[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < limit) {
    const s = (m[1] || m[0]).replace(/\s+/g, " ").trim().slice(0, 280);
    if (s.length >= 12) out.push(s);
  }
  return [...new Set(out)];
}

/** Wiersze z liczbami i jednostkami (m2, szt, kpl…) — heurystyka tabel kosztorysu. */
export function extractTableHints(text: string): string[] {
  const parts = text.split(/\n|\s\|\s|\s{3,}/);
  const rows: string[] = [];
  for (const part of parts) {
    const line = part.replace(/\s+/g, " ").trim();
    if (line.length < 15 || line.length > 220) continue;
    const hasUnit = /\b(m2|m²|mb|szt|kpl|kg|t|godz|h|rbh)\b/i.test(line);
    const hasMoney = /\d+[,.]\d{2}|\d+\s*\d{3}/.test(line);
    const hasLp = /^\d{1,3}[\s.)]/.test(line);
    if ((hasUnit && hasMoney) || (hasLp && hasMoney && line.split(" ").length >= 4)) {
      rows.push(line);
    }
  }
  return [...new Set(rows)].slice(0, 10);
}

/** Ustrukturyzowane pozycje kosztorysu z tekstu PDF/SWZ. */
export function parseStructuredCostLines(text: string): TenderCostLine[] {
  const lines: TenderCostLine[] = [];
  const parts = text.split(/\n|\s\|\s/);
  let lp = 0;
  for (const part of parts) {
    const line = part.replace(/\s+/g, " ").trim();
    if (line.length < 12 || line.length > 280) continue;
    const money = line.match(/(\d[\d\s]*[.,]\d{2})\s*(?:zł|PLN)?/gi);
    if (!money || money.length < 1) continue;
    const unitM = line.match(/\b(m2|m²|mb|szt|kpl|kg|t|godz|h|rbh|km)\b/i);
    if (!unitM && money.length < 2) continue;
    lp += 1;
    const total = money[money.length - 1].replace(/\s/g, "");
    const unitPrice = money.length >= 2 ? money[money.length - 2].replace(/\s/g, "") : "";
    const qtyM = line.match(/(\d+[.,]?\d*)\s*(?:m2|m²|mb|szt|kpl|kg|rbh|godz|h)\b/i);
    lines.push({
      lp: String(lp),
      description: line.slice(0, 120),
      unit: unitM?.[1] ?? "",
      quantity: qtyM?.[1] ?? "",
      unitPrice,
      total,
    });
    if (lines.length >= 25) break;
  }
  return lines;
}

function parseImplementationDays(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)\s*(?:dni|dzień|dni roboczy)/i)
    || raw.match(/(\d+)\s*(?:miesięcy|miesiące|mies)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  return /mies/i.test(m[0]) ? n * 30 : n;
}

export function parseSwzPlainText(
  text: string,
  opts?: { source?: TenderSwzAnalysis["source"]; sourceFilename?: string; ourEstimatePln?: number | null },
): TenderSwzAnalysis {
  const folded = text.replace(/\s+/g, " ");
  const multiline = text.replace(/\s+/g, " ");

  const wadiumRaw = firstMatch(folded, [
    /wadium[:\s]+([^.;]{5,200})/i,
    /wysokość wadium[:\s]+([^.;]{5,200})/i,
    /wniesienia wadium[:\s]+([^.;]{5,200})/i,
    /form[aą] wadium[:\s]+([^.;]{5,200})/i,
  ]);
  const valueRaw = firstMatch(folded, [
    /wartość zamówienia[:\s]+([^.;]{5,200})/i,
    /szacunkow[aą] wartość[:\s]+([^.;]{5,200})/i,
    /wartość brutto[:\s]+([^.;]{5,200})/i,
    /całkowit[aą] wartość[:\s]+([^.;]{5,200})/i,
    /przewidywan[aą] wartość[:\s]+([^.;]{5,200})/i,
  ]);
  const referenceRequirement = firstMatch(folded, [
    /referencj[^.]{10,400}\./i,
    /doświadczen[^.]{10,400}\./i,
    /wykonan[^.]{0,40}robot[^.]{10,300}\./i,
    /co najmniej[^.]{10,200}zł[^.]{0,80}\./i,
  ]);
  const implementationDeadlineRaw = firstMatch(folded, [
    /termin realizacji[:\s]+([^.;]{5,160})/i,
    /okres realizacji[:\s]+([^.;]{5,160})/i,
    /termin wykonania[:\s]+([^.;]{5,160})/i,
    /termin zakończenia[^:]{0,20}[:\s]+([^.;]{5,160})/i,
    /wykonanie zamówienia[:\s]+([^.;]{5,160})/i,
  ]);

  const sourceText = text.length > 500 ? text : multiline;
  const formalRequirements = extractFormalRequirements(sourceText);
  const participationRequirements = extractParticipationRequirements(sourceText);
  const qualificationHints = formalRequirements.map((r) => r.label).slice(0, 5);

  const technicalRequirements = allMatches(multiline, /wymagania techniczne[^:]{0,40}[:\s]+([^.]{15,280}\.)/gi, 4);
  if (technicalRequirements.length === 0) {
    technicalRequirements.push(
      ...allMatches(multiline, /norm[aą][^.]{5,120}\./gi, 2),
      ...allMatches(multiline, /materiały[^.]{10,200}\./gi, 2),
    );
  }

  const tableExtracts = extractTableHints(text.length > 500 ? text : multiline);
  const costLines = parseStructuredCostLines(text.length > 500 ? text : multiline);

  const { value: estimatedValuePln, label: estLabel } = parsePlnAmount(valueRaw);
  const wadiumParsed = parseWadiumFromSwzText(folded, wadiumRaw, estimatedValuePln);
  const implementationDays = parseImplementationDays(implementationDeadlineRaw);

  const { hint, note } = assessProfitability({
    estimatedValuePln,
    wadiumPln: wadiumParsed.wadiumPln,
    ourEstimatePln: opts?.ourEstimatePln ?? null,
    implementationDays,
  });

  return {
    estimatedValuePln,
    estimatedValueRaw: estLabel || valueRaw,
    wadiumPln: wadiumParsed.wadiumPln,
    wadiumRaw: wadiumParsed.wadiumRaw,
    wadiumPercent: wadiumParsed.wadiumPercent,
    referenceRequirement,
    qualificationHints: [...new Set(qualificationHints)].slice(0, 5),
    formalRequirements,
    participationRequirements,
    implementationDeadlineRaw,
    implementationDays,
    technicalRequirements: [...new Set(technicalRequirements)].slice(0, 6),
    tableExtracts,
    costLines,
    parsedAt: new Date().toISOString(),
    source: opts?.source ?? "html",
    sourceFilename: opts?.sourceFilename,
    profitabilityHint: hint,
    profitabilityNote: note,
  };
}

export function assessProfitability(opts: {
  estimatedValuePln: number | null;
  wadiumPln: number | null;
  ourEstimatePln: number | null;
  implementationDays?: number | null;
}): { hint: TenderProfitabilityHint; note: string } {
  const { estimatedValuePln, wadiumPln, ourEstimatePln, implementationDays } = opts;
  if (wadiumPln != null && wadiumPln >= 50_000) {
    return { hint: "risky", note: `Wysokie wadium (${fmtPln(wadiumPln)}) — sprawdź płynność.` };
  }
  if (implementationDays != null && implementationDays <= 14 && estimatedValuePln != null && estimatedValuePln > 100_000) {
    return { hint: "caution", note: `Krótki termin realizacji (${implementationDays} dni) przy dużej wartości — sprawdź moce.` };
  }
  if (estimatedValuePln != null && ourEstimatePln != null && ourEstimatePln > estimatedValuePln * 1.15) {
    return { hint: "caution", note: "Wasz szacunek wyższy niż wartość w SWZ — ryzyko nieopłacalności." };
  }
  if (estimatedValuePln != null && ourEstimatePln != null && ourEstimatePln <= estimatedValuePln * 0.92) {
    return { hint: "good", note: "Szacunek poniżej wartości zamówienia — margines na star." };
  }
  if (estimatedValuePln != null && estimatedValuePln >= 30_000) {
    return { hint: "good", note: `Wartość zamówienia ~${fmtPln(estimatedValuePln)} — weryfikuj zakres w SWZ.` };
  }
  if (estimatedValuePln == null && wadiumPln == null) {
    return { hint: "unknown", note: "Brak kwoty/wadium w tekście — uzupełnij ręcznie lub pobierz załącznik SWZ." };
  }
  return { hint: "caution", note: "Dane częściowe — przejrzyj pełną SWZ przed decyzją." };
}

export function fmtPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł`;
}

export const PROFITABILITY_LABELS: Record<TenderProfitabilityHint, string> = {
  good: "Sensowny",
  caution: "Ostrożnie",
  risky: "Ryzykowny",
  unknown: "Brak danych",
};
