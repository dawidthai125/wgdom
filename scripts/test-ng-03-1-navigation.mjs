/**
 * NG-03.1 — Navigation: 5 active tabs, retired URL redirect, Decyzja sub-tabs SSOT.
 * npx vite-node scripts/test-ng-03-1-navigation.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DECYZJA_V4_SUB_TAB_LABELS,
  DECYZJA_V4_SUB_TAB_ORDER,
  TENDER_DETAIL_V4_ACTIVE_TAB_ORDER,
  TENDER_DETAIL_V4_RETIRED_TABS,
  buildTenderDetailPath,
  isTenderDetailV4ActiveTab,
  isTenderDetailV4RetiredTab,
  parseTenderDetailPath,
  resolveRetiredV4TabRedirect,
} from "../src/lib/tender-detail-routes-v4.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const TID = "ng03-tender-id";

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

console.log("=== NG-03.1 NAVIGATION ===\n");

console.log("1. Active tab order (5)");
ok("active count === 5", TENDER_DETAIL_V4_ACTIVE_TAB_ORDER.length === 5);
ok(
  "no retired in active",
  TENDER_DETAIL_V4_ACTIVE_TAB_ORDER.every((t) => !TENDER_DETAIL_V4_RETIRED_TABS.has(t)),
);
ok("przetarg first", TENDER_DETAIL_V4_ACTIVE_TAB_ORDER[0] === "przetarg");
ok("decyzja last active", TENDER_DETAIL_V4_ACTIVE_TAB_ORDER[4] === "decyzja");

console.log("\n2. Retired tabs");
ok("strategia retired", isTenderDetailV4RetiredTab("strategia"));
ok("materialy retired", isTenderDetailV4RetiredTab("materialy"));
ok("przetarg not retired", !isTenderDetailV4RetiredTab("przetarg"));
ok(
  "redirect strategia → przetarg",
  resolveRetiredV4TabRedirect(TID, "strategia") === `/przetargi/${TID}/przetarg`,
);
ok(
  "redirect materialy → przetarg",
  resolveRetiredV4TabRedirect(TID, "materialy") === `/przetargi/${TID}/przetarg`,
);
ok("active tab no redirect", resolveRetiredV4TabRedirect(TID, "ceny") === null);

console.log("\n3. Legacy URL parse (no 404)");
ok(
  "parse strategia slug",
  parseTenderDetailPath(`/przetargi/${TID}/strategia`)?.tab === "strategia",
);
ok(
  "parse materialy slug",
  parseTenderDetailPath(`/przetargi/${TID}/materialy`)?.tab === "materialy",
);
ok("przetarg is active", isTenderDetailV4ActiveTab("dokumenty"));

console.log("\n4. Decyzja sub-tab labels");
ok("sub-tab count === 3", DECYZJA_V4_SUB_TAB_ORDER.length === 3);
ok("overview → Przegląd", DECYZJA_V4_SUB_TAB_LABELS.overview === "Przegląd");
ok("qualification → Kwalifikacja", DECYZJA_V4_SUB_TAB_LABELS.qualification === "Kwalifikacja");
ok("offer → Oferta", DECYZJA_V4_SUB_TAB_LABELS.offer === "Oferta");
ok(
  "qualification path unchanged",
  buildTenderDetailPath(TID, "decyzja", { decyzjaWorkspace: "qualification" })
    === `/przetargi/${TID}/decyzja?ws=qualification`,
);

console.log("\n5. UI wiring");
const tabBar = readFileSync(resolve(root, "src/app/TenderDetailTabBar.tsx"), "utf8");
const subBar = readFileSync(resolve(root, "src/app/TenderDecyzjaSubTabBar.tsx"), "utf8");
const cmd = readFileSync(resolve(root, "src/app/TenderDetailCommandLayer.tsx"), "utf8");
const page = readFileSync(resolve(root, "src/app/TenderDetailPage.tsx"), "utf8");
ok("TabBar uses ACTIVE_TAB_ORDER", tabBar.includes("TENDER_DETAIL_V4_ACTIVE_TAB_ORDER"));
ok("TabBar no wkrótce", !tabBar.includes("wkrótce"));
ok("SubTabBar marker", subBar.includes("data-tender-decyzja-subtabs"));
ok("CommandLayer mounts SubTabBar", cmd.includes("TenderDecyzjaSubTabBar"));
ok("Page retired redirect", page.includes("resolveRetiredV4TabRedirect"));
ok("Page no placeholder", !page.includes("TenderV4Placeholder"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
