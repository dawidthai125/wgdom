/**
 * WC-P3.2-S1 — golden: applyMarketQuotesFromPreview (merge-not-replace, pure).
 * npx vite-node scripts/test-work-catalog-apply-market-quotes-p3.2s1.mjs
 *
 * Scenariusze: merge · overwrite · tie-break · idempotence · fingerprint · round-trip.
 */
import { createHash } from "node:crypto";
import {
  applyMarketQuotesFromPreview,
  mergeWorkMarketQuotes,
  normalizeWorkCatalogStore,
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/index.ts";

/** Zamrożony golden — zmiana wymaga świadomej aktualizacji. */
const MARKET_QUOTES_FINGERPRINT = "0f8f5a733a5dd85f";

const T1 = "2026-06-20T10:00:00.000Z";
const T2 = "2026-06-25T10:00:00.000Z"; // nowszy niż T1

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => { storage.set(k, String(v)); },
  removeItem: (k) => { storage.delete(k); },
  clear: () => { storage.clear(); },
};

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass += 1; console.log("PASS", name); }
  else { fail += 1; console.log("FAIL", name); }
}
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}
function snap(origin, regionCode, price, confidence, updatedAt, coverage = "full") {
  return { origin, regionCode, price, confidence, updatedAt, coverage };
}
function makePreview(rows) {
  return { mode: "preview", parse: {}, matched: rows, lowConfidence: [], unmatched: [], rejected: [], summary: {} };
}
function baseStore() {
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
            id: "malowanie-scian-m2",
            tradeId: "MALOWANIE",
            namePl: "Malowanie ścian",
            unit: "m2",
            companyPricePln: 30,
            updatedAt: T1,
            marketQuotes: { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 40, 0.8, T1) } },
          },
          {
            id: "montaz-wc-szt",
            tradeId: "HYDRAULIKA",
            namePl: "Montaż WC",
            unit: "szt",
            companyPricePln: 200,
            updatedAt: T1,
          },
        ],
      },
      dolnyslask: {
        region: "dolnyslask",
        updatedAt: T1,
        works: [
          {
            id: "malowanie-scian-m2",
            tradeId: "MALOWANIE",
            namePl: "Malowanie ścian",
            unit: "m2",
            companyPricePln: 28,
            updatedAt: T1,
          },
        ],
      },
    },
  });
}

function quotesOf(store, region, workId) {
  return store.catalogs[region].works.find((w) => w.id === workId)?.marketQuotes;
}

console.log("=== WC-P3.2-S1 APPLY MARKET QUOTES (merge-not-replace) ===\n");

// ─── 1. MERGE — nowy origin dołącza, istniejący zachowany ───────────────────
{
  const { store, report } = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) }]),
  );
  const q = quotesOf(store, "wroclaw", "malowanie-scian-m2");
  assert("merge keeps existing origin kb_pl", q?.kb_pl?.wroclaw?.price === 40);
  assert("merge adds new origin sekocenbud", q?.sekocenbud?.wroclaw?.price === 55);
  assert("merge report cellsAdded=1", report.cellsAdded === 1 && report.cellsOverwritten === 0);
  assert("merge report worksTouched=1", report.worksTouched === 1);
}

// ─── 2. OVERWRITE — nowszy updatedAt wygrywa ────────────────────────────────
{
  const { store, report } = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("kb_pl", "wroclaw", 45, 0.6, T2) }]),
  );
  const q = quotesOf(store, "wroclaw", "malowanie-scian-m2");
  assert("overwrite newer updatedAt wins (price 45)", q?.kb_pl?.wroclaw?.price === 45);
  assert("overwrite report cellsOverwritten=1", report.cellsOverwritten === 1 && report.cellsAdded === 0);
}

// ─── 3. TIE-BREAK — remis ts: wyższy confidence wygrywa; pełny remis keep ────
{
  const higherConf = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("kb_pl", "wroclaw", 50, 0.95, T1) }]),
  );
  const q1 = quotesOf(higherConf.store, "wroclaw", "malowanie-scian-m2");
  assert("tie-break higher confidence wins (price 50)", q1?.kb_pl?.wroclaw?.price === 50);
  assert("tie-break overwritten=1", higherConf.report.cellsOverwritten === 1);

  const fullTie = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("kb_pl", "wroclaw", 99, 0.8, T1) }]),
  );
  const q2 = quotesOf(fullTie.store, "wroclaw", "malowanie-scian-m2");
  assert("full tie keeps existing (price 40, not 99)", q2?.kb_pl?.wroclaw?.price === 40);
  assert("full tie kept=1, no touch", fullTie.report.cellsKept === 1 && fullTie.report.worksTouched === 0);
  assert("full tie returns same store ref", fullTie.store === fullTie.store);
}

