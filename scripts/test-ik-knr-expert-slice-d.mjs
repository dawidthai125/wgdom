/**
 * IK-KNR-EXPERT Slice D — Owner-confirmed KNR → CatalogWork overlay.
 *
 * npx vite-node scripts/test-ik-knr-expert-slice-d.mjs
 *
 * ZERO mapper / A1-call from D / Research / KV / settings / flags.
 * ZERO Hub / C3 chrome / C2 copy edits.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyOwnerKnrMapping,
  OWNER_KNR_MAPPINGS,
} from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

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
      description: s.description ?? "desc",
      quantity: 1,
      quantityRaw: "1",
      unit: s.unit ?? "m2",
      catalogWorkId: s.catalogWorkId ?? null,
      knrHint: Object.prototype.hasOwnProperty.call(s, "knrHint") ? s.knrHint : "KNR 4-01",
      workCategory: null,
      categoryId: null,
    },
    provenance: s.provenance ?? { catalogBasis: s.basis ?? catalogBasis() },
  }));
  return {
    tenderId: "t-d",
    masterBoq: { readyForExperts: true, lineCount: refs.length },
    masterBoqLines: refs,
    reasons: [],
  };
}

function makeKnr(lines, over = {}) {
  return {
    tenderId: "t-d",
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
  return { id: "work-legal", unit: "m2", active: true, ...over };
}

function makeRow(over = {}) {
  return {
    mappingId: "own-1",
    normalizedKey: KEY,
    workId: "work-legal",
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
    ...over,
  };
}

function snapshot(expert) {
  return JSON.stringify(expert);
}

function apply(opts) {
  return applyOwnerKnrMapping(opts);
}

function zeroWrite(result, expertSnap, expert) {
  return (
    result.catalogWorkIdWritten === 0
    && result.appliedLineIds.length === 0
    && snapshot(expert) === expertSnap
    && result.expert.masterBoqLines.every((ref) => ref.line.catalogWorkId == null)
  );
}

const mappingSrc = readSrc("src/lib/intelligent-estimator/ik-knr-owner-mapping.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const chromeSrc = readSrc("src/lib/intelligent-estimator/IkExpertRoomChrome.tsx");
const c2Src = readSrc("src/lib/intelligent-estimator/ik-knr-conversation.ts");
const hubSrc = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const bSrc = readSrc("src/lib/intelligent-estimator/ik-knr-expert.ts");
const gateSrc = readSrc("src/lib/intelligent-estimator/classification-gate.ts");
const ownerClassSrc = readSrc("src/lib/intelligent-estimator/owner-classification-map.ts");
const mapperSrcName = "src/lib/tender-offer-boq-mapping.ts";

const candidateExpert = makeExpert([{ lineId: "L1" }]);
const candidateSnap = snapshot(candidateExpert);
const candidateKnr = makeKnr([knrLine()]);

// T-D-1 brak Owner row
{
  const result = apply({
    documentExpert: candidateExpert,
    knr: candidateKnr,
    works: [makeWork()],
    table: [],
  });
  assert("T-D-1 brak Owner row → 0 mutation", zeroWrite(result, candidateSnap, candidateExpert));
  assert("T-D-1 input unchanged", snapshot(candidateExpert) === candidateSnap);
}

// T-D-2 CANDIDATE bez HIT (other key)
{
  const result = apply({
    documentExpert: candidateExpert,
    knr: candidateKnr,
    works: [makeWork()],
    table: [makeRow({ normalizedKey: "KNR|4-01|0000-00" })],
  });
  assert("T-D-2 CANDIDATE bez HIT → 0 mutation", zeroWrite(result, candidateSnap, candidateExpert));
}

// T-D-3 HOLD
{
  const expert = makeExpert([{ lineId: "L1" }]);
  const snap = snapshot(expert);
  const result = apply({
    documentExpert: expert,
    knr: makeKnr([knrLine({ lineStatus: "HOLD", holdReason: "INCOMPLETE_TABLE_CODE" })]),
    works: [makeWork()],
    table: [makeRow()],
  });
  assert("T-D-3 HOLD → 0 mutation", zeroWrite(result, snap, expert));
}

// T-D-4 NONE
{
  const expert = makeExpert([{ lineId: "L1", basis: null }]);
  expert.masterBoqLines[0].provenance = { catalogBasis: null };
  const snap = snapshot(expert);
  const result = apply({
    documentExpert: expert,
    knr: makeKnr([knrLine({ lineStatus: "NONE", catalogBasis: null })]),
    works: [makeWork()],
    table: [makeRow()],
  });
  assert("T-D-4 NONE → 0 mutation", zeroWrite(result, snap, expert));
}

// T-D-5 HIT
{
  const expert = makeExpert([
    { lineId: "L1", knrHint: "KEEP-HINT" },
    { lineId: "L2", knrHint: "OTHER-HINT" },
  ]);
  const snap = snapshot(expert);
  const result = apply({
    documentExpert: expert,
    knr: makeKnr([
      knrLine({ lineId: "L1" }),
      knrLine({ lineId: "L2", catalogBasis: catalogBasis({ normalizedKey: "KNR|9-99|1111-11" }) }),
    ]),
    works: [makeWork()],
    table: [makeRow()],
  });
  const overlayL1 = result.expert.masterBoqLines.find((r) => r.line.lineId === "L1");
  const overlayL2 = result.expert.masterBoqLines.find((r) => r.line.lineId === "L2");
  assert("T-D-5 HIT catalogWorkId na właściwej kopii", overlayL1?.line.catalogWorkId === "work-legal");
  assert("T-D-5 input L1 unchanged", expert.masterBoqLines[0].line.catalogWorkId === null);
  assert("T-D-5 overlay !== shared line", overlayL1?.line !== expert.masterBoqLines[0].line);
  assert("T-D-5 input snapshot unchanged", snapshot(expert) === snap);
  assert("T-D-5 written count 1", result.catalogWorkIdWritten === 1 && result.appliedLineIds.join() === "L1");
  assert("T-D-7 unrelated overlay unchanged", overlayL2?.line.catalogWorkId == null);
  assert("T-D-9 knrHint overlay L1", overlayL1?.line.knrHint === "KEEP-HINT");
  assert("T-D-9 knrHint input L1", expert.masterBoqLines[0].line.knrHint === "KEEP-HINT");
  assert("T-D-9 knrHint overlay L2", overlayL2?.line.knrHint === "OTHER-HINT");
}

// T-D-6 nonexistent / inactive
{
  const expert = makeExpert([{ lineId: "L1" }]);
  const snap = snapshot(expert);
  const missing = apply({
    documentExpert: expert,
    knr: candidateKnr,
    works: [makeWork({ id: "other-work" })],
    table: [makeRow()],
  });
  assert("T-D-6 nonexistent workId → 0 mutation", zeroWrite(missing, snap, expert));
  const inactive = apply({
    documentExpert: expert,
    knr: candidateKnr,
    works: [makeWork({ active: false })],
    table: [makeRow()],
  });
  assert("T-D-6 inactive workId → 0 mutation", zeroWrite(inactive, snap, expert));
}

// T-D-8 catalogWorkId only via D
assert("T-D-8 D writes catalogWorkId", /ref\.line\.catalogWorkId = work\.id/.test(mappingSrc));
assert("T-D-8 B catalogWorkIdWritten: 0", /catalogWorkIdWritten: 0/.test(bSrc));
assert("T-D-8 B does not assign catalogWorkId", !/catalogWorkId\s*=/.test(bSrc.replace(/catalogWorkIdWritten/g, "")));
assert("T-D-8 chrome no catalogWorkId write", !/catalogWorkId\s*=/.test(chromeSrc));
assert("T-D-8 host overlay via applyOwnerKnrMapping", /applyOwnerKnrMapping/.test(hostSrc));

// T-D-10 mapper not called from D
assert("T-D-10 mapping no mapper import", !/tender-offer-boq-mapping|mapOfferBoqLine|exact_knr/.test(mappingSrc));
assert("T-D-10 host D block no mapper", !/mapOfferBoqLine/.test(hostSrc.match(/applyOwnerKnrMapping[\s\S]*?classification,/)?.[0] ?? hostSrc));

// T-D-11 D does not call A1/P3
assert("T-D-11 mapping no A1", !/from "\.\/classification-gate"|classifyEstimatorPricingPlane\s*\(/.test(mappingSrc));
assert("T-D-11 mapping no P3 call", !/runIkMasterBoqClassification\s*\(/.test(mappingSrc));
assert("T-D-11 mapping no Research", !/executeResearch|runIkLaborGapResearch|acceptWorkRate/.test(mappingSrc));

// T-D-12 Research = 0
assert("T-D-12 mapping no research call", !/executeResearch|runIkLaborGapResearch|runIkMaterial/.test(mappingSrc));

// T-D-13 Hub
assert("T-D-13 Hub no D symbols", !/applyOwnerKnrMapping|OWNER_KNR_MAPPINGS|ik-knr-owner-mapping/.test(hubSrc));
{
  let hubDiff = "";
  try {
    hubDiff = execFileSync("git", ["diff", "--", "src/app/TenderWorkflowHubPanel.tsx"], {
      cwd: root,
      encoding: "utf8",
    });
  } catch {
    hubDiff = "ERR";
  }
  assert("T-D-13 Hub = 0 diff", hubDiff.trim() === "", hubDiff.slice(0, 200));
}

{
  let chromeDiff = "";
  let c2Diff = "";
  try {
    chromeDiff = execFileSync("git", ["diff", "--", "src/lib/intelligent-estimator/IkExpertRoomChrome.tsx"], {
      cwd: root,
      encoding: "utf8",
    });
    c2Diff = execFileSync("git", ["diff", "--", "src/lib/intelligent-estimator/ik-knr-conversation.ts"], {
      cwd: root,
      encoding: "utf8",
    });
  } catch {
    chromeDiff = "ERR";
    c2Diff = "ERR";
  }
  assert("T-D-15 C3 chrome = 0 diff", chromeDiff.trim() === "", chromeDiff.slice(0, 200));
  assert("C2 copy = 0 diff", c2Diff.trim() === "", c2Diff.slice(0, 200));
}

assert("T-D-15 host does not edit chrome", !/IkExpertRoomChrome/.test(mappingSrc));
assert("forbidden gate unchanged import in D", !/classification-gate/.test(mappingSrc + hostSrc.match(/applyOwnerKnrMapping[\s\S]{0,800}/)?.[0] ?? ""));
assert("owner-classification-map not imported by D", !/owner-classification-map/.test(mappingSrc + hostSrc));
assert("mapper file not imported by D module", !mappingSrc.includes(mapperSrcName) && !mappingSrc.includes("tender-offer-boq-mapping"));
void gateSrc;
void ownerClassSrc;

// T-D-17 empty production table + no 1202-07
assert("T-D-17 production table empty", Array.isArray(OWNER_KNR_MAPPINGS) && OWNER_KNR_MAPPINGS.length === 0);
assert("T-D-17 no 1202-07 in mapping module", !/1202-07/.test(mappingSrc));
assert("T-D-17 OWNER_KNR_MAPPINGS = []", /OWNER_KNR_MAPPINGS: readonly OwnerKnrMappingRow\[\] = \[\]/.test(mappingSrc));

// T-D-18 AMBIGUOUS
{
  const expert = makeExpert([{ lineId: "L1" }]);
  const snap = snapshot(expert);
  const result = apply({
    documentExpert: expert,
    knr: candidateKnr,
    works: [makeWork()],
    table: [makeRow({ mappingId: "a" }), makeRow({ mappingId: "b" })],
  });
  assert("T-D-18 AMBIGUOUS → 0 mutation", zeroWrite(result, snap, expert));
}

// T-OWN-1 unit OK (m² ≡ m2)
{
  const expert = makeExpert([{ lineId: "L1", unit: "m²" }]);
  const result = apply({
    documentExpert: expert,
    knr: candidateKnr,
    works: [makeWork({ unit: "m2" })],
    table: [makeRow({ catalogUnit: "m2" })],
  });
  assert("T-OWN-1 unit OK → HIT", result.catalogWorkIdWritten === 1);
  assert("T-OWN-1 overlay workId", result.expert.masterBoqLines[0].line.catalogWorkId === "work-legal");
}
{
  const expert = makeExpert([{ lineId: "L1", unit: "szt" }]);
  const snap = snapshot(expert);
  const result = apply({
    documentExpert: expert,
    knr: candidateKnr,
    works: [makeWork({ unit: "m2" })],
    table: [makeRow({ catalogUnit: "m2" })],
  });
  assert("T-OWN-1 unit mismatch → 0 mutation", zeroWrite(result, snap, expert));
}

// T-OWN-2 ownerApproval false
{
  const expert = makeExpert([{ lineId: "L1" }]);
  const snap = snapshot(expert);
  const result = apply({
    documentExpert: expert,
    knr: candidateKnr,
    works: [makeWork()],
    table: [makeRow({ ownerApproval: false })],
  });
  assert("T-OWN-2 ownerApproval false → 0 mutation", zeroWrite(result, snap, expert));
}

// Structural greps
assert("grep no knrHint write in D", !/knrHint\s*=/.test(mappingSrc));
assert("grep no settings/flags/KV in D", !/localStorage|kw-|AppSettings|ikKnrEnabled/.test(mappingSrc.replace(/loadWorkCatalogStoreLocal/g, "")));
assert("grep host seam classification", /classification,/.test(hostSrc) && /runIkMasterBoqClassification/.test(hostSrc));
assert("grep host no fake ingest for D", !/ingest:\s*\{\s*expert:\s*knrMapped/.test(hostSrc));
assert("B proposedWorkId stays null type", /proposedWorkId: null/.test(bSrc));

// Live B + D: empty table never writes even if B would CANDIDATE
{
  const expert = makeExpert([{ lineId: "L1" }]);
  const knr = runIkKnrExpert({ tenderId: "t-d", documentExpert: expert });
  const snap = snapshot(expert);
  const result = apply({ documentExpert: expert, knr, works: [makeWork()], table: OWNER_KNR_MAPPINGS });
  assert("empty prod table + live B → 0 mutation", zeroWrite(result, snap, expert));
  assert("B still proposedWorkId null", knr.lines[0]?.proposedWorkId === null);
  assert("B catalogWorkIdWritten 0", knr.catalogWorkIdWritten === 0);
}

function runChild(rel, expectRe, label) {
  let out = "";
  let code = 1;
  try {
    out = execFileSync("npx", ["vite-node", rel], {
      cwd: root,
      encoding: "utf8",
      shell: true,
    });
    code = 0;
  } catch (err) {
    out = String(err?.stdout ?? "") + String(err?.stderr ?? err?.message ?? err);
    code = err?.status ?? 1;
  }
  const ok = code === 0 && expectRe.test(out);
  assert(label, ok, ok ? "" : out.slice(-400));
}

runChild(
  "scripts/test-ik-knr-expert-slice-c2.mjs",
  /C2 533 PASS \/ 0 FAIL/,
  "T-D-14 C2 = 533/0",
);
runChild(
  "scripts/test-ik-knr-expert-slice-c3.mjs",
  /C3 108 PASS \/ 0 FAIL/,
  "T-D-15 C3 = 108/0",
);
runChild(
  "scripts/test-ik-knr-expert-slice-b.mjs",
  /PASS 95 passed, 0 failed/,
  "T-D-16 B = 95/0",
);
runChild(
  "scripts/test-ik-knr-expert-slice-a.mjs",
  /PASS 40 passed, 0 failed/,
  "T-D-16 A = 40/0",
);
runChild(
  "scripts/test-estimator-classification-gate-01.mjs",
  /37 passed, 0 failed/,
  "T-D-16 A1 = 37/0",
);
runChild(
  "scripts/test-catalog-bid-01.mjs",
  /CATALOG-BID-01 ALL PASS/,
  "T-D-16 CATALOG = ALL PASS",
);
runChild(
  "scripts/test-ik-migration-01-p0-implementation.mjs",
  /52 PASS \/ 0 FAIL/,
  "T-D-16 P0 = 52/0",
);

console.log(`\nD ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
