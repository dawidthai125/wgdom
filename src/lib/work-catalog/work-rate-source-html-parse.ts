/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 / REAL-WORLD-VALIDATION-03
 * URL builders (kanoniczne cenniki) + HTML parse:
 * 1) fixture markers data-wgdom-work-rate
 * 2) tabele cennikowe (KB / SCCOT / Extradom / CennikRemontow)
 * Fail-soft · nie inventuj · SELECTIVE (tylko match do expectedNamePl).
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type {
  WorkRateParsedOffer,
  WorkRateSourceId,
} from "@/lib/work-catalog/work-rate-selective-lookup-types";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export const WORK_RATE_ALLOWED_HOSTS = new Set([
  "kb.pl",
  "www.kb.pl",
  "sccot.pl",
  "www.sccot.pl",
  "extradom.pl",
  "www.extradom.pl",
  "cennikremontow.pl",
  "www.cennikremontow.pl",
]);

/** Kanoniczne strony cenników (Owner) — 1 URL / źródło · nie search harvest. */
export const WORK_RATE_CANONICAL_CENNIK_URL: Record<WorkRateSourceId, string> = {
  kb_pl: "https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/",
  sccot: "https://sccot.pl/dobra-robota/cennik-uslug-budowlanych-i-remontowych/",
  extradom: "https://www.extradom.pl/porady/artykul-cennik-uslug-budowlanych",
  cennikremontow_pl: "https://cennikremontow.pl/wroclaw-remonty-cennik/",
};

export function isWorkRateSelectiveUrlAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === "https:" && WORK_RATE_ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Selective lookup URL: kanoniczna strona cennika źródła (PASS1).
 * `query` jest wymagane semantycznie (match w parserze), nie buduje ścieżki kategorii.
 * PASS2: use resolveWorkRatePass2Url(sourceId, categoryKey) — never client URL.
 */
export function buildWorkRateSelectiveRequestUrl(input: {
  sourceId: WorkRateSourceId;
  query: string;
}): string | null {
  const term = String(input.query || "").trim();
  if (term.length < 2) return null;
  const url = WORK_RATE_CANONICAL_CENNIK_URL[input.sourceId];
  if (!url || !isWorkRateSelectiveUrlAllowed(url)) return null;
  return url;
}

function parseRegionToken(raw: string | undefined): WorkRateRegionScope {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (s.includes("wroclaw") || s === "wro") return "WROCLAW";
  if (s.includes("dolny") || s.includes("dolnoslask") || s === "ds") return "DOLNY_SLASK";
  if (s.includes("polska") || s === "pl" || s === "poland") return "POLSKA";
  return "POLSKA";
}

function regionFromSourceUrl(sourceUrl: string, _sourceId: WorkRateSourceId): WorkRateRegionScope {
  const low = sourceUrl.toLowerCase();
  // Only URL location tokens — never hardcode sourceId → WROCLAW (KB national ≠ Wrocław).
  if (low.includes("wroclaw") || low.includes("wroc%c5%82aw") || low.includes("wrocÅ‚aw")) {
    return "WROCLAW";
  }
  if (
    low.includes("dolny") ||
    low.includes("dolnoslask") ||
    low.includes("dolno%c5%9blask") ||
    low.includes("dolnyslask")
  ) {
    return "DOLNY_SLASK";
  }
  return "POLSKA";
}

function decodeAttr(html: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = html.match(re);
  return m?.[1] ?? null;
}

export function namesLooselyMatch(expected: string, found: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const a = norm(expected);
  const b = norm(found);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const tokens = a.split(" ").filter((t) => t.length > 3);
  if (tokens.length === 0) return false;
  // Pierwszy token (czasownik / rdzeń) musi być na początku nazwy znalezionej.
  const first = tokens[0]!;
  const bWords = b.split(" ").filter(Boolean);
  const firstFound = bWords[0] || "";
  // Rdzeń nazwy (pierwsze słowo) musi odpowiadać pierwszemu tokenowi oczekiwanemu.
  const firstOk =
    firstFound === first ||
    firstFound.startsWith(first) ||
    (first.startsWith(firstFound) && firstFound.length >= 6);
  if (!firstOk) return false;
  const hit = tokens.filter((t) => bWords.some((w) => w === t || w.startsWith(t))).length;
  return hit >= Math.ceil(tokens.length * 0.6);
}

