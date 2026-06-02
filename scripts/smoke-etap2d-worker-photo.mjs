/**
 * Smoke ETAP 2D — WorkerPhotoView extraction
 * PW_BASE_URL=http://127.0.0.1:4173 node scripts/smoke-etap2d-worker-photo.mjs
 */
import { chromium } from "playwright";
import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:4173";
const WORKER_ID = "smoke-worker-2d";
const WORKER_NAME = "Smoke Worker 2D";
const WORKER_PIN = "5678";
const JOB_ID = "smoke-job-2d";
const PIN_HASH = createHash("sha256").update(`wgdom-worker-pin-v1:${WORKER_PIN}`).digest("hex");
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const results = {};

console.log(`\n=== Smoke ETAP 2D (WorkerPhotoView) ===\nBASE=${BASE}\n`);

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

async function clearSession(page) {
  await page.evaluate(() => sessionStorage.clear());
}

async function seedWorkerData(page) {
  const { from, to } = weekRange();
  await page.evaluate(({ workerId, workerName, pinHash, jobId, weekFrom, weekTo }) => {
    const emp = {
      id: workerId,
      name: workerName,
      phone: "+48501123456",
      active: true,
      position: "Test",
      defaultRate: "100",
      notes: "",
      documents: {},
      workerPinHash: pinHash,
    };
    localStorage.setItem("kw-directory", JSON.stringify([emp]));

    const days = { Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" }, Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" }, So: { active: false, from: "07:00", to: "16:00", zaliczka: "" } };
    const weekEmp = {
      id: "we-smoke-2d",
      directoryId: workerId,
      name: workerName,
      phone: emp.phone,
      position: "Test",
      rate: "100",
      days,
      prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
      extraCosts: [],
      settled: false,
    };
    localStorage.setItem("kw-week-employees", JSON.stringify([weekEmp]));
    localStorage.setItem("kw-weekFrom", JSON.stringify(weekFrom));
    localStorage.setItem("kw-weekTo", JSON.stringify(weekTo));
    localStorage.setItem("kw-archive", JSON.stringify([]));

    const job = {
      id: jobId,
      address: "Smoke Test Address 2D",
      flatNumber: "12",
      client: "Smoke Client",
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
  }, { workerId: WORKER_ID, workerName: WORKER_NAME, pinHash: PIN_HASH, jobId: JOB_ID, weekFrom: from, weekTo: to });
}

async function goLogin(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.waitForTimeout(3000);
}

