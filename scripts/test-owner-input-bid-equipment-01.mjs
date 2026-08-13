/**
 * OWNER-INPUT-BID-EQUIPMENT GO-1 — Owner Input → Equipment Bid resolution harness.
 *
 * npx vite-node scripts/test-owner-input-bid-equipment-01.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearOwnerRateInputStore,
  createOwnerRateQuestion,
  ensureOwnerRateQuestionForGap,
  findOwnerInputForLine,
  getCurrentOwnerInput,
  listOwnerInputsForTender,
  normalizeOwnerRateUnit,
  areOwnerRateUnitsCompatible,
  submitOwnerRateAnswer,
} from "../src/lib/owner-rate-input/index.ts";
import {
  buildOfferBoqDirectFromPositionCost,
  computeShadowPositionCostsForOfferBoq,
  createOwnerInputEquipmentPriceProvider,
  evaluateBidCutoverGate,
  resolveEquipmentFromOwnerInput,
  resolveWorkIdentityFromOfferBoqLine,
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
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
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
      wroclaw: {
        region: "wroclaw",
        works: [],
        updatedAt: T_FRESH,
      },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function eqLine(over = {}) {
  return {
    lineId: "EQ-KOP",
    lp: "1",
    description: "Koparka gąsienicowa",
    quantity: 3,
    unit: "dzień",
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: { lineKind: "Equipment" },
    lineTotalPln: null,
    unitPricePln: null,
    ...over,
  };
}

function makeDoc(lines, tenderId = "tender-A") {
  return { schemaVersion: 1, tenderId, lines, updatedAt: T_FRESH };
}

// ——— Units ———
{
  eq("U1 dzień→day", normalizeOwnerRateUnit("dzień"), "day");
  eq("U2 dni", normalizeOwnerRateUnit("dni"), "day");
  eq("U3 m³", normalizeOwnerRateUnit("m³"), "m3");
  ok("U4 compatible dzień/day", areOwnerRateUnitsCompatible("dzień", "day"));
  ok("U5 incompatible szt/dzień", !areOwnerRateUnitsCompatible("szt", "dzień"));
}

// ——— T1 GAP bez Owner Input ———
{
  reset();
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([eqLine()]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: true,
  });
  const gate = evaluateBidCutoverGate(shadow);
  const line = shadow.lines[0];
  eq("T1 status EQUIPMENT_GAP", line.identity.status, "EQUIPMENT_GAP");
  ok("T1 gate FAIL", !gate.pass);
  ok("T1 equipmentGapCount", gate.equipmentGapCount >= 1);
  eq("T1 equipmentCostPln", shadow.aggregates.equipmentCostPln, 0);
}

// ——— T2–T5 question via ensure ———
{
  reset();
  const ensured = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Brak stawki koparki w dossier.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka gąsienicowa", quantity: 3, unit: "dzień" },
  });
  ok("T2 ensure ok", ensured.ok === true);
  if (ensured.ok) {
    eq("T2 created", ensured.created, true);
    eq("T2 status open", ensured.question.status, "open");
    eq("T3 tenderId", ensured.question.tenderId, "tender-A");
    eq("T4 lineRef", ensured.question.lineRef, "EQ-KOP");
    eq("T5 qty", ensured.question.payload.domain === "equipment"
      ? ensured.question.payload.equipment.quantity
      : null, 3);
    eq("T5 unit", ensured.question.payload.domain === "equipment"
      ? ensured.question.payload.equipment.unit
      : null, "dzień");
  }
}

// ——— T6–T10 answer → RESOLVED → F5 equipmentPln ———
{
  reset();
  const q = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Brak stawki koparki w dossier.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka gąsienicowa", quantity: 3, unit: "dzień" },
  });
  ok("T6 q ok", q.ok === true);
  if (q.ok) {
    const a = submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 1800,
      unit: "dzień",
      approvedBy: OWNER,
    });
    ok("T6 answer ok", a.ok === true);
    if (a.ok) eq("T6 amount", a.answer.amountPlnNet, 1800);

    const provider = createOwnerInputEquipmentPriceProvider({ tenderId: "tender-A" });
    const looked = provider.lookup({
      lineId: "EQ-KOP",
      namePl: "Koparka gąsienicowa",
      quantity: 3,
      unit: "dzień",
    });
    eq("T7 RESOLVED", looked.rateStatus, "RESOLVED");
    eq("T7 rate", looked.unitRatePln, 1800);
    eq("T7 provenance", looked.provenance?.kind, "owner_input");

    const comp = resolveEquipmentFromOwnerInput({
      tenderId: "tender-A",
      lineId: "EQ-KOP",
      namePl: "Koparka gąsienicowa",
      quantity: 3,
      unit: "dzień",
    });
    eq("T8 total", comp.totalPln, 5400);

    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: makeDoc([eqLine()]),
      store: makeStore(),
      nowMs: NOW,
      tenderId: "tender-A",
      ensureOwnerQuestions: false,
    });
    const gate = evaluateBidCutoverGate(shadow);
    eq("T9 equipmentGapCount", gate.equipmentGapCount, 0);
    eq("T9 status", shadow.lines[0].identity.status, "EQUIPMENT_RESOLVED");
    eq("T10 equipmentCostPln", shadow.aggregates.equipmentCostPln, 5400);

    // Pure equipment BOQ can PASS gate when resolved
    ok("T10 gate PASS equipment-only", gate.pass === true);
    const direct = buildOfferBoqDirectFromPositionCost(shadow, gate);
    ok("T10 direct ok", direct != null);
    if (direct) {
      eq("T10 equipmentPln", direct.equipmentPln, 5400);
      eq("T10 directPln", direct.directPln, 5400);
      ok("T10 provenance label", /Owner Input/i.test(direct.sourceLabelPl ?? ""));
      eq("T10 transportPln still 0", direct.transportPln, 0);
    }
  }
}

// ——— T11 dedupe ———
{
  reset();
  const a = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Evidence A dla koparki w przetargu.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 3, unit: "dzień" },
  });
  const b = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Evidence B dla koparki w przetargu.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 3, unit: "dzień" },
  });
  ok("T11 both ok", a.ok && b.ok);
  if (a.ok && b.ok) {
    eq("T11 second not created", b.created, false);
    eq("T11 same questionId", a.question.questionId, b.question.questionId);
    eq("T11 list len 1", listOwnerInputsForTender({ tenderId: "tender-A", domain: "equipment" }).length, 1);
  }
}

// ——— T12 revision current ———
{
  reset();
  const q = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Rev test evidence dla tego przetargu.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 3, unit: "dzień" },
  });
  if (q.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 1800,
      unit: "dzień",
      approvedBy: OWNER,
    });
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 2000,
      unit: "dzień",
      approvedBy: OWNER,
    });
    const cur = getCurrentOwnerInput({
      tenderId: "tender-A",
      questionId: q.question.questionId,
    });
    eq("T12 current 2000", cur?.amountPlnNet, 2000);
    eq("T12 rev", cur?.revisionN, 2);
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: makeDoc([eqLine()]),
      store: makeStore(),
      nowMs: NOW,
      tenderId: "tender-A",
      ensureOwnerQuestions: false,
    });
    eq("T12 total uses rev", shadow.aggregates.equipmentCostPln, 6000);
  }
}

// ——— T13 unit mismatch INVALID ———
{
  reset();
  const q = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Unit mismatch evidence dla tego przetargu.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 3, unit: "dzień" },
  });
  if (q.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: q.question.questionId,
      amountPlnNet: 1800,
      unit: "szt",
      approvedBy: OWNER,
    });
    const comp = resolveEquipmentFromOwnerInput({
      tenderId: "tender-A",
      lineId: "EQ-KOP",
      namePl: "Koparka",
      quantity: 3,
      unit: "dzień",
    });
    eq("T13 INVALID", comp.rateStatus, "INVALID");
    eq("T13 total null", comp.totalPln, null);
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: makeDoc([eqLine()]),
      store: makeStore(),
      nowMs: NOW,
      tenderId: "tender-A",
      ensureOwnerQuestions: false,
    });
    const gate = evaluateBidCutoverGate(shadow);
    ok("T13 still GAP", gate.equipmentGapCount >= 1);
    ok("T13 gate FAIL", !gate.pass);
  }
}

// ——— T14 no answer = GAP ———
{
  reset();
  ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Open Q evidence dla tego przetargu.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 3, unit: "dzień" },
  });
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([eqLine()]),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: false,
  });
  eq("T14 GAP", shadow.lines[0].identity.status, "EQUIPMENT_GAP");
}

// ——— T15–T22 forbidden fallbacks (provider + bridge code, strip comments) ———
{
  const strip = (s) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const files = strip(
    [
      "src/lib/tender-position-cost/owner-input-equipment-provider.ts",
      "src/lib/owner-rate-input/bridge.ts",
      "src/lib/owner-rate-input/units.ts",
    ]
      .map((f) => readFileSync(join(ROOT, f), "utf8"))
      .join("\n"),
  );
  ok("T15 no 0-as-price invent", !/unitRatePln:\s*0\b/.test(files) && !/amountPlnNet:\s*0\b/.test(files));
  ok("T16 no literal 85 rate", !/unitRatePln:\s*85\b|amountPlnNet:\s*85\b/.test(files));
  ok("T17 no literal 45 rate", !/unitRatePln:\s*45\b|amountPlnNet:\s*45\b/.test(files));
  ok("T18 no ath_priced", !/ath_priced/.test(files));
  ok("T19 no catalog lookup", !/lookupCatalog|fromCatalog/.test(files));
  ok("T20 no companyPricePln", !/companyPricePln/.test(files));
  ok("T21 no equipmentRateByKey", !/equipmentRateByKey/.test(files));
  ok("T22 no PI31", !/PI31/.test(files));
}

// ——— T23–T24 tender isolation ———
{
  reset();
  const qA = ensureOwnerRateQuestionForGap({
    tenderId: "tender-A",
    domain: "equipment",
    lineRef: "EQ-KOP",
    evidenceSummaryPl: "Isolation A evidence dla tego przetargu.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 3, unit: "dzień" },
  });
  if (qA.ok) {
    submitOwnerRateAnswer({
      tenderId: "tender-A",
      questionId: qA.question.questionId,
      amountPlnNet: 1800,
      unit: "dzień",
      approvedBy: OWNER,
    });
  }
  const leak = findOwnerInputForLine({
    tenderId: "tender-B",
    domain: "equipment",
    lineRef: "EQ-KOP",
  });
  eq("T23 no leak to B", leak, null);
  const shadowB = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([eqLine()], "tender-B"),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-B",
    ensureOwnerQuestions: false,
  });
  eq("T24 B still GAP", shadowB.lines[0].identity.status, "EQUIPMENT_GAP");
  const shadowA = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([eqLine()], "tender-A"),
    store: makeStore(),
    nowMs: NOW,
    tenderId: "tender-A",
    ensureOwnerQuestions: false,
  });
  eq("T24 A RESOLVED", shadowA.lines[0].identity.status, "EQUIPMENT_RESOLVED");
}

// ——— Identity still Equipment; no Transport kind ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(eqLine());
  eq("TX identity EQUIPMENT_GAP without tender", id.status, "EQUIPMENT_GAP");
  const offerBoq = readFileSync(join(ROOT, "src/lib/tender-offer-boq.ts"), "utf8");
  ok("TX no OfferBoqLineKind.Transport", !/OfferBoqLineKind\s*=\s*[^;]*Transport/.test(offerBoq) && !/"Transport"/.test(
    offerBoq.match(/export type OfferBoqLineKind[\s\S]*?;/)?.[0] ?? "",
  ));
}

eq("TFETCH", fetchCalls, 0);

// ——— Static allowlist / locks ———
{
  const cutover = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/bid-position-cost-cutover.ts"),
    "utf8",
  );
  // MODEL-1B supersedes pre-Transport freeze: transportGapCount / TRANSPORT_GAP MAY exist.
  // Equipment GO-1 semantics remain: separate equipmentGapCount; gate still requires === 0.
  ok(
    "LOCK MODEL-1B transportGapCount may exist; Equipment gate separate (equipmentGapCount===0)",
    /transportGapCount/.test(cutover) &&
      /equipmentGapCount/.test(cutover) &&
      /equipmentGapCount\s*===\s*0/.test(cutover),
  );
  ok(
    "LOCK MODEL-1B TRANSPORT_GAP may exist; EQUIPMENT_GAP path preserved",
    /TRANSPORT_GAP/.test(cutover) && /EQUIPMENT_GAP/.test(cutover),
  );
  const hub = readFileSync(join(ROOT, "src/app/TenderWorkflowHubPanel.tsx"), "utf8");
  ok("UI wired OwnerRateInputCard", /OwnerRateInputCard/.test(hub));
  ok("UI refresh hook", /onAccepted=\{onPriceResearchAccepted\}/.test(hub));
}

console.log(`\nWYNIK OWNER-INPUT-BID-EQUIPMENT GO-1: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
