import type { Page } from "@playwright/test";
import { blockCloudSync } from "../../jobs";
import { gotoLoginPick, loginAdmin } from "../../auth";
import { E2E_PAYROLL_ADMIN_PASS } from "../../../fixtures/payroll-harness-seed";
import { HarnessPreconditionError } from "./manifest";

export interface WaitPayrollReadyOptions {
  timeoutMs?: number;
  requireDodajRobocine?: boolean;
}

export async function bootstrapPayrollHarnessPreview(page: Page): Promise<void> {
  await blockCloudSync(page);
}

export async function loginAdminPayrollHarness(page: Page): Promise<void> {
  await gotoLoginPick(page);
  await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await page.locator('input[type="password"]').first().fill(E2E_PAYROLL_ADMIN_PASS);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 90_000 });
}

export async function waitForPayrollAssignmentReady(
  page: Page,
  opts?: WaitPayrollReadyOptions,
): Promise<void> {
  const timeout = opts?.timeoutMs ?? 30_000;
  await page.getByRole("button", { name: /Przydziały robót/i }).waitFor({ timeout });
  if (opts?.requireDodajRobocine) {
    const btn = page.getByRole("button", { name: /Dodaj robociznę/i });
    if ((await btn.count()) === 0) {
      throw new HarnessPreconditionError("PANEL_EMPTY", "Dodaj robociznę not visible");
    }
  }
}
