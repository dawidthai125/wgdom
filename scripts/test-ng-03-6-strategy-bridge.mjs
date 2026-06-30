/**
 * NG-03.6 — Strategy bridge: Portfolio Position + Przetarg ↔ Strategia context.
 * npx vite-node scripts/test-ng-03-6-strategy-bridge.mjs
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

console.log("=== NG-03.6 STRATEGY BRIDGE ===\n");

const ux = read("src/lib/tender-strategy-ux.ts");
const przetarg = read("src/app/TenderPrzetargWorkspace.tsx");
const panel = read("src/app/tenders/strategy/components/TenderPortfolioPositionPanel.tsx");
const focus = read("src/app/tenders/strategy/components/TenderStrategyFocusCard.tsx");
const ctx = read("src/app/tenders/context/TendersContext.tsx");
const provider = read("src/app/tenders/context/TendersProvider.tsx");
const detail = read("src/app/TenderDetailPanel.tsx");
const strategy = read("src/app/tenders/components/TendersStrategyContent.tsx");
const module = read("src/app/tenders/TendersModule.tsx");
const banner = read("src/app/TenderMonitoringBanner.tsx");

console.log("1. SSOT builder");
ok("buildTenderPortfolioPositionView export", ux.includes("buildTenderPortfolioPositionView"));
ok("reuse scoreTender", ux.includes("scoreTender"));

console.log("\n2. Portfolio Position panel");
ok("data-tender-portfolio-position", panel.includes("data-tender-portfolio-position"));
ok("onOpenStrategy tenderId", panel.includes("onOpenStrategy(item.id)"));
ok("TenderMonitoringBanner reuse", panel.includes("TenderMonitoringBanner"));

console.log("\n3. Przetarg workspace");
ok("imports portfolio panel", przetarg.includes("TenderPortfolioPositionPanel"));
ok("buildTenderPortfolioPositionView", przetarg.includes("buildTenderPortfolioPositionView"));
ok("accordion strategia link", przetarg.includes("Otwórz w Strategii"));

console.log("\n4. Context bridge");
ok("strategyFocusTenderId in context", ctx.includes("strategyFocusTenderId"));
ok("openTendersStrategy(tenderId?)", ctx.includes("openTendersStrategy: (tenderId?: string)"));
ok("provider sets focus", provider.includes("setStrategyFocusTenderId"));

console.log("\n5. Navigation Przetarg → Strategia");
ok("detail navigate + strategy", detail.includes("handleOpenTendersStrategy") && detail.includes("TENDERS_LIST_PATH"));
ok("monitoring banner passes item.id", banner.includes("onOpenStrategy(item.id)"));

console.log("\n6. Strategia focus card");
ok("TenderStrategyFocusCard", focus.includes("data-tender-strategy-focus"));
ok("strategy content focus", strategy.includes("TenderStrategyFocusCard") && strategy.includes("strategyFocusTenderId"));
ok("module V4 return path", module.includes("buildTenderDetailPath(tenderId, \"przetarg\")"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
