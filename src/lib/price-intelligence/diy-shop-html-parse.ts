/**
 * REAL-SOURCE-LIVE-ADAPTERS-08 — HTML heuristics for selective PDP/listing snippets.
 * Pure · ZERO HTTP · fail-soft · wrong product > missing.
 */

import type { DiyParsedOffer, DiyShopProviderId } from "./diy-selective-lookup-types";

function fold(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTokens(query: string): string[] {
  return fold(query)
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 8);
}

/** Require ≥50% of significant tokens (min 1) in product title. */
export function identityMatchesQuery(productName: string, query: string): boolean {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return false;
  const hay = fold(productName);
  const hit = tokens.filter((t) => hay.includes(t)).length;
  return hit >= Math.max(1, Math.ceil(tokens.length * 0.5));
}

function parsePlnAmount(raw: string): number | null {
  const cleaned = String(raw || "")
    .replace(/\s/g, "")
    .replace(/zł|pln/gi, "")
    .replace(",", ".");
  const m = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function stripTags(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&zł;/gi, "zł")
    .replace(/\s+/g, " ")
    .trim();
}

function detectPromo(text: string): boolean {
  const t = fold(text);
  return (
    /\bpromo(cja|cyjna)?\b/.test(t) ||
    /\bcena promocyjna\b/.test(t) ||
    /\bwyprzedaz\b/.test(t) ||
    /\bwas\b.*\bnow\b/.test(t) ||
    /cena regularna/.test(t) && /%\s*taniej/.test(t)
  );
}

function extractTitle(html: string): string {
  const og = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) return stripTags(h1[1]).slice(0, 200);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title?.[1]) return stripTags(title[1]).split("|")[0].trim().slice(0, 200);
  return "";
}

function extractPriceCandidates(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,5}(?:[.,]\d{2})?)\s*(?:zł|pln)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < 12) {
    const n = parsePlnAmount(m[1]);
    if (n != null && n >= 1 && n <= 100_000) out.push(n);
  }
  return out;
}

function pickRegularVsPromo(opts: {
  prices: number[];
  text: string;
}): { price: number | null; priceType: "regular" | "promo" | "unknown" } {
  const { prices, text } = opts;
  if (prices.length === 0) return { price: null, priceType: "unknown" };
  const promo = detectPromo(text);
  // Prefer larger as regular when two prices + promo wording (promo < regular).
  if (promo && prices.length >= 2) {
    const sorted = [...prices].sort((a, b) => a - b);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    if (high > low * 1.05) {
      return { price: high, priceType: "regular" };
    }
  }
  if (promo && prices.length === 1) {
    return { price: prices[0], priceType: "promo" };
  }
  return { price: prices[0], priceType: "regular" };
}

function parseLeroy(html: string, query: string, sourceUrl: string): DiyParsedOffer | null {
  const text = stripTags(html);
  const productName = extractTitle(html) || text.slice(0, 120);
  const sellerDirect =
    /sprzedawane i wysyłane przez\s*leroy\s*merlin/i.test(html) ||
    /sprzedawane i wysylane przez\s*leroy\s*merlin/i.test(fold(html)) ||
    /LEROY MERLIN/i.test(html);
  const marketplace =
    /sprzedawane przez(?!\s*leroy)/i.test(html) && !/leroy\s*merlin/i.test(html);
  const prices = extractPriceCandidates(text);
  const { price, priceType } = pickRegularVsPromo({ prices, text });
  const skuMatch = html.match(/(\d{8})\.html/) || sourceUrl.match(/(\d{8})/);
  if (price == null) return null;
  let sellerKind: DiyParsedOffer["sellerKind"] = "unknown";
  let sellerName: string | null = null;
  if (marketplace) {
    sellerKind = "marketplace";
    sellerName = "marketplace";
  } else if (sellerDirect) {
    sellerKind = "direct_retailer";
    sellerName = "LEROY MERLIN";
  }
  return {
    provider: "leroy",
    productName,
    priceGrossPln: price,
    currency: "PLN",
    priceType,
    sellerKind,
    sellerName,
    sku: skuMatch?.[1] ?? null,
    ean: null,
    sourceUrl,
    identityMatched: identityMatchesQuery(productName, query),
  };
}

