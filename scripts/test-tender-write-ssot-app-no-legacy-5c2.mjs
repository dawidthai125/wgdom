/**
 * Bundle #5C-2 — AC-11 gate: zero legacy catalog write w src/app/**.
 * AC-13: czysta instalacja (brak catalogWriteMode w LS) → work_only.
 * npx vite-node scripts/test-tender-write-ssot-app-no-legacy-5c2.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  APP_SETTINGS_KEY,
  defaultAppSettings,
  loadAppSettingsLocal,
} from "../src/lib/app-settings.ts";

const root = resolve(import.meta.dirname, "..");
const appDir = join(root, "src", "app");

const FORBIDDEN_PATTERNS = [
  "saveLegacyCostCatalogRouted",
  "appendCostCatalogHistoryRouted",
  "saveWgdomCostCatalogStore",
  "updateCategoryPrimaryRates",
  "appendCostCatalogHistoryIfRatesChanged",
];

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return;
  }
  pass += 1;
}

function collectSourceFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      collectSourceFiles(path, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name)) acc.push(path);
  }
  return acc;
}

// AC-11 — static scan src/app/**
const appFiles = collectSourceFiles(appDir);
const violations = [];
for (const file of appFiles) {
  const content = readFileSync(file, "utf8");
  const rel = file.slice(root.length + 1).replace(/\\/g, "/");
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      violations.push({ file: rel, pattern });
    }
  }
}
assert(violations.length === 0, `AC-11 zero legacy write patterns in src/app (${violations.length} found)`);
if (violations.length > 0) {
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.pattern}`);
  }
}

// AC-13 — clean install defaults
assertEq(defaultAppSettings().catalogWriteMode, "work_only", "AC-13 defaultAppSettings work_only");

storage.clear();
assertEq(loadAppSettingsLocal().catalogWriteMode, "work_only", "AC-13 empty LS → work_only");

localStorage.setItem(
  APP_SETTINGS_KEY,
  JSON.stringify({
    athPreviewEnabled: true,
    tendersTabForStaffEnabled: false,
  }),
);
assertEq(
  loadAppSettingsLocal().catalogWriteMode,
  "work_only",
  "AC-13 LS without catalogWriteMode field → work_only",
);

localStorage.setItem(
  APP_SETTINGS_KEY,
  JSON.stringify({ ...defaultAppSettings(), catalogWriteMode: "bogus" }),
);
assertEq(
  loadAppSettingsLocal().catalogWriteMode,
  "split",
  "AC-13 corrupt catalogWriteMode → split fallback",
);

console.log(`\nWRITE-SSOT-APP-NO-LEGACY-5C2: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
