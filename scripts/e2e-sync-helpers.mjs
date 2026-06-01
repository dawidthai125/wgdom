/**
 * Stabilne selektory nawigacji / listy — niezależne od badge (Roboty16, Lista płac 5…).
 */

/** Roboty testowe z E2E — nie używać do edycji w SC-02. */
export const TEST_JOB_ADDRESS_RE = /synctest|smoketest|sync-\d|MA-\d/i;

/** Sidebar: zakładka Roboty (badge w osobnym span, nie w name). */
export async function clickNavJobs(page) {
  const sidebarBtn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: /^Roboty$/ }),
  });
  if (await sidebarBtn.count()) {
    await sidebarBtn.first().click({ timeout: 15_000 });
  } else {
    await page
      .locator("button")
      .filter({ has: page.getByText(/^Roboty$/, { exact: true }) })
      .first()
      .click({ timeout: 15_000 });
  }
  await page.waitForTimeout(800);
}

/** Sidebar: Lista płac. */
export async function clickNavPayroll(page) {
  const sidebarBtn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: /^Lista płac$/ }),
  });
  if (await sidebarBtn.count()) {
    await sidebarBtn.first().click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: /Lista płac/i }).first().click({ timeout: 15_000 });
  }
  await page.waitForTimeout(800);
}

/** Pierwsza robota produkcyjna na liście (pomija SyncTest / SMOKE / MA-*). */
export async function clickFirstProductionJob(page) {
  const items = page.locator("button").filter({ hasText: /ul\.|m\.\d|Warsz|Krak|Gda|Łód|Wroc|Pozn/i });
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const text = (await items.nth(i).innerText()) || "";
    if (!TEST_JOB_ADDRESS_RE.test(text)) {
      await items.nth(i).click({ timeout: 10_000 });
      return text.split("\n")[0]?.trim() || text.slice(0, 60);
    }
  }
  throw new Error("Brak robót produkcyjnych na liście (same SyncTest/SMOKE?)");
}

/** runCloudSync bundle — batch-get/set z 14 kluczami (nie bootstrap 17). */
export function countFullSync14(detail) {
  if (!detail || detail === "—") return 0;
  return detail.split(",").map((s) => s.trim()).filter((s) => /^14@/.test(s)).length;
}

export function evaluateSc01(r) {
  return !r.error && countFullSync14(r.batchGetDetail) === 0;
}

export function evaluateSc02(r) {
  return !r.error && countFullSync14(r.batchGetDetail) >= 1 && countFullSync14(r.batchSetDetail) >= 1;
}

export function evaluateSc04(r) {
  return !r.error && countFullSync14(r.batchGetDetail) >= 1 && countFullSync14(r.batchSetDetail) === 0;
}

export function evaluateSc08(r) {
  return !r.error && countFullSync14(r.batchGetDetail) >= 1 && countFullSync14(r.batchSetDetail) >= 1;
}
