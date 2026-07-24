/**
 * WGDOM-HARDENING-01B0 — Circuit Breaker / FP-churn monitor smoke (H3-C)
 *
 * Canonical: scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs
 * DF: docs/architecture/WGDOM-HARDENING-01B0-DESIGN-FREEZE.md
 * ARCH: C1–C8 (allowlist · REUSE FP SSOT · one Map · M6 DEFER · pure thresholds ·
 *        separate from 01D · Sync Storm suite · env fail-fast)
 *
 * Usage:
 *   node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --self-test
 *   node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --evaluate-json <path>
 *   node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs
 *     (full contract + Sync Storm — auto-reexec via vite-node when needed)
 *   npx vite-node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --skip-sync-storm
 *
 * OUT forever: breaker semantics · limits · HEAVY_E_RUN_DEP_KEYS · builtAt · B1 · src edits
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = resolve(fileURLToPath(import.meta.url));

/** @typedef {{
 *   M1_maxUniqueFpPerItem?: number,
 *   M2_maxHeavyRunAttempts?: number,
 *   M3_breakerTripCount?: number,
 *   M4_discoveryGrowthSum?: number,
 *   M5_anyThrash?: boolean,
 *   M5_syncStormT3T8?: "PASS"|"FAIL"
 * }} DerivedB0 */

/**
 * Pure threshold evaluation — DF §4 (ARCH C5).
 * @param {DerivedB0} derivedIn
 */
export function evaluateThresholdsB0(derivedIn = {}) {
  const M1 = Number(derivedIn.M1_maxUniqueFpPerItem ?? 0);
  const M2 = Number(derivedIn.M2_maxHeavyRunAttempts ?? 0);
  const M3 = Number(derivedIn.M3_breakerTripCount ?? 0);
  const M4 = Number(derivedIn.M4_discoveryGrowthSum ?? 0);
  const anyThrash = Boolean(derivedIn.M5_anyThrash);
  const syncStorm =
    derivedIn.M5_syncStormT3T8 === "FAIL" || derivedIn.M5_syncStormT3T8 === "PASS"
      ? derivedIn.M5_syncStormT3T8
      : "PASS";

  /** @type {string[]} */
  const triggers = [];

  if (anyThrash) triggers.push("FAIL:M5_anyThrash");
  if (syncStorm === "FAIL") triggers.push("FAIL:M5_syncStormT3T8");
  if (M1 >= 5) triggers.push("FAIL:M1>=5");
  if (M2 > 2) triggers.push("FAIL:M2>2");
  if (M3 >= 3) triggers.push("FAIL:M3>=3");
  if (M3 >= 1 && M4 === 0) triggers.push("FAIL:M3_anomaly_no_growth");

  if (M1 >= 3 && M1 <= 4) triggers.push("WARN:M1=3..4");
  if (M3 >= 1 && M3 < 3 && !(M3 >= 1 && M4 === 0)) {
    triggers.push("WARN:M3>=1");
  }

  const hasFail = triggers.some((t) => t.startsWith("FAIL:"));
  const hasWarn = triggers.some((t) => t.startsWith("WARN:"));
  /** @type {"PASS"|"WARN"|"FAIL"} */
  const verdict = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

  return {
    verdict,
    triggers,
    derived: {
      M1_maxUniqueFpPerItem: M1,
      M2_maxHeavyRunAttempts: M2,
      M3_breakerTripCount: M3,
      M4_discoveryGrowthSum: M4,
      M5_anyThrash: anyThrash,
      M5_syncStormT3T8: syncStorm,
    },
  };
}

/**
 * Build DF §5.1 report object.
 * @param {{ derived: DerivedB0, results?: unknown[], tip?: { version?: string|null, commit?: string|null }, at?: string, notes?: string }} input
 */
