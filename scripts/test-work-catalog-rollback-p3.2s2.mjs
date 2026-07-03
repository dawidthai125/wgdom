/**
 * WC-P3.2-S2 — golden: Rollback (Single Undo) dla Apply Market Quotes.
 * npx vite-node scripts/test-work-catalog-rollback-p3.2s2.mjs
 *
 * Scenariusze: fingerprint equality · deepEqual · idempotence · double undo ·
 * empty snapshot · corrupted snapshot (store/kind) · schema mismatch.
 */
import { createHash } from "node:crypto";
import {
  applyMarketQuotesFromPreview,
  captureMarketQuotesSnapshot,
  restoreMarketQuotesSnapshot,
  fingerprintWorkCatalogStore,
  MARKET_QUOTES_ROLLBACK_KIND,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";

/** Zamrożony golden — integralnościowy fingerprint (cyrb53) czystego base store. */
const ROLLBACK_BASE_FINGERPRINT = "02fdb6c034c1f1";
/** Zamrożony golden — sha256(16) projekcji marketQuotes po round-trip (undo). */
const ROLLBACK_ROUNDTRIP_SHA = "2baf93732f63386a";

const T1 = "2026-06-20T10:00:00.000Z";
const T2 = "2026-06-25T10:00:00.000Z";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass += 1; console.log("PASS", name); }
  else { fail += 1; console.log("FAIL", name); }
}
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function sha16(value) {
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
function previewSet() {
  return makePreview([
    { workId: "malowanie-scian-m2", snapshot: snap("sekocenbud", "wroclaw", 55, 0.7, T1) },
    { workId: "malowanie-scian-m2", snapshot: snap("kb_pl", "wroclaw", 45, 0.6, T2) },
    { workId: "montaz-wc-szt", snapshot: snap("wgdom", "wroclaw", 205, 0.92, T2) },
  ]);
}

console.log("=== WC-P3.2-S2 ROLLBACK (single undo) ===\n");

// ─── 1. snapshot-before-commit → apply → undo → deepEqual + fingerprint ─────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  assert("snapshot kind", token.kind === MARKET_QUOTES_ROLLBACK_KIND);
  assert("snapshot schemaVersion=4", token.schemaVersion === 4);

  const { store: applied } = applyMarketQuotesFromPreview(before, previewSet());
  assert("apply mutated store (differs)", !deepEqual(applied, before));

  const undo = restoreMarketQuotesSnapshot(applied, token);
  assert("undo restored=true", undo.restored === true && undo.reason === "ok");
  assert("undo deepEqual before", deepEqual(undo.store, before));
  assert(
    "undo fingerprint equality",
    fingerprintWorkCatalogStore(undo.store) === fingerprintWorkCatalogStore(before),
  );
  assert("undo fingerprint == token fingerprint", fingerprintWorkCatalogStore(undo.store) === token.fingerprint);
}

// ─── 2. idempotence — restore×3 identyczne ──────────────────────────────────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  const { store: applied } = applyMarketQuotesFromPreview(before, previewSet());
  const r1 = restoreMarketQuotesSnapshot(applied, token).store;
  const r2 = restoreMarketQuotesSnapshot(r1, token).store;
  const r3 = restoreMarketQuotesSnapshot(r2, token).store;
  assert("idempotence restore×2", deepEqual(r1, r2));
  assert("idempotence restore×3", deepEqual(r1, r3));
}

// ─── 3. double undo — drugie undo bezpieczne (single-level) ──────────────────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  const { store: applied } = applyMarketQuotesFromPreview(before, previewSet());
  const first = restoreMarketQuotesSnapshot(applied, token);
  const second = restoreMarketQuotesSnapshot(first.store, token);
  assert("double undo restored=true", second.restored === true);
  assert("double undo == first undo", deepEqual(second.store, first.store));
  assert("double undo == before", deepEqual(second.store, before));
}

// ─── 4. empty snapshot — no-op ──────────────────────────────────────────────
{
  const current = applyMarketQuotesFromPreview(baseStore(), previewSet()).store;
  const nullRes = restoreMarketQuotesSnapshot(current, null);
  const undefRes = restoreMarketQuotesSnapshot(current, undefined);
  assert("empty(null) no-op", nullRes.restored === false && nullRes.reason === "empty-snapshot");
  assert("empty(null) keeps current ref", nullRes.store === current);
  assert("empty(undefined) no-op", undefRes.restored === false && undefRes.reason === "empty-snapshot");
}

// ─── 5. corrupted snapshot — tampered store (fingerprint mismatch) ──────────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  const current = applyMarketQuotesFromPreview(before, previewSet()).store;

  const tampered = JSON.parse(JSON.stringify(token));
  tampered.store.catalogs.wroclaw.works[0].marketQuotes.kb_pl.wroclaw.price = 999; // bez update fingerprint
  const res = restoreMarketQuotesSnapshot(current, tampered);
  assert("corrupted(store) no-op", res.restored === false && res.reason === "corrupted-snapshot");
  assert("corrupted(store) keeps current", res.store === current);
}

// ─── 6. corrupted snapshot — bad kind ───────────────────────────────────────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  const current = applyMarketQuotesFromPreview(before, previewSet()).store;

  const badKind = { ...JSON.parse(JSON.stringify(token)), kind: "nope" };
  const res = restoreMarketQuotesSnapshot(current, badKind);
  assert("corrupted(kind) no-op", res.restored === false && res.reason === "corrupted-snapshot");

  const noFp = JSON.parse(JSON.stringify(token));
  delete noFp.fingerprint;
  const res2 = restoreMarketQuotesSnapshot(current, noFp);
  assert("corrupted(no fingerprint) no-op", res2.restored === false && res2.reason === "corrupted-snapshot");
}

// ─── 7. schema mismatch — no-op ─────────────────────────────────────────────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  const current = applyMarketQuotesFromPreview(before, previewSet()).store;

  const wrongSchema = JSON.parse(JSON.stringify(token));
  wrongSchema.schemaVersion = 3; // fingerprint nadal zgodny ze store
  const res = restoreMarketQuotesSnapshot(current, wrongSchema);
  assert("schema mismatch no-op", res.restored === false && res.reason === "schema-mismatch");
  assert("schema mismatch keeps current", res.store === current);
}

// ─── 8. FINGERPRINT — golden lock ───────────────────────────────────────────
{
  const before = baseStore();
  const token = captureMarketQuotesSnapshot(before);
  console.log(`ROLLBACK_BASE_FINGERPRINT computed=${token.fingerprint}`);

  const applied = applyMarketQuotesFromPreview(before, previewSet()).store;
  const undo = restoreMarketQuotesSnapshot(applied, token).store;
  const projection = undo.catalogs.wroclaw.works.map((w) => ({ id: w.id, q: w.marketQuotes ?? null }));
  const sha = sha16(projection);
  console.log(`ROLLBACK_ROUNDTRIP_SHA computed=${sha}`);

  assert("base fingerprint stable", token.fingerprint === ROLLBACK_BASE_FINGERPRINT);
  assert("round-trip sha stable", sha === ROLLBACK_ROUNDTRIP_SHA);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
