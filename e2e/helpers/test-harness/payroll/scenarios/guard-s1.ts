import { expect, type Page } from "@playwright/test";
import type { PayrollAssignmentSeedResult } from "../../../../fixtures/payroll-harness-seed";
import { syncManifestWorkEntriesFromJobs } from "../../core/cleanup";
import type { HarnessRunManifest } from "../../core/manifest";
import { ScenarioFail } from "../../core/manifest";
import {
  assertAssignmentJobSelected,
  clickDodajRobocizne,
  collectHarnessWorkEntriesFromStorage,
  countWorkEntriesOnJob,
  openPayrollAssignmentsPanel,
  selectAssignmentJob,
} from "../payroll-ui";

/**
 * PAYROLL-GUARD-S1 — L5
 * Preview: dodaj przydział, zmień robotę A→B, assert UI + localStorage.
 */
export async function runPayrollGuardS1(
  page: Page,
  seed: PayrollAssignmentSeedResult,
  manifest: HarnessRunManifest,
): Promise<void> {
  await openPayrollAssignmentsPanel(page, seed.empName);
  await clickDodajRobocizne(page);

  await selectAssignmentJob(page, seed.jobAId);
  await assertAssignmentJobSelected(page, seed.jobAId);

  await selectAssignmentJob(page, seed.jobBId);
  await assertAssignmentJobSelected(page, seed.jobBId);

  const entriesOnB = await countWorkEntriesOnJob(page, seed.jobBId);
  if (entriesOnB < 1) {
    throw new ScenarioFail("Work entry not persisted on job B after dropdown change");
  }

  await expect(page.getByText(/Spójne|✅/).first()).toBeVisible({ timeout: 10_000 });

  const storedEntries = await collectHarnessWorkEntriesFromStorage(page, [
    seed.jobAId,
    seed.jobBId,
  ]);
  syncManifestWorkEntriesFromJobs(manifest, storedEntries, [seed.jobAId, seed.jobBId]);
}