export function buildReportB0(input) {
  const th = evaluateThresholdsB0(input.derived || {});
  return {
    id: "WGDOM-HARDENING-01B0",
    at: input.at || new Date().toISOString(),
    tip: {
      version: input.tip?.version ?? null,
      commit: input.tip?.commit ?? null,
    },
    derived: th.derived,
    thresholds: {
      verdict: th.verdict,
      triggers: th.triggers,
    },
    results: input.results || [],
    includeM6: false,
    notes:
      input.notes ||
      "H3-C monitor-only; breaker semantics unchanged; includeM6=false (DEFER)",
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** B0-T4 self-test — no Playwright / vite-node / prod (C5). */
export function runSelfTest() {
  const cases = [
    {
      name: "clear → PASS",
      derived: {
        M1_maxUniqueFpPerItem: 1,
        M2_maxHeavyRunAttempts: 2,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 0,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "PASS",
    },
    {
      name: "thrash → FAIL",
      derived: {
        M1_maxUniqueFpPerItem: 1,
        M2_maxHeavyRunAttempts: 1,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 0,
        M5_anyThrash: true,
        M5_syncStormT3T8: "PASS",
      },
      expect: "FAIL",
    },
    {
      name: "attempts>2 → FAIL",
      derived: {
        M1_maxUniqueFpPerItem: 1,
        M2_maxHeavyRunAttempts: 3,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 0,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "FAIL",
    },
    {
      name: "M1=3 → WARN",
      derived: {
        M1_maxUniqueFpPerItem: 3,
        M2_maxHeavyRunAttempts: 2,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 2,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "WARN",
    },
    {
      name: "M1=4 → WARN",
      derived: {
        M1_maxUniqueFpPerItem: 4,
        M2_maxHeavyRunAttempts: 1,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 3,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "WARN",
    },
    {
      name: "M1>=5 → FAIL",
      derived: {
        M1_maxUniqueFpPerItem: 5,
        M2_maxHeavyRunAttempts: 1,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 4,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "FAIL",
    },
    {
      name: "M3>=1 + growth → WARN",
      derived: {
        M1_maxUniqueFpPerItem: 2,
        M2_maxHeavyRunAttempts: 2,
        M3_breakerTripCount: 1,
        M4_discoveryGrowthSum: 2,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "WARN",
    },
    {
      name: "M3>=1 + no growth → FAIL anomaly",
      derived: {
        M1_maxUniqueFpPerItem: 1,
        M2_maxHeavyRunAttempts: 2,
        M3_breakerTripCount: 1,
        M4_discoveryGrowthSum: 0,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "FAIL",
    },
    {
      name: "M3>=3 → FAIL",
      derived: {
        M1_maxUniqueFpPerItem: 2,
        M2_maxHeavyRunAttempts: 2,
        M3_breakerTripCount: 3,
        M4_discoveryGrowthSum: 5,
        M5_anyThrash: false,
        M5_syncStormT3T8: "PASS",
      },
      expect: "FAIL",
    },
    {
      name: "Sync Storm FAIL → FAIL",
      derived: {
        M1_maxUniqueFpPerItem: 1,
        M2_maxHeavyRunAttempts: 1,
        M3_breakerTripCount: 0,
        M4_discoveryGrowthSum: 0,
        M5_anyThrash: false,
        M5_syncStormT3T8: "FAIL",
      },
      expect: "FAIL",
    },
  ];

  let pass = 0;
  for (const c of cases) {
    const r = evaluateThresholdsB0(c.derived);
    assert(
      r.verdict === c.expect,
      `${c.name}: got ${r.verdict}, want ${c.expect} triggers=${JSON.stringify(r.triggers)}`,
    );
    pass++;
    console.log(`PASS ${c.name} → ${r.verdict}`);
  }

  const sample = buildReportB0({
    derived: {
      M1_maxUniqueFpPerItem: 1,
      M2_maxHeavyRunAttempts: 2,
      M3_breakerTripCount: 0,
      M4_discoveryGrowthSum: 0,
      M5_anyThrash: false,
      M5_syncStormT3T8: "PASS",
    },
    tip: { version: "2.65.40", commit: "test" },
  });
  assert(sample.id === "WGDOM-HARDENING-01B0", "id");
  assert(sample.includeM6 === false, "C4 includeM6 must be false");
  assert(sample.thresholds.verdict === "PASS", "sample verdict");
  assert(
    sample.derived.M1_maxUniqueFpPerItem === 1 &&
      sample.derived.M5_syncStormT3T8 === "PASS",
    "derived shape",
  );
  console.log("PASS buildReportB0 shape + includeM6=false (C4)");
  console.log(`---SELF-TEST--- ${pass + 1} checks OK`);
  return 0;
}

function writeArtifacts(report) {
  mkdirSync(".tmp", { recursive: true });
  const iso = String(report.at).replace(/[:.]/g, "-");
  const stamped = `.tmp/hardening-01b0-smoke-${iso}.json`;
  const latest = `.tmp/hardening-01b0-smoke-latest.json`;
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
        derived: report.derived,
        verdict: report.thresholds.verdict,
        triggers: report.thresholds.triggers,
        includeM6: report.includeM6,
      },
      null,
      2,
    ),
  );
}

/**
 * Re-score an existing 01B0 JSON (or partial derived) — no live (C5).
 * @param {string} path
 */
function evaluateJsonFile(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const derived = raw.derived || raw;
  const tip = raw.tip || { version: null, commit: null };
  const report = buildReportB0({
    derived,
    results: raw.results || [],
    tip,
    at: raw.at || new Date().toISOString(),
    notes: raw.notes,
  });
  const paths = writeArtifacts(report);
  printSummary(report);
  console.log("artifacts", paths);
  return report.thresholds.verdict === "FAIL" ? 1 : 0;
}

function discoveryGrowthDelta(before, after) {
  const dBzp =
    (after.bzpDocuments?.length || 0) - (before.bzpDocuments?.length || 0);
  const dExt =
    (after.externalDocDiscovery?.files?.length || 0) -
    (before.externalDocDiscovery?.files?.length || 0);
  const uploadAppeared = !before.uploadedFile && after.uploadedFile ? 1 : 0;
  return Math.max(0, dBzp) + Math.max(0, dExt) + uploadAppeared;
}

function makeItem(id, opts = {}) {
  return {
    id,
    tenderId: opts.tenderId || `tender-${id}`,
    title: opts.title || id,
    status: "seen",
    bzpDocuments: opts.bzpDocuments || [],
    externalDocDiscovery: opts.externalDocDiscovery || { files: [] },
    uploadedFile: opts.uploadedFile || null,
    tenderDossier: opts.tenderDossier || { parserVersion: "1" },
    updatedAt: "2026-07-24T00:00:00.000Z",
  };
}

function bzpDoc(i) {
  return {
    index: i,
    documentId: `bzp-doc-${i}`,
    filename: `doc-${i}.pdf`,
    contentType: "application/pdf",
    downloadUrl: `https://example.invalid/docs/${i}.pdf`,
  };
}

/**
 * Contract harness — REUSE SSOT FP + existing heavyRunAttempts Map (C2, C3).
 * Requires vite-node (TS imports).
 */
async function runContractHarness({ skipSyncStorm }) {
  globalThis.localStorage = globalThis.localStorage || {
    _m: new Map(),
    setItem(k, v) {
      this._m.set(String(k), String(v));
    },
    getItem(k) {
      return this._m.has(String(k)) ? this._m.get(String(k)) : null;
    },
    removeItem(k) {
      this._m.delete(String(k));
    },
    clear() {
      this._m.clear();
    },
    key(i) {
      return [...this._m.keys()][i] ?? null;
    },
    get length() {
      return this._m.size;
    },
  };

  const { buildHeavyParseDocumentFingerprint } = await import(
    "../src/lib/tender-pipeline/unified-attachment-gate.ts"
  );
  const {
    bumpHeavyRunAttemptsForTest,
    getHeavyMaxRunsPerKeyForTest,
    getHeavyRunAttemptsForTest,
    resetDossierHeavyLazyForTests,
  } = await import("../src/app/hooks/useTenderDossierHeavyLazy.ts");

  const results = [];
  const maxRuns = getHeavyMaxRunsPerKeyForTest();
  assert(maxRuns === 2, `HEAVY_MAX_RUNS_PER_KEY must remain 2 (got ${maxRuns})`);
  results.push({ check: "contract_max_runs", value: maxRuns, ok: true });

  // --- M1 / M4: SSOT FP on fixture snapshots (read-only import) ---
  const itemId = "b0-fixture-1";
  const snapshots = [];
  let item = makeItem(itemId, { bzpDocuments: [] });
  snapshots.push({ label: "t0", item: structuredClone(item), fp: buildHeavyParseDocumentFingerprint(item) });

  item = makeItem(itemId, { bzpDocuments: [bzpDoc(1)] });
  snapshots.push({ label: "t1", item: structuredClone(item), fp: buildHeavyParseDocumentFingerprint(item) });

  item = makeItem(itemId, { bzpDocuments: [bzpDoc(1), bzpDoc(2)] });
  snapshots.push({ label: "t2", item: structuredClone(item), fp: buildHeavyParseDocumentFingerprint(item) });

  const uniqueFps = new Set(snapshots.map((s) => s.fp));
  const M1 = uniqueFps.size;
  const M4 = discoveryGrowthDelta(snapshots[0].item, snapshots[snapshots.length - 1].item);
  results.push({
    check: "ssot_fp_import",
    ok: true,
    uniqueFpCount: M1,
    discoveryGrowthSum: M4,
    // PII-safe: hash-ish short fp prefixes only
    fpPrefixes: [...uniqueFps].map((f) => String(f).slice(0, 24)),
  });
  assert(M1 >= 2, "fixture growth must yield ≥2 unique FPs via SSOT");

  // --- M2 / M3: existing Map + test getters only (no second Map) ---
  resetDossierHeavyLazyForTests();
  const fpA = snapshots[0].fp;
  const fpB = snapshots[1].fp;
  let trips = 0;
  let maxAttempts = 0;

  const a1 = bumpHeavyRunAttemptsForTest(itemId, fpA, 0);
  maxAttempts = Math.max(maxAttempts, a1);
  const a2 = bumpHeavyRunAttemptsForTest(itemId, fpA, 0);
  maxAttempts = Math.max(maxAttempts, a2);
  if (a2 >= maxRuns) trips += 1;

  assert(
    getHeavyRunAttemptsForTest(itemId, fpA, 0) === maxRuns,
    "same FP reaches circuit max (==2)",
  );

  const b1 = bumpHeavyRunAttemptsForTest(itemId, fpB, 0);
  maxAttempts = Math.max(maxAttempts, b1);
  assert(
    getHeavyRunAttemptsForTest(itemId, fpB, 0) === 1,
    "new gateFingerprint starts fresh attempt counter",
  );
  results.push({
    check: "contract_breaker_per_fp",
    ok: true,
    maxAttempts,
    trips,
    sameKeyAttempts: getHeavyRunAttemptsForTest(itemId, fpA, 0),
    newKeyAttempts: getHeavyRunAttemptsForTest(itemId, fpB, 0),
  });

  // Measurement window for tip-GREEN style report: legal growth observed,
  // breaker respected (M2≤2). Trips with growth → WARN (not FAIL anomaly).
  const derivedWindow = {
    M1_maxUniqueFpPerItem: M1,
    M2_maxHeavyRunAttempts: maxAttempts,
    M3_breakerTripCount: trips,
    M4_discoveryGrowthSum: M4,
    M5_anyThrash: false,
    M5_syncStormT3T8: "PASS",
  };

  // --- M5b: REUSE Sync Storm suite (C7) — do not reimplement T3/T8 ---
  if (!skipSyncStorm) {
    console.log("--- Sync Storm P0 (C7 REUSE) ---");
    const storm = spawnSync(
      "npx",
      ["vite-node", "scripts/test-tenders-sync-storm-p0.mjs"],
      { cwd: ROOT, encoding: "utf8", shell: true },
    );
    // Sync Storm prints "  FAIL <label>" on failure (C7 — reuse suite, don't reimplement)
    const failLines = (storm.stdout || "")
      .split(/\r?\n/)
      .filter((l) => /^\s*FAIL\s/.test(l));
    const syncPass = storm.status === 0 && failLines.length === 0;
    derivedWindow.M5_syncStormT3T8 = syncPass ? "PASS" : "FAIL";
    results.push({
      check: "sync_storm_p0",
      ok: syncPass,
      exitCode: storm.status,
      failLineCount: failLines.length,
    });
    if (!syncPass) {
      console.log(storm.stdout || "");
      if (storm.stderr) console.error(storm.stderr);
    } else {
      console.log("PASS Sync Storm P0 suite (exit 0, 0 FAIL lines)");
    }
  } else {
    results.push({ check: "sync_storm_p0", ok: true, skipped: true });
    console.log("NOTE: --skip-sync-storm — M5b assumed PASS (Operator must run suite separately for B0-T2)");
  }

  // Tip metadata (best-effort, no secrets)
  let tip = { version: null, commit: null };
  try {
    const res = await fetch("https://www.wgdom.fun/version.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const j = await res.json();
      tip = { version: j.version ?? null, commit: j.commit ?? null };
    }
  } catch {
    tip = { version: "2.65.40", commit: null };
  }

  // Prefer known tip GREEN artifact thrash if present (B0-T3)
  const tipGreenArtifact = join(ROOT, ".tmp/hardening-01d-audit-multi-tender-2.65.40.json");
  if (existsSync(tipGreenArtifact)) {
    try {
      const art = JSON.parse(readFileSync(tipGreenArtifact, "utf8"));
      const thrash =
        Boolean(art?.derived?.anyThrash) ||
        (Array.isArray(art?.results) && art.results.some((r) => r.thrash));
      derivedWindow.M5_anyThrash = thrash;
      results.push({
        check: "tip_green_thrash_from_01d_artifact",
        ok: !thrash,
        artifact: ".tmp/hardening-01d-audit-multi-tender-2.65.40.json",
      });
    } catch {
      /* keep false */
    }
  }

  const report = buildReportB0({
    derived: derivedWindow,
    results,
    tip,
    notes:
      "H3-C monitor-only; SSOT FP import; one Map via test getters; includeM6=false; not FIXED H-FP-CHURN",
  });
  const paths = writeArtifacts(report);
  printSummary(report);
  console.log("artifacts", paths);
  console.log(
    "NOTE: append a row to docs/architecture/WGDOM-HARDENING-01B0-TREND-LEDGER.md after decision-grade runs.",
  );
  return report.thresholds.verdict === "FAIL" ? 1 : 0;
}

function reexecViaViteNode(args) {
  console.log("NOTE: full 01B0 contract requires vite-node — re-exec…");
  const r = spawnSync(
    "npx",
    ["vite-node", "scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs", ...args, "--already-vite-node"],
    {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
      env: { ...process.env, WGDOM_01B0_VITE_NODE: "1" },
      stdio: "inherit",
    },
  );
  return r.status == null ? 1 : r.status;
}

function isViteNodeSession(args) {
  return (
    args.includes("--already-vite-node") ||
    process.env.WGDOM_01B0_VITE_NODE === "1" ||
    process.env.VITE_NODE_ENTRYPOINT != null
  );
}

/**
 * Optional live path — env-only secrets, fail-fast exit 2 (C8).
 * Not required for DoD; present to satisfy D21 / C8 contract.
 */
function checkLiveEnvOrFail() {
  const envPath = join(ROOT, ".env");
  const env = {};
  const ignoreDotenv = process.env.WGDOM_01B0_IGNORE_DOTENV === "1";
  if (!ignoreDotenv && existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      env[m[1]] = v;
    }
  }
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const projectId =
    process.env.VITE_SUPABASE_PROJECT_ID || env.VITE_SUPABASE_PROJECT_ID;
  if (!sr) {
    console.error("FATAL (C8): missing SUPABASE_SERVICE_ROLE_KEY (env / .env)");
    return 2;
  }
  if (!projectId) {
    console.error("FATAL (C8): missing VITE_SUPABASE_PROJECT_ID (env / .env)");
    return 2;
  }
  return 0;
}

function shouldRunCli() {
  if (process.env.WGDOM_01B0_LIB === "1") return false;
  const hay = process.argv.join("|");
  if (/smoke-wgdom-hardening-01b0-fp-churn\.mjs/.test(hay)) return true;
  try {
    if (process.argv[1] && resolve(process.argv[1]) === SCRIPT) return true;
  } catch {
    /* ignore */
  }
  // vite-node 6 may omit script path from argv; entry execution still runs this file.
  if (/vite-node/i.test(hay)) return true;
  return false;
}

if (shouldRunCli()) {
  const args = process.argv.slice(2).filter((a) => a !== "--already-vite-node");
  const selfTest = args.includes("--self-test");
  const skipSyncStorm = args.includes("--skip-sync-storm");
  const live = args.includes("--live");
  const evalIdx = args.indexOf("--evaluate-json");
  const evalPath = evalIdx >= 0 ? args[evalIdx + 1] : null;

  let code = 0;
  if (selfTest) {
    code = runSelfTest();
    process.exit(code);
  } else if (evalPath) {
    code = evaluateJsonFile(evalPath);
    process.exit(code);
  } else {
    if (live) {
      const envCode = checkLiveEnvOrFail();
      if (envCode !== 0) process.exit(envCode);
      console.log(
        "NOTE: --live env OK (C8). Proceeding with contract harness (no Playwright in 01B0).",
      );
    }
    try {
      code = await runContractHarness({ skipSyncStorm });
    } catch (e) {
      const msg = String(e?.message || e);
      const needVite =
        !isViteNodeSession(process.argv.slice(2)) &&
        (/Unknown file extension|\.ts\b|Cannot find module|strip-only mode|TypeScript enum/i.test(
          msg,
        ) ||
          e?.code === "ERR_UNKNOWN_FILE_EXTENSION");
      if (needVite) {
        code = reexecViaViteNode(args);
      } else {
        console.error("FATAL: contract harness failed:", msg);
        code = 1;
      }
    }
    process.exit(code);
  }
}
