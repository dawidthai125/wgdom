/**
 * P11 — unit: local 0h vs cloud rich → bootstrap merge adopts cloud.
 * Run: npx vite-node scripts/test-p11-bootstrap-payroll.mjs
 *
 * CI-3: optional local backup under backups/ (gitignored). On CI / no backup,
 * use deterministic synthetic richRoster — never hard-depend on backups/.
 */
import { existsSync, readFileSync } from "fs";
import {
  DATA_KEYS,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  payrollMetrics,
} from "../src/lib/cloud-sync.ts";

const P11_BACKUP = "backups/auto/wgdom-full-2026-06-02T07-51-08/kv-data.json";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function inactiveDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}

function activeWeekday() {
  return { active: true, from: "07:00", to: "16:00", zaliczka: "" };
}

/** Deterministic CI-safe rich roster (Pn–Pt 9h). */
function richRoster(n = 12) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p11-emp-${i + 1}`,
    directoryId: `p11-dir-${i + 1}`,
    name: `Pracownik ${i + 1}`,
    phone: "",
    position: "Pracownik",
    rate: "50",
    settled: false,
    days: Object.fromEntries(
      DAYS.map((k) => [k, k === "So" ? inactiveDay() : activeWeekday()]),
    ),
    prevSaturday: inactiveDay(),
    extraCosts: [],
  }));
}

let cloudEmps;
let weekFrom;
let weekTo;
let fixtureSource;

if (existsSync(P11_BACKUP)) {
  const backup = JSON.parse(readFileSync(P11_BACKUP, "utf8"));
  cloudEmps = backup["kw-week-employees"];
  weekFrom = backup["kw-weekFrom"];
  weekTo = backup["kw-weekTo"];
  fixtureSource = "local-backup";
} else {
  console.warn(
    "P11: backups/ fixture missing — using synthetic richRoster (expected on CI).",
  );
  cloudEmps = richRoster(12);
  weekFrom = "2026-06-02";
  weekTo = "2026-06-07";
  fixtureSource = "synthetic";
}

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
  days: Object.fromEntries(
    Object.entries(e.days || {}).map(([k, d]) => [k, { ...d, active: false }]),
  ),
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
const cloudMetrics = payrollMetrics(cloudEmps);
const cloudHours = weekdayHours(cloudEmps);
const mergedHours = weekdayHours(result);
const localHours = weekdayHours(staleLocal);

const pass =
  Array.isArray(result) &&
  result.length === cloudEmps.length &&
  localHours === 0 &&
  cloudHours > 0 &&
  mergedHours === cloudHours &&
  metrics.activeDays >= cloudMetrics.activeDays &&
  metrics.activeDays >= 22 &&
  result[0]?.days?.Pn?.active === true;

console.log(
  JSON.stringify(
    {
      test: "P11 bootstrap payroll",
      fixtureSource,
      localBefore: { ...payrollMetrics(staleLocal), weekdayHours: localHours },
      cloud: { ...cloudMetrics, weekdayHours: cloudHours },
      merged: {
        ...metrics,
        weekdayHours: mergedHours,
        pnActive: result[0]?.days?.Pn?.active,
        length: Array.isArray(result) ? result.length : null,
      },
      pass,
    },
    null,
    2,
  ),
);
process.exit(pass ? 0 : 1);
