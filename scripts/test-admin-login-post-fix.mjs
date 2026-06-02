import { chromium } from "playwright";

const BASE = "https://www.wgdom.fun";
const PASS = {
  Dawid: "Dawidneon1990!",
  Stanislaw: "walek55is",
  Pawel: "watroba1991!",
  Szymon: "Inspektor2026!",
};

async function testLogin(page, mode, name, password) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 120_000 }).catch(() =>
    page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 }),
  );
  await page.waitForSelector("text=Panel administracyjny", { timeout: 120_000 });
  await page.evaluate(() => {
    sessionStorage.clear();
    ["kw-admin-remember-on", "kw-admin-remember-pw", "kw-admin-remember-user", "kw-admin-remember-salt"].forEach((k) =>
      localStorage.removeItem(k),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 120_000 });
  await page.waitForTimeout(5000);

  if (mode === "admin") {
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 20_000 });
  } else {
    await page.getByRole("button", { name: /^Inspektor$/i }).first().click();
    await page.waitForSelector("text=Logowanie inspektora", { timeout: 20_000 });
  }

  const pick = page.getByRole("button", { name: new RegExp(name, "i") });
  if (await pick.count()) await pick.first().click();

  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();

  try {
    if (mode === "admin") await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    else await page.waitForSelector("text=Roboty", { timeout: 90_000 });
    return { ok: true, detail: mode === "admin" ? "Pulpit" : "Panel inspektora" };
  } catch {
    const bad = await page.locator("text=Błędne hasło").isVisible().catch(() => false);
    return { ok: false, detail: bad ? "Błędne hasło" : "Timeout / brak panelu" };
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const results = {};
for (const [name, mode] of [
  ["Dawid", "admin"],
  ["Stanislaw", "admin"],
  ["Pawel", "admin"],
  ["Szymon", "inspector"],
]) {
  results[name] = await testLogin(page, mode, name, PASS[name]);
  console.log(`${name}: ${results[name].ok ? "PASS" : "FAIL"} — ${results[name].detail}`);
  const logout = page.getByRole("button", { name: /Wyloguj/i }).first();
  if (await logout.isVisible().catch(() => false)) {
    await logout.click({ timeout: 10_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 20_000 });
  }
}

await browser.close();
const superAdmin = results.Dawid?.ok === true;
console.log("\nSuper Admin odzyskany:", superAdmin ? "TAK" : "NIE");
process.exit(superAdmin ? 0 : 1);
