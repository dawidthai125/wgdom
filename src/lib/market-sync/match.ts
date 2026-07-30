/**
 * MARKET-SYNC-01 P0 — Match (pure). Fuzzy OFF.
 * Priorytet: EAN → Provider SKU → Mfr+Name+Unit → Alias → Manual (display).
 */

import { foldPl } from "@/lib/market-sync/normalize";
import type {
  MarketProduct,
  MatchCandidate,
  MatchMethod,
  ProviderQuote,
  ProviderQuoteStatus,
} from "@/lib/market-sync/types";

export interface MatchContext {
  products: readonly MarketProduct[];
  /** Wcześniejsze quote (ten sam staging) — mapa SKU → marketProductId. */
  priorQuotes: readonly ProviderQuote[];
}

function activeProducts(products: readonly MarketProduct[]): MarketProduct[] {
  return products.filter((p) => p.active !== false);
}

function pushUnique(
  bag: MatchCandidate[],
  seen: Set<string>,
  c: MatchCandidate,
): void {
  const key = `${c.marketProductId}|${c.method}`;
  if (seen.has(key)) return;
  seen.add(key);
  bag.push(c);
}

function collectEanHits(
  quote: ProviderQuote,
  products: readonly MarketProduct[],
): MatchCandidate[] {
  if (!quote.ean) return [];
  const out: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    if (p.ean.includes(quote.ean)) {
      pushUnique(out, seen, {
        marketProductId: p.id,
        confidence: 1,
        method: "ean",
      });
    }
  }
  return out;
}

function collectSkuHits(
  quote: ProviderQuote,
  priorQuotes: readonly ProviderQuote[],
): MatchCandidate[] {
  const sku = quote.providerSku?.trim();
  if (!sku) return [];
  const out: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (const prev of priorQuotes) {
    if (prev.id === quote.id) continue;
    if (prev.provider !== quote.provider) continue;
    if ((prev.providerSku || "").trim() !== sku) continue;
    if (!prev.marketProductId) continue;
    if (prev.status !== "proposed" && prev.status !== "imported") continue;
    // Historie ze statusem proposed (lub import z linkiem) — reuse
    pushUnique(out, seen, {
      marketProductId: prev.marketProductId,
      confidence: 0.95,
      method: "provider_sku",
    });
  }
  // Also accept any prior with same sku that has marketProductId (broader P0)
  if (out.length === 0) {
    for (const prev of priorQuotes) {
      if (prev.id === quote.id) continue;
      if (prev.provider !== quote.provider) continue;
      if ((prev.providerSku || "").trim() !== sku) continue;
      if (!prev.marketProductId) continue;
      pushUnique(out, seen, {
        marketProductId: prev.marketProductId,
        confidence: 0.95,
        method: "provider_sku",
      });
    }
  }
  return out;
}

function collectMfrNameUnitHits(
  quote: ProviderQuote,
  products: readonly MarketProduct[],
): MatchCandidate[] {
  const nameFold = quote.productNameFold ?? foldPl(quote.productName);
  const mfrFold = foldPl(String(quote.manufacturer ?? ""));
  if (!nameFold || !quote.unit) return [];
  const out: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    if (p.unit !== quote.unit) continue;
    const pMfr = foldPl(String(p.manufacturer ?? ""));
    if (mfrFold) {
      if (!pMfr || mfrFold !== pMfr) continue;
    }
    const names = [foldPl(p.canonicalName), ...p.aliases.map(foldPl)];
    if (!names.includes(nameFold)) continue;
    pushUnique(out, seen, {
      marketProductId: p.id,
      confidence: 0.85,
      method: "mfr_name_unit",
    });
  }
  return out;
}

function collectAliasHits(
  quote: ProviderQuote,
  products: readonly MarketProduct[],
): MatchCandidate[] {
  const nameFold = quote.productNameFold ?? foldPl(quote.productName);
  if (!nameFold || !quote.unit) return [];
  const out: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    if (p.unit !== quote.unit) continue;
    const aliasFolds = p.aliases.map(foldPl);
    if (!aliasFolds.includes(nameFold)) continue;
    pushUnique(out, seen, {
      marketProductId: p.id,
      confidence: 0.75,
      method: "alias",
    });
  }
  return out;
}

/**
 * Zbiera kandydatów wg priorytetu; pierwsze niepuste warstwy wygrywają zakres.
 * ≥2 unikalne MP → conflict; 1 → proposed; 0 → unmatched.
 * Fuzzy: WYŁĄCZONY.
 */
export function matchProviderQuote(
  quote: ProviderQuote,
  ctx: MatchContext,
): Pick<
  ProviderQuote,
  | "status"
  | "marketProductId"
  | "matchConfidence"
  | "matchMethod"
  | "matchCandidates"
> {
  if (quote.status === "rejected_row") {
    return {
      status: "rejected_row",
      marketProductId: null,
      matchConfidence: null,
      matchMethod: null,
      matchCandidates: [],
    };
  }

  const products = activeProducts(ctx.products);
  const layers: { method: MatchMethod; hits: MatchCandidate[] }[] = [
    { method: "ean", hits: collectEanHits(quote, products) },
    { method: "provider_sku", hits: collectSkuHits(quote, ctx.priorQuotes) },
    { method: "mfr_name_unit", hits: collectMfrNameUnitHits(quote, products) },
    { method: "alias", hits: collectAliasHits(quote, products) },
  ];

  let chosen: MatchCandidate[] = [];
  for (const layer of layers) {
    if (layer.hits.length > 0) {
      chosen = layer.hits;
      break;
    }
  }

  // Unikalność po marketProductId
  const byMp = new Map<string, MatchCandidate>();
  for (const c of chosen) {
    const prev = byMp.get(c.marketProductId);
    if (!prev || c.confidence > prev.confidence) byMp.set(c.marketProductId, c);
  }
  const unique = [...byMp.values()];

  // EAN conflict: ten sam EAN na dwóch aktywnych MP — już w collectEanHits jako ≥2
  if (unique.length >= 2) {
    return {
      status: "conflict" satisfies ProviderQuoteStatus,
      marketProductId: null,
      matchConfidence: null,
      matchMethod: null,
      matchCandidates: unique,
    };
  }
  if (unique.length === 1) {
    const c = unique[0]!;
    return {
      status: "proposed",
      marketProductId: c.marketProductId,
      matchConfidence: c.confidence,
      matchMethod: c.method,
      matchCandidates: unique,
    };
  }
  return {
    status: "unmatched",
    marketProductId: null,
    matchConfidence: null,
    matchMethod: null,
    matchCandidates: [],
  };
}

export function matchAllQuotes(
  quotes: readonly ProviderQuote[],
  products: readonly MarketProduct[],
): ProviderQuote[] {
  const out: ProviderQuote[] = [];
  for (const q of quotes) {
    if (q.status === "rejected_row") {
      out.push(q);
      continue;
    }
    // prior = wcześniejsze w batchu + historyczne (już w `quotes` przed bieżącym)
    const priorQuotes = [...quotes.filter((x) => x.id !== q.id), ...out];
    const matched = matchProviderQuote(q, { products, priorQuotes });
    out.push({ ...q, ...matched });
  }
  return out;
}
