/**
 * #5C-5C F2 — legacy router/compat cleanup · zero legacy persist.
 * npx vite-node scripts/test-5c-5c-legacy-cleanup-f2.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import * as WorkCatalog from "../src/lib/work-catalog/index.ts";

const root = resolve(import.meta.dirname, "..");

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
  console.log(`PASS ${msg}`);
}

const REMOVED_SYMBOLS = [
  "saveLegacyCostCatalogRouted",
  "appendCostCatalogHistoryRouted",
  "canWriteLegacyCatalog",
  "saveWgdomCostCatalogStore",
  "getActiveCatalog",
  "resolveCatalogForUI",
  "isLegacyCatalog",
  "isWorkCatalog",
  "resolveCatalogVersion",
];

const routerSrc = read("src/lib/catalog-write-router.ts");
const storeSrc = read("src/lib/wgdom-cost-catalog-store.ts");
const compatSrc = read("src/lib/work-catalog/work-catalog-compat.ts");
const barrelSrc = read("src/lib/work-catalog/index.ts");
const tenderActiveSrc = read("src/lib/tender-active-catalog.ts");
const cloudSyncSrc = read("src/lib/cloud-sync.ts");
const bootstrapSrc = read("src/lib/work-catalog-bootstrap.ts");

for (const sym of REMOVED_SYMBOLS) {
  assert(!routerSrc.includes(`export function ${sym}`), `T1 router has no export ${sym}`);
  assert(!storeSrc.includes(`export function ${sym}`), `T1 store has no export ${sym}`);
  assert(!compatSrc.includes(`export function ${sym}`), `T1 compat has no export ${sym}`);
}

assert(routerSrc.includes("saveWorkCatalogRouted"), "T2 saveWorkCatalogRouted LIVE in router");
assert(routerSrc.includes("canWriteWorkCatalog"), "T2 canWriteWorkCatalog LIVE in router");
assert(!routerSrc.includes("saveLegacyCostCatalogRouted"), "T2 no saveLegacyCostCatalogRouted in router");
assert(!routerSrc.includes("appendCostCatalogHistoryRouted"), "T2 no appendCostCatalogHistoryRouted in router");

assert(compatSrc.includes("resolveCatalogForEngine"), "T3 resolveCatalogForEngine LIVE in compat");
assert(!compatSrc.includes("resolveCatalogForUI"), "T3 no resolveCatalogForUI in compat");
assert(tenderActiveSrc.includes("resolveCatalogForEngine"), "T3 tender-active-catalog uses resolveCatalogForEngine");

assert(!storeSrc.includes("persistKey"), "T4 store has no persistKey (zero legacy cloud write)");
assert(!storeSrc.includes("saveWgdomCostCatalogStore"), "T4 no saveWgdomCostCatalogStore");
assert(storeSrc.includes("loadWgdomCostCatalogStoreLocal"), "T4 loadWgdomCostCatalogStoreLocal KEPT");

const BARREL_REMOVED = [
  "saveLegacyCostCatalogRouted",
  "appendCostCatalogHistoryRouted",
  "canWriteLegacyCatalog",
  "resolveCatalogForUI",
  "isLegacyCatalog",
];
for (const sym of BARREL_REMOVED) {
  assert(!barrelSrc.includes(sym), `T5 barrel has no ${sym}`);
}
assert(WorkCatalog.saveWorkCatalogRouted !== undefined, "T5 barrel exports saveWorkCatalogRouted");
assert(WorkCatalog.resolveCatalogForEngine !== undefined, "T5 barrel exports resolveCatalogForEngine");
assert(WorkCatalog.saveLegacyCostCatalogRouted === undefined, "T5 barrel missing saveLegacyCostCatalogRouted");

function walkTs(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkTs(full, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const srcFiles = walkTs(resolve(root, "src"));
const forbiddenInSrc = [
  "saveLegacyCostCatalogRouted",
  "appendCostCatalogHistoryRouted",
  "saveWgdomCostCatalogStore",
  "resolveCatalogForUI",
];
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  const rel = file.replace(root + "\\", "").replace(root + "/", "");
  for (const sym of forbiddenInSrc) {
    assert(!text.includes(sym), `T6 ${rel} has no ${sym}`);
  }
}

assert(!bootstrapSrc.includes("finalizePayrollBundleMerge"), "T7 #CORE-013 bootstrap no payroll merge");
assert(!cloudSyncSrc.includes("payroll-week-roster-bundle"), "T7 #CORE-013 cloud-sync scope unchanged");
assert(bootstrapSrc.includes("loadWgdomCostCatalogStoreLocal"), "T7 bootstrap ONE-SHOT read KEPT");
assert(cloudSyncSrc.includes("finalizeWorkCatalogAfterDeferredMerge"), "T7 cloud-sync deferred bootstrap KEPT");

console.log(`\n#5C-5C F2 legacy-cleanup: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
