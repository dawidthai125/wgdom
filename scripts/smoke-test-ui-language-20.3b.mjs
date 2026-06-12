/**
 * Sprint 20.3B MIN — Polonizacja UI (prezentacja)
 * Uruchom: npx vite-node scripts/smoke-test-ui-language-20.3b.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RECOVERABLE_CHARGE_STATUS_LABELS,
} from "../src/lib/recoverable-charges.ts";
import { ACTION_PRIORITY_LABEL_PL } from "../src/lib/tenders-strategy-action-center.ts";
import { DECISION_LABEL_PL } from "../src/lib/tenders-strategy-decision.ts";

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

log("=== Sprint 20.3B MIN — UI Language smoke ===\n");

// T1 — Billing statusy PL
{
  assert("T1 open label", RECOVERABLE_CHARGE_STATUS_LABELS.open === "Do rozliczenia");
  assert("T1 partial label", RECOVERABLE_CHARGE_STATUS_LABELS.partial === "Rozliczone częściowo");
  assert("T1 settled label", RECOVERABLE_CHARGE_STATUS_LABELS.settled === "Rozliczone");
  const rcv = readSrc("src/app/RecoverableChargesView.tsx");
  assert("T1 no OPEN KPI", !rcv.includes('label="OPEN"'));
  assert("T1 KPI Do rozliczenia", rcv.includes('label="Do rozliczenia"'));
}

// T2 — Centrum działań
{
  const shortcut = readSrc("src/app/tenders/components/TendersShortcutPanel.tsx");
  const ac = readSrc("src/app/tenders/strategy/components/ActionCenter.tsx");
  assert("T2 shortcut Przetargi skrót", shortcut.includes("Przetargi — skrót"));
  assert("T2 shortcut CTA Strategia", shortcut.includes("Przetargi →"));
  assert("T2 ActionCenter title", ac.includes('"Centrum działań"'));
  assert("T2 ActionCenter no Action Center title", !ac.includes(': "Action Center"'));
}

// T3 — Priorytety PL
{
  const ac = readSrc("src/app/tenders/strategy/components/ActionCenter.tsx");
  assert("T3 map Krytyczne", ACTION_PRIORITY_LABEL_PL.CRITICAL === "Krytyczne");
  assert("T3 map Wysokie", ACTION_PRIORITY_LABEL_PL.HIGH === "Wysokie");
  assert("T3 map Średnie", ACTION_PRIORITY_LABEL_PL.MEDIUM === "Średnie");
  assert("T3 map Niskie", ACTION_PRIORITY_LABEL_PL.LOW === "Niskie");
  assert("T3 PriorityCounters uses map", ac.includes("ACTION_PRIORITY_LABEL_PL[key]"));
  assert("T3 badge uses map", ac.includes("ACTION_PRIORITY_LABEL_PL[item.priority]"));
  assert("T3 compact row uses map", ac.includes("ActionRowCompact") && ac.match(/ACTION_PRIORITY_LABEL_PL\[item\.priority\]/g)?.length >= 3);
}

// T4 — Indeks kondycji
{
  const hero = readSrc("src/app/tenders/strategy/components/TendersStrategyHero.tsx");
  assert("T4 Indeks kondycji", hero.includes("METRIC_LABEL_PL.healthIndex"));
  assert("T4 no Health Index label", !hero.includes("Health Index"));
}

// T5 — Przyciski decyzji PL
{
  const best = readSrc("src/app/tenders/strategy/components/BestOpportunityCard.tsx");
  const portfolio = readSrc("src/app/tenders/strategy/components/TenderPortfolioCounters.tsx");
  assert("T5 map STARTUJ", DECISION_LABEL_PL.GO === "STARTUJ");
  assert("T5 map ANALIZUJ", DECISION_LABEL_PL.HOLD === "ANALIZUJ");
  assert("T5 map ODPUŚĆ", DECISION_LABEL_PL["NO-GO"] === "ODPUŚĆ");
  assert("T5 BestOpportunity buttons", best.includes("{DECISION_LABEL_PL[d]}"));
  assert("T5 portfolio counters PL", portfolio.includes("DECISION_LABEL_PL.GO"));
  assert("T5 BestOpportunity no raw GO button", !best.match(/>\s*\{d\}\s*<\/button>/));
}

// T6 — Portfolio WM
{
  const nav = readSrc("src/app/InspectorNavigation.tsx");
  const panel = readSrc("src/app/InspectorPanel.tsx");
  assert("T6 nav Portfolio WM", nav.includes('label: "Portfolio WM"'));
  assert("T6 panel Portfolio WM", panel.includes('portfolio: "Portfolio WM"'));
}

// T7 — Administrator w billing
{
  const rcv = readSrc("src/app/RecoverableChargesView.tsx");
  assert("T7 Administrator", rcv.includes('"Administrator"'));
  assert("T7 no Admin role label", !rcv.includes(': "Admin"'));
}

// T8 — KPI Okazja / Strategiczny (Strategia)
{
  const best = readSrc("src/app/tenders/strategy/components/BestOpportunityCard.tsx");
  assert("T8 uses OPPORTUNITY_LABEL_PL", best.includes("OPPORTUNITY_LABEL_PL"));
  assert("T8 uses STRATEGIC_LABEL_PL", best.includes("STRATEGIC_LABEL_PL"));
  assert("T8 decision PL map", best.includes("DECISION_LABEL_PL[bundle.decision]"));
}

log("\n--- Podsumowanie ---");
const failed = Object.entries(results).filter(([, v]) => v === "FAIL");
if (failed.length === 0) {
  log(`ALL PASS (${Object.keys(results).length}/${Object.keys(results).length})`);
} else {
  log(`FAIL: ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
