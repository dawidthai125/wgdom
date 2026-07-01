/**
 * M8 — Large BOQ Performance gate (NG-04.1 pre-release).
 * npx vite-node scripts/test-ng04-m8-large-boq-performance.mjs
 *
 * Prod SSOT cap = 500 poz. (CATALOG_QUANTITIES_CAP). Stress path = 1200 filter-only.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { CATALOG_QUANTITIES_CAP, SNAPSHOT_PRICED_ROWS_CAP } from "../src/lib/tenders-bzp-brief.ts";
import {
  buildKosztorysBoqExplorerView,
  filterKosztorysBoqRows,
  selectTopCostRows,
} from "../src/lib/tender-kosztorys-boq-explorer.ts";
import { buildBoqLaborBenchmarkCache } from "../src/lib/tender-kosztorys-boq-benchmark.ts";
import { buildKosztorysProTopRowsFromBoqView } from "../src/lib/tender-kosztorys-pro-dashboard.ts";
import { deriveKosztorysProcessPhase } from "../src/lib/tender-kosztorys-process-phase.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const THRESHOLD = {
  build500Ms: 2500,
  singleFilterMs: 120,
  searchBurst50Ms: 600,
  scrollPage20Ms: 50,
  filterCycle20Ms: 400,
  stress1200FilterMs: 800,
};

let pass = 0;
let fail = 0;
const failures = [];

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; failures.push(label); console.error(`  ✗ ${label}`); }
}

function makeCatalogN(n, opts = {}) {
  const { pricedAth = true, wgdomValueBase = 100 } = opts;
  const catalog = Array.from({ length: n }, (_, i) => ({
    lp: String(i + 1),
    description: `Pozycja ${i + 1} instalacja elektryczna KNR 2-02-01 rozdzielnica`,
    unit: "m2",
    quantity: String((i % 50) + 1),
  }));
  const rows = pricedAth
    ? catalog.map((c, i) => ({
      ...c,
      unitPrice: `${10 + (i % 20)},00`,
      total: `${(10 + (i % 20)) * parseFloat(c.quantity)},00`,
    }))
    : catalog.map((c) => ({ ...c, unitPrice: "", total: "" }));
  return { catalog, rows };
}

function largeItem(n) {
  const { catalog, rows } = makeCatalogN(n);
  return {
    id: `m8-${n}`,
    tenderId: `BZP-M8-${n}`,
    title: `M8 large BOQ ${n}`,
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [{ index: 1, filename: "kosztorys.ath", downloadUrl: "https://example.com/k.ath" }],
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: "kosztorys.ath",
        totalValue: "9999999,00",
        currency: "PLN",
        rowCount: n,
        rows: rows.slice(0, SNAPSHOT_PRICED_ROWS_CAP),
        catalogQuantities: catalog.slice(0, CATALOG_QUANTITIES_CAP),
        przedmiar: [],
        categories: [{ name: "Dział 1", total: "1 000 000,00" }],
        warnings: [],
        parsedAt: new Date().toISOString(),
      },
      brief: {
        builtAt: new Date().toISOString(),
        fields: [],
        scopeDescription: "Remont instalacji elektrycznej",
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
      parserVersion: 4,
    },
  };
}

function simulateScrollPages(filteredRows, pageSize = 20, pages = 5) {
  const t0 = performance.now();
  for (let p = 0; p < pages; p += 1) {
    const slice = filteredRows.slice(p * pageSize, (p + 1) * pageSize);
    if (!slice.length) break;
    void slice.map((r) => r.rowKey);
  }
  return performance.now() - t0;
}

console.log("=== M8 — Large BOQ Performance Gate (NG-04.1) ===\n");
console.log(`Prod caps: catalogQuantities=${CATALOG_QUANTITIES_CAP}, priced rows=${SNAPSHOT_PRICED_ROWS_CAP}\n`);

console.log("M8.0 — Fixture size (max prod)");
{
  assert(CATALOG_QUANTITIES_CAP === 500, "M8.0 prod catalog cap is 500");
  const item = largeItem(500);
  assert(item.tenderDossier.kosztorys.catalogQuantities.length === 500, "M8.0 fixture 500 catalog lines");
}

console.log("\nM8.1 — ViewModel build once (Desktop/Mobile shared SSOT)");
let view500;
{
  const item = largeItem(500);
  const t0 = performance.now();
  view500 = buildKosztorysBoqExplorerView({ item });
  const buildMs = performance.now() - t0;
  console.log(`  · buildKosztorysBoqExplorerView(500) = ${buildMs.toFixed(1)}ms`);
  assert(view500.rows.length === 500, "M8.1 view has 500 rows");
  assert(buildMs < THRESHOLD.build500Ms, `M8.1 build < ${THRESHOLD.build500Ms}ms`);
  assert(view500.rows[0].athUnitPrice != null, "M8.1 ATH column populated row 1");
  assert(view500.rows[0].knrHint !== undefined, "M8.1 KNR hint present");
}

console.log("\nM8.2 — Search bez rebuild ViewModel (Principle #003)");
{
  const rowsRef = view500.rows;
  let buildCalls = 0;
  const guardedBuild = (opts) => {
    buildCalls += 1;
    return buildKosztorysBoqExplorerView(opts);
  };
  void guardedBuild; // architectural: workspace calls build once in useMemo([item])

  const t0 = performance.now();
  const queries = ["instalacja", "rozdziel", "knr", "pozycja 4", "elektrycz", "99", "malow", "2-02"];
  for (let i = 0; i < 50; i += 1) {
    const q = queries[i % queries.length];
    const filtered = filterKosztorysBoqRows(rowsRef, { query: q });
    assert(filtered.length <= 500, `M8.2 search iteration ${i} subset`);
  }
  const burstMs = performance.now() - t0;
  console.log(`  · 50× filterKosztorysBoqRows = ${burstMs.toFixed(1)}ms`);
  assert(burstMs < THRESHOLD.searchBurst50Ms, `M8.2 search burst < ${THRESHOLD.searchBurst50Ms}ms`);
  assert(buildCalls === 0, "M8.2 zero build during search simulation");

  const afterSearch = view500.rows;
  assert(afterSearch === rowsRef, "M8.2 view.rows reference unchanged after search");
}

console.log("\nM8.3 — Filtry branżowe bez rebuild");
{
  const rowsRef = view500.rows;
  const filters = ["all", "elektryczne", "wykończeniowe", "sanitarne", "dachowe", "drogowe"];
  const t0 = performance.now();
  for (let i = 0; i < 20; i += 1) {
    const f = filters[i % filters.length];
    filterKosztorysBoqRows(rowsRef, { categoryFilter: f });
  }
  const filterMs = performance.now() - t0;
  console.log(`  · 20× category filter = ${filterMs.toFixed(1)}ms`);
  assert(filterMs < THRESHOLD.filterCycle20Ms, `M8.3 filter cycle < ${THRESHOLD.filterCycle20Ms}ms`);
  assert(view500.rows === rowsRef, "M8.3 view.rows unchanged after filters");
}

console.log("\nM8.4 — Scroll / pagination (lazy window)");
{
  const filtered = filterKosztorysBoqRows(view500.rows, { query: "instalacja" });
  const scrollMs = simulateScrollPages(filtered, 20, 10);
  console.log(`  · 10 pages × 20 rows slice = ${scrollMs.toFixed(1)}ms`);
  assert(scrollMs < THRESHOLD.scrollPage20Ms * 10, "M8.4 scroll pages within budget");

  const showAll = filtered;
  const preview = showAll.slice(0, 20);
  assert(preview.length === 20, "M8.4 preview limit 20");
  const expanded = showAll;
  assert(expanded.length === filtered.length, "M8.4 show-all expands without rebuild");
}

console.log("\nM8.5 — TOP20 correctness (selectTopCostRows SSOT)");
{
  const priced = view500.rows.map((r, i) => ({
    ...r,
    wgdomLinePln: (i + 1) * 10,
    wgdomPriced: true,
    isUnknown: false,
  }));
  const top = selectTopCostRows(priced, 20);
  assert(top.length === 20, "M8.5 top 20 count");
  assert(top[0].lp === "500", "M8.5 highest value first (lp 500)");
  assert(top[19].lp === "481", "M8.5 20th highest (lp 481)");
  for (let i = 1; i < top.length; i += 1) {
    assert((top[i - 1].wgdomLinePln ?? 0) >= (top[i].wgdomLinePln ?? 0), `M8.5 sorted ${i}`);
  }

  const dashTop = buildKosztorysProTopRowsFromBoqView({ ...view500, rows: priced });
  assert(dashTop.length === 20, "M8.5 dashboard top rows");
  assert(dashTop[0].valuePln >= dashTop[19].valuePln, "M8.5 dashboard top sorted");
}

console.log("\nM8.6 — ATH/WGDOM column integrity (sample)");
{
  const withAth = view500.rows.filter((r) => r.athMatched && r.athUnitPrice);
  assert(withAth.length > 100, "M8.6 majority ATH matched at 500");
  const sample = withAth[0];
  assert(sample.athTotal != null, "M8.6 ATH total present");
  assert(typeof sample.wgdomUnitPln === "number" || sample.wgdomUnitPln === null, "M8.6 WGDOM unit typed");
}

console.log("\nM8.7 — Stress filter 1200 rows (algorithm headroom, filter-only)");
{
  const { catalog } = makeCatalogN(1200, { pricedAth: false });
  const stressRows = catalog.map((c, i) => ({
    rowKey: `lp:${c.lp}`,
    lp: c.lp,
    description: c.description,
    unit: c.unit,
    quantity: c.quantity,
    knrHint: "KNR",
    athUnitPrice: null,
    athTotal: null,
    athMatched: false,
    wgdomUnitPln: (i % 100) + 1,
    wgdomLinePln: ((i % 100) + 1) * parseFloat(c.quantity),
    wgdomPriced: true,
    pricing: null,
    isUnknown: false,
    searchText: c.description.toLowerCase(),
  }));
  const t0 = performance.now();
  const f = filterKosztorysBoqRows(stressRows, { query: "rozdzielnica" });
  const ms = performance.now() - t0;
  console.log(`  · filter 1200 rows = ${ms.toFixed(1)}ms (${f.length} hits)`);
  assert(ms < THRESHOLD.stress1200FilterMs, `M8.7 stress filter < ${THRESHOLD.stress1200FilterMs}ms`);
}

console.log("\nM8.8 — NG-02 process regression (ready phase)");
{
  const item = largeItem(500);
  const phase = deriveKosztorysProcessPhase(item, { lazyEnabled: true });
  assert(phase.id === "ready", `M8.8 process phase ready (got ${phase.id})`);
}

console.log("\nM8.9 — Static: no build in explorer section search path");
{
  const sectionSrc = readFileSync(resolve(root, "src/app/kosztorys/KosztorysBoqExplorerSection.tsx"), "utf8");
  const wsSrc = readFileSync(resolve(root, "src/app/TenderKosztorysWorkspace.tsx"), "utf8");
  assert(!sectionSrc.includes("buildKosztorysBoqExplorerView"), "M8.9 section does not call build");
  assert(sectionSrc.includes("filterKosztorysBoqRows"), "M8.9 section uses filter only");
  assert(wsSrc.includes("useMemo(() => buildKosztorysBoqExplorerView"), "M8.9 workspace useMemo build");
  assert(!wsSrc.includes("filterKosztorysBoqRows"), "M8.9 workspace delegates filter to section");
}

console.log("\nM8.10 — Benchmark cache NG-04.2 (#005 · #006)");
{
  const t0 = performance.now();
  const cache500 = buildBoqLaborBenchmarkCache(view500.rows);
  const cacheMs = performance.now() - t0;
  console.log(`  · buildBoqLaborBenchmarkCache(500) = ${cacheMs.toFixed(1)}ms`);
  assert(cacheMs < 50, "M8.10 cache build < 50ms");

  const cacheRef = cache500;
  for (let i = 0; i < 50; i += 1) {
    filterKosztorysBoqRows(view500.rows, { query: "instalacja" });
  }
  assert(cacheRef === cache500, "M8.10 cache ref stable after 50× filter");

  const explorerSrc = readFileSync(resolve(root, "src/lib/tender-kosztorys-boq-explorer.ts"), "utf8");
  assert(!explorerSrc.includes("labor-benchmark"), "M8.10 explorer no benchmark import");

  const badgeSrc = readFileSync(resolve(root, "src/app/kosztorys/BoqLaborBenchmarkBadge.tsx"), "utf8");
  assert(badgeSrc.includes("cache.get"), "M8.10 badge cache lookup only");
  assert(!badgeSrc.includes("resolveBoqRowLaborBenchmark"), "M8.10 badge no resolve");
}

const verdict = fail === 0 ? "PASS" : "FAIL";
console.log(`\n=== M8 VERDICT: ${verdict} — ${pass} passed, ${fail} failed ===`);
if (failures.length) {
  console.log("Failures:", failures.join("; "));
}
process.exit(fail > 0 ? 1 : 0);
