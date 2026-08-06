/**
 * P0.1 — Menu → Przetargi → zawsze Przegląd (P0-OV-01).
 * npx vite-node scripts/test-ng-tenders-workspace-01-p01.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  openTendersAtReviewTab,
  TENDERS_CANONICAL_START_EVENT,
  TENDERS_TAB_STORAGE_KEY,
} from "../src/lib/tenders-module-nav.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: () => null,
  get length() { return mem.size; },
};

let pass = 0;
let fail = 0;
function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

const app = readFileSync(resolve(root, "src/app/App.tsx"), "utf8");
const provider = readFileSync(resolve(root, "src/app/tenders/context/TendersProvider.tsx"), "utf8");
const nav = readFileSync(resolve(root, "src/lib/tenders-module-nav.ts"), "utf8");

console.log("=== NG-TENDERS-WORKSPACE-01 P0.1 (P0-OV-01) ===\n");

ok("goToView tenders calls openTendersAtReviewTab", app.includes("if (v === \"tenders\")") && app.includes("openTendersAtReviewTab()"));
ok("goToView still navigates TENDERS_LIST_PATH", app.includes("navigate(TENDERS_LIST_PATH)"));
ok("canonical event exported", nav.includes("TENDERS_CANONICAL_START_EVENT"));
ok("Provider listens canonical event", provider.includes("TENDERS_CANONICAL_START_EVENT") && provider.includes("addEventListener"));
ok("Provider forces review state", provider.includes('setActiveTabState("review")'));

mem.set(TENDERS_TAB_STORAGE_KEY, "queue");
openTendersAtReviewTab();
ok("LS queue → review after openTendersAtReviewTab", mem.get(TENDERS_TAB_STORAGE_KEY) === "review");
ok("canonical event name stable", TENDERS_CANONICAL_START_EVENT === "wgdom-tenders-canonical-start");

// AC-RETURN / Firma / routing untouched markers
ok("AC-RETURN helpers still present", nav.includes("saveTendersReturnContext") && nav.includes("consumeTendersReturnContext"));
ok("no force review inside leaveTenderDetail", !readFileSync(resolve(root, "src/lib/tender-module-nav-sheet.ts"), "utf8").includes("openTendersAtReviewTab"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
