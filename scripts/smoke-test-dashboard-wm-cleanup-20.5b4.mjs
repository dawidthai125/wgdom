/**
 * Sprint 20.5B.4 — Dashboard WM Cleanup
 * Uruchom: npx vite-node scripts/smoke-test-dashboard-wm-cleanup-20.5b4.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

log("=== Sprint 20.5B.4 — Dashboard WM Cleanup ===\n");

// T1 — Dashboard nie renderuje WmPortfolioView embedded
{
  const dashboard = readSrc("src/app/DashboardView.tsx");
  assert("T1 no WmPortfolioView import", !dashboard.includes("WmPortfolioView"));
  assert("T1 no WmPortfolioView JSX", !dashboard.includes("<WmPortfolioView"));
}

// T2 — Brak #wm-portfolio
{
  const dashboard = readSrc("src/app/DashboardView.tsx");
  assert("T2 no wm-portfolio id", !dashboard.includes('id="wm-portfolio"'));
  assert("T2 no scrollIntoView wm-portfolio", !dashboard.includes("scrollIntoView"));
}

// T3 — KPI „Aktywne WM” renderuje się
{
  const dashboard = readSrc("src/app/DashboardView.tsx");
  assert("T3 Aktywne WM label", dashboard.includes("Aktywne WM"));
  assert("T3 wmPortfolioStats", dashboard.includes("wmPortfolioStats"));
  assert("T3 computeWmPortfolioStats", dashboard.includes("computeWmPortfolioStats"));
}

// T4 — Alert WM prowadzi do Roboty
{
  const dashboard = readSrc("src/app/DashboardView.tsx");
  assert("T4 wmOverdueJobs section", dashboard.includes("WM — termin odbioru minął"));
  assert("T4 overdue navigate jobs", dashboard.includes('onNavigate("jobs")'));
}

// T5 — Link „Roboty →” renderuje się
{
  const dashboard = readSrc("src/app/DashboardView.tsx");
  assert("T5 Roboty link text", dashboard.includes("Roboty →"));
  assert("T5 no Portfolio WM link", !dashboard.includes("Portfolio WM →"));
}

// T6 — InspectorPanel nadal renderuje WmPortfolioView
{
  const panel = readSrc("src/app/InspectorPanel.tsx");
  assert("T6 InspectorPanel imports WmPortfolioView", panel.includes("WmPortfolioView"));
  assert("T6 InspectorPanel renders portfolio", panel.includes("<WmPortfolioView"));
}

const pass = Object.values(results).filter((r) => r === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);
