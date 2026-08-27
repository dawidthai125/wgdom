/**
 * APF PER_MEASUREMENT HTML parser — unit "pomiar" only.
 * No punkt/szt/obw/m2/mb proxy.
 */

import {
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  isApfForbiddenUnitProxyForMeasurement,
  normalizeApfSourceUnitToken,
} from "./apf-pricing-basis";
import type { ApfAuthorizedSourceId } from "./apf-source-authorization";

export type ApfParsedMeasurementRow = {
  descriptionPl: string;
  sourceUnit: "pomiar";
  unitRatePln: number;
  currency: "PLN";
  netGross: "netto" | "brutto" | "unknown";
  pricingBasis: typeof APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT;
  laborOnly: true;
  sourceId: ApfAuthorizedSourceId;
  sourceUrl: string;
};

const PACKAGE_REJECT_RE =
  /\b(mieszkanie|dom\s|domu|szko[lł]|obiekt|pakiet|cena\s+ca[lł]o[sś]ciow|dojazd|dokumentacj|usuni[eę]cie\s+usterk|godzin|godz\.|rbh|minimaln[aą]\s+op[lł]at|wyjazd|do\s+(\d+\s*)?km)\b/i;

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlnPrice(raw: string): number | null {
  const s = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const m = s.match(/(\d+[.,]\d{2}|\d+)\s*(?:zł|pln)?/);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function inferNetGross(html: string, rowText: string): "netto" | "brutto" | "unknown" {
  const blob = `${html} ${rowText}`.toLowerCase();
  if (/\bnetto\b/.test(blob)) return "netto";
  if (/\bbrutto\b/.test(blob)) return "brutto";
  return "unknown";
}

function isPerMeasurementTableHeader(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /rodzaj\s+pomiar/.test(t) &&
    (/cena\s+za\s+pomiar/.test(t) || /cena/.test(t))
  );
}

function rowLooksLikeMeasurement(description: string): boolean {
  if (!description || description.length < 8) return false;
  if (PACKAGE_REJECT_RE.test(description)) return false;
  const d = description.toLowerCase();
  return (
    /\bpomiar\b/.test(d) ||
    /\bbadanie\b/.test(d) ||
    /\bimpedancj/.test(d) ||
    /\brezystancj/.test(d) ||
    /\brcd\b/.test(d) ||
    /\bróżnicowoprądow/.test(d) ||
    /\bzerowan/.test(d) ||
    /\buziemien/.test(d) ||
    /\buziom/.test(d) ||
    /\bciągło[sś]ci\b/.test(d)
  );
}

function extractUnitFromRow(text: string, perMeasurementTable: boolean): string | null {
  const t = text.toLowerCase();
  if (/\b(?:\/|\s)(pomiar|pomiarów|pomiary)\b/.test(t)) return "pomiar";
  if (/\b(?:za|\/)\s*pomiar\b/.test(t)) return "pomiar";
  if (/\d+[.,]?\d*\s*zł[^/]*\/\s*pomiar/.test(t)) return "pomiar";
  if (/\bpunkt\b/.test(t)) return "punkt";
  if (/\bszt\b/.test(t)) return "szt";
  if (/\bobw\b/.test(t)) return "obw";
  if (perMeasurementTable && parsePlnPrice(text) != null) return "pomiar";
  return null;
}

function parseTableRows(tableHtml: string): Array<{ description: string; priceRaw: string; rowText: string }> {
  const rows: Array<{ description: string; priceRaw: string; rowText: string }> = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableHtml))) {
    const rowHtml = tr[1]!;
    const rowText = stripTags(rowHtml);
    if (!rowText || /rodzaj\s+pomiaru/i.test(rowText)) continue;
    const cells: string[] = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(rowHtml))) {
      cells.push(stripTags(td[1]!));
    }
    if (cells.length >= 2) {
      rows.push({
        description: cells[0]!,
        priceRaw: cells[1]!,
        rowText,
      });
      continue;
    }
    const price = parsePlnPrice(rowText);
    if (price != null && rowLooksLikeMeasurement(rowText)) {
      const desc = rowText.replace(/\d+[.,]\d{2}\s*zł.*$/i, "").trim();
      rows.push({ description: desc, priceRaw: rowText, rowText });
    }
  }
  return rows;
}

export function parseApfMeasurementPriceHtml(input: {
  html: string;
  sourceId: ApfAuthorizedSourceId;
  sourceUrl: string;
}): ApfParsedMeasurementRow[] {
  const html = String(input.html || "");
  if (!html.trim()) return [];

  const tableBlocks = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  let targetTable: string | null = null;
  for (const block of tableBlocks) {
    const header = stripTags(block.slice(0, Math.min(block.length, 600)));
    if (isPerMeasurementTableHeader(header)) {
      targetTable = block;
      break;
    }
  }
  if (!targetTable) {
    for (const block of tableBlocks) {
      const flat = stripTags(block).toLowerCase();
      if (flat.includes("pomiar") && /zł/.test(flat)) {
        targetTable = block;
        break;
      }
    }
  }
  if (!targetTable) return [];

  const netGrossDefault = inferNetGross(html, targetTable);
  const headerText = stripTags(targetTable.slice(0, Math.min(targetTable.length, 600)));
  const perMeasurementTable = isPerMeasurementTableHeader(headerText);
  const parsed: ApfParsedMeasurementRow[] = [];

  for (const row of parseTableRows(targetTable)) {
    const descriptionPl = row.description.trim();
    if (!rowLooksLikeMeasurement(descriptionPl)) continue;
    if (PACKAGE_REJECT_RE.test(descriptionPl) || PACKAGE_REJECT_RE.test(row.rowText)) {
      continue;
    }

    const unitToken =
      extractUnitFromRow(row.rowText, perMeasurementTable) ??
      extractUnitFromRow(row.priceRaw, perMeasurementTable);
    if (!unitToken) continue;
    if (isApfForbiddenUnitProxyForMeasurement(unitToken) || unitToken === "punkt") {
      continue;
    }
    const normalizedUnit = normalizeApfSourceUnitToken(unitToken);
    if (normalizedUnit !== "pomiar") continue;

    const unitRatePln = parsePlnPrice(row.priceRaw);
    if (unitRatePln == null) continue;

    parsed.push({
      descriptionPl,
      sourceUnit: "pomiar",
      unitRatePln,
      currency: "PLN",
      netGross: inferNetGross(html, row.rowText) === "unknown" ? netGrossDefault : inferNetGross(html, row.rowText),
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      laborOnly: true,
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
    });
  }

  return parsed;
}
