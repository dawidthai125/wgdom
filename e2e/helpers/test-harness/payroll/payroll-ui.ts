import { expect, type Page } from "@playwright/test";
import type { PayrollAssignmentSeedResult } from "../../../fixtures/payroll-harness-seed";

export async function openPayrollAssignmentsPanel(
  page: Page,
  empName: string,
): Promise<void> {
  const onPayroll = await page.getByRole("heading", { name: "Lista Płac", level: 2 }).isVisible().catch(() => false);
  if (!onPayroll) {
    const sidebar = page.locator("nav.admin-sidebar-nav button").filter({
      has: page.locator("span.flex-1", { hasText: /^Lista Płac$/i }),
    });
    if (await sidebar.count()) {
      await sidebar.first().click({ timeout: 15_000 });
    } else {
      await page.getByRole("button", { name: /Lista Płac/i }).first().click({ timeout: 15_000 });
    }
  }

  await page.getByRole("tab", { name: /Przydziały robót/i }).click({ timeout: 20_000 });
  const empRow = page.locator("div.cursor-pointer, tr").filter({ hasText: empName }).first();
  await empRow.click({ timeout: 20_000 });
  await expect(page.getByText(empName).first()).toBeVisible({ timeout: 15_000 });
}

export async function clickDodajRobocizne(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Dodaj robociznę/i }).first().click({ timeout: 10_000 });
}

export async function selectAssignmentJob(
  page: Page,
  jobId: string,
): Promise<void> {
  const select = page.locator('select').filter({ has: page.locator(`option[value="${jobId}"]`) }).first();
  await select.selectOption(jobId);
}

export async function assertAssignmentJobSelected(
  page: Page,
  jobId: string,
): Promise<void> {
  const select = page.locator('select').filter({ has: page.locator(`option[value="${jobId}"]`) }).first();
  await expect(select).toHaveValue(jobId, { timeout: 5_000 });
}

export async function readWorkEntryJobIdsFromStorage(
  page: Page,
  result: PayrollAssignmentSeedResult,
): Promise<string[]> {
  return page.evaluate(
    ({ jobAId, jobBId }) => {
      const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]") as {
        id: string;
        workEntries?: { id: string; employeeId?: string; directoryId?: string }[];
      }[];
      const ids: string[] = [];
      for (const j of jobs) {
        if (j.id !== jobAId && j.id !== jobBId) continue;
        for (const e of j.workEntries ?? []) ids.push(j.id);
      }
      return ids;
    },
    { jobAId: result.jobAId, jobBId: result.jobBId },
  );
}

export async function countWorkEntriesOnJob(
  page: Page,
  jobId: string,
): Promise<number> {
  return page.evaluate((jid) => {
    const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]") as {
      id: string;
      workEntries?: unknown[];
    }[];
    const job = jobs.find((j) => j.id === jid);
    return job?.workEntries?.length ?? 0;
  }, jobId);
}

export async function collectHarnessWorkEntriesFromStorage(
  page: Page,
  jobIds: string[],
): Promise<
  Array<{
    id: string;
    workEntries?: { id: string }[];
  }>
> {
  return page.evaluate((ids) => {
    const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]") as {
      id: string;
      workEntries?: { id: string }[];
    }[];
    return jobs.filter((j) => ids.includes(j.id));
  }, jobIds);
}
