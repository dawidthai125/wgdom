/**
 * TEUX-3 — Tender list cards (mobile/desktop) + severity stripe + TenderUxBadge.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  TENDER_LIST_MOBILE_BADGE_MAX,
  buildTenderListCardViewModel,
  resolveTenderListCardSeverity,
  tenderListCardSeverityStripeClass,
} from "../src/app/tenders/list/tender-list-card-model.ts";

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

const baseItem = {
  id: "teux3-item",
  tenderId: "bzp-1",
  bzpNumber: "BZP/1/2026",
  title: "Remont lokalu testowego",
  organizationName: "Zamawiający Test",
  organizationCity: "Wrocław",
  submittingOffersDate: new Date(Date.now() + 3 * 86400000).toISOString(),
  status: "new",
  relevanceScore: 42,
  isWroclaw: true,
  priorityBuyerLabel: null,
  swzAnalysis: null,
  tenderFit: null,
  linkedJobId: null,
  tenderState: null,
  awardResult: null,
};

console.log("=== TEUX-3 TENDER LIST CARDS ===\n");

ok("severity blocked wins", resolveTenderListCardSeverity({
  todayHighlight: true,
  wadiumBlocked: true,
  urgent: true,
}) === "blocked");

ok("severity today over urgent", resolveTenderListCardSeverity({
  todayHighlight: true,
  wadiumBlocked: false,
  urgent: true,
}) === "today");

ok("severity urgent", resolveTenderListCardSeverity({
  todayHighlight: false,
  wadiumBlocked: false,
  urgent: true,
}) === "urgent");

ok("stripe blocked red", tenderListCardSeverityStripeClass("blocked").includes("red-500"));
ok("stripe today amber-400", tenderListCardSeverityStripeClass("today").includes("amber-400"));
ok("stripe urgent amber-500", tenderListCardSeverityStripeClass("urgent").includes("amber-500"));

{
  const vm = buildTenderListCardViewModel(baseItem, false, 50000);
  ok("shell has 3px stripe", vm.shellClass.includes("border-l-[3px]"));
  ok("mobile badges capped", vm.mobileBadges.length <= TENDER_LIST_MOBILE_BADGE_MAX);
  ok("mobile uses TenderUxBadge path in component file", readSrc("src/app/tenders/list/TenderListMobileCard.tsx").includes("TenderUxBadge"));
  ok("kpi row termin", vm.kpiTermin.includes("d."));
  ok("kpi trafność", vm.kpiTrafność === "42");
}

{
  const manyBadgesItem = {
    ...baseItem,
    priorityBuyerLabel: "WM",
    swzAnalysis: { profitabilityHint: "good" },
    tenderFit: { fitLabel: "strong", winChancePct: 80 },
    linkedJobId: "job-1",
    tenderState: "active",
    awardResult: { isUs: true },
  };
  const vm = buildTenderListCardViewModel(manyBadgesItem, true, 1000);
  ok("badge overflow mobile", vm.mobileBadgeOverflow > 0);
  ok("overflow badge +N in mobile card", readSrc("src/app/tenders/list/TenderListMobileCard.tsx").includes("+{vm.mobileBadgeOverflow}"));
}

ok("mobile breakpoint lg:hidden", readSrc("src/app/TendersView.tsx").includes("lg:hidden"));
ok("desktop breakpoint hidden lg:block", readSrc("src/app/TendersView.tsx").includes("hidden lg:block"));
ok("bulk touch 44px", readSrc("src/app/tenders/list/TenderListBulkCheckbox.tsx").includes("min-h-[44px]"));
ok("mobile card touch 44px", readSrc("src/app/tenders/list/TenderListMobileCard.tsx").includes("min-h-[44px]"));
ok("no overflow-x on card content", readSrc("src/app/tenders/list/TenderListMobileCard.tsx").includes("overflow-hidden"));
ok("tokens file frozen — no edit in bundle", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux3"));

const tendersView = readSrc("src/app/TendersView.tsx");
ok("TendersView uses mobile card", tendersView.includes("TenderListMobileCard"));
ok("TendersView uses desktop card", tendersView.includes("TenderListDesktopCard"));
ok("hosted expand preserved", tendersView.includes("TenderDetailPanelHosted"));
ok("onItemNavigate preserved", tendersView.includes("onItemNavigate"));

const protectedPaths = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/lib/tender-detail-nav.ts",
  "src/lib/tenders-list-ux.ts",
];
for (const p of protectedPaths) {
  ok(`boundary read-only ${p}`, readSrc(p).length > 0);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
