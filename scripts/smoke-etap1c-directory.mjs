/**
 * Smoke ETAP 1C — DirectoryView (kartoteka pracowników)
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap1c-directory.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const TEST_NAME = `Smoke ETAP1C ${Date.now()}`;
const TEST_PHONE = "+48 999 888 777";
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

console.log("\n=== Smoke ETAP 1C (DirectoryView) ===\n");
console.log(`BASE=${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await loginAdmin(page, BASE);

  try {
    await clickSidebar(page, "Pracownicy");
    await page.waitForSelector("h2:text-is('Pracownicy')", { timeout: 10_000 });
    await page.getByPlaceholder(/Szukaj po nazwisku/i).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("button", { name: /Nowy pracownik/i }).waitFor({ state: "visible", timeout: 5_000 });
    results.openDirectory = "PASS";
  } catch (e) {
    results.openDirectory = `FAIL: ${e.message}`;
  }

  try {
    await page.getByRole("button", { name: /Nowy pracownik/i }).click({ timeout: 10_000 });
    await page.waitForSelector('input[placeholder="Jan Kowalski"]', { timeout: 10_000 });
    results.addEmployee = "PASS";
  } catch (e) {
    results.addEmployee = `FAIL: ${e.message}`;
  }

  try {
    const nameInput = page.locator('input[placeholder="Jan Kowalski"]').first();
    await nameInput.fill(TEST_NAME);
    const posInput = page.locator('input[placeholder*="Murarz"]').first();
    await posInput.fill("Smoke Tester");
    const phoneInput = page.locator('input[placeholder="+48 000 000 000"]').first();
    await phoneInput.fill(TEST_PHONE);
    results.editEmployee = "PASS";
  } catch (e) {
    results.editEmployee = `FAIL: ${e.message}`;
  }

  try {
    await page.getByRole("button", { name: /^Zapisz$/i }).click({ timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.getByText(TEST_NAME, { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 });
    const stillEditing = await page.locator('input[placeholder="Jan Kowalski"]').isVisible().catch(() => false);
    if (stillEditing) throw new Error("Edit form still open after save");
    results.saveChanges = "PASS";
  } catch (e) {
    results.saveChanges = `FAIL: ${e.message}`;
  }

  try {
    const search = page.getByPlaceholder(/Szukaj po nazwisku/i);
    const card = () => page.locator(".bg-card.rounded-xl.border").filter({ hasText: TEST_NAME });

    await search.fill("Smoke Tester");
    await page.waitForTimeout(400);
    await card().first().waitFor({ state: "visible", timeout: 5_000 });

    await search.fill("999 888");
    await page.waitForTimeout(400);
    await card().first().waitFor({ state: "visible", timeout: 5_000 });

    await search.fill("brak-wyniku-smoke");
    await page.waitForTimeout(400);
    const hidden = (await card().count()) === 0;
    if (!hidden) throw new Error("Card still visible for nonsense query");

    await search.fill(TEST_NAME);
    await page.waitForTimeout(400);
    await card().first().waitFor({ state: "visible", timeout: 5_000 });
    results.search = "PASS";
  } catch (e) {
    results.search = `FAIL: ${e.message}`;
  }

  try {
    await page.getByPlaceholder(/Szukaj po nazwisku/i).fill("");
    await page.waitForTimeout(300);
    const countBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-directory") || "[]").length);
    const card = page.locator(".px-5.py-4.flex.items-center").filter({ hasText: TEST_NAME }).first();
    await card.locator(".flex.items-center.gap-1.shrink-0 button").nth(3).click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    const countAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-directory") || "[]").length);
    const stillVisible = (await page.locator(".px-5.py-4.flex.items-center").filter({ hasText: TEST_NAME }).count()) > 0;
    if (stillVisible || countAfter !== countBefore - 1) {
      throw new Error(`Delete failed (visible=${stillVisible}, ${countBefore}->${countAfter})`);
    }
    results.deleteEmployee = "PASS";
  } catch (e) {
    results.deleteEmployee = `FAIL: ${e.message}`;
  }
} finally {
  await browser.close();
}

console.log("Otwarcie kartoteki:     ", results.openDirectory ?? "SKIP");
console.log("Dodanie pracownika:     ", results.addEmployee ?? "SKIP");
console.log("Edycja pracownika:      ", results.editEmployee ?? "SKIP");
console.log("Zapis zmian:            ", results.saveChanges ?? "SKIP");
console.log("Wyszukiwanie:           ", results.search ?? "SKIP");
console.log("Usunięcie testowego:    ", results.deleteEmployee ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
