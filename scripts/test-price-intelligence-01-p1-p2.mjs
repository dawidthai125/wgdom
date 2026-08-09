/**
 * PRICE-INTELLIGENCE-01 Wave 1 — P1 Purchase materialKey + P2 Quotes coverage.
 * npx vite-node scripts/test-price-intelligence-01-p1-p2.mjs
 */
import assert from "node:assert/strict";
import {
  collectMaterialPurchaseAliases,
  projectPurchaseByMaterialKey,
} from "../src/lib/chief-wire-adapters/index.ts";
import { validateCostExpertInputs } from "../src/lib/cost-expert/completeness.ts";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import { analyzeMaterialsFromExecution } from "../src/lib/material-expert/index.ts";
import {
  analyzeMarketPricingFromMaterials,
  mapMaterialToMarketWork,
  resolveMaterialMarketCoverage,
} from "../src/lib/pricing-expert/index.ts";
import {
  applyOfferBoqPricing,
} from "../src/lib/tender-offer-boq-pricing-engine.ts";
import {
  buildCompanyKnowledgeEntryId,
  buildCompanyKnowledgeNameKey,
  OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
} from "../src/lib/tender-offer-boq-company-knowledge.ts";
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

function snap(price, origin = "wgdom", updatedAt = "2026-07-15T00:00:00.000Z") {
  return {
    price,
    regionCode: "dolnyslask",
    coverage: "full",
    updatedAt,
    confidence: 0.85,
    origin,
  };
}

