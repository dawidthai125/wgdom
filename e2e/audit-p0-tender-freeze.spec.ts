/**
 * P0 — Command Layer height + V4 tab SSOT (Design Freeze §2.1).
 * NG-08-HF-01 — AC-HF-01…05, AC-HF-09 runtime DOM gates.
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
    const scrollEl = document.querySelector("[data-tender-detail-scroll-root]") as HTMLElement | null;
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

function hubInScrollRootViewport(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const hub = document.getElementById("tender-intelligence-hub");
    const root = document.querySelector("[data-tender-detail-scroll-root]");
    if (!hub || !root) return { ok: false, reason: "missing" };
    const hubRect = hub.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const topOk = hubRect.top >= rootRect.top - 8;
    const bottomOk = hubRect.bottom <= rootRect.bottom + 8;
    const intersects = hubRect.bottom > rootRect.top && hubRect.top < rootRect.bottom;
    return { ok: intersects && topOk && bottomOk };
  });
}

function shortcutHeights(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const intel = document.querySelector("[data-tender-intelligence-shortcut]");
    const cost = document.querySelector("[data-tender-cost-shortcut]");
    return {
      intelH: intel?.getBoundingClientRect().height ?? 0,
      costH: cost?.getBoundingClientRect().height ?? 0,
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

  test("mobile ≤390px — command ≤50vh, content >120px (Przetarg + Dokumenty)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });

    let m = await measureLayout(page);
    expect(m.hasCommandScroll, "Command Layer nie scrolluje").toBe(false);
    expect(m.commandLayerH).toBeLessThanOrEqual(m.viewportHeight * 0.5 + 1);
    expect(m.contentScrollH).toBeGreaterThan(120);

    await page.locator('[data-tender-tab="dokumenty"]').click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/dokumenty`));
    await assertDokumentyWorkspace(page);

    m = await measureLayout(page);
    expect(m.hasCommandScroll, "Command Layer nie scrolluje").toBe(false);
    expect(m.commandLayerH).toBeLessThanOrEqual(m.viewportHeight * 0.5 + 1);
    expect(m.contentScrollH).toBeGreaterThan(120);
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

  test("desktop — command ≤280px, content ≥120px (Przetarg + Dokumenty)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });

    let m = await measureLayout(page);
    expect(m.hasCommandScroll, "Command Layer nie scrolluje").toBe(false);
    expect(m.commandLayerH).toBeLessThanOrEqual(280 + 1);
    expect(m.contentScrollH).toBeGreaterThanOrEqual(120);

    await page.locator('[data-tender-tab="dokumenty"]').click();
    await assertDokumentyWorkspace(page);

    m = await measureLayout(page);
    expect(m.commandLayerH).toBeLessThanOrEqual(280 + 1);
    expect(m.contentScrollH).toBeGreaterThanOrEqual(120);
  });

  test("KPI-UX-01 — shortcut z Dokumenty przewija hub w scroll root", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/dokumenty`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });
    await assertDokumentyWorkspace(page);

    await page.locator("[data-tender-intelligence-shortcut]").click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/przetarg`));
    await assertPrzetargWorkspace(page);
    await expect(page.locator("#tender-intelligence-hub")).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => (await hubInScrollRootViewport(page)).ok, { timeout: 8_000 })
      .toBe(true);
  });

  test("mobile — shortcuty ≥44px wysokości", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });

    const h = await shortcutHeights(page);
    expect(h.intelH).toBeGreaterThanOrEqual(44);
    expect(h.costH).toBeGreaterThanOrEqual(44);
  });
});