/** Match expected OR any Owner alternate name — same algorithm, no threshold loosen. */
export function namesLooselyMatchAny(
  expectedNames: readonly string[],
  found: string,
): { ok: true; matchedAs: string } | { ok: false } {
  for (const exp of expectedNames) {
    if (!exp) continue;
    if (namesLooselyMatch(exp, found)) return { ok: true, matchedAs: exp };
  }
  return { ok: false };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#8211;/g, "–")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/<sup>\s*2\s*<\/sup>/gi, "2")
    .replace(/m<sup>\s*2\s*<\/sup>/gi, "m2");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseUnitToken(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/zł\/?/g, "")
    .replace(/pln\/?/g, "");
  if (s.includes("m2") || s.includes("m²") || s === "m^2") return "m2";
  if (s.includes("mb") || s.includes("m.b")) return "mb";
  if (s.includes("szt")) return "szt";
  if (s.includes("kpl")) return "kpl";
  if (s === "h" || s.includes("godz") || s.includes("rbh")) return "h";
  if (s.includes("m3")) return "m3";
  return s;
}

function descriptionImpliesMaterial(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /obejmuje\s+(koszt\s+)?(zakupu\s+)?(farby|materiał)/i.test(t) ||
    /z\s+materiał/i.test(t) ||
    /wraz\s+z\s+materiał/i.test(t) ||
    /cena\s+obejmuje\s+.*farb/i.test(t) ||
    /robocizn[ay].*oraz.*farb/i.test(t)
  );
}

function descriptionLaborOnlyHint(text: string): boolean {
  const t = text.toLowerCase();
  return /bez\s+materiał/i.test(t) || /tylko\s+robocizn/i.test(t) || /obejmuje\s+usługę\s+montażową\s+bez\s+materiał/i.test(t);
}

function isPackageName(name: string): boolean {
  return /malowanie\s+pokoju\s+\d+/i.test(name) || /pakiet/i.test(name) || /kompleksow/i.test(name);
}

type RawRowCandidate = {
  name: string;
  ratePln: number;
  unit: string;
  priceKind: WorkRateParsedOffer["priceKind"];
  includesMaterial: boolean;
  laborOnly: boolean;
  netGross: WorkRateParsedOffer["netGross"];
  detail: string;
  sourceMinPln: number | null;
  sourceMaxPln: number | null;
  marketBaseKind: "point" | "range_midpoint";
};

function parsePriceCell(cell: string): {
  ratePln: number | null;
  isMinimum: boolean;
  isRange: boolean;
  sourceMinPln: number | null;
  sourceMaxPln: number | null;
} {
  const t = cell.replace(/\s+/g, " ").trim();
  const isMinimum = /^od\s+/i.test(t) || /\bod\s+\d/i.test(t);
  // range: 15–25 or 15-25 or 15 — 25
  const range = t.match(/(\d+[.,]?\d*)\s*[–—\-]\s*(\d+[.,]?\d*)/);
  if (range) {
    const a = Number(range[1]!.replace(",", "."));
    const b = Number(range[2]!.replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return {
        ratePln: Math.round(((lo + hi) / 2) * 100) / 100,
        isMinimum,
        isRange: true,
        sourceMinPln: lo,
        sourceMaxPln: hi,
      };
    }
  }
  const single = t.match(/(\d+[.,]\d+|\d+)/);
  if (single) {
    const n = Number(single[1]!.replace(",", "."));
    if (Number.isFinite(n) && n > 0) {
      return {
        ratePln: n,
        isMinimum,
        isRange: false,
        sourceMinPln: null,
        sourceMaxPln: null,
      };
    }
  }
  return {
    ratePln: null,
    isMinimum,
    isRange: false,
    sourceMinPln: null,
    sourceMaxPln: null,
  };
}

