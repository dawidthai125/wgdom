/**
 * TEUX-7a — Lista filtry: panel SSOT, FAB mobile, TenderUxChip, collapsible desktop.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

console.log("=== TEUX-7a TENDER LIST FILTERS ===\n");

const panel = readSrc("src/app/tenders/list/TenderListFiltersPanel.tsx");
ok("TenderListFiltersPanel exists", panel.includes("export function TenderListFiltersPanel"));
ok("panel uses TenderUxChip", panel.includes("TenderUxChip"));
ok("panel data attr", panel.includes("data-tender-list-filters-panel"));
ok("panel queue section", panel.includes('aria-label="Moja kolejka"'));
ok("panel client section", panel.includes('aria-label="Klienci"'));
ok("panel no queueChipClass", !panel.includes("queueChipClass"));
ok("panel no clientChipClass", !panel.includes("clientChipClass"));

const fab = readSrc("src/app/tenders/list/TenderListFilterFab.tsx");
ok("TenderListFilterFab exists", fab.includes("export function TenderListFilterFab"));
ok("FAB data attr", fab.includes("data-teux7a-filter-fab"));
ok("FAB lg:hidden", fab.includes("lg:hidden"));

const sheet = readSrc("src/app/tenders/list/TenderListFilterSheet.tsx");
ok("TenderListFilterSheet exists", sheet.includes("export function TenderListFilterSheet"));
ok("sheet composes panel", sheet.includes("TenderListFiltersPanel"));
ok("sheet dialog", sheet.includes('role="dialog"'));

const tendersView = readSrc("src/app/TendersView.tsx");
ok("TendersView imports panel", tendersView.includes("TenderListFiltersPanel"));
ok("TendersView imports FAB", tendersView.includes("TenderListFilterFab"));
ok("TendersView imports sheet", tendersView.includes("TenderListFilterSheet"));
ok("Więcej filtrów label", tendersView.includes("Więcej filtrów"));
ok("more filters data attr", tendersView.includes("data-tenders-list-more-filters"));
ok("no Filtry zaawansowane", !tendersView.includes("Filtry zaawansowane"));
ok("no advanced toggle attr", !tendersView.includes("data-tenders-list-advanced-toggle"));
ok("no inline queueChipClass", !tendersView.includes("queueChipClass"));
ok("no inline clientChipClass", !tendersView.includes("clientChipClass"));
ok("no inline quickBarChipClass", !tendersView.includes("quickBarChipClass"));
ok("desktop collapsible hidden lg", tendersView.includes("hidden lg:block"));
ok("filters collapsed LS", tendersView.includes("loadTendersListFiltersCollapsed"));
ok("active filter count", tendersView.includes("countActiveListFilters"));

const listUx = readSrc("src/lib/tenders-list-ux.ts");
ok("filters collapsed key", listUx.includes("TENDERS_LIST_FILTERS_COLLAPSED_KEY"));
ok("countActiveListFilters export", listUx.includes("export function countActiveListFilters"));
ok("no filter logic change in SSOT", listUx.includes("export function filterTendersListPipelineItems"));

ok("tokens frozen", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux7a"));

const forbidden = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/lib/tender-workflow-primary-action.ts",
  "src/app/tenders/strategy/hooks/useTendersPipeline.ts",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/hooks/useTenderDocumentsBootstrap.ts",
  "src/app/App.tsx",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden untouched ${p}`, !src.includes("TEUX7A") && !src.includes("teux7a") && !src.includes("TenderListFilterFab"));
}

const emptyTeux6 = readSrc("src/app/tenders/design-system/TenderUxEmptyState.tsx");
ok("TEUX-6 empty untouched", !emptyTeux6.includes("TenderListFiltersPanel"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
