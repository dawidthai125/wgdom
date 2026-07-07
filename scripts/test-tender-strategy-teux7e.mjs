/**
 * TEUX-7e — Strategia + Pulpit: max 3 dashboard KPI, TEUX_KPI tokens, labels SSOT.
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

function noUserFacingAi(src, label) {
  const aiWord = /\bAI\b/;
  const lines = src.split("\n");
  const hits = lines.filter((line) => {
    if (!aiWord.test(line)) return false;
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return false;
    if (line.includes("aria-hidden")) return false;
    return true;
  });
  ok(`${label} no \\bAI\\b in strings`, hits.length === 0);
}

function countMarkers(src, marker) {
  const re = new RegExp(marker, "g");
  return (src.match(re) ?? []).length;
}

console.log("=== TEUX-7e TENDER STRATEGY + DASHBOARD KPI ===\n");

const shortcut = readSrc("src/app/tenders/components/TendersShortcutPanel.tsx");
const kpiTiles = countMarkers(shortcut, "<DashboardKpiTile");
ok("T1 TendersShortcutPanel max 3 KPI tiles", kpiTiles === 3);
ok("T2 TendersShortcutPanel no lg:grid-cols-5", !shortcut.includes("lg:grid-cols-5"));
ok("T3 TendersShortcutPanel imports TEUX_KPI_LABEL", shortcut.includes("TEUX_KPI_LABEL"));
ok("T3b TendersShortcutPanel imports TEUX_KPI_VALUE", shortcut.includes("TEUX_KPI_VALUE"));
ok("T3c TendersShortcutPanel imports from tender-ux-tokens", shortcut.includes("@/lib/tender-ux-tokens"));
ok("T3d dashboard grid sm:grid-cols-3", shortcut.includes("sm:grid-cols-3"));
ok("T3e no tenderChangesSummary", !shortcut.includes("tenderChangesSummary"));
ok("T3f no qaMonitorSummary", !shortcut.includes("qaMonitorSummary"));
noUserFacingAi(shortcut, "T6 TendersShortcutPanel");

const strategyKpi = readSrc("src/app/tenders/strategy/components/StrategyKpiStrip.tsx");
ok("T4 StrategyKpiStrip TEUX_KPI_LABEL", strategyKpi.includes("TEUX_KPI_LABEL"));
ok("T4b StrategyKpiStrip TEUX_KPI_VALUE", strategyKpi.includes("TEUX_KPI_VALUE"));
ok("T4c StrategyKpiStrip data-testid strategy-kpi-strip", strategyKpi.includes('data-testid="strategy-kpi-strip"'));
ok("T4d StrategyKpiStrip data-teux7e-strategy-kpi", strategyKpi.includes("data-teux7e-strategy-kpi"));
ok("T4e StrategyKpiStrip no inline text-[10px]", !strategyKpi.includes("text-[10px]"));
noUserFacingAi(strategyKpi, "T6 StrategyKpiStrip");

const labels = readSrc("src/lib/tenders-strategy-ui-labels-pl.ts");
ok("T5 labels no Wnioski AI literal", !labels.includes("Wnioski AI"));
ok("T5b labels strategicInsights key", labels.includes("strategicInsights"));
ok("T5c labels Rekomendacje strategiczne", labels.includes("Rekomendacje strategiczne"));
ok("T5d labels no aiInsights key", !labels.includes("aiInsights"));

const tokens = readSrc("src/lib/tender-ux-tokens.ts");
ok("T7 tokens no teux7e marker", !tokens.includes("teux7e"));

const cloudSync = readSrc("src/lib/cloud-sync.ts");
const appTsx = readSrc("src/app/App.tsx");
const pipelineRt = readSrc("src/app/hooks/useTenderPipelineRuntime.ts");
ok("T8 cloud-sync no teux7e", !cloudSync.includes("teux7e"));
ok("T8b App.tsx no teux7e", !appTsx.includes("teux7e"));
ok("T8c useTenderPipelineRuntime no teux7e", !pipelineRt.includes("teux7e"));

const strategyContent = readSrc("src/app/tenders/components/TendersStrategyContent.tsx");
const collapsedMatches = strategyContent.match(/defaultExpanded=\{false\}/g) ?? [];
ok("T9 TendersStrategyContent defaultExpanded false", collapsedMatches.length >= 3);

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
