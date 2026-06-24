/**
 * Smoke — WeekEmployeeDetail extra cost helpers (hotfix import regression)
 * Run: npx vite-node scripts/smoke-test-week-employee-extra-cost-helpers.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const detailSrc = readFileSync(join(root, "src/app/WeekEmployeeDetail.tsx"), "utf8");

const { extraCostStatus, EXTRA_COST_STATUS_LABELS } = await import("../src/app/app-domain.ts");

const results = [];
function check(name, pass) {
  results.push({ name, pass });
  if (!pass) console.error(`FAIL: ${name}`);
}

check("WeekEmployeeDetail imports extraCostStatus", /\bextraCostStatus,\s*\n/.test(detailSrc));
check("WeekEmployeeDetail imports EXTRA_COST_STATUS_LABELS", /\bEXTRA_COST_STATUS_LABELS,\s*\n/.test(detailSrc));
check("WeekEmployeeDetail uses extraCostStatus(cost)", detailSrc.includes("extraCostStatus(cost)"));
check("WeekEmployeeDetail uses EXTRA_COST_STATUS_LABELS[st]", detailSrc.includes("EXTRA_COST_STATUS_LABELS[st]"));
check("WeekEmployeeDetail onPatchExtraCosts (ETAP1)", detailSrc.includes("onPatchExtraCosts(next)"));
check("WeekEmployeeDetail no safeEmp extraCosts spread", !detailSrc.includes("onChange({ ...safeEmp, extraCosts:"));
check("WeekEmployeeDetail onPatchDay (hours ETAP1)", detailSrc.includes("onPatchDay(key, next)"));
check("WeekEmployeeDetail onPatchRate (hours ETAP1)", detailSrc.includes("onPatchRate(e.target.value)"));
check("WeekEmployeeDetail onPatchPrevSaturday (hours ETAP1)", detailSrc.includes("onPatchPrevSaturday({"));
check("WeekEmployeeDetail no safeEmp days spread", !detailSrc.includes("onChange({ ...safeEmp, days:"));
check("WeekEmployeeDetail no safeEmp rate spread", !detailSrc.includes("onChange({...safeEmp,rate:"));

const pending = { id: "t1", description: "chemia", amount: "50", status: "pending" };
const legacy = { id: "t2", description: "paliwo", amount: "30" };
check("extraCostStatus pending", extraCostStatus(pending) === "pending");
check("extraCostStatus legacy default approved", extraCostStatus(legacy) === "approved");
check("EXTRA_COST_STATUS_LABELS pending PL", EXTRA_COST_STATUS_LABELS.pending === "Oczekuje na akceptację");

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ test: "week-employee-extra-cost-helpers", pass: failed.length === 0, failed: failed.length, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
