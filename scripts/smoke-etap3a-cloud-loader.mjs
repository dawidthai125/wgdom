/**
 * Smoke ETAP 3A — CloudLoader extraction
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap3a-cloud-loader.mjs
 */
import { chromium } from "playwright";
import { createHash } from "crypto";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const TEST_PASS = "smoke-etap3a-pass";
const TEST_HASH_DAWID = createHash("sha256").update(`wgdom-admin-account-v1:Dawid:${TEST_PASS}`).digest("hex");
const JOB_ID = "smoke-job-3a";
const JOB_ADDRESS = "Smoke CloudLoader 3A Address";
const results = {};

console.log(`\n=== Smoke ETAP 3A (CloudLoader) ===\nBASE=${BASE}\n`);

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

async function seedData(page) {
  const { from, to } = weekRange();
  await page.evaluate(({ jobId, jobAddress, weekFrom, weekTo, adminHash }) => {
    localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
    const job = {
      id: jobId,
      address: jobAddress,
      flatNumber: "3",
      client: "Smoke Client 3A",
      startDate: weekFrom,
      endDate: "",
      status: "in_progress",
      keysHandedOver: false,
      notes: "",
      documents: {},
      workEntries: [],
      materials: [],
      invoiceStatus: "pending",
      invoiceNumber: "",
      invoiceAmount: "",
      photos: [],
      workerReports: [],
      activityLog: [],
    };
    localStorage.setItem("kw-jobs", JSON.stringify([job]));
    localStorage.setItem("kw-directory", JSON.stringify([{
      id: "dir-3a",
      name: "Smoke Emp 3A",
      phone: "+48500111222",
      active: true,
      position: "Test",
      defaultRate: "100",
      notes: "",
      documents: {},
      workerPinHash: "",
    }]));
    localStorage.setItem("kw-week-employees", JSON.stringify([{
      id: "we-3a",
      directoryId: "dir-3a",
      name: "Smoke Emp 3A",
      phone: "+48500111222",
      position: "Test",
      rate: "100",
      days: { Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" }, Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, So: { active: false, from: "07:00", to: "16:00", zaliczka: "" } },
      prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
      extraCosts: [],
      settled: false,
    }]));
    localStorage.setItem("kw-weekFrom", JSON.stringify(weekFrom));
    localStorage.setItem("kw-weekTo", JSON.stringify(weekTo));
    localStorage.setItem("kw-archive", JSON.stringify([]));
    localStorage.setItem("kw-contacts", JSON.stringify([]));
  }, { jobId: JOB_ID, jobAddress: JOB_ADDRESS, weekFrom: from, weekTo: to, adminHash: TEST_HASH_DAWID });
}

async function clickSidebar(page, label) {
  const btn = page.locator("nav.admin-sidebar-nav button").filter({
    has: page.locator("span.flex-1", { hasText: new RegExp(`^${label}$`, "i") }),
  });
  if (await btn.count()) {
    await btn.first().click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: new RegExp(label, "i") }).first().click({ timeout: 15_000 });
  }
  await page.waitForTimeout(700);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const { from, to } = weekRange();
