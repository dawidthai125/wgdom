/**
 * TEST-INFRA-001 — PAYROLL-GUARD-S1 (preview CI)
 * PW_BASE_URL=http://127.0.0.1:4173 npx playwright test e2e/payroll-guard-s1.spec.ts --project=e2e-payroll-guard
 */
import { test, expect } from "@playwright/test";
import { applyPayrollHarnessPatchInBrowser, buildPayrollHarnessSeed } from "./fixtures/payroll-harness-seed";
import { bootstrapPayrollHarnessPreview, loginAdminPayrollHarness } from "./helpers/test-harness/core/bootstrap-gate";
import { cleanupPayrollScenario } from "./helpers/test-harness/core/cleanup";
import { writeHarnessManifestToPage } from "./helpers/test-harness/core/storage-apply";
import { runPayrollGuardS1 } from "./helpers/test-harness/payroll/scenarios/guard-s1";
import { HarnessPreconditionError } from "./helpers/test-harness/core/manifest";

test.describe.configure({ mode: "serial" });

test.describe("PAYROLL-GUARD-S1 — Lista Płac Przydziały (TEST-INFRA-001)", () => {
  test("preview — dodaj przydział, zmiana roboty utrzymana", async ({ page }) => {
    const seed = buildPayrollHarnessSeed({ target: "preview", mode: "empty" });
    let manifest = seed.manifest;

    try {
      await bootstrapPayrollHarnessPreview(page);
      await page.addInitScript(applyPayrollHarnessPatchInBrowser, seed.localStoragePatch);

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.evaluate(applyPayrollHarnessPatchInBrowser, seed.localStoragePatch);
      await writeHarnessManifestToPage(page, manifest);

      await loginAdminPayrollHarness(page);
      await page.evaluate(applyPayrollHarnessPatchInBrowser, seed.localStoragePatch);
      await runPayrollGuardS1(page, seed, manifest);
      await writeHarnessManifestToPage(page, manifest);
    } catch (err) {
      if (err instanceof HarnessPreconditionError) {
        test.info().annotations.push({ type: "harness-precondition", description: err.code });
      }
      throw err;
    } finally {
      const cleanup = await cleanupPayrollScenario(page, manifest, { target: "preview" });
      expect(cleanup.success, "harness cleanup").toBe(true);
    }
  });
});
