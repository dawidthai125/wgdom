/**
 * P0F one-shot restore — kw-week-employees (+ weekFrom/weekTo) from backup 07:51
 * Usage: node scripts/_restore-194h-once.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchKvBackup, loadEnv, getSupabaseConfig, apiHeaders } from "./backup-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const SNAPSHOT = resolve(root, "before-restore-194h.json");
const BACKUP = resolve(root, "backups/auto/wgdom-full-2026-06-02T07-51-08/kv-data.json");

function parseTime(t) {
  const m = String(t || "").match(/^(\d+):(\d+)$/);
  return m ? +m[1] * 60 + +m[2] : null;
}
function dayHours(day) {
  if (!day || typeof day !== "object" || !day.active) return 0;
  const f = parseTime(day.from);
  const to = parseTime(day.to);
  let h = f != null && to != null && to > f ? (to - f) / 60 : 0;
  for (const ex of day.extraHours || []) {
    const ef = parseTime(ex?.from);
    const et = parseTime(ex?.to);
    if (ef != null && et != null && et > ef) h += (et - ef) / 60;
  }
  return h;
}
export function payrollStats(list) {
  const arr = Array.isArray(list) ? list : [];
  let activeDays = 0;
  let weekdayActive = 0;
  let weekdayHours = 0;
  let totalHours = 0;
  for (const e of arr) {
    for (const d of Object.values(e.days || {})) {
      if (d?.active) {
        activeDays++;
        weekdayActive++;
        weekdayHours += dayHours(d);
        totalHours += dayHours(d);
      }
    }
    if (e.prevSaturday?.active) {
      activeDays++;
      totalHours += dayHours(e.prevSaturday);
    }
  }
  return {
    employees: arr.length,
    activeDays,
    weekdayActive,
    weekdayHours: +weekdayHours.toFixed(1),
    totalHours: +totalHours.toFixed(1),
  };
}

const config = getSupabaseConfig(loadEnv());
const keys = ["kw-week-employees", "kw-weekFrom", "kw-weekTo"];

console.log("=== Faza 0: Snapshot ===");
const before = await fetchKvBackup(keys, config);
const snapshot = {
  capturedAt: new Date().toISOString(),
  purpose: "before-restore-194h",
  ...Object.fromEntries(keys.map((k) => [k, before[k]])),
  statsBefore: payrollStats(before["kw-week-employees"]),
};
writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2), "utf8");
console.log("Snapshot saved:", SNAPSHOT);
console.log("Stats before:", snapshot.statsBefore);

const backup = JSON.parse(readFileSync(BACKUP, "utf8"));
const restoreKeys = ["kw-week-employees", "kw-weekFrom", "kw-weekTo"];
const restoreValues = restoreKeys.map((k) => backup[k]);
console.log("\nBackup week:", backup["kw-weekFrom"], backup["kw-weekTo"]);
console.log("Backup stats:", payrollStats(backup["kw-week-employees"]));

if (dryRun) {
  console.log("\nDRY RUN — no batch-set");
  process.exit(0);
}

console.log("\n=== Faza 1: Restore ===");
const base = `https://${config.projectId}.supabase.co/functions/v1/${config.slug}`;
const body = {
  keys: restoreKeys,
  values: restoreValues,
  replaceWeekEmployeesKeys: ["kw-week-employees"],
};
const res = await fetch(`${base}/batch-set`, {
  method: "POST",
  headers: apiHeaders(config.anonKey),
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  console.error("batch-set FAIL:", res.status, text);
  process.exit(1);
}
console.log("batch-set OK:", text.slice(0, 200));

console.log("\n=== Faza 2: Weryfikacja ===");
const after = await fetchKvBackup(
  [...keys, "kw-jobs", "kw-directory", "kw-archive", "kw-admin-passwords"],
  config,
);
const statsAfter = payrollStats(after["kw-week-employees"]);
console.log("Stats after:", statsAfter);
console.log("Other keys unchanged check:", {
  jobs: after["kw-jobs"]?.length,
  directory: after["kw-directory"]?.length,
  archive: after["kw-archive"]?.length,
  adminPasswordsKeys: Object.keys(after["kw-admin-passwords"] || {}).length,
  weekFrom: after["kw-weekFrom"],
  weekTo: after["kw-weekTo"],
});

const pass =
  statsAfter.employees === 12 &&
  statsAfter.weekdayActive === 22 &&
  statsAfter.weekdayHours >= 193 &&
  statsAfter.weekdayHours <= 195;

console.log("\nRESTORE_VERDICT:", pass ? "PASS" : "FAIL");
console.log(JSON.stringify({ snapshot: SNAPSHOT, statsBefore: snapshot.statsBefore, statsAfter, pass }, null, 2));
