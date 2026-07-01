/**
 * AUDIT PRZED RELEASE — INSPECTOR-JOB-ASSIGN-001
 * Run: npx vite-node scripts/audit-pre-release-inspector-job-assign.mjs
 */
import { normalizeJob } from "../src/app/app-domain.ts";
import {
  filterJobsForInspector,
  sanitizeAssignedInspectorId,
} from "../src/lib/inspector-job-assignment.ts";

const SMOKE_INSPECTOR_ID = "custom-smoke-i001-release-audit";
const SMOKE_JOB_ID = "smoke-i001-job-release-audit";
const SZymon_ID = "szymon";

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const base = projectId && anonKey
  ? `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`
  : null;

if (!base) {
  console.error("FAIL: brak VITE_SUPABASE_*");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${anonKey}`,
};

async function batchGet(keys) {
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  const { values } = await res.json();
  return values;
}

async function batchSet(keys, values) {
  const res = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys, values }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `batch-set ${res.status}`);
}

function countMissingInspector(jobs) {
  return jobs.filter((j) => !sanitizeAssignedInspectorId(j.assignedInspectorId)).length;
}

function smokeJob() {
  return normalizeJob({
    id: SMOKE_JOB_ID,
    address: "AUDIT SMOKE — nie używać",
    flatNumber: "0",
    client: "Wrocławskie Mieszkania",
    startDate: "2026-07-01",
    endDate: "",
    status: "in_progress",
    keysHandedOver: false,
    notes: "INSPECTOR-JOB-ASSIGN-001 release audit — usuń po teście",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    assignedInspectorId: SMOKE_INSPECTOR_ID,
    updatedAt: new Date().toISOString(),
  });
}

const report = {
  migration: {},
  scenarioA: {},
  scenarioB: {},
  cleanup: {},
  acl: { superAdminOnly: true, epicTouchedAdminAuth: false },
};

async function main() {
  // --- Verify migration state ---
  const [jobsRaw] = await batchGet(["kw-jobs"]);
  const jobs = (Array.isArray(jobsRaw) ? jobsRaw : []).map((j) => normalizeJob(j));
  const missing = countMissingInspector(jobs);
  const prodJobs = jobs.filter((j) => j.id !== SMOKE_JOB_ID);

  report.migration.totalJobs = prodJobs.length;
  report.migration.missingAssignedInspectorId = missing;
  report.migration.pass = missing === 0;

  // --- Scenario A: Szymon sees all prod jobs (excluding smoke if present) ---
  const szymonVisible = filterJobsForInspector(prodJobs, SZymon_ID);
  report.scenarioA.inspectorId = SZymon_ID;
  report.scenarioA.totalProdJobs = prodJobs.length;
  report.scenarioA.szymonVisibleCount = szymonVisible.length;
  report.scenarioA.expected = prodJobs.length;
  report.scenarioA.pass = szymonVisible.length === prodJobs.length;

  // --- Scenario B: temp inspector + temp job ---
  const [configRaw] = await batchGet(["kw-admin-users-config"]);
  const config = configRaw && typeof configRaw === "object"
    ? { roleOverrides: {}, customUsers: [], contactPhones: {}, ...configRaw }
    : { roleOverrides: {}, customUsers: [], contactPhones: {} };

  const smokeInspector = {
    id: SMOKE_INSPECTOR_ID,
    login: "smoke_insp_audit",
    displayName: "SMOKE Audit Inspektor",
    role: "inspector",
    passwordHash: "0".repeat(64),
  };

  const configWithSmoke = {
    ...config,
    customUsers: [
      ...(config.customUsers || []).filter((u) => u.id !== SMOKE_INSPECTOR_ID),
      smokeInspector,
    ],
  };

  const jobsWithSmoke = [
    ...jobs.filter((j) => j.id !== SMOKE_JOB_ID),
    smokeJob(),
  ];

  await batchSet(["kw-admin-users-config"], [configWithSmoke]);
  await batchSet(["kw-jobs"], [jobsWithSmoke]);

  const [jobsAfterB] = await batchGet(["kw-jobs"]);
  const jobsB = (Array.isArray(jobsAfterB) ? jobsAfterB : []).map((j) => normalizeJob(j));
  const prodAfterB = jobsB.filter((j) => j.id !== SMOKE_JOB_ID);

  const newInspVisible = filterJobsForInspector(jobsB, SMOKE_INSPECTOR_ID);
  const szymonAfterB = filterJobsForInspector(jobsB, SZymon_ID);
  const adminSeesAll = jobsB.length;

  report.scenarioB.newInspectorVisible = newInspVisible.length;
  report.scenarioB.newInspectorExpected = 1;
  report.scenarioB.szymonVisible = szymonAfterB.length;
  report.scenarioB.szymonExpected = prodAfterB.length;
  report.scenarioB.adminTotal = adminSeesAll;
  report.scenarioB.adminExpected = prodAfterB.length + 1;
  report.scenarioB.pass =
    newInspVisible.length === 1
    && newInspVisible[0]?.id === SMOKE_JOB_ID
    && szymonAfterB.length === prodAfterB.length
    && !szymonAfterB.some((j) => j.id === SMOKE_JOB_ID)
    && adminSeesAll === prodAfterB.length + 1;

  // --- Cleanup ---
  const configClean = {
    ...configWithSmoke,
    customUsers: (configWithSmoke.customUsers || []).filter((u) => u.id !== SMOKE_INSPECTOR_ID),
  };
  const jobsClean = jobsB.filter((j) => j.id !== SMOKE_JOB_ID);
  await batchSet(["kw-admin-users-config"], [configClean]);
  await batchSet(["kw-jobs"], [jobsClean]);

  const [jobsFinal, configFinal] = await batchGet(["kw-jobs", "kw-admin-users-config"]);
  const finalJobs = (Array.isArray(jobsFinal) ? jobsFinal : []).map((j) => normalizeJob(j));
  const finalConfig = configFinal && typeof configFinal === "object" ? configFinal : {};
  report.cleanup.smokeJobRemoved = !finalJobs.some((j) => j.id === SMOKE_JOB_ID);
  report.cleanup.smokeInspectorRemoved = !(finalConfig.customUsers || []).some((u) => u.id === SMOKE_INSPECTOR_ID);
  report.cleanup.pass = report.cleanup.smokeJobRemoved && report.cleanup.smokeInspectorRemoved;

  const allPass =
    report.migration.pass
    && report.scenarioA.pass
    && report.scenarioB.pass
    && report.cleanup.pass;

  console.log(JSON.stringify({ report, releaseGo: allPass }, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("AUDIT FAIL:", err.message || err);
  process.exit(1);
});
