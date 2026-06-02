/**
 * Post-deploy smoke ETAP 3A–3C — produkcja (read-only verification)
 * node scripts/smoke-prod-etap3c.mjs [BASE_URL]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "https://www.wgdom.fun";
const results = {};
const consoleErrors = [];
const pageErrors = [];

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
  await page.waitForTimeout(3000);
}

async function navTo(page, label) {
  const btn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }),
  });
  await btn.first().click({ timeout: 15_000 });
  await page.waitForTimeout(2000);
}

function viewError(page) {
  return page.locator("text=/Błąd:/").first().isVisible().catch(() => false);
}

console.log(`\n=== Post-deploy smoke ETAP 3A–3C ===\nBASE=${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => pageErrors.push(e.message));

try {
  // Admin login
  try {
    await loginAdmin(page);
    results["Logowanie admina"] = "PASS";
  } catch (e) {
    results["Logowanie admina"] = `FAIL: ${e.message.split("\n")[0]}`;
    throw e;
  }

  // Dashboard
  try {
    await navTo(page, "Pulpit");
    if (await viewError(page)) throw new Error("ViewErrorBoundary Pulpit");
    await page.waitForSelector("h1:text-is('Pulpit')", { timeout: 15_000 });
    await page.getByText("Roboty w trakcie", { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 });
    results.Dashboard = "PASS";
  } catch (e) {
    results.Dashboard = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // Roboty
  try {
    await navTo(page, "Roboty");
    if (await viewError(page)) throw new Error("ViewErrorBoundary Roboty");
    await page.locator("table, .bg-card, button").filter({ hasText: /ul\.|m\./i }).first().waitFor({ state: "visible", timeout: 15_000 });
    results.Roboty = "PASS";
  } catch (e) {
    results.Roboty = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // Lista płac
  try {
    await navTo(page, "Lista płac");
    if (await viewError(page)) throw new Error("ViewErrorBoundary Lista płac");
    await page.getByText(/Lista płac|Tydzień/i).first().waitFor({ state: "visible", timeout: 15_000 });
    results["Lista płac"] = "PASS";
  } catch (e) {
    results["Lista płac"] = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // Pracownicy
  try {
    await navTo(page, "Pracownicy");
    if (await viewError(page)) throw new Error("ViewErrorBoundary Pracownicy");
    await page.locator("table, .bg-card").first().waitFor({ state: "visible", timeout: 15_000 });
    results.Pracownicy = "PASS";
  } catch (e) {
    results.Pracownicy = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // Archiwum
  try {
    await navTo(page, "Archiwum");
    if (await viewError(page)) throw new Error("ViewErrorBoundary Archiwum");
    await page.getByRole("button", { name: /Raport roczny PDF/i }).waitFor({ state: "visible", timeout: 15_000 });
    results.Archiwum = "PASS";
  } catch (e) {
    results.Archiwum = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // Worker login — ekran + lista z chmury
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
    await page.getByRole("button", { name: /Pracownik/i }).first().click();
    await page.waitForSelector("text=Logowanie pracownika", { timeout: 15_000 });
    const workerBtn = page.locator("button").filter({ hasText: /^[A-ZĄĆĘŁŃÓŚŹŻ]/i }).first();
    await workerBtn.waitFor({ state: "visible", timeout: 15_000 });
    results["Worker login"] = "PASS";
  } catch (e) {
    results["Worker login"] = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // Worker szczegóły roboty — session inject (bez PIN) + pierwsza robota z chmury
  try {
    const workerCtx = await browser.newContext();
    const wp = await workerCtx.newPage();
    await wp.setViewportSize({ width: 390, height: 844 });
    await wp.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await wp.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
    await wp.waitForTimeout(3000);
    const worker = await wp.evaluate(() => {
      try {
        const dir = JSON.parse(localStorage.getItem("kw-directory") || "[]");
        const active = dir.find((e) => e.active !== false);
        return active ? { id: active.id, name: active.name } : null;
      } catch {
        return null;
      }
    });
    if (!worker?.id) throw new Error("Brak aktywnego pracownika w kw-directory");
    await wp.evaluate(({ id, name }) => {
      sessionStorage.clear();
      sessionStorage.setItem("wg-session-mode", "worker");
      sessionStorage.setItem("wg-worker-id", id);
      sessionStorage.setItem("wg-worker-name", name);
    }, worker);
    await wp.reload({ waitUntil: "domcontentloaded" });
    await wp.waitForSelector("text=Tryb pracownika", { timeout: 20_000 });
    await wp.waitForSelector("text=Wybierz robotę", { timeout: 20_000 });
    const jobBtn = wp.locator("button").filter({ hasText: /ul\.|m\.\d|Warsz|Krak|Gda|Łód|Wroc|Pozn/i }).first();
    await jobBtn.click({ timeout: 20_000 });
    await wp.waitForSelector("text=Galeria — wiele zdjęć", { timeout: 15_000 });
    await wp.waitForSelector("text=Raport z budowy", { timeout: 10_000 });
    results["Worker szczegóły roboty"] = "PASS";
    await workerCtx.close();
  } catch (e) {
    results["Worker szczegóły roboty"] = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

const allPass = Object.values(results).every((v) => v === "PASS" || String(v).startsWith("PASS"));
for (const [k, v] of Object.entries(results)) console.log(`${k.padEnd(28)} ${v}`);
const uniqConsole = [...new Set(consoleErrors)].filter((e) => !/404|favicon/i.test(e));
if (uniqConsole.length) console.log("\nConsole errors:", uniqConsole.slice(0, 5));
if (pageErrors.length) console.log("Page errors:", pageErrors.slice(0, 3));
console.log(`\nOverall: ${allPass ? "PASS" : "FAIL"}\n`);
process.exit(allPass ? 0 : 1);
