/**
 * NG-TENDERS-WORKSPACE-01 P0 — nav v2 · migration · return context.
 * Run: npx vite-node scripts/test-ng-tenders-workspace-01-p0.mjs
 */
import assert from "node:assert/strict";
import {
  TENDERS_MODULE_LABELS,
} from "../src/lib/tenders-module-labels.ts";
import {
  TENDERS_TAB_IDS,
  consumeTendersReturnContext,
  defaultTendersReturnTab,
  isTendersTabId,
  migrateTendersTabId,
  openTendersAtReviewTab,
  openTendersAtStrategyTab,
  openTendersAtWorkCatalogTab,
  peekTendersReturnContext,
  resolveStoredTendersActiveTab,
  saveTendersActiveTab,
  saveTendersReturnContext,
  sanitizeTendersActiveTab,
  TENDERS_TAB_STORAGE_KEY,
  TENDERS_RETURN_CONTEXT_KEY,
  TENDERS_COMPANY_SECTION_KEY,
  TENDERS_CANONICAL_START_EVENT,
  loadTendersCompanySection,
} from "../src/lib/tenders-module-nav.ts";
import {
  TENDER_MODULE_NAV_SHEET_TAB_ORDER,
  filterTenderModuleNavTabs,
} from "../src/lib/tender-module-nav-sheet.ts";

const mem = new Map();
const session = new Map();

globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: () => null,
  get length() { return mem.size; },
};

globalThis.sessionStorage = {
  getItem: (k) => (session.has(k) ? session.get(k) : null),
  setItem: (k, v) => { session.set(k, String(v)); },
  removeItem: (k) => { session.delete(k); },
  clear: () => session.clear(),
  key: () => null,
  get length() { return session.size; },
};

function ok(name, cond) {
  assert.ok(cond, name);
  console.log(`  PASS ${name}`);
}

console.log("NG-TENDERS-WORKSPACE-01 P0");

ok("exactly 4 top-level tabs", TENDERS_TAB_IDS.length === 4);
ok("labels: Przegląd", TENDERS_MODULE_LABELS.tabs.review === "Przegląd");
ok("labels: Kolejka", TENDERS_MODULE_LABELS.tabs.queue === "Kolejka");
ok("labels: Mapa", TENDERS_MODULE_LABELS.tabs.map === "Mapa");
ok("labels: Firma", TENDERS_MODULE_LABELS.tabs.company === "Firma");
ok("no legacy strategy label", !("strategy" in TENDERS_MODULE_LABELS.tabs));
ok("no legacy list label", !("list" in TENDERS_MODULE_LABELS.tabs));

ok("migrate list→queue", migrateTendersTabId("list") === "queue");
ok("migrate strategy→review", migrateTendersTabId("strategy") === "review");
ok("migrate profile→company", migrateTendersTabId("profile") === "company");
ok("migrate workcatalog→company", migrateTendersTabId("workcatalog") === "company");
ok("migrate pricebase→company", migrateTendersTabId("pricebase") === "company");
ok("migrate settings→company", migrateTendersTabId("settings") === "company");
ok("migrate review stays", migrateTendersTabId("review") === "review");
ok("migrate bogus null", migrateTendersTabId("bogus") === null);

mem.clear();
mem.set(TENDERS_TAB_STORAGE_KEY, "strategy");
ok("resolveStored strategy→review", resolveStoredTendersActiveTab(true) === "review");
ok("LS rewritten to review", mem.get(TENDERS_TAB_STORAGE_KEY) === "review");

mem.clear();
mem.set(TENDERS_TAB_STORAGE_KEY, "list");
ok("resolveStored list→queue", resolveStoredTendersActiveTab(false) === "queue");

mem.clear();
ok("default empty → review", resolveStoredTendersActiveTab(true) === "review");

ok("isTendersTabId review", isTendersTabId("review"));
ok("isTendersTabId not list", !isTendersTabId("list"));
ok("sanitize queue", sanitizeTendersActiveTab("queue", false) === "queue");

openTendersAtStrategyTab();
ok("openTendersAtStrategyTab → review LS", mem.get(TENDERS_TAB_STORAGE_KEY) === "review");

openTendersAtReviewTab();
ok("openTendersAtReviewTab → review", mem.get(TENDERS_TAB_STORAGE_KEY) === "review");

ok(
  "canonical start event constant",
  typeof TENDERS_CANONICAL_START_EVENT === "string" && TENDERS_CANONICAL_START_EVENT.includes("canonical"),
);

session.clear();
openTendersAtWorkCatalogTab();
ok("workcatalog → company tab", mem.get(TENDERS_TAB_STORAGE_KEY) === "company");
ok("workcatalog → company section", loadTendersCompanySection() === "workcatalog");
ok("section key set", session.get(TENDERS_COMPANY_SECTION_KEY) === "workcatalog");

session.clear();
saveTendersReturnContext("review");
ok("peek return review", peekTendersReturnContext() === "review");
ok("consume return", consumeTendersReturnContext() === "review");
ok("consume clears", peekTendersReturnContext() === null);
ok("default return queue", defaultTendersReturnTab() === "queue");

ok("sheet order length 4", TENDER_MODULE_NAV_SHEET_TAB_ORDER.length === 4);
ok("sheet starts with review", TENDER_MODULE_NAV_SHEET_TAB_ORDER[0] === "review");
ok("filter always 4", filterTenderModuleNavTabs(false).length === 4);
ok("filter ACL on still 4", filterTenderModuleNavTabs(true).length === 4);
ok("filter has company not workcatalog top", filterTenderModuleNavTabs(true).includes("company") && !filterTenderModuleNavTabs(true).includes("workcatalog"));

console.log("\nALL PASS");