function extractUnitFromCells(cells: string[]): string {
  const joined = cells.join(" ");
  const m =
    joined.match(/zł\s*\/\s*m\s*2|zł\/m²|zł\/m2|\/\s*m2|\/\s*m²/i) ||
    joined.match(/\bm2\b|\bm²\b/i) ||
    joined.match(/zł\s*\/\s*mb|\/\s*mb|\bmb\b/i) ||
    joined.match(/zł\s*\/\s*szt|\/\s*szt|\bszt\b/i);
  if (!m) {
    // bare unit column
    for (const c of cells) {
      const u = parseUnitToken(c);
      if (u === "m2" || u === "mb" || u === "szt" || u === "kpl" || u === "h") return u;
    }
    return "";
  }
  const raw = m[0];
  if (/mb/i.test(raw)) return "mb";
  if (/szt/i.test(raw)) return "szt";
  return "m2";
}

function parseTableRowCandidate(cells: string[]): RawRowCandidate | null {
  if (cells.length < 2) return null;
  const name = cells[0]!.trim();
  if (!name || name.length < 3) return null;
  if (/^usług|^cena|^pozycj|^lp\b/i.test(name)) return null;

  // CR style: name | min | max | unit  (unit = krótka kolumna)
  if (cells.length >= 4) {
    const unitCol = cells[3]!.trim();
    const unitFromCol = parseUnitToken(unitCol);
    const unitColLooksLikeUnit =
      unitCol.length <= 6 &&
      (unitFromCol === "m2" ||
        unitFromCol === "mb" ||
        unitFromCol === "szt" ||
        unitFromCol === "kpl" ||
        unitFromCol === "h");
    if (unitColLooksLikeUnit) {
      const a = parsePriceCell(cells[1]!);
      const b = parsePriceCell(cells[2]!);
      if (a.ratePln != null && b.ratePln != null) {
        const lo = Math.min(a.ratePln, b.ratePln);
        const hi = Math.max(a.ratePln, b.ratePln);
        const ratePln = Math.round(((lo + hi) / 2) * 100) / 100;
        const detail = cells.slice(4).join(" ") || "";
        const includesMaterial = descriptionImpliesMaterial(name + " " + detail);
        const laborOnly = descriptionLaborOnlyHint(name + " " + detail) || !includesMaterial;
        const isRangePair = Math.abs(lo - hi) > 1e-9;
        return {
          name,
          ratePln,
          unit: unitFromCol,
          priceKind: isPackageName(name) ? "package" : "regular",
          includesMaterial,
          laborOnly: laborOnly && !includesMaterial,
          netGross: "unknown",
          detail,
          sourceMinPln: isRangePair ? lo : null,
          sourceMaxPln: isRangePair ? hi : null,
          marketBaseKind: isRangePair ? "range_midpoint" : "point",
        };
      }
    }
  }

  // KB / Extradom / SCCOT: name | price(+unit) | [price] | [opis]
  const priceCells = cells.slice(1);
  const parsedPrices = priceCells.map(parsePriceCell).filter((p) => p.ratePln != null);
  if (parsedPrices.length === 0) return null;

  const unit = extractUnitFromCells(cells);
  // Package total without unit area: Malowanie pokoju 10 m2 | od 1700 zł
  if (!unit && /pokoju\s+\d+/i.test(name)) {
    const p = parsedPrices[0]!;
    return {
      name,
      ratePln: p.ratePln!,
      unit: "szt",
      priceKind: "package",
      includesMaterial: false,
      laborOnly: false,
      netGross: "unknown",
      detail: cells.slice(1).join(" "),
      sourceMinPln: null,
      sourceMaxPln: null,
      marketBaseKind: "point",
    };
  }
  if (!unit) return null;

  let ratePln: number;
  let isMinimum = parsedPrices.some((p) => p.isMinimum);
  let sourceMinPln: number | null = null;
  let sourceMaxPln: number | null = null;
  let marketBaseKind: "point" | "range_midpoint" = "point";

  if (parsedPrices.length >= 2 && !parsedPrices[0]!.isRange) {
    const a = parsedPrices[0]!.ratePln!;
    const b = parsedPrices[1]!.ratePln!;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    ratePln = Math.round(((lo + hi) / 2) * 100) / 100;
    if (Math.abs(lo - hi) > 1e-9) {
      sourceMinPln = lo;
      sourceMaxPln = hi;
      marketBaseKind = "range_midpoint";
    }
  } else {
    const p0 = parsedPrices[0]!;
    ratePln = p0.ratePln!;
    isMinimum = isMinimum || p0.isMinimum;
    if (p0.isRange && p0.sourceMinPln != null && p0.sourceMaxPln != null) {
      sourceMinPln = p0.sourceMinPln;
      sourceMaxPln = p0.sourceMaxPln;
      marketBaseKind = "range_midpoint";
    }
  }

  const detail = cells.slice(1).join(" ");
  const includesMaterial = descriptionImpliesMaterial(name + " " + detail);
  const laborHint = descriptionLaborOnlyHint(name + " " + detail);
  const laborOnly = (laborHint || !includesMaterial) && !includesMaterial;

  let priceKind: WorkRateParsedOffer["priceKind"] = "regular";
  if (isPackageName(name)) priceKind = "package";
  else if (isMinimum) priceKind = "minimum";

  return {
    name,
    ratePln,
    unit,
    priceKind,
    includesMaterial,
    laborOnly,
    netGross: "unknown",
    detail,
    sourceMinPln,
    sourceMaxPln,
    marketBaseKind,
  };
}

