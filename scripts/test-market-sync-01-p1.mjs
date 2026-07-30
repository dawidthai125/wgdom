/**
 * MARKET-SYNC-01 P1 — Accept / Guard / Dry Run / Publish / Kill Switch / idempotencja.
 * Uruchom: npx vite-node scripts/test-market-sync-01-p1.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMarketSyncDryRunPreview,
  createEmptyStagingStore,
  decideProviderQuoteStatus,
  isMarketSyncPublishEnabled,
  mergeMarketProducts,
  prepareMarketSyncPublish,
  runMarketSyncCsvImport,
  runMarketSyncPublish,
  setMarketProductLinkedWorkIds,
  setMarketSyncPublishEnabled,
  undoMarketSyncPublish,
} from "../src/lib/market-sync/index.ts";
import {
  commitMarketQuotesImport,
  fingerprintWorkCatalogStore,
  isMarketDiyOriginId,
  MARKET_DIY_ORIGIN_IDS,
  MARKET_ORIGIN_IDS,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

const T1 = "2026-07-30T10:00:00.000Z";
const productsJson = JSON.parse(
  readFileSync(join(root, "fixtures/market-sync-01/p0-sample-products.json"), "utf8"),
);
const csv = readFileSync(join(root, "fixtures/market-sync-01/p0-sample-quotes.csv"), "utf8");

function baseCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T1,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: T1,
        works: [
          {
            id: "klej-cm11-szt",
            tradeId: "MALOWANIE",
            namePl: "Klej CM11",
            unit: "szt",
            companyPricePln: 10,
            updatedAt: T1,
          },
          {
            id: "plyta-gk-m2",
            tradeId: "MALOWANIE",
            namePl: "Płyta GK",
            unit: "m2",
            companyPricePln: 20,
            updatedAt: T1,
          },
        ],
      },
      dolnyslask: {
        region: "dolnyslask",
        updatedAt: T1,
        works: [],
      },
    },
  });
}

function memoryDeps(initial) {
  let current = structuredClone(initial);
  return {
    load: async () => structuredClone(current),
    save: async (store) => {
      current = structuredClone(store);
      return { ok: true, saved: true };
    },
    loadLocal: () => structuredClone(current),
    saveLocal: (store) => {
      current = structuredClone(store);
    },
    get: () => current,
    set: (s) => {
      current = structuredClone(s);
    },
  };
}

console.log("=== K-MS origins DIY OFF w enabledOrigins ===");
assert(MARKET_DIY_ORIGIN_IDS.includes("leroy") && MARKET_DIY_ORIGIN_IDS.includes("castorama"), "DIY origins");
assert(!MARKET_ORIGIN_IDS.includes("leroy"), "leroy NIE w MARKET_ORIGIN_IDS (średnia OFF)");
assert(isMarketDiyOriginId("leroy"), "isMarketDiyOriginId leroy");
assert(isMarketSyncPublishEnabled() === false, "Kill Switch default OFF");

console.log("\n=== K-MS-1a Accept = staging only (Quotes fingerprint) ===");
let staging = createEmptyStagingStore(T1);
staging = mergeMarketProducts(staging, productsJson);
let seq = 0;
const imported = runMarketSyncCsvImport(staging, csv, {
  nowIso: "2026-07-30T12:00:00.000Z",
  newId: () => `p1-${++seq}`,
  actorAdminId: "dawid",
  fileName: "p0-sample-quotes.csv",
});
staging = imported.store;
const catalogA = baseCatalog();
const fpBefore = fingerprintWorkCatalogStore(catalogA);
const qLm = staging.providerQuotes.find((q) => q.providerSku === "LM-1001");
assert(!!qLm && qLm.status === "proposed", "LM-1001 proposed");
staging = setMarketProductLinkedWorkIds(staging, "mp-ceresit-cm11", ["klej-cm11-szt"]);
const acc = decideProviderQuoteStatus(staging, qLm.id, "accepted");
assert(acc.ok && acc.quote?.status === "accepted", "Accept OK");
staging = acc.store;
assert(fingerprintWorkCatalogStore(catalogA) === fpBefore, "K-MS-1a Quotes fingerprint unchanged po Accept");

console.log("\n=== K-MS-1d Kill Switch OFF → commit count 0 ===");
setMarketSyncPublishEnabled(false);
let commitCalls = 0;
const depsOff = memoryDeps(catalogA);
const wrappedOff = {
  ...depsOff,
  save: async (store, opts, settings) => {
    commitCalls += 1;
    return depsOff.save(store, opts, settings);
  },
};
// Bypass UI: attempt publish with KS OFF — lib must block before commit/save
const pubOff = await runMarketSyncPublish(staging, {
  quoteIds: [qLm.id],
  catalog: catalogA,
  confirmed: true,
  commitOptions: { deps: wrappedOff },
});
assert(pubOff.status === "kill_switch_off", "Publish blocked gdy KS OFF");
assert(commitCalls === 0, "K-MS-1d zero save gdy KS OFF");
assert(fingerprintWorkCatalogStore(depsOff.get()) === fpBefore, "K-MS-1d katalog nietknięty");

console.log("\n=== Guard + Dry Run + Summary + Publish ===");
setMarketSyncPublishEnabled(true);
assert(isMarketSyncPublishEnabled() === true, "KS ON");

const qCas = staging.providerQuotes.find((q) => q.providerSku === "CAS-55");
staging = setMarketProductLinkedWorkIds(staging, "mp-ceresit-cm11", ["klej-cm11-szt"]);
if (qCas) {
  const a2 = decideProviderQuoteStatus(staging, qCas.id, "accepted");
  if (a2.ok) staging = a2.store;
}

const prepared = prepareMarketSyncPublish(staging, {
  quoteIds: [qLm.id, qCas?.id].filter(Boolean),
  catalog: catalogA,
  region: "wroclaw",
  publishedAtIso: "2026-07-30T14:00:00.000Z",
});
assert(prepared.status === "ready", `Prepare ready (${prepared.reason ?? "ok"})`);
assert(prepared.summary.newCount + prepared.summary.updatedCount >= 1, "K-MS-1e Summary new/updated");
assert(prepared.summary.killSwitchEnabled === true, "K-MS-1e Summary KS field");
assert(typeof prepared.summary.rejectedCount === "number", "K-MS-1e rejectedCount");
assert(prepared.summary.canConfirmPublish === true, "canConfirmPublish");

const depsOn = memoryDeps(catalogA);
const pub = await runMarketSyncPublish(staging, {
  quoteIds: prepared.quoteIds,
  catalog: catalogA,
  confirmed: true,
  catalogForCapture: catalogA,
  publishedAtIso: "2026-07-30T14:00:00.000Z",
  commitOptions: { deps: depsOn, updatedAtIso: "2026-07-30T14:00:00.000Z" },
});
assert(pub.status === "committed", `Publish committed (${pub.status} ${pub.reason ?? ""})`);
assert(pub.commit?.status === "committed", "commitMarketQuotesImport committed");
const after = depsOn.get();
const work = after.catalogs.wroclaw.works.find((w) => w.id === "klej-cm11-szt");
assert(!!work?.marketQuotes?.leroy?.wroclaw || !!work?.marketQuotes?.castorama?.wroclaw, "Quotes DIY zapisane");
assert(pub.staging.providerQuotes.find((q) => q.id === qLm.id)?.status === "published", "staging published");

console.log("\n=== K-MS-1 idempotencja re-Publish = noop ===");
const previewOnce = pub.commitPreview;
assert(!!previewOnce, "commitPreview retained");
const commit2 = await commitMarketQuotesImport(previewOnce, {
  deps: depsOn,
  region: "wroclaw",
  updatedAtIso: "2026-07-30T14:00:00.000Z",
});
assert(commit2.status === "noop", "K-MS-1 re-Publish commit = noop");

console.log("\n=== K-MS-1c Undo ≈ pre-publish fingerprint ===");
const fpPre = pub.undoSnapshot?.fingerprint;
assert(!!fpPre, "undo snapshot present");
const undo = await undoMarketSyncPublish({
  staging: pub.staging,
  currentCatalog: depsOn.get(),
  snapshot: pub.undoSnapshot,
  publishedQuoteIds: pub.publishedQuoteIds,
  deps: {
    save: async (store) => {
      depsOn.set(store);
      return { ok: true, saved: true };
    },
  },
});
assert(undo.ok, "Undo OK");
assert(fingerprintWorkCatalogStore(depsOn.get()) === fpPre, "K-MS-1c fingerprint restored");
assert(
  undo.staging.providerQuotes.find((q) => q.id === qLm.id)?.status === "accepted",
  "Undo published→accepted",
);

console.log("\n=== K-MS-1 static: jedyny commit w publish.ts ===");
const fs = await import("node:fs");
const pubSrc = fs.readFileSync(join(root, "src/lib/market-sync/publish.ts"), "utf8");
const uiSrc = fs.readFileSync(join(root, "src/app/market-sync/MarketSyncPreviewPanel.tsx"), "utf8");
assert(/commitMarketQuotesImport/.test(pubSrc), "publish.ts woła commit");
assert(!/applyMarketQuotesFromPreview\s*\(/.test(uiSrc), "UI bez bezpośredniego apply");
assert(/runMarketSyncPublish/.test(uiSrc), "UI woła runMarketSyncPublish");
assert(
  !/import\s*\{[^}]*commitMarketQuotesImport/.test(uiSrc)
    && !/await\s+commitMarketQuotesImport\s*\(/.test(uiSrc)
    && !/commitMarketQuotesImport\s*\(/.test(uiSrc),
  "UI nie woła commitMarketQuotesImport (tylko copy/docs OK)",
);

console.log("\n=== Dry Run obligatory (K-MS-1b) ===");
const dry = buildMarketSyncDryRunPreview(staging, {
  region: "wroclaw",
  quoteIds: [qLm.id],
  publishedAtIso: T1,
});
assert(dry.ok && dry.preview.matched.length >= 1, "K-MS-1b Dry Run matched ≥1");

console.log(`\n=== RESULT ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
