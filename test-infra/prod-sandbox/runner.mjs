#!/usr/bin/env node
/**
 * TEST-HARNESS-01 — Production Sandbox Harness runner (H0 + H1 + H2)
 *
 * Usage:
 *   npm run test:prod-sandbox -- --scenario h0-preflight
 *   npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
 *   npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod
 *   npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod --dry-run
 *
 * Exit codes (Design Freeze §6):
 *   0 PASS · 2 Precondition · 3 Scenario FAIL · 4 Cleanup FAIL
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { writeReport, defaultOutDir } from "./report.mjs";
import { exitCodeForRun } from "./cleanup.mjs";
import { runH0Preflight } from "./scenarios/h0-preflight.mjs";
import { runH1Tender } from "./scenarios/h1-tender.mjs";
import { runH2JobsPhotos } from "./scenarios/h2-jobs-photos.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const IMPLEMENTED = new Set([
  "h0-preflight",
  "h0",
  "h1-tender",
  "h1",
  "h2-jobs-photos",
  "h2",
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
  if (out.scenario === "h1") out.scenario = "h1-tender";
  if (out.scenario === "h2") out.scenario = "h2-jobs-photos";
  return out;
}

function printHelp() {
  console.log(`
TEST-HARNESS-01 Production Sandbox Harness

  npm run test:prod-sandbox -- --scenario h0-preflight
  npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
  npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod
  npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod --dry-run

Flags:
  --scenario <id>   h0-preflight | h1-tender | h2-jobs-photos (H3–H5 not implemented)
  --allow-prod      required for H1/H2 prod writes
  --dry-run         side-effect free planning mode

Exit: 0 PASS · 2 Precondition · 3 Scenario FAIL · 4 Cleanup FAIL
`);
}

function sliceFor(scenario) {
  if (scenario.startsWith("h2")) return "H2";
  if (scenario.startsWith("h1")) return "H1";
  return "H0";
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!IMPLEMENTED.has(args.scenario)) {
    console.error(
      `PSB_SCENARIO_NOT_IMPLEMENTED: ${args.scenario} (H3–H5 require Owner GO)`,
    );
    process.exit(2);
  }

  const slice = sliceFor(args.scenario);
  const outDir = defaultOutDir(ROOT, `${args.scenario}-${Date.now().toString(36)}`);
  console.log(`=== TEST-HARNESS-01 / ${slice} ===`);
  console.log(`scenario=${args.scenario} dryRun=${args.dryRun} allowProd=${args.allowProd}`);
  console.log(`outDir=${outDir}`);

  let result;
  try {
    if (args.scenario === "h2-jobs-photos") {
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
        msg.startsWith("PSB_") || msg.startsWith("H1_") || msg.startsWith("H2_")
          ? msg.split(":")[0]
          : "PSB_PRECONDITION",
    });
    console.error(`report=${reportPath}`);
    process.exit(2);
  }

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
      "H1-001-StableAssertions": slice === "H1" ? "enforced" : "n/a",
      "H2-001-SyncStabilityWindow": slice === "H2" ? "enforced" : "n/a",
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
