#!/usr/bin/env node
/**
 * TEST-INFRA-001 — Test Orchestrator (MVP)
 * SSOT: test-infra/test-manifest.json — zero hardcoded test lists (#006).
 *
 * Usage:
 *   node scripts/test-infra-orchestrator.mjs --suite lib-payroll-core
 *   node scripts/test-infra-orchestrator.mjs --gate B --scope payroll
 *   node scripts/test-infra-orchestrator.mjs --gate C --scope all
 *   node scripts/test-infra-orchestrator.mjs --validate
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync, spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "test-infra", "test-manifest.json");

const CLASS_ORDER = { lib: 0, smoke: 1, e2e: 2, audit: 3 };

function parseArgs(argv) {
  const out = {
    suite: null,
    gate: null,
    scope: null,
    continueOnFail: false,
    allowProd: false,
    includeAudit: false,
    skipBuild: false,
    validateOnly: false,
    previewUrl: process.env.PW_BASE_URL || "http://127.0.0.1:4173",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--suite") out.suite = argv[++i];
    else if (a === "--gate") out.gate = String(argv[++i] || "").toUpperCase();
    else if (a === "--scope") out.scope = String(argv[++i] || "").toLowerCase();
    else if (a === "--continue") out.continueOnFail = true;
    else if (a === "--allow-prod") out.allowProd = true;
    else if (a === "--include-audit") out.includeAudit = true;
    else if (a === "--skip-build") out.skipBuild = true;
    else if (a === "--validate") out.validateOnly = true;
    else if (a === "--preview-url") out.previewUrl = argv[++i];
  }
  return out;
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function validateManifest(manifest) {
  const errors = [];
  if (!manifest.manifestVersion) errors.push("missing manifestVersion");
  if (!Array.isArray(manifest.tests)) errors.push("tests must be array");
  if (!manifest.suites || typeof manifest.suites !== "object") errors.push("suites required");

  if (errors.length === 0) {
    const ids = new Set();
    for (const t of manifest.tests || []) {
      for (const key of [
        "id",
        "class",
        "path",
        "runner",
        "environment",
        "releaseTier",
        "mandatory",
        "owner",
        "status",
      ]) {
        if (t[key] === undefined || t[key] === "") errors.push(`${t.id || "?"}: missing ${key}`);
      }
      if (ids.has(t.id)) errors.push(`duplicate id: ${t.id}`);
      ids.add(t.id);
      if (!["lib", "smoke", "e2e", "audit"].includes(t.class)) errors.push(`${t.id}: invalid class`);
      if (!existsSync(join(ROOT, t.path))) errors.push(`${t.id}: path missing ${t.path}`);
      if (t.class === "audit" && t.status !== "forensic-only") {
        errors.push(`${t.id}: audit must be forensic-only`);
      }
    }

    for (const [suiteId, suite] of Object.entries(manifest.suites || {})) {
      for (const tid of suite.testIds || []) {
        if (tid && !ids.has(tid)) errors.push(`suite ${suiteId}: unknown testId ${tid}`);
      }
    }
  }

  return errors;
}

function resolveTestsForScope(test, scope, includeAudit) {
  if (test.class === "audit" && !includeAudit) return false;
  if (!scope || scope === "all") return true;
  const cond = test.condition || "";
  if (cond === `scope:${scope}`) return true;
  if (scope === "payroll" && cond.includes("payroll")) return true;
  if (scope === "platform" && cond.includes("platform")) return true;
  return false;
}

function collectSuiteTests(manifest, suiteIds, opts) {
  const byId = new Map(manifest.tests.map((t) => [t.id, t]));
  const collected = [];
  const seen = new Set();

  for (const suiteId of suiteIds) {
    const suite = manifest.suites[suiteId];
    if (!suite) throw new Error(`Unknown suite: ${suiteId}`);
    for (const tid of suite.testIds || []) {
      if (seen.has(tid)) continue;
      seen.add(tid);
      const t = byId.get(tid);
      if (!t) continue;
      if (!resolveTestsForScope(t, opts.scope, opts.includeAudit)) continue;
      if (t.environment === "prod" && !opts.allowProd) {
        console.warn(`SKIP ${t.id}: prod blocked (use --allow-prod)`);
        continue;
      }
      collected.push(t);
    }
  }

  return collected.sort((a, b) => {
    const ca = CLASS_ORDER[a.class] ?? 9;
    const cb = CLASS_ORDER[b.class] ?? 9;
    return ca - cb || a.id.localeCompare(b.id);
  });
}

function runBuild() {
  console.log("\n=== BUILD (gate implicit) ===\n");
  const r = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: true });
  return r.status === 0;
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait for preview readiness */
  }
}

