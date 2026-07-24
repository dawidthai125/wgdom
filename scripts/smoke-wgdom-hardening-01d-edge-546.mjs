/**
 * WGDOM-HARDENING-01D — canonical Edge 546 / pipeSet monitor smoke
 *
 * Canonical: scripts/smoke-wgdom-hardening-01d-edge-546.mjs
 * Legacy evidence-only (do NOT evolve Network logic): .tmp/final-prod-audit-multi.mjs
 *
 * DF: docs/architecture/WGDOM-HARDENING-01D-DESIGN-FREEZE.md
 * ARCH: C1–C6 (allowlist · one harness · env-only secrets · statusByPath=null · pure thresholds · any522 guard)
 *
 * Usage:
 *   node scripts/smoke-wgdom-hardening-01d-edge-546.mjs --self-test
 *   node scripts/smoke-wgdom-hardening-01d-edge-546.mjs --evaluate-json .tmp/hardening-01d-audit-multi-tender-2.65.40.json
 *   node scripts/smoke-wgdom-hardening-01d-edge-546.mjs
 *     (live prod smoke — requires VITE_* + WGDOM_ADMIN_PASS; on-demand only)
 */

import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

/** @typedef {{ pipeGet?: number, pipeSet?: number, allGet?: number, allSet?: number, status?: Record<string, number> }} NetTotals */
/** @typedef {{ deltaPipeSet?: number, deltaPipeGet?: number, thrash?: boolean, statusDelta522?: number }} SmokeResult */

export const PIPE_SET_BASELINE_POST_A = 13;

/**
 * Pure threshold evaluation — DF §3.2 (C5).
 * @param {NetTotals} netTotals
 * @param {{ maxPipeSet?: number, maxPipeGet?: number, any522?: boolean, anyThrash?: boolean }} derivedIn
 */
export function evaluateThresholds(netTotals, derivedIn = {}) {
  const status = netTotals?.status && typeof netTotals.status === "object" ? netTotals.status : {};
  const count546 = Number(status["546"] || 0);
  const statusSum = Object.values(status).reduce((a, b) => a + Number(b || 0), 0);
  const rate546 = statusSum > 0 ? count546 / statusSum : 0;
  const pipeSet = Number(netTotals?.pipeSet || 0);
  const maxPipeSet = Number(derivedIn.maxPipeSet ?? 0);
  const maxPipeGet = Number(derivedIn.maxPipeGet ?? 0);
  const any522 = Boolean(derivedIn.any522);
  const anyThrash = Boolean(derivedIn.anyThrash);

  /** @type {string[]} */
  const triggers = [];

  if (any522) triggers.push("FAIL:any522");
  if (anyThrash) triggers.push("FAIL:anyThrash");
  if (count546 >= 3 || rate546 > 0.02) {
    triggers.push(
      count546 >= 3 ? "FAIL:546>=3" : `FAIL:546_rate>${0.02}`,
    );
  }
  if (pipeSet > 22) triggers.push("FAIL:pipeSet>22");
  if (maxPipeSet >= 4) triggers.push("FAIL:maxPipeSet>=4");

  if (count546 >= 1 && count546 < 3 && rate546 <= 0.02) {
    triggers.push("WARN:546>=1");
  }
  if (pipeSet > 18 && pipeSet <= 22) triggers.push("WARN:pipeSet>18");
  if (maxPipeSet >= 3 && maxPipeSet < 4) triggers.push("WARN:maxPipeSet>=3");

  const hasFail = triggers.some((t) => t.startsWith("FAIL:"));
  const hasWarn = triggers.some((t) => t.startsWith("WARN:"));
  /** @type {"PASS"|"WARN"|"FAIL"} */
  const verdict = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

  return {
    pipeSetBaselinePostA: PIPE_SET_BASELINE_POST_A,
    verdict,
    triggers,
    derived: {
      count546,
      "546_rate": rate546,
      maxPipeSet,
      maxPipeGet,
      any522,
      anyThrash,
    },
  };
}

/**
 * C6 — any522 from per-open deltas and/or aggregate status map (absent key = 0).
 * @param {SmokeResult[]} results
 * @param {NetTotals} netTotals
 */
export function deriveAny522(results, netTotals) {
  const fromResults = (results || []).some((r) => Number(r.statusDelta522 || 0) > 0);
  const fromStatus = Number(netTotals?.status?.["522"] || 0) > 0;
  return fromResults || fromStatus;
}

/**
 * @param {SmokeResult[]} results
 */
export function deriveAnyThrash(results) {
  return (results || []).some((r) => Boolean(r.thrash));
}

