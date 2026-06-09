/**
 * Sprint 20.5B.5A — default Jobs list filter
 * Uruchom: npx vite-node scripts/smoke-test-jobs-default-filter-20.5b5a.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { jobMatchesListFilter } from "../src/lib/job-list-status.ts";

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

log("=== Sprint 20.5B.5A — default Jobs filter ===\n");

// T1 — default filter in_progress
{
  const jobsView = readSrc("src/app/JobsView.tsx");
  assert("T1 default in_progress", jobsView.includes('useState<JobListFilter>("in_progress")'));
  assert("T1 not default all", !jobsView.includes('useState<JobListFilter>("all")'));
}

// T2 — tab order
{
  const filterBar = readSrc("src/app/JobListStatus.tsx");
  const idxInProgress = filterBar.indexOf('{ id: "in_progress"');
  const idxHandover = filterBar.indexOf('{ id: "handover"');
  const idxCompleted = filterBar.indexOf('{ id: "completed"');
  const idxAll = filterBar.indexOf('{ id: "all"');
  assert("T2 order in_progress first", idxInProgress < idxHandover && idxHandover < idxCompleted && idxCompleted < idxAll);
}

// T3 — filter logic unchanged
{
  const job = {
    status: "in_progress",
    documents: Object.fromEntries(
      ["zlecenie", "zakres", "kosztorys", "kominiarz", "pomiary", "oswiadczenia", "gwarancje", "rysunek", "zdjecia"].map((d) => [d, false]),
    ),
    client: "Wrocławskie Mieszkania",
  };
  assert("T3 in_progress matches filter", jobMatchesListFilter(job, "in_progress"));
  assert("T3 not all-only", !jobMatchesListFilter({ ...job, status: "completed", keysHandedOver: true, jobPhase: "completed" }, "in_progress"));
}

const pass = Object.values(results).filter((r) => r === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);
