/**
 * P0 — Command Layer height + V4 tab SSOT (Design Freeze §2.1).
 * NG-08-HF-01 — AC-HF-01…05, AC-HF-09 runtime DOM gates.
 * M-03 — mobile re-cert 360–430px + AC-M03-08 tab delta ≤32px.
 * PW_BASE_URL=http://127.0.0.1:4173 npx playwright test e2e/audit-p0-tender-freeze.spec.ts --config=playwright.audit.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { applyE2eSeedInBrowser, buildE2eSeedArgs, E2E_TENDER_ID } from "./fixtures/e2e-seed";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";
import { blockCloudSync } from "./helpers/jobs";

/** Presentation contract — IkAnalysisSurface title / header close (not a CSS position). */
const IK_ANALYSIS_DIALOG_NAME = "IK — Analiza przetargu";
const IK_ANALYSIS_CLOSE_NAME = "Zamknij analizę";

const hostedConsoleHits = new WeakMap<Page, string[]>();
const ikDismissedUrls = new WeakMap<Page, Set<string>>();

function watchHostedConsole(page: Page) {
  const hits: string[] = [];
  hostedConsoleHits.set(page, hits);
  const note = (text: string) => {
    if (/TenderDetailPanelHosted|hosted accordion/i.test(text)) hits.push(text);
  };
  page.on("pageerror", (err) => note(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") note(msg.text());
  });
}

/**
 * Close IK Analysis Surface the way a user would, before V4 tab interaction.
 * TRUE = dialog was open and is gone. NOT_PRESENT = no dialog (also valid).
 * Missing close control fails the test — no force click, no DOM removal.
 */
async function dismissIkAnalysisSurfaceIfPresent(page: Page): Promise<"TRUE" | "NOT_PRESENT"> {
  const dialog = page.getByRole("dialog", { name: IK_ANALYSIS_DIALOG_NAME });
  const urlKey = page.url();
  const seen = ikDismissedUrls.get(page) ?? new Set<string>();
  const onPrzetarg = /\/przetarg\/?$/.test(new URL(urlKey).pathname);
  if (onPrzetarg && !seen.has(urlKey)) {
    await dialog.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  }
  seen.add(urlKey);
  ikDismissedUrls.set(page, seen);

  if (!(await dialog.isVisible())) {
    test.info().annotations.push({ type: "IK_MODAL_CLOSED", description: "NOT_PRESENT" });
    return "NOT_PRESENT";
  }

  // Header X sits under AppUpdateBanner (z-index 9998) on phone widths.
  // Footer control is the same close contract and stays clickable.
  const later = page.getByRole("button", { name: "Później" });
  if (await later.isVisible().catch(() => false)) {
    await later.click();
    await expect(later).toBeHidden();
  }

  const close = dialog
    .getByRole("button", { name: IK_ANALYSIS_CLOSE_NAME })
    .and(page.locator("[data-ik-analysis-surface-footer-close]"));
  await expect(close, "IK modal is open but the close button is missing").toHaveCount(1);
  await expect(close).toBeVisible();
  await close.click();
  await expect(dialog).toBeHidden();
  test.info().annotations.push({ type: "IK_MODAL_CLOSED", description: "TRUE" });
  return "TRUE";
}

async function expectTenderDetailReady(page: Page) {
  await expect(page.locator("[data-tender-detail-v4]")).toBeVisible({ timeout: 30_000 });
  await dismissIkAnalysisSurfaceIfPresent(page);
}

async function assertPrzetargWorkspace(page: import("@playwright/test").Page) {
  await dismissIkAnalysisSurfaceIfPresent(page);
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
    const hub = document.querySelector("[data-tender-workflow-hub]");
    const root = document.querySelector("[data-tender-detail-scroll-root]");
    if (!hub || !root) return { ok: false, reason: "missing" };
    const hubRect = hub.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const intersects = hubRect.bottom > rootRect.top && hubRect.top < rootRect.bottom;
    return { ok: intersects };
  });
}

async function assertMobileShortcutsHidden(page: import("@playwright/test").Page) {
  await expect(page.locator("[data-tender-command-shortcuts-row]")).toBeHidden();
  await expect(page.locator("[data-tender-intelligence-shortcut]")).toBeHidden();
  await expect(page.locator("[data-tender-cost-shortcut]")).toBeHidden();
}

