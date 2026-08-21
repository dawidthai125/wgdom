/**
 * EC reveal — structural vs content signature (Historical late-index observability).
 * T01–T12 · DF / ARCH REVIEW contract.
 *
 * npx vite-node scripts/test-expert-conversation-reveal-historical-ec.mjs
 *
 * ZERO Host wiring · ZERO lookup · ZERO KNR gate changes.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildExpertConversationStructuralSignature,
  buildExpertConversationContentSignature,
} from "../src/app/expert-conversation/ExpertConversationSurface.tsx";
import { buildIkKnrConversation } from "../src/lib/intelligent-estimator/ik-knr-conversation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(id, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`PASS ${id}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail += 1;
    console.error(`FAIL ${id}${detail ? ` — ${detail}` : ""}`);
  }
}

function step(partial) {
  return {
    id: partial.id ?? "knr",
    status: partial.status ?? "done",
    messageWeight: partial.messageWeight ?? 10,
    messagePl: partial.messagePl ?? "",
  };
}

function knrReport(countsOver = {}) {
  const counts = {
    withBasis: 88,
    withoutBasis: 0,
    recognized: 88,
    candidate: 0,
    hold: 88,
    conflict: 0,
    none: 0,
    resolved: 0,
    historicalExactRms: 0,
    historicalExact: 0,
    historicalFamily: 0,
    historicalConflict: 0,
    historicalMiss: 88,
    ...countsOver,
  };
  return {
    tenderId: "t1",
    status: "COMPLETED",
    inputLineCount: 88,
    outputLineCount: 88,
    counts,
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    historicalAuthority: false,
    lines: [],
    examplesHold: [],
    reasons: [],
  };
}

/** Pure reveal-state model mirroring Surface contract (structural restart vs content preserve). */
function applyVmChange(state, prevStructural, nextStructural, nextStepCount, opts = {}) {
  const structuralChanged = prevStructural !== nextStructural;
  if (!structuralChanged) {
    // CONTENT ONLY — preserve skipped / revealedCount (clamp)
    let revealedCount = state.revealedCount;
    if (state.skipped || revealedCount >= state.stepCount) {
      revealedCount = nextStepCount;
    } else {
      revealedCount = Math.min(revealedCount, nextStepCount);
    }
    return {
      skipped: state.skipped,
      revealedCount,
      stepCount: nextStepCount,
      restarted: false,
    };
  }
  // STRUCTURAL — restart (unless reduced motion simulated)
  if (opts.reducedMotion) {
    return {
      skipped: true,
      revealedCount: nextStepCount,
      stepCount: nextStepCount,
      restarted: true,
    };
  }
  return {
    skipped: false,
    revealedCount: nextStepCount === 0 ? 0 : 1,
    stepCount: nextStepCount,
    restarted: true,
  };
}

const surfaceSrc = readFileSync(
  join(root, "src/app/expert-conversation/ExpertConversationSurface.tsx"),
  "utf8",
);

// --- Static ARCH contract ---
assert(
  "ARCH-deps-no-steps",
  /}, \[structuralSignature, vm\.visible, clearTimers\]\);/.test(surfaceSrc)
  && !/}, \[structuralSignature, vm\.visible, stepCount, steps, clearTimers\]\);/.test(surfaceSrc),
  "reveal effect deps = structuralSignature, vm.visible, clearTimers only",
);
assert(
  "ARCH-no-steps-in-effect-deps-comment",
  /do NOT add `steps`/.test(surfaceSrc),
);
assert(
  "ARCH-structural-builder",
  /export function buildExpertConversationStructuralSignature/.test(surfaceSrc),
);
assert(
  "ARCH-content-builder",
  /export function buildExpertConversationContentSignature/.test(surfaceSrc),
);
assert(
  "BAN-no-lookup-import",
  !/lookupHistoricalExecuted|useHistoricalExecutedHostIndex|runIkKnrExpert/.test(surfaceSrc),
);

// --- Signature separation ---
const baseSteps = [
  step({ id: "documents", status: "done", messageWeight: 20 }),
  step({ id: "knr_lead", status: "done", messageWeight: 15 }),
  step({ id: "knr", status: "done", messageWeight: 40, messagePl: "Przejrzałem 88." }),
];
const lateHistSteps = [
  step({ id: "documents", status: "done", messageWeight: 20 }),
  step({ id: "knr_lead", status: "done", messageWeight: 15 }),
  step({
    id: "knr",
    status: "done",
    messageWeight: 220,
    messagePl:
      "Przejrzałem 88 pozycji. Historyczne wykonania WGDOM: 3 exact occurrences. Historyczna rodzina KNR występuje dla 48 pozycji.",
  }),
];

const s0 = buildExpertConversationStructuralSignature("ready", "case1", baseSteps);
const s1 = buildExpertConversationStructuralSignature("ready", "case1", lateHistSteps);
const c0 = buildExpertConversationContentSignature(baseSteps);
const c1 = buildExpertConversationContentSignature(lateHistSteps);

assert("SIG-structural-stable-on-late-hist", s0 === s1, `${s0} vs ${s1}`);
assert("SIG-content-changes-on-late-hist", c0 !== c1);

const sStructChange = buildExpertConversationStructuralSignature("ready", "case1", [
  ...baseSteps,
  step({ id: "classification", status: "done", messageWeight: 10 }),
]);
assert("SIG-structural-changes-on-new-step", s0 !== sStructChange);

