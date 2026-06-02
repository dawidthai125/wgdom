import { chromium } from "playwright";

async function test(label, setup, password, expectText) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://www.wgdom.fun", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector("text=Panel administracyjny", { timeout: 120_000 });
    await page.waitForTimeout(5000);
    await setup(page);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await page.waitForSelector(expectText, { timeout: 90_000 });
    console.log(`${label}: PASS`);
    return true;
  } catch {
    const bad = await page.locator("text=Błędne hasło").isVisible().catch(() => false);
    console.log(`${label}: FAIL — ${bad ? "Błędne hasło" : "timeout/brak panelu"}`);
    return false;
  } finally {
    await browser.close();
  }
}

const r = {};
r.Dawid = await test(
  "Dawid",
  async (p) => {
    await p.getByRole("button", { name: /Panel administracyjny/i }).click();
    await p.waitForSelector("text=Logowanie administratora");
    await p.locator("select").first().selectOption("dawid");
  },
  "Dawidneon1990!",
  "text=Pulpit",
);
r.Stanislaw = await test(
  "Stanislaw",
  async (p) => {
    await p.getByRole("button", { name: /Panel administracyjny/i }).click();
    await p.waitForSelector("text=Logowanie administratora");
    await p.locator("select").first().selectOption("stanislaw");
  },
  "walek55is",
  "text=Pulpit",
);
r.Pawel = await test(
  "Pawel",
  async (p) => {
    await p.getByRole("button", { name: /Panel administracyjny/i }).click();
    await p.waitForSelector("text=Logowanie administratora");
    await p.locator("select").first().selectOption("pawel");
  },
  "watroba1991!",
  "text=Pulpit",
);
r.Szymon = await test(
  "Szymon",
  async (p) => {
    await p.getByRole("button", { name: /Inspektor/i }).first().click();
    await p.waitForSelector("text=Logowanie inspektora");
    await p.locator("select").first().selectOption("szymon");
  },
  "Inspektor2026!",
  "text=Roboty",
);

console.log("\nSuper Admin odzyskany:", r.Dawid ? "TAK" : "NIE");
