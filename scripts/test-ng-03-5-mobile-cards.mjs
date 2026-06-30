/**
 * NG-03.5 — Mobile card layout for tender tables (no horizontal scroll ≤390px).
 * npx vite-node scripts/test-ng-03-5-mobile-cards.mjs
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

console.log("=== NG-03.5 MOBILE CARDS ===\n");

const shared = read("src/app/tenders/mobile/tender-mobile-row-cards.tsx");
const kosztorys = read("src/app/TenderKosztorysWorkspace.tsx");
const pricing = read("src/app/TenderCatalogLinePricingSection.tsx");
const bid = read("src/app/TenderBidProposalPanel.tsx");
const dossier = read("src/app/TenderDossierPanel.tsx");

console.log("1. Shared mobile card primitives");
ok("TenderMobileTableCards lg:hidden", shared.includes("lg:hidden") && shared.includes("data-tender-mobile-cards"));
ok("TenderDesktopTable hidden lg:block", shared.includes("hidden lg:block") && shared.includes("data-tender-desktop-table"));
ok("TenderMobileRowCard fields grid", shared.includes("TenderMobileRowCard") && shared.includes("grid-cols-2"));

console.log("\n2. Kosztorys workspace");
ok("imports mobile cards", kosztorys.includes("tender-mobile-row-cards"));
ok("catalog dual layout", kosztorys.includes("KosztorysCatalogTable") && kosztorys.match(/TenderMobileTableCards[\s\S]*KosztorysCatalogTable|TenderMobileTableCards[\s\S]*catalogRows/));
ok("top cost dual layout", kosztorys.includes("KosztorysTopCostTable") && kosztorys.includes("TenderDesktopTable"));

console.log("\n3. Catalog line pricing (Ceny)");
ok("imports mobile cards", pricing.includes("tender-mobile-row-cards"));
ok("category summary cards", pricing.includes("TenderMobileTableCards") && pricing.includes("TenderDesktopTable"));
const pricingMobileCount = (pricing.match(/TenderMobileTableCards/g) || []).length;
ok("at least 3 mobile card sections", pricingMobileCount >= 3);

console.log("\n4. Bid proposal UNKNOWN");
ok("imports mobile cards", bid.includes("tender-mobile-row-cards"));
ok("unknown rows mobile cards", bid.includes("classification.unknownRows") && bid.includes("TenderMobileTableCards"));
ok("unknown desktop table preserved", bid.includes("TenderDesktopTable"));

console.log("\n5. Dossier CostTable (Dokumenty)");
ok("imports mobile cards", dossier.includes("tender-mobile-row-cards"));
ok("CostTable mobile cards", dossier.includes("function CostTable") && dossier.includes("TenderMobileRowCard"));
ok("CostTable desktop table", dossier.includes("TenderDesktopTable"));

console.log("\n6. Desktop isolation");
ok("desktop tables keep overflow-x on dossier", dossier.includes("overflow-x-auto"));
ok("pricing desktop min-width preserved", pricing.includes("min-w-[820px]") || pricing.includes("min-w-[560px]"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
