/**
 * Smoke ETAP 2A — AdminSettingsModal extraction
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap2a-admin-settings.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const APP_SETTINGS_KEY = "kw-app-settings";
const results = {};

console.log(`\n=== Smoke ETAP 2A (AdminSettingsModal) ===\nBASE=${BASE}\n`);

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
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await loginSuperAdmin(page);

  // 1. Open admin settings modal
  try {
    await page.getByTitle("Ustawienia administratorów").click({ timeout: 15_000 });
    await page.waitForSelector("text=Ustawienia administratorów", { timeout: 10_000 });
    const modalVisible = await page.locator("text=Tylko Super Administrator").isVisible();
    if (!modalVisible) throw new Error("Modal body not visible");
    results.openModal = "PASS";
  } catch (e) {
    results.openModal = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 2. Toggle appSettings (athPreviewEnabled)
  try {
    const before = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw).athPreviewEnabled : null;
    }, APP_SETTINGS_KEY);
    const checkbox = page.locator('label:has-text("Podgląd kosztorysów ATH/NOR") input[type="checkbox"]');
    await checkbox.click({ timeout: 10_000 });
    await page.waitForTimeout(500);
    const after = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw).athPreviewEnabled : null;
    }, APP_SETTINGS_KEY);
    if (before === after) throw new Error(`athPreviewEnabled unchanged: ${before} -> ${after}`);
    results.toggleAppSettings = "PASS";
  } catch (e) {
    results.toggleAppSettings = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 3. Export backup (download) — button inside admin settings modal only
  try {
    const modal = page.locator('div.fixed.inset-0.z-\\[60\\]');
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      modal.getByRole("button", { name: /Eksportuj backup/i }).click(),
    ]);
    const name = download.suggestedFilename();
    if (!name.endsWith(".json") || !name.startsWith("backup-")) {
      throw new Error(`Unexpected filename: ${name}`);
    }
    results.exportBackup = "PASS";
  } catch (e) {
    results.exportBackup = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 4. Close modal
  try {
    const closeBtn = page.locator(".fixed.inset-0.z-\\[60\\] button").filter({ has: page.locator("svg") }).first();
    await page.locator('div.fixed.inset-0.z-\\[60\\] button:has(svg)').first().click({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const stillOpen = await page.locator("text=Tylko Super Administrator").isVisible().catch(() => false);
    if (stillOpen) throw new Error("Modal still visible after close");
    results.closeModal = "PASS";
  } catch (e) {
    results.closeModal = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 5. Reopen modal
  try {
    await page.getByTitle("Ustawienia administratorów").click({ timeout: 15_000 });
    await page.waitForSelector("text=Tylko Super Administrator", { timeout: 10_000 });
    results.reopenModal = "PASS";
  } catch (e) {
    results.reopenModal = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("Otwarcie modala:        ", results.openModal ?? "SKIP");
console.log("Toggle appSettings:     ", results.toggleAppSettings ?? "SKIP");
console.log("Eksport backupu:        ", results.exportBackup ?? "SKIP");
console.log("Zamknięcie modala:      ", results.closeModal ?? "SKIP");
console.log("Ponowne otwarcie:       ", results.reopenModal ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
