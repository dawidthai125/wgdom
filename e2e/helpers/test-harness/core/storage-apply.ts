import type { Page } from "@playwright/test";
import {
  applyPayrollHarnessPatchInBrowser,
  buildPayrollHarnessSeed,
  type PayrollAssignmentSeedResult,
  type PayrollHarnessTarget,
  type SeedPayrollAssignmentOptions,
} from "../../../fixtures/payroll-harness-seed";
import type { HarnessRunManifest } from "./manifest";

export async function applyPayrollHarnessStorage(
  page: Page,
  result: PayrollAssignmentSeedResult,
): Promise<void> {
  await page.evaluate(applyPayrollHarnessPatchInBrowser, result.localStoragePatch);
}

export async function seedPayrollAssignmentScenario(
  page: Page,
  opts: SeedPayrollAssignmentOptions,
): Promise<PayrollAssignmentSeedResult> {
  const target: PayrollHarnessTarget = opts.target ?? "preview";
  const result = buildPayrollHarnessSeed({ ...opts, target, jobStrategy: "synthetic" });
  await applyPayrollHarnessStorage(page, result);
  return result;
}

export async function readHarnessManifestFromPage(page: Page): Promise<HarnessRunManifest | null> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("wgdom-harness-manifest");
    return raw ? JSON.parse(raw) : null;
  });
}

export async function writeHarnessManifestToPage(
  page: Page,
  manifest: HarnessRunManifest,
): Promise<void> {
  await page.evaluate((m) => {
    sessionStorage.setItem("wgdom-harness-manifest", JSON.stringify(m));
  }, manifest);
}
