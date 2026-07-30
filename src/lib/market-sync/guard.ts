/**
 * MARKET-SYNC-01 P1 — Guard (eligibility przed Dry Run / Publish).
 */

import { findMarketProduct } from "@/lib/market-sync/accept";
import { isMarketSyncPublishEnabled } from "@/lib/market-sync/kill-switch";
import type {
  MarketSyncStagingStore,
  MatchMethod,
  ProviderQuote,
} from "@/lib/market-sync/types";
import { isMarketDiyOriginId } from "@/lib/work-catalog/market-sources";

/** Min confidence dla alias (DF §7). */
export const MARKET_SYNC_PUBLISH_ALIAS_MIN_CONFIDENCE = 0.75;

export type GuardBlockReason =
  | "kill_switch_off"
  | "not_accepted"
  | "missing_product"
  | "linked_work_required"
  | "linked_work_n1_only"
  | "provider_not_diy"
  | "conflict_or_unmatched"
  | "unit_mismatch"
  | "method_blocked"
  | "alias_low_confidence"
  | "missing_price"
  | "missing_confidence";

export interface GuardQuoteResult {
  quoteId: string;
  ok: boolean;
  warnings: string[];
  reasons: GuardBlockReason[];
}

export interface GuardBatchResult {
  ok: boolean;
  killSwitchOn: boolean;
  eligibleQuoteIds: string[];
  blocked: GuardQuoteResult[];
  results: GuardQuoteResult[];
}

function methodEligible(
  method: MatchMethod | null,
  confidence: number | null,
): { ok: boolean; warn?: string; reason?: GuardBlockReason } {
  if (!method) return { ok: false, reason: "method_blocked" };
  switch (method) {
    case "ean":
    case "provider_sku":
    case "manual":
      return { ok: true };
    case "mfr_name_unit":
      return { ok: true, warn: "matchMethod mfr_name_unit — sprawdź ręcznie" };
    case "alias": {
      const c = confidence ?? 0;
      if (c >= MARKET_SYNC_PUBLISH_ALIAS_MIN_CONFIDENCE) {
        return { ok: true, warn: "matchMethod alias — confidence OK, warn" };
      }
      return { ok: false, reason: "alias_low_confidence" };
    }
    default:
      return { ok: false, reason: "method_blocked" };
  }
}

export function guardProviderQuoteForPublish(
  store: MarketSyncStagingStore,
  quote: ProviderQuote,
  options: { requireKillSwitch?: boolean } = {},
): GuardQuoteResult {
  const requireKillSwitch = options.requireKillSwitch !== false;
  const reasons: GuardBlockReason[] = [];
  const warnings: string[] = [];

  if (requireKillSwitch && !isMarketSyncPublishEnabled()) {
    reasons.push("kill_switch_off");
  }

  if (quote.status !== "accepted") {
    reasons.push("not_accepted");
  }

  if (quote.status === "conflict" || quote.status === "unmatched" || quote.status === "rejected_row") {
    reasons.push("conflict_or_unmatched");
  }

  if (!isMarketDiyOriginId(quote.provider)) {
    reasons.push("provider_not_diy");
  }

  if (!(quote.grossPrice > 0) || !Number.isFinite(quote.grossPrice)) {
    reasons.push("missing_price");
  }

  const product = findMarketProduct(store, quote.marketProductId);
  if (!product) {
    reasons.push("missing_product");
  } else {
    if (product.linkedWorkIds.length === 0) {
      reasons.push("linked_work_required");
    } else if (product.linkedWorkIds.length !== 1) {
      reasons.push("linked_work_n1_only");
    }
    if (product.unit && quote.unit && product.unit !== quote.unit) {
      reasons.push("unit_mismatch");
    }
  }

  const methodCheck = methodEligible(quote.matchMethod, quote.matchConfidence);
  if (!methodCheck.ok && methodCheck.reason) reasons.push(methodCheck.reason);
  if (methodCheck.warn) warnings.push(methodCheck.warn);

  if (quote.matchConfidence == null || !Number.isFinite(quote.matchConfidence)) {
    if (quote.matchMethod !== "manual" && quote.matchMethod !== "ean" && quote.matchMethod !== "provider_sku") {
      reasons.push("missing_confidence");
    }
  }

  return {
    quoteId: quote.id,
    ok: reasons.length === 0,
    warnings,
    reasons: [...new Set(reasons)],
  };
}

export function guardQuotesForPublish(
  store: MarketSyncStagingStore,
  quoteIds: readonly string[],
  options: { requireKillSwitch?: boolean } = {},
): GuardBatchResult {
  const killSwitchOn = isMarketSyncPublishEnabled();
  const results: GuardQuoteResult[] = [];
  for (const id of quoteIds) {
    const quote = store.providerQuotes.find((q) => q.id === id);
    if (!quote) {
      results.push({
        quoteId: id,
        ok: false,
        warnings: [],
        reasons: ["not_accepted"],
      });
      continue;
    }
    results.push(guardProviderQuoteForPublish(store, quote, options));
  }
  const eligibleQuoteIds = results.filter((r) => r.ok).map((r) => r.quoteId);
  const blocked = results.filter((r) => !r.ok);
  return {
    ok: blocked.length === 0 && eligibleQuoteIds.length > 0,
    killSwitchOn,
    eligibleQuoteIds,
    blocked,
    results,
  };
}