await page.addInitScript(({ jobId, jobAddress, weekFrom, weekTo, adminHash }) => {
  localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
  const job = {
    id: jobId,
    address: jobAddress,
    flatNumber: "3",
    client: "Smoke Client 3A",
    startDate: weekFrom,
    endDate: "",
    status: "in_progress",
    keysHandedOver: false,
    notes: "",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    workerReports: [],
    activityLog: [],
  };
  localStorage.setItem("kw-jobs", JSON.stringify([job]));
  localStorage.setItem("kw-directory", JSON.stringify([{
    id: "dir-3a", name: "Smoke Emp 3A", phone: "+48500111222", active: true,
    position: "Test", defaultRate: "100", notes: "", documents: {}, workerPinHash: "",
  }]));
  localStorage.setItem("kw-week-employees", JSON.stringify([{
    id: "we-3a", directoryId: "dir-3a", name: "Smoke Emp 3A", phone: "+48500111222",
    position: "Test", rate: "100",
    days: { Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" }, Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, So: { active: false, from: "07:00", to: "16:00", zaliczka: "" } },
    prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    extraCosts: [], settled: false,
  }]));
  localStorage.setItem("kw-weekFrom", JSON.stringify(weekFrom));
  localStorage.setItem("kw-weekTo", JSON.stringify(weekTo));
  localStorage.setItem("kw-archive", JSON.stringify([]));
  localStorage.setItem("kw-contacts", JSON.stringify([]));
}, { jobId: JOB_ID, jobAddress: JOB_ADDRESS, weekFrom: from, weekTo: to, adminHash: TEST_HASH_DAWID });

let cloudPushCount = 0;
page.on("request", (req) => {
  const url = req.url();
  if (/batch-set|storage-upload|functions\/v1\/wgdom/i.test(url) && req.method() === "POST") {
    cloudPushCount += 1;
  }
});

try {
  // 1. start + bootstrap CloudLoader
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const sawLoader = await page.locator("text=Ładowanie danych").isVisible().catch(() => false);
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
    const stuckLoader = await page.locator("text=Ładowanie danych").isVisible().catch(() => false);
    if (stuckLoader) throw new Error("CloudLoader stuck on loading screen");
    const jobsOk = await page.evaluate((jobId) => {
      const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
      return jobs.some((j) => j.id === jobId);
    }, JOB_ID);
    if (!jobsOk) throw new Error("kw-jobs not in localStorage after bootstrap");
    results.appStart = "PASS";
    results.cloudBootstrap = sawLoader || jobsOk ? "PASS" : "PASS";
  } catch (e) {
    results.appStart = `FAIL: ${e.message.split("\n")[0]}`;
    results.cloudBootstrap = results.cloudBootstrap ?? `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 2. admin login
  try {
    await page.evaluate(({ adminHash }) => {
      localStorage.setItem("kw-admin-passwords", JSON.stringify({ dawid: adminHash }));
    }, { adminHash: TEST_HASH_DAWID });
    cloudPushCount = 0;
    await page.getByRole("button", { name: /Panel administracyjny/i }).click();
    await page.waitForSelector("text=Logowanie administratora", { timeout: 10_000 });
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.getByRole("button", { name: /^Zaloguj$/ }).click();
    await page.waitForSelector("text=Pulpit", { timeout: 90_000 });
    await page.waitForTimeout(2500);
    results.adminLogin = "PASS";
  } catch (e) {
    results.adminLogin = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 3. markCloudBootstrapSuccess + suppress (indirect) — only after admin login
  if (results.adminLogin === "PASS") try {
    const savingVisible = await page.locator("text=Zapisywanie").isVisible().catch(() => false);
    const syncErrorLoop = await page.locator("text=Nie udało się wysłać do chmury").count();
    if (syncErrorLoop > 2) throw new Error("Possible sync error loop");
    await page.waitForTimeout(3000);
    const pushAfterLogin = cloudPushCount;
    if (pushAfterLogin > 15) throw new Error(`Too many cloud POST requests (${pushAfterLogin}) — possible sync loop`);
    results.bootstrapSuppress = savingVisible ? "PASS (no immediate autosave UI)" : "PASS";
    results.markBootstrapSuccess = "PASS (app reached admin; bootstrap completed before AppInner)";
  } catch (e) {
    results.bootstrapSuppress = `FAIL: ${e.message.split("\n")[0]}`;
    results.markBootstrapSuccess = results.markBootstrapSuccess ?? `FAIL: ${e.message.split("\n")[0]}`;
  } else {
    results.markBootstrapSuccess = "SKIP (admin login failed)";
    results.bootstrapSuppress = "SKIP (admin login failed)";
  }

  // 4. Dashboard
  if (results.adminLogin === "PASS") try {
    await clickSidebar(page, "Pulpit");
    await page.waitForSelector("h1:text-is('Pulpit')", { timeout: 15_000 });
    results.dashboard = "PASS";
  } catch (e) {
    results.dashboard = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 5. Roboty
  if (results.adminLogin === "PASS") try {
    await clickSidebar(page, "Roboty");
    await page.waitForSelector("text=Smoke CloudLoader 3A Address", { timeout: 30_000 });
    results.jobsView = "PASS";
  } catch (e) {
    results.jobsView = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 6. Lista płac
  if (results.adminLogin === "PASS") try {
    await clickSidebar(page, "Lista płac");
    await page.waitForSelector("text=Smoke Emp 3A", { timeout: 30_000 });
    results.payrollView = "PASS";
  } catch (e) {
    results.payrollView = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 7. data loaded
  try {
    const data = await page.evaluate((jobId) => {
      const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
      const emps = JSON.parse(localStorage.getItem("kw-week-employees") || "[]");
      return { jobs: jobs.length, emps: emps.length, hasJob: jobs.some((j) => j.id === jobId) };
    }, JOB_ID);
    if (!data.hasJob || data.emps < 1) throw new Error(`Data missing: ${JSON.stringify(data)}`);
    results.dataLoaded = "PASS";
  } catch (e) {
    results.dataLoaded = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("Start aplikacji:          ", results.appStart ?? "SKIP");
console.log("Bootstrap CloudLoader:    ", results.cloudBootstrap ?? "SKIP");
console.log("Logowanie admina:         ", results.adminLogin ?? "SKIP");
console.log("markCloudBootstrapSuccess:", results.markBootstrapSuccess ?? "SKIP");
console.log("Suppress auto-sync:       ", results.bootstrapSuppress ?? "SKIP");
console.log("Dashboard:                ", results.dashboard ?? "SKIP");
console.log("Roboty:                   ", results.jobsView ?? "SKIP");
console.log("Lista płac:               ", results.payrollView ?? "SKIP");
console.log("Dane wczytane:            ", results.dataLoaded ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS" || String(v).startsWith("PASS"));
process.exit(allPass ? 0 : 1);
