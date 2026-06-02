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

const btn = page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).first();
console.log("BEFORE click - week buttons:", await page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).count());
console.log("BEFORE - on archive:", await page.getByText("Raport roczny PDF").isVisible());

await btn.click();
await page.waitForTimeout(1000);

console.log("AFTER click - week buttons:", await page.getByRole("button", { name: /\d{2}\.\d{2}\.\d{4} \u2013 \d{2}\.\d{2}\.\d{4}/ }).count());
console.log("AFTER - on archive:", await page.getByText("Raport roczny PDF").isVisible());
console.log("AFTER - edit hint:", await page.getByText("Kliknij pracownika").isVisible().catch(() => false));
console.log("AFTER - snippet:", (await page.locator("body").innerText()).slice(0, 400));

await page.context().browser()?.close();
