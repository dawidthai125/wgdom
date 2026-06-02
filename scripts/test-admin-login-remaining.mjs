import { chromium } from "playwright";

const BASE = "https://www.wgdom.fun";

async function freshLogin(page, mode, userPattern, password) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 120_000 });
  await page.waitForTimeout(6000);

  if (mode === "admin") {
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 20_000 });
  } else {
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await page.waitForSelector("text=Logowanie inspektora", { timeout: 20_000 });
  }

  await page.getByRole("button", { name: userPattern }).first().click();
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.waitForTimeout(8000);

  const bad = await page.locator("text=Błędne hasło").isVisible().catch(() => false);
  const pulpit = await page.locator("text=Pulpit").isVisible().catch(() => false);
  const insp = await page.locator("text=Szymon").first().isVisible().catch(() => false);
  return { bad, pulpit, insp, body: (await page.locator("body").innerText()).slice(0, 200) };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const tests = [
  ["Stanislaw", "admin", /Stanislaw/i, "walek55is"],
  ["Pawel", "admin", /Pawel/i, "watroba1991!"],
  ["Szymon", "inspector", /Szymon/i, "Inspektor2026!"],
];

for (const [label, mode, pattern, pass] of tests) {
  const r = await freshLogin(page, mode, pattern, pass);
  console.log(label, r.bad ? "FAIL (Błędne hasło)" : r.pulpit ? "PASS (Pulpit)" : r.insp ? "PASS (Inspektor UI)" : "FAIL", r.body.split("\n").slice(0, 3).join(" | "));
}

await browser.close();
