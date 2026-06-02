import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
await page.goto("http://127.0.0.1:5213");
await page.evaluate(() => {
  sessionStorage.setItem("wg-session-mode", "admin");
  sessionStorage.setItem("wg-admin-session", JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }));
});
await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(2000);

const TEST_ID = `smoke-del-${Date.now()}`;
await page.evaluate(({ id }) => {
  const days = {};
  for (const k of ["Pn", "Wt", "Sr", "Cz", "Pt", "So"]) days[k] = { active: false, from: "", to: "", zaliczka: "", extraHours: [] };
  days.Pn = { active: true, from: "08:00", to: "09:00", zaliczka: "", extraHours: [] };
  const weekFrom = "2099-02-03";
  const archive = JSON.parse(localStorage.getItem("kw-archive") || "[]").filter((w) => w.id !== id);
  archive.push({
    id, weekFrom, weekTo: "2099-02-08", savedAt: new Date().toISOString(),
    employees: [{ name: "Smoke Del ETAP1D", position: "T", rate: 25, weekHours: 1, prevSatHours: 0, totalHours: 1, grossPay: 25, totalZaliczka: 0, totalExtraCosts: 0, netPay: 25, settled: false }],
    totalEmployees: 1, totalHours: 1, totalGross: 25, totalZaliczka: 0, totalNet: 25,
    weekEmployees: [{ id: crypto.randomUUID(), name: "Smoke Del ETAP1D", position: "T", rate: "25", settled: false, days, prevSaturday: { active: false, from: "", to: "", zaliczka: "", extraHours: [] }, extraCosts: [] }],
    workEntries: [],
  });
  localStorage.setItem("kw-archive", JSON.stringify(archive));
}, { id: TEST_ID });

await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(4000);
await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "2099" }).click().catch(() => {});
await page.getByRole("button", { name: "Luty" }).click().catch(() => {});
await page.waitForTimeout(500);

const weekCard = page.locator(".bg-card.rounded-xl.border.overflow-hidden").filter({ has: page.getByRole("button", { name: /03\.02\.2099.*08\.02\.2099/ }) });
const cardCount = await weekCard.count();

let deleteOk = false;
if (cardCount > 0) {
  await weekCard.first().locator(".flex.items-center.gap-2 > button").first().click();
  await page.getByRole("button", { name: /^Usuń$/i }).click();
  await page.waitForTimeout(800);
  deleteOk = !(await page.evaluate((id) => JSON.parse(localStorage.getItem("kw-archive") || "[]").some((w) => w.id === id), TEST_ID));
}

console.log(JSON.stringify({ cardCount, deleteOk }, null, 2));
await page.context().browser()?.close();
