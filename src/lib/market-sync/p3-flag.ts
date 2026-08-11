/**
 * MARKET-SYNC-01 P3 — Feature flag (ingest spine · mock).
 * DF: default OFF · LS `kw-market-sync-01-p3`.
 */

export const MARKET_SYNC_P3_DEFAULT = false;

export const MARKET_SYNC_P3_LS_KEY = "kw-market-sync-01-p3";

/** Single-provider bound for P3-A mock (D-P3-02). */
export const MARKET_SYNC_P3_DEFAULT_PROVIDER = "obi" as const;

/**
 * Legal Gate — OPEN blocks live network ingest (D-P3-10).
 * PASS = Owner Legal Enablement (REAL-SOURCE-OWNER-LEGAL-PASS-07).
 * Evidence: PRIVATE OWNER EVIDENCE · NOT STORED IN REPOSITORY.
 * Selective research LM/Casto/OBI only — NOT bulk catalogue / marketplace.
 * Live HTTP adapters still require Owner GO IMPLEMENT (ADAPTER_NOT_IMPLEMENTED).
 */
export type MarketSyncP3LegalGateStatus = "OPEN" | "PASS" | "FAIL";

export const MARKET_SYNC_P3_LEGAL_GATE: MarketSyncP3LegalGateStatus = "PASS";

export function isMarketSyncP3LegalPass(): boolean {
  return MARKET_SYNC_P3_LEGAL_GATE === "PASS";
}

let marketSyncP3ForTests: boolean | null = null;

/** Test-only override (null = LS / default). */
export function forceMarketSyncP3ForTests(on: boolean | null): void {
  marketSyncP3ForTests = on;
}

/**
 * Czy UI/ingest CTA P3 jest włączone.
 * OFF ⇒ brak CTA · brak mock ingest z UI · tip parity.
 */
export function isMarketSyncP3Enabled(): boolean {
  if (marketSyncP3ForTests != null) return marketSyncP3ForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(MARKET_SYNC_P3_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return MARKET_SYNC_P3_DEFAULT;
}
