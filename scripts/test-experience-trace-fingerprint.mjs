/**
 * TENDER_DETAIL_FREEZE P0-B — change-only fingerprint + status coverage.
 * npx vite-node scripts/test-experience-trace-fingerprint.mjs
 */
import {
  checkExperienceRequirement,
  resetExperienceTraceFingerprintForTests,
  traceExperienceCheck,
} from "../src/lib/tender-experience-check.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${label}`);
  } else {
    fail += 1;
    console.error(`FAIL ${label}`);
  }
}

const debugCalls = [];
const origDebug = console.debug;
console.debug = (...args) => {
  if (String(args[0]).includes("[EXPERIENCE TRACE]")) {
    debugCalls.push(args[1]);
  }
};

function countTraces(fn) {
  const before = debugCalls.length;
  fn();
  return debugCalls.length - before;
}

resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;

const matchDetail = {
  requiredProjects: 1,
  requiredValue: null,
  matchingProjects: 2,
  status: "MATCH",
};

assert(countTraces(() => traceExperienceCheck(matchDetail)) === 1, "MATCH → first trace");
assert(countTraces(() => traceExperienceCheck(matchDetail)) === 0, "MATCH → identical fingerprint → no second trace");
assert(
  countTraces(() =>
    traceExperienceCheck({
      ...matchDetail,
      matchingProjects: 3,
    }),
  ) === 1,
  "MATCH → changed fingerprint → new trace",
);

resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;
assert(
  countTraces(() =>
    traceExperienceCheck({
      requiredProjects: 2,
      requiredValue: 500000,
      matchingProjects: 0,
      status: "MISSING",
    }),
  ) === 1,
  "MISSING → first trace",
);
assert(
  countTraces(() =>
    traceExperienceCheck({
      requiredProjects: 2,
      requiredValue: 500000,
      matchingProjects: 0,
      status: "MISSING",
    }),
  ) === 0,
  "MISSING → identical → no second",
);

resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;
assert(
  countTraces(() =>
    traceExperienceCheck({
      requiredProjects: 1,
      requiredValue: null,
      matchingProjects: 0,
      status: "UNKNOWN",
    }),
  ) === 1,
  "UNKNOWN → first trace",
);

resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;
assert(
  countTraces(() =>
    traceExperienceCheck({
      requiredProjects: 1,
      requiredValue: null,
      matchingProjects: 1,
      status: "MATCH",
    }),
  ) === 1,
  "requiredValue = null in fingerprint",
);

const profileMatch = {
  schemaVersion: 4,
  experienceProjects: [
    {
      title: "A",
      category: "roboty podobne",
      valuePln: 100000,
      year: 2024,
      referenceStatus: "unknown",
      referenceAvailable: false,
      referenceFiles: [],
      protocolFiles: [],
    },
    {
      title: "B",
      category: "roboty podobne",
      valuePln: 200000,
      year: 2023,
      referenceStatus: "unknown",
      referenceAvailable: false,
      referenceFiles: [],
      protocolFiles: [],
    },
  ],
  experience: {},
  references: {},
  personnel: {},
  licenses: {},
  insurance: {},
  finance: {},
};

const req = {
  minProjects: 1,
  minValuePln: null,
  category: "roboty podobne",
  referenceRequired: false,
  periodYears: null,
  confidence: 0.9,
  label: "Doświadczenie",
};

resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;
const item1 = checkExperienceRequirement(req, profileMatch);
assert(item1.status === "MATCH", "checkExperienceRequirement status MATCH preserved");
assert(debugCalls.length === 1, "MATCH via check → one trace");
const beforeDup = debugCalls.length;
checkExperienceRequirement(req, profileMatch);
assert(debugCalls.length === beforeDup, "identical MATCH via check → no second trace");

const profileEmpty = {
  schemaVersion: 4,
  experienceProjects: [],
  experience: {},
  references: {},
  personnel: {},
  licenses: {},
  insurance: {},
  finance: {},
};
resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;
const unk = checkExperienceRequirement(req, profileEmpty);
assert(unk.status === "UNKNOWN", "status UNKNOWN preserved");

const profileGap = {
  ...profileMatch,
  experienceProjects: [profileMatch.experienceProjects[0]],
};
resetExperienceTraceFingerprintForTests();
debugCalls.length = 0;
const miss = checkExperienceRequirement(
  { ...req, minProjects: 2, minValuePln: 1_000_000 },
  profileGap,
);
assert(miss.status === "MISSING", "status MISSING preserved");

console.debug = origDebug;

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
