/**
 * Sprint 20.1C.1 — payroll rollover sync integrity
 * Uruchom: npx vite-node scripts/smoke-test-payroll-rollover-sync-20.1c1.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  sanitizeWeekEmployeesForTargetRange,
  mergeWeekEmployeesForWeekRange,
  payrollMetrics,
  wouldBlockPayrollShrink,
  evaluatePayrollGuardBeforePush,
  pushPayrollWeekAfterRollover,
} from "../src/lib/cloud-sync.ts";

const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = { from: "2026-06-08", to: "2026-06-13" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" },
    ]),
  );
}

function emptyDays() {
  const d = defaultDay();
  return Object.fromEntries(DAYS.map((k) => [k, { ...d }]));
}

function makeEmp(id, name, days = defaultDays()) {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days,
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
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

function bundle(overrides = {}) {
  return DATA_KEYS.map((k) => {
    if (k === "kw-week-employees") return overrides.emps ?? null;
    if (k === "kw-weekFrom") return overrides.from ?? null;
    if (k === "kw-weekTo") return overrides.to ?? null;
    if (k === "kw-archive") return overrides.archive ?? [];
    return null;
  });
}

function bootstrapMerge(localOverrides, cloudOverrides) {
  const localValues = bundle(localOverrides);
  const cloudValues = bundle(cloudOverrides);
  let merged = mergeAllDataKeys(localValues, cloudValues);
  merged = applyBootstrapPayrollMerge(merged, localValues, cloudValues);
  return { merged, localValues, cloudValues };
}

const richCloud = Array.from({ length: 11 }, (_, i) =>
  makeEmp(`old-${i}`, `Pracownik ${i + 1}`),
);

const freshLocal = Array.from({ length: 11 }, (_, i) =>
  makeEmp(`new-${i}`, `Pracownik ${i + 1}`, emptyDays()),
);

async function run() {
  // —— T1: mismatch week range — no cloud hour adoption ——
  const t1 = (() => {
    const { merged } = bootstrapMerge(
      { from: W2.from, to: W2.to, emps: freshLocal },
      { from: W1.from, to: W1.to, emps: richCloud },
    );
    const empIdx = DATA_KEYS.indexOf("kw-week-employees");
    const result = merged[empIdx];
    const metrics = payrollMetrics(result);
    const hours = weekdayHours(result);
    const pnActive = result?.[0]?.days?.Pn?.active === true;
    const pass = Array.isArray(result) && metrics.activeDays <= 1 && hours < 10 && !pnActive;
    return { pass, metrics, hours, pnActive, count: result?.length ?? 0 };
  })();

  // —— T2: P11 regression — same week, local 0h, cloud rich — cloud wins ——
  const t2 = (() => {
    const staleLocal = richCloud.map((e) => ({
      ...e,
      days: Object.fromEntries(Object.entries(e.days || {}).map(([k, d]) => [k, { ...d, active: false }])),
      prevSaturday: { ...(e.prevSaturday || {}), active: false },
      dataUpdatedAt: "2026-06-02T12:00:00.000Z",
    }));
    const { merged } = bootstrapMerge(
      { from: W1.from, to: W1.to, emps: staleLocal },
      { from: W1.from, to: W1.to, emps: richCloud },
    );
    const empIdx = DATA_KEYS.indexOf("kw-week-employees");
    const result = merged[empIdx];
    const metrics = payrollMetrics(result);
    const hours = weekdayHours(result);
    const pass =
      Array.isArray(result) &&
      result.length === 11 &&
      metrics.activeDays >= 20 &&
      hours >= 80 &&
      result[0]?.days?.Pn?.active === true;
    return { pass, metrics, hours, pnActive: result[0]?.days?.Pn?.active };
  })();

  // —— T3: rollover push — guard blocks [], skipPayrollGuard allows ——
  const guardBlocksEmpty = wouldBlockPayrollShrink(richCloud, []);
  const blockedWithoutSkip = await evaluatePayrollGuardBeforePush(
    ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"],
    [W2.from, W2.to, [], [{ weekFrom: W1.from, weekTo: W1.to, weekEmployees: richCloud }]],
    { replaceWeekEmployeesKeys: ["kw-week-employees"], cloudWeekEmployees: richCloud },
  );
  const allowedWithSkip = await evaluatePayrollGuardBeforePush(
    ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"],
    [W2.from, W2.to, [], []],
    { replaceWeekEmployeesKeys: ["kw-week-employees"], skipPayrollGuard: true, cloudWeekEmployees: richCloud },
  );
  const t3 = {
    pass:
      guardBlocksEmpty &&
      blockedWithoutSkip.blocked &&
      !allowedWithSkip.blocked &&
      allowedWithSkip.keys.includes("kw-week-employees") &&
      typeof pushPayrollWeekAfterRollover === "function",
    guardBlocksEmpty,
    blockedWithoutSkip,
    allowedWithSkip,
  };

  // —— T4: refresh roster — guard blocks shrink, skipPayrollGuard allows ——
  const guardBlocksRoster = wouldBlockPayrollShrink(richCloud, freshLocal);
  const t4Blocked = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [freshLocal],
    { replaceWeekEmployeesKeys: ["kw-week-employees"], cloudWeekEmployees: richCloud },
  );
  const t4Allowed = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [freshLocal],
    { replaceWeekEmployeesKeys: ["kw-week-employees"], skipPayrollGuard: true, cloudWeekEmployees: richCloud },
  );
  const t4 = {
    pass:
      guardBlocksRoster &&
      t4Blocked.blocked &&
      !t4Allowed.blocked &&
      t4Allowed.keys.includes("kw-week-employees"),
    guardBlocksRoster,
    blocked: t4Blocked,
    allowed: t4Allowed,
  };

  // —— T5: sanitize mismatch — strip hours ——
  const stripped = mergeWeekEmployeesForWeekRange(
    W2.from,
    W2.to,
    W2.from,
    W2.to,
    freshLocal,
    W1.from,
    W1.to,
    richCloud,
    [],
  );
  const stripMetrics = payrollMetrics(stripped);
  const sanitized = sanitizeWeekEmployeesForTargetRange(
    bundle({ from: W2.from, to: W2.to, emps: freshLocal }),
    bundle({ from: W2.from, to: W2.to, emps: freshLocal }),
    bundle({ from: W1.from, to: W1.to, emps: richCloud }),
  );
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const sanitizedMetrics = payrollMetrics(sanitized[empIdx]);
  const t5 = {
    pass: stripMetrics.activeDays === 0 && sanitizedMetrics.activeDays === 0,
    stripMetrics,
    sanitizedMetrics,
  };

  const results = { T1: t1, T2: t2, T3: t3, T4: t4, T5: t5 };
  const allPass = Object.values(results).every((r) => r.pass);

  console.log(
    JSON.stringify(
      {
        sprint: "20.1C.1",
        test: "payroll-rollover-sync",
        results,
        allPass,
        passCount: Object.values(results).filter((r) => r.pass).length,
        total: Object.keys(results).length,
      },
      null,
      2,
    ),
  );

  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
