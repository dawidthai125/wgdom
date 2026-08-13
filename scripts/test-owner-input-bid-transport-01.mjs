/**
 * TRANSPORT MODEL-1B — explicit bid_candidate → Owner Input → F5 harness.
 *
 * npx vite-node scripts/test-owner-input-bid-transport-01.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearOwnerRateInputStore,
  ensureOwnerRateQuestionForGap,
  submitOwnerRateAnswer,
  getCurrentOwnerInput,
  listOwnerInputsForTender,
} from "../src/lib/owner-rate-input/index.ts";
import {
  buildOfferBoqDirectFromPositionCost,
  clearTransportBidCandidateStore,
  computeShadowPositionCostsForOfferBoq,
  createOwnerInputTransportPriceProvider,
  evaluateBidCutoverGate,
  isTransportBidCandidate,
  listTransportBidCandidates,
  markTransportBidCandidate,
  resolveTransportFromOwnerInput,
  resolveWorkIdentityFromOfferBoqLine,
  TRANSPORT_BID_CANDIDATE_LS_KEY,
  unmarkTransportBidCandidate,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

function reset() {
  clearOwnerRateInputStore();
  clearTransportBidCandidateStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  fetchCalls = 0;
}

const OWNER = { userId: "owner-dawid", displayName: "Dawid" };
const NOW = Date.parse("2026-08-13T08:00:00.000Z");
const T_FRESH = "2026-08-12T12:00:00.000Z";

function makeStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works: [], updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function trLine(over = {}) {
  return {
    lineId: "TR-GRUZ",
    lp: "2",
    description: "Transport gruzu kontenerem",
    quantity: 4,
    unit: "dzień",
    catalogWorkId: null,
    categoryId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: { lineKind: "Unknown" },
    lineTotalPln: null,
    ...over,
  };
}

function makeDoc(lines, tenderId = "tender-A") {
  return { schemaVersion: 1, tenderId, lines, updatedAt: T_FRESH };
}

function srcHas(re) {
  const files = [
    "src/lib/tender-position-cost/owner-input-transport-provider.ts",
    "src/lib/tender-position-cost/transport-bid-candidate.ts",
    "src/lib/tender-position-cost/boq-shadow-adapter.ts",
    "src/lib/tender-position-cost/bid-position-cost-cutover.ts",
  ];
  return files.some((f) => re.test(readFileSync(join(ROOT, f), "utf8")));
}

// ——— T1 mark → candidate ———
{
  reset();
  const m = markTransportBidCandidate({
    tenderId: "tender-A",
    lineId: "TR-GRUZ",
    markedByRole: "admin",
  });
  ok("T1 mark ok", m.ok === true);
  ok("T1 is candidate", isTransportBidCandidate("tender-A", "TR-GRUZ"));
  eq("T1 list len", listTransportBidCandidates("tender-A").length, 1);
  eq("T1 sourceClass", listTransportBidCandidates("tender-A")[0].sourceClass, "bid_candidate");
  eq("T1 identityKind", listTransportBidCandidates("tender-A")[0].identityKind, "transport_line");
}

// ——— T2 no mark → no candidate ———
{
  reset();
  ok("T2 no candidate", !isTransportBidCandidate("tender-A", "TR-GRUZ"));
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([trLine()]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: true,
  });
  ok(
    "T2 not TRANSPORT_*",
    shadow.lines[0].identity.status !== "TRANSPORT_GAP" &&
      shadow.lines[0].identity.status !== "TRANSPORT_RESOLVED",
  );
  eq("T2 transportCostPln", shadow.aggregates.transportCostPln, 0);
}

// ——— T3 description "transport" → no identity ———
{
  reset();
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([trLine({ description: "transport materiałów na budowę" })]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: true,
  });
  ok("T3 no TRANSPORT_GAP from text", shadow.lines[0].identity.status !== "TRANSPORT_GAP");
  eq("T3 no OI questions", listOwnerInputsForTender({ tenderId: "tender-A", domain: "transport" }).length, 0);
}

// ——— T4 noise transport → NOISE_SKIP ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-NOISE" });
  const id = resolveWorkIdentityFromOfferBoqLine(
    trLine({
      lineId: "TR-NOISE",
      isNoise: true,
      noiseKind: "transport",
      description: "transport",
    }),
  );
  eq("T4 NOISE_SKIP", id.status, "NOISE_SKIP");
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([
      trLine({
        lineId: "TR-NOISE",
        isNoise: true,
        noiseKind: "transport",
        description: "transport",
      }),
    ]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: true,
  });
  eq("T4 shadow NOISE_SKIP", shadow.lines[0].identity.status, "NOISE_SKIP");
  eq("T4 ZERO transport Q", listOwnerInputsForTender({ tenderId: "tender-A", domain: "transport" }).length, 0);
  // mark API rejects noise when guard provided
  const rejected = markTransportBidCandidate({
    tenderId: "tender-B",
    lineId: "X",
    guard: { isNoise: true, noiseKind: "transport" },
  });
  ok("T4 mark reject noise", rejected.ok === false && rejected.reason === "NOISE_TRANSPORT");
}

// ——— T5 utylizacja ———
{
  reset();
  const rejected = markTransportBidCandidate({
    tenderId: "tender-A",
    lineId: "TR-UTYL",
    guard: { categoryId: "TRANSPORT_UTYLIZACJA" },
  });
  ok("T5 mark reject utyl", rejected.ok === false && rejected.reason === "UTYLIZACJA_ONLY");
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-UTYL" });
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([
      trLine({
        lineId: "TR-UTYL",
        categoryId: "TRANSPORT_UTYLIZACJA",
        description: "Utylizacja gruzu",
      }),
    ]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: true,
  });
  ok("T5 not TRANSPORT Bid", shadow.lines[0].identity.status !== "TRANSPORT_GAP");
  ok("T5 not TRANSPORT_RESOLVED", shadow.lines[0].identity.status !== "TRANSPORT_RESOLVED");
}

// ——— T6 mark + no OI → TRANSPORT_GAP ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-GRUZ" });
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([trLine()]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: true,
  });
  const gate = evaluateBidCutoverGate(shadow);
  eq("T6 TRANSPORT_GAP", shadow.lines[0].identity.status, "TRANSPORT_GAP");
  ok("T6 gate FAIL", !gate.pass);
  ok("T6 transportGapCount", gate.transportGapCount >= 1);
  ok("T6 ensure Q", listOwnerInputsForTender({ tenderId: "tender-A", domain: "transport" }).length >= 1);
}

// ——— T7–T8 mark + valid OI → RESOLVED · qty×rate ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-GRUZ" });
  const q = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "transport",
    lineRef: "TR-GRUZ",
    evidenceSummaryPl: "Brak stawki transportu gruzu w dossier.",
    askedByRole: "chief",
    transport: { namePl: "Transport gruzu", quantity: 4, unit: "dzień" },
  });
  ok("T7 q ok", q.ok === true);
  if (q.ok) {
    const a = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "dzień",
      approvedBy: OWNER,
    });
    ok("T7 answer ok", a.ok === true);
    if (a.ok) {
      eq("T7 sourceClass owner_input", a.answer.sourceClass, "owner_input");
      eq("T7 scope", a.answer.scope, "tender_only");
    }

    const resolved = resolveTransportFromOwnerInput({
      tenderId: "tender-A",
      lineId: "TR-GRUZ",
      namePl: "Transport gruzu",
      quantity: 4,
      unit: "dzień",
    });
    eq("T7 RESOLVED", resolved.rateStatus, "RESOLVED");
    eq("T8 total 720", resolved.totalPln, 720);
    eq("T8 rate 180", resolved.unitRatePln, 180);
    eq("T7 provenance owner_input", resolved.provenance?.kind, "owner_input");

    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: makeDoc([trLine()]),
      store: makeStore(),
      nowMs: NOW,
      tenderId: "tender-A",
      ensureOwnerQuestions: false,
    });
    eq("T7 shadow TRANSPORT_RESOLVED", shadow.lines[0].identity.status, "TRANSPORT_RESOLVED");
    eq("T8 aggregate transportCostPln", shadow.aggregates.transportCostPln, 720);
  }
}

// ——— T9 unit mismatch ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-GRUZ" });
  const q = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "transport",
    lineRef: "TR-GRUZ",
    evidenceSummaryPl: "Brak stawki transportu gruzu w dossier.",
    askedByRole: "chief",
    transport: { namePl: "Transport gruzu", quantity: 4, unit: "dzień" },
  });
  if (q.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "szt",
      approvedBy: OWNER,
    });
  }
  const looked = createOwnerInputTransportPriceProvider({ tenderId: "tender-A" }).lookup({
    lineId: "TR-GRUZ",
    namePl: "Transport gruzu",
    quantity: 4,
    unit: "dzień",
  });
  eq("T9 INVALID", looked.rateStatus, "INVALID");
  ok("T9 null rate", looked.unitRatePln == null);
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([trLine()]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: false,
  });
  eq("T9 TRANSPORT_GAP", shadow.lines[0].identity.status, "TRANSPORT_GAP");
  const gate = evaluateBidCutoverGate(shadow);
  ok("T9 F5 FAIL", !gate.pass && gate.transportGapCount >= 1);
}

// ——— T10 unresolved != 0 ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-GRUZ" });
  const unresolved = resolveTransportFromOwnerInput({
    tenderId: "tender-A",
    lineId: "TR-GRUZ",
    namePl: "Transport gruzu",
    quantity: 4,
    unit: "dzień",
  });
  eq("T10 UNRESOLVED", unresolved.rateStatus, "UNRESOLVED");
  ok("T10 rate null", unresolved.unitRatePln == null);
  ok("T10 total null", unresolved.totalPln == null);
}

// ——— T11 / T12 forbidden fills ———
{
  ok("T11 no 85 in provider/shadow/cutover/mark", !srcHas(/\b85\b/));
  ok(
    "T12 no ath/catalog/companyPrice invent in transport provider",
    !/ath_priced|companyPricePln|catalog/.test(
      readFileSync(join(ROOT, "src/lib/tender-position-cost/owner-input-transport-provider.ts"), "utf8"),
    ),
  );
}

// ——— T13 tender isolation ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-GRUZ" });
  markTransportBidCandidate({ tenderId: "tender-B", lineId: "TR-GRUZ" });
  const qA = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "transport",
    lineRef: "TR-GRUZ",
    evidenceSummaryPl: "Brak stawki transportu A w dossier.",
    askedByRole: "chief",
    transport: { namePl: "Transport A", quantity: 1, unit: "dzień" },
  });
  if (qA.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: qA.question.questionId,
      amountPlnNet: 100,
      unit: "dzień",
      approvedBy: OWNER,
    });
  }
  const b = resolveTransportFromOwnerInput({
    tenderId: "tender-B",
    lineId: "TR-GRUZ",
    namePl: "Transport B",
    quantity: 1,
    unit: "dzień",
  });
  eq("T13 B UNRESOLVED", b.rateStatus, "UNRESOLVED");
  ok("T13 A marked only A list", listTransportBidCandidates("tender-A").length === 1);
  ok("T13 B has own mark", isTransportBidCandidate("tender-B", "TR-GRUZ"));
}

// ——— T14 revision ———
{
  reset();
  const q = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "transport",
    lineRef: "TR-GRUZ",
    evidenceSummaryPl: "Brak stawki transportu gruzu w dossier.",
    askedByRole: "chief",
    transport: { namePl: "Transport gruzu", quantity: 1, unit: "dzień" },
  });
  ok("T14 q", q.ok === true);
  if (q.ok) {
    const a1 = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 180,
      unit: "dzień",
      approvedBy: OWNER,
    });
    const a2 = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 200,
      unit: "dzień",
      approvedBy: OWNER,
    });
    ok("T14 a1", a1.ok === true);
    ok("T14 a2", a2.ok === true);
    if (a1.ok && a2.ok) {
      eq("T14 rev2", a2.answer.revisionN, 2);
      eq("T14 supersedes", a2.answer.supersedesAnswerId, a1.answer.answerId);
      const cur = getCurrentOwnerInput({
        tenderId: "tender-A",
        questionId: q.question.questionId,
      });
      eq("T14 current 200", cur?.amountPlnNet, 200);
    }
  }
}

// ——— T15 / T16 F5 gap + SUM ———
{
  reset();
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-1" });
  markTransportBidCandidate({ tenderId: "tender-A", lineId: "TR-2" });
  const q1 = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "transport",
    lineRef: "TR-1",
    evidenceSummaryPl: "Brak stawki transportu TR-1 w dossier.",
    askedByRole: "chief",
    transport: { namePl: "T1", quantity: 2, unit: "dzień" },
  });
  const q2 = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "transport",
    lineRef: "TR-2",
    evidenceSummaryPl: "Brak stawki transportu TR-2 w dossier.",
    askedByRole: "chief",
    transport: { namePl: "T2", quantity: 1, unit: "dzień" },
  });
  if (q1.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q1.question.questionId,
      amountPlnNet: 100,
      unit: "dzień",
      approvedBy: OWNER,
    });
  }
  // TR-2 unanswered → gap
  const shadowGap = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([
      trLine({ lineId: "TR-1", quantity: 2 }),
      trLine({ lineId: "TR-2", quantity: 1 }),
    ]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: false,
  });
  const gateGap = evaluateBidCutoverGate(shadowGap);
  ok("T15 F5 FAIL with gap", !gateGap.pass && gateGap.transportGapCount >= 1);

  if (q2.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q2.question.questionId,
      amountPlnNet: 50,
      unit: "dzień",
      approvedBy: OWNER,
    });
  }
  const shadowOk = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([
      trLine({ lineId: "TR-1", quantity: 2 }),
      trLine({ lineId: "TR-2", quantity: 1 }),
    ]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: false,
  });
  eq("T16 SUM transportCostPln 250", shadowOk.aggregates.transportCostPln, 250);
  const gateOk = evaluateBidCutoverGate(shadowOk);
  eq("T16 transportGapCount 0", gateOk.transportGapCount, 0);
  if (gateOk.pass) {
    const direct = buildOfferBoqDirectFromPositionCost(shadowOk, gateOk);
    eq("T16 direct.transportPln 250", direct?.transportPln, 250);
  } else {
    // may fail if only transport lines and gate requires total>0 — transport alone should pass
    ok("T16 gate PASS expected", gateOk.pass, gateOk.reasonsPl);
  }
}

// ——— T17 Equipment regression (smoke) ———
{
  reset();
  try {
    const r = execSync("npx vite-node scripts/test-owner-input-bid-equipment-01.mjs", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const failLines = r.split("\n").filter((l) => l.startsWith("FAIL "));
    ok("T17 Equipment GO-1 0 FAIL", failLines.length === 0, failLines.slice(0, 3));
  } catch (e) {
    const out = String(e?.stdout || e?.message || e);
    const failLines = out.split("\n").filter((l) => l.startsWith("FAIL "));
    ok(
      "T17 Equipment GO-1 0 FAIL",
      false,
      failLines.slice(0, 5).join(" | ") || out.slice(-400),
    );
  }
}

// ——— T18 Transport-01 MODEL-1A ———
{
  try {
    const r = execSync("npx vite-node scripts/test-wm-tender-transport-01.mjs", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const failLines = r.split("\n").filter((l) => l.startsWith("FAIL "));
    ok("T18 Transport-01 0 FAIL", failLines.length === 0, failLines.slice(0, 3));
  } catch (e) {
    ok("T18 Transport-01 0 FAIL", false, String(e?.stdout || e?.message || e).slice(-400));
  }
}

// ——— T19 C-MODE ———
{
  try {
    const a = execSync(
      "npx vite-node scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-contract.mjs",
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const b = execSync(
      "npx vite-node scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-fallback-removal.mjs",
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    ok(
      "T19 C-MODE contract",
      a.split("\n").filter((l) => l.startsWith("FAIL ")).length === 0,
    );
    ok(
      "T19 C-MODE fallback",
      b.split("\n").filter((l) => l.startsWith("FAIL ")).length === 0,
    );
  } catch (e) {
    ok("T19 C-MODE", false, String(e?.stdout || e?.message || e).slice(-400));
  }
}

// ——— T20 F0–F6 ———
{
  const suites = [
    "scripts/test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f1-our-rate.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f2-material.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f3-bom.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f4-boq-shadow.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f6-ath-catalog-audit.mjs",
  ];
  let allOk = true;
  for (const s of suites) {
    try {
      const r = execSync(`npx vite-node ${s}`, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      const fails = r.split("\n").filter((l) => l.startsWith("FAIL "));
      if (fails.length) {
        allOk = false;
        console.error("T20 fail in", s, fails.slice(0, 2));
      }
    } catch (e) {
      allOk = false;
      console.error("T20 throw", s, String(e?.stderr || e?.message || e).slice(0, 300));
    }
  }
  ok("T20 F0–F6 GREEN", allOk);
}

// ——— T21 Payroll ———
{
  try {
    const b4 = execSync("npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    ok(
      "T21 Payroll B4",
      b4.split("\n").filter((l) => l.startsWith("FAIL ")).length === 0,
    );
  } catch (e) {
    ok("T21 Payroll B4", false, String(e?.stderr || e?.message || e).slice(0, 300));
  }
  // Canonical 16-script payroll battery (GO-1 / OI-01 SSOT)
  const payrollBattery = [
    "scripts/test-payroll-bootstrap-runtime-parity-b4.mjs",
    "scripts/test-payroll-edge-parity-b6.mjs",
    "scripts/test-payroll-deletion-tombstones-pr-pay-s2.mjs",
    "scripts/test-payroll-resurrection-guard-s7-5.mjs",
    "scripts/test-payroll-archive-restore-eligibility-s6.mjs",
    "scripts/test-payroll-cloud-sync-frequency-s7-4.mjs",
    "scripts/test-payroll-settled-persistence-pr-pay-s5.mjs",
    "scripts/test-payroll-roster-guard-phase2.mjs",
    "scripts/test-payroll-p0-week-rollover-01.mjs",
    "scripts/test-payroll-cloud-resurrection-01.mjs",
    "scripts/test-payroll-guard-push-fail-loud-p0.mjs",
    "scripts/test-payroll-anti-leak-same-week-cloud-p0.mjs",
    "scripts/test-payroll-week-employee-merge-asymmetry.mjs",
    "scripts/test-payroll-work-entry-merge-fidelity.mjs",
    "scripts/test-payroll-day-merge-fidelity.mjs",
    "scripts/test-p11-bootstrap-payroll.mjs",
  ];
  let batPass = 0;
  const batFails = [];
  for (const s of payrollBattery) {
    try {
      const r = execSync(`npx vite-node ${s}`, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (r.split("\n").filter((l) => l.startsWith("FAIL ")).length === 0) {
        batPass += 1;
      } else {
        batFails.push(s);
      }
    } catch {
      batFails.push(s);
    }
  }
  ok(
    "T21 Payroll battery 16/16",
    batPass === 16 && batFails.length === 0,
    { batPass, batFails: batFails.slice(0, 4) },
  );
}

// ——— T22 Cloud boundary ———
{
  const cloud = readFileSync(join(ROOT, "src/lib/cloud-sync.ts"), "utf8");
  ok("T22 marker not in DATA_KEYS", !cloud.includes(TRANSPORT_BID_CANDIDATE_LS_KEY));
  ok("T22 owner-rate not in DATA_KEYS", !cloud.includes("kw-owner-rate-input-v1"));
  const kindBlock =
    readFileSync(join(ROOT, "src/lib/tender-offer-boq.ts"), "utf8").match(
      /export type OfferBoqLineKind\s*=([\s\S]*?);/,
    )?.[1] ?? "";
  ok("T22 no OfferBoqLineKind.Transport", !/\|\s*"Transport"/.test(kindBlock));
  ok("T22 no fetch", fetchCalls === 0);
}

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
