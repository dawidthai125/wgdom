/**
 * SMART-PRICING-01 P2 — Evidence z MARKET-SYNC staging (RO, pure).
 * DF-P2-02: zero write · zero commit · zero publish.
 */

import type { MarketSyncStagingStore, ProviderQuote } from "@/lib/market-sync/types";
import type {
  SmartPricingMatchMethod,
  SmartPricingPriceEvidence,
} from "@/lib/smart-pricing/types";

/** Domyślna conf gdy MS nie podał matchConfidence — REVIEW band. */
const SMART_PRICING_STAGING_DEFAULT_CONF = 0.65;

/** Statusy wykluczone z puli rekomendacji (epicki B4). */
const EXCLUDED_STATUSES = new Set([
  "conflict",
  "unmatched",
  "rejected",
  "rejected_row",
]);

export interface BuildEvidenceFromStagingOptions {
  workId: string;
  regionCode: string;
  lineUnit?: string | null;
}

function isFinitePositivePrice(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function mapMatchMethod(raw: string | null | undefined): SmartPricingMatchMethod {
  switch (raw) {
    case "ean":
    case "provider_sku":
    case "mfr_name_unit":
    case "alias":
    case "manual":
      return raw;
    default:
      return "manual";
  }
}

function quoteLinkedToWork(
  quote: ProviderQuote,
  workId: string,
  productWorkIds: Map<string, string>,
): boolean {
  if (!workId) return false;
  if (quote.marketProductId) {
    const linked = productWorkIds.get(quote.marketProductId);
    if (linked === workId) return true;
  }
  return false;
}

/**
 * Buduje Evidence[] ze snapshotu staging (RO).
 * Pure — nie mutuje `store`.
 */
export function buildEvidenceFromMarketSyncStaging(
  store: MarketSyncStagingStore | null | undefined,
  opts: BuildEvidenceFromStagingOptions,
): SmartPricingPriceEvidence[] {
  if (!store || !opts.workId || opts.workId === "unmapped") return [];

  const productWorkIds = new Map<string, string>();
  for (const p of store.marketProducts ?? []) {
    const linked = p.linkedWorkIds?.[0]?.trim();
    if (p.id && linked) productWorkIds.set(p.id, linked);
  }

  const productsById = new Map((store.marketProducts ?? []).map((p) => [p.id, p]));
  const out: SmartPricingPriceEvidence[] = [];

  for (const quote of store.providerQuotes ?? []) {
    if (!quote || typeof quote !== "object") continue;
    if (EXCLUDED_STATUSES.has(quote.status)) continue;
    if (!quoteLinkedToWork(quote, opts.workId, productWorkIds)) continue;
    if (!isFinitePositivePrice(quote.grossPrice)) continue;

    const product = quote.marketProductId
      ? productsById.get(quote.marketProductId)
      : undefined;
    const unit = (product?.unit || quote.unit || "").trim() || null;
    const lineUnit = opts.lineUnit?.trim() || null;
    const warnings: string[] = [];
    if (unit && lineUnit && unit !== lineUnit) {
      warnings.push(`unit mismatch: staging=${unit} · pozycja=${lineUnit}`);
    }
    if (quote.status === "proposed" || quote.status === "imported") {
      warnings.push(`status staging=${quote.status}`);
    }

    const conf =
      typeof quote.matchConfidence === "number" && Number.isFinite(quote.matchConfidence)
        ? Math.max(0, Math.min(1, quote.matchConfidence))
        : SMART_PRICING_STAGING_DEFAULT_CONF;

    const provider = String(quote.provider || "other");
    const acquiredAt = quote.importedAt?.trim() || store.updatedAt || "";
    const matchMethod = mapMatchMethod(quote.matchMethod);

    out.push({
      id: `ev:ms:${quote.id}`,
      source: "market_sync_staging",
      provider,
      price: quote.grossPrice,
      currency: "PLN",
      acquiredAt,
      confidence: conf,
      matchMethod,
      matchDetail: `MS staging · ${quote.productName?.slice(0, 64) || quote.providerSku || quote.id} · status=${quote.status}`,
      region: opts.regionCode || null,
      workId: opts.workId,
      origin: provider,
      unit,
      warnings: warnings.length ? warnings : undefined,
      rawRef: `ms-staging:${quote.id}`,
    });
  }

  return out;
}

/**
 * Fingerprint RO staging (quote ids + prices + status) — do testów immutability.
 * Pure — nie mutuje store.
 */
export function marketSyncStagingFingerprint(
  store: MarketSyncStagingStore | null | undefined,
  workId: string,
): string {
  if (!store) return `${workId}|{}`;
  const productWorkIds = new Map<string, string>();
  for (const p of store.marketProducts ?? []) {
    const linked = p.linkedWorkIds?.[0]?.trim();
    if (p.id && linked) productWorkIds.set(p.id, linked);
  }
  const rows = (store.providerQuotes ?? [])
    .filter((q) => quoteLinkedToWork(q, workId, productWorkIds))
    .map((q) => `${q.id}:${q.grossPrice}:${q.status}:${q.matchConfidence ?? ""}`)
    .sort();
  return `${workId}|${rows.join("|")}`;
}
