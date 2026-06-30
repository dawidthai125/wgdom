/**
 * P0 — Command Layer height + V4 tab SSOT (Design Freeze §2.1).
 * PW_BASE_URL=http://127.0.0.1:4173 npx playwright test e2e/audit-p0-tender-freeze.spec.ts --config=playwright.audit.config.ts
 */
import { test, expect } from "@playwright/test";
import { applyE2eSeedInBrowser, buildE2eSeedArgs, E2E_TENDER_ID } from "./fixtures/e2e-seed";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";
import { blockCloudSync } from "./helpers/jobs";

async function assertPrzetargWorkspace(page: import("@playwright/test").Page) {
  const detail = page.locator("[data-tender-detail-v4]");
  await expect(detail).toHaveAttribute("data-tender-tab", "przetarg");
  await expect(page.locator("[data-tender-command-layer]")).toHaveAttribute("data-tender-tab", "przetarg");
  await expect(detail.locator("[data-tender-workflow-hub]").first()).toBeVisible();
}

async function assertDokumentyWorkspace(page: import("@playwright/test").Page) {
  const detail = page.locator("[data-tender-detail-v4]");
  await expect(detail).toHaveAttribute("data-tender-tab", "dokumenty");
  await expect(page.locator("[data-tender-command-layer]")).toHaveAttribute("data-tender-tab", "dokumenty");
  await expect(detail.locator("[data-tender-przetarg-command-slot]")).toHaveCount(0);
  await expect(detail.locator("[data-tender-workflow-hub]")).toHaveCount(0);
  await expect(detail.locator("#tender-attachments-section")).toBeVisible();
}

function measureLayout(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const detail = document.querySelector("[data-tender-detail-v4]");
    const scrollEl = detail?.querySelector(".overflow-y-auto") as HTMLElement | null;
    const commandLayer = document.querySelector("[data-tender-command-layer]");
    const commandLayerH = commandLayer?.getBoundingClientRect().height ?? 0;
    const contentScrollH = scrollEl?.getBoundingClientRect().height ?? 0;
    const viewportHeight = window.innerHeight;
    const commandOverflow = commandLayer ? getComputedStyle(commandLayer).overflowY : "";
    return {
      commandLayerH,
      contentScrollH,
      viewportHeight,
      commandOverflow,
      hasCommandScroll: commandOverflow === "auto" || commandOverflow === "scroll",
    };
  });
}

test.describe("P0 Command Layer height regression", () => {
  test.beforeEach(async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await loginAdmin(page);
  });

  test("mobile ≤390px — command ≤50vh, content >120px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });

    const m = await measureLayout(page);
    expect(m.hasCommandScroll, "Command Layer nie scrolluje").toBe(false);
    expect(m.commandLayerH).toBeLessThanOrEqual(m.viewportHeight * 0.5 + 1);
    expect(m.contentScrollH).toBeGreaterThan(120);

    await page.locator('[data-tender-tab="dokumenty"]').click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/dokumenty`));
    await assertDokumentyWorkspace(page);
  });

  test("desktop — tab SSOT po klienckim navigate", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });

    await assertPrzetargWorkspace(page);

    await page.locator('[data-tender-tab="dokumenty"]').click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/dokumenty`));
    await assertDokumentyWorkspace(page);
  });

  test("desktop — command ≤280px, content >120px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });

    const m = await measureLayout(page);
    expect(m.hasCommandScroll, "Command Layer nie scrolluje").toBe(false);
    expect(m.commandLayerH).toBeLessThanOrEqual(280 + 1);
    expect(m.contentScrollH).toBeGreaterThan(120);
  });
});
