#!/usr/bin/env node
/**
 * TEST-HARNESS-01 — Production Sandbox Harness runner (H0–H5 + H0.x)
 *
 * Usage:
 *   npm run test:prod-sandbox -- --scenario h0-preflight
 *   npm run test:prod-sandbox -- --scenario h0x-recover --dry-run
 *   npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
 *   npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
 *   …
 *
 * Exit codes (Design Freeze §6):
 *   0 PASS · 2 Precondition · 3 Scenario FAIL · 4 Cleanup FAIL
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { writeReport, defaultOutDir } from "./report.mjs";
import { exitCodeForRun } from "./cleanup.mjs";
import { runH0Preflight } from "./scenarios/h0-preflight.mjs";
import { runH0xRecover } from "./scenarios/h0x-recover.mjs";
import { runH1Tender } from "./scenarios/h1-tender.mjs";
import { runH2JobsPhotos } from "./scenarios/h2-jobs-photos.mjs";
import { runH3Payroll } from "./scenarios/h3-payroll.mjs";
import { runH4Cloud } from "./scenarios/h4-cloud.mjs";
import { runH5Biblioteka } from "./scenarios/h5-biblioteka.mjs";
import { acquireH0xLock, releaseH0xLock } from "./h0x-lock.mjs";
import { recoverOpenEntities } from "./h0x-recovery.mjs";
import { createKvClient } from "./kv-client.mjs";
import { isPsbId } from "./markers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const IMPLEMENTED = new Set([
  "h0-preflight",
  "h0",
  "h0x-recover",
  "h0x",
  "h1-tender",
  "h1",
  "h2-jobs-photos",
  "h2",
  "h3-payroll",
  "h3",
  "h4-cloud",
  "h4",
  "h5-biblioteka",
  "h5",
]);

function parseArgs(argv) {
  const out = {
    scenario: "h0-preflight",
    allowProd: false,
    dryRun: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scenario") out.scenario = String(argv[++i] || "").toLowerCase();
    else if (a === "--allow-prod") out.allowProd = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  if (out.scenario === "h0") out.scenario = "h0-preflight";
  if (out.scenario === "h0x") out.scenario = "h0x-recover";
  if (out.scenario === "h1") out.scenario = "h1-tender";
  if (out.scenario === "h2") out.scenario = "h2-jobs-photos";
  if (out.scenario === "h3") out.scenario = "h3-payroll";
  if (out.scenario === "h4") out.scenario = "h4-cloud";
  if (out.scenario === "h5") out.scenario = "h5-biblioteka";
  return out;
}

function printHelp() {
  console.log(`
TEST-HARNESS-01 Production Sandbox Harness

  npm run test:prod-sandbox -- --scenario h0-preflight
  npm run test:prod-sandbox -- --scenario h0x-recover --dry-run
  npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
  npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
  npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod
  npm run test:prod-sandbox -- --scenario h3-payroll --allow-prod
  npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod
  npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod

Flags:
  --scenario <id>   h0-preflight | h0x-recover | h1-tender | h2-jobs-photos | h3-payroll | h4-cloud | h5-biblioteka
  --allow-prod      required for prod KV writes / H0.x recovery writes
  --dry-run         side-effect free planning mode

Env:
  PSB_H0X_SCAN=1    optional KV scan safety net during recovery

Exit: 0 PASS · 2 Precondition · 3 Scenario FAIL · 4 Cleanup FAIL
`);
}

function sliceFor(scenario) {
  if (scenario.startsWith("h0x")) return "H0.x";
  if (scenario.startsWith("h5")) return "H5";
  if (scenario.startsWith("h4")) return "H4";
  if (scenario.startsWith("h3")) return "H3";
  if (scenario.startsWith("h2")) return "H2";
  if (scenario.startsWith("h1")) return "H1";
  return "H0";
}

/**
 * H0.x recovery gate before scenario (allow-prod only).
 * h0x-recover runs its own recovery proof — skip duplicate pre-recover.
 */
