/**
 * Ekspert Materiałów P0 — unit tests.
 * npx vite-node scripts/test-material-expert-p0.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import {
  analyzeMaterialsFromExecution,
  proposeMaterialVariants,
} from "../src/lib/material-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
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
    quantity: 100,
    quantityRaw: "100",
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
    tenderId: "t-mat-p0",
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

console.log("\n=== Material Expert P0 ===\n");
resetTf();

const exec = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
ok("EE has bom", exec.bom && exec.bom.materials.length >= 4);

const mat = analyzeMaterialsFromExecution(exec);
ok("contract.co", mat.contract.co.length > 10);
ok("contract.dlaczego", mat.contract.dlaczego.length > 5);
ok("contract.basis", mat.contract.naPodstawieCzego.includes("Eksperta Wykonania"));
ok("pewnosc", ["high", "medium", "low"].includes(mat.contract.pewnosc));
ok("zgodnosc", ["aligned", "partial", "not_aligned"].includes(mat.contract.zgodnoscZRozumieniemWykonania));
ok("blokery array", Array.isArray(mat.contract.blokery));
ok("lines from BOM", mat.lines.length === exec.bom.materials.length);
ok(
  "happy path no incompatible lines",
  mat.lines.every((l) => l.conformity !== "niezgodny"),
);

const kinds = new Set(mat.variants.flatMap((v) => v.options.map((o) => o.kind)));
ok("variant rekomendowany", kinds.has("rekomendowany"));
ok("variant ekonomiczny", kinds.has("ekonomiczny"));
ok("variant premium", kinds.has("premium"));
ok("variant ograniczona", kinds.has("ograniczona_dostepnosc"));

ok("availability risks", mat.gapsAndRisks.some((g) => g.kind === "availability_risk"));
ok("completeness set", ["kompletny", "czesciowy", "niekompletny"].includes(mat.completeness));
ok("coverage required", mat.packMaterialCoverage.required >= 4);
ok("no unitPrice in lines", !JSON.stringify(mat.lines).includes("unitPrice"));
ok("no pricePln in result", !JSON.stringify(mat).includes("pricePln"));

// Inject incompatible material on a copy of execution result
const badExec = {
  ...exec,
  bom: {
    ...exec.bom,
    materials: [
      ...exec.bom.materials,
      {
        bomLineId: "bom_mat_fake",
        materialKey: "mat.alien_steel",
        namePl: "Blacha obca",
        unit: "kg",
        quantity: 10,
      },
    ],
  },
};
const badMat = analyzeMaterialsFromExecution(badExec);
ok(
  "incompatible detected",
  badMat.lines.some((l) => l.materialKey === "mat.alien_steel" && l.conformity === "niezgodny"),
);
ok(
  "incompatible gap",
  badMat.gapsAndRisks.some((g) => g.kind === "incompatible"),
);
ok("incompatible blocker", badMat.contract.blokery.some((b) => b.kind === "incompatible"));

// No execution basis
const emptyMat = analyzeMaterialsFromExecution({
  contract: exec.contract,
  selection: null,
  technologyDecision: null,
  plan: null,
  bundle: null,
  bom: null,
  gapsAndRisks: [],
  pack: null,
});
ok("empty blocker", emptyMat.contract.blokery.some((b) => b.code === "MAT_NO_EXECUTION"));
ok("empty not_aligned", emptyMat.contract.zgodnoscZRozumieniemWykonania === "not_aligned");
ok("empty niekompletny", emptyMat.completeness === "niekompletny");

const vOnly = proposeMaterialVariants(["mat.eps_graph"]);
ok("variants helper", vOnly.length === 1 && vOnly[0].options.length === 4);

console.log(`\nALL PASS (${passed})\n`);