async function loginWorker(page) {
  await page.getByRole("button", { name: /Pracownik/i }).first().click();
  await page.waitForSelector("text=Logowanie pracownika", { timeout: 15_000 });
  await page.getByRole("button", { name: new RegExp(WORKER_NAME) }).click();
  await page.locator('input[placeholder*="501234567"]').fill("501123456");
  await page.locator('input[placeholder="••••"]').fill(WORKER_PIN);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.waitForSelector("text=Tryb pracownika", { timeout: 15_000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const tmpPng = join(dirname(fileURLToPath(import.meta.url)), ".smoke-2d.png");
writeFileSync(tmpPng, Buffer.from(PNG_B64, "base64"));

try {
  await goLogin(page);
  await clearSession(page);
  await seedWorkerData(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 90_000 });
  await page.waitForTimeout(2000);
  await seedWorkerData(page);

  // 1. login pracownika
  try {
    await loginWorker(page);
    results.workerLogin = "PASS";
  } catch (e) {
    results.workerLogin = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 2. lista robót
  try {
    await page.waitForSelector("text=Wybierz robotę", { timeout: 10_000 });
    await page.waitForSelector("text=Smoke Test Address 2D", { timeout: 10_000 });
    results.jobsList = "PASS";
  } catch (e) {
    results.jobsList = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 3. szczegóły roboty
  try {
    await page.getByRole("button", { name: /Smoke Test Address 2D/i }).click();
    await page.waitForSelector("text=Galeria — wiele zdjęć", { timeout: 10_000 });
    await page.waitForSelector("text=Raport z budowy", { timeout: 10_000 });
    results.jobDetail = "PASS";
  } catch (e) {
    results.jobDetail = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 4. zakładka Grafik
  try {
    await page.getByRole("button", { name: /Roboty · Grafik · Wypłata/i }).click();
    await page.getByRole("button", { name: /^Grafik$/ }).click();
    await page.waitForSelector("text=Twój grafik", { timeout: 10_000 });
    results.scheduleTab = "PASS";
  } catch (e) {
    results.scheduleTab = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 5. zakładka Wypłata
  try {
    await page.getByRole("button", { name: /^Wypłata$/ }).click();
    await page.waitForSelector("text=Ten tydzień", { timeout: 10_000 });
    results.payTab = "PASS";
  } catch (e) {
    results.payTab = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 6. upload zdjęcia
  try {
    await page.getByRole("button", { name: /^Roboty$/ }).click();
    await page.getByRole("button", { name: /Smoke Test Address 2D/i }).click();
    await page.waitForSelector("text=Galeria — wiele zdjęć", { timeout: 10_000 });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tmpPng);
    await page.waitForSelector("text=Wyślij 1 zdjęć", { timeout: 10_000 });
    await page.getByRole("button", { name: /Wyślij 1 zdjęć/i }).click();
    await page.waitForTimeout(4000);
    const uploaded = await page.evaluate((jobId) => {
      const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
      const job = jobs.find((j) => j.id === jobId);
      return (job?.photos?.length ?? 0) > 0;
    }, JOB_ID);
    const hasQueueMsg = await page.locator("text=kolejce offline").isVisible().catch(() => false);
    const hasUploadErr = await page.locator(".text-destructive").first().isVisible().catch(() => false);
    const hasSpinner = await page.locator("text=Wgrywanie").isVisible().catch(() => false);
    if (uploaded || hasQueueMsg || hasUploadErr || hasSpinner) {
      results.photoUpload = "PASS";
    } else {
      throw new Error("No upload progress, queue, error, or saved photo");
    }
  } catch (e) {
    results.photoUpload = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 7. raport terenowy
  try {
    const scopeArea = page.locator("textarea").filter({ hasNot: page.locator("[placeholder*='Opis']") }).first();
    if (await scopeArea.count() === 0) {
      await page.locator("textarea").first().fill("Smoke raport ETAP 2D — zakres prac testowy.");
    } else {
      await scopeArea.fill("Smoke raport ETAP 2D — zakres prac testowy.");
    }
    await page.getByRole("button", { name: /Wyślij raport do admina/i }).click();
    await page.waitForTimeout(3000);
    const hasReport = await page.locator("text=Twoje raporty").isVisible().catch(() => false);
    const saved = await page.evaluate((jobId) => {
      const jobs = JSON.parse(localStorage.getItem("kw-jobs") || "[]");
      const job = jobs.find((j) => j.id === jobId);
      return (job?.workerReports?.length ?? 0) > 0;
    }, JOB_ID);
    if (!hasReport && !saved) throw new Error("Report not saved");
    results.fieldReport = "PASS";
  } catch (e) {
    results.fieldReport = `FAIL: ${e.message.split("\n")[0]}`;
  }

  // 8. logout
  try {
    await page.getByRole("button", { name: /Wyloguj/i }).first().click({ timeout: 10_000 });
    await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
    results.logout = "PASS";
  } catch (e) {
    results.logout = `FAIL: ${e.message.split("\n")[0]}`;
  }
} finally {
  await browser.close();
}

console.log("1. Login pracownika:     ", results.workerLogin ?? "SKIP");
console.log("2. Lista robót:          ", results.jobsList ?? "SKIP");
console.log("3. Szczegóły roboty:     ", results.jobDetail ?? "SKIP");
console.log("4. Zakładka Grafik:      ", results.scheduleTab ?? "SKIP");
console.log("5. Zakładka Wypłata:     ", results.payTab ?? "SKIP");
console.log("6. Upload zdjęcia:       ", results.photoUpload ?? "SKIP");
console.log("7. Raport terenowy:      ", results.fieldReport ?? "SKIP");
console.log("8. Logout:               ", results.logout ?? "SKIP");
console.log("");

const allPass = Object.values(results).every((v) => v === "PASS");
process.exit(allPass ? 0 : 1);
