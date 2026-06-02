import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
await page.goto("http://127.0.0.1:5213");
await page.evaluate(() => {
  sessionStorage.setItem("wg-session-mode", "admin");
  sessionStorage.setItem("wg-admin-session", JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }));
});
await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(3000);

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

const monthButtons = await page.locator("button").filter({ hasText: /^Lut|^Sty|^Mar|^Kwi|^Maj|^Cze|^Lip|^Sie|^Wrz|^Paź|^Lis|^Gru/ }).allTextContents();
const hasSmoke = await page.locator("text=Smoke Del ETAP1D").count();
const body = await page.locator("body").innerText();
console.log(JSON.stringify({ monthButtons: monthButtons.slice(0, 15), hasSmoke, snippet: body.match(/2099[\s\S]{0,200}/)?.[0] }, null, 2));

// try click month containing Lut
await page.getByRole("button", { name: /Lut/i }).first().click().catch(() => {});
await page.waitForTimeout(500);
const hasSmoke2 = await page.locator("text=Smoke Del ETAP1D").count();
console.log("after Lut click:", hasSmoke2);

await page.context().browser()?.close();
