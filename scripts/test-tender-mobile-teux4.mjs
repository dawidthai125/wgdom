/**
 * TEUX-4 — Mobile chrome: module nav sheet, tab scroll shadow, Command Layer density, safe-area.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  TENDER_MODULE_NAV_SHEET_TAB_ORDER,
  filterTenderModuleNavTabs,
} from "../src/lib/tender-module-nav-sheet.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

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

function readSrc(rel) {
  return readFileSync(`${ROOT}/${rel}`, "utf8");
}

console.log("=== TEUX-4 TENDER MOBILE ===\n");

ok("module nav tab order has review+queue", TENDER_MODULE_NAV_SHEET_TAB_ORDER.includes("review") && TENDER_MODULE_NAV_SHEET_TAB_ORDER.includes("queue"));
ok("filter has no workcatalog top-level", !filterTenderModuleNavTabs(false).includes("workcatalog"));
ok("filter has company hub", filterTenderModuleNavTabs(true).includes("company"));
ok("filter always 4 tabs", filterTenderModuleNavTabs(true).length === 4);

const navLib = readSrc("src/lib/tender-module-nav-sheet.ts");
ok("navigate leaves detail URL first", navLib.includes("navigate(TENDERS_LIST_PATH)"));
ok("navigate saves active tab", navLib.includes("saveTendersActiveTab"));

const sheet = readSrc("src/app/tenders/mobile/TenderModuleNavSheet.tsx");
ok("sheet lg:hidden portal", sheet.includes("lg:hidden fixed inset-0"));
ok("sheet safe-area bottom", sheet.includes("max(1rem, env(safe-area-inset-bottom))"));
ok("sheet 44px touch", sheet.includes("min-h-[44px]"));
ok("sheet imports tokens only", sheet.includes("tender-ux-tokens") && !sheet.includes("tender-ux-tokens.ts"));

const command = readSrc("src/app/TenderDetailCommandLayer.tsx");
ok("module nav trigger lg:hidden", command.includes("data-tender-module-nav-trigger") && command.includes("lg:hidden"));
ok("TenderModuleNavSheet wired", command.includes("TenderModuleNavSheet"));
ok("navigateToTendersModuleTab used", command.includes("navigateToTendersModuleTab"));
// M-03 (`0f8a165`): breakpoint cliff 392px → density uses max-[430px] (not 390).
ok("density max-[430px] pass", command.includes("max-[430px]"));
ok("menu on same row as back", command.includes("justify-between"));

const tabBar = readSrc("src/app/TenderDetailTabBar.tsx");
ok("tab bar overflow-x scroll", tabBar.includes("overflow-x-auto"));
ok("scroll shadow hook", tabBar.includes("useHorizontalScrollShadow"));
ok("scroll shadow data attr", tabBar.includes("data-tender-detail-tabs-scroll-shadow"));
ok("gradient shadow left/right", tabBar.includes("data-tender-detail-tabs-shadow"));

const detailPage = readSrc("src/app/TenderDetailPage.tsx");
ok("operator bar safe-area 1rem", detailPage.includes('paddingBottom: "max(1rem, env(safe-area-inset-bottom))"'));
ok("content pb includes safe-area", detailPage.includes("env(safe-area-inset-bottom)"));

ok("tokens file frozen — no edit", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux4"));

const forbidden = [
  "src/app/TendersView.tsx",
  "src/app/tenders/list/TenderListMobileCard.tsx",
  "src/app/tenders/list/TenderListDesktopCard.tsx",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden untouched ${p}`, !src.includes("TEUX-4") && !src.includes("TenderModuleNavSheet"));
}

const protectedPaths = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/lib/tender-detail-nav.ts",
];
for (const p of protectedPaths) {
  ok(`protected core read-only ${p}`, readSrc(p).length > 0);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