// --- T01 index before render (message already rich) ---
{
  const structural = buildExpertConversationStructuralSignature("ready", "case1", lateHistSteps);
  const state = applyVmChange(
    { skipped: false, revealedCount: 0, stepCount: 0 },
    "",
    structural,
    lateHistSteps.length,
  );
  assert("T01-starts-progressive", state.restarted === true && state.revealedCount === 1);
  const full = { ...state, skipped: true, revealedCount: lateHistSteps.length };
  assert("T01-skip-shows-all", full.revealedCount === 3 && full.skipped === true);
  assert(
    "T01-copy-present-in-message",
    /Historyczne wykonania WGDOM/.test(lateHistSteps[2].messagePl),
  );
}

// --- T02 null index (MISS copy legal) ---
{
  const missConv = buildIkKnrConversation(knrReport({ historicalMiss: 88 }));
  const knrMsg = missConv.steps.find((s) => s.id === "knr")?.messagePl ?? "";
  assert("T02-miss-copy", /Nie znaleziono historycznych odpowiedników WGDOM/.test(knrMsg));
  assert("T02-authority-false", knrReport().historicalAuthority === false);
}

// --- T03 late index during reveal ---
{
  const structural = buildExpertConversationStructuralSignature("ready", "case1", baseSteps);
  let state = applyVmChange(
    { skipped: false, revealedCount: 0, stepCount: 0 },
    "",
    structural,
    baseSteps.length,
  );
  state = { ...state, revealedCount: 2 }; // mid-reveal
  const afterLate = applyVmChange(state, structural, s1, lateHistSteps.length);
  assert("T03-no-restart", afterLate.restarted === false);
  assert("T03-revealedCount-preserved", afterLate.revealedCount === 2);
  assert("T03-skipped-preserved", afterLate.skipped === false);
}

// --- T04 late index after full reveal / Skip ---
{
  const structural = buildExpertConversationStructuralSignature("ready", "case1", baseSteps);
  const state = {
    skipped: true,
    revealedCount: baseSteps.length,
    stepCount: baseSteps.length,
  };
  const afterLate = applyVmChange(state, structural, s1, lateHistSteps.length);
  assert("T04-no-restart", afterLate.restarted === false);
  assert("T04-skipped-stays-true", afterLate.skipped === true);
  assert("T04-revealed-full", afterLate.revealedCount === lateHistSteps.length);
}

// --- T05 fingerprint change, structural stable ---
{
  const structural = s0;
  const state = { skipped: true, revealedCount: 3, stepCount: 3 };
  const afterFp = applyVmChange(state, structural, s1, 3);
  assert("T05-content-only", afterFp.restarted === false && afterFp.skipped === true);
}

// --- T06 identical ---
{
  const state = { skipped: true, revealedCount: 3, stepCount: 3 };
  const after = applyVmChange(state, s0, s0, 3);
  assert("T06-no-restart", after.restarted === false);
  assert("T06-state-same", after.skipped === true && after.revealedCount === 3);
}

// --- T07–T10 conversation copy classes ---
{
  const exact = buildIkKnrConversation(
    knrReport({ historicalExact: 3, historicalMiss: 31, historicalFamily: 0, historicalConflict: 0 }),
  );
  const exactMsg = exact.steps.find((s) => s.id === "knr")?.messagePl ?? "";
  assert("T07-EXACT", /Historyczne wykonania WGDOM:\s*3\s*exact/i.test(exactMsg));

  const family = buildIkKnrConversation(
    knrReport({
      historicalExact: 0,
      historicalFamily: 48,
      historicalMiss: 31,
      historicalConflict: 0,
    }),
  );
  const familyMsg = family.steps.find((s) => s.id === "knr")?.messagePl ?? "";
  assert("T08-FAMILY", /Historyczna rodzina KNR występuje dla\s*48/i.test(familyMsg));

  const conflict = buildIkKnrConversation(
    knrReport({
      historicalExact: 3,
      historicalFamily: 48,
      historicalConflict: 6,
      historicalMiss: 31,
    }),
  );
  const conflictMsg = conflict.steps.find((s) => s.id === "knr")?.messagePl ?? "";
  assert("T09-CONFLICT", /konflikt wariantów na\s*6/i.test(conflictMsg));

  const miss = buildIkKnrConversation(
    knrReport({
      historicalExact: 0,
      historicalFamily: 0,
      historicalConflict: 0,
      historicalMiss: 88,
    }),
  );
  const missMsg = miss.steps.find((s) => s.id === "knr")?.messagePl ?? "";
  assert("T10-MISS", /Nie znaleziono historycznych odpowiedników WGDOM\s*\(88/i.test(missMsg));
}

// --- T11 no duplicate section (single knr step message) ---
{
  const rich = buildIkKnrConversation(
    knrReport({
      historicalExact: 3,
      historicalFamily: 48,
      historicalConflict: 6,
      historicalMiss: 31,
    }),
  );
  const knrSteps = rich.steps.filter((s) => s.id === "knr");
  assert("T11-single-knr-report-step", knrSteps.length === 1);
  const msg = knrSteps[0]?.messagePl ?? "";
  const exactHits = (msg.match(/Historyczne wykonania WGDOM/g) || []).length;
  assert("T11-no-duplicate-exact-phrase", exactHits === 1);
}

// --- T12 combined: late index does not reset skip/revealed ---
{
  const structural = buildExpertConversationStructuralSignature("ready", "case1", baseSteps);
  const afterSkip = {
    skipped: true,
    revealedCount: 3,
    stepCount: 3,
  };
  const afterLate = applyVmChange(afterSkip, structural, s1, 3);
  assert("T12-no-reset-skipped", afterLate.skipped === true);
  assert("T12-no-reset-revealedCount", afterLate.revealedCount === 3);
  assert("T12-no-restart-flag", afterLate.restarted === false);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
