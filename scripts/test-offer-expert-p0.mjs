/**
 * Ekspert Oferty P0 — unit tests.
 * npx vite-node scripts/test-offer-expert-p0.mjs
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
  analyzeOfferFromCost,
  computeOfferPriceFromRealCost,
  defaultOfferStrategyParams,
} from "../src/lib/offer-expert/index.ts";
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
    tenderId: "t-offer-p0",
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

console.log("\n=== Offer Expert P0 ===\n");
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

ok("cost handoff ready", cost.handoffToOfferExpert === true && cost.offerHandoffPayload != null);

const real = cost.offerHandoffPayload.realCostPln;
const params = defaultOfferStrategyParams();
const manual = computeOfferPriceFromRealCost(real, params.rekomendowany);

const offer = analyzeOfferFromCost(cost);

ok("primary exists", offer.primaryRecommendation != null);
ok("primary strategy rekomendowany", offer.primaryRecommendation.strategy === "rekomendowany");
ok(
  "primary = manual formula",
  offer.primaryRecommendation.offerPricePln === manual.offerPricePln,
);
ok(
  "offer = real + margin + risk",
  Math.abs(
    offer.primaryRecommendation.offerPricePln -
      (manual.realCostPln + manual.marginPln + manual.riskPln),
  ) < 0.02,
);
ok("real cost unchanged", offer.primaryRecommendation.breakdown.realCostPln === real);
ok("scenarios 3", offer.scenarios.length === 3);
ok(
  "scenario kinds",
  offer.scenarios.map((s) => s.strategy).join(",") === "agresywny,rekomendowany,bezpieczny",
);
ok(
  "aggressive < recommended < safe",
  offer.scenarios[0].breakdown.offerPricePln <
    offer.scenarios[1].breakdown.offerPricePln &&
    offer.scenarios[1].breakdown.offerPricePln <
      offer.scenarios[2].breakdown.offerPricePln,
);
ok(
  "primary not overridden by aggressive",
  offer.primaryRecommendation.offerPricePln ===
    offer.scenarios.find((s) => s.strategy === "rekomendowany").breakdown.offerPricePln,
);
ok("signal true", offer.signalToDecisionMaker === true);
ok("payload", offer.decisionMakerPayload?.offerPricePln === offer.primaryRecommendation.offerPricePln);
ok("contract.co", offer.contract.co.includes("Rekomendowana cena"));
ok("contract dlaczego Real", offer.contract.dlaczego.includes("Real Cost"));
ok("basis CostExpert", offer.contract.naPodstawieCzego.includes("CostExpertAnalysisResult"));
ok("pewnosc", ["high", "medium", "low"].includes(offer.contract.pewnosc));
ok("aligned or partial", ["aligned", "partial"].includes(offer.contract.zgodnoscZRozumieniemWykonania));
ok("no EE as calc source in basis", !offer.contract.naPodstawieCzego.includes("ExecutionExpert"));
ok("no bidCalculator field", !JSON.stringify(offer).includes("bidCalculator"));
ok("no OfferBoq write fields", !JSON.stringify(offer).includes("offerBoq"));
ok("no recommendedBid", !JSON.stringify(offer).includes("recommendedBid"));

// Blocked cost → no offer
const blockedCost = analyzeRealCostFromExperts({
  execution: exec,
  materials: mat,
  pricing: priced,
  company: { ...companyRo(), purchaseByMaterialKey: {} },
});
const blockedOffer = analyzeOfferFromCost(blockedCost);
ok("blocked no primary", blockedOffer.primaryRecommendation == null);
ok("blocked no signal", blockedOffer.signalToDecisionMaker === false);
ok("blocked scenarios empty", blockedOffer.scenarios.length === 0);
ok("blocked not_aligned", blockedOffer.contract.zgodnoscZRozumieniemWykonania === "not_aligned");
ok("blocked OFFER_NO_HANDOFF", blockedOffer.contract.blokery.some((b) => b.code === "OFFER_NO_HANDOFF"));

console.log(`\nALL PASS (${passed})\n`);
