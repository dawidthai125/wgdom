/**
 * NG-04.2 — Benchmark per Line tests (T01–T12).
 * npx vite-node scripts/test-ng04-2-benchmark-per-line.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import {
  buildBoqLaborBenchmarkCache,
  resolveBoqRowLaborBenchmark,
} from "../src/lib/tender-kosztorys-boq-benchmark.ts";
import { compareLaborRateToBenchmark } from "../src/lib/labor-benchmark.ts";
import { CATALOG_UX_SOURCE_LABEL } from "../src/lib/tender-catalog-ux-labels.ts";
import { buildKosztorysBoqExplorerView } from "../src/lib/tender-kosztorys-boq-explorer.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function assertEq(actual, expected, label) {
  assert(actual === expected, `${label} (got ${JSON.stringify(actual)})`);
}

function pricingRow(overrides = {}) {
  return {
    lp: "1",
    description: "Malowanie ścian",
    categoryId: "MALOWANIE",
    categoryLabel: "Malowanie",
    unit: "m2",
    quantity: 10,
    quantityDisplay: "10",
    materialPlnPerUnit: 5,
    laborPlnPerUnit: 22,
    lineTotalPln: 27,
    materialSource: CATALOG_UX_SOURCE_LABEL,
    laborSource: CATALOG_UX_SOURCE_LABEL,
    isUnknown: false,
    ...overrides,
  };
}

function boqRow(overrides = {}) {
  return {
    rowKey: "lp:1",
    lp: "1",
    description: "Malowanie ścian",
    unit: "m2",
    quantity: "10",
    knrHint: "KNR",
    athUnitPrice: null,
    athTotal: null,
    athMatched: false,
    wgdomUnitPln: 27,
    wgdomLinePln: 270,
    wgdomPriced: true,
    pricing: pricingRow(),
    isUnknown: false,
    searchText: "1 malowanie",
    ...overrides,
  };
}

console.log("T01 — classified row within benchmark (ok)");
{
  const row = boqRow();
  const cmp = resolveBoqRowLaborBenchmark(row);
  assert(cmp != null, "T01 comparison exists");
  assertEq(cmp?.status, "ok", "T01 status ok");
  const cache = buildBoqLaborBenchmarkCache([row]);
  assert(cache.has("lp:1"), "T01 cache has rowKey");
}

console.log("\nT02 — labor above max");
{
  const row = boqRow({ pricing: pricingRow({ laborPlnPerUnit: 30 }) });
  const cmp = resolveBoqRowLaborBenchmark(row);
  assertEq(cmp?.status, "above", "T02 above");
}

console.log("\nT03 — labor below min");
{
  const row = boqRow({ pricing: pricingRow({ laborPlnPerUnit: 10 }) });
  const cmp = resolveBoqRowLaborBenchmark(row);
  assertEq(cmp?.status, "below", "T03 below");
}

console.log("\nT04 — isUnknown → null");
{
  const row = boqRow({ isUnknown: true, pricing: null });
  assert(resolveBoqRowLaborBenchmark(row) === null, "T04 unknown null");
  const cache = buildBoqLaborBenchmarkCache([row]);
  assert(!cache.has("lp:1"), "T04 not in cache");
}

console.log("\nT05 — unavailable (unit mismatch) → null");
{
  const row = boqRow({ pricing: pricingRow({ unit: "szt", laborPlnPerUnit: 22 }) });
  assert(resolveBoqRowLaborBenchmark(row) === null, "T05 unit mismatch null");
}

console.log("\nT06 — cache 500 rows performance");
{
  const rows = Array.from({ length: 500 }, (_, i) =>
    boqRow({
      rowKey: `lp:${i + 1}`,
      lp: String(i + 1),
      pricing: pricingRow({
        lp: String(i + 1),
        laborPlnPerUnit: 10 + (i % 25),
      }),
    }),
  );
  const t0 = performance.now();
  const cache = buildBoqLaborBenchmarkCache(rows);
  const ms = performance.now() - t0;
  console.log(`  · buildBoqLaborBenchmarkCache(500) = ${ms.toFixed(1)}ms`);
  assert(ms < 50, "T06 cache 500 < 50ms");
  assert(cache.size > 0 && cache.size <= 500, "T06 cache size bounded");
}

console.log("\nT07 — consistency with compareLaborRateToBenchmark");
{
  const row = boqRow();
  const direct = compareLaborRateToBenchmark(22, "MALOWANIE", "m2");
  const resolved = resolveBoqRowLaborBenchmark(row);
  assertEq(resolved?.status, direct.status, "T07 same status");
}

console.log("\nT08 — static: explorer without labor-benchmark import");
{
  const src = readFileSync(resolve(root, "src/lib/tender-kosztorys-boq-explorer.ts"), "utf8");
  assert(!src.includes("labor-benchmark"), "T08 explorer no benchmark import");
  assert(!src.includes("tender-kosztorys-boq-benchmark"), "T08 explorer no boq-benchmark import");
}

console.log("\nT09 — static: filter without benchmark import");
{
  const src = readFileSync(resolve(root, "src/lib/tender-kosztorys-boq-explorer.ts"), "utf8");
  assert(src.includes("filterKosztorysBoqRows"), "T09 filter exists");
  assert(!src.includes("resolveBoqRowLaborBenchmark"), "T09 filter no resolve");
}

console.log("\nT10 — static: BoqLaborBenchmarkBadge no compare import");
{
  const src = readFileSync(resolve(root, "src/app/kosztorys/BoqLaborBenchmarkBadge.tsx"), "utf8");
  assert(!src.includes("compareLaborRateToBenchmark"), "T10 badge no compare");
  assert(!src.includes("resolveBoqRowLaborBenchmark"), "T10 badge no resolve");
  assert(src.includes("cache.get"), "T10 badge uses cache.get");
}

console.log("\nT11 — cache reference stable across filter simulation");
{
  const item = {
    id: "t-bench",
    tenderId: "BZP-BENCH",
    title: "Bench",
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [],
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: "k.ath",
        rowCount: 2,
        rows: [],
        catalogQuantities: [
          { lp: "1", description: "Malowanie pomieszczeń KNR", unit: "m2", quantity: "50" },
          { lp: "2", description: "Gładź gipsowa na ścianach", unit: "m2", quantity: "80" },
        ],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: new Date().toISOString(),
      },
      brief: {
        builtAt: new Date().toISOString(),
        fields: [],
        scopeDescription: null,
        location: null,
        procedureType: null,
        offerDeadline: null,
        offerOpening: null,
        contractPeriod: null,
        paymentTerms: null,
        contactInfo: null,
        additionalNotes: [],
      },
      builtAt: new Date().toISOString(),
    },
  };
  const view = buildKosztorysBoqExplorerView({ item });
  const cache1 = buildBoqLaborBenchmarkCache(view.rows);
  const cache2 = buildBoqLaborBenchmarkCache(view.rows);
  assert(cache1 !== cache2, "T11 new Map per build call");
  const ref = cache1;
  for (let i = 0; i < 20; i += 1) {
    void view.rows.filter((r) => r.searchText.includes("mal"));
  }
  assert(ref === cache1, "T11 cache unchanged after filter simulation");
}

console.log("\nT12 — static #006: kosztorys UI no resolveBoqRowLaborBenchmark");
{
  const files = [
    "src/app/kosztorys/KosztorysBoqExplorerSection.tsx",
    "src/app/kosztorys/KosztorysBoqRowFields.tsx",
    "src/app/kosztorys/BoqLaborBenchmarkBadge.tsx",
  ];
  for (const f of files) {
    const src = readFileSync(resolve(root, f), "utf8");
    assert(!src.includes("resolveBoqRowLaborBenchmark"), `T12 ${f} no resolve`);
    assert(!src.includes("compareLaborRateToBenchmark"), `T12 ${f} no compare`);
  }
  const section = readFileSync(resolve(root, "src/app/kosztorys/KosztorysBoqExplorerSection.tsx"), "utf8");
  assert(section.includes("buildBoqLaborBenchmarkCache"), "T12 section uses cache builder");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