async function preScenarioRecovery(args) {
  if (!args.allowProd || args.dryRun) {
    return { skipped: true, status: "PASS" };
  }
  if (args.scenario === "h0x-recover") {
    return { skipped: true, status: "PASS", reason: "scenario-owns-recovery" };
  }

  await acquireH0xLock({ pid: process.pid, scenario: args.scenario });
  try {
    const kv = createKvClient(ROOT);
    const scan = process.env.PSB_H0X_SCAN === "1";
    const result = await recoverOpenEntities({
      kv,
      dryRun: false,
      allowProd: true,
      scan,
      assertWritable: (e) => {
        if (!isPsbId(e.id)) throw new Error(`PSB_MUTATE_DENIED: ${e.id}`);
      },
    });
    if (result.status === "FAIL") {
      const detail = JSON.stringify(result.leftovers);
      throw new Error(`PSB_H0X_RECOVERY_FAIL: leftovers=${detail}`);
    }
    if (result.recovered.length || result.prunedPending.length || result.scanRemoved) {
      console.log(
        `h0x.pre-recover: recovered=${result.recovered.length} prunedPending=${result.prunedPending.length} scanRemoved=${result.scanRemoved}`,
      );
    }
    return { skipped: false, status: "PASS", result };
  } catch (e) {
    await releaseH0xLock({ pid: process.pid });
    throw e;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!IMPLEMENTED.has(args.scenario)) {
    console.error(
      `PSB_SCENARIO_NOT_IMPLEMENTED: ${args.scenario} (unknown scenario)`,
    );
    process.exit(2);
  }

  const slice = sliceFor(args.scenario);
  const outDir = defaultOutDir(ROOT, `${args.scenario}-${Date.now().toString(36)}`);
  console.log(`=== TEST-HARNESS-01 / ${slice} ===`);
  console.log(`scenario=${args.scenario} dryRun=${args.dryRun} allowProd=${args.allowProd}`);
  console.log(`outDir=${outDir}`);

  let lockHeld = false;
  const onSignal = async (sig) => {
    console.warn(`h0x.signal: ${sig} — best-effort release lock`);
    if (lockHeld) {
      try {
        await releaseH0xLock({ pid: process.pid });
      } catch {
        /* ignore */
      }
    }
    process.exit(2);
  };
  process.once("SIGINT", () => {
    void onSignal("SIGINT");
  });
  process.once("SIGTERM", () => {
    void onSignal("SIGTERM");
  });

  let result;
  try {
    const pre = await preScenarioRecovery(args);
    if (!pre.skipped) lockHeld = true;

    if (args.scenario === "h0x-recover") {
      result = await runH0xRecover({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    } else if (args.scenario === "h5-biblioteka") {
      result = await runH5Biblioteka({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    } else if (args.scenario === "h4-cloud") {
      result = await runH4Cloud({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    } else if (args.scenario === "h3-payroll") {
      result = await runH3Payroll({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    } else if (args.scenario === "h2-jobs-photos") {
      result = await runH2JobsPhotos({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    } else if (args.scenario === "h1-tender") {
      result = await runH1Tender({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    } else {
      result = await runH0Preflight({
        allowProd: args.allowProd,
        dryRun: args.dryRun,
        root: ROOT,
      });
    }
  } catch (e) {
    if (lockHeld) await releaseH0xLock({ pid: process.pid });
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`PSB_PRECONDITION: ${msg}`);
    const reportPath = writeReport(outDir, {
      program: "TEST-HARNESS-01",
      slice,
      scenario: args.scenario,
      scenarioStatus: "FAIL",
      exitCode: 2,
      error: msg,
      code:
        msg.startsWith("PSB_") ||
        msg.startsWith("H1_") ||
        msg.startsWith("H2_") ||
        msg.startsWith("H3_") ||
        msg.startsWith("H4_") ||
        msg.startsWith("H5_")
          ? msg.split(":")[0]
          : "PSB_PRECONDITION",
    });
    console.error(`report=${reportPath}`);
    process.exit(2);
  }

  if (lockHeld) await releaseH0xLock({ pid: process.pid });

  const cleanupStatus = result.cleanupResult?.status || "PASS";
  const leftovers = result.cleanupResult?.leftovers || [];
  const exitCode = exitCodeForRun(
    result.scenarioStatus,
    result.cleanupResult || { status: "PASS", leftovers: [] },
  );

  if (leftovers.length > 0) {
    console.error("\nPSB-001 CLEANUP GUARANTEE FAILED — leftovers:");
    for (const L of leftovers) {
      console.error(`  - ${L.id} (${L.kind}): ${L.detail || "?"}`);
    }
  }

  const reportPath = writeReport(outDir, {
    program: "TEST-HARNESS-01",
    slice,
    scenario: args.scenario,
    dryRun: args.dryRun,
    allowProd: args.allowProd,
    scenarioStatus: result.scenarioStatus,
    cleanupStatus,
    exitCode,
    steps: result.steps,
    allowlistSummary: result.allowlistSummary,
    cleanupResult: result.cleanupResult,
    sessionRemaining: result.sessionRemaining,
    meta: result.meta,
    principles: {
      "PSB-001-CleanupGuarantee": "enforced",
      "H0X-PersistLedger": "enforced",
      "H1-001-StableAssertions": slice === "H1" ? "enforced" : "n/a",
      "H2-001-SyncStabilityWindow": slice === "H2" ? "enforced" : "n/a",
      "H3-001-StableAssertions": slice === "H3" ? "enforced" : "n/a",
      "H4-SOFT-METRICS": slice === "H4" ? "warning-only" : "n/a",
      "H4-FORBIDDEN-KEYS": slice === "H4" ? "enforced" : "n/a",
      "H5-FORBIDDEN-KEYS": slice === "H5" ? "enforced" : "n/a",
      "H5-WORK-CATALOG-ONLY": slice === "H5" ? "enforced" : "n/a",
      "DF-PSB-001-NeverTouch": "enforced-via-mutate-guard",
    },
  });

  console.log(`\n--- ${slice} STEPS ---`);
  for (const s of result.steps) {
    console.log(`${s.status.padEnd(7)} ${s.name}: ${s.detail}`);
  }
  console.log(`\nscenarioStatus=${result.scenarioStatus}`);
  console.log(`cleanupStatus=${cleanupStatus}`);
  console.log(`exitCode=${exitCode}`);
  console.log(`report=${reportPath}`);

  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
