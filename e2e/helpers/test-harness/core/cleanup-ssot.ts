/**
 * TEST-INFRA-001 — SSOT cleanup (#019) — vite-node only.
 */
import type { Job, WeekEmployee, DirectoryEmployee } from "@/app/app-domain";
import { removeWorkEntryFromJobs } from "@/lib/payroll-job-assignments";
import { normalizeJobsValue } from "@/lib/cloud-sync";
import type { HarnessRunManifest } from "./manifest";

export interface HarnessCleanupInput {
  jobsJson: string;
  directoryJson: string;
  weekEmployeesJson: string;
  manifest: HarnessRunManifest;
}

export interface HarnessCleanupOutput {
  jobsJson: string;
  directoryJson: string;
  weekEmployeesJson: string;
  removed: { workEntries: number; weekEmployees: number; directory: number };
  tombstonesWritten: number;
}

function removeWorkEntriesViaSsot(jobs: Job[], manifest: HarnessRunManifest): Job[] {
  let next = jobs;
  const seen = new Set<string>();

  for (const { jobId, entryId } of manifest.workEntryTombstoneIds) {
    const key = `${jobId}:${entryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next = removeWorkEntryFromJobs(next, jobId, entryId);
  }

  for (const entryId of manifest.workEntryIds) {
    const job = next.find((j) => j.workEntries?.some((e) => e.id === entryId));
    if (!job) continue;
    const key = `${job.id}:${entryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next = removeWorkEntryFromJobs(next, job.id, entryId);
  }

  return next;
}

export function applyHarnessCleanup(input: HarnessCleanupInput): HarnessCleanupOutput {
  let jobs = normalizeJobsValue(JSON.parse(input.jobsJson || "[]")) as Job[];
  jobs = removeWorkEntriesViaSsot(jobs, input.manifest);

  let directory = JSON.parse(input.directoryJson || "[]") as DirectoryEmployee[];
  const directoryBefore = directory.length;
  directory = directory.filter((d) => !input.manifest.directoryIds.includes(d.id));

  let weekEmployees = JSON.parse(input.weekEmployeesJson || "[]") as WeekEmployee[];
  const weekEmployeesBefore = weekEmployees.length;
  weekEmployees = weekEmployees.filter((w) => !input.manifest.weekEmployeeIds.includes(w.id));

  return {
    jobsJson: JSON.stringify(jobs),
    directoryJson: JSON.stringify(directory),
    weekEmployeesJson: JSON.stringify(weekEmployees),
    removed: {
      workEntries: input.manifest.workEntryIds.length,
      weekEmployees: weekEmployeesBefore - weekEmployees.length,
      directory: directoryBefore - directory.length,
    },
    tombstonesWritten: input.manifest.workEntryTombstoneIds.length,
  };
}