function parseOffersFromTables(input: {
  html: string;
  sourceId: WorkRateSourceId;
  sourceUrl: string;
  expectedNamePl: string;
  expectedNamesPl?: readonly string[];
  observedAt: string;
}): WorkRateParsedOffer[] {
  const region = regionFromSourceUrl(input.sourceUrl, input.sourceId);
  const out: WorkRateParsedOffer[] = [];
  const expectedNames =
    input.expectedNamesPl && input.expectedNamesPl.length > 0
      ? input.expectedNamesPl
      : [input.expectedNamePl];
  // Scal m<sup>2</sup> zanim rozbijemy komórki (KB.pl).
  const html = input.html
    .replace(/m\s*<sup>\s*2\s*<\/sup>/gi, "m2")
    .replace(/\/\s*m\s*<sup>\s*2\s*<\/sup>/gi, "/m2")
    .replace(/zł\/m\s*<sup>\s*2\s*<\/sup>/gi, "zł/m2");
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rows) {
    const tds = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripTags(m[1] || ""),
    );
    // Scal osierocone "2" po "zł/m" (gdy HTML już częściowo zepsuty).
    const merged: string[] = [];
    for (let i = 0; i < tds.length; i++) {
      const cur = tds[i]!;
      const prev = merged[merged.length - 1];
      if (prev && /zł\/?\s*m$/i.test(prev) && cur === "2") {
        merged[merged.length - 1] = `${prev}2`;
        continue;
      }
      merged.push(cur);
    }
    if (merged.length < 2) continue;
    const cand = parseTableRowCandidate(merged);
    if (!cand) continue;
    const match = namesLooselyMatchAny(expectedNames, cand.name);
    if (!match.ok) continue;

    out.push({
      sourceId: input.sourceId,
      workNamePl: cand.name,
      ratePln: cand.ratePln,
      currency: "PLN",
      unit: cand.unit,
      regionScope: region,
      laborOnly: cand.laborOnly,
      includesMaterial: cand.includesMaterial,
      vatIncluded: null,
      netGross: cand.netGross,
      priceKind: cand.priceKind,
      sourceUrl: input.sourceUrl,
      identityMatched: true,
      observedAt: input.observedAt,
      sourceMinPln: cand.sourceMinPln,
      sourceMaxPln: cand.sourceMaxPln,
      marketBaseKind: cand.marketBaseKind,
    });
  }
  return out;
}

