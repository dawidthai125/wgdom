import type { Page } from "@playwright/test";
import type { HarnessRunManifest } from "./manifest";
import type { PayrollHarnessTarget } from "../../../fixtures/payroll-harness-seed";
import { runHarnessCleanupViaSsot } from "./ssot-bridge.mjs";

export interface CleanupOptions {
  target: PayrollHarnessTarget;
}

export interface CleanupReport {
  runId: string;
  removed: { workEntries: number; weekEmployees: number; directory: number };
  tombstonesWritten: number;
  cloudPushed: string[];
  success: boolean;
}

/** Node-side helper for recording work entries created during scenario (#025) */
export function recordWorkEntryInManifest(
  manifest: HarnessRunManifest,
  jobId: string,
  entryId: string,
): void {
  if (!manifest.workEntryIds.includes(entryId)) manifest.workEntryIds.push(entryId);
  if (!manifest.touchedJobIds.includes(jobId)) manifest.touchedJobIds.push(jobId);
  const exists = manifest.workEntryTombstoneIds.some(
    (t) => t.jobId === jobId && t.entryId === entryId,
  );
  if (!exists) manifest.workEntryTombstoneIds.push({ jobId, entryId });
}

export function syncManifestWorkEntriesFromJobs(
  manifest: HarnessRunManifest,
  jobs: Array<{ id: string; workEntries?: { id: string }[] }>,
  jobIds: string[],
): void {
  for (const job of jobs) {
    if (!jobIds.includes(job.id)) continue;
    for (const entry of job.workEntries ?? []) {
      recordWorkEntryInManifest(manifest, job.id, entry.id);
    }
  }
}

export async function cleanupPayrollScenario(
  page: Page,
  manifest: HarnessRunManifest,
  _opts: CleanupOptions,
): Promise<CleanupReport> {
  const report: CleanupReport = {
    runId: manifest.runId,
    removed: { workEntries: 0, weekEmployees: 0, directory: 0 },
    tombstonesWritten: 0,
    cloudPushed: [],
    success: false,
  };

  try {
    const raw = await page.evaluate(() => ({
      jobsJson: localStorage.getItem("kw-jobs") || "[]",
      directoryJson: localStorage.getItem("kw-directory") || "[]",
      weekEmployeesJson: localStorage.getItem("kw-week-employees") || "[]",
    }));

    const cleaned = runHarnessCleanupViaSsot({ ...raw, manifest });

    await page.evaluate(
      ({ jobsJson, directoryJson, weekEmployeesJson }) => {
        localStorage.setItem("kw-jobs", jobsJson);
        localStorage.setItem("kw-directory", directoryJson);
        localStorage.setItem("kw-week-employees", weekEmployeesJson);
        sessionStorage.removeItem("wgdom-harness-manifest");
      },
      cleaned,
    );

    report.removed = cleaned.removed;
    report.tombstonesWritten = cleaned.tombstonesWritten;
    report.success = true;
  } catch {
    report.success = false;
  }

  return report;
}
