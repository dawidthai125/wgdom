import { chromium } from "playwright";

const BASE = "https://www.wgdom.fun";
const ACCOUNTS = [
  { label: "Dawid", mode: "admin", userId: "dawid", password: "Dawidneon1990!", expect: "Pulpit" },
  { label: "Stanislaw", mode: "admin", userId: "stanislaw", password: "walek55is", expect: "Pulpit" },
  { label: "Pawel", mode: "admin", userId: "pawel", password: "watroba1991!", expect: "Pulpit", note: "cloud override — hasło startowe może nie pasować" },
  { label: "Szymon", mode: "inspector", userId: "szymon", password: "Inspektor2026!", expect: "inspektor" },
];

async function loginAccount(page, acc) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem("kw-admin-remember-on");
    localStorage.removeItem("kw-admin-remember-pw");
    localStorage.removeItem("kw-admin-remember-user");
    localStorage.removeItem("kw-admin-remember-salt");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 120_000 });
  await page.waitForTimeout(5000);

  if (acc.mode === "admin") {
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 20_000 });
    await page.locator("select").first().selectOption(acc.userId);
  } else {
    await page.getByRole("button", { name: /Inspektor/i }).first().click();
    await page.waitForSelector("text=Logowanie inspektora", { timeout: 20_000 });
    await page.locator("select").first().selectOption(acc.userId);
  }

  await page.locator('input[type="password"]').first().fill(acc.password);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.waitForTimeout(8000);

  const bad = await page.locator("text=Błędne hasło").isVisible().catch(() => false);
  const pulpit = await page.locator("text=Pulpit").isVisible().catch(() => false);
  const inspHeader = await page.locator("text=Szymon").first().isVisible().catch(() => false);

  if (bad) return { ok: false, detail: "Błędne hasło" };
  if (acc.mode === "admin" && pulpit) return { ok: true, detail: "Pulpit admina" };
  if (acc.mode === "inspector" && inspHeader && !pulpit) return { ok: true, detail: "Panel inspektora" };
  return { ok: false, detail: "Brak oczekiwanego panelu" };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const results = {};
for (const acc of ACCOUNTS) {
  results[acc.label] = await loginAccount(page, acc);
  console.log(`${acc.label}: ${results[acc.label].ok ? "PASS" : "FAIL"} — ${results[acc.label].detail}${acc.note ? " (" + acc.note + ")" : ""}`);
}

await browser.close();
console.log("\nSuper Admin (Dawid):", results.Dawid?.ok ? "ODZYSKANY" : "NIE");
