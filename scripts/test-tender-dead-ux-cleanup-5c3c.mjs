/**
 * #5C-3C — Dead UX cleanup gate.
 * Run: npx vite-node scripts/test-tender-dead-ux-cleanup-5c3c.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_UX_SOURCE_LABEL } from "../src/lib/tender-catalog-ux-labels.ts";
import { WGDOM_COST_REGION_LABELS } from "../src/lib/wgdom-cost-catalog.ts";

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

function countOccurrences(text, needle) {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = text.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

console.log("=== TENDER DEAD UX CLEANUP 5C-3C ===\n");

const priceBasePanel = readFileSync(join(appRoot, "TenderPriceBasePanel.tsx"), "utf8");
const priceBaseTab = readFileSync(join(appRoot, "tenders/tabs/TendersPriceBaseTab.tsx"), "utf8");
const calculator = readFileSync(join(root, "src/lib/tenders-bid-calculator.ts"), "utf8");
const guideView = readFileSync(join(appRoot, "GuideView.tsx"), "utf8");
const workCatalogView = readFileSync(join(appRoot, "work-catalog/WorkCatalogView.tsx"), "utf8");
const catalogModule = readFileSync(join(root, "src/lib/wgdom-cost-catalog.ts"), "utf8");

// T1 — no dead save CTA
assert("T1 no Zapisz bazę cen", !priceBasePanel.includes("Zapisz bazę cen"));

// T2 — single CTA to work catalog
assert(
  "T2 single Przejdź do CTA",
  countOccurrences(priceBasePanel, "Przejdź do") === 1
    && priceBasePanel.includes("Przejdź do {CATALOG_UX_WORK_CATALOG_TAB_LABEL}"),
);

// T3 — tab shell without redundant intro
assert("T3 no tab intro copy", !priceBaseTab.includes("Podgląd stawek kategorii"));

// T4 — app does not import legacy store for labels
const appFiles = walkTsFiles(appRoot);
const storeImports = appFiles.filter((file) => {
  const text = readFileSync(file, "utf8");
  return text.includes("wgdom-cost-catalog-store");
});
assert("T4 no app import wgdom-cost-catalog-store", storeImports.length === 0);
if (storeImports.length > 0) {
  for (const file of storeImports) {
    console.log("  ", relative(root, file).replace(/\\/g, "/"));
  }
}

// T5 — region labels in neutral module
assert("T5 WGDOM_COST_REGION_LABELS in wgdom-cost-catalog", catalogModule.includes("WGDOM_COST_REGION_LABELS"));
assert("T5 region labels wroclaw", WGDOM_COST_REGION_LABELS.wroclaw === "Wrocław");
assert("T5 region labels dolnyslask", WGDOM_COST_REGION_LABELS.dolnyslask === "Dolny Śląsk");

// T6–T8 — calculator copy SSOT
assert("T6 calculator imports CATALOG_UX_SOURCE_LABEL", calculator.includes("CATALOG_UX_SOURCE_LABEL"));
assert("T7 calculator no katalog WGDOM", !calculator.includes("katalog WGDOM"));
assert("T8 calculator no Baza cen", !calculator.includes("Baza cen") && !calculator.includes("Bazą cen"));
assert("T8 calculator uses SSOT label", calculator.includes("${CATALOG_UX_SOURCE_LABEL}"));

// T9 — GuideView FAQ
assert("T9 GuideView no Bazy cen", !guideView.includes("Bazy cen"));
assert("T9 GuideView no pełnego cutoveru", !guideView.includes("pełnego cutoveru"));

// T10 — WorkCatalogView empty state
assert("T10 WorkCatalogView no Bazy cen", !workCatalogView.includes("Bazy cen"));
assert("T10 WorkCatalogView no PB-3", !workCatalogView.includes("PB-3"));

// T11 — forbidden legacy copy in src/app
const FORBIDDEN = ["katalog WGDOM", "bazę cen", "Bazy cen"];
const ALLOWLIST_FILES = new Set([
  relative(root, join(appRoot, "changelog-data.ts")).replace(/\\/g, "/"),
]);
let forbiddenHits = [];
for (const file of appFiles) {
  const rel = relative(root, file).replace(/\\/g, "/");
  if (ALLOWLIST_FILES.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) forbiddenHits.push(`${rel}: "${needle}"`);
  }
  if (text.includes("Baza cen") && !rel.includes("changelog-data")) {
    forbiddenHits.push(`${rel}: "Baza cen"`);
  }
}
assert("T11 no forbidden copy in src/app", forbiddenHits.length === 0);
if (forbiddenHits.length > 0) {
  for (const hit of forbiddenHits) console.log("  ", hit);
}

// T12 — preview SSOT intact
assert("T12 resolveActiveCatalogForTender in panel", priceBasePanel.includes("resolveActiveCatalogForTender"));
assert("T12 buildPriceBasePreviewRows in panel", priceBasePanel.includes("buildPriceBasePreviewRows"));
assert("T12 pricingCatalogRevision in panel", priceBasePanel.includes("pricingCatalogRevision"));

// T13 — no legacy catalog loader in app
const legacyLoaderHits = appFiles.filter((file) => {
  const text = readFileSync(file, "utf8");
  return text.includes("loadWgdomCostCatalogStore");
});
assert("T13 no loadWgdomCostCatalogStore in app", legacyLoaderHits.length === 0);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
