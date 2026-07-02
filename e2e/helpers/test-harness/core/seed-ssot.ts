/**
 * TEST-INFRA-001 L1 — SSOT seed builder (#015) — vite-node only, not Playwright bundle.
 */
import {
  dayBaseHoursOnly,
  defaultDays,
  defaultDirEmployee,
  defaultJob,
  weekEmployeeFromDir,
  type DirectoryEmployee,
  type Job,
  type WeekEmployee,
} from "@/app/app-domain";
import { addWorkEntryForEmployee } from "@/lib/payroll-job-assignments";
import { mergeJobsById, normalizeJobsValue } from "@/lib/cloud-sync";
import { currentWeekRange, hashAdminPassword } from "../../../fixtures/e2e-seed";
import {
  createEmptyManifest,
  HarnessPreconditionError,
  type HarnessRunManifest,
} from "./manifest";
import {
  E2E_PAYROLL_ADMIN_PASS,
  E2E_PAYROLL_DIR_ID,
  E2E_PAYROLL_JOB_A_ID,
  E2E_PAYROLL_JOB_B_ID,
  E2E_PAYROLL_WE_ID,
  HARNESS_MARKER,
  type PayrollAssignmentSeedResult,
  type SeedPayrollAssignmentOptions,
} from "../../../fixtures/payroll-harness-seed";

function buildHarnessSyntheticJob(id: string, address: string, flat: string): Job {
  return {
    ...defaultJob(),
    id,
    address,
    flatNumber: flat,
    notes: HARNESS_MARKER,
    client: "Harness Client",
  };
}

function buildHarnessDirectoryEntry(empName: string, weekFrom: string): DirectoryEmployee {
  return {
    ...defaultDirEmployee(),
    id: E2E_PAYROLL_DIR_ID,
    name: empName,
    phone: "+48501112299",
    position: "Murarz harness",
    defaultRate: "100",
    startDate: weekFrom,
    active: true,
    notes: HARNESS_MARKER,
    testAccount: false,
  };
}

function buildHarnessWeekEmployee(dir: DirectoryEmployee): WeekEmployee {
  const days = defaultDays();
  days.Pn = { active: true, from: "07:00", to: "15:00", zaliczka: "" };
  return {
    ...weekEmployeeFromDir(dir),
    id: E2E_PAYROLL_WE_ID,
    days,
  };
}

function recordSeededWorkEntry(
  manifest: HarnessRunManifest,
  jobs: Job[],
  jobId: string,
): void {
  const job = jobs.find((j) => j.id === jobId);
  const entry = job?.workEntries?.[job.workEntries.length - 1];
  if (!entry) return;
  if (!manifest.workEntryIds.includes(entry.id)) manifest.workEntryIds.push(entry.id);
  if (!manifest.touchedJobIds.includes(jobId)) manifest.touchedJobIds.push(jobId);
  manifest.workEntryTombstoneIds.push({ jobId, entryId: entry.id });
}

export function buildPayrollHarnessSeed(
  opts: SeedPayrollAssignmentOptions,
): PayrollAssignmentSeedResult {
  const runId = opts.runId ?? `payroll-${Date.now()}`;
  const target = opts.target;
  const { from, to } =
    opts.weekFrom && opts.weekTo ? { from: opts.weekFrom, to: opts.weekTo } : currentWeekRange();

  const empName = "Harness Payroll Worker";
  const directoryEntry = buildHarnessDirectoryEntry(empName, from);
  const weekEmp = buildHarnessWeekEmployee(directoryEntry);
  const assignmentDateIso = from;

  const jobA = buildHarnessSyntheticJob(E2E_PAYROLL_JOB_A_ID, "Harness Ulica Alfa", "1");
  const jobB = buildHarnessSyntheticJob(E2E_PAYROLL_JOB_B_ID, "Harness Ulica Beta", "2");

  // TI-B2.1 — inwariant bezpieczeństwa seeda (Node-side, fail-loud).
  // Strategia Preview First: seed dozwolony WYŁĄCZNIE dla target=preview.
  // Każdy inny target (localhost/prod/nieznany) blokuje generację seeda.
  if (target !== "preview") {
    throw new HarnessPreconditionError(
      "UNSAFE_TARGET",
      `Payroll harness seed dozwolony wyłącznie dla target=preview (otrzymano: ${target}) #TI-B2.1`,
    );
  }

  const manifest = createEmptyManifest(runId, target, "PAYROLL-GUARD-S1");
  manifest.directoryIds.push(directoryEntry.id);
  manifest.weekEmployeeIds.push(weekEmp.id);
  manifest.touchedJobIds.push(jobA.id, jobB.id);
  manifest.keysWritten.push(
    "kw-directory",
    "kw-week-employees",
    "kw-weekFrom",
    "kw-weekTo",
    "kw-jobs",
    "kw-admin-passwords",
    "kw-archive",
  );

  let jobs: Job[] = [jobA, jobB];
  if (opts.mode === "withEntryOnJobA") {
    const hours = dayBaseHoursOnly(weekEmp.days.Pn) || 8;
    jobs = addWorkEntryForEmployee(jobs, jobA.id, weekEmp, from, hours);
    recordSeededWorkEntry(manifest, jobs, jobA.id);
  }

  jobs = mergeJobsById([], normalizeJobsValue(jobs)) as Job[];

  const adminHash = hashAdminPassword("Dawid", E2E_PAYROLL_ADMIN_PASS);

  const localStoragePatch: Record<string, string> = {
    "kw-directory": JSON.stringify([directoryEntry]),
    "kw-week-employees": JSON.stringify([weekEmp]),
    "kw-weekFrom": JSON.stringify(from),
    "kw-weekTo": JSON.stringify(to),
    "kw-jobs": JSON.stringify(jobs),
    "kw-admin-passwords": JSON.stringify({ dawid: adminHash }),
    "kw-archive": JSON.stringify([]),
  };

  return {
    manifest,
    empName,
    weekEmployeeId: weekEmp.id,
    directoryId: directoryEntry.id,
    weekFrom: from,
    weekTo: to,
    jobAId: jobA.id,
    jobBId: jobB.id,
    assignmentDateIso,
    adminHash,
    localStoragePatch,
  };
}
