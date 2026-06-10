import { test, expect } from "@playwright/test";
import {
  applyE2eSeedInBrowser,
  buildE2eSeedArgs,
  E2E_JOB_ID,
  E2E_MARKER,
  E2E_WORKER_NAME,
} from "./fixtures/e2e-seed";
import {
  gotoLoginPick,
  loginAdmin,
  loginInspector,
  loginWorker,
  logoutAdmin,
  logoutInspector,
  logoutWorker,
} from "./helpers/auth";
import {
  assertAdminDocumentation,
  assertAdminFilesHub,
  blockCloudSync,
  expandInspectorReport,
  openAdminJob,
  openInspectorJob,
  openWorkerJob,
  reinjectKwJobs,
  selectAdminJobTab,
  selectInspectorJobSection,
  snapshotKwJobs,
  submitWorkerDocumentation,
} from "./helpers/jobs";

/**
 * E2E-HAPPY-PATH-001 — Worker → Admin → Inspector (dokumentacja robót)
 * Wymaga: npm run build && npm run preview (PW_BASE_URL=http://127.0.0.1:4173)
 */
test.describe.configure({ mode: "serial" });

test.describe("E2E-HAPPY-PATH-001 — dokumentacja przez 3 role", () => {
  test("worker → admin Files Hub → inspector odbiór dokumentacji", async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();

    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);

    // ── WORKER ──
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);

    await loginWorker(page);
    await openWorkerJob(page);
    await submitWorkerDocumentation(page);

    const jobsSnapshot = await snapshotKwJobs(page);
    const parsed = JSON.parse(jobsSnapshot) as { id: string; workerReports?: unknown[] }[];
    const job = parsed.find((j) => j.id === E2E_JOB_ID);
    expect(job?.workerReports?.length).toBeGreaterThan(0);

    await logoutWorker(page);

    // ── ADMIN ──
    await reinjectKwJobs(page, jobsSnapshot);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await reinjectKwJobs(page, jobsSnapshot);

    await loginAdmin(page);
    await openAdminJob(page);
    await selectAdminJobTab(page, "Dokumentacja");
    await assertAdminDocumentation(page, E2E_WORKER_NAME);
    await selectAdminJobTab(page, "Pliki");
    await assertAdminFilesHub(page);
    await logoutAdmin(page);

    // ── INSPECTOR ──
    await reinjectKwJobs(page, jobsSnapshot);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await reinjectKwJobs(page, jobsSnapshot);

    await loginInspector(page);
    await openInspectorJob(page);
    await selectInspectorJobSection(page);
    await expandInspectorReport(page, E2E_WORKER_NAME);
    await expect(page.getByText(E2E_MARKER)).toBeVisible();
    await logoutInspector(page);
  });
});
