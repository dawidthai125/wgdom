/**
 * Multi-admin sync: MA-01 (propagacja + konflikt timestamp), MA-02 (stale tab pull).
 * PW_BASE_URL=http://127.0.0.1:5203 node scripts/run-multi-admin-sync.mjs
 * MA_STALE_WAIT_MS=120000  (domyślnie 2 min zamiast 30 min — ta sama mechanika focus pull)
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { clickNavJobs } from "./e2e-sync-helpers.mjs";

const env = readFileSync(".env", "utf8");
const pid = env.match(/VITE_SUPABASE_PROJECT_ID=(.+)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
const slug = env.match(/VITE_SUPABASE_FUNCTION_SLUG=(.+)/)?.[1]?.trim() || "make-server-0afb8820";
const API = `https://${pid}.supabase.co/functions/v1/${slug}`;

async function cloudJobs() {
  const res = await fetch(`${API}/batch-get`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ keys: ["kw-jobs"] }),
  });
  const { values } = await res.json();
  return values[0] || [];
}

async function waitForCloudJob(marker, timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const jobs = await cloudJobs();
    const found = jobs.find((j) => (j.address || "").includes(marker));
    if (found) return { found, elapsedMs: Date.now() - t0, count: jobs.length };
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`job ${marker} not in cloud within ${timeoutMs}ms`);
}

const BASE = process.env.PW_BASE_URL || "http://127.0.0.1:5199";
const RUN_ID = Date.now();
const MARKER = `MA-${RUN_ID}`;

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

async function waitBootstrap(page, ms = 8000) {
  await page.waitForTimeout(ms);
}

async function goToJobs(page) {
  await clickNavJobs(page);
  await page.waitForTimeout(400);
}

async function getJobs(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("kw-jobs") || "[]");
    } catch {
      return [];
    }
  });
}

function findJobByMarker(jobs, marker) {
  return jobs.find(
    (j) =>
      (j.address || "").includes(marker) ||
      (j.notes || "").includes(marker) ||
      (j.client || "").includes(marker),
  );
}

async function waitForBatchSetResponse(page, minKeys = 14, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const handler = async (res) => {
      const req = res.request();
      if (!req.url().includes("batch-set")) return;
      let k = 0;
      try {
        k = req.postDataJSON()?.keys?.length ?? 0;
      } catch {
        /* ignore */
      }
      if (k >= minKeys && res.ok()) {
        page.off("response", handler);
        resolve({ keys: k, elapsedMs: Date.now() - t0 });
      }
    };
    page.on("response", handler);
    setTimeout(() => {
      page.off("response", handler);
      reject(new Error(`batch-set response >=${minKeys} not seen within ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

async function addJobWithMarker(page, marker) {
  await goToJobs(page);
  await page.getByRole("button", { name: /Nowa robota/i }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(700);
  const addrInput = page.locator('input[placeholder*="Przykładowa"]').first();
  await addrInput.waitFor({ timeout: 10_000 });
  const address = `ul. SyncTest ${marker}`;
  await addrInput.fill(address);
  await page.waitForTimeout(800);
  const jobs = await getJobs(page);
  const job = jobs.find((j) => (j.address || "").includes(marker));
  return { address, jobId: job?.id ?? null };
}

async function openJobByMarker(page, marker) {
  await goToJobs(page);
  const row = page.locator("button").filter({ hasText: marker }).first();
  await row.click({ timeout: 20_000 });
  await page.waitForTimeout(1000);
  await page.locator('input[placeholder*="Przykładowa"]').first().waitFor({ timeout: 10_000 });
}

async function setJobAddress(page, marker, newAddress) {
  await openJobByMarker(page, marker);
  const addrInput = page.locator('input[placeholder*="Przykładowa"]').first();
  await addrInput.fill(newAddress);
  await page.waitForTimeout(600);
}

async function setJobNotes(page, marker, notes) {
  await openJobByMarker(page, marker);
  const ta = page.locator("textarea").first();
  await ta.fill(notes);
  await page.waitForTimeout(600);
}

async function hideTab(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

async function showTab(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
}

function verdict(checks) {
  const failed = Object.entries(checks).filter(([, v]) => !v.pass);
  return { pass: failed.length === 0, checks, failed: failed.map(([k, v]) => ({ check: k, detail: v.detail })) };
}

console.log(`\n=== Multi-admin sync (RUN_ID=${RUN_ID}) ===\n`);

const browser = await chromium.launch({ headless: true });
const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();
const results = {};

try {
  // ── MA-01 ───────────────────────────────────────────────────────────────
  console.log(">>> MA-01: A dodaje robotę → B focus po 10s → konflikt timestamp");

  await Promise.all([login(pageA), login(pageB)]);
  await Promise.all([waitBootstrap(pageA), waitBootstrap(pageB)]);

  await hideTab(pageB);
  console.log("  B: karta ukryta (10s przed powrotem)");
  await pageB.waitForTimeout(10_000);

  const { address, jobId } = await addJobWithMarker(pageA, MARKER);
  console.log(`  A: dodano "${address}" id=${jobId}`);

  try {
    const syncA = await waitForBatchSetResponse(pageA, 14, 85_000);
    console.log(`  A: batch-set OK @ ${(syncA.elapsedMs / 1000).toFixed(1)}s (${syncA.keys} kl.)`);
  } catch (e) {
    console.warn(`  A: timeout batch-set — ${e.message}`);
  }

  const cloudA = await waitForCloudJob(MARKER);
  console.log(`  Chmura: job potwierdzony @ ${(cloudA.elapsedMs / 1000).toFixed(1)}s (${cloudA.count} robót)`);

  await pageB.waitForTimeout(10_000);
  await showTab(pageB);
  console.log("  B: powrót do zakładki → focus pull");
  await pageB.waitForTimeout(20_000);

  const jobsB1 = await getJobs(pageB);
  const jobB1 = findJobByMarker(jobsB1, MARKER);
  const checkBHasJob = {
    pass: !!jobB1,
    detail: jobB1 ? `B ma robotę id=${jobB1.id} addr="${jobB1.address}"` : "B nie widzi roboty po focus",
  };
  console.log(`  ${checkBHasJob.pass ? "✓" : "✗"} ${checkBHasJob.detail}`);

  await pageB.waitForTimeout(70_000);
  const jobsB2 = await getJobs(pageB);
  const jobB2 = findJobByMarker(jobsB2, MARKER);
  const checkBStillHas = {
    pass: !!jobB2,
    detail: jobB2 ? "Robota nadal u B po ~70s (brak znikania)" : "Robota zniknęła u B",
  };
  console.log(`  ${checkBStillHas.pass ? "✓" : "✗"} ${checkBStillHas.detail}`);

  const newerAddr = `${address} — B-wins`;
  await setJobAddress(pageB, MARKER, newerAddr);
  console.log(`  B: edycja → "${newerAddr}"`);
  try {
    await waitForBatchSetResponse(pageB, 14, 85_000);
  } catch {
    await pageB.waitForTimeout(70_000);
  }
  await waitForCloudJob("B-wins", 60_000).catch(() => {});

  const jobsAbeforePull = await getJobs(pageA);
  const jobAbefore = findJobByMarker(jobsAbeforePull, MARKER);
  console.log(`  A przed pull: addr="${jobAbefore?.address ?? "brak"}" (stara wersja lokalna)`);

  await hideTab(pageA);
  await pageA.waitForTimeout(1500);
  await showTab(pageA);
  console.log("  A: focus pull po edycji B");
  await pageA.waitForTimeout(12_000);

  const jobsApull = await getJobs(pageA);
  const jobApull = jobId ? jobsApull.find((j) => j.id === jobId) : findJobByMarker(jobsApull, MARKER);
  const tsWinner = jobApull && (jobApull.address || "").includes("B-wins");
  const checkTsWins = {
    pass: !!tsWinner,
    detail: tsWinner
      ? `Timestamp OK — A ma "${jobApull.address}" (nowsza wersja z chmury)`
      : `A ma "${jobApull?.address ?? "brak"}" — oczekiwano B-wins`,
  };
  console.log(`  ${checkTsWins.pass ? "✓" : "✗"} ${checkTsWins.detail}`);

  results["MA-01"] = verdict({
    "B widzi robotę po powrocie do zakładki": checkBHasJob,
    "Robota nie znika po kolejnym sync u B": checkBStillHas,
    "Timestamp wygrywa (pull A ← chmura z B)": checkTsWins,
  });

  // ── MA-02 ───────────────────────────────────────────────────────────────
  console.log("\n>>> MA-02: A w tle, B zmienia, A focus pull");

  const marker2 = `${MARKER}-M2`;
  await hideTab(pageA);
  const staleWaitMs = Number(process.env.MA_STALE_WAIT_MS || 120_000);
  console.log(`  A: karta w tle ${(staleWaitMs / 1000).toFixed(0)}s`);

  const { address: addr2, jobId: jobId2 } = await addJobWithMarker(pageB, marker2);
  console.log(`  B: nowa robota "${addr2}"`);

  try {
    await waitForBatchSetResponse(pageB, 14, 85_000);
  } catch {
    await pageB.waitForTimeout(70_000);
  }

  await waitForCloudJob(marker2).then((c) =>
    console.log(`  Chmura M2: OK (${c.count} robót) @ ${(c.elapsedMs / 1000).toFixed(1)}s`),
  );

  const editNote = `notatka-B-${RUN_ID}`;
  await setJobNotes(pageB, marker2, editNote);
  console.log(`  B: notatka="${editNote}"`);
  try {
    await waitForBatchSetResponse(pageB, 14, 85_000);
  } catch {
    await pageB.waitForTimeout(70_000);
  }
  await waitForCloudJob(marker2).then(async () => {
    const cj = await cloudJobs();
    const j = cj.find((x) => (x.address || "").includes(marker2));
    if (j?.notes !== editNote) throw new Error("notes pending");
  }).catch(() => pageB.waitForTimeout(5000));

  await pageA.waitForTimeout(staleWaitMs);

  const jobsAbefore = await getJobs(pageA);
  const hadM2Before = !!findJobByMarker(jobsAbefore, marker2);
  console.log(`  A przed pull: ma M2=${hadM2Before}`);

  await showTab(pageA);
  console.log("  A: powrót → pullFromCloudAndMerge");
  await pageA.waitForTimeout(15_000);

  const jobsAafter = await getJobs(pageA);
  const jobM2 = findJobByMarker(jobsAafter, marker2);
  const checkPullAll = {
    pass: !!jobM2 && jobM2.notes === editNote,
    detail: jobM2
      ? `A ma M2 notes="${jobM2.notes}" addr="${jobM2.address}"`
      : `A nie ma M2 (było przed pull: ${hadM2Before})`,
  };
  console.log(`  ${checkPullAll.pass ? "✓" : "✗"} ${checkPullAll.detail}`);

  await pageA.waitForTimeout(75_000);
  const jobsAfinal = await getJobs(pageA);
  const jobFinal = jobId2 ? jobsAfinal.find((j) => j.id === jobId2) : findJobByMarker(jobsAfinal, marker2);
  const checkNoOverwrite = {
    pass: !!jobFinal && jobFinal.notes === editNote && (jobFinal.address || "").includes(marker2),
    detail: jobFinal
      ? `Po sync A: notes="${jobFinal.notes}" addr="${jobFinal.address}"`
      : "Dane zniknęły / nadpisane po auto-sync A",
  };
  console.log(`  ${checkNoOverwrite.pass ? "✓" : "✗"} ${checkNoOverwrite.detail}`);

  results["MA-02"] = verdict({
    "pullFromCloudAndMerge pobiera wszystkie zmiany B": checkPullAll,
    "Auto-sync A nie nadpisuje starszą wersją": checkNoOverwrite,
  });
} catch (e) {
  results.error = e.message;
  console.error(e);
} finally {
  await browser.close();
}

console.log("\n=== FINAL ===");
for (const [sc, r] of Object.entries(results)) {
  if (sc === "error") continue;
  console.log(`\n${sc}: ${r.pass ? "PASS" : "FAIL"}`);
  for (const [name, c] of Object.entries(r.checks)) {
    console.log(`  ${c.pass ? "✓" : "✗"} ${name}`);
    console.log(`    ${c.detail}`);
  }
}
if (results.error) console.log(`\nERROR: ${results.error}`);
console.log(JSON.stringify(results, null, 2));

const failed = Object.values(results).some((r) => r && typeof r === "object" && r.pass === false);
process.exit(failed || results.error ? 1 : 0);
