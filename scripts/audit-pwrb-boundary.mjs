/**
 * SYNC-ARCH-01 RC-B-1A — CI gate PWRB boundary (CI-PWRB-1…6).
 * node scripts/audit-pwrb-boundary.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SRC = join(ROOT, "src");

const EXCLUDE_KERNEL = new Set([
  "lib/cloud-sync.ts",
  "lib/payroll-week-roster-bundle.ts",
]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(name)) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return relative(join(ROOT, "src"), p).replace(/\\/g, "/");
}

const violations = [];

for (const file of walk(SRC)) {
  const r = rel(file);
  if (EXCLUDE_KERNEL.has(r)) continue;
  const text = readFileSync(file, "utf8");

  if (/addDeletedWeekEmployeeKey/.test(text)) {
    violations.push({ rule: "CI-PWRB-1/4", file: r, detail: "addDeletedWeekEmployeeKey" });
  }
  if (/saveDeletedWeekEmployeeKeys/.test(text)) {
    violations.push({ rule: "CI-PWRB-2", file: r, detail: "saveDeletedWeekEmployeeKeys" });
  }
  if (/setItem\s*\(\s*['"]kw-week-employees-deleted-ids/.test(text)) {
    violations.push({ rule: "CI-PWRB-3", file: r, detail: "setItem kw-week-employees-deleted-ids" });
  }
  if (/WEEK_EMPLOYEES_DELETED_KEYS_KEY/.test(text) && r.startsWith("app/")) {
    violations.push({ rule: "CI-PWRB-3", file: r, detail: "WEEK_EMPLOYEES_DELETED_KEYS_KEY in app" });
  }
  if (r.startsWith("app/") && /pushWeekEmployeesToCloud/.test(text)) {
    violations.push({ rule: "CI-PWRB-6", file: r, detail: "pushWeekEmployeesToCloud" });
  }
}

const appTsx = join(SRC, "app", "App.tsx");
const appText = readFileSync(appTsx, "utf8");
if (/Object\.entries\(data\)\.forEach/.test(appText) && !/pwrImportMerge/.test(appText)) {
  violations.push({ rule: "CI-PWRB-5", file: "app/App.tsx", detail: "importBackup bez pwrImportMerge" });
}

console.log("=== AUDIT PWRB BOUNDARY ===\n");
if (violations.length === 0) {
  console.log("PASS — 0 naruszeń CI-PWRB");
  process.exit(0);
}
for (const v of violations) {
  console.log(`FAIL ${v.rule} — ${v.file}: ${v.detail}`);
}
console.log(`\nFAIL — ${violations.length} naruszeń`);
process.exit(1);
