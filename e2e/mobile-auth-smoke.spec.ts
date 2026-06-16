import { test, expect } from "@playwright/test";
import {
  applyE2eSeedInBrowser,
  buildE2eSeedArgs,
  E2E_JOB_ADDRESS,
  E2E_NOTE_TITLE,
  E2E_TENDER_TITLE,
} from "./fixtures/e2e-seed";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";
import {
  openAdminJobs,
  openAdminModule,
  openE2eJobFromList,
  openE2eTenderWorkspace,
} from "./helpers/admin-mobile-nav";
import {
  assertAdminJobDetailSmoke,
  assertAdminMobileSmokeShell,
  assertNoApplicationError,
} from "./helpers/admin-mobile-smoke";
import { blockCloudSync } from "./helpers/jobs";
import { assertNoHorizontalScroll } from "./helpers/jobs-mobile-layout";

const WORKSPACE_TABS = ["Przegląd", "Dokumenty", "Kwalifikacja", "Wycena", "Oferta"] as const;

function tenderWorkspaceTabPattern(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}`);
}

/**
 * P1-001 — Mobile Authenticated Smoke (post-2.51 modules)
 * Wymaga: PW_BASE_URL (prod lub preview po build)
 *   npm run build && npm run preview
 *   PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:mobile-auth
 */
test.describe.configure({ mode: "serial" });

test.describe("MOBILE-AUTH-001..005 — admin modules smoke", () => {
  test.beforeEach(async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await gotoLoginPick(page);
    await page.evaluate(applyE2eSeedInBrowser, seedArgs);
    await loginAdmin(page);
  });

  test("MOBILE-AUTH-001..005 — Dashboard · Roboty · Notatki · WM Druk · Przetargi", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // ── MOBILE-AUTH-001 — Dashboard V3 ──
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Wypłata", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Braki dokumentów", { exact: true })).toBeVisible();
    await expect(page.getByText("Pilne uwagi", { exact: true })).toBeVisible();
    await assertAdminMobileSmokeShell(page);

    // ── MOBILE-AUTH-002 — Roboty ──
    await openAdminJobs(page);
    await openE2eJobFromList(page, E2E_JOB_ADDRESS);
    await assertAdminJobDetailSmoke(page, E2E_JOB_ADDRESS);
    await assertNoHorizontalScroll(page);
    await assertNoApplicationError(page);

    // ── MOBILE-AUTH-003 — Notatki operacyjne ──
    await openAdminModule(page, "Notatki operacyjne");
    await expect(
      page.getByRole("heading", { name: "Notatki operacyjne", level: 3 }),
    ).toBeVisible({ timeout: 25_000 });
    await page.getByRole("button", { name: E2E_NOTE_TITLE }).click({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: E2E_NOTE_TITLE, level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await assertNoApplicationError(page);

    // ── MOBILE-AUTH-004 — WM Druk (render only, no ZIP/PDF) ──
    await openAdminModule(page, "Odbiory WM Druk");
    await expect(page.getByRole("heading", { name: "Odbiory WM Druk", level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("button", { name: "Szablony", exact: true }).click();
    await expect(page.getByText(/skonfigurowanych/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("listitem").filter({ hasText: /ZI/i })).toBeVisible({
      timeout: 20_000,
    });
    await assertNoApplicationError(page);

    // ── MOBILE-AUTH-005 — Przetargi workspace ──
    await openAdminModule(page, "Przetargi");
    await expect(page.getByRole("heading", { name: "Przetargi", level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await openE2eTenderWorkspace(page, E2E_TENDER_TITLE);

    const tablist = page.getByRole("tablist", { name: "Obszary przetargu" });
    await expect(tablist).toBeVisible({ timeout: 25_000 });

    for (const tabLabel of WORKSPACE_TABS) {
      const tab = tablist.getByRole("tab", { name: tenderWorkspaceTabPattern(tabLabel) });
      await tab.scrollIntoViewIfNeeded();
      await tab.click({ timeout: 15_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await assertNoApplicationError(page);
    }

    await assertNoHorizontalScroll(page);
  });
});
