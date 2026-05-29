/** Parsowanie SWZ / ogłoszenia BZP — wadium, kwota, referencje (best-effort). */

export type TenderProfitabilityHint = "good" | "caution" | "risky" | "unknown";

export interface TenderSwzAnalysis {
  estimatedValuePln: number | null;
  estimatedValueRaw: string | null;
  wadiumPln: number | null;
  wadiumRaw: string | null;
  referenceRequirement: string | null;
  qualificationHints: string[];
  parsedAt: string;
  source: "html" | "pdf" | "docx" | "manual";
  sourceFilename?: string;
  profitabilityHint: TenderProfitabilityHint;
  profitabilityNote: string;
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
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

/** Prosta ekstrakcja tekstu z PDF (bez pdf.js). */
export function extractPdfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw))) {
    const chunk = m[1]
      .replace(/[^\x09\x0a\x0d\x20-\x7EąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, " ")
      .replace(/\s+/g, " ");
    if (chunk.length > 30) chunks.push(chunk);
  }
  const parenRe = /\(([^)\\]{4,200})\)/g;
  while ((m = parenRe.exec(raw))) {
    if (/[a-zA-Ząćęłńóśźż]{3}/.test(m[1])) chunks.push(m[1]);
  }
  return chunks.join(" ");
}

export function parsePlnAmount(raw: string | null | undefined): { value: number | null; label: string | null } {
  if (!raw) return { value: null, label: null };
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*(?:zł|PLN|pln)/i)
    || cleaned.match(/([\d\s]+(?:[.,]\d{1,2})?)/);
  if (!m) return { value: null, label: cleaned.slice(0, 120) || null };
  const num = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? { value: num, label: cleaned.slice(0, 120) } : { value: null, label: cleaned.slice(0, 120) };
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim().slice(0, 500);
  }
  return null;
}

export function parseSwzPlainText(
  text: string,
  opts?: { source?: TenderSwzAnalysis["source"]; sourceFilename?: string; ourEstimatePln?: number | null },
): TenderSwzAnalysis {
  const folded = text.replace(/\s+/g, " ");
  const wadiumRaw = firstMatch(folded, [
    /wadium[:\s]+([^.;]{5,200})/i,
    /wysokość wadium[:\s]+([^.;]{5,200})/i,
    /wniesienia wadium[:\s]+([^.;]{5,200})/i,
  ]);
  const valueRaw = firstMatch(folded, [
    /wartość zamówienia[:\s]+([^.;]{5,200})/i,
    /szacunkow[aą] wartość[:\s]+([^.;]{5,200})/i,
    /wartość brutto[:\s]+([^.;]{5,200})/i,
    /całkowit[aą] wartość[:\s]+([^.;]{5,200})/i,
  ]);
  const referenceRequirement = firstMatch(folded, [
    /referencj[^.]{10,400}\./i,
    /doświadczen[^.]{10,400}\./i,
    /wykonan[^.]{0,40}robot[^.]{10,300}\./i,
    /co najmniej[^.]{10,200}zł[^.]{0,80}\./i,
  ]);
  const qualificationHints: string[] = [];
  for (const p of [
    /uprawnieni[^.]{10,200}\./gi,
    /wpis[^.]{5,80}rejestr[^.]{5,120}\./gi,
    /polisa[^.]{10,200}\./gi,
  ]) {
    const ms = folded.match(p);
    if (ms) qualificationHints.push(...ms.slice(0, 2).map((s) => s.trim().slice(0, 200)));
  }

  const { value: wadiumPln, label: wadiumLabel } = parsePlnAmount(wadiumRaw);
  const { value: estimatedValuePln, label: estLabel } = parsePlnAmount(valueRaw);

  const { hint, note } = assessProfitability({
    estimatedValuePln,
    wadiumPln,
    ourEstimatePln: opts?.ourEstimatePln ?? null,
  });

  return {
    estimatedValuePln,
    estimatedValueRaw: estLabel || valueRaw,
    wadiumPln: wadiumPln ?? parsePlnAmount(wadiumLabel).value,
    wadiumRaw: wadiumLabel || wadiumRaw,
    referenceRequirement,
    qualificationHints: [...new Set(qualificationHints)].slice(0, 5),
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
}): { hint: TenderProfitabilityHint; note: string } {
  const { estimatedValuePln, wadiumPln, ourEstimatePln } = opts;
  if (wadiumPln != null && wadiumPln >= 50_000) {
    return { hint: "risky", note: `Wysokie wadium (${fmtPln(wadiumPln)}) — sprawdź płynność.` };
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
    return { hint: "unknown", note: "Brak kwoty/wadium w tekście — uzupełnij ręcznie lub pobierz załąnik SWZ." };
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
