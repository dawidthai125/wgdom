import { expect, type Locator, type Page } from "@playwright/test";

export const SIDEBAR_SCROLL = ".admin-sidebar-scroll";
export const DASHBOARD_SCROLL = '[data-mobile-scroll-root="dashboard"]';
export const JOBS_LIST_SCROLL = '[data-mobile-scroll-root="jobs-list"]';
export const JOBS_DETAIL_SCROLL = '[data-mobile-scroll-root="jobs-detail"]';

export type ScrollBoxMeasure = {
  clientWidth: number;
  scrollWidth: number;
  equal: boolean;
  delta: number;
};

/** Measure horizontal overflow of a scroll box (strict equal by default). */
export async function measureScrollBox(page: Page, selector: string): Promise<ScrollBoxMeasure> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) {
      return { clientWidth: -1, scrollWidth: -1, equal: false, delta: -1 };
    }
    const clientWidth = el.clientWidth;
    const scrollWidth = el.scrollWidth;
    return {
      clientWidth,
      scrollWidth,
      equal: scrollWidth === clientWidth,
      delta: scrollWidth - clientWidth,
    };
  }, selector);
}

export async function assertNoHorizontalOverflow(
  page: Page,
  selector: string,
  label: string,
): Promise<ScrollBoxMeasure> {
  const m = await measureScrollBox(page, selector);
  expect(m.clientWidth, `${label}: element missing`).toBeGreaterThan(0);
  expect(m.equal, `${label}: scrollWidth(${m.scrollWidth}) !== clientWidth(${m.clientWidth})`).toBe(
    true,
  );
  return m;
}

export async function getSidebarTip(page: Page): Promise<Locator> {
  return page.locator(`${SIDEBAR_SCROLL} [role="tooltip"]`).first();
}

/**
 * Hero / shell Primary CTAs on Pulpit — identified by accessible name (not paint classes).
 * Mutually exclusive: either "Przejdź do Robot" or Saturday banner primary.
 */
export function dashboardHeroPrimaryCtas(page: Page): Locator {
  const root = page.locator(DASHBOARD_SCROLL);
  return root.getByRole("button", {
    name: /^(Przejdź do Robot|Zapisz tydzień\s*→|Lista płac\s*→)$/,
  });
}

export async function countDashboardHeroPrimaryCtas(page: Page): Promise<number> {
  return dashboardHeroPrimaryCtas(page).count();
}

export function hasFocusVisibleRingToken(className: string): boolean {
  return (
    className.includes("focus-visible:ring") ||
    className.includes("ring-primary/15") ||
    className.includes("ring-2")
  );
}

export async function openAdminView(page: Page, label: RegExp | string): Promise<void> {
  const re = typeof label === "string" ? new RegExp(label, "i") : label;
  await page.locator("nav.admin-sidebar-nav button").filter({ hasText: re }).first().click();
}
