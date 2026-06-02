/**
 * Post-deploy smoke ETAP 1D — produkcja
 * node scripts/smoke-post-deploy-1d.mjs [BASE_URL]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "https://www.wgdom.fun";
const results = {};

async function loginAdmin(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
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
  await page.waitForTimeout(4000);
}

async function navTo(page, label) {
  await page
    .locator("nav.admin-sidebar-nav button")
    .filter({ has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }) })
    .first()
    .click({ timeout: 15_000 });
  await page.waitForTimeout(2000);
}

function hasViewError(page) {
  return page.locator("text=/Błąd:/").first().isVisible().catch(() => false);
}

console.log(`\n=== Post-deploy smoke ETAP 1D ===\nBASE=${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

try {
  await loginAdmin(page);

  try {
    await navTo(page, "Archiwum");
    if (await hasViewError(page)) throw new Error("ViewErrorBoundary Archiwum");
    await page.getByRole("button", { name: /Raport roczny PDF/i }).waitFor({ state: "visible", timeout: 15_000 });
    results.Archiwum = "PASS";
  } catch (e) {
    results.Archiwum = `FAIL: ${e.message.split("\n")[0]}`;
  }

  try {
    await navTo(page, "Pracownicy");
    if (await hasViewError(page)) throw new Error("ViewErrorBoundary Kartoteka");
    await page.locator("table, .bg-card").first().waitFor({ state: "visible", timeout: 15_000 });
    results.Kartoteka = "PASS";
  } catch (e) {
    results.Kartoteka = `FAIL: ${e.message.split("\n")[0]}`;
  }

  try {
    await navTo(page, "Kontakty");
    if (await hasViewError(page)) throw new Error("ViewErrorBoundary Kontakty");
    await page.locator("table, input, .bg-card").first().waitFor({ state: "visible", timeout: 15_000 });
    results.Kontakty = "PASS";
  } catch (e) {
    results.Kontakty = `FAIL: ${e.message.split("\n")[0]}`;
  }

  try {
    await navTo(page, "Grafik");
    if (await hasViewError(page)) throw new Error("ViewErrorBoundary Grafik");
    await page.locator("table").first().waitFor({ state: "visible", timeout: 15_000 });
    results.Grafik = "PASS";
  } catch (e) {
    results.Grafik = `FAIL: ${e.message.split("\n")[0]}`;
  }

  try {
    await navTo(page, "Roboty");
    if (await hasViewError(page)) throw new Error("ViewErrorBoundary Roboty");
    await page.locator("table, .bg-card").first().waitFor({ state: "visible", timeout: 15_000 });
    results.Roboty = "PASS";
  } catch (e) {
    results.Roboty = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

const allPass = Object.values(results).every((v) => v === "PASS");
for (const [k, v] of Object.entries(results)) console.log(`${k.padEnd(12)} ${v}`);
if (pageErrors.length) console.log("\nPage errors:", pageErrors.slice(0, 3));
console.log(`\nOverall: ${allPass ? "PASS" : "FAIL"}\n`);
process.exit(allPass ? 0 : 1);
