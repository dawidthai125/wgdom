/**
 * UX.2S — Strategy Simplification — testy helperów i struktury UI.
 * npx vite-node scripts/test-tender-strategy-ux.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STRATEGY_DECISION_TOP_LIMIT,
  STRATEGY_MONITORING_TOP_LIMIT,
  STRATEGY_URGENT_TOP_LIMIT,
  buildStrategyKpiCounts,
  buildStrategyDecisionsToday,
  buildStrategyUrgentDeadlines,
  buildStrategyMonitoringFeed,
  prioritizeStrategyList,
  buildBestOpportunityLite,
} from "../src/lib/tender-strategy-ux.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function mockPipelineItem(overrides = {}) {
  return {
    id: "t1",
    title: "Remont budynku test",
    bzpNumber: "BZP-001",
    status: "interested",
    submittingOffersDate: daysFromNow(5),
    changeMonitor: { events: [], unseenCount: 0, lastCheckedAt: null, snapshot: null },
    qaMonitor: { events: [], unseenCount: 0, lastCheckedAt: null, snapshot: null },
    ...overrides,
  };
}

function mockBundle(item, score = 70, decision = "GO") {
  return {
    item,
    decision,
    decisionLabel: decision,
    opportunity: { score, label: "ok" },
    strategic: { score: 65, label: "ok" },
    risk: { score: 20, label: "low" },
  };
}

console.log("\n=== UX.2S Strategy Simplification ===\n");

console.log("T1 — Shell KPI (4 liczniki)");
const itemsKpi = [
  mockPipelineItem({ id: "t1", status: "won", linkedJobId: null }),
  mockPipelineItem({ id: "t2", submittingOffersDate: daysFromNow(2) }),
  mockPipelineItem({
    id: "t3",
    changeMonitor: {
      events: [{
        id: "e1",
        type: "NEW_DOCUMENT",
        at: new Date().toISOString(),
        tenderItemId: "t3",
        tenderTitle: "T3",
        bzpNumber: "BZP-3",
        summary: "Nowy dokument",
      }],
      unseenCount: 1,
      lastCheckedAt: new Date().toISOString(),
      snapshot: null,
    },
  }),
];
const bundlesKpi = [
  mockBundle(itemsKpi[1], 80),
  mockBundle(mockPipelineItem({ id: "t4", submittingOffersDate: daysFromNow(10) }), 60),
];
const ownerStore = { byId: {} };
const marketKpi = {
  urgentCount: 2,
  openTendersCount: 5,
  actionableCount: 3,
  preparingCount: 1,
  interestedCount: 2,
  submittedCount: 0,
  marketValuePln: 0,
  pipelineBidValuePln: 0,
  wadiumRequiredPln: 0,
  wadiumBlockedCount: 0,
  wadiumHeadroomPln: 0,
  maxWadiumPln: 0,
  overloadIndex: 0,
  winRate: 0,
};
const kpi = buildStrategyKpiCounts({
  scoredBundles: bundlesKpi,
  ownerStore,
  marketKpi,
  pipelineItems: itemsKpi,
});
assert(kpi.pendingDecisions >= 1, "T1: pending decisions");
assert(kpi.urgentDeadlines === 2, "T1: urgent deadlines from marketKpi");
assert(kpi.monitoring >= 1, "T1: monitoring count");
assert(kpi.wonWithoutJob === 1, "T1: won without job");

console.log("\nT2 — Wymaga decyzji TOP 5");
const decisionItems = Array.from({ length: 8 }, (_, i) =>
  mockPipelineItem({ id: `d${i}`, submittingOffersDate: daysFromNow(i + 1) }),
);
const decisionBundles = decisionItems.map((item, i) => mockBundle(item, 90 - i));
const decisions = buildStrategyDecisionsToday(decisionBundles, ownerStore);
const decisionTop = prioritizeStrategyList(decisions, STRATEGY_DECISION_TOP_LIMIT);
assert(decisionTop.top.length === STRATEGY_DECISION_TOP_LIMIT, "T2: TOP 5 decisions");
assert(decisionTop.rest.length === 3, "T2: rest decisions");
assert(decisions[0].score >= decisions[1].score, "T2: sort score desc");

console.log("\nT3 — Termin pilny ≤3 / ≤7");
const urgentItems = [
  mockPipelineItem({ id: "u1", submittingOffersDate: daysFromNow(1) }),
  mockPipelineItem({ id: "u2", submittingOffersDate: daysFromNow(3) }),
  mockPipelineItem({ id: "u3", submittingOffersDate: daysFromNow(6) }),
  mockPipelineItem({ id: "u4", submittingOffersDate: daysFromNow(14) }),
];
const urgent = buildStrategyUrgentDeadlines(urgentItems);
assert(urgent.filter((u) => u.tier === "critical").length === 2, "T3: ≤3 dni group");
assert(urgent.filter((u) => u.tier === "urgent").length === 1, "T3: ≤7 dni group");
assert(urgent.length === 3, "T3: ignores >7 days");

console.log("\nT4–T5 — Monitoring jeden feed + dedup");
const at = new Date().toISOString();
const monitorItems = [
  mockPipelineItem({
    id: "m1",
    changeMonitor: {
      events: [
        {
          id: "c1",
          type: "NEW_DOCUMENT",
          at,
          tenderItemId: "m1",
          tenderTitle: "M1",
          bzpNumber: "BZP-M1",
          summary: "Doc A",
        },
        {
          id: "c2",
          type: "NEW_DOCUMENT",
          at,
          tenderItemId: "m1",
          tenderTitle: "M1",
          bzpNumber: "BZP-M1",
          summary: "Doc B dup",
        },
      ],
      unseenCount: 2,
      lastCheckedAt: at,
      snapshot: null,
    },
    qaMonitor: {
      events: [{
        id: "q1",
        type: "NEW_QA",
        at,
        tenderItemId: "m1",
        tenderTitle: "M1",
        bzpNumber: "BZP-M1",
        summary: "Q&A",
        count: 1,
      }],
      unseenCount: 1,
      lastCheckedAt: at,
      snapshot: null,
    },
  }),
];
const feed = buildStrategyMonitoringFeed(monitorItems);
assert(feed.length >= 1, "T4: single feed has items");
const dupKeys = new Set(feed.map((f) => f.dedupeKey));
assert(dupKeys.size === feed.length, "T5: dedup by tender+kind+day");
assert(
  feed.filter((f) => f.kind === "change_document").length <= 1,
  "T5: duplicate change_document same day collapsed",
);

const monitorTop = prioritizeStrategyList(feed, STRATEGY_MONITORING_TOP_LIMIT);
assert(monitorTop.top.length <= STRATEGY_MONITORING_TOP_LIMIT, "T4: TOP limit");

console.log("\nT6–T8 — UI structure");
const strategySrc = readSrc("src/app/tenders/components/TendersStrategyContent.tsx");
const bestSrc = readSrc("src/app/tenders/strategy/components/BestOpportunityCard.tsx");
const collapsibleSrc = readSrc("src/app/tenders/strategy/components/StrategyCollapsibleSection.tsx");

assert(strategySrc.includes("StrategyKpiStrip"), "T1 UI: KPI strip");
assert(strategySrc.includes("StrategyDecisionsTodayPanel"), "T2 UI: decisions panel");
assert(strategySrc.includes("StrategyUrgentDeadlinesPanel"), "T3 UI: urgent panel");
assert(strategySrc.includes("StrategyMonitoringFeedPanel"), "T4 UI: monitoring feed");
assert(!strategySrc.includes("ActionCenter"), "removed ActionCenter from axis");
assert(!strategySrc.includes("TendersAttentionPanel"), "removed Attention from axis");
assert(!strategySrc.includes("TenderChangeMonitorPanel"), "removed ChangeMonitor from axis");
assert(!strategySrc.includes("TenderQaMonitorPanel"), "removed QaMonitor from axis");
assert(!strategySrc.includes("OpportunityOverview"), "removed OpportunityOverview from axis");
assert(strategySrc.indexOf("StrategyDecisionsTodayPanel") < strategySrc.indexOf("strategy-analytics-zone"), "decision zone before analytics");
assert(bestSrc.includes("liteDefault"), "T6: best opportunity lite mode");
assert(bestSrc.includes("Pokaż analizę"), "T7: expand full analysis");
assert(bestSrc.includes('useState(!liteDefault)'), "T6: lite default collapsed");
assert(collapsibleSrc.includes("defaultExpanded"), "T8: collapsible sections");
assert(strategySrc.includes('defaultExpanded={false}'), "T8: analytics collapsed default");
assert(bestSrc.includes("showFullAnalysis"), "T7: lazy full analysis toggle");

console.log("\nT9–T10 — Regresja snapshot + dashboard shortcut");
assert(readSrc("src/app/tenders/context/useTendersStrategySnapshot.ts").includes("buildActionCenter"), "T9: snapshot hook intact");
assert(readSrc("src/app/tenders/components/TendersShortcutPanel.tsx").includes("useTendersContext"), "T10: dashboard shortcut uses snapshot");
assert(readSrc("src/app/tenders/components/TendersShortcutPanel.tsx").includes("marketKpi.urgentCount"), "T10: shortcut KPI urgent");

const lite = buildBestOpportunityLite(mockBundle(mockPipelineItem()), null);
assert(lite?.title.length > 0, "T6: lite summary title");
assert(lite?.systemDecisionLabel != null, "T6: lite recommendation");

console.log(`\n=== UX.2S: ${pass} PASS, ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
