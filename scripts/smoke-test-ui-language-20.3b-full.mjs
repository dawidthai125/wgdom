/**
 * Sprint 20.3B+ FULL — Polonizacja Command Center (prezentacja)
 * Uruchom: npx vite-node scripts/smoke-test-ui-language-20.3b-full.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METRIC_LABEL_PL,
  OPPORTUNITY_LABEL_PL,
  STRATEGIC_LABEL_PL,
  FINANCIAL_LABEL_PL,
  BASELINE_LABEL_PL,
  SECTION_LABEL_PL,
  GLOSSARY_TERM_PL,
} from "../src/lib/tender-center-ui-labels-pl.ts";
import { DECISION_LABEL_PL } from "../src/lib/tender-center-decision.ts";
import { COMMAND_CENTER_BRAND } from "../src/app/tender-center/branding.ts";
import { WHAT_IF_PRESET_LABELS } from "../src/lib/tender-center-what-if.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function lacksActiveUiString(src, pattern) {
  if (typeof pattern === "string") return !src.includes(pattern);
  return !pattern.test(src);
}

log("=== Sprint 20.3B+ FULL — UI Language smoke ===\n");

// T1 — Centralna mapa etykiet
{
  assert("T1 healthIndex PL", METRIC_LABEL_PL.healthIndex === "Indeks kondycji");
  assert("T1 opportunityScore PL", METRIC_LABEL_PL.opportunityScore === "Wynik okazji");
  assert("T1 financialCapacityScore PL", FINANCIAL_LABEL_PL.capacityScore === "Wynik zdolności finansowej");
  assert("T1 baseline PL", BASELINE_LABEL_PL.baselineToday === "Stan bazowy (dziś)");
  assert("T1 decision STARTUJ", DECISION_LABEL_PL.GO === "STARTUJ");
}

// T2 — Marka COMMAND CENTER AI bez zmian
{
  assert("T2 brand title", COMMAND_CENTER_BRAND.title.includes("COMMAND CENTER AI"));
  assert("T2 brand toggle", COMMAND_CENTER_BRAND.togglePro === "COMMAND CENTER AI");
  assert("T2 authorLine PL", COMMAND_CENTER_BRAND.authorLine === "Zaprojektowany i opracowany przez");
  const exec = readSrc("src/app/tender-center/components/CommandCenterExecutivePanel.tsx");
  assert("T2 CTA brand preserved", exec.includes("Otwórz COMMAND CENTER AI"));
}

// T3 — P0: brak kluczowych EN etykiet w aktywnych komponentach
{
  const hero = readSrc("src/app/tender-center/components/CommandCenterHero.tsx");
  const best = readSrc("src/app/tender-center/components/BestOpportunityCard.tsx");
  const fin = readSrc("src/app/tender-center/components/FinancialCapacityPanel.tsx");
  const forecast = readSrc("src/app/tender-center/components/ForecastCommandStrip.tsx");
  const tooltip = readSrc("src/app/tender-center/components/MetricHelpTooltip.tsx");

  assert("T3 hero no Health Index", lacksActiveUiString(hero, "Health Index"));
  assert("T3 hero uses METRIC_LABEL_PL", hero.includes("METRIC_LABEL_PL.healthIndex"));
  assert("T3 best no Opportunity label", lacksActiveUiString(best, ">Opportunity<"));
  assert("T3 best uses OPPORTUNITY_LABEL_PL", best.includes("OPPORTUNITY_LABEL_PL.short"));
  assert("T3 best system badge PL", best.includes("DECISION_LABEL_PL[bundle.decision]"));
  assert("T3 fin no Financial Capacity Score", lacksActiveUiString(fin, "Financial Capacity Score"));
  assert("T3 forecast scenario PL", forecast.includes("BASELINE_LABEL_PL.scenarioC"));
  assert("T3 tooltip titles PL", tooltip.includes("METRIC_LABEL_PL"));
}

// T4 — P0: enumy GO/HOLD/NO-GO w modelu — lib bez zmian typów
{
  const decision = readSrc("src/lib/tender-center-decision.ts");
  assert("T4 TenderDecision type intact", decision.includes('"GO" | "HOLD" | "NO-GO"'));
  const action = readSrc("src/lib/tender-center-action-center.ts");
  assert("T4 action compares GO enum", action.includes('b.decision === "GO"'));
  assert("T4 action reason uses PL label", action.includes("DECISION_LABEL_PL[b.decision]"));
}

// T5 — P0: UI decyzji STARTUJ/ANALIZUJ/ODPUŚĆ
{
  const portfolio = readSrc("src/app/tender-center/components/TenderPortfolioCounters.tsx");
  const learning = readSrc("src/app/tender-center/components/LearningMemoryPanel.tsx");
  assert("T5 portfolio counters PL", portfolio.includes("DECISION_LABEL_PL.GO"));
  assert("T5 portfolio no raw GO counter", !portfolio.match(/label="GO"/));
  assert("T5 learning counters PL", learning.includes('DECISION_LABEL_PL["NO-GO"]'));
  assert("T5 BestOpportunity buttons PL", readSrc("src/app/tender-center/components/BestOpportunityCard.tsx").includes("{DECISION_LABEL_PL[d]}"));
}

// T6 — P1: accordion i sekcje
{
  const dash = readSrc("src/app/tender-center/components/OwnerDashboard.tsx");
  assert("T6 no AI Insights accordion", lacksActiveUiString(dash, ">AI Insights<"));
  assert("T6 explainability PL", dash.includes("SECTION_LABEL_PL.explainability"));
  assert("T6 no Explainability raw", lacksActiveUiString(dash, ">Explainability<"));
  assert("T6 auto-sync PL", dash.includes("SECTION_LABEL_PL.autoSync"));
}

// T7 — P1: glossary, how-to, explainability
{
  const glossary = readSrc("src/app/tender-center/components/CommandCenterGlossary.tsx");
  assert("T7 glossary uses GLOSSARY_TERM_PL", glossary.includes("GLOSSARY_TERM_PL"));
  assert("T7 glossary no Health Index term", lacksActiveUiString(glossary, 'term: "Health Index"'));
  const explain = readSrc("src/app/tender-center/components/CommandCenterExplainability.tsx");
  assert("T7 explain health PL", explain.includes("METRIC_LABEL_PL.healthIndex"));
  const howTo = readSrc("src/app/tender-center/components/HowToUseCommandCenter.tsx");
  assert("T7 how-to uses DECISION_LABEL_PL", howTo.includes("DECISION_LABEL_PL.GO"));
}

// T8 — P1: lib dynamic strings
{
  const insights = readSrc("src/lib/tender-center-ai-insights.ts");
  assert("T8 insights no raw GO highlight", lacksActiveUiString(insights, '"Najczęściej wybierasz decyzję GO."'));
  assert("T8 insights uses METRIC_LABEL_PL", insights.includes("METRIC_LABEL_PL.opportunityScore"));
  const morning = readSrc("src/lib/tender-center-morning-briefing.ts");
  assert("T8 morning no HOLD — oceń", lacksActiveUiString(morning, '"HOLD — oceń ponownie"'));
  const whatIf = readSrc("src/lib/tender-center-what-if.ts");
  assert("T8 what-if baseline PL", WHAT_IF_PRESET_LABELS.baseline === BASELINE_LABEL_PL.baselineToday);
  assert("T8 what-if no Baseline EN", lacksActiveUiString(whatIf, '"Baseline (dziś)"'));
}

// T9 — Legacy poza scope — nie wymuszamy polonizacji
{
  const impact = readSrc("src/app/tender-center/components/ImpactPanel.tsx");
  assert("T9 ImpactPanel untouched (legacy)", impact.includes("Impact Score"));
  assert("T9 glossary term count", Object.keys(GLOSSARY_TERM_PL).length >= 10);
}

log("\n--- Podsumowanie ---");
const failed = Object.entries(results).filter(([, v]) => v === "FAIL");
if (failed.length === 0) {
  log(`ALL PASS (${Object.keys(results).length}/${Object.keys(results).length})`);
} else {
  log(`FAIL: ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
