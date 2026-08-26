/**
 * IK-KNR-WC-P4-MAPPING-TRUST-SEAM — focused offline tests.
 *
 * npx vite-node scripts/test-ik-knr-wc-p4-trust-seam.mjs
 *
 * ZERO F5 engine / TRUSTED_MATCH / Slice D rule / catalogBasis→knrHint changes.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyOwnerKnrMapping,
} from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import {
  KNR_WC_IDENTITY_BRIDGE_P4_TRUST_SEAM_ENABLED,
  forceKnrWcIdentityBridgeP4TrustSeamForTests,
  isKnrWcIdentityBridgeP4TrustSeamEnabled,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import {
  promoteSliceDHitToTrustedTuple,
  P4_TRUST_MATCH_CONFIDENCE,
  P4_TRUST_MATCH_METHOD,
} from "../src/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam.ts";
import {
  hasCompleteTrustedIdentityTuple,
  preserveOfferBoqLineIfTrusted,
} from "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

const KEY = "KNR|4-01|9999-99";
const WORK_ID = "work-legal";

function catalogBasis(over = {}) {
  return {
    family: "KNR",
    catalogId: "4-01",
    tableCode: "9999-99",
    rawCode: "KNR 4-01 9999-99",
    display: "KNR 4-01 9999-99",
    normalizedKey: KEY,
    ...over,
  };
}

function makeExpert(lineSpecs) {
  const refs = lineSpecs.map((s) => ({
    dwellingId: s.dwellingId ?? "d1",
    line: {
      lineId: s.lineId,
      lp: s.lp ?? "1",
      description: s.description ?? "Roboty wykończeniowe malowanie ścian",
      quantity: 1,
      quantityRaw: "1",
      unit: s.unit ?? "m2",
      catalogWorkId: s.catalogWorkId ?? null,
      knrHint: Object.prototype.hasOwnProperty.call(s, "knrHint") ? s.knrHint : null,
      catalogBasis: s.catalogBasis ?? catalogBasis(s.basisOver ?? {}),
      workCategory: null,
      categoryId: null,
      matchMethod: s.matchMethod ?? "snapshot",
      matchedBy: s.matchedBy ?? "snapshot",
      matchConfidence: s.matchConfidence ?? "low",
      candidateMatches: s.candidateMatches ?? [],
      isNoise: false,
      noiseKind: null,
    },
    provenance: s.provenance ?? { catalogBasis: s.basis ?? catalogBasis(s.basisOver ?? {}) },
  }));
  return {
    tenderId: "t-p4",
    masterBoq: { readyForExperts: true, lineCount: refs.length },
    masterBoqLines: refs,
    reasons: [],
  };
}

function makeKnr(lines, over = {}) {
  return {
    tenderId: "t-p4",
    status: "COMPLETED",
    inputLineCount: lines.length,
    outputLineCount: lines.length,
    counts: {
      withBasis: 0,
      withoutBasis: 0,
      recognized: 0,
      candidate: 0,
      hold: 0,
      conflict: 0,
      none: 0,
      resolved: 0,
    },
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    lines,
    examplesHold: [],
    reasons: [],
    ...over,
  };
}

function knrLine(over = {}) {
  return {
    lineId: "L1",
    dwellingId: "d1",
    lp: "1",
    catalogBasis: catalogBasis(),
    lineStatus: "CANDIDATE",
    proposedWorkId: null,
    ...over,
  };
}

function makeWork(over = {}) {
  return { id: WORK_ID, unit: "m2", active: true, ...over };
}

function makeRow(over = {}) {
  return {
    mappingId: "own-1",
    normalizedKey: KEY,
    workId: WORK_ID,
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
    ...over,
  };
}

function sliceDHit(opts = {}) {
  return applyOwnerKnrMapping({
    documentExpert: opts.expert ?? makeExpert([{ lineId: "L1" }]),
    knr: opts.knr ?? makeKnr([knrLine()]),
    works: opts.works ?? [makeWork()],
    table: opts.table ?? [makeRow()],
  });
}

forceKnrWcIdentityBridgeP4TrustSeamForTests(null);

const seamSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam.ts");
const engineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
const featureSrc = readSrc("src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts");
const shadowSrc = readSrc("src/lib/tender-position-cost/boq-shadow-adapter.ts");
const mappingSrc = readSrc("src/lib/intelligent-estimator/ik-knr-owner-mapping.ts");
const engineTs = readSrc("src/lib/tender-position-cost/engine.ts");

// --- Flag default (Owner Enable GO) ---
assert(
  "P4 flag default ON (Owner Enable GO)",
  KNR_WC_IDENTITY_BRIDGE_P4_TRUST_SEAM_ENABLED === true
    && isKnrWcIdentityBridgeP4TrustSeamEnabled() === true,
);
assert(
  "engine wires promote after applyOwnerKnrMapping",
  /applyOwnerKnrMapping[\s\S]*promoteSliceDHitToTrustedTuple[\s\S]*runIkIdentityPhase/.test(engineSrc),
);
assert(
  "engine uses sliceDTrusted.expert for Identity Phase",
  /sliceDExpert:\s*sliceDTrusted\.expert/.test(engineSrc),
);

// T-P4-1 HIT → trusted tuple
{
  const sliceD = sliceDHit();
  assert("T-P4-1 Slice D HIT precond", sliceD.catalogWorkIdWritten === 1 && sliceD.appliedLineIds.includes("L1"));
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  const line = promoted.expert.masterBoqLines[0].line;
  assert("T-P4-1 catalogWorkId", line.catalogWorkId === WORK_ID);
  assert("T-P4-1 matchMethod exact_knr", line.matchMethod === "exact_knr" && line.matchMethod === P4_TRUST_MATCH_METHOD);
  assert("T-P4-1 confidence non-low", line.matchConfidence !== "low" && line.matchConfidence === P4_TRUST_MATCH_CONFIDENCE);
  assert("T-P4-1 promotedCount", promoted.promotedCount === 1 && promoted.promotedLineIds.includes("L1"));
}

// T-P4-2 feature OFF (explicit override) still fail-closed
{
  const sliceD = sliceDHit();
  const beforeMethod = sliceD.expert.masterBoqLines[0].line.matchMethod;
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: false });
  const line = promoted.expert.masterBoqLines[0].line;
  assert("T-P4-2 no promotion count", promoted.promotedCount === 0);
  assert("T-P4-2 matchMethod unchanged", line.matchMethod === beforeMethod);
  assert("T-P4-2 catalogWorkId still from Slice D", line.catalogWorkId === WORK_ID);
  forceKnrWcIdentityBridgeP4TrustSeamForTests(null);
  const viaDefault = promoteSliceDHitToTrustedTuple({ sliceD: sliceDHit() });
  assert(
    "T-P4-2 default flag ON promotes HIT",
    viaDefault.promotedCount === 1
      && viaDefault.expert.masterBoqLines[0].line.matchMethod === "exact_knr",
  );
}

// T-P4-3 unknown KNR
{
  const sliceD = sliceDHit({
    table: [makeRow({ normalizedKey: "KNR|4-01|0000-00" })],
  });
  assert("T-P4-3 Slice D no HIT", sliceD.catalogWorkIdWritten === 0);
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  assert("T-P4-3 no promotion", promoted.promotedCount === 0);
  assert(
    "T-P4-3 no exact_knr",
    promoted.expert.masterBoqLines.every((r) => r.line.matchMethod !== "exact_knr"),
  );
}

// T-P4-4 ambiguous mapping
{
  const sliceD = sliceDHit({
    table: [
      makeRow({ mappingId: "a", workId: WORK_ID }),
      makeRow({ mappingId: "b", workId: "work-other" }),
    ],
    works: [makeWork(), makeWork({ id: "work-other" })],
  });
  assert("T-P4-4 Slice D ambiguous fail-closed", sliceD.catalogWorkIdWritten === 0);
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  assert("T-P4-4 no promotion", promoted.promotedCount === 0);
}

// T-P4-5 inactive mapping
{
  const sliceD = sliceDHit({ table: [makeRow({ active: false })] });
  assert("T-P4-5 Slice D inactive fail-closed", sliceD.catalogWorkIdWritten === 0);
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  assert("T-P4-5 no promotion", promoted.promotedCount === 0);
}

// T-P4-6 inactive Work Catalog
{
  const sliceD = sliceDHit({ works: [makeWork({ active: false })] });
  assert("T-P4-6 Slice D inactive work fail-closed", sliceD.catalogWorkIdWritten === 0);
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  assert("T-P4-6 no promotion", promoted.promotedCount === 0);
}

// T-P4-7 unit incompatibility
{
  const sliceD = sliceDHit({
    expert: makeExpert([{ lineId: "L1", unit: "m3" }]),
    table: [makeRow({ catalogUnit: "m2" })],
    works: [makeWork({ unit: "m2" })],
  });
  assert("T-P4-7 Slice D unit fail-closed", sliceD.catalogWorkIdWritten === 0);
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  assert("T-P4-7 no promotion", promoted.promotedCount === 0);
}

// T-P4-8 preserve accepts
{
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD: sliceDHit(), enabled: true });
  const line = promoted.expert.masterBoqLines[0].line;
  assert("T-P4-8 hasCompleteTrusted", hasCompleteTrustedIdentityTuple(line) === true);
  const preserved = preserveOfferBoqLineIfTrusted(line);
  assert("T-P4-8 preserve non-null", preserved != null);
  assert("T-P4-8 preserve workId", preserved.catalogWorkId === WORK_ID && preserved.matchMethod === "exact_knr");
  const mapped = mapOfferBoqLine(line, { works: [], mappedAt: new Date().toISOString() });
  assert("T-P4-8 mapper preserves trusted", mapped.catalogWorkId === WORK_ID && mapped.matchMethod === "exact_knr");
}

// T-P4-9 F5 shadow trusted
{
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD: sliceDHit(), enabled: true });
  const line = promoted.expert.masterBoqLines[0].line;
  const identity = resolveWorkIdentityFromOfferBoqLine(line);
  assert(
    "T-P4-9 F5 identity OK",
    identity.status === "OK" && identity.workId === WORK_ID,
    JSON.stringify({ status: identity.status, workId: identity.workId, gaps: identity.gaps }),
  );
  assert("T-P4-9 method exact_knr", identity.matchMethod === "exact_knr");
}

// T-P4-10 catalogBasis ≠ knrHint isolation
{
  const expert = makeExpert([{
    lineId: "L1",
    knrHint: null,
    catalogBasis: catalogBasis({ normalizedKey: KEY }),
  }]);
  const knrHintBefore = expert.masterBoqLines[0].line.knrHint;
  const basisBefore = JSON.stringify(expert.masterBoqLines[0].line.catalogBasis);
  const promoted = promoteSliceDHitToTrustedTuple({
    sliceD: sliceDHit({ expert }),
    enabled: true,
  });
  const line = promoted.expert.masterBoqLines[0].line;
  assert("T-P4-10 knrHint still null", line.knrHint === knrHintBefore && line.knrHint == null);
  assert("T-P4-10 catalogBasis unchanged", JSON.stringify(line.catalogBasis) === basisBefore);
  assert(
    "T-P4-10 seam source no hydrate assign",
    !/knrHint\s*[:=]\s*[^;\n]*catalogBasis/.test(seamSrc)
      && !/knrHintFromCatalogBasis|hydrateKnrHint/.test(seamSrc),
  );
  assert("T-P4-10 seam never assigns knrHint from basis", !/knrHint:\s*[^,\n]*catalogBasis/.test(seamSrc));
}

// T-P4-11 no Owner mapping → no exact_knr even with keyword-y description
{
  const expert = makeExpert([{
    lineId: "L1",
    description: "Usuwanie wykwitów i zacieków KNR-W 4-01 1202-07 tynki",
    knrHint: null,
  }]);
  const sliceD = sliceDHit({ expert, table: [] });
  assert("T-P4-11 no Slice D HIT", sliceD.catalogWorkIdWritten === 0);
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD, enabled: true });
  assert("T-P4-11 no P4 exact_knr", promoted.promotedCount === 0);
  assert(
    "T-P4-11 matchMethod not exact_knr",
    promoted.expert.masterBoqLines[0].line.matchMethod !== "exact_knr",
  );
}

// T-P4-12 manual override unchanged
{
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD: sliceDHit(), enabled: true });
  const phase = runIkIdentityPhase({
    structuralReport: promoted.expert,
    sliceDExpert: promoted.expert,
    item: { id: "t-p4", tenderId: "t-p4", title: "P4" },
    package: null,
    works: [{ id: WORK_ID, unit: "m2", active: true, namePl: "Legal", region: "PL", aliases: [], keywords: [] }],
    manualOverrides: [
      {
        dwellingId: "d1",
        lineId: "L1",
        catalogWorkId: "manual-work",
        matchMethod: "manual",
        matchConfidence: "high",
      },
    ],
    nowMs: Date.now(),
  });
  const out = phase.postIdentityExpert.masterBoqLines[0].line;
  assert("T-P4-12 manual wins", out.matchMethod === "manual" && out.catalogWorkId === "manual-work");
}

// Missing catalogWorkId on applied id → fail-closed (defensive)
{
  const fakeSliceD = {
    expert: makeExpert([{ lineId: "L1", catalogWorkId: null }]),
    appliedLineIds: ["L1"],
    catalogWorkIdWritten: 1,
  };
  const promoted = promoteSliceDHitToTrustedTuple({ sliceD: fakeSliceD, enabled: true });
  assert("defensive missing catalogWorkId → 0 promote", promoted.promotedCount === 0);
}

// Forbidden surfaces unchanged
assert("Slice D mapping src no P4 promote", !/promoteSliceDHitToTrustedTuple/.test(mappingSrc));
assert(
  "TRUSTED_MATCH set unchanged in shadow",
  /const TRUSTED_MATCH[\s\S]*?exact_knr[\s\S]*?catalog_map[\s\S]*?alias[\s\S]*?manual/.test(shadowSrc)
    && !/promoteSliceDHitToTrustedTuple/.test(shadowSrc),
);
assert("F5 engine.ts untouched by P4 import", !/promoteSliceDHitToTrustedTuple|p4-trust-seam/.test(engineTs));
assert(
  "feature P4 const true (Owner Enable GO)",
  /KNR_WC_IDENTITY_BRIDGE_P4_TRUST_SEAM_ENABLED\s*=\s*true/.test(featureSrc),
);
assert(
  "P4 force independent of bulk bridge force",
  /Does NOT enable\/disable P4 trust seam/.test(featureSrc)
    && /forceKnrWcIdentityBridgeP4TrustSeamForTests/.test(featureSrc),
);

forceKnrWcIdentityBridgeP4TrustSeamForTests(null);

console.log(`\nP4 trust seam: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
