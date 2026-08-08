/**
 * TENDER-MODERNIZATION-01 / S7 — TRE Hub-first / primary OFF harness.
 * DF: docs/architecture/TENDER-MODERNIZATION-01-S7-DESIGN-FREEZE.md
 *
 * Run: npx vite-node scripts/test-tender-modernization-01-s7-hub-first.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isTre01SliceAEnabled,
  TRE_01_SLICE_A_DEFAULT,
  TRE_01_SLICE_A_LS_KEY,
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
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

console.log("=== TENDER-MODERNIZATION-01 / S7 Hub-first ===\n");

const config = readSrc("src/lib/tenders-v4-config.ts");
const detail = readSrc("src/app/TenderDetailPage.tsx");
const hub = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const host = readSrc("src/app/decision-workspace/DecisionWorkspaceHost.tsx");
const outcome = readSrc("src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx");
const offerHook = readSrc("src/app/hooks/useTenderOfferRun.ts");

// --- AC-S7-1 ---
assert("AC-S7-1 TRE_01_SLICE_A_DEFAULT === false", TRE_01_SLICE_A_DEFAULT === false);
assert(
  "AC-S7-1 config source DEFAULT = false",
  /export const TRE_01_SLICE_A_DEFAULT\s*=\s*false/.test(config),
);
assert("AC-S7-1 LS key KEEP", TRE_01_SLICE_A_LS_KEY === "kw-tre-01-slice-a");

const mem = new Map();
globalThis.localStorage = {
  getItem(key) {
    return mem.has(key) ? mem.get(key) : null;
  },
  setItem(key, value) {
    mem.set(String(key), String(value));
  },
  removeItem(key) {
    mem.delete(String(key));
  },
};
mem.clear();
assert("AC-S7-1 no LS → Hub-first OFF", isTre01SliceAEnabled() === false);
mem.set(TRE_01_SLICE_A_LS_KEY, "1");
assert("AC-S7-1 LS=1 → flag ON (Expert OFF compat)", isTre01SliceAEnabled() === true);
mem.set(TRE_01_SLICE_A_LS_KEY, "0");
assert("AC-S7-1 LS=0 → OFF", isTre01SliceAEnabled() === false);

// --- AC-S7-2 ---
assert(
  "AC-S7-2 showTre01Outcome uses expertEffective",
  detail.includes("expertEffective") && detail.includes("showTre01Outcome"),
);
assert(
  "AC-S7-2 Expert path requires tre01RecoveryOutcome",
  /expertEffective\s*&&\s*tre01RecoveryOutcome/.test(detail) ||
    /\(expertEffective\s*&&\s*tre01RecoveryOutcome\)/.test(detail),
);
assert(
  "AC-S7-2 Expert OFF path uses tre01SliceA",
  /!expertEffective\s*&&\s*tre01SliceA/.test(detail),
);
assert(
  "AC-S7-2 tre01RecoveryOutcome state present",
  detail.includes("tre01RecoveryOutcome") &&
    detail.includes("setTre01RecoveryOutcome"),
);

// --- AC-S7-3 Expert ON never auto Outcome without recovery ---
{
  const showBlock = detail.match(
    /const showTre01Outcome\s*=\s*([\s\S]*?);/,
  );
  assert("AC-S7-3 showTre01Outcome block found", Boolean(showBlock));
  const body = showBlock?.[1] ?? "";
  assert(
    "AC-S7-3 Expert ON requires recovery (not flag alone)",
    body.includes("tre01RecoveryOutcome") &&
      /expertEffective\s*&&\s*tre01RecoveryOutcome/.test(body) &&
      /!expertEffective\s*&&\s*tre01SliceA/.test(body) &&
      !/\(\s*expertEffective\s*&&\s*tre01SliceA\s*\)/.test(body),
  );
  assert(
    "AC-S7-3 hard gate: Expert ON + slice alone insufficient",
    /expertEffective\s*&&\s*tre01RecoveryOutcome/.test(body),
  );
}

// --- AC-S7-4 / AC-S7-5 markers ---
assert(
  "AC-S7-4 data-s7-tre-recovery-cta in DetailPage",
  detail.includes('data-s7-tre-recovery-cta="1"'),
);
assert(
  "AC-S7-4 recovery CTA label PL",
  detail.includes("Rekomendowana cena"),
);
assert(
  "AC-S7-5 data-s7-hub-first on workspace path",
  detail.includes('data-s7-hub-first="1"'),
);
assert(
  "AC-S7-4/5 HubPanel has ZERO recovery CTA",
  !hub.includes("data-s7-tre-recovery-cta") &&
    !hub.includes("tre01RecoveryOutcome"),
);

// --- AC-S7-6 early-return KEEP ---
assert(
  "AC-S7-6 early-return Outcome branch KEEP",
  detail.includes("showTre01Outcome && tre01Recommendation") &&
    detail.includes("TenderRecommendationOutcomeView"),
);
assert(
  "AC-S7-6 loading branch KEEP",
  detail.includes("data-tre-01-outcome-loading"),
);
assert(
  "AC-S7-6 recovery wrapper marker",
  detail.includes('data-s7-tre-recovery="1"'),
);

// --- AC-S7-7 no hard delete ---
assert(
  "AC-S7-7 Outcome file present",
  existsSync(join(root, "src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx")),
);
assert(
  "AC-S7-7 useTenderOfferRun present",
  existsSync(join(root, "src/app/hooks/useTenderOfferRun.ts")),
);
assert(
  "AC-S7-7 Bid domain present",
  existsSync(join(root, "src/lib/tender-bid-quality.ts")) ||
    existsSync(join(root, "src/lib/tender-bid-ux.ts")),
);
assert(
  "AC-S7-7 OfferBoq present",
  existsSync(join(root, "src/lib/tender-offer-boq.ts")),
);
assert(
  "AC-S7-7 S6 Persist-first Host KEEP",
  host.includes("recordDecision") && host.includes("setOwnerDecision"),
);
{
  const recordIdx = host.indexOf("recordDecision({");
  const setIdx = host.indexOf("setOwnerDecision(");
  assert(
    "AC-S7-7 Host Persist-first order KEEP",
    recordIdx >= 0 && setIdx > recordIdx,
  );
}

// --- AC-S7-8 Offer Run enabled wiring; hook body not "rewritten" by S7 markers ---
assert(
  "AC-S7-8 DetailPage enables Offer Run with recovery OR slice",
  /enabled:\s*\(tre01SliceA\s*\|\|\s*tre01RecoveryOutcome\)\s*&&\s*Boolean\(item\)/.test(
    detail,
  ) ||
    /enabled:\s*\([\s\S]*?tre01SliceA[\s\S]*?\|\|[\s\S]*?tre01RecoveryOutcome[\s\S]*?\)\s*&&\s*Boolean\(item\)/.test(
      detail,
    ),
);
assert(
  "AC-S7-8 useTenderOfferRun has ZERO S7 recovery markers",
  !offerHook.includes("tre01RecoveryOutcome") &&
    !offerHook.includes("data-s7-") &&
    !offerHook.includes("S7"),
);

// --- AC-S7-9 S2 demote KEEP ---
assert(
  "AC-S7-9 data-s2-tre-demote-note on Outcome",
  outcome.includes("data-s2-tre-demote-note"),
);

// --- AC-S7-10 meta (counts verified by runner shell) ---
assert("AC-S7-10 harness self-check", pass >= 20);

console.log(`\nTM-01 S7 Hub-first: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
