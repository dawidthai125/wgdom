/**
 * Smoke ETAP 1D — ArchiveView
 * PW_BASE_URL=http://127.0.0.1:5212 node scripts/smoke-etap1d-archive.mjs
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
  await page.waitForTimeout(3000);
}

function weekRowBtn(page) {
  return page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).first();
}

function expandedPanel(page) {
  return page.locator(".border-t.border-border").filter({
    has: page.getByRole("button", { name: /^Lista płac$/i }),
  }).last();
}

console.log("\n=== Smoke ETAP 1D (ArchiveView) ===\n");
console.log(`BASE=${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

try {
  await loginAdmin(page, BASE);

  let weekBtn = null;

  try {
    await page
      .locator("nav.admin-sidebar-nav button")
      .filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) })
      .first()
      .click({ timeout: 15_000 });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: /Raport roczny PDF/i }).waitFor({ state: "visible", timeout: 10_000 });
    weekBtn = weekRowBtn(page);
    await weekBtn.waitFor({ state: "visible", timeout: 10_000 });
    results.openArchive = "PASS";

    await weekBtn.evaluate((el) => el.click());
    await page.waitForTimeout(800);
    if (!(await expandedPanel(page).isVisible().catch(() => false))) {
      await weekBtn.evaluate((el) => el.click());
      await page.waitForTimeout(800);
    }
    await expandedPanel(page).waitFor({ state: "visible", timeout: 5_000 });
    results.expandWeek = "PASS";
  } catch (e) {
    if (!results.openArchive) results.openArchive = `FAIL: ${e.message}`;
    if (!results.expandWeek) results.expandWeek = `FAIL: ${e.message}`;
  }

  if (!results.openArchive) results.openArchive = "FAIL: skipped";
  if (!results.expandWeek) results.expandWeek = "FAIL: skipped";

  const panel = expandedPanel(page);

  try {
    await panel.getByRole("button", { name: /^Grafik$/i }).click({ timeout: 10_000 });
    await panel.locator("table").first().waitFor({ state: "visible", timeout: 5_000 });
    results.scheduleTab = "PASS";
  } catch (e) {
    results.scheduleTab = `FAIL: ${e.message}`;
  }

  try {
    await panel.getByRole("button", { name: /^Lista płac$/i }).click({ timeout: 10_000 });
    await panel.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 5_000 });
    results.payrollTab = "PASS";
  } catch (e) {
    results.payrollTab = `FAIL: ${e.message}`;
  }

  try {
    const row = panel.locator("table tbody tr").filter({ has: page.locator("button, td") }).first();
    await row.click({ timeout: 10_000 });
    await panel.getByText("Zamknij edycję").waitFor({ state: "visible", timeout: 10_000 });
    results.editEmployee = "PASS";
  } catch (e) {
    results.editEmployee = `FAIL: ${e.message}`;
  }

  try {
    await panel.getByRole("button", { name: /Zamknij edycję/i }).click({ timeout: 5_000 }).catch(() => {});
    const toggleBtn = panel.getByRole("button", { name: /Oczekuje|Rozliczony/i }).first();
    const before = await toggleBtn.textContent();
    await toggleBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const after = await toggleBtn.textContent();
    if (before === after) throw new Error(`Toggle unchanged: ${before}`);
    await toggleBtn.click({ timeout: 10_000 });
    results.toggleSettled = "PASS";
  } catch (e) {
    results.toggleSettled = `FAIL: ${e.message}`;
  }

  try {
    await page.getByRole("button", { name: /Raport roczny PDF/i }).click({ timeout: 10_000 });
    const download = await page.waitForEvent("download", { timeout: 90_000 });
    if (!download.suggestedFilename().endsWith(".pdf")) throw new Error("Not a PDF");
    results.pdfExport = "PASS";
  } catch (e) {
    results.pdfExport = `FAIL: ${e.message}`;
  }

  try {
    const TEST_WEEK_ID = `smoke-etap1d-${Date.now()}`;
    const empId = crypto.randomUUID();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const weekFrom = `${y}-${String(m + 1).padStart(2, "0")}-28`;
    const testWeek = {
      id: TEST_WEEK_ID,
      weekFrom,
      weekTo: weekFrom,
      savedAt: new Date().toISOString(),
      employees: [{ name: "Smoke Del ETAP1D", position: "T", rate: 25, weekHours: 1, prevSatHours: 0, totalHours: 1, grossPay: 25, totalZaliczka: 0, totalExtraCosts: 0, netPay: 25, settled: false }],
      totalEmployees: 1,
      totalHours: 1,
      totalGross: 25,
      totalZaliczka: 0,
      totalNet: 25,
      weekEmployees: [{ id: empId, name: "Smoke Del ETAP1D", position: "T", rate: "25", settled: false, days: { mon: { hours: "1", from: "08:00", to: "09:00", zaliczka: "", note: "" }, tue: { hours: "", from: "", to: "", zaliczka: "", note: "" }, wed: { hours: "", from: "", to: "", zaliczka: "", note: "" }, thu: { hours: "", from: "", to: "", zaliczka: "", note: "" }, fri: { hours: "", from: "", to: "", zaliczka: "", note: "" }, sat: { hours: "", from: "", to: "", zaliczka: "", note: "" } }, prevSaturday: { hours: "", from: "", to: "", zaliczka: "", note: "" }, extraCosts: [] }],
      workEntries: [],
    };
    await page.evaluate(({ week, id }) => {
      const archive = JSON.parse(localStorage.getItem("kw-archive") || "[]").filter((w) => w.id !== id);
      archive.push(week);
      localStorage.setItem("kw-archive", JSON.stringify(archive));
    }, { week: testWeek, id: TEST_WEEK_ID });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    await page.waitForTimeout(2500);
    await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
    await page.waitForTimeout(2000);
    const delCard = page.locator(".bg-card.rounded-xl.border.overflow-hidden").filter({ hasText: "Smoke Del ETAP1D" }).first();
    await delCard.waitFor({ state: "visible", timeout: 15_000 });
    await delCard.locator(".flex.items-center.gap-2 > button").first().evaluate((el) => el.click());
    await page.getByRole("button", { name: /^Usuń$/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    const inStorage = await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id),
      TEST_WEEK_ID,
    );
    if (inStorage) throw new Error("Test week still in localStorage");
    results.deleteWeek = "PASS";
  } catch (e) {
    results.deleteWeek = `FAIL: ${e.message}`;
  }
} finally {
  await browser.close();
}

console.log("Wejście do Archiwum:       ", results.openArchive ?? "SKIP");
console.log("Rozwinięcie tygodnia:      ", results.expandWeek ?? "SKIP");
console.log("Zakładka Grafik:           ", results.scheduleTab ?? "SKIP");
console.log("Zakładka Lista płac:       ", results.payrollTab ?? "SKIP");
console.log("Edycja pracownika:         ", results.editEmployee ?? "SKIP");
console.log("Toggle rozliczenia:        ", results.toggleSettled ?? "SKIP");
console.log("Generowanie PDF:           ", results.pdfExport ?? "SKIP");
console.log("Usunięcie tygodnia test.:  ", results.deleteWeek ?? "SKIP");
console.log("");

process.exit(Object.values(results).every((v) => v === "PASS") ? 0 : 1);