// ─── 4. IDEMPOTENCE — 3× ten sam preview → identyczny store ──────────────────
{
  const preview = makePreview([
    { workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) },
    { workId: "malowanie-scian-m2", snapshot: snap("interbud", "polska", 60, 0.65, T1) },
    { workId: "montaz-wc-szt", snapshot: snap("kb_pl", "wroclaw", 210, 0.9, T2) },
  ]);
  const r1 = applyMarketQuotesFromPreview(baseStore(), preview).store;
  const r2 = applyMarketQuotesFromPreview(r1, preview).store;
  const r3 = applyMarketQuotesFromPreview(r2, preview).store;
  assert("idempotence apply×2 == apply×1", deepEqual(r1, r2));
  assert("idempotence apply×3 == apply×1", deepEqual(r1, r3));
  const reApply = applyMarketQuotesFromPreview(r1, preview);
  assert("idempotence 2nd apply worksTouched=0", reApply.report.worksTouched === 0);
}

// ─── 5. REGION SUPPORT — dowolny region (dolnyslask) ────────────────────────
{
  const { store, report } = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([{ workId: "malowanie-scian-m2", snapshot: snap("wgdom", "dolnyslask", 33, 0.9, T1) }]),
    { region: "dolnyslask" },
  );
  assert("region param targets dolnyslask", report.region === "dolnyslask");
  assert("region dolnyslask quote applied", quotesOf(store, "dolnyslask", "malowanie-scian-m2")?.wgdom?.dolnyslask?.price === 33);
  assert("region wroclaw untouched", quotesOf(store, "wroclaw", "malowanie-scian-m2")?.wgdom === undefined);
}

// ─── 6. SKIP — workId spoza slice ───────────────────────────────────────────
{
  const { store, report } = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([{ workId: "nieistniejaca-robota", snapshot: snap("kb_pl", "wroclaw", 10, 0.9, T1) }]),
  );
  assert("skip unknown workId (no touch)", report.worksTouched === 0 && report.entriesSkippedNoWork === 1);
  assert("skip unknown returns same store ref", store === baseStore() ? false : true);
}

// ─── 7. mergeWorkMarketQuotes — jednostkowo ─────────────────────────────────
{
  const res = mergeWorkMarketQuotes(
    { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 40, 0.8, T1) } },
    [snap("kb_pl", "wroclaw", 45, 0.6, T2), snap("sekocenbud", "wroclaw", 55, 0.7, T1)],
  );
  assert("mergeWorkMarketQuotes added+overwritten", res.added === 1 && res.overwritten === 1);
  assert("mergeWorkMarketQuotes price overwrite", res.quotes?.kb_pl?.wroclaw?.price === 45);
}

// ─── 8. ROUND-TRIP — apply → save → load → normalize → quotes zachowane ─────
{
  storage.clear();
  const applied = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([
      { workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) },
      { workId: "montaz-wc-szt", snapshot: snap("kb_pl", "wroclaw", 210, 0.9, T2) },
    ]),
  ).store;
  saveWorkCatalogStoreLocal(applied, { updatedAtIso: T2 });
  const loaded = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
  assert(
    "round-trip sekocenbud preserved",
    quotesOf(loaded, "wroclaw", "malowanie-scian-m2")?.sekocenbud?.wroclaw?.price === 55,
  );
  assert(
    "round-trip kb_pl preserved",
    quotesOf(loaded, "wroclaw", "malowanie-scian-m2")?.kb_pl?.wroclaw?.price === 40,
  );
  assert(
    "round-trip montaz-wc quote preserved",
    quotesOf(loaded, "wroclaw", "montaz-wc-szt")?.kb_pl?.wroclaw?.price === 210,
  );
}

// ─── 9. FINGERPRINT — stabilny golden marketQuotes ──────────────────────────
{
  const applied = applyMarketQuotesFromPreview(
    baseStore(),
    makePreview([
      { workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) },
      { workId: "malowanie-scian-m2", snapshot: snap("kb_pl", "wroclaw", 45, 0.6, T2) },
      { workId: "malowanie-scian-m2", snapshot: snap("interbud", "polska", 60, 0.65, T1) },
      { workId: "montaz-wc-szt", snapshot: snap("wgdom", "wroclaw", 205, 0.92, T2) },
    ]),
  ).store;
  const projection = applied.catalogs.wroclaw.works.map((w) => ({ id: w.id, q: w.marketQuotes ?? null }));
  const fp = fingerprint(projection);
  console.log(`MARKET_QUOTES_FINGERPRINT computed=${fp}`);
  assert("marketQuotes fingerprint stable", fp === MARKET_QUOTES_FINGERPRINT);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
