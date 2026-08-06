/**
 * TEUX-6 — Empty states: TenderUxEmptyState + lista/mapa/dokumenty/kosztorys.
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

console.log("=== TEUX-6 TENDER EMPTY STATES ===\n");

const emptyState = readSrc("src/app/tenders/design-system/TenderUxEmptyState.tsx");
ok("TenderUxEmptyState exists", emptyState.includes("export function TenderUxEmptyState"));
ok("uses TEUX_FONT_TITLE", emptyState.includes("TEUX_FONT_TITLE"));
ok("uses TEUX_FONT_BODY", emptyState.includes("TEUX_FONT_BODY"));
ok("primary + secondary actions", emptyState.includes("primaryAction") && emptyState.includes("secondaryAction"));
ok("data-teux6-empty attr", emptyState.includes("data-teux6-empty"));

const tendersView = readSrc("src/app/TendersView.tsx");
ok("lista uses TenderUxEmptyState", tendersView.includes("TenderUxEmptyState"));
ok("lista 2-copy base", tendersView.includes('data-teux6-empty="lista-base"'));
ok("lista 2-copy filtry", tendersView.includes('data-teux6-empty="lista-filtry"'));
ok("lista CTA wyczyść filtry", tendersView.includes("Wyczyść filtry"));
ok("lista CTA odśwież BZP", tendersView.includes("Odśwież z BZP"));
ok("lista detection pipeline.items", tendersView.includes("pipeline.items.length === 0"));
ok("lista no old filter-only copy", !tendersView.includes("Brak przetargów dla wybranych filtrów"));

const mapPanel = readSrc("src/app/TendersMapPanel.tsx");
ok("mapa uses TenderUxEmptyState", mapPanel.includes("TenderUxEmptyState"));
ok("mapa title markers", mapPanel.includes("Brak markerów we Wrocławiu"));
ok("mapa CTA prop", mapPanel.includes("onGoToList"));

const mapTab = readSrc("src/app/tenders/tabs/TendersMapTab.tsx");
ok("map tab wires onGoToList", mapTab.includes('setActiveTab("queue")'));

const attachPanel = readSrc("src/app/TenderAttachmentsPanel.tsx");
ok("platform empty uses TenderUxEmptyState", attachPanel.includes("TenderUxEmptyState"));
ok("platform preserves early return", attachPanel.includes('missingReason === "not_fetched_yet"'));
ok("platform title", attachPanel.includes('title="Brak dokumentów"'));
ok("platform search CTA", attachPanel.includes("Wyszukaj zewnętrzne"));
ok("platform proceeding link preserved", attachPanel.includes("proceedingUrl"));

const kosztorys = readSrc("src/app/TenderKosztorysWorkspace.tsx");
ok("kosztorys uses TenderUxEmptyState", kosztorys.includes("TenderUxEmptyState"));
ok("kosztorys CTA dokumenty", kosztorys.includes('openTenderDetailV4(navigate, itemId, "dokumenty")'));
ok("kosztorys title", kosztorys.includes("Brak przedmiaru"));
ok("kosztorys no plain p empty", !kosztorys.includes("KosztorysEmptyMessage"));

ok("tokens frozen", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux6"));

const forbidden = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/lib/tender-workflow-primary-action.ts",
  "src/app/tenders/strategy/hooks/useTendersPipeline.ts",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/hooks/useTenderDocumentsBootstrap.ts",
  "src/lib/tender-platform-awareness.ts",
  "src/app/tenders/components/TendersStrategyContent.tsx",
  "src/app/TenderCompanyProfilePanel.tsx",
  "src/app/TenderPrzetargWorkspace.tsx",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden untouched ${p}`, !src.includes("TEUX6") && !src.includes("teux6") && !src.includes("TenderUxEmptyState"));
}

const loading = readSrc("src/app/tenders/loading/TenderUxSkeleton.tsx");
ok("TEUX-5 loading untouched", !loading.includes("TenderUxEmptyState"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
