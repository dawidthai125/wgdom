/**
 * WC-P2.1 — nawigacja Biblioteki Robót w Przetargach + ACL + redirect + embedded layout.
 * Run: npx vite-node scripts/test-work-catalog-nav-p2.1.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  adminCanViewWorkCatalog,
  adminCanViewTendersTab,
} from "../src/lib/admin-auth.ts";
import {
  defaultAppSettings,
  mergeAppSettings,
} from "../src/lib/app-settings.ts";
import {
  isTendersTabId,
  openTendersAtWorkCatalogTab,
  sanitizeTendersActiveTab,
} from "../src/lib/tenders-module-nav.ts";
import { TENDERS_MODULE_LABELS } from "../src/lib/tenders-module-labels.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

console.log("=== WORK CATALOG NAV P2.1 ===\n");

// --- ACL ---
const base = defaultAppSettings();
assert("super_admin always", adminCanViewWorkCatalog("super_admin", base) === true);
assert("admin default off", adminCanViewWorkCatalog("admin", base) === false);
assert(
  "admin flag on",
  adminCanViewWorkCatalog("admin", { ...base, workCatalogForAdminEnabled: true }) === true,
);
assert("moderator hidden", adminCanViewWorkCatalog("moderator", base) === false);
assert(
  "moderator flag ignored",
  adminCanViewWorkCatalog("moderator", { ...base, workCatalogForAdminEnabled: true }) === false,
);
assert("inspector hidden", adminCanViewWorkCatalog("inspector", base) === false);

// --- AppSettings merge ---
const merged = mergeAppSettings({ workCatalogForAdminEnabled: true }, base);
assert("merge workCatalogForAdminEnabled remote true", merged.workCatalogForAdminEnabled === true);
const mergedOff = mergeAppSettings({ workCatalogForAdminEnabled: false }, {
  ...base,
  workCatalogForAdminEnabled: true,
});
assert("merge workCatalogForAdminEnabled remote false wins", mergedOff.workCatalogForAdminEnabled === false);

// --- Tab sanitize ---
assert("sanitize workcatalog super", sanitizeTendersActiveTab("workcatalog", true) === "workcatalog");
assert("sanitize workcatalog denied", sanitizeTendersActiveTab("workcatalog", false) === "list");
assert("sanitize list", sanitizeTendersActiveTab("list", false) === "list");

// --- Tab id ---
assert("isTendersTabId workcatalog", isTendersTabId("workcatalog") === true);
assert("isTendersTabId invalid", isTendersTabId("bogus") === false);
assert("label workcatalog", TENDERS_MODULE_LABELS.tabs.workcatalog === "Biblioteka robót");

// --- openTendersAtWorkCatalogTab ---
const key = "kw-tenders-active-tab-v1";
const ls = new Map();
const mockStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => { ls.set(k, v); },
  removeItem: (k) => { ls.delete(k); },
};
const prevLs = globalThis.localStorage;
globalThis.localStorage = mockStorage;
try {
  openTendersAtWorkCatalogTab();
  assert("openTendersAtWorkCatalogTab LS", mockStorage.getItem(key) === "workcatalog");
} finally {
  globalThis.localStorage = prevLs;
}

// --- Static navigation wiring ---
const adminNav = readSrc("src/app/admin/admin-nav.ts");
assert("sidebar no workcatalog nav item", !adminNav.includes('key: "workcatalog"'));
assert("View keeps legacy workcatalog type", adminNav.includes('"workcatalog"'));

const router = readSrc("src/app/admin/AdminViewRouter.tsx");
assert("router no top-level workcatalog route", !router.includes('view === "workcatalog"'));
assert("router passes canViewWorkCatalog", router.includes("canViewWorkCatalog"));

const tendersModule = readSrc("src/app/tenders/TendersModule.tsx");
assert("TendersModule workcatalog tab", tendersModule.includes('"workcatalog"'));
assert("TendersWorkCatalogTab import", tendersModule.includes("TendersWorkCatalogTab"));

const workCatalogTab = readSrc("src/app/tenders/tabs/TendersWorkCatalogTab.tsx");
assert("embedded WorkCatalogView", workCatalogTab.includes("embedded"));

const workCatalogView = readSrc("src/app/work-catalog/WorkCatalogView.tsx");
assert("embedded prop", workCatalogView.includes("embedded"));
assert("single scroll container", (workCatalogView.match(/overflow-y-auto/g) ?? []).length === 1);
assert("embedded no duplicate h1", workCatalogView.includes("embedded ? ("));

const appTsx = readSrc("src/app/App.tsx");
assert("legacy useLayoutEffect redirect", appTsx.includes("useLayoutEffect") && appTsx.includes("openTendersAtWorkCatalogTab"));

// tenders + work catalog independence
assert(
  "tenders staff separate from work catalog",
  adminCanViewTendersTab("admin", { tendersTabForStaffEnabled: true })
    && !adminCanViewWorkCatalog("admin", { tendersTabForStaffEnabled: true }),
);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
