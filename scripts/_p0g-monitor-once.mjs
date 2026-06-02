/**
 * P0G — read-only post-restore monitoring (4 samples, 5 min apart). No writes.
 * Usage: node scripts/_p0g-monitor-once.mjs
 */
import { createHash } from "crypto";
import { fetchKvBackup, loadEnv, getSupabaseConfig } from "./backup-lib.mjs";

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
  let maxUpdatedAt = null;
  for (const e of arr) {
    if (e?.dataUpdatedAt) {
      const t = Date.parse(e.dataUpdatedAt);
      if (!Number.isNaN(t) && (!maxUpdatedAt || t > Date.parse(maxUpdatedAt))) maxUpdatedAt = e.dataUpdatedAt;
    }
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
    maxUpdatedAt,
  };
}
function fingerprint(list) {
  return createHash("sha256").update(JSON.stringify(list ?? null)).digest("hex").slice(0, 16);
}

const config = getSupabaseConfig(loadEnv());
const keys = ["kw-week-employees", "kw-weekFrom", "kw-weekTo"];
const labels = ["T0", "T+5", "T+10", "T+15"];
const intervalMs = 5 * 60 * 1000;
const start = Date.now();
const samples = [];

for (let i = 0; i < 4; i++) {
  if (i > 0) await new Promise((r) => setTimeout(r, intervalMs));
  const ts = new Date().toISOString();
  const kv = await fetchKvBackup(keys, config);
  const stats = payrollStats(kv["kw-week-employees"]);
  const fp = fingerprint(kv["kw-week-employees"]);
  const prev = samples[i - 1];
  const dataChanged = prev ? fp !== prev.fingerprint : false;
  samples.push({
    label: labels[i],
    ts,
    elapsedMin: +((Date.now() - start) / 60000).toFixed(1),
    weekFrom: kv["kw-weekFrom"],
    weekTo: kv["kw-weekTo"],
    ...stats,
    fingerprint: fp,
    dataChangedSincePrev: dataChanged,
    batchSetLikely: dataChanged,
  });
}

const anyChange = samples.some((s, i) => i > 0 && s.dataChangedSincePrev);
console.log(
  JSON.stringify(
    {
      monitoring: "P0G post-restore read-only",
      startIso: new Date(start).toISOString(),
      endIso: new Date().toISOString(),
      intervalMinutes: 5,
      baselineFingerprint: samples[0].fingerprint,
      anyBatchSetLikely: anyChange,
      samples,
    },
    null,
    2,
  ),
);
