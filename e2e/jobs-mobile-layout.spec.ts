import { test, expect } from "@playwright/test";
import {
  applyE2eSeedInBrowser,
  buildE2eSeedArgs,
  E2E_JOB_ADDRESS,
} from "./fixtures/e2e-seed";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";
import { blockCloudSync } from "./helpers/jobs";
import {
  assertMobileJobListColumnHidden,
  assertNoHorizontalScroll,
  getJobsMobileLayoutMetrics,
  openAdminJobsMobile,
} from "./helpers/jobs-mobile-layout";

/**
 * E2E guard — 20.5Z.5C Mobile Jobs List Width Fix
 * Wymaga: npm run build && npm run preview (PW_BASE_URL=http://127.0.0.1:4173)
 */
test.describe.configure({ mode: "serial" });

test.describe("20.5Z.5C — mobile Jobs list layout guard", () => {
  test.beforeEach(async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await loginAdmin(page);
    await openAdminJobsMobile(page);
  });

  test("scenariusz A — lista bez wybranej roboty: pełna szerokość, brak pustej kolumny", async ({
    page,
  }) => {
    const title = new RegExp(E2E_JOB_ADDRESS.replace(/\./g, "\\."), "i");
    await expect(page.getByRole("button", { name: title }).first()).toBeVisible();

    await expect(page.getByText("Wybierz robotę z listy po lewej")).toBeHidden();

    const metrics = await getJobsMobileLayoutMetrics(page, E2E_JOB_ADDRESS);
    expect(metrics.ok, metrics.reason).toBe(true);
    expect(metrics.listWidthRatio!).toBeGreaterThanOrEqual(0.9);
    expect(metrics.emptyDetailVisible).toBe(false);

    await assertNoHorizontalScroll(page);
  });

  test("scenariusz B — szczegóły robota: lista ukryta, brak poziomego scrolla", async ({
    page,
  }) => {
    const title = new RegExp(E2E_JOB_ADDRESS.replace(/\./g, "\\."), "i");
    await page.getByRole("button", { name: title }).first().click();

    await expect(page.getByRole("button", { name: /Powrót do listy/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Dokumentacja/ })).toBeVisible({
      timeout: 15_000,
    });

    await assertMobileJobListColumnHidden(page, E2E_JOB_ADDRESS);
    await assertNoHorizontalScroll(page);
  });

  test("scenariusz C — powrót do listy: pełna szerokość, brak pustej kolumny", async ({
    page,
  }) => {
    const title = new RegExp(E2E_JOB_ADDRESS.replace(/\./g, "\\."), "i");
    await page.getByRole("button", { name: title }).first().click();
    await page.getByRole("button", { name: /Powrót do listy/i }).click();

    await expect(page.getByRole("button", { name: title }).first()).toBeVisible();

    const metrics = await getJobsMobileLayoutMetrics(page, E2E_JOB_ADDRESS);
    expect(metrics.ok, metrics.reason).toBe(true);
    expect(metrics.listWidthRatio!).toBeGreaterThanOrEqual(0.9);
    expect(metrics.emptyDetailVisible).toBe(false);

    await assertNoHorizontalScroll(page);
  });
});
