import { expect, type Page } from "@playwright/test";
import { assertNoHorizontalScroll } from "./jobs-mobile-layout";

export async function assertNoApplicationError(page: Page): Promise<void> {
  await expect(page.locator("text=Application error")).toHaveCount(0);
  await expect(page.locator("text=Unexpected Application Error")).toHaveCount(0);
}

export async function assertAdminMobileSmokeShell(page: Page): Promise<void> {
  await assertNoApplicationError(page);
  await assertNoHorizontalScroll(page);
}

/** Szczegóły roboty — mobile (<640px): Powrót do listy; tablet/desktop split: nagłówek h2. */
export async function assertAdminJobDetailSmoke(page: Page, jobAddress: string): Promise<void> {
  await expect(page.getByRole("button", { name: /^Dokumentacja/ })).toBeVisible({
    timeout: 20_000,
  });
  const isCompact = await page.evaluate(() => window.matchMedia("(max-width: 639px)").matches);
  const title = new RegExp(jobAddress.replace(/\./g, "\\."), "i");
  if (isCompact) {
    await expect(page.getByRole("button", { name: /Powrót do listy/i })).toBeVisible({
      timeout: 15_000,
    });
  } else {
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible({
      timeout: 15_000,
    });
  }
}
