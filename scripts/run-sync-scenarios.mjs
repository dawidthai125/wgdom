/**
 * SC-01,02,04,08,10 — osobny kontekst na scenariusz.
 * PW_BASE_URL=http://127.0.0.1:5199 node scripts/run-sync-scenarios.mjs
 */
import { chromium } from "playwright";
import {
  clickNavJobs,
  clickNavPayroll,
  clickFirstProductionJob,
  evaluateSc01,
  evaluateSc02,
  evaluateSc04,
  evaluateSc08,
  countFullSync14,
} from "./e2e-sync-helpers.mjs";

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:5199";

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

function attachTracker(page) {
  const batchGets = [];
  const batchSets = [];
  const consoleErrors = [];
  page.on("console", (m) => {
    const text = m.text();
    if (m.type() === "error") consoleErrors.push(text);
  });
  page.on("request", (req) => {
    const u = req.url();
    if (!u.includes("batch-get") && !u.includes("batch-set")) return;
    const t = Date.now();
    let k = null;
    try { k = req.postDataJSON()?.keys?.length ?? null; } catch { /* ignore */ }
    if (u.includes("batch-get")) batchGets.push({ t, k });
    else batchSets.push({ t, k });
  });
  return {
    report(fromT, label) {
      const fg = (a) => a.filter((x) => x.t >= fromT);
      const gets = fg(batchGets);
      const sets = fg(batchSets);
      const fullGets = gets.filter((g) => (g.k ?? 0) >= 14);
      const rel = (t) => `${((t - fromT) / 1000).toFixed(1)}s`;
      return {
        label,
        batchGetTotal: gets.length,
        batchSetTotal: sets.length,
        fullBundleBatchGet: fullGets.length,
        batchGetDetail: gets.map((g) => `${g.k}@${rel(g.t)}`).join(", ") || "—",
        batchSetDetail: sets.map((s) => `${s.k}@${rel(s.t)}`).join(", ") || "—",
        consoleErrors: [...new Set(consoleErrors)],
      };
    },
  };
}

async function editJob(page) {
  await clickNavJobs(page);
  await page.waitForTimeout(700);
  await clickFirstProductionJob(page);
  await page.waitForTimeout(800);
  const ta = page.locator("textarea").first();
  await ta.fill(`sync-${Date.now()}`);
}

async function runScenario(name, fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const tr = attachTracker(page);
  const fromT = Date.now();
  console.log(`\n>>> ${name}`);
  try {
    await fn(page);
  } catch (e) {
    const r = tr.report(fromT, name);
    r.error = e.message;
    console.log(JSON.stringify(r, null, 2));
    await browser.close();
    return r;
  }
  const r = tr.report(fromT, name);
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
  return r;
}

const results = {};

const scOnly = process.env.SYNC_SC_ONLY;
const scList = process.env.SYNC_SC_LIST?.split(",").map((s) => `SC-${s.trim().padStart(2, "0")}`) ?? null;
const shouldRun = (id) => !scList || scList.includes(id);

if (shouldRun("SC-01")) {
results["SC-01"] = await runScenario("SC-01 start bez edycji 90s", async (page) => {
  await login(page);
  await page.waitForTimeout(90_000);
});
}

if (shouldRun("SC-02")) {
results["SC-02"] = await runScenario("SC-02 edycja job +65s", async (page) => {
  await login(page);
  await page.waitForTimeout(3000);
  await editJob(page);
  await page.waitForTimeout(65_000);
});
}

if (shouldRun("SC-04")) {
results["SC-04"] = await runScenario("SC-04 focus bez edycji +30s", async (page) => {
  await login(page);
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await page.waitForTimeout(30_000);
});
}

if (shouldRun("SC-08")) {
results["SC-08"] = await runScenario("SC-08 toggle settled +15s", async (page) => {
  await login(page);
  await page.waitForTimeout(3000);
  await clickNavPayroll(page);
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /Oczekuje/i }).first().click();
  await page.waitForTimeout(15_000);
});
}

if (shouldRun("SC-10") && !scOnly && !scList) {
results["SC-10"] = await runScenario("SC-10 ukryta karta 70s + powrót", async (page) => {
  await login(page);
  await page.waitForTimeout(3000);
  await editJob(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(70_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await page.waitForTimeout(15_000);
});
}

console.log("\n=== FINAL ===");
const evaluators = {
  "SC-01": evaluateSc01,
  "SC-02": evaluateSc02,
  "SC-04": evaluateSc04,
  "SC-08": evaluateSc08,
};
for (const [id, r] of Object.entries(results)) {
  const pass = evaluators[id]?.(r) ?? !r.error;
  r.pass = pass;
  r.fullSync14Get = countFullSync14(r.batchGetDetail);
  r.fullSync14Set = countFullSync14(r.batchSetDetail);
  console.log(`${id}: ${pass ? "PASS" : "FAIL"}${r.error ? ` (${r.error})` : ""}`);
}
console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every((r) => r.pass);
process.exit(allPass ? 0 : 1);
