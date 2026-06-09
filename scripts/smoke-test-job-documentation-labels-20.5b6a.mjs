/**
 * Sprint 20.5B.6A.1 — Dokumentacja Robót naming refresh
 * Uruchom: npx vite-node scripts/smoke-test-job-documentation-labels-20.5b6a.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_DOCS } from "../src/lib/job-documents.ts";

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

log("=== Sprint 20.5B.6A.1 — Dokumentacja Robót naming ===\n");

// T1 — JobDetailSectionNav
{
  const nav = readSrc("src/app/JobDetailSectionNav.tsx");
  assert("T1 nav Dokumentacja", nav.includes('label: "Dokumentacja"'));
  assert("T1 nav no Raporty label", !nav.includes('label: "Raporty"'));
}

// T2 — admin panel header
{
  const panel = readSrc("src/app/JobWorkerReportsPanel.tsx");
  assert("T2 panel Dokumentacja robót", panel.includes("Dokumentacja robót"));
  assert("T2 panel subtitle", panel.includes("Zakres prac · Wymiary · Obrys lokalu"));
}

// T3 — no Raporty in main navigations
{
  const nav = readSrc("src/app/JobDetailSectionNav.tsx");
  const inspNav = readSrc("src/app/InspectorNavigation.tsx");
  assert("T3 admin nav no Raporty", !nav.includes('label: "Raporty"'));
  assert("T3 inspector nav no Zakresy i wymiary", !inspNav.includes("Zakresy i wymiary"));
  assert("T3 inspector short Dok.", inspNav.includes('short: "Dok."'));
}

// T4 — InspectorNavigation Dokumentacja
{
  const inspNav = readSrc("src/app/InspectorNavigation.tsx");
  assert("T4 inspector Dokumentacja label", inspNav.includes('label: "Dokumentacja"'));
}

// T5 — obrys hint
{
  const panel = readSrc("src/app/JobWorkerReportsPanel.tsx");
  const docs = readSrc("src/lib/job-documents.ts");
  assert("T5 hint constant", docs.includes("Obrys lokalu i wymiary są materiałem źródłowym"));
  assert("T5 hint in panel", panel.includes("JOB_DOCUMENTATION_SOURCE_HELP"));
}

// T6 — Rysunek/Plan help
{
  const docs = readSrc("src/lib/job-documents.ts");
  const jobsView = readSrc("src/app/JobsView.tsx");
  const checklist = readSrc("src/app/InspectorDocChecklist.tsx");
  assert("T6 help constant", docs.includes("RYSUNEK_PLAN_CHECKLIST_HELP"));
  assert("T6 help in JobsView", jobsView.includes("RYSUNEK_PLAN_CHECKLIST_HELP"));
  assert("T6 Rysunek/Plan label", docs.includes('rysunek: "Rysunek/Plan"'));
  assert("T6 help in inspector checklist", checklist.includes("RYSUNEK_PLAN_CHECKLIST_HELP"));
}

// T7 — sync/model unchanged
{
  const cloudSync = readSrc("src/lib/cloud-sync.ts");
  const jobDocs = readSrc("src/lib/job-documents.ts");
  assert("T7 workerReports in domain", readSrc("src/app/app-domain.ts").includes("workerReports?: WorkerJobReport[]"));
  assert("T7 REQUIRED_DOCS count", REQUIRED_DOCS.length === 8);
  assert("T7 REQUIRED_DOCS rysunek", REQUIRED_DOCS.includes("rysunek"));
  assert("T7 no new DATA_KEYS", !cloudSync.includes("kw-worker-reports"));
  assert("T7 syncJobDocumentsFromReports intact", jobDocs.includes("syncJobDocumentsFromReports"));
}

const pass = Object.values(results).filter((r) => r === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);
