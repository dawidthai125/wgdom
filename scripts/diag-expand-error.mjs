import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

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

const btn = page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).first();
await btn.click();
await page.waitForTimeout(1500);

const errUi = await page.getByText(/Błąd: Archiwum/).isVisible().catch(() => false);
const errDetail = await page.locator("text=/Cannot read|TypeError|undefined/i").allTextContents();

console.log(JSON.stringify({ errUi, errDetail, pageErrors: errors }, null, 2));
await page.context().browser()?.close();
