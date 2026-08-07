/**
 * Ekspert Wykonania P0 — unit tests.
 * npx vite-node scripts/test-execution-expert-p0.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
  offerBoqToBoqContext,
  selectTechnologyPackForOfferBoq,
} from "../src/lib/execution-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function baseLine(over = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "Ocieplenie ścian zewnętrznych systemem ETICS",
    quantity: 120,
    quantityRaw: "120",
    unit: "m2",
    catalogWorkId: "cw.etics.boards",
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    ...over,
  };
}

function baseDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: "t-exec-p0",
    version: 1,
    builtAt: new Date().toISOString(),
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: {
      materialsPln: null,
      laborPln: null,
      equipmentPln: null,
      directPln: null,
      kpPln: null,
      overheadPln: null,
      costPricePln: null,
      marginPln: null,
      recommendedBidPln: null,
      profitPln: null,
      profitabilityPct: null,
      estimatedDurationDays: null,
      workingCapitalPln: null,
      lineCount: lines.length,
      pricedLineCount: 0,
    },
    recomputeToken: "x",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log("\n=== Execution Expert P0 ===\n");
resetTf();

// P0.1 adapter
const ctx = offerBoqToBoqContext(baseDoc([baseLine()]));
ok("adapter lines", ctx.lines.length === 1);
ok("adapter hint", ctx.lines[0].catalogWorkIdHint === "cw.etics.boards");
ok("adapter qty", ctx.lines[0].quantity === 120);

const noiseDoc = baseDoc([
  baseLine({ lineId: "N1", isNoise: true, description: "Transport" }),
  baseLine({ lineId: "L2", quantity: 0, description: "zero" }),
]);
ok("adapter skips noise/zero", offerBoqToBoqContext(noiseDoc).lines.length === 0);

// P0.3 selection
const sel = selectTechnologyPackForOfferBoq(baseDoc([baseLine()]));
ok("select ETICS", sel && sel.packId === FIXTURE_ETICS_PACK_ID);
ok("select matched lines", sel && sel.matchedLineIds.includes("L1"));

const selKostka = selectTechnologyPackForOfferBoq(
  baseDoc([
    baseLine({
      lineId: "K1",
      description: "Układanie kostki brukowej betonowej",
      catalogWorkId: "cw.paving.cubes",
      quantity: 40,
    }),
  ]),
);
ok("select kostka", selKostka && selKostka.packId === FIXTURE_KOSTKA_PACK_ID);

const selNone = selectTechnologyPackForOfferBoq(
  baseDoc([
    baseLine({
      lineId: "X1",
      description: "Malowanie drzwi biurowych",
      catalogWorkId: "cw.paint.doors",
      quantity: 10,
      unit: "m2",
    }),
  ]),
);
ok("no pack for unrelated", selNone === null);

// Full analyze — contract P0.2 + pipeline + P0.4
const result = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
ok("has contract.co", typeof result.contract.co === "string" && result.contract.co.length > 10);
ok("has contract.dlaczego", result.contract.dlaczego.length > 5);
ok("has contract.basis", result.contract.naPodstawieCzego.includes("OfferBoq"));
ok("has pewnosc", ["high", "medium", "low"].includes(result.contract.pewnosc));
ok("has zgodnosc", ["aligned", "partial", "not_aligned"].includes(result.contract.zgodnoscZRozumieniemWykonania));
ok("blokery is array", Array.isArray(result.contract.blokery));
ok("plan derived", result.plan && result.plan.packId === FIXTURE_ETICS_PACK_ID);
ok("bom no prices", result.bom && !("unitPrice" in (result.bom.materials[0] || {})));
ok("bom materials", result.bom && result.bom.materials.length >= 1);
ok("gaps include hidden or risks", result.gapsAndRisks.length >= 1);
ok("decision set", result.technologyDecision === "allow" || result.technologyDecision === "degrade");

// Deny path — empty capabilities
const denied = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), {
  companyCapabilityIds: [],
  availableEquipmentKeys: [],
});
ok("deny decision", denied.technologyDecision === "deny");
ok("deny blockers", denied.contract.blokery.length >= 1);
ok("deny not_aligned", denied.contract.zgodnoscZRozumieniemWykonania === "not_aligned");

// Uncovered
const emptyTech = analyzeExecutionFromOfferBoq(
  baseDoc([
    baseLine({
      lineId: "Z1",
      description: "Montaż biurka sklepowego",
      catalogWorkId: "cw.furniture.desk",
      quantity: 2,
      unit: "szt",
    }),
  ]),
);
ok("uncovered no pack", emptyTech.selection === null);
ok("uncovered blocker", emptyTech.contract.blokery.some((b) => b.code === "EXEC_NO_TECHNOLOGY"));

console.log(`\nALL PASS (${passed})\n`);
