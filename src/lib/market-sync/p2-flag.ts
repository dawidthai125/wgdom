/**
 * MARKET-SYNC-01 P2 — Feature flag (history · Δ% · coverage · templates).
 * DF: default OFF · LS `kw-market-sync-01-p2`.
 */

export const MARKET_SYNC_P2_DEFAULT = false;

export const MARKET_SYNC_P2_LS_KEY = "kw-market-sync-01-p2";

let marketSyncP2ForTests: boolean | null = null;

/** Test-only override (null = LS / default). */
export function forceMarketSyncP2ForTests(on: boolean | null): void {
  marketSyncP2ForTests = on;
}

/**
 * Czy UI/append PriceHistory P2 jest włączone.
 * OFF ⇒ brak timeline/coverage/templates · brak append przy Accept.
 */
export function isMarketSyncP2Enabled(): boolean {
  if (marketSyncP2ForTests != null) return marketSyncP2ForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(MARKET_SYNC_P2_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return MARKET_SYNC_P2_DEFAULT;
}
