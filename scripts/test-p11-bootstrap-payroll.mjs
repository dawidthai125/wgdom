/**
 * P11 — unit: local 0h vs cloud 194h → bootstrap merge = 194h
 * Run: npx vite-node scripts/test-p11-bootstrap-payroll.mjs
 */
import { readFileSync } from "fs";
import {
  DATA_KEYS,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  payrollMetrics,
} from "../src/lib/cloud-sync.ts";

const backup = JSON.parse(
  readFileSync("backups/auto/wgdom-full-2026-06-02T07-51-08/kv-data.json", "utf8"),
);
const cloudEmps = backup["kw-week-employees"];
const weekFrom = backup["kw-weekFrom"];
const weekTo = backup["kw-weekTo"];

function weekdayHours(list) {
  const arr = Array.isArray(list) ? list : [];
  let h = 0;
  const parse = (t) => {
    const m = String(t || "").match(/^(\d+):(\d+)$/);
    return m ? +m[1] * 60 + +m[2] : null;
  };
  for (const e of arr) {
    for (const d of Object.values(e.days || {})) {
      if (d?.active) {
        const f = parse(d.from);
        const to = parse(d.to);
        if (f != null && to != null && to > f) h += (to - f) / 60;
      }
    }
  }
  return +h.toFixed(1);
}

const staleLocal = cloudEmps.map((e) => ({
  ...e,
  days: Object.fromEntries(Object.entries(e.days || {}).map(([k, d]) => [k, { ...d, active: false }])),
  prevSaturday: { ...(e.prevSaturday || {}), active: false },
  dataUpdatedAt: "2026-06-02T12:00:00.000Z",
}));

const localValues = DATA_KEYS.map((k) => {
  if (k === "kw-week-employees") return staleLocal;
  if (k === "kw-weekFrom") return weekFrom;
  if (k === "kw-weekTo") return weekTo;
  return null;
});
const cloudValues = DATA_KEYS.map((k) => {
  if (k === "kw-week-employees") return cloudEmps;
  if (k === "kw-weekFrom") return weekFrom;
  if (k === "kw-weekTo") return weekTo;
  return null;
});

let merged = mergeAllDataKeys(localValues, cloudValues);
merged = applyBootstrapPayrollMerge(merged, localValues, cloudValues);

const empIdx = DATA_KEYS.indexOf("kw-week-employees");
const result = merged[empIdx];
const metrics = payrollMetrics(result);

const pass =
  Array.isArray(result) &&
  result.length === 12 &&
  metrics.activeDays >= 22 &&
  weekdayHours(result) === 194 &&
  result[0]?.days?.Pn?.active === true;

console.log(
  JSON.stringify(
    {
      test: "P11 bootstrap payroll",
      localBefore: { ...payrollMetrics(staleLocal), weekdayHours: weekdayHours(staleLocal) },
      cloud: { ...payrollMetrics(cloudEmps), weekdayHours: weekdayHours(cloudEmps) },
      merged: { ...metrics, weekdayHours: weekdayHours(result), pnActive: result[0]?.days?.Pn?.active },
      pass,
    },
    null,
    2,
  ),
);
process.exit(pass ? 0 : 1);