/**
 * @param {SmokeResult[]} results
 */
export function deriveMaxPipe(results) {
  const sets = (results || []).map((r) => Number(r.deltaPipeSet || 0));
  const gets = (results || []).map((r) => Number(r.deltaPipeGet || 0));
  return {
    maxPipeSet: sets.length ? Math.max(...sets) : 0,
    maxPipeGet: gets.length ? Math.max(...gets) : 0,
  };
}

/**
 * Build DF §3.3 report object.
 * @param {{ netTotals: NetTotals, results: SmokeResult[], tip?: { version?: string, commit?: string }, at?: string }} input
 */
export function buildReport(input) {
  const netTotals = {
    pipeGet: Number(input.netTotals?.pipeGet || 0),
    pipeSet: Number(input.netTotals?.pipeSet || 0),
    allGet: Number(input.netTotals?.allGet || 0),
    allSet: Number(input.netTotals?.allSet || 0),
    status: { ...(input.netTotals?.status || {}) },
  };
  const results = input.results || [];
  const { maxPipeSet, maxPipeGet } = deriveMaxPipe(results);
  const any522 = deriveAny522(results, netTotals);
  const anyThrash = deriveAnyThrash(results);
  const th = evaluateThresholds(netTotals, { maxPipeSet, maxPipeGet, any522, anyThrash });

  return {
    id: "WGDOM-HARDENING-01D",
    at: input.at || new Date().toISOString(),
    tip: {
      version: input.tip?.version ?? null,
      commit: input.tip?.commit ?? null,
    },
    netTotals,
    derived: th.derived,
    thresholds: {
      pipeSetBaselinePostA: th.pipeSetBaselinePostA,
      verdict: th.verdict,
      triggers: th.triggers,
    },
    results,
    statusByPath: null,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** D-T4 self-test — no Playwright / prod (C5). */
export function runSelfTest() {
  const cases = [
    {
      name: "546=0 → PASS",
      net: { pipeSet: 13, status: { "200": 311 } },
      derived: { maxPipeSet: 2, maxPipeGet: 4, any522: false, anyThrash: false },
      expect: "PASS",
    },
    {
      name: "546=1 → WARN",
      net: { pipeSet: 13, status: { "200": 300, "546": 1 } },
      derived: { maxPipeSet: 2, any522: false, anyThrash: false },
      expect: "WARN",
    },
    {
      name: "546=3 → FAIL",
      net: { pipeSet: 13, status: { "200": 300, "546": 3 } },
      derived: { maxPipeSet: 2, any522: false, anyThrash: false },
      expect: "FAIL",
    },
    {
      name: "546_rate>2% → FAIL",
      net: { pipeSet: 10, status: { "200": 90, "546": 2 } },
      derived: { maxPipeSet: 1, any522: false, anyThrash: false },
      expect: "FAIL",
    },
    {
      name: "any522 → FAIL",
      net: { pipeSet: 13, status: { "200": 100 } },
      derived: { maxPipeSet: 2, any522: true, anyThrash: false },
      expect: "FAIL",
    },
    {
      name: "anyThrash → FAIL",
      net: { pipeSet: 13, status: { "200": 100 } },
      derived: { maxPipeSet: 2, any522: false, anyThrash: true },
      expect: "FAIL",
    },
    {
      name: "pipeSet>18 → WARN",
      net: { pipeSet: 19, status: { "200": 100 } },
      derived: { maxPipeSet: 2, any522: false, anyThrash: false },
      expect: "WARN",
    },
    {
      name: "pipeSet>22 → FAIL",
      net: { pipeSet: 23, status: { "200": 100 } },
      derived: { maxPipeSet: 2, any522: false, anyThrash: false },
      expect: "FAIL",
    },
    {
      name: "maxPipeSet>=3 → WARN",
      net: { pipeSet: 13, status: { "200": 100 } },
      derived: { maxPipeSet: 3, any522: false, anyThrash: false },
      expect: "WARN",
    },
    {
      name: "maxPipeSet>=4 → FAIL",
      net: { pipeSet: 13, status: { "200": 100 } },
      derived: { maxPipeSet: 4, any522: false, anyThrash: false },
      expect: "FAIL",
    },
    {
      name: "absent 522 key = 0 (C6)",
      net: { pipeSet: 13, status: { "200": 50 } },
      derived: { maxPipeSet: 1, any522: deriveAny522([], { status: { "200": 50 } }), anyThrash: false },
      expect: "PASS",
    },
  ];

  let pass = 0;
  for (const c of cases) {
    const r = evaluateThresholds(c.net, c.derived);
    assert(r.verdict === c.expect, `${c.name}: got ${r.verdict}, want ${c.expect} triggers=${JSON.stringify(r.triggers)}`);
    pass++;
    console.log(`PASS ${c.name} → ${r.verdict}`);
  }

  const sample = buildReport({
    netTotals: { pipeGet: 37, pipeSet: 13, allGet: 133, allSet: 29, status: { "200": 311 } },
    results: [{ deltaPipeSet: 2, deltaPipeGet: 4, thrash: false, statusDelta522: 0 }],
    tip: { version: "2.65.40", commit: "test" },
  });
  assert(sample.id === "WGDOM-HARDENING-01D", "id");
  assert(sample.statusByPath === null, "C4 statusByPath must be null");
  assert(sample.derived.count546 === 0, "count546");
  assert(sample.thresholds.verdict === "PASS", "sample verdict");
  assert(typeof sample.derived["546_rate"] === "number", "546_rate");
  console.log("PASS buildReport shape + statusByPath=null (C4)");
  console.log(`---SELF-TEST--- ${pass + 1} checks OK`);
  return 0;
}

function writeArtifacts(report) {
  mkdirSync(".tmp", { recursive: true });
  const iso = String(report.at).replace(/[:.]/g, "-");
  const stamped = `.tmp/hardening-01d-smoke-${iso}.json`;
  const latest = `.tmp/hardening-01d-smoke-latest.json`;
  const body = JSON.stringify(report, null, 2);
  writeFileSync(stamped, body);
  writeFileSync(latest, body);
  return { stamped, latest };
}

function printSummary(report) {
  console.log("---SUMMARY---");
  console.log(
    JSON.stringify(
      {
        tip: report.tip,
        count546: report.derived.count546,
        "546_rate": report.derived["546_rate"],
        pipeSet: report.netTotals.pipeSet,
        maxPipeSet: report.derived.maxPipeSet,
        any522: report.derived.any522,
        anyThrash: report.derived.anyThrash,
        verdict: report.thresholds.verdict,
        triggers: report.thresholds.triggers,
        statusByPath: report.statusByPath,
        pipeSetBaselinePostA: report.thresholds.pipeSetBaselinePostA,
      },
      null,
      2,
    ),
  );
}

/**
 * Re-score an existing Final Audit / 01D JSON (D-T1/D-T2 without live).
 * @param {string} path
 */
function evaluateJsonFile(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const netTotals = raw.netTotals || raw;
  const results = raw.results || [];
  const tip = raw.tip || { version: null, commit: null };
  const report = buildReport({
    netTotals,
    results,
    tip,
    at: raw.at || new Date().toISOString(),
  });
  const paths = writeArtifacts(report);
  printSummary(report);
  console.log("artifacts", paths);
  return report.thresholds.verdict === "FAIL" ? 1 : 0;
}

async function fetchTip() {
  try {
    const res = await fetch("https://www.wgdom.fun/version.json", {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { version: null, commit: null };
    const j = await res.json();
    return { version: j.version ?? null, commit: j.commit ?? null };
  } catch {
    return { version: null, commit: null };
  }
}

async function runLiveSmoke() {
  const env = loadEnv("", process.cwd(), "");
  const BASE = "https://www.wgdom.fun";
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || env.VITE_SUPABASE_PROJECT_ID;
  const adminPass = process.env.WGDOM_ADMIN_PASS || env.WGDOM_ADMIN_PASS;

  // C3 — fail fast, no hardcoded password default
  if (!sr) {
    console.error("FATAL (C3): missing SUPABASE_SERVICE_ROLE_KEY (env / .env)");
    return 2;
  }
  if (!projectId) {
    console.error("FATAL (C3): missing VITE_SUPABASE_PROJECT_ID (env / .env)");
    return 2;
  }
  if (!adminPass) {
    console.error("FATAL (C3): missing WGDOM_ADMIN_PASS (env / .env) — no hardcoded default");
    return 2;
  }

  const edge = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;
  const KAMI = "08dee335-f338-1f30-ebd1-65000155122a";

  async function fetchItems() {
    const res = await fetch(edge + "/batch-get", {
      method: "POST",
      headers: {
        apikey: sr,
        Authorization: "Bearer " + sr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys: ["kw-tenders-pipeline"] }),
      signal: AbortSignal.timeout(120000),
    });
    const j = await res.json();
    const raw = j.values?.[0];
    return Array.isArray(raw) ? raw : raw?.items || [];
  }

  function score(it) {
    const docs =
      (it.bzpDocuments || []).length + (it.externalDocDiscovery?.files || []).length;
    const rows = it.tenderDossier?.kosztorys?.rows?.length || 0;
    return docs * 10 + rows;
  }

  const tip = await fetchTip();
  const items = await fetchItems();
  const kami = items.find((x) => x.id === KAMI);
  const top = [...items]
    .filter((x) => x.id !== KAMI)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 10)
    .map((it) => ({
      id: it.id,
      title: (it.title || "").slice(0, 80),
      score: score(it),
      docs: (it.bzpDocuments || []).length,
    }));

  const targets = [
    {
      id: KAMI,
      title: (kami?.title || "Kamieńskiego").slice(0, 80),
      score: score(kami || {}),
      tag: "kami",
    },
    ...top.map((t) => ({ ...t, tag: "top" })),
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const net = { pipeGet: 0, pipeSet: 0, allGet: 0, allSet: 0, status: {} };
  page.on("request", (req) => {
    const u = req.url();
    if (!u.includes("make-server-0afb8820")) return;
    const post = req.postData() || "";
    const pipe = post.includes("kw-tenders-pipeline");
    if (u.includes("/batch-get")) {
      net.allGet++;
      if (pipe) net.pipeGet++;
    }
    if (u.includes("/batch-set")) {
      net.allSet++;
      if (pipe) net.pipeSet++;
    }
  });
  page.on("response", (res) => {
    if (!res.url().includes("make-server-0afb8820")) return;
    const s = String(res.status());
    net.status[s] = (net.status[s] || 0) + 1;
  });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("button", { name: /Panel administracyjny/i }).first().click();
  await page.getByText("Logowanie administratora").waitFor({ timeout: 20000 });
  const dawidBtn = page.getByRole("button", { name: /^Dawid$/i });
  if (await dawidBtn.count()) await dawidBtn.first().click();
  await page.locator('input[type="password"]').first().fill(adminPass);
  await page.getByRole("button", { name: /^Zaloguj$/ }).click();
  await page.getByRole("heading", { name: "Pulpit", level: 1 }).waitFor({ timeout: 120000 });
  await page.waitForTimeout(5000);

  const results = [];
  for (const t of targets) {
    const before = { ...net, status: { ...net.status } };
    const t0 = Date.now();
    await page
      .goto(`${BASE}/przetargi/${encodeURIComponent(t.id)}/dokumenty`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      })
      .catch((e) => e);
    await page.waitForTimeout(25000);
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const builtAt = await page.evaluate((id) => {
        try {
          const raw = localStorage.getItem("kw-tenders-pipeline");
          const parsed = raw ? JSON.parse(raw) : null;
          const list = Array.isArray(parsed) ? parsed : parsed?.items || [];
          return list.find((x) => x.id === id)?.tenderDossier?.builtAt ?? null;
        } catch {
          return null;
        }
      }, t.id);
      samples.push(builtAt);
      await page.waitForTimeout(2000);
    }
    const uniq = [...new Set(samples.filter(Boolean))];
    const dGet = net.pipeGet - (before.pipeGet || 0);
    const dSet = net.pipeSet - (before.pipeSet || 0);
    const thrash = uniq.length >= 4;
    results.push({
      id: t.id,
      tag: t.tag,
      title: t.title,
      score: t.score,
      ms: Date.now() - t0,
      uniqueBuiltAt: uniq.length,
      thrash,
      deltaPipeGet: dGet,
      deltaPipeSet: dSet,
      statusDelta522: (net.status["522"] || 0) - (before.status["522"] || 0),
    });
    console.log(JSON.stringify(results[results.length - 1]));
  }

  await browser.close();

  const report = buildReport({
    netTotals: net,
    results,
    tip,
    at: new Date().toISOString(),
  });
  const paths = writeArtifacts(report);
  printSummary(report);
  console.log("artifacts", paths);
  console.log(
    "NOTE: append a row to docs/architecture/WGDOM-HARDENING-01D-TREND-LEDGER.md after decision-grade runs.",
  );
  return report.thresholds.verdict === "FAIL" ? 1 : 0;
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isDirectRun) {
  const args = process.argv.slice(2);
  const selfTest = args.includes("--self-test");
  const evalIdx = args.indexOf("--evaluate-json");
  const evalPath = evalIdx >= 0 ? args[evalIdx + 1] : null;

  let code = 0;
  if (selfTest) {
    code = runSelfTest();
  } else if (evalPath) {
    code = evaluateJsonFile(evalPath);
  } else {
    code = await runLiveSmoke();
  }
  process.exit(code);
}
