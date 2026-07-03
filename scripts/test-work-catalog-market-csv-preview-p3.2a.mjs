/**
 * P3.2A — testy importera CSV (tryb PREVIEW, bez zapisu).
 * npx vite-node scripts/test-work-catalog-market-csv-preview-p3.2a.mjs
 */
import {
  createEmptyMarketWorkMappingStore,
  createSeededMarketWorkMappingStore,
  parseCsvLine,
  parseMarketCsv,
  previewMarketCsvImport,
  previewMarketCsvRows,
  registerMapping,
} from "../src/lib/work-catalog/index.ts";

const TS = "2026-06-28T16:00:00.000Z";

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

console.log("=== WORK CATALOG MARKET CSV PREVIEW P3.2A ===\n");

// ─── CSV parser ────────────────────────────────────────────────────────────

const commaFields = parseCsvLine("a,b,\"c,d\"", ",");
assert("parseCsvLine comma + quotes", commaFields.join("|") === "a|b|c,d");

const semiFields = parseCsvLine("x;y;\"42,50\"", ";");
assert("parseCsvLine semicolon", semiFields[2] === "42,50");

const bomParse = parseMarketCsv("\uFEFFkbCode,price,region\nKB-1,10,wroclaw\n");
assert("parseMarketCsv BOM", bomParse.headers[0] === "kbCode");
assert("parseMarketCsv row count", bomParse.rows.length === 1);

const semiParse = parseMarketCsv("kbCode;price;region\nKB-2;15,5;Wrocław\n");
assert("parseMarketCsv semicolon delimiter", semiParse.delimiter === ";");
assert("parseMarketCsv semi row", semiParse.rows[0].values.kbCode === "KB-2");

const badParse = parseMarketCsv("a,b\n1,2,3\n");
assert("parseMarketCsv column mismatch rejected", badParse.rejected.length === 1);

// ─── mapping store ─────────────────────────────────────────────────────────

let mappingStore = createEmptyMarketWorkMappingStore(TS);
const reg = registerMapping(mappingStore, {
  origin: "kb_pl",
  externalId: "KB-MAL-01",
  workId: "malowanie-scian-m2",
  confidence: 0.9,
  aliases: [],
  updatedAt: TS,
});
mappingStore = reg.store;

const regLow = registerMapping(mappingStore, {
  origin: "kb_pl",
  externalId: "KB-LOW",
  workId: "legacy-malowanie-m2",
  confidence: 0.35,
  aliases: [],
  updatedAt: TS,
});
mappingStore = regLow.store;

// ─── preview: matched / unmatched / low confidence / rejected ────────────────

const CSV = `kbCode,price,region,confidence
KB-MAL-01,42.50,Wrocław,0.92
KB-UNKNOWN,10,wroclaw,0.8
KB-LOW,30,wroclaw,0.35
,5,wroclaw,0.9
`;

const report = previewMarketCsvImport(CSV, {
  defaultOrigin: "kb_pl",
  mappingStore,
  fallbackUpdatedAt: TS,
});

assert("preview mode", report.mode === "preview");
assert("preview matched count", report.matched.length === 1);
assert("preview matched workId", report.matched[0].workId === "malowanie-scian-m2");
assert("preview matched origin kb_pl", report.matched[0].origin === "kb_pl");
assert("preview matched externalId", report.matched[0].externalId === "KB-MAL-01");
assert("preview matched confidence", report.matched[0].confidence === 0.92);
assert("preview matched status", report.matched[0].status === "matched");

assert("preview unmatched count", report.unmatched.length === 1);
assert("preview unmatched externalId", report.unmatched[0].externalId === "KB-UNKNOWN");
assert("preview unmatched status", report.unmatched[0].status === "unmatched");

assert("preview low confidence count", report.lowConfidence.length === 1);
assert("preview low confidence workId", report.lowConfidence[0].workId === "legacy-malowanie-m2");
assert("preview low confidence status", report.lowConfidence[0].status === "low_confidence");

assert("preview rejected validation", report.rejected.some((r) => r.errors.length > 0));
assert("preview snapshot not saved flag", report.matched[0].snapshot != null);

// ─── canonical CSV with origin column + adapter ────────────────────────────

const canonicalCsv = `workId,origin,region,price,updatedAt,confidence
malowanie-scian-m2,wgdom,wroclaw,40.00,${TS},0.95
`;

const wgReport = previewMarketCsvImport(canonicalCsv, { fallbackUpdatedAt: TS });
assert("wgdom canonical matched", wgReport.matched.length === 1);
assert("wgdom direct workId", wgReport.matched[0].workId === "malowanie-scian-m2");

// ─── previewMarketCsvRows without parser ───────────────────────────────────

const rowsOnly = previewMarketCsvRows(
  [
    {
      values: {
        interbudId: "INT-404",
        price: "50",
        regionCode: "wroclaw",
      },
    },
  ],
  { defaultOrigin: "interbud", fallbackUpdatedAt: TS },
);
assert("rows-only unmatched interbud", rowsOnly.unmatched.length === 1);

// ─── no write guarantee ────────────────────────────────────────────────────

assert("mapping store unchanged count", mappingStore.mappings.length === 2);

// ─── seed mapowań (D1 · S4) — SSOT-safe, ZERO fabrykacji ────────────────────

const seeded = createSeededMarketWorkMappingStore({
  works: [
    { id: "malowanie-scian-m2" },
    { id: "montaz-wc-szt" },
    { id: "robota-nieaktywna", active: false },
  ],
  updatedAtIso: TS,
});
assert("seed skips inactive works", seeded.mappings.length === 2);
assert("seed wgdom origin only", seeded.mappings.every((m) => m.origin === "wgdom"));
assert("seed externalId equals workId", seeded.mappings.every((m) => m.externalId === m.workId));
assert(
  "seed no fabricated provider codes",
  seeded.mappings.every((m) => m.origin !== "kb_pl" && m.origin !== "interbud" && m.origin !== "sekocenbud"),
);
assert(
  "seed empty when no works (no fabrication)",
  createSeededMarketWorkMappingStore().mappings.length === 0,
);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
