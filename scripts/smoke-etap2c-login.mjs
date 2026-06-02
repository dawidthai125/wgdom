/**
 * Smoke ETAP 2C — LoginScreen extraction
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap2c-login.mjs
 */
import { chromium } from "playwright";
import { createHash } from "crypto";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const TEST_PASS = "smoke-etap2c-pass";
const TEST_HASH_DAWID = createHash("sha256").update(`wgdom-admin-account-v1:Dawid:${TEST_PASS}`).digest("hex");
const TEST_HASH_SZYMON = createHash("sha256").update(`wgdom-admin-account-v1:Szymon:${TEST_PASS}`).digest("hex");
const WORKER_ID = "smoke-worker-2c";
const WORKER_PIN = "5678";
const results = {};

console.log(`\n=== Smoke ETAP 2C (LoginScreen) ===\nBASE=${BASE}\n`);

async function clearSession(page) {
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem("kw-admin-remember-on");
    localStorage.removeItem("kw-admin-remember-pw");
    localStorage.removeItem("kw-admin-remember-user");
    localStorage.removeItem("kw-admin-remember-salt");
  });
}

async function seedPasswords(page) {
  await page.evaluate(({ dawid, szymon }) => {
    localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid, szymon }));
  }, { dawid: TEST_HASH_DAWID, szymon: TEST_HASH_SZYMON });
}

async function seedWorkerDirectory(page) {
  await page.evaluate(({ workerId }) => {
    const emp = {
      id: workerId,
      name: "Smoke Worker 2C",
      phone: "+48501123456",
      active: true,
      position: "Test",
      defaultRate: "100",
      notes: "",
      documents: {},
      workerPinHash: "",
    };
    localStorage.setItem("kw-directory", JSON.stringify([emp]));
  }, { workerId: WORKER_ID });
}

async function goLoginPick(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.waitForTimeout(4000);
}

async function logoutIfNeeded(page) {
  const logout = page.getByRole("button", { name: /Wyloguj/i }).first();
  if (await logout.isVisible().catch(() => false)) {
    await logout.click({ timeout: 10_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await goLoginPick(page);
  await clearSession(page);
  await seedPasswords(page);

  // 1. Admin login + remember password
  try {
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 10_000 });
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    const remembered = await page.evaluate(() => localStorage.getItem("kw-admin-remember-on") === "1");
    if (!remembered) throw new Error("Remember flag not set");
    results.adminLogin = "PASS";
    results.rememberPassword = "PASS";
  } catch (e) {
    results.adminLogin = `FAIL: ${e.message.split("\n")[0]}`;
    results.rememberPassword = results.rememberPassword ?? `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 2. Logout
  try {
    await logoutIfNeeded(page);
    results.logout = "PASS";
  } catch (e) {
    results.logout = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 3. Remember password prefill on re-open admin login
  try {
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 10_000 });
    await page.waitForTimeout(800);
    const prefilled = await page.locator('input[type="password"]').first().inputValue();
    if (prefilled !== TEST_PASS) throw new Error(`Password not prefilled: "${prefilled}"`);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    results.rememberPrefill = "PASS";
  } catch (e) {
    results.rememberPrefill = `FAIL: ${e.message.split("\n")[0]}`;
  }

  await logoutIfNeeded(page);

  // 4. Inspector login
  try {
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await page.waitForSelector("text=Logowanie inspektora", { timeout: 10_000 });
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.getByRole("button", { name: /Wejdź do panelu/i }).click();
    await page.waitForTimeout(3000);
    const onInspector = await page.locator("text=Inspektor").first().isVisible().catch(() => false);
    const notLogin = !(await page.locator("text=Panel administracyjny").isVisible().catch(() => false));
    if (!onInspector || !notLogin) throw new Error("Inspector panel not visible");
    results.inspectorLogin = "PASS";
  } catch (e) {
    results.inspectorLogin = `FAIL: ${e.message.split("\n")[0]}`;
  }

  await logoutIfNeeded(page);
  await clearSession(page);
  await seedPasswords(page);
  await seedWorkerDirectory(page);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.waitForTimeout(4000);
  await seedPasswords(page);

  // 5. Worker login + PIN setup
  try {
    await page.getByRole("button", { name: /Pracownik/i }).first().click();
    await page.waitForSelector("text=Logowanie pracownika", { timeout: 15_000 });
    await page.getByRole("button", { name: /Smoke Worker 2C/i }).click();
    await page.locator('input[placeholder*="501234567"]').fill("501123456");
    await page.getByRole("button", { name: /Dalej — ustaw kod/i }).click();
    await page.waitForSelector("text=Ustaw kod pracownika", { timeout: 10_000 });
    const pinInputs = page.locator('input[placeholder="••••"]');
    await pinInputs.nth(0).fill(WORKER_PIN);
    await pinInputs.nth(1).fill(WORKER_PIN);
    await page.getByRole("button", { name: /Zapisz kod i wejdź/i }).click();
    await page.waitForTimeout(3000);
    const onWorker = await page.locator("text=Smoke Worker 2C").first().isVisible().catch(() => false);
    const notLogin = !(await page.locator("text=Panel administracyjny").isVisible().catch(() => false));
    if (!onWorker || !notLogin) throw new Error("Worker view not visible after PIN setup");
    const hasPin = await page.evaluate((id) => {
      const dir = JSON.parse(localStorage.getItem("kw-directory") || "[]");
      const w = dir.find((d) => d.id === id);
      return !!(w?.workerPinHash && w.workerPinHash.length === 64);
    }, WORKER_ID);
    if (!hasPin) throw new Error("workerPinHash not saved");
    results.workerLogin = "PASS";
    results.workerPinSetup = "PASS";
  } catch (e) {
    results.workerLogin = `FAIL: ${e.message.split("\n")[0]}`;
    results.workerPinSetup = results.workerPinSetup ?? `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 6. Worker logout
  try {
    await page.getByRole("button", { name: /Wyloguj/i }).first().click({ timeout: 10_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
    results.workerLogout = "PASS";
  } catch (e) {
    results.workerLogout = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("Logowanie admina:       ", results.adminLogin ?? "SKIP");
console.log("Pamiętanie hasła:       ", results.rememberPassword ?? "SKIP");
console.log("Prefill hasła:          ", results.rememberPrefill ?? "SKIP");
console.log("Wylogowanie admin:      ", results.logout ?? "SKIP");
console.log("Logowanie inspektora:   ", results.inspectorLogin ?? "SKIP");
console.log("Logowanie pracownika:   ", results.workerLogin ?? "SKIP");
console.log("Ustawienie PIN:         ", results.workerPinSetup ?? "SKIP");
console.log("Wylogowanie pracownika: ", results.workerLogout ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
