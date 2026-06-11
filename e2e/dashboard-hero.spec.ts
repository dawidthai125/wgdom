import { test, expect } from "@playwright/test";
import {
  applyE2eSeedInBrowser,
  buildE2eSeedArgs,
  E2E_ADMIN_PASS,
  hashAdminPassword,
} from "./fixtures/e2e-seed";
import { blockCloudSync } from "./helpers/jobs";
import { gotoLoginPick, loginAdmin } from "./helpers/auth";

const WM_OVERDUE_JOB_ID = "e2e-hero-wm-overdue";

async function seedDashboardWithWmOverdue(
  page: import("@playwright/test").Page,
  seedArgs: ReturnType<typeof buildE2eSeedArgs>,
): Promise<void> {
  await page.evaluate(applyE2eSeedInBrowser, seedArgs);
  await page.evaluate((wmId) => {
    const raw = localStorage.getItem("kw-jobs");
    const jobs = raw ? JSON.parse(raw) : [];
    const wmJob = {
      id: wmId,
      address: "E2E WM Hero Overdue",
      flatNumber: "12",
      client: "Wrocławskie Mieszkania",
      status: "in_progress",
      startDate: "2026-01-15",
      endDate: "2026-06-01",
      plannedHandoverDate: "2026-05-01",
      keysHandedOver: false,
      notes: "",
      documents: {
        zlecenie: true,
        zakres: true,
        kosztorys: true,
        kominiarz: true,
        pomiary: true,
        oswiadczenia: true,
        gwarancje: true,
        rysunek: true,
      },
      workEntries: [],
      materials: [],
      invoiceStatus: "pending",
      invoiceNumber: "",
      invoiceAmount: "",
      photos: [],
      jobNotes: [],
      activityLog: [],
    };
    const withoutDup = jobs.filter((j: { id: string }) => j.id !== wmId);
    localStorage.setItem("kw-jobs", JSON.stringify([...withoutDup, wmJob]));
  }, WM_OVERDUE_JOB_ID);
}

test.describe.configure({ mode: "serial" });

test.describe("Dashboard Hero DZIŚ — 20.7C.2C", () => {
  test("A — KPI przed Hero DZIŚ (desktop)", async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoLoginPick(page);
    await seedDashboardWithWmOverdue(page, seedArgs);
    await loginAdmin(page);

    const hero = page.getByLabel("Najważniejsze dziś");
    await expect(hero).toBeVisible();
    await expect(page.getByText("Roboty w trakcie", { exact: true }).first()).toBeVisible();

    const heroBox = await hero.boundingBox();
    const kpiBox = await page.getByText("Roboty w trakcie", { exact: true }).first().boundingBox();
    expect(heroBox).not.toBeNull();
    expect(kpiBox).not.toBeNull();
    if (heroBox && kpiBox) {
      expect(kpiBox.y).toBeLessThan(heroBox.y);
    }
  });

  test("B — po rozwinięciu accordion max 5 pozycji", async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoLoginPick(page);
    await seedDashboardWithWmOverdue(page, seedArgs);
    await loginAdmin(page);

    const hero = page.getByLabel("Najważniejsze dziś");
    await hero.getByRole("button", { name: /Pokaż priorytety/i }).click();
    const items = hero.locator("ul li");
    await expect(items).toHaveCount(await items.count());
    const count = await items.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);
  });

  test("C — brak duplikatu WM overdue (Hero vs Uwaga dziś)", async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoLoginPick(page);
    await seedDashboardWithWmOverdue(page, seedArgs);
    await loginAdmin(page);

    const hero = page.getByLabel("Najważniejsze dziś");
    await expect(hero).toContainText(/termin odbioru minął|po terminie/i);

    const uwagaDzis = page.getByLabel("Uwaga dziś");
    await expect(uwagaDzis).toBeVisible();
    await uwagaDzis.getByRole("button", { name: /Pokaż szczegóły/i }).click();
    await expect(uwagaDzis.getByText("WM — termin odbioru minął")).toHaveCount(0);
  });

  test("D — mobile 390×844 bez poziomego scrolla", async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.addInitScript(applyE2eSeedInBrowser, seedArgs);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLoginPick(page);
    await seedDashboardWithWmOverdue(page, seedArgs);
    await loginAdmin(page);

    await expect(page.getByLabel("Najważniejsze dziś")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("E — empty state bez pilnych spraw", async ({ page }) => {
    const seedArgs = buildE2eSeedArgs();
    await blockCloudSync(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLoginPick(page);

    // Stanisław (admin bez Przetargów) — brak Command Center, więc Hero może być pusty.
    const stanislawHash = hashAdminPassword("Stanislaw", E2E_ADMIN_PASS);
    await page.evaluate((args) => {
      localStorage.setItem("kw-directory", JSON.stringify([]));
      localStorage.setItem("kw-week-employees", JSON.stringify([]));
      localStorage.setItem("kw-weekFrom", JSON.stringify(args.weekFrom));
      localStorage.setItem("kw-weekTo", JSON.stringify(args.weekTo));
      localStorage.setItem("kw-archive", JSON.stringify([]));
      localStorage.setItem("kw-contacts", JSON.stringify([]));
      localStorage.setItem("kw-jobs", JSON.stringify([]));
      localStorage.setItem("kw-recoverable-charges", JSON.stringify([]));
      localStorage.setItem(
        "kw-admin-passwords",
        JSON.stringify({ stanislaw: args.stanislawHash }),
      );
      localStorage.setItem(
        "kw-app-settings",
        JSON.stringify({
          athPreviewEnabled: true,
          tendersTabForStaffEnabled: false,
          bzpScanDays: 90,
          bzpScanPages: 4,
          bzpScanOrgPages: 5,
          bzpAutoRefreshHours: 20,
        }),
      );
    }, { ...seedArgs, stanislawHash });

    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await expect(page.getByText("Logowanie administratora")).toBeVisible({ timeout: 15_000 });
    await page.locator("select").first().selectOption("stanislaw");
    await page.locator('input[type="password"]').first().fill(E2E_ADMIN_PASS);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await expect(page.getByRole("heading", { name: "Pulpit", level: 1 })).toBeVisible({
      timeout: 90_000,
    });

    const hero = page.getByLabel("Najważniejsze dziś");
    await expect(hero).toBeVisible();
    await expect(hero.getByText("Dziś nie ma pilnych spraw.")).toBeVisible();
  });
});
