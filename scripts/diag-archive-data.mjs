import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
await page.goto("http://127.0.0.1:5213");
await page.waitForSelector("text=Panel administracyjny");
await page.evaluate(() => {
  sessionStorage.setItem("wg-session-mode", "admin");
  sessionStorage.setItem("wg-admin-session", JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }));
});
await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(3000);

const archive = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-archive") || "[]"));
const years = [...new Set(archive.map((w) => new Date(w.weekFrom).getFullYear()))].sort((a, b) => b - a);
const y = years[0];
const weeks = archive.filter((w) => new Date(w.weekFrom).getFullYear() === y).sort((a, b) => b.weekFrom.localeCompare(a.weekFrom));
const w = weeks[0];
const we = w?.weekEmployees?.[0];

console.log(JSON.stringify({
  totalWeeks: archive.length,
  activeYear: y,
  firstWeek: w ? { id: w.id, weekFrom: w.weekFrom, empCount: w.weekEmployees?.length, employeesCount: w.employees?.length } : null,
  firstWeekEmployee: we ? {
    name: we.name,
    dayKeys: we.days ? Object.keys(we.days) : null,
    sampleDay: we.days ? we.days[Object.keys(we.days)[0]] : null,
    hasActiveOnPn: we.days?.Pn?.active,
    hasMonKey: !!we.days?.mon,
  } : null,
}, null, 2));

await page.context().browser()?.close();
