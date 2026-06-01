/**
 * Szybki smoke test admina — logowanie, roboty, focus pull, sync.
 * PW_BASE_URL=http://127.0.0.1:5204 node scripts/run-smoke-admin.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:5199";
const MARKER = `SMOKE-${Date.now()}`;
const results = {};

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
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

function waitForBatchSetResponse(page, minKeys = 14, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const handler = (res) => {
      const req = res.request();
      if (!req.url().includes("batch-set") || !res.ok()) return;
      let k = 0;
      try {
        k = req.postDataJSON()?.keys?.length ?? 0;
      } catch {
        /* ignore */
      }
      if (k >= minKeys) {
        page.off("response", handler);
        resolve({ keys: k, ms: Date.now() - t0 });
      }
    };
    page.on("response", handler);
    setTimeout(() => {
      page.off("response", handler);
      reject(new Error(`timeout batch-set >=${minKeys}`));
    }, timeoutMs);
  });
}

function waitForBatchGet(page, minKeys = 14, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      const req = res.request();
      if (!req.url().includes("batch-get") || !res.ok()) return;
      let k = 0;
      try {
        k = req.postDataJSON()?.keys?.length ?? 0;
      } catch {
        /* ignore */
      }
      if (k >= minKeys) {
        page.off("response", handler);
        resolve({ keys: k });
      }
    };
    page.on("response", handler);
    setTimeout(() => {
      page.off("response", handler);
      reject(new Error(`timeout batch-get >=${minKeys}`));
    }, timeoutMs);
  });
}

console.log(`\n=== Smoke admin (MARKER=${MARKER}) ===\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const diagLogs = [];
page.on("console", (m) => {
  if (m.text().includes("[SYNC-DIAG]")) diagLogs.push(m.text());
});

try {
  await login(page);
  results.login = { pass: true, detail: "Pulpit widoczny" };
  console.log("✓ logowanie admina");

  await page.waitForTimeout(6000);
  await page.getByRole("button", { name: /Roboty/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Nowa robota/i }).first().click();
  await page.waitForTimeout(700);
  const address = `ul. SmokeTest ${MARKER}`;
  await page.locator('input[placeholder*="Przykładowa"]').first().fill(address);
  await page.waitForTimeout(500);
  const jobsAfterAdd = JSON.parse(await page.evaluate(() => localStorage.getItem("kw-jobs") || "[]"));
  const added = jobsAfterAdd.some((j) => (j.address || "").includes(MARKER));
  results.addJob = { pass: added, detail: added ? address : "brak w localStorage" };
  console.log(`${added ? "✓" : "✗"} dodanie roboty`);

  await page.locator('input[placeholder*="Przykładowa"]').first().fill(`${address} — edycja`);
  const syncPromise = waitForBatchSetResponse(page, 14, 120_000);
  await page.waitForTimeout(500);
  const jobsAfterEdit = JSON.parse(await page.evaluate(() => localStorage.getItem("kw-jobs") || "[]"));
  const edited = jobsAfterEdit.some((j) => (j.address || "").includes("edycja"));
  results.editJob = { pass: edited, detail: edited ? "adres zaktualizowany lokalnie" : "brak edycji" };
  console.log(`${edited ? "✓" : "✗"} edycja roboty`);

  try {
    const sync = await syncPromise;
    results.manualSync = { pass: true, detail: `batch-set ${sync.keys} kl. @ ${(sync.ms / 1000).toFixed(1)}s` };
    console.log(`✓ sync do chmury (${sync.keys} kl. @ ${(sync.ms / 1000).toFixed(1)}s)`);
  } catch (e) {
    results.manualSync = { pass: false, detail: e.message };
    console.log(`✗ sync — ${e.message}`);
  }

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(800);
  const getPromise = waitForBatchGet(page, 14, 25_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  let focusPull;
  try {
    focusPull = await getPromise;
    results.focusPull = { pass: true, detail: `batch-get ${focusPull.keys} kl.` };
    console.log(`✓ focus pull (${focusPull.keys} kl.)`);
  } catch (e) {
    results.focusPull = { pass: false, detail: e.message };
    console.log(`✗ focus pull — ${e.message}`);
  }

  results.noDiagLogs = {
    pass: diagLogs.length === 0,
    detail: diagLogs.length === 0 ? "brak [SYNC-DIAG]" : `${diagLogs.length} wpisów diag`,
  };
  console.log(`${results.noDiagLogs.pass ? "✓" : "✗"} brak logów [SYNC-DIAG]`);
} catch (e) {
  results.error = e.message;
  console.error("ERROR:", e.message);
} finally {
  await browser.close();
}

const pass = Object.values(results).every((r) => r?.pass !== false) && !results.error;
console.log(`\n=== ${pass ? "PASS" : "FAIL"} ===`);
console.log(JSON.stringify(results, null, 2));
process.exit(pass ? 0 : 1);