async function measureCommandLayerTabDelta(page: import("@playwright/test").Page) {
  const heights: Record<string, number> = {};
  for (const tab of ["przetarg", "dokumenty", "kosztorys"] as const) {
    await page.locator(`[data-tender-detail-tabs] [data-tender-tab="${tab}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/${tab}`));
    await page.waitForTimeout(400);
    heights[tab] = await page.locator("[data-tender-command-layer]").evaluate((el) => el.getBoundingClientRect().height);
  }
  const vals = Object.values(heights);
  return { delta: Math.max(...vals) - Math.min(...vals), heights };
}

async function assertMobileChromeBudget(page: import("@playwright/test").Page) {
  const m = await measureLayout(page);
  expect(m.hasCommandScroll, "Command Layer nie scrolluje").toBe(false);
  expect(m.commandLayerH).toBeLessThanOrEqual(m.viewportHeight * 0.5 + 1);
  expect(m.contentScrollH).toBeGreaterThan(120);
}

const M03_PHONE_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
] as const;

test.describe("P0 Command Layer height regression", () => {
  test.beforeEach(async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await loginAdmin(page);
    watchHostedConsole(page);
  });

  test.afterEach(async ({ page }) => {
    expect(hostedConsoleHits.get(page) ?? [], "Hosted console regression").toEqual([]);
  });

  test("mobile ≤390px — command ≤50vh, content >120px (Przetarg + Dokumenty)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expectTenderDetailReady(page);

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
    await expectTenderDetailReady(page);

    await assertPrzetargWorkspace(page);

    await page.locator('[data-tender-tab="dokumenty"]').click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/dokumenty`));
    await assertDokumentyWorkspace(page);
  });

  test("desktop — command ≤280px, content ≥120px (Przetarg + Dokumenty)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expectTenderDetailReady(page);

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
    await expectTenderDetailReady(page);
    await assertDokumentyWorkspace(page);

    await page.locator("[data-tender-intelligence-shortcut]").click();
    await expect(page).toHaveURL(new RegExp(`/przetargi/${E2E_TENDER_ID}/przetarg`));
    await assertPrzetargWorkspace(page);
    await expect(page.locator("[data-tender-workflow-hub]").first()).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => (await hubInScrollRootViewport(page)).ok, { timeout: 8_000 })
      .toBe(true);
  });

  test("mobile 390 — skróty ukryte (MFS-01)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
    await expectTenderDetailReady(page);
    await assertMobileShortcutsHidden(page);
  });
});

test.describe("M-03 mobile re-certification", () => {
  test.beforeEach(async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await loginAdmin(page);
    watchHostedConsole(page);
  });

  test.afterEach(async ({ page }) => {
    expect(hostedConsoleHits.get(page) ?? [], "Hosted console regression").toEqual([]);
  });

  for (const vp of M03_PHONE_VIEWPORTS) {
    test(`M-03 @${vp.width}px — chrome budget (przetarg + dokumenty)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
      await expectTenderDetailReady(page);

      await assertMobileChromeBudget(page);

      await page.locator('[data-tender-tab="dokumenty"]').click();
      await assertDokumentyWorkspace(page);
      await assertMobileChromeBudget(page);

      const kpiVisible = await page.locator("[data-tender-kpi-compact]").isVisible().catch(() => false);
      expect(kpiVisible).toBe(false);
    });
  }

  test("MFS-01 @412/430 — skróty ukryte", async ({ page }) => {
    for (const width of [412, 430]) {
      await page.setViewportSize({ width, height: width === 412 ? 915 : 932 });
      await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
      await expectTenderDetailReady(page);
      await assertMobileShortcutsHidden(page);
    }
  });

  for (const vp of [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 430, height: 932 },
  ]) {
    test(`M-03 AC-M03-08 @${vp.width}px — tab delta ≤32px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/przetargi/${E2E_TENDER_ID}/przetarg`, { waitUntil: "networkidle" });
      await expectTenderDetailReady(page);

      const { delta, heights } = await measureCommandLayerTabDelta(page);
      expect(delta, JSON.stringify(heights)).toBeLessThanOrEqual(32);
    });
  }
});
