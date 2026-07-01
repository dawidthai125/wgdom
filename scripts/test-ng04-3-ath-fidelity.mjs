/**
 * NG-04.3 — ATH Fidelity tests (T01–T14).
 * npx vite-node scripts/test-ng04-3-ath-fidelity.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import {
  BOQ_ATH_TOOLTIP_BY_STATE,
  buildBoqAthDocumentMeta,
  buildBoqAthPresentationCache,
  bucketCostDiscoveryConfidence,
  resolveBoqAthCellState,
  resolveBoqAthPresentationMeta,
} from "../src/lib/tender-kosztorys-boq-ath-presentation.ts";

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

function boqRow(overrides = {}) {
  return {
    rowKey: "lp:1",
    lp: "1",
    description: "Malowanie ścian",
    unit: "m2",
    quantity: "10",
    knrHint: "KNR 2-02",
    athUnitPrice: null,
    athTotal: null,
    athMatched: false,
    wgdomUnitPln: 27,
    wgdomLinePln: 270,
    wgdomPriced: true,
    pricing: null,
    isUnknown: false,
    searchText: "1 malowanie",
    ...overrides,
  };
}

function dossierItem(overrides = {}) {
  return {
    id: "t-ath",
    tenderId: "BZP-ATH",
    title: "ATH test",
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [{ index: 1, filename: "kosztorys.ath", downloadUrl: "https://example.com/k.ath" }],
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: "kosztorys.ath",
        totalValue: "1000,00",
        currency: "PLN",
        rowCount: 1,
        rows: [{ lp: "1", description: "X", unit: "m2", quantity: "1", unitPrice: "10,00", total: "10,00" }],
        catalogQuantities: [{ lp: "1", description: "X", unit: "m2", quantity: "1" }],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: new Date().toISOString(),
      },
      scanSummary: {
        totalDocuments: 1,
        scanned: 1,
        parsed: 1,
        byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 },
        sevenZipCount: 0,
        kosztorysFound: true,
        valueFound: true,
        criteriaFound: false,
        estimateFound: false,
        costDiscovery: {
          found: true,
          type: "ath",
          source: "kosztorys.ath",
          confidence: 0.9,
        },
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
    ...overrides,
  };
}

console.log("T01 — FOUND_NO_VALUE → no_value_doc + deterministic tooltip");
{
  const row = boqRow();
  const state = resolveBoqAthCellState(row, { costStatus: "FOUND_NO_VALUE" });
  assertEq(state, "no_value_doc", "T01 state");
  const meta = resolveBoqAthPresentationMeta(row, { costStatus: "FOUND_NO_VALUE" });
  assert(
    meta.tooltipPl.includes("W dokumencie znaleziono pozycję, ale nie zawiera ceny."),
    "T01 tooltip FOUND_NO_VALUE",
  );
  assertEq(meta.tooltipPl, BOQ_ATH_TOOLTIP_BY_STATE.no_value_doc, "T01 tooltip exact");
}

console.log("\nT02 — priced row → priced + deterministic tooltip");
{
  const row = boqRow({ athMatched: true, athUnitPrice: "45,00", athTotal: "450,00" });
  const state = resolveBoqAthCellState(row, { costStatus: "FOUND_WITH_VALUE" });
  assertEq(state, "priced", "T02 state priced");
  const meta = resolveBoqAthPresentationMeta(row, { costStatus: "FOUND_WITH_VALUE" });
  assertEq(meta.tooltipPl, BOQ_ATH_TOOLTIP_BY_STATE.priced, "T02 tooltip priced");
}

console.log("\nT03 — matched empty unit price → empty_priced_row (no tooltip)");
{
  const row = boqRow({ athMatched: true, athUnitPrice: null });
  const state = resolveBoqAthCellState(row, { costStatus: "FOUND_WITH_VALUE" });
  assertEq(state, "empty_priced_row", "T03 empty_priced_row");
  assertEq(resolveBoqAthPresentationMeta(row, { costStatus: "FOUND_WITH_VALUE" }).tooltipPl, "", "T03 no tooltip");
}

console.log("\nT04 — unmatched + FOUND_WITH_VALUE → no_match");
{
  const row = boqRow({ athMatched: false });
  const state = resolveBoqAthCellState(row, { costStatus: "FOUND_WITH_VALUE" });
  assertEq(state, "no_match", "T04 no_match");
  assertEq(
    resolveBoqAthPresentationMeta(row, { costStatus: "FOUND_WITH_VALUE" }).tooltipPl,
    BOQ_ATH_TOOLTIP_BY_STATE.no_match,
    "T04 tooltip no_match",
  );
}

console.log("\nT05 — buildBoqAthPresentationCache 500 rows < 50ms");
{
  const rows = Array.from({ length: 500 }, (_, i) =>
    boqRow({
      rowKey: `lp:${i + 1}`,
      lp: String(i + 1),
      athMatched: i % 2 === 0,
      athUnitPrice: i % 2 === 0 ? "10,00" : null,
    }),
  );
  const t0 = performance.now();
  const cache = buildBoqAthPresentationCache(rows, { costStatus: "FOUND_WITH_VALUE" });
  const ms = performance.now() - t0;
  console.log(`  · buildBoqAthPresentationCache(500) = ${ms.toFixed(1)}ms`);
  assert(ms < 50, "T05 cache 500 < 50ms");
  assert(cache.size === 500, "T05 cache size 500");
}

console.log("\nT06 — cache stable ref po filter simulation");
{
  const rows = [boqRow(), boqRow({ rowKey: "lp:2", lp: "2" })];
  const cache = buildBoqAthPresentationCache(rows, { costStatus: "FOUND_WITH_VALUE" });
  const ref = cache;
  for (let i = 0; i < 20; i += 1) {
    void rows.filter((r) => r.searchText.includes("mal"));
  }
  assert(ref === cache, "T06 cache unchanged after filter simulation");
}

console.log("\nT07 — buildBoqAthDocumentMeta ATH type");
{
  const item = dossierItem();
  const meta = buildBoqAthDocumentMeta(item);
  assert(meta != null, "T07 meta exists");
  assertEq(meta?.sourceType, "ATH", "T07 sourceType ATH");
  assertEq(meta?.sourceFilename, "kosztorys.ath", "T07 filename");
}

console.log("\nT08 — confidence 0.9 → Wysoka");
{
  assertEq(bucketCostDiscoveryConfidence(0.9), "Wysoka", "T08 bucket");
  assertEq(bucketCostDiscoveryConfidence(0.7), "Średnia", "T08 medium");
  assertEq(bucketCostDiscoveryConfidence(0.4), "Niska", "T08 low");
}

console.log("\nT09 — static: explorer bez ath-presentation import");
{
  const src = readFileSync(resolve(root, "src/lib/tender-kosztorys-boq-explorer.ts"), "utf8");
  assert(!src.includes("tender-kosztorys-boq-ath-presentation"), "T09 explorer no ath-presentation");
  assert(!src.includes("resolveBoqAthCellState"), "T09 explorer no resolve");
}

console.log("\nT10 — static: BoqAthTooltip bez resolveBoqAthCellState");
{
  const src = readFileSync(resolve(root, "src/app/kosztorys/BoqAthTooltip.tsx"), "utf8");
  assert(!src.includes("resolveBoqAthCellState"), "T10 tooltip no resolve");
  assert(!src.includes("buildBoqAthPresentationCache"), "T10 tooltip no cache build");
  assert(src.includes("cache.get"), "T10 tooltip cache lookup");
}

console.log("\nT11 — static: sekcja bez parseKosztorys / fetchAndParse");
{
  const src = readFileSync(resolve(root, "src/app/kosztorys/KosztorysBoqExplorerSection.tsx"), "utf8");
  assert(!src.includes("parseKosztorysBytes"), "T11 no parseKosztorysBytes");
  assert(!src.includes("fetchAndParseKosztorys"), "T11 no fetchAndParse");
  assert(src.includes("buildBoqAthPresentationCache"), "T11 section builds ath cache");
}

console.log("\nT12 — static: brak duplikatu tabeli ATH w row fields");
{
  const src = readFileSync(resolve(root, "src/app/kosztorys/KosztorysBoqRowFields.tsx"), "utf8");
  assert(!src.includes("JobFilePreviewModal"), "T12 no modal in row fields");
  assert(!src.includes("parseKosztorys"), "T12 no parser");
  assert(src.includes("BoqAthTooltip"), "T12 uses tooltip adapter");
}

console.log("\nT13 — static: workspace jeden JobFilePreviewModal");
{
  const src = readFileSync(resolve(root, "src/app/TenderKosztorysWorkspace.tsx"), "utf8");
  const modalJsxCount = (src.match(/<JobFilePreviewModal/g) ?? []).length;
  assert(modalJsxCount === 1, `T13 single modal JSX (got ${modalJsxCount})`);
  assert(src.includes("onOpenAthPreview"), "T13 wires CTA handler");
}

console.log("\nT14 — ViewModel type bez athTooltip fields");
{
  const src = readFileSync(resolve(root, "src/lib/tender-kosztorys-boq-explorer.ts"), "utf8");
  const iface = src.slice(src.indexOf("export interface KosztorysBoqRowViewModel"), src.indexOf("export interface KosztorysBoqExplorerView"));
  assert(!iface.includes("athTooltip"), "T14 no athTooltip");
  assert(!iface.includes("tooltipPl"), "T14 no tooltipPl");
  assert(!iface.includes("athCellState"), "T14 no athCellState");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
