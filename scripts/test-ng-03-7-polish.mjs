/**
 * NG-03.7 — Polish & EPIC CLOSE: touch 44px, tablet, HelpView, mobile cards lg.
 * npx vite-node scripts/test-ng-03-7-polish.mjs
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

console.log("=== NG-03.7 POLISH & EPIC CLOSE ===\n");

console.log("1. Touch targets ≥44px (mobile / tablet)");
const tabBar = read("src/app/TenderDetailTabBar.tsx");
const subTab = read("src/app/TenderDecyzjaSubTabBar.tsx");
const cta = read("src/app/TenderWorkflowPrimaryAction.tsx");
const actionBar = read("src/app/TenderWorkflowOperatorActionBar.tsx");
const strip = read("src/app/TenderWorkflowProcessStrip.tsx");
ok("tab bar min-h 44 mobile tablet", tabBar.includes("min-h-[44px]") && tabBar.includes("lg:min-h-[36px]"));
ok("decyzja sub-tab min-h 44", subTab.includes("min-h-[44px]"));
ok("primary CTA min-h 44 mobile", cta.includes("min-h-[44px]") && !cta.includes("min-h-[40px]"));
ok("action bar min-h 44", actionBar.includes("min-h-[44px]"));
ok("process strip ribbon touch min-h 44", strip.includes("min-h-[44px]"));

console.log("\n2. Tablet polish 640–1023 px");
const module = read("src/app/tenders/TendersModule.tsx");
const page = read("src/app/TenderDetailPage.tsx");
const cards = read("src/app/tenders/mobile/tender-mobile-row-cards.tsx");
ok("immersive detail max-lg module chrome", module.includes('v4Detail ? "max-lg:hidden shrink-0"'));
ok("action bar desktop lg+", page.includes('hidden lg:block') && page.includes('lg:hidden sticky bottom'));
ok("mobile cards until lg", cards.includes("lg:hidden") && cards.includes("hidden lg:block"));

console.log("\n3. Accessibility & accordion");
const hub = read("src/app/TenderWorkflowHubPanel.tsx");
const przetarg = read("src/app/TenderPrzetargWorkspace.tsx");
const portfolio = read("src/app/tenders/strategy/components/TenderPortfolioPositionPanel.tsx");
ok("progress accordion min-h 44", hub.includes("min-h-[44px]") && hub.includes("focus-visible:ring"));
ok("info accordion min-h 44", przetarg.includes("data-tender-info-accordion") && przetarg.includes("min-h-[44px]"));
ok("portfolio aria-labelledby", portfolio.includes("aria-labelledby") && portfolio.includes("tender-portfolio-position-heading"));

console.log("\n4. HelpView NG-03.7");
const guide = read("src/app/GuideView.tsx");
ok("help command layer", guide.includes("Command Layer (detal przetargu)"));
ok("help action bar", guide.includes("Operator Action Bar"));
ok("help portfolio", guide.includes("Pozycja w portfolio (Przetarg)"));
ok("help mobile cards", guide.includes("Mobile Cards (Kosztorys"));

console.log("\n5. Epic close report");
const report = read("audit/NG-03-EPIC-CLOSE-REPORT.md");
ok("epic close report exists", report.includes("EPIC NG-03 CLOSED") && report.includes("NG-03.7"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
