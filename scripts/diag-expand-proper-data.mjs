import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://127.0.0.1:5213");
await page.waitForSelector("text=Panel administracyjny");
await page.evaluate(() => {
  sessionStorage.setItem("wg-session-mode", "admin");
  sessionStorage.setItem("wg-admin-session", JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }));
});
await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(3000);

// Inject ONE properly structured week at 2026-05-19 (real domain shape)
const TEST_ID = "diag-proper-week";
await page.evaluate(({ id }) => {
  const archive = JSON.parse(localStorage.getItem("kw-archive") || "[]").filter((w) => w.id !== id);
  const days = {};
  for (const k of ["Pn", "Wt", "Sr", "Cz", "Pt", "So"]) {
    days[k] = { active: k === "Pn", from: "08:00", to: "16:00", zaliczka: "", extraHours: [] };
  }
  archive.push({
    id,
    weekFrom: "2026-05-19",
    weekTo: "2026-05-24",
    savedAt: new Date().toISOString(),
    employees: [{ name: "Diag Proper", position: "T", rate: 30, weekHours: 8, prevSatHours: 0, totalHours: 8, grossPay: 240, totalZaliczka: 0, totalExtraCosts: 0, netPay: 240, settled: false }],
    totalEmployees: 1, totalHours: 8, totalGross: 240, totalZaliczka: 0, totalNet: 240,
    weekEmployees: [{ id: crypto.randomUUID(), name: "Diag Proper", position: "T", rate: "30", settled: false, days, prevSaturday: { active: false, from: "", to: "", zaliczka: "", extraHours: [] }, extraCosts: [] }],
    workEntries: [],
  });
  localStorage.setItem("kw-archive", JSON.stringify(archive));
}, { id: TEST_ID });

await page.reload();
await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
await page.waitForTimeout(3000);
await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "2026" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Maj" }).click();
await page.waitForTimeout(500);

const btn = page.getByRole("button", { name: /19\.05\.2026.*24\.05\.2026/ }).first();
await btn.click();
await page.waitForTimeout(1500);

console.log(JSON.stringify({
  editHint: await page.getByText("Kliknij pracownika").isVisible().catch(() => false),
  listaPlac: await page.getByRole("button", { name: /^Lista płac$/i }).isVisible().catch(() => false),
  grafik: await page.getByRole("button", { name: /^Grafik$/i }).count(),
  errorUi: await page.getByText(/Błąd: Archiwum/).isVisible().catch(() => false),
  errors,
}, null, 2));

await page.context().browser()?.close();
