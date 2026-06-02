/**
 * Smoke ETAP 2B — DashboardView extraction
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap2b-dashboard.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const results = {};

console.log(`\n=== Smoke ETAP 2B (DashboardView) ===\nBASE=${BASE}\n`);

async function loginSuperAdmin(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.evaluate(() => {
    sessionStorage.clear();
    sessionStorage.setItem("wg-session-mode", "admin");
    sessionStorage.setItem(
      "wg-admin-session",
      JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
  await page.waitForTimeout(2000);
}

async function clickSidebar(page, label) {
  const btn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }),
  });
  if (await btn.count()) {
    await btn.first().click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: new RegExp(label, "i") }).first().click({ timeout: 15_000 });
  }
  await page.waitForTimeout(700);
}

async function goDashboard(page) {
  await clickSidebar(page, "Pulpit");
  await page.waitForSelector("h1:text-is('Pulpit')", { timeout: 15_000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await loginSuperAdmin(page);

  // 1. Dashboard entry
  try {
    await page.waitForSelector("h1:text-is('Pulpit')", { timeout: 10_000 });
    results.dashboardEntry = "PASS";
  } catch (e) {
    results.dashboardEntry = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 2. Main stat tiles
  try {
    const tiles = [
      "Roboty w trakcie",
      "Ekipa dziś",
      "Aktywne WM",
      "Do ogarnięcia",
    ];
    for (const t of tiles) {
      await page.getByText(t, { exact: false }).first().waitFor({ state: "visible", timeout: 8_000 });
    }
    // Wypłata tile uses dynamic date label
    await page.locator("button").filter({ hasText: /Wypłata · sob\./ }).first().waitFor({ state: "visible", timeout: 8_000 });
    results.mainTiles = "PASS";
  } catch (e) {
    results.mainTiles = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 3. Navigate to Roboty (from dashboard shortcut)
  try {
    await page.getByRole("button", { name: /^Roboty$/ }).first().click({ timeout: 10_000 });
    await page.waitForSelector("text=Roboty", { timeout: 15_000 });
    results.navJobs = "PASS";
  } catch (e) {
    results.navJobs = `FAIL: ${e.message.split("\n")[0]}`;
  }

  await goDashboard(page);

  // 4. Navigate to Lista płac
  try {
    await page.getByRole("button", { name: /Lista płac/i }).first().click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    const onPayroll = await page.locator("text=Lista płac").first().isVisible().catch(() => false);
    if (!onPayroll) throw new Error("Payroll view not visible");
    results.navPayroll = "PASS";
  } catch (e) {
    results.navPayroll = `FAIL: ${e.message.split("\n")[0]}`;
  }

  await goDashboard(page);

  // 5. Navigate to Pracownicy (Ekipa dziś tile → directory)
  try {
    await page.getByText("Ekipa dziś", { exact: false }).first().click({ timeout: 10_000 });
    await page.waitForSelector("h2:text-is('Pracownicy')", { timeout: 15_000 });
    results.navDirectory = "PASS";
  } catch (e) {
    results.navDirectory = `FAIL: ${e.message.split("\n")[0]}`;
  }

  await goDashboard(page);

  // 6. Alerts section (Uwaga dziś or Do ogarnięcia tile always present)
  try {
    const alertsHeader = page.locator("text=Uwaga dziś");
    const doOgarniecia = page.getByText("Do ogarnięcia", { exact: false }).first();
    await doOgarniecia.waitFor({ state: "visible", timeout: 8_000 });
    if (await alertsHeader.isVisible().catch(() => false)) {
      await alertsHeader.scrollIntoViewIfNeeded();
    }
    results.alerts = "PASS";
  } catch (e) {
    results.alerts = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 7. Open Przetargi
  try {
    const tendersBanner = page.getByRole("button", { name: /Przetargi BZP/i });
    if (await tendersBanner.isVisible().catch(() => false)) {
      await tendersBanner.click({ timeout: 10_000 });
    } else {
      await clickSidebar(page, "Przetargi");
    }
    await page.waitForTimeout(2000);
    const onTenders = await page.locator("text=Przetargi").first().isVisible().catch(() => false);
    if (!onTenders) throw new Error("Tenders view not visible");
    results.navTenders = "PASS";
  } catch (e) {
    results.navTenders = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 8. Return to Dashboard
  try {
    await goDashboard(page);
    await page.waitForSelector("h1:text-is('Pulpit')", { timeout: 10_000 });
    results.returnDashboard = "PASS";
  } catch (e) {
    results.returnDashboard = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("Wejście Dashboard:     ", results.dashboardEntry ?? "SKIP");
console.log("Główne kafelki:        ", results.mainTiles ?? "SKIP");
console.log("Przejście Roboty:      ", results.navJobs ?? "SKIP");
console.log("Przejście Lista płac:  ", results.navPayroll ?? "SKIP");
console.log("Przejście Pracownicy:  ", results.navDirectory ?? "SKIP");
console.log("Alerty:                ", results.alerts ?? "SKIP");
console.log("Przetargi:             ", results.navTenders ?? "SKIP");
console.log("Powrót Dashboard:      ", results.returnDashboard ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
