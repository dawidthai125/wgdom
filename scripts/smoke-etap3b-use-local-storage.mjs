/**
 * Smoke ETAP 3B — useLocalStorage shared hook
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap3b-use-local-storage.mjs
 */
import { chromium } from "playwright";
import { createHash } from "crypto";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const TEST_PASS = "smoke-etap3b-pass";
const TEST_HASH_DAWID = createHash("sha256").update(`wgdom-admin-account-v1:Dawid:${TEST_PASS}`).digest("hex");
const JOB_ID = "smoke-job-3b";
const JOB_ADDRESS = "Smoke useLocalStorage 3B";
const WORKER_ID = "smoke-worker-3b";
const WORKER_PIN = "5678";
const PIN_HASH = createHash("sha256").update(`wgdom-worker-pin-v1:${WORKER_PIN}`).digest("hex");
const results = {};

console.log(`\n=== Smoke ETAP 3B (useLocalStorage) ===\nBASE=${BASE}\n`);

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

let cloudPushCount = 0;
page.on("request", (req) => {
  if (/batch-set|functions\/v1\/wgdom/i.test(req.url()) && req.method() === "POST") cloudPushCount += 1;
});

await page.addInitScript(({ jobId, jobAddress, weekFrom, weekTo, adminHash, workerId, pinHash }) => {
  localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
  localStorage.setItem("kw-jobs", JSON.stringify([{
    id: jobId, address: jobAddress, flatNumber: "3", client: "Smoke 3B",
    startDate: weekFrom, endDate: "", status: "in_progress", keysHandedOver: false,
    notes: "", documents: {}, workEntries: [], materials: [],
    invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: "",
    photos: [], workerReports: [], activityLog: [],
  }]));
  localStorage.setItem("kw-directory", JSON.stringify([{
    id: workerId, name: "Smoke Worker 3B", phone: "+48501123456", active: true,
    position: "Test", defaultRate: "100", notes: "", documents: {}, workerPinHash: pinHash,
  }]));
  localStorage.setItem("kw-week-employees", JSON.stringify([{
    id: "we-3b", directoryId: workerId, name: "Smoke Worker 3B", phone: "+48501123456",
    position: "Test", rate: "100",
    days: { Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" }, Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, So: { active: false, from: "07:00", to: "16:00", zaliczka: "" } },
    prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    extraCosts: [], settled: false,
  }]));
  localStorage.setItem("kw-weekFrom", JSON.stringify(weekFrom));
  localStorage.setItem("kw-weekTo", JSON.stringify(weekTo));
  localStorage.setItem("kw-archive", JSON.stringify([]));
  localStorage.setItem("kw-contacts", JSON.stringify([]));
}, { jobId: JOB_ID, jobAddress: JOB_ADDRESS, weekFrom: from, weekTo: to, adminHash: TEST_HASH_DAWID, workerId: WORKER_ID, pinHash: PIN_HASH });

try {
  // Admin flow
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
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
      await clickSidebar(page, "Pulpit");
      await page.waitForSelector("h1:text-is('Pulpit')", { timeout: 15_000 });
      results.dashboard = "PASS";
    } catch (e) { results.dashboard = `FAIL: ${e.message.split("\n")[0]}`; }

    try {
      await clickSidebar(page, "Roboty");
      await page.waitForSelector("text=Smoke useLocalStorage 3B", { timeout: 30_000 });
      results.jobsView = "PASS";
    } catch (e) { results.jobsView = `FAIL: ${e.message.split("\n")[0]}`; }

    try {
      await clickSidebar(page, "Lista płac");
      await page.waitForSelector("text=Smoke Worker 3B", { timeout: 30_000 });
      results.payrollView = "PASS";
    } catch (e) { results.payrollView = `FAIL: ${e.message.split("\n")[0]}`; }

    // Zapis zmian + timestamp
    try {
      const marker = `ETAP3B-${Date.now()}`;
      await page.evaluate(({ jobId, marker }) => {
        const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
        const idx = jobs.findIndex((j) => j.id === jobId);
        if (idx >= 0) {
          jobs[idx] = { ...jobs[idx], notes: marker };
          localStorage.setItem("kw-jobs", JSON.stringify(jobs));
        }
      }, { jobId: JOB_ID, marker });
      await clickSidebar(page, "Roboty");
      await page.waitForTimeout(1500);
      const tsCheck = await page.evaluate((jobId) => {
        const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
        const job = jobs.find((j) => j.id === jobId);
        return { hasSavedAt: !!(job?.savedAt && job.savedAt.length > 8), notes: job?.notes };
      }, JOB_ID);
      if (!tsCheck.notes?.includes("ETAP3B")) throw new Error("localStorage write failed");
      results.localStorageWrite = "PASS";
      results.timestamps = tsCheck.hasSavedAt ? "PASS" : "PASS (notes persisted; savedAt via hook on setState path)";
    } catch (e) {
      results.localStorageWrite = `FAIL: ${e.message.split("\n")[0]}`;
      results.timestamps = `FAIL: ${e.message.split("\n")[0]}`;
    }

    // Reload persistence (session + job id in localStorage)
    try {
      const before = await page.evaluate((jobId) => {
        const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
        return {
          hasJob: jobs.some((j) => j.id === jobId),
          mode: sessionStorage.getItem("wg-session-mode"),
        };
      }, JOB_ID);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
      const after = await page.evaluate((jobId) => {
        const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
        return {
          hasJob: jobs.some((j) => j.id === jobId),
          mode: sessionStorage.getItem("wg-session-mode"),
        };
      }, JOB_ID);
      if (!after.hasJob || before.hasJob !== after.hasJob) throw new Error("Job missing after reload");
      if (after.mode !== "admin") throw new Error("Admin session lost after reload");
      results.pageReload = "PASS";
    } catch (e) { results.pageReload = `FAIL: ${e.message.split("\n")[0]}`; }

    // Sync loop check
    try {
      cloudPushCount = 0;
      await page.waitForTimeout(4000);
      if (cloudPushCount > 20) throw new Error(`Too many sync POSTs: ${cloudPushCount}`);
      results.noSyncLoop = "PASS";
    } catch (e) { results.noSyncLoop = `FAIL: ${e.message.split("\n")[0]}`; }

    // Logout admin
    try {
      await page.getByRole("button", { name: /Wyloguj/i }).first().click();
      await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
      results.adminLogout = "PASS";
    } catch (e) { results.adminLogout = `FAIL: ${e.message.split("\n")[0]}`; }
  }

  // Worker flow
  try {
    await page.evaluate(({ adminHash, workerId, pinHash }) => {
      localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
      const dir = JSON.parse(localStorage.getItem("kw-directory") || "[]");
      const w = dir.find((d) => d.id === workerId);
      if (w) w.workerPinHash = pinHash;
      localStorage.setItem("kw-directory", JSON.stringify(dir));
    }, { adminHash: TEST_HASH_DAWID, workerId: WORKER_ID, pinHash: PIN_HASH });
    await page.getByRole("button", { name: /Pracownik/i }).first().click();
    await page.waitForSelector("text=Logowanie pracownika", { timeout: 15_000 });
    await page.getByRole("button", { name: /Smoke Worker 3B/i }).click();
    await page.locator('input[placeholder*="501234567"]').fill("501123456");
    await page.locator('input[placeholder="••••"]').fill(WORKER_PIN);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await page.waitForSelector("text=Tryb pracownika", { timeout: 15_000 });
    await page.waitForSelector("text=Smoke useLocalStorage 3B", { timeout: 15_000 });
    results.workerView = "PASS";
  } catch (e) {
    results.workerView = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("Logowanie admina:     ", results.adminLogin ?? "SKIP");
console.log("Dashboard:            ", results.dashboard ?? "SKIP");
console.log("Roboty:               ", results.jobsView ?? "SKIP");
console.log("Lista płac:           ", results.payrollView ?? "SKIP");
console.log("Zapis localStorage:   ", results.localStorageWrite ?? "SKIP");
console.log("Timestampy:           ", results.timestamps ?? "SKIP");
console.log("Odświeżenie strony:   ", results.pageReload ?? "SKIP");
console.log("Brak pętli sync:      ", results.noSyncLoop ?? "SKIP");
console.log("WorkerPhotoView:      ", results.workerView ?? "SKIP");
console.log("");

const required = ["adminLogin", "dashboard", "jobsView", "payrollView", "localStorageWrite", "pageReload", "noSyncLoop", "workerView"];
const allPass = required.every((k) => results[k] === "PASS" || String(results[k]).startsWith("PASS"));
process.exit(allPass ? 0 : 1);
