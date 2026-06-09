/**
 * Roboty 2.50.41 — Active Today badge (static + logic)
 * npx vite-node scripts/smoke-test-jobs-active-today-2.50.41.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jobActiveWorkerCountOnDate } from "../src/app/app-domain.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const cardV2 = read("src/app/JobListCardV2.tsx");
const cardV1 = read("src/app/JobListCard.tsx");
const jobsView = read("src/app/JobsView.tsx");
const guide = read("src/app/JobListGuidePanel.tsx");
const changelog = read("src/app/changelog-data.ts");
const ops = read("src/lib/job-list-ops.ts");

const today = "2026-06-09";
const job = {
  workEntries: [
    { id: "1", directoryId: "d1", employeeName: "Mikołaj", date: today, hours: 9, rate: 25, notes: "" },
    { id: "2", directoryId: "d2", employeeName: "Tomek", date: today, hours: 9, rate: 25, notes: "" },
    { id: "3", directoryId: "d1", employeeName: "Mikołaj", date: today, hours: 0, rate: 25, notes: "" },
    { id: "4", directoryId: "d3", employeeName: "Jan", date: "2026-06-08", hours: 9, rate: 25, notes: "" },
  ],
};

const checks = [
  ["helper_two_unique_today", jobActiveWorkerCountOnDate(job, today) === 2],
  ["helper_zero_yesterday_only", jobActiveWorkerCountOnDate({ workEntries: job.workEntries.filter((e) => e.date !== today) }, today) === 0],
  ["helper_zero_h_empty", jobActiveWorkerCountOnDate({ workEntries: [] }, today) === 0],
  ["card_v2_active_today_badge", cardV2.includes("Aktywni dziś:") && cardV2.includes("activeTodayCount")],
  ["card_v2_no_ekipa_badge", !cardV2.includes("Ekipa: 0") && !cardV2.includes("Ekipa: {executionCrewCount}")],
  ["card_v2_no_execution_import", !cardV2.includes("jobOpsExecutionCrewCount") && !cardV2.includes("jobOpsHasNoExecutionTeam")],
  ["card_v1_parity", cardV1.includes("Aktywni dziś:") && !cardV1.includes("Ekipa: 0")],
  ["jobs_view_passes_count", jobsView.includes("jobActiveWorkerCountOnDate") && jobsView.includes("activeTodayCount")],
  ["guide_updated", guide.includes("Aktywni dziś: N") && !guide.includes("Ekipa: 0")],
  ["changelog_2_50_41", changelog.includes('"2.50.41"')],
  ["midb_ops_unchanged", ops.includes("jobOpsHasNoExecutionTeam") && ops.includes("executionAssigneeDirectoryIds")],
  ["teal_badge_style", cardV2.includes("bg-teal-500/12")],
];

console.log("=== Roboty 2.50.41 Active Today smoke ===\n");
let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (ok) pass += 1;
}
console.log(`\n=== ${pass}/${checks.length} | ${pass === checks.length ? "ALL PASS" : "FAIL"} ===\n`);
if (pass !== checks.length) process.exit(1);
