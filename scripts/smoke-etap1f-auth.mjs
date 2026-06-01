/**
 * Smoke ETAP 1F — AppInnerWithAuth routing
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap1f-auth.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const results = {};

console.log(`\n=== Smoke ETAP 1F (AppInnerWithAuth) ===\nBASE=${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  // 1. Admin login flow (session via LoginScreen path — enterAdmin)
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
    await page.evaluate(() => {
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 30_000 });
    await page.evaluate(() => {
      sessionStorage.setItem("wg-session-mode", "admin");
      sessionStorage.setItem(
        "wg-admin-session",
        JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    await page.waitForTimeout(3000);
    if (await page.locator("text=Panel administracyjny").isVisible().catch(() => false)) {
      throw new Error("Still on login after admin session");
    }
    results.adminLogin = "PASS";
  } catch (e) {
    results.adminLogin = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 2. Logout -> login screen
  try {
    await page.getByRole("button", { name: /Wyloguj/i }).first().click({ timeout: 15_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
    results.logout = "PASS";
  } catch (e) {
    results.logout = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 3. Worker login route
  try {
    await page.evaluate(() => {
      sessionStorage.setItem("wg-session-mode", "worker");
      sessionStorage.setItem("wg-worker-name", "Smoke Worker ETAP1F");
      sessionStorage.setItem("wg-worker-id", "smoke-worker-1f");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const onWorker = await page.locator("text=Smoke Worker ETAP1F").first().isVisible().catch(() => false);
    const notAdmin = !(await page.locator("text=Pulpit").isVisible().catch(() => false));
    const notLogin = !(await page.locator("text=Panel administracyjny").isVisible().catch(() => false));
    if (onWorker && notAdmin && notLogin) results.workerLogin = "PASS";
    else throw new Error(`worker view mismatch onWorker=${onWorker} notAdmin=${notAdmin}`);
  } catch (e) {
    results.workerLogin = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 4. Client share preview (podglad)
  try {
    await page.goto(`${BASE}/?podglad=smoke-test-token`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("text=Podgląd remontu", { timeout: 15_000 });
    await page.waitForSelector("text=W&G DOM — tylko do odczytu", { timeout: 10_000 });
    const notLogin = !(await page.locator("text=Panel administracyjny").isVisible().catch(() => false));
    if (!notLogin) throw new Error("Login screen visible on podglad");
    results.clientPreview = "PASS";
  } catch (e) {
    results.clientPreview = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("Logowanie admina:       ", results.adminLogin ?? "SKIP");
console.log("Wylogowanie:            ", results.logout ?? "SKIP");
console.log("Logowanie pracownika:   ", results.workerLogin ?? "SKIP");
console.log("Podgląd klienta:        ", results.clientPreview ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
