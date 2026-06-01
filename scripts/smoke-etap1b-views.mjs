/**
 * Smoke ETAP 1B — ContactsView, ScheduleView, EmployeeArchiveModal, ClientShareView
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap1b-views.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const results = {};

async function loginAdmin(page, base) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.evaluate(() => {
    sessionStorage.setItem("wg-session-mode", "admin");
    sessionStorage.setItem(
      "wg-admin-session",
      JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
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
  await page.waitForTimeout(600);
}

console.log("\n=== Smoke ETAP 1B (views extract) ===\n");
console.log(`BASE=${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await loginAdmin(page, BASE);

  try {
    await clickSidebar(page, "Kontakty");
    await page.waitForSelector("text=Odbiorcy emaili z aplikacji", { timeout: 10_000 });
    await page.waitForSelector("button:has-text('Nowy kontakt')", { timeout: 5_000 });
    results.contacts = "PASS";
  } catch (e) {
    results.contacts = `FAIL: ${e.message}`;
  }

  try {
    await clickSidebar(page, "Grafik");
    await page.waitForSelector("text=Grafik tygodniowy", { timeout: 10_000 });
    results.schedule = "PASS";
  } catch (e) {
    results.schedule = `FAIL: ${e.message}`;
  }

  try {
    await clickSidebar(page, "Pracownicy");
    await page.waitForSelector("h2:text-is('Pracownicy')", { timeout: 10_000 });
    await page.getByPlaceholder(/Szukaj po nazwisku/i).waitFor({ state: "visible", timeout: 10_000 });
    const archiveBtn = page.locator('button[title="Karta z archiwum"]').first();
    await archiveBtn.click({ timeout: 10_000 });
    await page.waitForSelector("text=Karta z archiwum listy płac", { timeout: 10_000 });
    results.employeeArchiveModal = "PASS";
  } catch (e) {
    results.employeeArchiveModal = `FAIL: ${e.message}`;
  }

  try {
    await page.goto(`${BASE}/?podglad=smoke-test-token`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Podgląd remontu", { timeout: 15_000 });
    await page.waitForSelector("text=W&G DOM — tylko do odczytu", { timeout: 5_000 });
    await page.waitForTimeout(2500);
    const onShare = await page.locator("text=Podgląd remontu").isVisible();
    const notLogin = !(await page.locator("text=Panel administracyjny").isVisible().catch(() => false));
    if (onShare && notLogin) results.clientShare = "PASS";
    else results.clientShare = "FAIL: not on share view or still on login";
  } catch (e) {
    results.clientShare = `FAIL: ${e.message}`;
  }
} finally {
  await browser.close();
}

console.log("Kontakty:              ", results.contacts ?? "SKIP");
console.log("Grafik:                ", results.schedule ?? "SKIP");
console.log("Modal archiwum prac.:  ", results.employeeArchiveModal ?? "SKIP");
console.log("ClientShareView:       ", results.clientShare ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
