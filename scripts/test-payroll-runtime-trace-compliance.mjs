/**
 * PAYROLL Runtime Trace — audit zgodności emitterów v1.1 (statyczny + smoke).
 * Run: npx vite-node scripts/test-payroll-runtime-trace-compliance.mjs
 */
import { readFileSync } from "fs";

const REQUIRED_HOOKS = [
  { event: "payroll.roster.ui.add", file: "App.tsx" },
  { event: "payroll.roster.ui.add_filtered", file: "App.tsx" },
  { event: "payroll.roster.push.schedule", file: "App.tsx" },
  { event: "payroll.guard.mutation.begin", file: "cloud-sync-mutation-guard.ts" },
  { event: "payroll.roster.ls.write", file: "cloud-sync.ts" },
  { event: "payroll.roster.push.start", file: "cloud-sync.ts" },
  { event: "sync.http.batch_set.attempt", file: "cloud-sync.ts" },
  { event: "edge.kv.week_employees.write", file: "cloud-sync.ts" },
  { event: "sync.http.batch_get.result", file: "cloud-sync.ts" },
  { event: "sync.pull.bundle.start", file: "cloud-sync.ts" },
  { event: "sync.merge.bundle.start", file: "cloud-sync.ts" },
  { event: "sync.merge.all_keys.week_employees", file: "cloud-sync.ts" },
  { event: "sync.merge.payroll.finalize", file: "cloud-sync.ts" },
  { event: "sync.apply.admin_bundle", file: "App.tsx" },
  { event: "payroll.roster.state.commit", file: "App.tsx" },
  { event: "payroll.roster.filter_production", file: "App.tsx" },
  { event: "sync.run.start", file: "App.tsx" },
  { event: "sync.pull.focus.start", file: "App.tsx" },
  { event: "sync.bootstrap.start", file: "CloudLoader.tsx" },
  { event: "sync.bootstrap.payroll.finalize", file: "cloud-sync.ts" },
  { event: "sync.bootstrap.push.decision", file: "CloudLoader.tsx" },
  { event: "sync.bootstrap.kv_push", file: "CloudLoader.tsx" },
  { event: "sync.bootstrap.ls.persist", file: "CloudLoader.tsx" },
  { event: "sync.merge.tombstones.week_employees", file: "cloud-sync.ts" },
  { event: "sync.merge.week_range.pick_side", file: "cloud-sync.ts" },
  { event: "sync.merge.payroll.anti_leak", file: "cloud-sync.ts" },
  { event: "sync.guard.payroll.before_push", file: "cloud-sync.ts" },
  { event: "sync.rs.push.start", file: "cloud-sync.ts" },
  { event: "sync.rs.push.filtered", file: "cloud-sync.ts" },
  { event: "payroll.roster.collapse", file: "cloud-sync.ts" },
  { event: "payroll.roster.display.resolve", file: "payroll-display.ts" },
  { event: "sync.auto.schedule", file: "App.tsx" },
  { event: "__wgdomPayrollTraceDump", file: "payroll-runtime-trace.ts" },
];

let pass = 0;
let fail = 0;

for (const { event, file } of REQUIRED_HOOKS) {
  const path = file.startsWith("src/") ? file : `src/${file.includes("/") ? file : file.startsWith("app") ? `app/${file}` : `lib/${file}`}`;
  const candidates = [
    `src/app/${file}`,
    `src/lib/${file}`,
    `src/${file}`,
  ];
  let content = "";
  for (const p of candidates) {
    try {
      content = readFileSync(p, "utf8");
      break;
    } catch { /* try next */ }
  }
  const needle = event === "__wgdomPayrollTraceDump" ? "__wgdomPayrollTraceDump" : event;
  const ok = content.includes(needle);
  if (ok) {
    pass++;
    console.log("PASS", event, "→", file);
  } else {
    fail++;
    console.log("FAIL", event, "→", file);
  }
}

const traceLib = readFileSync("src/lib/payroll-runtime-trace.ts", "utf8");
const ringOk = traceLib.includes("RING_MAX = 300");
const dumpOk = traceLib.includes("payrollTraceDump");
console.log(ringOk ? "PASS ring buffer 300" : "FAIL ring buffer");
console.log(dumpOk ? "PASS dump API" : "FAIL dump API");
if (!ringOk) fail++;
if (!dumpOk) fail++;
if (ringOk) pass++;
if (dumpOk) pass++;

console.log(`\nCOMPLIANCE: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
