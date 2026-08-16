/**
 * IK-MIGRATION-01 P10 — NG-10 DECOMMISSION → IK FIRST-SCREEN
 * Run: npx vite-node scripts/test-ik-migration-01-p10-implementation.mjs
 *
 * Gate A includes A10: Expert OFF + sliceA + IK → Recovery CTA
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultAppSettings,
  mergeExpertAiDecydentEnabled,
  mergeIkEntryEnabled,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  resolveTre01ShowOutcome,
  resolveTre01ShowRecoveryCta,
} from "../src/lib/tenders-v4-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

forceIkEntryEnabledForTests(null);

const detailSrc = readSrc("src/app/TenderDetailPage.tsx");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const v4Src = readSrc("src/lib/tenders-v4-config.ts");
const defaults = defaultAppSettings();

// --- A: IK first-screen / NG-10 absent ---
assert("A1 no TenderAutonomousGate import", !/TenderAutonomousGate/.test(detailSrc));
assert("A1b no Gate JSX", !/<TenderAutonomousGate[\s>]/.test(detailSrc));
assert("A2 no ng10_gate runtime in DetailPage", !/\bng10_gate\b/.test(detailSrc));
assert("A3 resolve always ik_entry", resolveIkDetailFirstScreen(false) === "ik_entry");
assert("A3b resolve true ik_entry", resolveIkDetailFirstScreen(true) === "ik_entry");
assert("A4 type has no ng10_gate", !/\bng10_gate\b/.test(flagSrc));
assert("A5 IkEntryHost mount retained", /IkEntryHost/.test(detailSrc));
assert("A6 return detailWorkspace", /return detailWorkspace/.test(detailSrc));
assert("A7 default ikEntryEnabled true", defaults.ikEntryEnabled === true);
assert(
  "A8 D default unchanged false",
  defaults.expertAiDecydentEnabled === false,
);

const dBefore = mergeExpertAiDecydentEnabled(null, defaults);
const dAfter = mergeExpertAiDecydentEnabled(
  { expertAiDecydentEnabled: false },
  { ...defaults, ikEntryEnabled: true },
);
assert("A9 D diff = 0 (merge)", dBefore === false && dAfter === false);

// --- A10: Expert OFF + sliceA → Recovery CTA ---
const a10ShowOutcome = resolveTre01ShowOutcome({
  hasItem: true,
  activeTabPrzetarg: true,
  forceWorkspace: false,
  recoveryOutcome: false,
});
const a10Cta = resolveTre01ShowRecoveryCta({
  expertEffective: false,
  tre01SliceA: true,
  hasItem: true,
  activeTabPrzetarg: true,
  showOutcome: a10ShowOutcome,
});
assert("A10 Expert OFF + sliceA → CTA visible", a10Cta === true && a10ShowOutcome === false);
assert(
  "A10 DetailPage uses resolveTre01ShowRecoveryCta",
  /resolveTre01ShowRecoveryCta/.test(detailSrc),
);
assert(
  "A10 marker data-s7-tre-recovery-cta retained",
  /data-s7-tre-recovery-cta/.test(detailSrc),
);

// Auto Outcome-first must not fire without recovery
assert(
  "A11 no auto Outcome on sliceA alone",
  resolveTre01ShowOutcome({
    hasItem: true,
    activeTabPrzetarg: true,
    forceWorkspace: false,
    recoveryOutcome: false,
  }) === false,
);

// After CTA (recovery)
assert(
  "A12 recovery → show Outcome",
  resolveTre01ShowOutcome({
    hasItem: true,
    activeTabPrzetarg: true,
    forceWorkspace: false,
    recoveryOutcome: true,
  }) === true,
);
assert(
  "A12b recovery → CTA hidden",
  resolveTre01ShowRecoveryCta({
    expertEffective: false,
    tre01SliceA: true,
    hasItem: true,
    activeTabPrzetarg: true,
    showOutcome: true,
  }) === false,
);

// Expert ON CTA without sliceA
assert(
  "A13 Expert ON CTA without sliceA",
  resolveTre01ShowRecoveryCta({
    expertEffective: true,
    tre01SliceA: false,
    hasItem: true,
    activeTabPrzetarg: true,
    showOutcome: false,
  }) === true,
);

// Expert OFF without sliceA → no CTA
assert(
  "A14 Expert OFF without sliceA → no CTA",
  resolveTre01ShowRecoveryCta({
    expertEffective: false,
    tre01SliceA: false,
    hasItem: true,
    activeTabPrzetarg: true,
    showOutcome: false,
  }) === false,
);

// --- B: NG-10 files removed ---
const removed = [
  "src/app/tenders/autonomous/TenderAutonomousGate.tsx",
  "src/app/tenders/autonomous/TenderAutonomousRunScreen.tsx",
  "src/app/tenders/autonomous/TenderAutonomousOutcomeScreen.tsx",
  "src/app/tenders/autonomous/TenderAutonomousRunFaq.tsx",
  "src/lib/tender-autonomous-run-phase.ts",
  "src/lib/tender-autonomous-run-timeline.ts",
  "src/lib/tender-autonomous-run-status.ts",
  "src/lib/tender-autonomous-run-transition.ts",
  "src/lib/tender-autonomous-run-gate-exit.ts",
  "src/lib/tender-autonomous-run-fingerprint.ts",
  "src/lib/tender-autonomous-run-ux.ts",
  "src/lib/tender-autonomous-run-outcome.ts",
  "scripts/test-tender-autonomous-run-phase.mjs",
  "scripts/test-tender-autonomous-run-timeline.mjs",
  "scripts/test-tender-autonomous-run-status.mjs",
  "scripts/test-tender-autonomous-run-gate-exit.mjs",
  "scripts/test-tender-autonomous-run-transition-timeout.mjs",
];
assert(
  "B NG-10 REMOVE set absent",
  removed.every((rel) => !existsSync(join(root, rel))),
);

// --- C: early-return user-initiated only ---
assert(
  "C early-return without ng10_gate",
  /if \(showTre01Outcome && tre01Recommendation\)/.test(detailSrc) &&
    !/ikFirstScreen === "ng10_gate"/.test(detailSrc),
);
assert("C helpers in tenders-v4-config", /resolveTre01ShowOutcome/.test(v4Src));

// --- D: IK ≠ D / no ikP10 ---
assert("D no ikP10 lever in settings", !/ikP10/.test(settingsSrc));
assert("D no ikP10 in DetailPage", !/ikP10/.test(detailSrc));
assert(
  "D mergeIkEntry does not touch Decydent field",
  mergeIkEntryEnabled(null, defaults) === true &&
    defaults.expertAiDecydentEnabled === false,
);

// --- E: CatalogWork lock (docs + no Accept path in P10 touch) ---
assert(
  "E CatalogWork 471 in P10 DF",
  /CatalogWork[\s\S]*471|471[\s\S]*CatalogWork/.test(
    readSrc("docs/architecture/IK-MIGRATION-01-P10-DESIGN-FREEZE.md"),
  ),
);

console.log(`\nP10: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
