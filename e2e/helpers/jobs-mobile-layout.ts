import { expect, type Page } from "@playwright/test";

/** Brak poziomego scrolla na poziomie dokumentu (mobile shell). */
export async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2);
}

/** Admin mobile bottom nav → Roboty. */
export async function openAdminJobsMobile(page: Page): Promise<void> {
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await bottomNav.getByText("Roboty", { exact: true }).click({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Nowa robota/i })).toBeVisible({ timeout: 20_000 });
}

export type JobsMobileLayoutMetrics = {
  ok: boolean;
  reason?: string;
  listWidthRatio?: number;
  emptyDetailVisible?: boolean;
  splitWidth?: number;
  listWidth?: number;
};

/**
 * Metryki STREFA B — lista vs pusta kolumna szczegółów (regresja 20.5Z.5C).
 * Wykrywa układ ~35% lista + ~65% pusta kolumna na mobile.
 */
export async function getJobsMobileLayoutMetrics(
  page: Page,
  jobAddressSubstring: string,
): Promise<JobsMobileLayoutMetrics> {
  return page.evaluate((addressSubstring) => {
    const jobBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes(addressSubstring),
    );
    if (!jobBtn) return { ok: false, reason: "job-button-missing" };

    const listCol = jobBtn.closest("div.border-r.border-border.bg-card");
    if (!listCol || !(listCol instanceof HTMLElement)) {
      return { ok: false, reason: "list-column-missing" };
    }

    const splitRow = listCol.parentElement;
    if (!splitRow) return { ok: false, reason: "split-row-missing" };

    const splitBox = splitRow.getBoundingClientRect();
    const listBox = listCol.getBoundingClientRect();

    const emptyDetail = Array.from(splitRow.children).find(
      (el) =>
        el instanceof HTMLElement &&
        el.classList.contains("hidden") &&
        el.classList.contains("sm:flex"),
    ) as HTMLElement | undefined;

    const emptyDetailVisible = emptyDetail
      ? emptyDetail.getBoundingClientRect().width > 4 &&
        getComputedStyle(emptyDetail).display !== "none" &&
        getComputedStyle(emptyDetail).visibility !== "hidden"
      : false;

    const listWidthRatio = splitBox.width > 0 ? listBox.width / splitBox.width : 0;

    return {
      ok: true,
      listWidthRatio,
      emptyDetailVisible,
      splitWidth: splitBox.width,
      listWidth: listBox.width,
    };
  }, jobAddressSubstring);
}

/** Na mobile po wyborze roboty kolumna listy powinna być ukryta. */
export async function assertMobileJobListColumnHidden(
  page: Page,
  jobAddressSubstring: string,
): Promise<void> {
  const hidden = await page.evaluate((addressSubstring) => {
    const jobBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes(addressSubstring),
    );
    const listCol = jobBtn?.closest("div.border-r.border-border.bg-card");
    if (!listCol || !(listCol instanceof HTMLElement)) return false;
    const style = getComputedStyle(listCol);
    const box = listCol.getBoundingClientRect();
    return style.display === "none" || box.width < 4;
  }, jobAddressSubstring);
  expect(hidden).toBe(true);
}
