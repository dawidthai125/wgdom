/**
 * Ekspert Kosztu P0 — unit tests.
 * npx vite-node scripts/test-cost-expert-p0.mjs
 */
import assert from "node:assert/strict";
import { analyzeRealCostFromExperts } from "../src/lib/cost-expert/index.ts";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import { analyzeMaterialsFromExecution } from "../src/lib/material-expert/index.ts";
import {
  analyzeMarketPricingFromMaterials,
  DEFAULT_MATERIAL_MARKET_MAP,
} from "../src/lib/pricing-expert/index.ts";
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

function snap(price, origin, updatedAt, confidence = 0.85) {
  return {
    price,
    regionCode: "dolnyslask",
    coverage: "full",
    updatedAt,
    confidence,
    origin,
  };
}

function makeWork(id, price) {
  const freshAt = "2026-07-15T00:00:00.000Z";
  return {
    id,
    tradeId: "POZOSTALE",
    namePl: id,
    unit: "m2",
    companyPricePln: 999,
    marketQuotes: {
      kb_pl: { dolnyslask: snap(price, "kb_pl", freshAt) },
      interbud: { dolnyslask: snap(price * 1.1, "interbud", freshAt, 0.7) },
      sekocenbud: { dolnyslask: snap(price * 1.05, "sekocenbud", freshAt) },
      wgdom: { dolnyslask: snap(price * 0.98, "wgdom", freshAt) },
    },
    updatedAt: freshAt,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function baseLine() {
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
  };
}

function baseDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: "t-cost-p0",
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

function companyRo() {
  return {
    purchaseByMaterialKey: {
      "mat.eps_graph": { unitPricePln: 45 },
      "mat.glue_etics": { unitPricePln: 3.2 },
      "mat.mesh": { unitPricePln: 4.5 },
      "mat.render": { unitPricePln: 2.8 },
    },
    defaultLaborPlnPerHour: 65,
    equipmentRateByKey: {
      "eq.scaffold": { unitPricePln: 8 },
      "eq.mixer": { unitPricePln: 120 },
    },
    auxiliaryPctOfDirect: 0.03,
    internalOverheadPct: 0.08,
  };
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log("\n=== Cost Expert P0 ===\n");
resetTf();

const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
const worksById = new Map();
for (const e of DEFAULT_MATERIAL_MARKET_MAP) {
  worksById.set(e.workId, makeWork(e.workId, 50));
}

const exec = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
const mat = analyzeMaterialsFromExecution(exec);
const priced = analyzeMarketPricingFromMaterials(mat, {
  catalog: { worksById },
  nowMs,
  computedAtIso: new Date(nowMs).toISOString(),
});

const cost = analyzeRealCostFromExperts({
  execution: exec,
  materials: mat,
  pricing: priced,
  company: companyRo(),
});

ok("completeness ok", cost.completenessOk === true);
ok("realCostPln", cost.breakdown.realCostPln != null && cost.breakdown.realCostPln > 0);
ok("materials purchase", cost.breakdown.materialsPurchasePln != null);
ok("labour", cost.breakdown.labourPln != null);
ok("equipment", cost.breakdown.equipmentPln != null);
ok("auxiliary", cost.breakdown.auxiliaryPln != null);
ok("overhead", cost.breakdown.internalOverheadPln != null);
ok(
  "real = direct+aux+oh",
  Math.abs(
    cost.breakdown.realCostPln -
      (cost.breakdown.directPln + cost.breakdown.auxiliaryPln + cost.breakdown.internalOverheadPln),
  ) < 0.02,
);
ok("contract.co", cost.contract.co.includes("Real Cost"));
ok("basis has EE ME PE", cost.contract.naPodstawieCzego.includes("Execution"));
ok("pewnosc", ["high", "medium", "low"].includes(cost.contract.pewnosc));
ok("comparative notes", cost.comparative.notesPl.length >= 1);
ok("market not in real identity", !cost.contract.dlaczego.toLowerCase().includes("market wchodzi"));
ok(
  "market totals separate",
  cost.comparative.marketMaterialsPln != null &&
    cost.comparative.purchaseMaterialsPln != null,
);
ok("handoff true", cost.handoffToOfferExpert === true);
ok("payload", cost.offerHandoffPayload?.realCostPln === cost.breakdown.realCostPln);
ok("no bid in json", !JSON.stringify(cost).includes("recommendedBid"));
ok("no offer module", !JSON.stringify(cost).includes("analyzeOffer"));

// Market numbers must not equal injected into real as sole source — purchase used
const eps = cost.materialLines.find((m) => m.materialKey === "mat.eps_graph");
ok("purchase unit 45", eps && eps.purchaseUnitPln === 45);
ok("market present separately", eps && eps.marketUnitPln != null && eps.marketUnitPln !== 45);

// Blocked path — no purchase
const blocked = analyzeRealCostFromExperts({
  execution: exec,
  materials: mat,
  pricing: priced,
  company: { ...companyRo(), purchaseByMaterialKey: {} },
});
ok("blocked completeness", blocked.completenessOk === false);
ok("blocked real null", blocked.breakdown.realCostPln == null);
ok("blocked handoff false", blocked.handoffToOfferExpert === false);
ok("handoff blockers", blocked.handoffBlockersPl.length >= 1);

console.log(`\nALL PASS (${passed})\n`);
