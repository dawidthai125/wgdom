import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto("http://127.0.0.1:5213");
await page.evaluate(() => {
  sessionStorage.setItem("wg-session-mode", "admin");
  sessionStorage.setItem("wg-admin-session", JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }));
});
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
await page.waitForTimeout(800);

const panel = page.locator(".border-t.border-border").filter({ has: page.getByRole("button", { name: /^Lista płac$/i }) }).last();

const tabs = {};
try {
  await panel.getByRole("button", { name: /^Grafik$/i }).click({ timeout: 5000 });
  await panel.locator("table").first().waitFor({ state: "visible", timeout: 5000 });
  tabs.grafik = "OK";
} catch (e) { tabs.grafik = String(e.message).slice(0, 80); }

try {
  await panel.getByRole("button", { name: /^Lista płac$/i }).click({ timeout: 5000 });
  await panel.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 5000 });
  tabs.listaPlac = "OK";
} catch (e) { tabs.listaPlac = String(e.message).slice(0, 80); }

try {
  await panel.locator("table tbody tr").first().click({ timeout: 5000 });
  await panel.getByText("Zamknij edycję").waitFor({ state: "visible", timeout: 5000 });
  tabs.edit = "OK";
} catch (e) { tabs.edit = String(e.message).slice(0, 80); }

try {
  await panel.getByRole("button", { name: /Zamknij edycję/i }).click({ timeout: 3000 }).catch(() => {});
  const toggleBtn = panel.getByRole("button", { name: /Oczekuje|Rozliczony/i }).first();
  const before = await toggleBtn.textContent();
  await toggleBtn.click();
  await page.waitForTimeout(400);
  const after = await toggleBtn.textContent();
  tabs.toggle = before !== after ? "OK" : `unchanged:${before}`;
  await toggleBtn.click();
} catch (e) { tabs.toggle = String(e.message).slice(0, 80); }

console.log(JSON.stringify(tabs, null, 2));
await page.context().browser()?.close();
