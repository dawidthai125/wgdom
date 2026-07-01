/**
 * NG-04.1 — BOQ Explorer SSOT tests (T01–T16).
 * npx vite-node scripts/test-ng04-kosztorys-boq-explorer.mjs
 */
import {
  buildKosztorysBoqExplorerView,
  filterKosztorysBoqRows,
  foldBoqSearchText,
  matchAthPricedRow,
  normalizeBoqDescPrefix,
  normalizeBoqLp,
  selectTopCostRows,
} from "../src/lib/tender-kosztorys-boq-explorer.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function baseItem(kosztorys) {
  return {
    id: "t-ng04",
    tenderId: "BZP-NG04",
    title: "Test NG-04 BOQ",
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [{ index: 1, filename: "kosztorys.ath", downloadUrl: "https://example.com/k.ath" }],
    tenderDossier: kosztorys ? { kosztorys, brief: { builtAt: new Date().toISOString(), fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [] }, builtAt: new Date().toISOString() } : null,
  };
}

function catalogLine(lp, desc, unit, qty) {
  return { lp, description: desc, unit, quantity: qty };
}

function athRow(lp, desc, unit, qty, unitPrice, total) {
  return { lp, description: desc, unit, quantity: qty, unitPrice, total };
}

console.log("T01 — empty dossier");
{
  const view = buildKosztorysBoqExplorerView({ item: baseItem(null) });
  assert(view.rows.length === 0, "T01 no rows");
  assert(view.meta.totalRows === 0, "T01 meta total 0");
}

console.log("\nT02 — catalog without ATH rows");
{
  const kosztorys = {
    ok: true,
    sourceFilename: "k.ath",
    rowCount: 0,
    rows: [],
    catalogQuantities: [catalogLine("1", "Roboty ziemne KNR 2-02-01", "m3", "10")],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  };
  const view = buildKosztorysBoqExplorerView({ item: baseItem(kosztorys) });
  assert(view.rows.length === 1, "T02 one row");
  assert(view.rows[0].athMatched === false, "T02 ath not matched");
  assert(view.rows[0].athUnitPrice == null, "T02 no ath price");
}

console.log("\nT03 — LP match ATH");
{
  const kosztorys = {
    ok: true,
    sourceFilename: "k.ath",
    totalValue: "5400,00",
    currency: "PLN",
    rowCount: 1,
    rows: [athRow("1", "Roboty ziemne", "m3", "120", "45,00", "5400,00")],
    catalogQuantities: [catalogLine("1", "Roboty ziemne KNR 2-02-01", "m3", "120")],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  };
  const view = buildKosztorysBoqExplorerView({ item: baseItem(kosztorys) });
  assert(view.rows[0].athUnitPrice === "45,00", "T03 ath unit price");
  assert(view.rows[0].athMatched === true, "T03 ath matched");
}

console.log("\nT04 — desc prefix fallback match");
{
  const desc = "Roboty ziemne wykop i zasyp kanalizacji";
  const indexes = {
    byLp: new Map(),
    byDesc: new Map([[normalizeBoqDescPrefix(desc), athRow("99", desc, "m3", "5", "10,00", "50,00")]]),
  };
  const matched = matchAthPricedRow(catalogLine("2", desc, "m3", "5"), indexes);
  assert(matched?.unitPrice === "10,00", "T04 desc fallback");
}

console.log("\nT05 — no match");
{
  const indexes = { byLp: new Map(), byDesc: new Map() };
  const matched = matchAthPricedRow(catalogLine("3", "Całkowicie inna pozycja", "szt", "1"), indexes);
  assert(matched == null, "T05 no ath match");
}

console.log("\nT06 — searchText precomputed");
{
  const kosztorys = {
    ok: true,
    sourceFilename: "k.ath",
    rowCount: 1,
    rows: [],
    catalogQuantities: [catalogLine("1", "Malowanie ścian", "m2", "100")],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  };
  const view = buildKosztorysBoqExplorerView({ item: baseItem(kosztorys) });
  assert(view.rows[0].searchText.includes("malowanie"), "T06 search text fold");
}

