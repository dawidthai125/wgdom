import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto("http://127.0.0.1:5213");
await page.waitForSelector("text=Panel administracyjny");
await page.evaluate(() => {
  sessionStorage.setItem("wg-session-mode", "admin");
  sessionStorage.setItem("wg-admin-session", JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }));
});
await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(3000);
await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
await page.waitForTimeout(2000);

const pdfVisible = await page.getByRole("button", { name: /Raport roczny PDF/i }).isVisible();
let pdfOk = false;
if (pdfVisible) {
  try {
    const dl = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: /Raport roczny PDF/i }).click();
    const d = await dl;
    pdfOk = d.suggestedFilename().endsWith(".pdf");
  } catch (e) {
    pdfOk = false;
  }
}

// delete flow with matching year/month
const TEST_ID = `smoke-del-${Date.now()}`;
const weekFrom = "2099-02-03";
await page.evaluate(({ id, weekFrom }) => {
  const days = {};
  for (const k of ["Pn", "Wt", "Sr", "Cz", "Pt", "So"]) days[k] = { active: false, from: "", to: "", zaliczka: "", extraHours: [] };
  days.Pn = { active: true, from: "08:00", to: "09:00", zaliczka: "", extraHours: [] };
  const archive = JSON.parse(localStorage.getItem("kw-archive") || "[]").filter((w) => w.id !== id);
  archive.push({
    id, weekFrom, weekTo: "2099-02-08", savedAt: new Date().toISOString(),
    employees: [{ name: "Smoke Del ETAP1D", position: "T", rate: 25, weekHours: 1, prevSatHours: 0, totalHours: 1, grossPay: 25, totalZaliczka: 0, totalExtraCosts: 0, netPay: 25, settled: false }],
    totalEmployees: 1, totalHours: 1, totalGross: 25, totalZaliczka: 0, totalNet: 25,
    weekEmployees: [{ id: crypto.randomUUID(), name: "Smoke Del ETAP1D", position: "T", rate: "25", settled: false, days, prevSaturday: { active: false, from: "", to: "", zaliczka: "", extraHours: [] }, extraCosts: [] }],
    workEntries: [],
  });
  localStorage.setItem("kw-archive", JSON.stringify(archive));
}, { id: TEST_ID, weekFrom });

await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(3000);
await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "2099" }).click().catch(() => {});
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Luty" }).click().catch(() => {});
await page.waitForTimeout(500);

const delCard = page.locator(".bg-card.rounded-xl.border.overflow-hidden").filter({ hasText: "Smoke Del ETAP1D" });
const delVisible = await delCard.first().isVisible().catch(() => false);
let deleteOk = false;
if (delVisible) {
  await delCard.first().locator(".flex.items-center.gap-2 > button").first().click();
  await page.getByRole("button", { name: /^Usuń$/i }).click();
  await page.waitForTimeout(800);
  deleteOk = !(await page.evaluate((id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id), TEST_ID));
}

console.log(JSON.stringify({ pdfVisible, pdfOk, delVisible, deleteOk }, null, 2));
await page.context().browser()?.close();
