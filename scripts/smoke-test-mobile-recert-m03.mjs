/**
 * M-03 Mobile Re-Certification — NG-03 scroll parity smoke (static architecture)
 * Reuse SSOT z MOBILE-P0-S1 (.mobile-view-scroll + data-mobile-scroll-root + touch-action: pan-y).
 * Run: npx vite-node scripts/smoke-test-mobile-recert-m03.mjs
 *
 * Zakres: C1 Tender Detail · C2 Overview · C3 Map · C4 Profile · C5 Price Base ·
 *         C6 Work Catalog · C7 Settings · Nested Scroll Detection (C8 BOQ Explorer).
 * NIE modyfikuje smoke S1 (bundle S1 CLOSED).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
let pass = 0;
let fail = 0;

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`\u2713 ${name}${detail ? ` \u2014 ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`\u2717 ${name}${detail ? ` \u2014 ${detail}` : ""}`);
  }
}

/** Kontener SSOT: klasa .mobile-view-scroll + data-mobile-scroll-root="<id>". */
function assertScrollRoot(label, src, rootId) {
  assert(`${label} .mobile-view-scroll`, src.includes("mobile-view-scroll"));
  assert(`${label} data-mobile-scroll-root="${rootId}"`, src.includes(`data-mobile-scroll-root="${rootId}"`));
}

const mobileCss = read("src/styles/mobile.css");
const detail = read("src/app/TenderDetailPage.tsx");
const overview = read("src/app/tenders/components/TendersStrategyContent.tsx");
const mapTab = read("src/app/tenders/tabs/TendersMapTab.tsx");
const profileTab = read("src/app/tenders/tabs/TendersProfileTab.tsx");
const priceBaseTab = read("src/app/tenders/tabs/TendersPriceBaseTab.tsx");
const workCatalogTab = read("src/app/tenders/tabs/TendersWorkCatalogTab.tsx");
const settingsTab = read("src/app/tenders/tabs/TendersSettingsTab.tsx");
const boq = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");

// SSOT source-of-truth (dziedziczony z S1) — touch-action: pan-y w .mobile-view-scroll
assert("SSOT mobile.css .mobile-view-scroll defines touch-action pan-y", mobileCss.includes(".mobile-view-scroll") && mobileCss.includes("touch-action: pan-y"));

// C1 Tender Detail Workspace
assertScrollRoot("C1 Tender Detail", detail, "tender-detail");
// C2 Overview
assertScrollRoot("C2 Overview", overview, "tenders-overview");
// C3 Map
assertScrollRoot("C3 Map", mapTab, "tenders-map");
// C4 Profile
assertScrollRoot("C4 Profile", profileTab, "tenders-profile");
// C5 Price Base
assertScrollRoot("C5 Price Base", priceBaseTab, "tenders-pricebase");
// C6 Work Catalog (+ zachowany pb bottom nav)
assertScrollRoot("C6 Work Catalog", workCatalogTab, "tenders-workcatalog");
assert("C6 Work Catalog keeps mobile pb bottom nav", workCatalogTab.includes("max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]"));
// C7 Settings
assertScrollRoot("C7 Settings", settingsTab, "tenders-settings");

// C8 Nested Scroll Detection — BOQ Explorer NIE MA własnego pionowego scrolla
// (dozwolony wyłącznie overflow-x-auto dla szerokiej tabeli; brak overflow-y-auto/overflow-auto).
assert("C8 BOQ Explorer: brak overflow-y-auto (nested vertical scroll)", !boq.includes("overflow-y-auto"));
assert("C8 BOQ Explorer: brak overflow-auto (dwukierunkowy nested scroll)", !/overflow-auto\b/.test(boq));
assert("C8 BOQ Explorer: overflow-x-auto tabeli dozwolony (poziomy, niekonfliktowy)", boq.includes("overflow-x-auto"));
assert("C8 BOQ Explorer: brak klasy .mobile-view-scroll (nie tworzy własnego roota)", !boq.includes("mobile-view-scroll"));

console.log(`\n${pass}/${pass + fail} PASS`);
if (fail > 0) {
  process.exit(1);
}
