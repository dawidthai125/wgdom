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

const meta = await page.evaluate(() => {
  const archive = JSON.parse(localStorage.getItem("kw-archive") || "[]");
  const real = archive.filter((w) => !String(w.id).startsWith("smoke-etap1d-"));
  const smoke = archive.filter((w) => String(w.id).startsWith("smoke-etap1d-"));
  const sample = real[0];
  const we = sample?.weekEmployees?.[0];
  return {
    realCount: real.length,
    smokeCount: smoke.length,
    sampleWeek: sample ? { id: sample.id, weekFrom: sample.weekFrom, weekTo: sample.weekTo } : null,
    sampleDayKeys: we?.days ? Object.keys(we.days) : null,
    samplePn: we?.days?.Pn ?? null,
  };
});
console.log("META", JSON.stringify(meta, null, 2));

await page.locator("nav.admin-sidebar-nav button").filter({ has: page.locator("span.flex-1", { hasText: /^Archiwum$/i }) }).first().click();
await page.waitForTimeout(2000);

if (meta.sampleWeek) {
  const label = await page.evaluate(({ from, to }) => {
    const fmt = (iso) => { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };
    return `${fmt(from)} – ${fmt(to)}`;
  }, { from: meta.sampleWeek.weekFrom, to: meta.sampleWeek.weekTo });

  // select year/month if needed
  const year = new Date(meta.sampleWeek.weekFrom).getFullYear();
  const monthIdx = new Date(meta.sampleWeek.weekFrom).getMonth();
  const MONTH_NAMES = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
  await page.getByRole("button", { name: String(year) }).click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: MONTH_NAMES[monthIdx] }).click().catch(() => {});
  await page.waitForTimeout(500);

  const btn = page.getByRole("button", { name: label });
  console.log("Clicking real week:", label, "visible:", await btn.isVisible().catch(() => false));
  await btn.click();
  await page.waitForTimeout(1500);
  console.log("After expand - edit hint:", await page.getByText("Kliknij pracownika").isVisible().catch(() => false));
  console.log("After expand - error UI:", await page.getByText(/Błąd: Archiwum/).isVisible().catch(() => false));
  console.log("Errors:", errors);
}

await page.context().browser()?.close();
