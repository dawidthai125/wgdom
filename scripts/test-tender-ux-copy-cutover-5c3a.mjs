/**
 * #5C-3A — UX copy & navigation cutover gate.
 * Run: npx vite-node scripts/test-tender-ux-copy-cutover-5c3a.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATALOG_UX_OVERRIDE_LABEL,
  CATALOG_UX_PRICING_SETTINGS_TAB_LABEL,
  CATALOG_UX_SOURCE_LABEL,
  CATALOG_UX_WORK_CATALOG_TAB_LABEL,
} from "../src/lib/tender-catalog-ux-labels.ts";
import { TENDERS_MODULE_LABELS } from "../src/lib/tenders-module-labels.ts";
import { getBidSourceLabel } from "../src/lib/tender-bid-quality.ts";
import {
  CATALOG_LINE_PRICE_SOURCE_BASE,
  CATALOG_LINE_PRICE_SOURCE_CATALOG,
  CATALOG_LINE_PRICE_SOURCE_OVERRIDE,
} from "../src/lib/tender-catalog-line-pricing.ts";
import { PRICE_BASE_SECTION_ID } from "../src/lib/tender-bid-ux.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appRoot = join(root, "src", "app");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function walkTsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if (/\.(tsx?)$/.test(name)) out.push(full);
  }
  return out;
}

console.log("=== TENDER UX COPY CUTOVER 5C-3A ===\n");

// --- SSOT exports ---
assert("CATALOG_UX_SOURCE_LABEL", CATALOG_UX_SOURCE_LABEL === "Biblioteka Robót");
assert("CATALOG_UX_WORK_CATALOG_TAB_LABEL", CATALOG_UX_WORK_CATALOG_TAB_LABEL === "Biblioteka Robót");
assert("CATALOG_UX_PRICING_SETTINGS_TAB_LABEL", CATALOG_UX_PRICING_SETTINGS_TAB_LABEL === "Ustawienia wyceny");
assert("CATALOG_UX_OVERRIDE_LABEL", CATALOG_UX_OVERRIDE_LABEL === "Override");

// --- Module labels wired to SSOT ---
assert("tabs.workcatalog", TENDERS_MODULE_LABELS.tabs.workcatalog === CATALOG_UX_WORK_CATALOG_TAB_LABEL);
assert("tabs.pricebase", TENDERS_MODULE_LABELS.tabs.pricebase === CATALOG_UX_PRICING_SETTINGS_TAB_LABEL);

// --- Lib display ---
assert("getBidSourceLabel catalog", getBidSourceLabel("catalog") === CATALOG_UX_SOURCE_LABEL);
assert("line source base", CATALOG_LINE_PRICE_SOURCE_BASE === CATALOG_UX_SOURCE_LABEL);
assert("line source catalog collapsed", CATALOG_LINE_PRICE_SOURCE_CATALOG === CATALOG_UX_SOURCE_LABEL);
assert("line source override", CATALOG_LINE_PRICE_SOURCE_OVERRIDE === CATALOG_UX_OVERRIDE_LABEL);
assert("PRICE_BASE_SECTION_ID stable", PRICE_BASE_SECTION_ID === "tender-price-base-section");

// --- Forbidden user-facing strings in src/app (exclude changelog history) ---
const FORBIDDEN = [
  "Katalog WGDOM",
  "Biblioteka robót",
  "Przejdź do Bazy cen",
  "Baza cen (fallback)",
];
const ALLOWLIST_FILES = new Set([
  relative(root, join(appRoot, "changelog-data.ts")).replace(/\\/g, "/"),
]);

const appFiles = walkTsFiles(appRoot);
let forbiddenHits = [];

for (const file of appFiles) {
  const rel = relative(root, file).replace(/\\/g, "/");
  if (ALLOWLIST_FILES.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) {
      forbiddenHits.push(`${rel}: "${needle}"`);
    }
  }
  // "Baza cen" as legacy pricing source — forbidden except nowhere in active UI
  if (text.includes("Baza cen") && !rel.includes("changelog-data")) {
    forbiddenHits.push(`${rel}: "Baza cen"`);
  }
}

assert("no forbidden copy in src/app", forbiddenHits.length === 0);
if (forbiddenHits.length > 0) {
  for (const hit of forbiddenHits) console.log("  ", hit);
}

// --- Navigation wiring ---
const bidPanel = readFileSync(join(appRoot, "TenderBidProposalPanel.tsx"), "utf8");
assert("openWorkCatalog → workcatalog", bidPanel.includes('setActiveTab("workcatalog")'));
assert("onOpenWorkCatalog prop", bidPanel.includes("onOpenWorkCatalog"));

const lineSection = readFileSync(join(appRoot, "TenderCatalogLinePricingSection.tsx"), "utf8");
assert("CTA Biblioteka Robót", lineSection.includes("Przejdź do {CATALOG_UX_WORK_CATALOG_TAB_LABEL}"));
assert("no onOpenPriceBase", !lineSection.includes("onOpenPriceBase"));

const appTsx = readFileSync(join(appRoot, "App.tsx"), "utf8");
assert("App uses TENDERS_MODULE_LABELS", appTsx.includes("TENDERS_MODULE_LABELS.tabs.workcatalog"));

// --- Preview SSOT (#5C-3B) ---
const priceBasePanel = readFileSync(join(appRoot, "TenderPriceBasePanel.tsx"), "utf8");
assert("no legacy catalog loader", !priceBasePanel.includes("loadWgdomCostCatalogStore"));
assert("resolveActiveCatalogForTender in panel", priceBasePanel.includes("resolveActiveCatalogForTender"));
assert("pricingCatalogRevision in panel", priceBasePanel.includes("pricingCatalogRevision"));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