function isPreviewReachable(url) {
  try {
    const parsed = new URL(url);
    const status = spawnSync(
      "node",
      [
        "-e",
        `const http=require('http');const u=new URL(process.argv[1]);const req=http.get({hostname:u.hostname,port:u.port,path:'/version.json',timeout:3000},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));`,
        url,
      ],
      { cwd: ROOT, shell: true, timeout: 5000 },
    );
    return status.status === 0;
  } catch {
    return false;
  }
}

function startPreviewServer() {
  console.log("\n=== PREVIEW (#010) — starting npm run preview ===\n");
  const child = spawn("npm", ["run", "preview"], {
    cwd: ROOT,
    shell: true,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child;
}

function ensurePreviewServer(previewUrl) {
  if (isPreviewReachable(previewUrl)) {
    console.log(`Preview already reachable at ${previewUrl}`);
    return null;
  }

  const child = startPreviewServer();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (isPreviewReachable(previewUrl)) {
      console.log(`Preview ready at ${previewUrl}`);
      return child;
    }
    sleepSync(1000);
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    /* ignore */
  }
  throw new Error(`Preview server not reachable at ${previewUrl} after 90s (#010)`);
}

function classifyHarnessFailure(test, output) {
  if (test.class !== "e2e" || !test.path?.includes("payroll-guard")) return null;
  if (output.includes("HarnessPreconditionError")) return "HarnessPreconditionError";
  if (output.includes("ScenarioFail")) return "ScenarioFail";
  return null;
}

function runTestEntry(test, opts) {
  const absPath = join(ROOT, test.path);
  const started = Date.now();
  let status = 0;
  let output = "";
  let failKind = null;

  if (test.runner === "vite-node") {
    const r = spawnSync("npx", ["vite-node", absPath], {
      cwd: ROOT,
      shell: true,
      encoding: "utf8",
    });
    output = `${r.stdout || ""}${r.stderr || ""}`;
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    status = r.status ?? 1;
  } else if (test.runner === "node") {
    const r = spawnSync("node", [absPath], {
      cwd: ROOT,
      shell: true,
      encoding: "utf8",
    });
    output = `${r.stdout || ""}${r.stderr || ""}`;
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    status = r.status ?? 1;
  } else if (test.runner === "playwright") {
    const env = { ...process.env, PW_BASE_URL: opts.previewUrl };
    const args = ["playwright", "test", test.path];
    if (test.playwrightProject) args.push(`--project=${test.playwrightProject}`);
    const r = spawnSync("npx", args, {
      cwd: ROOT,
      shell: true,
      encoding: "utf8",
      env,
    });
    output = `${r.stdout || ""}${r.stderr || ""}`;
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    status = r.status ?? 1;
    failKind = status !== 0 ? classifyHarnessFailure(test, output) : null;
  } else {
    throw new Error(`Unknown runner: ${test.runner}`);
  }

  return { status, ms: Date.now() - started, output, failKind };
}

function isBlockingFailure(test, status) {
  if (status === 0) return false;
  return test.mandatory === "always";
}

function printReport(results, suiteLabel) {
  console.log("\n========================================");
  console.log("TEST-INFRA ORCHESTRATOR REPORT");
  console.log(`Suite/Gate: ${suiteLabel}`);
  console.log("========================================\n");

  let pass = 0;
  let fail = 0;
  let blockingFail = 0;

  for (const r of results) {
    const mark = r.status === 0 ? "PASS" : "FAIL";
    if (r.status === 0) pass++;
    else fail++;
    if (isBlockingFailure(r, r.status)) blockingFail++;

    const failKindSuffix = r.failKind ? `  failKind=${r.failKind}` : "";
    console.log(`${mark}  ${r.id}  [${r.class}]  ${r.ms}ms  mandatory=${r.mandatory}${failKindSuffix}`);
    console.log(`      ${r.path}`);
    if (r.error) console.log(`      error: ${r.error}`);
  }

  console.log("\n----------------------------------------");
  console.log(`TOTAL: ${pass} PASS / ${fail} FAIL / ${results.length}`);
  console.log(`BLOCKING (mandatory=always): ${blockingFail}`);
  console.log("========================================\n");
  return blockingFail === 0;
}

function resolveSuiteIds(opts, manifest) {
  if (opts.suite) {
    if (!manifest.suites[opts.suite]) throw new Error(`Unknown suite: ${opts.suite}`);
    return [opts.suite];
  }
  if (opts.gate) {
    const gateDef = manifest.releaseGates?.[opts.gate];
    if (!gateDef) throw new Error(`Unknown gate: ${opts.gate}`);
    if (gateDef.scopeRequired && !opts.scope) {
      throw new Error(`Gate ${opts.gate} requires --scope payroll|platform|all`);
    }
    return gateDef.suites;
  }
  throw new Error("Provide --suite <id> or --gate A|B|C");
}

function main() {
  const opts = parseArgs(process.argv);
  const manifest = loadManifest();
  const valErrors = validateManifest(manifest);
  if (valErrors.length) {
    console.error("MANIFEST VALIDATION FAIL:");
    valErrors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }

  if (opts.validateOnly) {
    console.log(
      `MANIFEST OK v${manifest.manifestVersion} — ${manifest.tests.length} tests, ${Object.keys(manifest.suites).length} suites`,
    );
    process.exit(0);
  }

  const suiteIds = resolveSuiteIds(opts, manifest);
  const needsBuild =
    !opts.skipBuild &&
    (opts.gate || suiteIds.some((s) => s.startsWith("gate-") || s.includes("e2e")));

  const gateDef = opts.gate ? manifest.releaseGates[opts.gate] : null;
  if (needsBuild || gateDef?.implicitBuild || opts.gate === "A") {
    if (!runBuild()) {
      console.error("BUILD FAIL — aborting orchestrator");
      process.exit(1);
    }
  }

  if (opts.gate === "A") {
    console.log("\nGATE A COMPLETE — build only\n");
    process.exit(0);
  }

  const tests = collectSuiteTests(manifest, suiteIds, opts);
  const label = opts.suite || `gate-${opts.gate}${opts.scope ? ` scope=${opts.scope}` : ""}`;

  if (tests.length === 0) {
    console.warn(`No tests selected for ${label}`);
    process.exit(0);
  }

  const hasPreviewE2e = tests.some((t) => t.class === "e2e" && t.environment === "preview");
  let previewChild = null;
  if (hasPreviewE2e) {
    console.log(`\nE2E preview target: ${opts.previewUrl}`);
    try {
      previewChild = ensurePreviewServer(opts.previewUrl);
    } catch (err) {
      console.error(String(err?.message || err));
      process.exit(1);
    }
  }

  const results = [];
  try {
    for (const test of tests) {
      console.log(`\n>>> RUN ${test.id} [${test.class}] ${test.path}\n`);
      try {
        const { status, ms, failKind } = runTestEntry(test, opts);
        results.push({ ...test, status, ms, failKind });
        if (status !== 0 && !opts.continueOnFail && isBlockingFailure(test, status)) break;
      } catch (err) {
        results.push({ ...test, status: 1, ms: 0, error: String(err?.message || err), failKind: null });
        if (!opts.continueOnFail) break;
      }
    }
  } finally {
    if (previewChild?.pid) {
      try {
        process.kill(-previewChild.pid, "SIGTERM");
      } catch {
        /* ignore */
      }
    }
  }

  const ok = printReport(results, label);
  process.exit(ok ? 0 : 1);
}

main();
