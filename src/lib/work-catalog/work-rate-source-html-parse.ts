/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — URL builders + HTML parse (selective ONE).
 * Host allowlist · fixture markers · fail-soft live heuristics.
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

export function isWorkRateSelectiveUrlAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === "https:" && WORK_RATE_ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function buildWorkRateSelectiveRequestUrl(input: {
  sourceId: WorkRateSourceId;
  query: string;
}): string | null {
  const term = String(input.query || "").trim().slice(0, 120);
  if (term.length < 2) return null;
  const enc = encodeURIComponent(term);
  switch (input.sourceId) {
    case "kb_pl":
      return `https://kb.pl/?s=${enc}`;
    case "sccot":
      return `https://sccot.pl/?s=${enc}`;
    case "extradom":
      return `https://www.extradom.pl/szukaj?q=${enc}`;
    case "cennikremontow_pl":
      return `https://cennikremontow.pl/?s=${enc}`;
    default:
      return null;
  }
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

function decodeAttr(html: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = html.match(re);
  return m?.[1] ?? null;
}

/**
 * Preferowany format fixture / kontrolowany HTML:
 * <div data-wgdom-work-rate
 *   data-name="Malowanie ścian"
 *   data-rate="38"
 *   data-unit="m2"
 *   data-region="WROCLAW"
 *   data-labor-only="true"
 *   data-includes-material="false"
 *   data-price-kind="regular"
 *   data-net-gross="netto"
 *   data-identity="true"
 * ></div>
 */
export function parseWorkRateOffersFromHtml(input: {
  sourceId: WorkRateSourceId;
  html: string;
  sourceUrl: string;
  expectedNamePl: string;
  expectedUnit: WgdomCostUnit;
  observedAt?: string;
}): WorkRateParsedOffer[] {
  const observedAt = input.observedAt || new Date().toISOString();
  const blocks = input.html.split(/data-wgdom-work-rate/i).slice(1);
  const out: WorkRateParsedOffer[] = [];

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
        : namesLooselyMatch(input.expectedNamePl, name);

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
      observedAt,
    });
  }

  // Fail-soft: brak markerów → zero ofert (nie inventuj z losowych liczb w HTML).
  return out;
}

function namesLooselyMatch(expected: string, found: string): boolean {
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
  const hit = tokens.filter((t) => b.includes(t)).length;
  return hit >= Math.ceil(tokens.length * 0.6);
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