console.log("\nT11 — search filter");
{
  const rows = [
    { rowKey: "a", lp: "1", description: "Malowanie", unit: "m2", quantity: "1", knrHint: "—", athUnitPrice: null, athTotal: null, athMatched: false, wgdomUnitPln: null, wgdomLinePln: null, wgdomPriced: false, pricing: null, isUnknown: true, searchText: foldBoqSearchText("1 Malowanie scian") },
    { rowKey: "b", lp: "2", description: "Tynkowanie", unit: "m2", quantity: "1", knrHint: "—", athUnitPrice: null, athTotal: null, athMatched: false, wgdomUnitPln: null, wgdomLinePln: null, wgdomPriced: false, pricing: null, isUnknown: true, searchText: foldBoqSearchText("2 Tynkowanie") },
  ];
  const filtered = filterKosztorysBoqRows(rows, { query: "malow" });
  assert(filtered.length === 1, "T11 search subset");
  assert(filtered[0].lp === "1", "T11 correct row");
}

console.log("\nT12 — search diacritics");
{
  const rows = [{
    rowKey: "a", lp: "1", description: "Malowanie", unit: "m2", quantity: "1", knrHint: "—",
    athUnitPrice: null, athTotal: null, athMatched: false, wgdomUnitPln: null, wgdomLinePln: null,
    wgdomPriced: false, pricing: null, isUnknown: true,
    searchText: foldBoqSearchText("Malowanie ścian"),
  }];
  assert(filterKosztorysBoqRows(rows, { query: "scian" }).length === 1, "T12 diacritics");
}

console.log("\nT14 — rowKey stability");
{
  const kosztorys = {
    ok: true,
    sourceFilename: "k.ath",
    rowCount: 1,
    rows: [],
    catalogQuantities: [catalogLine("1.2", "Test pozycja", "szt", "2")],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  };
  const v1 = buildKosztorysBoqExplorerView({ item: baseItem(kosztorys) });
  const v2 = buildKosztorysBoqExplorerView({ item: baseItem(kosztorys) });
  assert(v1.rows[0].rowKey === v2.rows[0].rowKey, "T14 stable rowKey");
  assert(v1.rows[0].rowKey === `lp:${normalizeBoqLp("1.2")}`, "T14 lp key");
}

console.log("\nT16 — selectTopCostRows SSOT");
{
  const rows = [
    { rowKey: "a", lp: "1", description: "A", unit: "m2", quantity: "1", knrHint: "—", athUnitPrice: null, athTotal: null, athMatched: false, wgdomUnitPln: 10, wgdomLinePln: 100, wgdomPriced: true, pricing: null, isUnknown: false, searchText: "a" },
    { rowKey: "b", lp: "2", description: "B", unit: "m2", quantity: "1", knrHint: "—", athUnitPrice: null, athTotal: null, athMatched: false, wgdomUnitPln: 20, wgdomLinePln: 500, wgdomPriced: true, pricing: null, isUnknown: false, searchText: "b" },
    { rowKey: "c", lp: "3", description: "C", unit: "m2", quantity: "1", knrHint: "—", athUnitPrice: null, athTotal: null, athMatched: false, wgdomUnitPln: null, wgdomLinePln: 0, wgdomPriced: false, pricing: null, isUnknown: true, searchText: "c" },
  ];
  const top = selectTopCostRows(rows, 1);
  assert(top.length === 1, "T16 top count");
  assert(top[0].lp === "2", "T16 highest wgdom line");
}

console.log("\nT16b — Principle #003 search does not rebuild");
{
  const kosztorys = {
    ok: true,
    sourceFilename: "k.ath",
    rowCount: 2,
    rows: [],
    catalogQuantities: [
      catalogLine("1", "Malowanie KNR", "m2", "10"),
      catalogLine("2", "Tynki KNR", "m2", "20"),
    ],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  };
  const view = buildKosztorysBoqExplorerView({ item: baseItem(kosztorys) });
  const baseLen = view.rows.length;
  const filtered = filterKosztorysBoqRows(view.rows, { query: "malow" });
  assert(view.rows.length === baseLen, "T16b view unchanged after filter");
  assert(filtered.length < baseLen, "T16b filter subset");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