function makeWork(id, price, namePl = id) {
  return {
    id,
    tradeId: "POZOSTALE",
    namePl,
    unit: "m2",
    companyPricePln: 999,
    marketQuotes: {
      wgdom: { dolnyslask: snap(price) },
    },
    updatedAt: "2026-07-15T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function makeWorkNoQuotes(id) {
  return {
    ...makeWork(id, 1),
    marketQuotes: undefined,
    companyPricePln: 50,
  };
}

function knowledgeEntry(namePl, unit, price) {
  return {
    entryId: buildCompanyKnowledgeEntryId(namePl, "material", unit),
    namePl,
    nameKey: buildCompanyKnowledgeNameKey(namePl),
    category: "material",
    unit,
    occurrenceCount: 2,
    approvedCount: 2,
    changedCount: 0,
    lastUnitPricePln: price,
    avgUnitPricePln: price,
    lastUsedAt: "2026-08-01T00:00:00.000Z",
    lastSourceKind: "user",
    lastSourceLabelPl: "user",
    primarilyFromUser: true,
    observations: [],
  };
}

function emptyStore(entries = []) {
  return {
    schemaVersion: OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
    updatedAt: "2026-08-09T00:00:00.000Z",
    entries,
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
    tenderId: "t-pi-01",
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

console.log("\n=== PRICE-INTELLIGENCE-01 P1/P2 ===\n");
resetTf();

const aliases = collectMaterialPurchaseAliases();
ok("aliases include eps", aliases.some((a) => a.materialKey === "mat.eps_graph"));

// ——— A: materialKey → Purchase match ———
const storeA = emptyStore([
  knowledgeEntry("Płyta EPS grafit", "m2", 42.5),
  knowledgeEntry("Klej do ETICS", "kg", 3.1),
]);
const purchA = projectPurchaseByMaterialKey(storeA);
ok("A purchase mat.eps_graph", purchA["mat.eps_graph"]?.unitPricePln === 42.5);
ok("A purchase mat.glue_etics", purchA["mat.glue_etics"]?.unitPricePln === 3.1);
ok("A not keyed by entryId alone", purchA[buildCompanyKnowledgeEntryId("Płyta EPS grafit", "material", "m2")] == null);

const execA = analyzeExecutionFromOfferBoq(
  baseDoc([baseLine()]),
  defaultExecutionExpertBusinessProfile(),
);
const matA = analyzeMaterialsFromExecution(execA);
const peEmpty = analyzeMarketPricingFromMaterials(matA, {
  catalog: { worksById: new Map() },
  nowMs: Date.parse("2026-08-07T12:00:00.000Z"),
  computedAtIso: "2026-08-07T12:00:00.000Z",
});
const companyA = {
  purchaseByMaterialKey: purchA,
  defaultLaborPlnPerHour: 65,
  equipmentRateByKey: {},
  auxiliaryPctOfDirect: 0.03,
  internalOverheadPct: 0,
};
const completeA = validateCostExpertInputs({
  execution: execA,
  materials: matA,
  pricing: peEmpty,
  company: companyA,
});
ok("A not COST_NO_PURCHASE when mapped", !completeA.blockers.some((b) => b.code === "COST_NO_PURCHASE"));

// ——— B: brak Purchase → PRICE DATA MISSING / COST_NO_PURCHASE ———
const purchB = projectPurchaseByMaterialKey(emptyStore([]));
ok("B empty map", Object.keys(purchB).length === 0);
const completeB = validateCostExpertInputs({
  execution: execA,
  materials: matA,
  pricing: peEmpty,
  company: { ...companyA, purchaseByMaterialKey: purchB },
});
ok("B critical COST_NO_PURCHASE", completeB.ok === false);
ok(
  "B PRICE DATA MISSING text",
  completeB.blockers.some(
    (b) => b.code === "COST_NO_PURCHASE" && String(b.messagePl).includes("PRICE DATA MISSING"),
  ),
);

// ——— C: materialKey → catalogWorkId → marketQuotes ———
ok("C map seed still present", mapMaterialToMarketWork("mat.eps_graph")?.workId === "wc.market.eps_graph");
const worksReal = new Map([
  ["cw.etics.boards", makeWork("cw.etics.boards", 55, "Płyta EPS grafit system")],
]);
const resolvedC = resolveMaterialMarketCoverage("mat.eps_graph", worksReal);
ok("C resolves to cw.etics.boards", resolvedC?.work.id === "cw.etics.boards");
ok("C has quotes price path", resolvedC?.work.marketQuotes != null);

const pricedC = analyzeMarketPricingFromMaterials(matA, {
  catalog: { worksById: worksReal },
  nowMs: Date.parse("2026-08-07T12:00:00.000Z"),
  computedAtIso: "2026-08-07T12:00:00.000Z",
});
const epsC = pricedC.lines.find((l) => l.materialKey === "mat.eps_graph");
ok("C marketPrice from real work", epsC?.marketPricePln != null && epsC.marketPricePln > 0);
ok("C mappedWorkId real", epsC?.mappedWorkId === "cw.etics.boards");

// ——— D: brak Quotes → NO FALSE PRICE ———
const worksBare = new Map([
  ["cw.etics.boards", makeWorkNoQuotes("cw.etics.boards")],
  ["wc.market.eps_graph", makeWorkNoQuotes("wc.market.eps_graph")],
]);
const resolvedD = resolveMaterialMarketCoverage("mat.eps_graph", worksBare);
ok("D no resolve without quotes", resolvedD == null);
const pricedD = analyzeMarketPricingFromMaterials(matA, {
  catalog: { worksById: worksBare },
  nowMs: Date.parse("2026-08-07T12:00:00.000Z"),
  computedAtIso: "2026-08-07T12:00:00.000Z",
});
ok(
  "D no false market prices",
  pricedD.lines.every((l) => l.marketPricePln == null),
);
ok(
  "D companyPrice not used as market",
  pricedD.lines.every((l) => l.marketPricePln !== 50 && l.marketPricePln !== 999),
);

// ——— E: OfferBoq path still works ———
const emptyBoq = baseDoc([
  {
    ...baseLine(),
    lineId: "LE",
    description: "Roboty ogólnobudowlane — test regresji OfferBoq",
    catalogWorkId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "—", detailPl: null, updatedAt: null },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "—", detailPl: null, updatedAt: null },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "—", detailPl: null, updatedAt: null },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "test",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
  },
]);
const pricedBoq = applyOfferBoqPricing(emptyBoq, {
  laborRatePlnPerHour: 50,
  regionCode: "dolnyslask",
});
ok("E OfferBoq pricing returns doc", pricedBoq != null && pricedBoq.schemaVersion >= 1);
ok("E OfferBoq totals object", pricedBoq.totals != null);

console.log(`\nALL PASS (${passed})\n`);
