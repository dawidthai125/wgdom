/**
 * P1 — Odbiory WM Druk smoke (adres, zmienne, kompletność, ZIP nazwa).
 */
import { parseJobAddressParts, wmPrintZipBaseName } from "../src/lib/wm-print/address-vars.ts";
import { buildWmPrintVariableMap, formatWmPrintDate } from "../src/lib/wm-print/variables.ts";
import { computeWmPrintCompleteness } from "../src/lib/wm-print/completeness.ts";
import { seedWmPrintTemplatesIfEmpty } from "../src/lib/wm-print/default-templates.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("WM Print P1 smoke\n");

const parts = parseJobAddressParts("Gorlicka 26", "6");
assert(parts.street === "Gorlicka", "JOB_STREET = Gorlicka");
assert(parts.building === "26", "JOB_BUILDING = 26");
assert(parts.apartment === "6", "JOB_APARTMENT = 6");
assert(parts.fullAddress === "Gorlicka 26/6", "JOB_ADDRESS = Gorlicka 26/6");

const vars = buildWmPrintVariableMap(
  { address: "Gorlicka 26", flatNumber: "6" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
);
assert(vars.JOB_CITY === "Wrocław", "JOB_CITY = Wrocław");
assert(vars.DATE === "14.06.2026 r.", "DATE format PL");
assert(vars.YEAR === "2026", "YEAR = 2026");

assert(formatWmPrintDate(new Date("2026-06-14")) === "14.06.2026 r.", "formatWmPrintDate");

const zipBase = wmPrintZipBaseName("Gorlicka 26", "6");
assert(zipBase.includes("GORLICKA") && zipBase.includes("26") && zipBase.includes("6"), "ZIP base name");

const templates = seedWmPrintTemplatesIfEmpty([]);
assert(templates.length >= 10, "seed templates >= 10");
assert(templates.some((t) => t.name === "ZI" && t.type === "pdf_form"), "ZI pdf_form seed");

const job = {
  id: "j1",
  address: "Gorlicka 26",
  flatNumber: "6",
  client: "Wrocławskie Mieszkania",
  startDate: "",
  endDate: "",
  status: "in_progress",
  keysHandedOver: false,
  notes: "",
  documents: {},
  workEntries: [],
  materials: [],
  invoiceStatus: "pending",
  invoiceNumber: "",
  invoiceAmount: "",
  photos: [],
};

const comp = computeWmPrintCompleteness(job, templates, []);
assert(comp.percent < 100, "completeness < 100 without uploads");
assert(comp.missing.length > 0, "missing list non-empty");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