function parseOffersFromMarkers(input: {
  html: string;
  sourceId: WorkRateSourceId;
  sourceUrl: string;
  expectedNamePl: string;
  expectedNamesPl?: readonly string[];
  observedAt: string;
}): WorkRateParsedOffer[] {
  const blocks = input.html.split(/data-wgdom-work-rate/i).slice(1);
  const out: WorkRateParsedOffer[] = [];
  const expectedNames =
    input.expectedNamesPl && input.expectedNamesPl.length > 0
      ? input.expectedNamesPl
      : [input.expectedNamePl];

  for (const block of blocks) {
    const chunk = block.slice(0, 800);
    const name = decodeAttr(chunk, "data-name") || "";
    const rateRaw = decodeAttr(chunk, "data-rate");
    const unit = decodeAttr(chunk, "data-unit") || "";
    const region = parseRegionToken(decodeAttr(chunk, "data-region") || undefined);
    const laborOnly = (decodeAttr(chunk, "data-labor-only") || "true").toLowerCase() !== "false";
    const includesMaterial =
      (decodeAttr(chunk, "data-includes-material") || "false").toLowerCase() === "true";
    const priceKindRaw = (decodeAttr(chunk, "data-price-kind") || "regular").toLowerCase();
    const priceKind =
      priceKindRaw === "promo" ||
      priceKindRaw === "package" ||
      priceKindRaw === "minimum" ||
      priceKindRaw === "regular"
        ? priceKindRaw
        : "unknown";
    const netGrossRaw = (decodeAttr(chunk, "data-net-gross") || "unknown").toLowerCase();
    const netGross =
      netGrossRaw === "netto" || netGrossRaw === "brutto" ? netGrossRaw : "unknown";
    const identityAttr = decodeAttr(chunk, "data-identity");
    const rate = Number(String(rateRaw || "").replace(",", "."));
    if (!Number.isFinite(rate) || !(rate > 0) || !name) continue;

    const identityMatched =
      identityAttr != null
        ? identityAttr.toLowerCase() === "true" || identityAttr === "1"
        : namesLooselyMatchAny(expectedNames, name).ok;

    out.push({
      sourceId: input.sourceId,
      workNamePl: name,
      ratePln: rate,
      currency: "PLN",
      unit,
      regionScope: region,
      laborOnly,
      includesMaterial,
      vatIncluded: netGross === "brutto" ? true : netGross === "netto" ? false : null,
      netGross,
      priceKind,
      sourceUrl: input.sourceUrl,
      identityMatched,
      observedAt: input.observedAt,
      sourceMinPln: null,
      sourceMaxPln: null,
      marketBaseKind: "point",
    });
  }
  return out;
}

/**
 * Parse offers: markery fixture LUB tabele realnych cenników.
 * Zwraca tylko pozycje dopasowane do expectedNamePl / alternateNames (selective).
 */
export function parseWorkRateOffersFromHtml(input: {
  sourceId: WorkRateSourceId;
  html: string;
  sourceUrl: string;
  expectedNamePl: string;
  expectedUnit: WgdomCostUnit;
  /** Owner synonyms / alternate match names — same loose match, no invent. */
  alternateNamesPl?: readonly string[] | null;
  observedAt?: string;
}): WorkRateParsedOffer[] {
  const observedAt = input.observedAt || new Date().toISOString();
  const expectedNamesPl = [
    input.expectedNamePl,
    ...((input.alternateNamesPl || []).filter(
      (n) => n && n.trim() && n.trim() !== input.expectedNamePl,
    ) as string[]),
  ];
  const fromMarkers = parseOffersFromMarkers({
    html: input.html,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    expectedNamePl: input.expectedNamePl,
    expectedNamesPl,
    observedAt,
  });
  if (fromMarkers.length > 0) return fromMarkers;

  return parseOffersFromTables({
    html: input.html,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    expectedNamePl: input.expectedNamePl,
    expectedNamesPl,
    observedAt,
  });
}

export function buildWorkRateFixtureHtml(attrs: {
  name: string;
  rate: number;
  unit: string;
  region?: string;
  laborOnly?: boolean;
  includesMaterial?: boolean;
  priceKind?: string;
  netGross?: string;
  identity?: boolean;
}): string {
  return `<div data-wgdom-work-rate data-name="${attrs.name}" data-rate="${attrs.rate}" data-unit="${attrs.unit}" data-region="${attrs.region ?? "WROCLAW"}" data-labor-only="${attrs.laborOnly !== false}" data-includes-material="${attrs.includesMaterial === true}" data-price-kind="${attrs.priceKind ?? "regular"}" data-net-gross="${attrs.netGross ?? "netto"}" data-identity="${attrs.identity !== false}"></div>`;
}
