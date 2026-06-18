/**
 * V4.1.1 + P0 catalogQuantities SSOT — Kosztorys workspace (T01–T09).
 * npx vite-node scripts/test-v41-kosztorys-workspace.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_QUANTITIES_CAP } from "../src/lib/tenders-bzp-brief.ts";
import {
  buildKosztorysV4Display,
  buildKosztorysV4Stats,
  buildKosztorysAthVisibilityHint,
  filterKosztorysDisplayRows,
  isFormalKosztorysSheetLabel,
  isKosztorysDisplayRow,
  KOSZTORYS_V4_EMPTY_FORMAL,
  KOSZTORYS_V4_EMPTY_NO_POSITIONS,
  resolveKosztorysV4CatalogLines,
} from "../src/lib/tender-detail-v4-display.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function baseItem(kosztorys) {
  return {
    id: "t-k41",
    tenderId: "BZP-K41",
    title: "Test kosztorys V4.1.1",
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [{ index: 1, filename: "przedmiar.xlsx", downloadUrl: "https://example.com/p.xlsx" }],
    tenderDossier: kosztorys ? { kosztorys, brief: null } : null,
  };
}

function formalOfferRows() {
  return [
    { lp: "1", description: "Formularz oferty", unit: "", quantity: "", unitPrice: "", total: "" },
    { lp: "2", description: "Wykonawca", unit: "", quantity: "", unitPrice: "", total: "" },
    { lp: "3", description: "KRS", unit: "", quantity: "", unitPrice: "", total: "" },
    { lp: "4", description: "REGON", unit: "", quantity: "", unitPrice: "", total: "" },
    { lp: "5", description: "CEIDG", unit: "", quantity: "", unitPrice: "", total: "" },
  ];
}

function athRows() {
  return [
    { lp: "1", description: "Roboty ziemne — wykop", unit: "m3", quantity: "120", unitPrice: "45,00", total: "5400,00" },
    { lp: "2", description: "Kanalizacja deszczowa KNR 2-02-01", unit: "mb", quantity: "85", unitPrice: "320,00", total: "27200,00" },
  ];
}

function catalogFromAthRows(rows = athRows()) {
  return rows.map((r) => ({
    lp: r.lp,
    description: r.description,
    unit: r.unit,
    quantity: r.quantity,
  }));
}

function makeCatalogN(n) {
  return Array.from({ length: n }, (_, i) => ({
    lp: String(i + 1),
    description: `Pozycja robót ${i + 1} KNR 2-02-01`,
    unit: "m2",
    quantity: String((i + 1) * 2),
  }));
}

console.log("\n=== V4 Kosztorys Workspace (catalogQuantities SSOT) ===\n");

console.log("T01 — Formularz oferty → brak renderu tabeli");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "zalacznik.xlsx",
    title: "Formularz oferty",
    rowCount: 5,
    rows: formalOfferRows(),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(isFormalKosztorysSheetLabel("Formularz oferty"), "sheet label formal");
  assert(display.catalogRows.length === 0, "T01 no table rows");
  assert(display.skippedFormalSheet, "T01 skipped formal sheet");
  assert(display.emptyState === "formal_document", "T01 formal empty state");
}

console.log("\nT02 — KRS/REGON → brak renderu tabeli");
{
  const filtered = filterKosztorysDisplayRows(formalOfferRows());
  assert(filtered.length === 0, "T02 filtered rows empty");
  assert(!isKosztorysDisplayRow({ lp: "", description: "KRS", unit: "", quantity: "", unitPrice: "", total: "" }), "T02 KRS not display row");
  assert(!isKosztorysDisplayRow({ lp: "", description: "REGON", unit: "", quantity: "", unitPrice: "", total: "" }), "T02 REGON not display row");
}

console.log("\nT03 — catalogQuantities ATH → render tabeli");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "kosztorys.ath",
    sourceDocumentIndex: 1,
    title: "Kosztorys inwestorski",
    rowCount: 2,
    rows: athRows(),
    catalogQuantities: catalogFromAthRows(),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.catalogRows.length === 2, "T03 two catalog rows");
  assert(display.source === "catalog", "T03 source catalog");
  assert(display.emptyState === null, "T03 no empty state");
}

console.log("\nT04 — 0 pozycji → poprawny empty state");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "kosztorys.ath",
    title: "Kosztorys",
    rowCount: 0,
    rows: [],
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.catalogRows.length === 0, "T04 zero rows");
  assert(display.emptyMessage === KOSZTORYS_V4_EMPTY_NO_POSITIONS, "T04 no positions message");
}

console.log("\nT05 — Dokument formalny → komunikat o Dokumentach");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "formularz_oferty.xlsx",
    title: "Formularz oferty",
    rowCount: 3,
    rows: formalOfferRows().slice(0, 3),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.emptyMessage === KOSZTORYS_V4_EMPTY_FORMAL, "T05 formal message");
  assert(display.emptyMessage.includes("Dokumenty"), "T05 mentions Dokumenty");
}

console.log("\nT06 — catalogQuantities = 250 → tabela 250 pozycji");
{
  const catalog = makeCatalogN(250);
  const item = baseItem({
    ok: true,
    sourceFilename: "przedmiar.xlsx",
    sourceDocumentIndex: 1,
    rowCount: 250,
    rows: [],
    catalogQuantities: catalog,
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const lines = resolveKosztorysV4CatalogLines(item);
  const display = buildKosztorysV4Display(item);
  assert(lines.length === 250, "T06 resolve 250 catalog lines");
  assert(display.catalogRows.length === 250, "T06 display 250 rows");
  assert(display.source === "catalog", "T06 source catalog");
  assert(CATALOG_QUANTITIES_CAP === 500, "T06 cap is 500");
}

console.log("\nT07 — rows=40, catalogQuantities=180 → tabela używa catalog");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "przedmiar.xlsx",
    sourceDocumentIndex: 1,
    rowCount: 40,
    rows: makeCatalogN(40).map((c) => ({
      ...c,
      unitPrice: "",
      total: "",
    })),
    catalogQuantities: makeCatalogN(180),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.catalogRows.length === 180, "T07 uses catalog 180 not rows 40");
  assert(display.source === "catalog", "T07 source catalog");
}

console.log("\nT08 — catalogQuantities = 0 → empty state");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "przedmiar.xlsx",
    rowCount: 12,
    rows: athRows(),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.catalogRows.length === 0 || display.source === "rows_fallback", "T08 no catalog primary");
  if (display.catalogRows.length === 0) {
    assert(display.emptyMessage != null, "T08 empty message when no fallback");
  }
}

console.log("\nT09 — Pełny podgląd ATH CTA");
{
  const wsSrc = readFileSync(resolve(root, "src/app/TenderKosztorysWorkspace.tsx"), "utf8");
  assert(wsSrc.includes("buildKosztorysV4Display"), "workspace uses V4 display SSOT");
  assert(wsSrc.includes("catalogRows"), "workspace uses catalogRows");
  assert(!wsSrc.includes("k?.rows ?? []"), "workspace no raw rows primary");
  assert(wsSrc.includes("Pełny podgląd ATH"), "T09 CTA label");
  assert(wsSrc.includes("JobFilePreviewModal"), "T09 reuses JobFilePreviewModal");
  assert(wsSrc.includes("resolveAthPreviewItem"), "T09 ATH quick access resolve");
  assert(wsSrc.includes("data-kosztorys-full-preview-cta"), "T09 CTA marker");
}

console.log("\nT10 — KPI partial ATH visibility (legacy snapshot)");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "kosztorys.ath",
    sourceDocumentIndex: 1,
    rowCount: 302,
    rows: [],
    catalogQuantities: makeCatalogN(250),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const stats = buildKosztorysV4Stats(item);
  assert(stats.athPositionsDisplay === "250 / 302", "T10 KPI shows shown/total");
  const hint = buildKosztorysAthVisibilityHint(item);
  assert(hint?.includes("250 z 302"), "T10 visibility hint");
  assert(hint?.includes("Pełny podgląd ATH"), "T10 hint mentions full preview");
}

console.log("\nT11 — buildCatalogQuantitiesFromPreview filter before slice");
{
  const { buildCatalogQuantitiesFromPreview } = await import("../src/lib/tenders-bzp-brief.ts");
  const rows = [
    ...makeCatalogN(5).map((r) => ({ ...r, code: "", unitPrice: "", total: "" })),
    { lp: "6", description: "Formularz oferty", unit: "", quantity: "", code: "", unitPrice: "", total: "" },
    ...makeCatalogN(3).map((r, i) => ({
      ...r,
      lp: String(7 + i),
      description: `Pozycja po szumie ${i + 1} KNR 2-02-01`,
      code: "",
      unitPrice: "",
      total: "",
    })),
  ];
  const built = buildCatalogQuantitiesFromPreview({ ok: true, format: "ath", rows, warnings: [] });
  assert(built.length === 8, "T11 noise filtered, valid rows after noise kept");
}

console.log("\nT12 — V4.2 Kosztorys PRO dashboard");
{
  const { buildKosztorysProDashboard, lineMatchesConstructionFilter } = await import("../src/lib/tender-kosztorys-pro-dashboard.ts");
  const catalog = makeCatalogN(10);
  catalog[0] = { lp: "1", description: "Malowanie ścian wewnętrznych KNR 2-02-01", unit: "m2", quantity: "120" };
  catalog[1] = { lp: "2", description: "Instalacja elektryczna — przewód YDY", unit: "m", quantity: "80" };
  const item = baseItem({
    ok: true,
    sourceFilename: "kosztorys.ath",
    sourceDocumentIndex: 1,
    rowCount: 10,
    rows: [],
    catalogQuantities: catalog,
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const pro = buildKosztorysProDashboard(item);
  assert(pro.athPositions === 10, "T12 ath positions");
  assert(pro.coverageDisplay.endsWith("%"), "T12 coverage percent");
  assert(pro.statusLabel === "GOTOWE DO OFERTY" || pro.statusLabel === "WYMAGA WYCENY", "T12 status");
  assert(lineMatchesConstructionFilter("Malowanie ścian", "wykończeniowe"), "T12 filter wykończeniowe");
  assert(!lineMatchesConstructionFilter("Malowanie ścian", "drogowe"), "T12 filter excludes drogowe");
  assert(!lineMatchesConstructionFilter("Zapewnienie siedlisk nietoperzy", "elektryczne"), "T12 elektryczne excludes bats");
  assert(lineMatchesConstructionFilter("Wciąganie przewodu YDYżo 5x6 do rur", "elektryczne"), "T12 elektryczne YDY");
}

console.log("\nT14 — V4.2A UX polish");
{
  const {
    buildKosztorysProAssessment,
    formatDominantScopeParagraph,
    kosztorysFilterEmptyMessage,
    lineMatchesConstructionFilter,
  } = await import("../src/lib/tender-kosztorys-pro-dashboard.ts");

  const inneScope = {
    primaryCategory: "Inne",
    primaryCategoryId: "inne",
    secondaryCategories: [],
    categoryBreakdown: [
      { categoryId: "inne", category: "Inne", percentage: 90 },
      { categoryId: "elektryczne", category: "Elektryczne", percentage: 6 },
      { categoryId: "dachowe", category: "Dachowe", percentage: 4 },
    ],
    confidence: 0.9,
    matchedKeywords: [],
    dominantScopeLabel: "Inne",
    sourcesUsed: ["catalog_quantities"],
  };

  const dominant = formatDominantScopeParagraph(inneScope, "Remont budynku wielorodzinnego");
  assert(dominant != null, "T14 dominant line exists");
  assert(!dominant.includes("inne"), "T14 no Dominują inne");
  assert(dominant.includes("elektryczne") || dominant.includes("Remont"), "T14 fallback top3 or scope");

  const assessment = buildKosztorysProAssessment({
    scope: inneScope,
    scopeDescription: "Remont budynku",
    fit: null,
    coveragePct: 58,
    priced: 10,
    unpriced: 5,
    statusLabel: "WYMAGA WYCENY",
    marketHint: null,
  });
  const allText = [assessment?.headline, ...(assessment?.paragraphs ?? [])].join(" ");
  assert(!allText.toLowerCase().includes("dominują inne"), "T14 assessment no inne");

  assert(kosztorysFilterEmptyMessage("sanitarne") === "Nie wykryto pozycji sanitarnych.", "T14 sanitarne empty msg");
  assert(!lineMatchesConstructionFilter("Wykucie bruzd w ścianach wykańczanych tynkiem", "elektryczne"), "T14 bruzdy excluded");
}

console.log("\nT13 — V4.2 workspace PRO markers");
{
  const wsSrc = readFileSync(resolve(root, "src/app/TenderKosztorysWorkspace.tsx"), "utf8");
  const pageSrc = readFileSync(resolve(root, "src/app/TenderDetailPage.tsx"), "utf8");
  assert(wsSrc.includes("KOSZTORYS PRO"), "T13 pro section");
  assert(wsSrc.includes("data-kosztorys-pro-hero"), "T13 hero above fold");
  assert(wsSrc.includes("Największe pozycje kosztowe"), "T13 top section");
  assert(wsSrc.includes("Ocena kosztorysu"), "T13 assessment");
  assert(wsSrc.includes("Pobierz ATH"), "T13 download ath");
  assert(wsSrc.includes("data-kosztorys-category-filters"), "T13 filters");
  assert(wsSrc.includes("kosztorysFilterEmptyMessage"), "T13 filter empty message");
  assert(pageSrc.includes("compactKosztorysChrome"), "T13 compact kosztorys chrome");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