function parseCastorama(html: string, query: string, sourceUrl: string): DiyParsedOffer | null {
  const text = stripTags(html);
  const productName = extractTitle(html) || text.slice(0, 120);
  const direct =
    /sprzedaje i wysyła przedsiębiorca:\s*Castorama Polska/i.test(html) ||
    /sprzedaje i wysyla przedsiebiorca:\s*castorama polska/i.test(fold(html)) ||
    /Castorama Polska/i.test(html);
  const marketplace =
    /sprzedaje i wysyła przedsiębiorca:\s*(?!Castorama Polska)/i.test(html) ||
    /Łazienkaplus|Domotechnika|Novoterm|Corciano/i.test(html);
  const prices = extractPriceCandidates(text);
  const { price, priceType } = pickRegularVsPromo({ prices, text });
  const code =
    sourceUrl.match(/(\d{10,14})_CAPL/i)?.[1] ||
    html.match(/(\d{13})/)?.[1] ||
    null;
  if (price == null) return null;
  let sellerKind: DiyParsedOffer["sellerKind"] = "unknown";
  let sellerName: string | null = null;
  if (marketplace && !direct) {
    sellerKind = "marketplace";
    sellerName = "marketplace";
  } else if (direct) {
    sellerKind = "direct_retailer";
    sellerName = "Castorama Polska";
  }
  return {
    provider: "castorama",
    productName,
    priceGrossPln: price,
    currency: "PLN",
    priceType,
    sellerKind,
    sellerName,
    sku: code,
    ean: code && code.length === 13 ? code : null,
    sourceUrl,
    identityMatched: identityMatchesQuery(productName, query),
  };
}

function parseObi(html: string, query: string, sourceUrl: string): DiyParsedOffer | null {
  const text = stripTags(html);
  const productName = extractTitle(html) || text.slice(0, 120);
  // OBI assortment = default direct unless third-party badge appears.
  const marketplace = /sprzedawca\s*:|marketplace|sprzedaje\s+partner/i.test(html);
  const prices = extractPriceCandidates(text);
  const { price, priceType } = pickRegularVsPromo({ prices, text: html + " " + text });
  const sku = sourceUrl.match(/\/p\/(\d+)\//)?.[1] || html.match(/nr\s*art\.?\s*(\d+)/i)?.[1] || null;
  if (price == null) return null;
  return {
    provider: "obi",
    productName,
    priceGrossPln: price,
    currency: "PLN",
    priceType,
    sellerKind: marketplace ? "marketplace" : "direct_retailer",
    sellerName: marketplace ? "marketplace" : "OBI",
    sku,
    ean: null,
    sourceUrl,
    identityMatched: identityMatchesQuery(productName, query),
  };
}

export function parseDiyShopHtml(opts: {
  provider: DiyShopProviderId;
  html: string;
  query: string;
  sourceUrl: string;
}): DiyParsedOffer | null {
  const html = String(opts.html || "");
  if (html.length < 40) return null;
  switch (opts.provider) {
    case "leroy":
      return parseLeroy(html, opts.query, opts.sourceUrl);
    case "castorama":
      return parseCastorama(html, opts.query, opts.sourceUrl);
    case "obi":
      return parseObi(html, opts.query, opts.sourceUrl);
    default:
      return null;
  }
}

/** Allowlisted selective search/PDP URL builders — never client-supplied arbitrary hosts. */
export function buildDiySelectiveRequestUrl(opts: {
  provider: DiyShopProviderId;
  query: string;
  sku?: string | null;
  ean?: string | null;
}): string | null {
  const q = String(opts.query || "").trim();
  const sku = String(opts.sku || "").trim();
  const ean = String(opts.ean || "").trim();
  const term = sku || ean || q;
  if (!term || term.length < 2) return null;
  const enc = encodeURIComponent(term.slice(0, 120));
  switch (opts.provider) {
    case "leroy":
      // Prefer article search — still ONE search URL, not category crawl.
      return `https://www.leroymerlin.pl/search?q=${enc}`;
    case "castorama":
      return `https://www.castorama.pl/search?term=${enc}`;
    case "obi":
      return `https://www.obi.pl/search/${enc}`;
    default:
      return null;
  }
}

export const DIY_SELECTIVE_ALLOWED_HOSTS = new Set([
  "www.leroymerlin.pl",
  "leroymerlin.pl",
  "www.castorama.pl",
  "castorama.pl",
  "www.obi.pl",
  "obi.pl",
]);

export function isDiySelectiveUrlAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:") return false;
    return DIY_SELECTIVE_ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}
