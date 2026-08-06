/**
 * P0 — TenderDetailPage tab SSOT z URL (parseTenderDetailPath).
 * npx vite-node scripts/test-p0-tender-detail-ssot-tab.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

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

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("=== P0 TENDER DETAIL TAB SSOT ===\n");

const page = read("src/app/TenderDetailPage.tsx");
const module = read("src/app/tenders/TendersModule.tsx");

console.log("1. TenderDetailPage — URL SSOT");
ok("parseTenderDetailPath import", page.includes("parseTenderDetailPath"));
ok("urlTab z parsedDetail", page.includes("const urlTab = parsedDetail?.tab"));
ok("activeTab pendingTab ?? urlTab", page.includes("const activeTab = pendingTab ?? urlTab"));
ok("location.pathname w useMemo parse", page.includes("[location.pathname]"));
ok("tab prop opcjonalny (fallback)", page.includes("tab?: TenderDetailV4TabId") || page.includes("tab: tabFallback"));
ok("pendingTab optimistic navigate", page.includes("setPendingTab(next)"));
ok("data-tender-tab używa activeTab", page.includes("data-tender-tab={activeTab}"));

console.log("\n2. decyzjaWorkspace — query SSOT");
ok("decyzjaWs z location.search", page.includes("location.search"));
ok("parseDecyzjaWorkspaceQuery", page.includes("parseDecyzjaWorkspaceQuery"));

console.log("\n3. TendersModule — detail shell");
ok("openTenderDetailFromModule", module.includes("openTenderDetailFromModule"));
ok("hideModuleChrome when v4Detail", module.includes("hideModuleChrome") && module.includes("v4Detail"));
ok("brak force setActiveTab list on detail", !module.includes('setActiveTab("list")'));
ok("brak tab={v4Detail.tab}", !module.includes("tab={v4Detail.tab}"));
ok("leaveTenderDetailToModule in DetailPage", page.includes("leaveTenderDetailToModule"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
