import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.wgdom.fun", { waitUntil: "networkidle", timeout: 60000 });
await page.getByRole("button", { name: /Panel administracyjny|Admin/i }).click();
await page.locator("select").first().selectOption("stanislaw");
await page.locator('input[type="password"]').fill("walek55is");
await page.getByRole("button", { name: /Zaloguj/i }).click();
await page.waitForTimeout(4000);

const session = JSON.parse(await page.evaluate(() => sessionStorage.getItem("wg-admin-session") || "null"));
const hasPulpit = await page.getByText("Pulpit").first().isVisible().catch(() => false);
const gearCount = await page.locator('button[aria-label="Ustawienia"], button[title*="stawien"]').count();

console.log("Pulpit:", hasPulpit ? "PASS" : "FAIL");
console.log("Role:", session?.role ?? "none");
console.log("Super Admin:", session?.role === "super_admin" ? "YES (unexpected)" : "NO (expected admin)");
console.log("Admin:", session?.role === "admin" ? "PASS" : "FAIL");
console.log("Gear buttons:", gearCount);

await browser.close();
