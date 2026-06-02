/**
 * P3 — restore kw-week-employees from kw-week-employees-prev (one-shot)
 * Usage: node scripts/_p3-restore-from-prev.mjs [--dry-run] [--monitor-only]
 */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { fetchKvBackup, loadEnv, getSupabaseConfig, apiHeaders } from "./backup-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SNAPSHOT = resolve(root, "before-payroll-restore-guarded.json");
const dryRun = process.argv.includes("--dry-run");
const monitorOnly = process.argv.includes("--monitor-only");

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
function payrollStats(list) {
  const arr = Array.isArray(list) ? list : [];
  let activeDays = 0;
  let weekdayActive = 0;
  let weekdayHours = 0;
  let totalHours = 0;
  let settledTrue = 0;
  for (const e of arr) {
    if (e?.settled === true) settledTrue++;
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
    settledTrue,
  };
}
function wouldBlockPayrollShrink(cloud, outgoing) {
  const c = payrollStats(cloud);
  const o = payrollStats(outgoing);
  if (c.activeDays >= 4 && o.activeDays < c.activeDays * 0.5) return true;
  if (c.totalHours >= 8 && o.totalHours < c.totalHours * 0.5) return true;
  return false;
}
function fp(list) {
  return createHash("sha256").update(JSON.stringify(list ?? null)).digest("hex").slice(0, 16);
}

const READ_KEYS = [
  "kw-week-employees",
  "kw-week-employees-prev",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-directory",
  "kw-archive",
];
const config = getSupabaseConfig(loadEnv());

async function sample(label) {
  const kv = await fetchKvBackup(["kw-week-employees", "kw-weekFrom", "kw-weekTo"], config);
  const stats = payrollStats(kv["kw-week-employees"]);
  return {
    label,
    ts: new Date().toISOString(),
    weekFrom: kv["kw-weekFrom"],
    weekTo: kv["kw-weekTo"],
    ...stats,
    fingerprint: fp(kv["kw-week-employees"]),
  };
}

if (!monitorOnly) {
  console.log("=== Faza 0: Snapshot ===");
  const before = await fetchKvBackup(READ_KEYS, config);
  const statsMain = payrollStats(before["kw-week-employees"]);
  const statsPrev = payrollStats(before["kw-week-employees-prev"]);
  const snapshot = {
    capturedAt: new Date().toISOString(),
    purpose: "before-payroll-restore-guarded",
    "kw-week-employees": before["kw-week-employees"],
    "kw-week-employees-prev": before["kw-week-employees-prev"],
    "kw-weekFrom": before["kw-weekFrom"],
    "kw-weekTo": before["kw-weekTo"],
    statsMain,
    statsPrev,
    otherKeys: {
      jobs: before["kw-jobs"]?.length,
      directory: before["kw-directory"]?.length,
      archive: before["kw-archive"]?.length,
    },
  };
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log("Snapshot saved:", SNAPSHOT);
  console.log("Main:", statsMain);
  console.log("Prev:", statsPrev);

  const prevOk =
    statsPrev.weekdayActive >= 20 &&
    statsPrev.weekdayHours >= 190 &&
    statsPrev.weekdayHours <= 200;
  if (!prevOk) {
    console.error("ABORT: prev nie ma ~194h / ~22 dni:", statsPrev);
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDRY RUN — no batch-set");
    process.exit(0);
  }

  console.log("\n=== Faza 1: Restore from prev ===");
  const base = `https://${config.projectId}.supabase.co/functions/v1/${config.slug}`;
  const restoreValue = before["kw-week-employees-prev"];
  const res = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers: apiHeaders(config.anonKey),
    body: JSON.stringify({
      keys: ["kw-week-employees"],
      values: [restoreValue],
      replaceWeekEmployeesKeys: ["kw-week-employees"],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("batch-set FAIL:", res.status, text);
    process.exit(1);
  }
  console.log("batch-set OK:", text);

  console.log("\n=== Faza 2: Weryfikacja ===");
  const after = await fetchKvBackup(READ_KEYS, config);
  const statsAfter = payrollStats(after["kw-week-employees"]);
  console.log("Stats after:", statsAfter);
  console.log("Other keys:", {
    jobs: after["kw-jobs"]?.length,
    directory: after["kw-directory"]?.length,
    archive: after["kw-archive"]?.length,
    prevStats: payrollStats(after["kw-week-employees-prev"]),
  });
  const pass =
    statsAfter.employees === 12 &&
    statsAfter.weekdayActive >= 20 &&
    statsAfter.weekdayHours >= 190 &&
    statsAfter.settledTrue === 0;
  console.log("Faza 2 verdict:", pass ? "PASS" : "FAIL");
}

console.log("\n=== Faza 3: Monitoring (T0, T+5, T+10) ===");
const strippedProbe = (full) => {
  const s = JSON.parse(JSON.stringify(full));
  for (const e of s) {
    for (const d of Object.values(e.days || {})) if (d) d.active = false;
    if (e.prevSaturday) e.prevSaturday.active = false;
  }
  return s;
};

const monitor = [];
for (let i = 0; i < 3; i++) {
  if (i > 0) await new Promise((r) => setTimeout(r, 5 * 60 * 1000));
  const s = await sample(["T0", "T+5", "T+10"][i]);
  const kv = await fetchKvBackup(["kw-week-employees"], config);
  s.guardWouldBlock194to0 = wouldBlockPayrollShrink(kv["kw-week-employees"], strippedProbe(kv["kw-week-employees"]));
  if (monitor.length > 0) s.changedSincePrev = s.fingerprint !== monitor[i - 1].fingerprint;
  monitor.push(s);
  console.log(s);
}

const report = {
  snapshotCreated: !monitorOnly,
  snapshotPath: SNAPSHOT,
  restoreExecuted: !monitorOnly && !dryRun,
  monitoring: monitor,
  guardBlocks194to0: monitor.every((m) => m.guardWouldBlock194to0),
  stable10min: monitor[0].fingerprint === monitor[2].fingerprint,
  pass:
    (!monitorOnly || monitor[0].weekdayHours >= 190) &&
    monitor[2].weekdayHours >= 190 &&
    monitor[2].weekdayActive >= 20 &&
    monitor[0].fingerprint === monitor[2].fingerprint,
};
console.log("\n=== RAPORT P3 ===");
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
