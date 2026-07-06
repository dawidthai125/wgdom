/**
 * #5C-5C F1 — orphan reconcile removal · dead exports · deprecated alias.
 * npx vite-node scripts/test-5c-5c-legacy-cleanup-f1.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as WorkCatalog from "../src/lib/work-catalog/index.ts";

const root = resolve(import.meta.dirname, "..");
const srcLib = resolve(root, "src/lib");

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

const REMOVED_FILES = [
  "src/lib/work-catalog-reconcile-bootstrap.ts",
  "src/lib/work-catalog-reconcile.ts",
  "scripts/test-pb-write-reconcile.mjs",
];

for (const rel of REMOVED_FILES) {
  assert(!existsSync(resolve(root, rel)), `T-removed ${rel} absent`);
}

const bootstrapSrc = read("src/lib/work-catalog-bootstrap.ts");
const barrelSrc = read("src/lib/work-catalog/index.ts");
const cloudSyncSrc = read("src/lib/cloud-sync.ts");

assert(
  !bootstrapSrc.includes("maybeExecuteWorkCatalogBootstrap"),
  "T1 bootstrap has no deprecated maybeExecuteWorkCatalogBootstrap alias",
);
assert(
  bootstrapSrc.includes("finalizeWorkCatalogAfterDeferredMerge"),
  "T2 bootstrap keeps finalizeWorkCatalogAfterDeferredMerge",
);
assert(
  bootstrapSrc.includes("loadWgdomCostCatalogStoreLocal"),
  "T3 bootstrap ONE-SHOT legacy read unchanged",
);
assert(
  !bootstrapSrc.includes("work-catalog-reconcile"),
  "T4 bootstrap has no reconcile imports",
);

const ORPHAN_EXPORTS = [
  "decideWorkCatalogReconcile",
  "reconcileLegacyRatesIntoWorkStore",
  "countWorkCatalogWorks",
  "reconcileLegacyToWorkCatalog",
  "maybeExecuteWorkCatalogReconcile",
];

for (const name of ORPHAN_EXPORTS) {
  assert(!barrelSrc.includes(name), `T5 barrel source has no ${name}`);
  assert(WorkCatalog[name] === undefined, `T5 barrel export missing ${name}`);
}

assert(
  cloudSyncSrc.includes("finalizeWorkCatalogAfterDeferredMerge"),
  "T6 cloud-sync still calls finalizeWorkCatalogAfterDeferredMerge",
);
assert(
  !cloudSyncSrc.includes("maybeExecuteWorkCatalogReconcile"),
  "T6 cloud-sync has no reconcile call",
);
assert(
  !cloudSyncSrc.includes("maybeExecuteWorkCatalogBootstrap"),
  "T6 cloud-sync has no deprecated bootstrap alias",
);

// #CORE-013 static boundary
assert(
  !bootstrapSrc.includes("payroll-week-roster-bundle"),
  "T7 #CORE-013 bootstrap has no payroll-week-roster-bundle",
);
assert(
  !bootstrapSrc.includes("finalizePayrollBundleMerge"),
  "T7 #CORE-013 bootstrap has no finalizePayrollBundleMerge",
);
assert(
  !cloudSyncSrc.includes("payroll-week-roster-bundle"),
  "T7 #CORE-013 cloud-sync diff scope — no new payroll imports in reconcile check",
);

// Repo-wide src scan for orphan symbols
const srcFiles = [
  "src/lib/work-catalog-bootstrap.ts",
  "src/lib/work-catalog/index.ts",
  "src/lib/cloud-sync.ts",
];
for (const rel of srcFiles) {
  const text = read(rel);
  assert(
    !text.includes("maybeExecuteWorkCatalogReconcile"),
    `T8 ${rel} has no maybeExecuteWorkCatalogReconcile`,
  );
  assert(
    !text.includes("work-catalog-reconcile-bootstrap"),
    `T8 ${rel} has no reconcile-bootstrap import`,
  );
}

assert(
  !existsSync(resolve(srcLib, "work-catalog-reconcile.ts")),
  "T9 reconcile.ts removed from src/lib",
);
assert(
  !existsSync(resolve(srcLib, "work-catalog-reconcile-bootstrap.ts")),
  "T9 reconcile-bootstrap.ts removed from src/lib",
);

console.log(`\n#5C-5C F1 legacy-cleanup: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
