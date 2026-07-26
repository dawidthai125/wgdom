import { test, expect } from "@playwright/test";
import { applyE2eSeedInBrowser, buildE2eSeedArgs } from "./fixtures/e2e-seed";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";
import { blockCloudSync } from "./helpers/jobs";
import {
  SIDEBAR_SCROLL,
  DASHBOARD_SCROLL,
  JOBS_LIST_SCROLL,
  JOBS_DETAIL_SCROLL,
  assertNoHorizontalOverflow,
  measureScrollBox,
  getSidebarTip,
  dashboardHeroPrimaryCtas,
  countDashboardHeroPrimaryCtas,
  hasFocusVisibleRingToken,
  openAdminView,
} from "./helpers/ui-shell-guard";

/**
 * WGDOM-UI-REGRESSION-GUARD-01 — App Shell regression guard (T01–T08 + RG-09 + RG-10).
 * Desktop only · no pixel snapshots · no src/app changes.
 */
test.describe("UI regression guard — App Shell", () => {
  test.beforeEach(async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await loginAdmin(page);
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible();
  });

  test("T01 sidebar scrollWidth idle", async ({ page }) => {
    await assertNoHorizontalOverflow(page, SIDEBAR_SCROLL, "T01 idle");
    const tip = await getSidebarTip(page);
    await expect(tip).toHaveCSS("display", "none");
  });

  test("T02 sidebar scrollWidth hover tip", async ({ page }) => {
    const firstNav = page.locator("nav.admin-sidebar-nav button").first();
    await firstNav.hover();
    const tip = await getSidebarTip(page);
    await expect(tip).toHaveCSS("display", "block");
    await assertNoHorizontalOverflow(page, SIDEBAR_SCROLL, "T02 hover");
    const geometry = await page.evaluate(() => {
      const scroll = document.querySelector(".admin-sidebar-scroll");
      const t = scroll?.querySelector('[role="tooltip"]');
      if (!scroll || !t) return { ok: false };
      const sR = scroll.getBoundingClientRect().right;
      const tR = t.getBoundingClientRect().right;
      return { ok: tR <= sR + 1, past: tR - sR };
    });
    expect(geometry.ok, `T02 tip past scrollport by ${geometry.past}`).toBe(true);
  });

  test("T03 sidebar scrollWidth focus tip", async ({ page }) => {
    const firstNav = page.locator("nav.admin-sidebar-nav button").first();
    await firstNav.focus();
    const tip = await getSidebarTip(page);
    await expect(tip).toHaveCSS("display", "block");
    await assertNoHorizontalOverflow(page, SIDEBAR_SCROLL, "T03 focus");
  });

  test("T04 tooltip not side-positioned", async ({ page }) => {
    const tip = await getSidebarTip(page);
    const cls = (await tip.getAttribute("class")) || "";
    expect(cls.includes("calc(100%"), "T04 must not use left calc(100%)").toBe(false);
    expect(/\bw-max\b/.test(cls), "T04 must not use w-max on sidebar tip").toBe(false);
    expect(cls.includes("left-0") && cls.includes("right-0")).toBe(true);
    expect(cls.includes("hidden")).toBe(true);
  });

  test("T05 + RG-09 dashboard exactly one hero Primary CTA", async ({ page }) => {
    // Accessible-name hook (not paint classes) — shell hero Primary only
    const n = await countDashboardHeroPrimaryCtas(page);
    expect(n, "RG-09 / T05: exactly one hero Primary CTA").toBe(1);
    await expect(dashboardHeroPrimaryCtas(page)).toHaveCount(1);
  });

  test("T06 jobs card has focus-visible ring token", async ({ page }) => {
    await openAdminView(page, /Roboty/);
    await expect(page.locator(JOBS_LIST_SCROLL)).toBeVisible({ timeout: 30_000 });
    const card = page
      .locator(`${JOBS_LIST_SCROLL} button[aria-pressed], button[aria-pressed]`)
      .filter({ has: page.locator("p.text-base.font-semibold") })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    const cls = (await card.getAttribute("class")) || "";
    expect(hasFocusVisibleRingToken(cls), `T06 class=${cls.slice(0, 120)}`).toBe(true);
  });

  test("T07 jobs detail tabs a11y focus token", async ({ page }) => {
    await openAdminView(page, /Roboty/);
    const card = page
      .locator("button[aria-pressed]")
      .filter({ has: page.locator("p.text-base.font-semibold") })
      .first();
    await card.click();
    const tab = page.getByRole("tab").first();
    await expect(tab).toBeVisible({ timeout: 15_000 });
    const cls = (await tab.getAttribute("class")) || "";
    expect(hasFocusVisibleRingToken(cls), `T07 class=${cls.slice(0, 120)}`).toBe(true);
    expect(await tab.getAttribute("aria-pressed")).toBeNull();
    expect(await tab.getAttribute("aria-selected")).not.toBeNull();
  });

  test("T08 main panels no horizontal overflow", async ({ page }) => {
    await assertNoHorizontalOverflow(page, DASHBOARD_SCROLL, "T08 dashboard");

    await openAdminView(page, /Roboty/);
    await expect(page.locator(JOBS_LIST_SCROLL)).toBeVisible({ timeout: 30_000 });
    await assertNoHorizontalOverflow(page, JOBS_LIST_SCROLL, "T08 jobs-list");
    const detail = page.locator(JOBS_DETAIL_SCROLL);
    if (await detail.count()) {
      await assertNoHorizontalOverflow(page, JOBS_DETAIL_SCROLL, "T08 jobs-detail");
    }

    await openAdminView(page, /Lista Płac|Lista płac/);
    await page.waitForTimeout(800);
    const payrollScroll = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll<HTMLElement>(".flex-1.overflow-y-auto.overscroll-contain"),
      ];
      const el =
        candidates.find((c) => c.closest(".flex.flex-1") && c.clientHeight > 100) || candidates[0];
      if (!el) return null;
      el.setAttribute("data-ui-guard-payroll-scroll", "1");
      return {
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        equal: el.scrollWidth === el.clientWidth,
      };
    });
    expect(payrollScroll, "T08 payroll scroll root").not.toBeNull();
    expect(payrollScroll!.equal, "T08 payroll horizontal overflow").toBe(true);
  });

  test("RG-10 sidebar scrollWidth after tooltip close", async ({ page }) => {
    const firstNav = page.locator("nav.admin-sidebar-nav button").first();
    await firstNav.hover();
    const tip = await getSidebarTip(page);
    await expect(tip).toHaveCSS("display", "block");
    await assertNoHorizontalOverflow(page, SIDEBAR_SCROLL, "RG-10 while open");

    // Dismiss hover — move pointer to main content (Pulpit heading)
    await page.getByRole("heading", { name: "Pulpit", level: 1 }).hover();
    await expect(tip).toHaveCSS("display", "none");
    const after = await measureScrollBox(page, SIDEBAR_SCROLL);
    expect(after.equal, `RG-10 after close delta=${after.delta}`).toBe(true);
    expect(after.scrollWidth).toBe(after.clientWidth);
  });
});
