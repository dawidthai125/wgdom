import { chromium } from "playwright";
import { createHash } from "crypto";

const PASS = "smoke-etap2c-pass";
const hash = createHash("sha256").update(`wgdom-admin-account-v1:Dawid:${PASS}`).digest("hex");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
await page.waitForTimeout(4000);
await page.evaluate((h) => {
  localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: h }));
}, hash);
const stored = await page.evaluate(() => localStorage.getItem("kw-admin-passwords"));
console.log("stored after seed", stored);
await page.getByRole("button", { name: /Panel administracyjny/i }).click();
await page.waitForSelector("text=Logowanie administratora");
await page.locator("input[type=password]").fill(PASS);
await page.getByRole("button", { name: /^Zaloguj$/ }).click();
await page.waitForTimeout(8000);
const texts = await page.locator("body").innerText();
console.log("hasPulpit", texts.includes("Pulpit"));
console.log("hasPassError", texts.includes("Błędne hasło"));
await browser.close();
