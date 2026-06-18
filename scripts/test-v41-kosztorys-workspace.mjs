/**
 * V4.1.1 — Kosztorys workspace display filter (T01–T05).
 * npx vite-node scripts/test-v41-kosztorys-workspace.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKosztorysV4Display,
  filterKosztorysDisplayRows,
  isFormalKosztorysSheetLabel,
  isKosztorysDisplayRow,
  KOSZTORYS_V4_EMPTY_FORMAL,
  KOSZTORYS_V4_EMPTY_NO_POSITIONS,
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
    bzpDocuments: [],
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

console.log("\n=== V4.1.1 Kosztorys Workspace ===\n");

console.log("T01 — Formularz oferty → brak renderu tabeli");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "zalacznik.xlsx",
    title: "Formularz oferty",
    rowCount: 5,
    rows: formalOfferRows(),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(isFormalKosztorysSheetLabel("Formularz oferty"), "sheet label formal");
  assert(display.rows.length === 0, "T01 no table rows");
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

console.log("\nT03 — ATH rows → render tabeli");
{
  const item = baseItem({
    ok: true,
    sourceFilename: "kosztorys.ath",
    title: "Kosztorys inwestorski",
    rowCount: 2,
    rows: athRows(),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.rows.length === 2, "T03 two ATH rows");
  assert(display.source === "rows", "T03 source rows");
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
  assert(display.rows.length === 0, "T04 zero rows");
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
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  });
  const display = buildKosztorysV4Display(item);
  assert(display.emptyMessage === KOSZTORYS_V4_EMPTY_FORMAL, "T05 formal message");
  assert(display.emptyMessage.includes("Dokumenty"), "T05 mentions Dokumenty");
}

console.log("\nUI wiring");
{
  const wsSrc = readFileSync(resolve(root, "src/app/TenderKosztorysWorkspace.tsx"), "utf8");
  assert(wsSrc.includes("buildKosztorysV4Display"), "workspace uses V4 display SSOT");
  assert(!wsSrc.includes("k?.rows ?? []"), "workspace no raw rows fallback");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
