/**
 * Smoke ETAP 3C — weekly-backup-email extraction
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap3c-weekly-backup-email.mjs
 */
import { chromium } from "playwright";
import { createHash } from "crypto";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const TEST_PASS = "smoke-etap3c-pass";
const TEST_HASH_DAWID = createHash("sha256").update(`wgdom-admin-account-v1:Dawid:${TEST_PASS}`).digest("hex");
const results = {};
const consoleErrors = [];

console.log(`\n=== Smoke ETAP 3C (weekly-backup-email) ===\nBASE=${BASE}\n`);

function weekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(mon), to: fmt(sun) };
}

async function clickSidebar(page, label) {
  const btn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }),
  });
  if (await btn.count()) await btn.first().click({ timeout: 15_000 });
  else await page.getByRole("button", { name: new RegExp(label, "i") }).first().click({ timeout: 15_000 });
  await page.waitForTimeout(700);
}

const { from, to } = weekRange();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(err.message));

let backupEmailCalls = 0;
page.on("request", (req) => {
  if (req.url().includes("send-backup-email")) backupEmailCalls += 1;
});

// Force Sunday so triggerWeeklyBackupEmail runs after save week
await page.addInitScript(() => {
  const sunday = new Date();
  sunday.setHours(12, 0, 0, 0);
  while (sunday.getDay() !== 0) sunday.setDate(sunday.getDate() + 1);
  const ts = sunday.getTime();
  const Orig = globalThis.Date;
  const MockDate = function (...args) {
    if (args.length === 0) return new Orig(ts);
    return new Orig(...args);
  };
  MockDate.now = () => ts;
  MockDate.parse = Orig.parse;
  MockDate.UTC = Orig.UTC;
  MockDate.prototype = Orig.prototype;
  globalThis.Date = MockDate;
});

await page.addInitScript(({ weekFrom, weekTo, adminHash }) => {
  localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
  localStorage.removeItem("kw-last-backup-week");
  localStorage.setItem("kw-jobs", JSON.stringify([{
    id: "job-3c", address: "Smoke Backup 3C", flatNumber: "1", client: "Test",
    startDate: weekFrom, endDate: "", status: "in_progress", keysHandedOver: false,
    notes: "", documents: {}, workEntries: [], materials: [],
    invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: "",
    photos: [], workerReports: [], activityLog: [],
  }]));
  localStorage.setItem("kw-week-employees", JSON.stringify([{
    id: "we-3c", directoryId: "dir-3c", name: "Smoke Emp 3C", phone: "+48500111222",
    position: "Test", rate: "100",
    days: { Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" }, Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, So: { active: false, from: "07:00", to: "16:00", zaliczka: "" } },
    prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    extraCosts: [], settled: false,
  }]));
  localStorage.setItem("kw-weekFrom", JSON.stringify(weekFrom));
  localStorage.setItem("kw-weekTo", JSON.stringify(weekTo));
  localStorage.setItem("kw-archive", JSON.stringify([]));
  localStorage.setItem("kw-directory", JSON.stringify([]));
  localStorage.setItem("kw-contacts", JSON.stringify([]));
}, { weekFrom: from, weekTo: to, adminHash: TEST_HASH_DAWID });

try {
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
    results.appStart = "PASS";
  } catch (e) {
    results.appStart = `FAIL: ${e.message.split("\n")[0]}`;
  }

  try {
    await page.evaluate(({ adminHash }) => {
      localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
    }, { adminHash: TEST_HASH_DAWID });
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 10_000 });
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    results.adminLogin = "PASS";
  } catch (e) {
    results.adminLogin = `FAIL: ${e.message.split("\n")[0]}`;
  }

  if (results.adminLogin === "PASS") {
    try {
      await clickSidebar(page, "Lista płac");
      await page.waitForSelector("text=Smoke Emp 3C", { timeout: 30_000 });
      backupEmailCalls = 0;
      const saveBtn = page.getByRole("button", { name: /Zapisz tydzień/i }).first();
      await saveBtn.click({ timeout: 15_000 });
      await page.waitForTimeout(2000);
      const weekSaved = await page.evaluate((weekFrom) => {
        const arch = JSON.parse(localStorage.getItem("kw-archive") || "[]");
        return arch.some((w) => w.weekFrom === weekFrom);
      }, from);
      if (!weekSaved) throw new Error("Week not saved to kw-archive");
      results.saveWeek = "PASS";
    } catch (e) {
      results.saveWeek = `FAIL: ${e.message.split("\n")[0]}`;
    }

    try {
      const backupKey = await page.evaluate((weekFrom) => localStorage.getItem("kw-last-backup-week"), from);
      if (backupEmailCalls < 1 && backupKey !== from) {
        throw new Error(`Backup helper not triggered (calls=${backupEmailCalls}, key=${backupKey})`);
      }
      results.backupHelper = backupEmailCalls >= 1 ? "PASS" : `PASS (kw-last-backup-week=${backupKey})`;
    } catch (e) {
      results.backupHelper = `FAIL: ${e.message.split("\n")[0]}`;
    }
  }

  const criticalErrors = consoleErrors.filter(
    (e) => !/favicon|404|Failed to load resource|send-backup-email/i.test(e),
  );
  results.noConsoleErrors = criticalErrors.length === 0 ? "PASS" : `FAIL: ${criticalErrors.slice(0, 2).join("; ")}`;
} finally {
  await browser.close();
}

console.log("Start aplikacji:       ", results.appStart ?? "SKIP");
console.log("Logowanie admina:      ", results.adminLogin ?? "SKIP");
console.log("Zapis tygodnia:        ", results.saveWeek ?? "SKIP");
console.log("Helper backup email:   ", results.backupHelper ?? "SKIP");
console.log("Brak błędów konsoli:   ", results.noConsoleErrors ?? "SKIP");
console.log("");

const required = ["appStart", "adminLogin", "saveWeek", "backupHelper", "noConsoleErrors"];
const allPass = required.every((k) => results[k] === "PASS" || String(results[k]).startsWith("PASS"));
process.exit(allPass ? 0 : 1);
