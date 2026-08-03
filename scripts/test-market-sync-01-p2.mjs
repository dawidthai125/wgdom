/**
 * MARKET-SYNC-01 P2 — PriceHistory · Δ% · coverage · flag · templates
 * Uruchom: npx vite-node scripts/test-market-sync-01-p2.mjs
 */
import {
  MARKET_SYNC_P2_DEFAULT,
  MARKET_SYNC_P2_LS_KEY,
  PRICE_ALERT_PCT,
  PRICE_HISTORY_CAP,
  appendPriceHistoryOnAccept,
  buildMarketSyncCoverageView,
  buildMarketSyncProviderTemplateCsv,
  computeHistoryDeltaPct,
  createEmptyStagingStore,
  decideProviderQuoteStatus,
  forceMarketSyncP2ForTests,
  isMarketSyncP2Enabled,
  isPriceAlert,
  listHistoryForProductProvider,
} from "../src/lib/market-sync/index.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => {
    storage.set(k, String(v));
  },
  removeItem: (k) => {
    storage.delete(k);
  },
  clear: () => {
    storage.clear();
  },
};

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const T0 = "2026-08-03T10:00:00.000Z";

function product() {
  return {
    id: "mp-1",
    canonicalName: "Klej stub",
    manufacturer: null,
    unit: "szt",
    category: "chemia",
    aliases: [],
    ean: [],
    linkedWorkIds: ["klej-cm11-szt"],
    active: true,
    createdAt: T0,
    updatedAt: T0,
  };
}

function quote(partial) {
  return {
    id: "pq-1",
    provider: "leroy",
    providerSku: "SKU-1",
    ean: null,
    productName: "Klej",
    unit: "szt",
    grossPrice: 100,
    currency: "PLN",
    sourceUrl: null,
    importedAt: T0,
    status: "proposed",
    syncRunId: "run-1",
    marketProductId: "mp-1",
    matchConfidence: 0.9,
    matchMethod: "ean",
    matchCandidates: [],
    ...partial,
  };
}

console.log("MARKET-SYNC-01 P2 smoke");

forceMarketSyncP2ForTests(null);
assert(MARKET_SYNC_P2_DEFAULT === false, "flag default OFF");
assert(MARKET_SYNC_P2_LS_KEY === "kw-market-sync-01-p2", "LS key");
assert(isMarketSyncP2Enabled() === false, "enabled=false by default");
assert(PRICE_HISTORY_CAP === 24, "cap 24");
assert(PRICE_ALERT_PCT === 10, "alert 10%");

forceMarketSyncP2ForTests(false);
{
  let store = createEmptyStagingStore(T0);
  store = {
    ...store,
    marketProducts: [product()],
    providerQuotes: [quote({ status: "proposed" })],
    priceHistory: [],
  };
  const r = decideProviderQuoteStatus(store, "pq-1", "accepted");
  assert(r.ok === true, "Accept OK when P2 OFF");
  assert((r.store.priceHistory ?? []).length === 0, "P2 OFF → brak append history");
}

forceMarketSyncP2ForTests(true);
assert(isMarketSyncP2Enabled() === true, "force ON");

{
  let store = createEmptyStagingStore(T0);
  store = {
    ...store,
    marketProducts: [product()],
    providerQuotes: [quote({ status: "proposed", grossPrice: 100 })],
    priceHistory: [],
  };
  const r = decideProviderQuoteStatus(store, "pq-1", "accepted");
  assert(r.ok === true, "Accept OK when P2 ON");
  assert((r.store.priceHistory ?? []).length === 1, "P2 ON → append 1");
  assert(r.store.priceHistory[0].quoteId === "pq-1", "quoteId linked");
  assert(r.store.priceHistory[0].pricePln === 100, "price stored");

  const r2 = decideProviderQuoteStatus(r.store, "pq-1", "accepted");
  assert((r2.store.priceHistory ?? []).length === 1, "dup quoteId → skip");
}

{
  let store = createEmptyStagingStore(T0);
  store = {
    ...store,
    marketProducts: [product()],
    providerQuotes: [],
    priceHistory: [],
  };
  for (let i = 0; i < 30; i += 1) {
    const q = quote({
      id: `pq-cap-${i}`,
      grossPrice: 50 + i,
      status: "proposed",
    });
    store = {
      ...store,
      providerQuotes: [...store.providerQuotes.filter((x) => x.id !== q.id), q],
    };
    const r = decideProviderQuoteStatus(store, q.id, "accepted");
    store = r.store;
  }
  const ring = listHistoryForProductProvider(store, "mp-1", "leroy");
  assert(ring.length === 24, `cap enforced (${ring.length})`);
}

{
  assert(computeHistoryDeltaPct(112, 100) === 12, "Δ +12%");
  assert(isPriceAlert(12) === true, "alert at 12%");
  assert(isPriceAlert(5) === false, "no alert at 5%");
  assert(isPriceAlert(null) === false, "no alert first point");
}

{
  let store = createEmptyStagingStore(T0);
  const q1 = quote({ id: "a", grossPrice: 100, status: "proposed" });
  const q2 = quote({ id: "b", grossPrice: 120, status: "proposed" });
  store = {
    ...store,
    marketProducts: [product()],
    providerQuotes: [q1, q2],
    priceHistory: [],
  };
  store = decideProviderQuoteStatus(store, "a", "accepted").store;
  store = decideProviderQuoteStatus(store, "b", "accepted").store;
  const cov = buildMarketSyncCoverageView(store);
  assert(cov.historyEntryCount === 2, "coverage history=2");
  assert(cov.acceptedCount === 2, "coverage accepted=2");
  assert(cov.linkedProductCount === 1, "coverage linked=1");
  assert(cov.alertCount === 1, "coverage alert on +20%");
}

{
  const csv = buildMarketSyncProviderTemplateCsv("obi");
  assert(csv.includes("obi,"), "template obi");
  assert(csv.includes("providerSku"), "template header");
}

{
  const store = createEmptyStagingStore(T0);
  const q = quote({ status: "proposed" });
  const next = appendPriceHistoryOnAccept(store, q, { enabled: false, atIso: T0 });
  assert((next.priceHistory ?? []).length === 0, "append helper respects enabled=false");
}

forceMarketSyncP2ForTests(null);

console.log(`\n${failed === 0 ? "PASS" : "FAIL"} ${passed} ok · ${failed} fail · MARKET-SYNC-01 P2`);
if (failed > 0) process.exit(1);
