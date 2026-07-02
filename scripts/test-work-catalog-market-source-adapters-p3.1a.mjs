/**
 * P3.1A — testy adapterów źródeł rynku.
 * npx vite-node scripts/test-work-catalog-market-source-adapters-p3.1a.mjs
 */
import {
  adaptMarketSourceRecord,
  getMarketSourceAdapter,
  interbudMarketSourceAdapter,
  kbPlMarketSourceAdapter,
  mapMarketRegionLabelToCode,
  MARKET_SOURCE_ADAPTERS,
  sekocenbudMarketSourceAdapter,
  wgdomMarketSourceAdapter,
} from "../src/lib/work-catalog/index.ts";

const TS = "2026-06-28T14:00:00.000Z";
const WORK_INDEX = {
  byExternalCode: {
    "KB-MAL-01": { workId: "malowanie-scian-m2", confidence: 0.9 },
    "INT-442": { workId: "legacy-malowanie-m2", confidence: 0.82 },
    "SEK-H-12": { workId: "legacy-hydraulika-szt", confidence: 0.65 },
  },
};

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

console.log("=== WORK CATALOG MARKET SOURCE ADAPTERS P3.1A ===\n");

assert("four adapters registered", Object.keys(MARKET_SOURCE_ADAPTERS).length === 4);
assert("kb_pl origin", kbPlMarketSourceAdapter.origin === "kb_pl");

// ─── mapRegion ─────────────────────────────────────────────────────────────

assert("region label Wrocław", mapMarketRegionLabelToCode("Wrocław") === "wroclaw");
assert("region code passthrough", mapMarketRegionLabelToCode("dolnyslask") === "dolnyslask");
assert(
  "kb_pl mapRegion",
  kbPlMarketSourceAdapter.mapRegion({ region: "dolnośląskie", price: 1 }) === "dolnyslask",
);

// ─── validate ──────────────────────────────────────────────────────────────

const kbInvalid = kbPlMarketSourceAdapter.validate({ price: 0, region: "wroclaw" });
assert("kb_pl validate rejects missing code", !kbInvalid.ok);

const kbValid = kbPlMarketSourceAdapter.validate({
  kbCode: "KB-MAL-01",
  price: 42.5,
  region: "Wrocław",
});
assert("kb_pl validate ok", kbValid.ok);

// ─── mapWork ───────────────────────────────────────────────────────────────

const kbWork = kbPlMarketSourceAdapter.mapWork(
  { kbCode: "KB-MAL-01", price: 10, region: "wroclaw" },
  WORK_INDEX,
);
assert("kb_pl mapWork via index", kbWork.workId === "malowanie-scian-m2");
assert("kb_pl mapWork confidence", kbWork.confidence === 0.9);

const wgWork = wgdomMarketSourceAdapter.mapWork({
  workId: "malowanie-scian-m2",
  price: 40,
  regionCode: "wroclaw",
});
assert("wgdom direct workId", wgWork.workId === "malowanie-scian-m2");

// ─── normalize ─────────────────────────────────────────────────────────────

const kbSnap = kbPlMarketSourceAdapter.normalize(
  {
    kbCode: "KB-MAL-01",
    price: "42,50",
    region: "Wrocław",
    updatedAt: TS,
    coverage: "full",
  },
  { fallbackUpdatedAt: TS, workIndex: WORK_INDEX },
);
assert("kb_pl normalize price", kbSnap?.price === 42.5);
assert("kb_pl normalize origin", kbSnap?.origin === "kb_pl");
assert("kb_pl normalize region", kbSnap?.regionCode === "wroclaw");

const interSnap = interbudMarketSourceAdapter.normalize(
  {
    interbudId: "INT-442",
    price: 39,
    regionCode: "powiat_wroclawski",
    confidence: 0.8,
  },
  { fallbackUpdatedAt: TS, workIndex: WORK_INDEX },
);
assert("interbud region", interSnap?.regionCode === "powiat_wroclawski");

const sekSnap = sekocenbudMarketSourceAdapter.normalize(
  {
    sekocenCode: "SEK-H-12",
    price: 120,
    region: "Polska",
  },
  { fallbackUpdatedAt: TS, workIndex: WORK_INDEX },
);
assert("sekocenbud default indicative coverage", sekSnap?.coverage === "indicative");
assert("sekocenbud polska", sekSnap?.regionCode === "polska");

const wgSnap = wgdomMarketSourceAdapter.normalize(
  {
    workId: "malowanie-scian-m2",
    price: 41,
    sampleCount: 6,
  },
  { fallbackUpdatedAt: TS },
);
assert("wgdom high sample confidence", (wgSnap?.confidence ?? 0) >= 0.92);

// ─── adaptMarketSourceRecord ─────────────────────────────────────────────────

const adapted = adaptMarketSourceRecord(
  "kb_pl",
  { kbCode: "KB-MAL-01", price: 30, region: "wroclaw" },
  { fallbackUpdatedAt: TS, workIndex: WORK_INDEX },
);
assert("adapt wrapper snapshot", adapted.snapshot?.price === 30);
assert("adapt wrapper workId", adapted.workId === "malowanie-scian-m2");

const bad = adaptMarketSourceRecord("interbud", { price: -1 }, { fallbackUpdatedAt: TS });
assert("adapt invalid no snapshot", bad.snapshot == null);
assert("adapt invalid validation", !bad.validation.ok);

const registry = getMarketSourceAdapter("sekocenbud");
assert("getMarketSourceAdapter", registry.origin === "sekocenbud");

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
