/**
 * MARKET-SYNC-01 P3 — ingest spine · mock · flag · Legal refuse
 * Uruchom: npx vite-node scripts/test-market-sync-01-p3.mjs
 */
import {
  MARKET_SYNC_P3_DEFAULT,
  MARKET_SYNC_P3_DEFAULT_PROVIDER,
  MARKET_SYNC_P3_LEGAL_GATE,
  MARKET_SYNC_P3_LS_KEY,
  createEmptyStagingStore,
  forceMarketSyncP3ForTests,
  isMarketSyncP3Enabled,
  isMarketSyncP3LegalPass,
  marketSyncIngestRowsToCsv,
  mockIngestAdapter,
  refuseLiveIngestIfBlocked,
  runMarketSyncP3Ingest,
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

const T0 = "2026-08-03T12:00:00.000Z";
let seq = 0;
const newId = () => `id-${++seq}`;

console.log("MARKET-SYNC-01 P3 smoke");

forceMarketSyncP3ForTests(null);
assert(MARKET_SYNC_P3_DEFAULT === false, "flag default OFF");
assert(MARKET_SYNC_P3_LS_KEY === "kw-market-sync-01-p3", "LS key");
assert(isMarketSyncP3Enabled() === false, "enabled=false by default");
assert(MARKET_SYNC_P3_DEFAULT_PROVIDER === "obi", "single provider = obi");
assert(MARKET_SYNC_P3_LEGAL_GATE === "PASS", "Legal Gate PASS (OWNER-LEGAL-PASS-07)");
assert(isMarketSyncP3LegalPass() === true, "Legal PASS = true");

{
  const store = createEmptyStagingStore(T0);
  const refused = runMarketSyncP3Ingest(store, {
    allowLiveNetwork: false,
    nowIso: T0,
    newId,
  });
  assert(refused.ok === false, "flag OFF → ingest refuse");
  assert(refused.store === store, "flag OFF → 0 staging write");
}

forceMarketSyncP3ForTests(true);
assert(isMarketSyncP3Enabled() === true, "force ON");

{
  const live = refuseLiveIngestIfBlocked({
    providerId: "obi",
    sourceKind: "licensed_api",
    allowLiveNetwork: true,
  });
  assert(live == null, "live + Legal PASS → refuseLive returns null (gate cleared)");
}

{
  const store = createEmptyStagingStore(T0);
  const liveRun = runMarketSyncP3Ingest(store, {
    allowLiveNetwork: true,
    nowIso: T0,
    newId,
  });
  // Legal PASS clears gate; P3 still uses mock adapter only (no network client).
  assert(liveRun.ok === true, "run allowLive + Legal PASS → mock ingest OK (no HTTP client)");
  assert(liveRun.store.providerQuotes.length > 0, "mock quotes staged");
}

{
  const mock = mockIngestAdapter.run({
    providerId: "obi",
    sourceKind: "csv_export",
    allowLiveNetwork: false,
  });
  assert(mock.ok === true, "mock adapter ok");
  assert(mock.rows.length === 2, "mock 2 rows");
  assert(mock.rows.every((r) => r.provider === "obi"), "mock single-provider rows");
  assert(mockIngestAdapter.id === "mock-v1", "one adapter id mock-v1");
}

{
  let store = createEmptyStagingStore(T0);
  const result = runMarketSyncP3Ingest(store, {
    providerId: "obi",
    allowLiveNetwork: false,
    nowIso: T0,
    newId,
  });
  assert(result.ok === true, "mock ingest → Preview ok");
  assert(result.preview != null, "preview present");
  assert(result.syncRunId != null, "syncRunId set");
  assert(result.store.providerQuotes.length >= 2, "quotes in staging");
  assert(
    result.store.providerQuotes.every((q) => q.provider === "obi"),
    "staging quotes provider=obi",
  );
  assert(result.store.syncRuns.length >= 1, "SyncRun appended");
  /* No publish side-effect — only staging */
  assert(
    result.store.providerQuotes.every((q) => q.status !== "published"),
    "no auto-publish (no published status)",
  );
}

{
  const csv = marketSyncIngestRowsToCsv([
    {
      provider: "obi",
      providerSku: "X",
      productName: "T",
      unit: "szt",
      grossPrice: "1",
      currency: "PLN",
    },
  ]);
  assert(csv.includes("provider,providerSku"), "CSV header");
  assert(csv.includes("obi,X"), "CSV row");
}

forceMarketSyncP3ForTests(null);

console.log(`\nP3 result: ${passed} passed · ${failed} failed`);
if (failed > 0) process.exit(1);
