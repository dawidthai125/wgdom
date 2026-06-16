import { expect, type Page } from "@playwright/test";
import { E2E_JOB_ADDRESS } from "../fixtures/e2e-seed";
import { clickAdminSidebar } from "./jobs";

/** Bottom nav primary — pierwsze słowo etykiety w AdminMobileNav. */
const BOTTOM_NAV_PRIMARY_SHORT: Record<string, string> = {
  Pulpit: "Pulpit",
  "Lista Płac": "Lista",
  Grafik: "Grafik",
  Roboty: "Roboty",
};

export async function isMobileBottomNavVisible(page: Page): Promise<boolean> {
  return page.locator("nav.fixed.bottom-0").isVisible();
}

async function openViaBottomNav(page: Page, shortLabel: string): Promise<void> {
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await bottomNav.getByText(shortLabel, { exact: true }).click({ timeout: 15_000 });
}

async function openViaMoreMenu(page: Page, fullLabel: string): Promise<void> {
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await bottomNav.getByText("Więcej", { exact: true }).click({ timeout: 15_000 });
  const sheet = page.locator("div.fixed.inset-0").filter({ has: page.getByText("Menu", { exact: true }) });
  await expect(sheet).toBeVisible({ timeout: 10_000 });
  const item = sheet.getByRole("button", { name: new RegExp(fullLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  await item.first().click({ timeout: 15_000 });
}

/** Nawigacja admin — bottom nav / Więcej (mobile) lub sidebar (≥ md, np. iPad Mini). */
export async function openAdminModule(page: Page, fullLabel: string): Promise<void> {
  const short = BOTTOM_NAV_PRIMARY_SHORT[fullLabel];
  if (await isMobileBottomNavVisible(page)) {
    if (short) {
      await openViaBottomNav(page, short);
      return;
    }
    await openViaMoreMenu(page, fullLabel);
    return;
  }
  await clickAdminSidebar(page, fullLabel);
}

/** Skrót: Roboty z bottom nav lub sidebar. */
export async function openAdminJobs(page: Page): Promise<void> {
  await openAdminModule(page, "Roboty");
  await expect(page.getByRole("button", { name: /Nowa robota/i }).first()).toBeVisible({
    timeout: 25_000,
  });
}

/** Zamknij toast Sonner blokujący klik (np. błąd sync w E2E). */
export async function dismissBlockingToasts(page: Page): Promise<void> {
  const closeBtn = page.getByRole("button", { name: "Close toast" });
  for (let i = 0; i < 5; i++) {
    const first = closeBtn.first();
    if (!(await first.isVisible().catch(() => false))) break;
    await first.click({ timeout: 3_000 }).catch(() => {});
  }
}

/** Otwórz szczegóły seedowej roboty z listy (mobile / tablet / sidebar). */
export async function openE2eJobFromList(
  page: Page,
  jobAddress: string = E2E_JOB_ADDRESS,
): Promise<void> {
  await dismissBlockingToasts(page);
  const title = new RegExp(jobAddress.replace(/\./g, "\\."), "i");
  const jobBtn = page.getByRole("button", { name: title }).first();
  await expect(jobBtn).toBeVisible({ timeout: 15_000 });
  await jobBtn.scrollIntoViewIfNeeded();
  // Programmatic click — omija sticky header / bottom nav intercept na mobile.
  await jobBtn.evaluate((el) => (el as HTMLElement).click());
}

/** Przetargi — filtr „Pełna lista” (seed nie przechodzi domyślnego „Do zgłoszenia”) + expand wiersza. */
export async function openE2eTenderWorkspace(page: Page, tenderTitle: string): Promise<void> {
  await page.locator("select").first().selectOption("all");
  const row = page.getByRole("button").filter({ hasText: tenderTitle }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.evaluate((el) => (el as HTMLElement).click());
}
