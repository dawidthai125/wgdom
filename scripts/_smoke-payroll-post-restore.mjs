/**
 * P0F post-restore payroll smoke — production read-only UI check
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "https://www.wgdom.fun";
const results = {};

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.evaluate(() => {
    sessionStorage.setItem("wg-session-mode", "admin");
    sessionStorage.setItem(
      "wg-admin-session",
      JSON.stringify({ id: "dawid", login: "Dawid", displayName: "Dawid", role: "super_admin" }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
}

const consoleErrors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

try {
  await login(page);

  // 1. Lista płac
  try {
    await page.getByRole("button", { name: /Lista Płac/i }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(2500);
    const ls = await page.evaluate(() => {
      const emps = JSON.parse(localStorage.getItem("kw-week-employees") || "[]");
      let active = 0;
      let hours = 0;
      const parse = (t) => {
        const m = String(t || "").match(/^(\d+):(\d+)$/);
        return m ? +m[1] * 60 + +m[2] : null;
      };
      for (const e of emps) {
        for (const d of Object.values(e.days || {})) {
          if (d?.active) {
            active++;
            const f = parse(d.from);
            const t = parse(d.to);
            if (f != null && t != null && t > f) hours += (t - f) / 60;
          }
        }
      }
      return { count: emps.length, active, hours: +hours.toFixed(1), wf: localStorage.getItem("kw-weekFrom"), wt: localStorage.getItem("kw-weekTo") };
    });
    const body = await page.locator("body").innerText();
    results.payroll = {
      pass: ls.active >= 20 && ls.hours >= 190,
      detail: `LS: ${ls.count} emp, ${ls.active} active, ${ls.hours}h, week ${ls.wf}–${ls.wt}`,
    };
  } catch (e) {
    results.payroll = { pass: false, detail: e.message.split("\n")[0] };
  }

  // 2. Grafik
  try {
    await page.getByRole("button", { name: /^Grafik$/ }).click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    results.schedule = {
      pass: body.length > 100 && !body.includes("Błąd"),
      detail: "Grafik widoczny",
    };
  } catch (e) {
    results.schedule = { pass: false, detail: e.message.split("\n")[0] };
  }

  // 3. Roboty
  try {
    await page.getByRole("button", { name: /^Roboty$/ }).first().click({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    const jobs = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-jobs") || "[]").length);
    results.jobs = { pass: jobs === 12, detail: `${jobs} robot w LS` };
  } catch (e) {
    results.jobs = { pass: false, detail: e.message.split("\n")[0] };
  }

  // 4. Archiwum
  try {
    await page.getByRole("button", { name: /^Archiwum$/ }).click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    const arch = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-archive") || "[]").length);
    const body = await page.locator("body").innerText();
    results.archive = {
      pass: arch === 2 && (body.includes("2026-05-25") || body.includes("25.05") || body.includes("Archiwum")),
      detail: `${arch} tygodni archiwum`,
    };
  } catch (e) {
    results.archive = { pass: false, detail: e.message.split("\n")[0] };
  }

  results.consoleErrors = consoleErrors.filter((e) => !e.includes("404") && !e.includes("analytics"));
  results.consoleClean = results.consoleErrors.length === 0;
} finally {
  await browser.close();
}

const allPass = Object.entries(results)
  .filter(([k]) => !["consoleErrors", "consoleClean"].includes(k))
  .every(([, v]) => v.pass) && results.consoleClean;

console.log(JSON.stringify({ results, smokePass: allPass }, null, 2));
process.exit(allPass ? 0 : 1);
