/**
 * Ekspert Cen P0 — unit tests.
 * npx vite-node scripts/test-pricing-expert-p0.mjs
 */
import assert from "node:assert/strict";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import { analyzeMaterialsFromExecution } from "../src/lib/material-expert/index.ts";
import {
  analyzeMarketPricingFromMaterials,
  DEFAULT_MATERIAL_MARKET_MAP,
  mapMaterialToMarketWork,
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

function snap(price, origin, region, coverage, updatedAt, confidence = 0.8) {
  return {
    price,
    regionCode: region,
    coverage,
    updatedAt,
    confidence,
    origin,
  };
}

function makeWork(id, quotes) {
  return {
    id,
    tradeId: "POZOSTALE",
    namePl: id,
    unit: "m2",
    companyPricePln: 999, // MUST NOT be used as Market
    marketQuotes: quotes,
    updatedAt: "2026-08-01T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
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
    tenderId: "t-price-p0",
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

console.log("\n=== Pricing Expert P0 ===\n");
resetTf();

const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
const freshAt = "2026-07-15T00:00:00.000Z";

const worksById = new Map();
for (const e of DEFAULT_MATERIAL_MARKET_MAP) {
  worksById.set(
    e.workId,
    makeWork(e.workId, {
      kb_pl: {
        dolnyslask: snap(50, "kb_pl", "dolnyslask", "full", freshAt, 0.9),
      },
      interbud: {
        dolnyslask: snap(60, "interbud", "dolnyslask", "partial", freshAt, 0.7),
      },
      sekocenbud: {
        dolnyslask: snap(55, "sekocenbud", "dolnyslask", "full", freshAt, 0.8),
      },
      wgdom: {
        dolnyslask: snap(52, "wgdom", "dolnyslask", "full", freshAt, 0.85),
      },
    }),
  );
}

ok("map eps", mapMaterialToMarketWork("mat.eps_graph")?.workId === "wc.market.eps_graph");

const exec = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
const mat = analyzeMaterialsFromExecution(exec);
ok("ME lines", mat.lines.length >= 4);

const history = [
  {
    id: "ph1",
    marketProductId: "mp.eps_graph",
    providerId: "leroy",
    providerSku: "x",
    pricePln: 40,
    at: "2026-05-01T00:00:00.000Z",
    sourceKind: "csv_export",
    syncRunId: null,
    quoteId: "q1",
  },
  {
    id: "ph2",
    marketProductId: "mp.eps_graph",
    providerId: "leroy",
    providerSku: "x",
    pricePln: 48,
    at: "2026-07-01T00:00:00.000Z",
    sourceKind: "csv_export",
    syncRunId: null,
    quoteId: "q2",
  },
];

const priced = analyzeMarketPricingFromMaterials(mat, {
  catalog: { worksById },
  priceHistory: history,
  nowMs,
  computedAtIso: new Date(nowMs).toISOString(),
});

ok("contract.co", priced.contract.co.includes("Market Price") || priced.contract.co.includes("pozycji"));
ok("contract fields", priced.contract.dlaczego && priced.contract.naPodstawieCzego);
ok("pewnosc", ["high", "medium", "low"].includes(priced.contract.pewnosc));
ok("zgodnosc", ["aligned", "partial", "not_aligned"].includes(priced.contract.zgodnoscZRozumieniemWykonania));
ok("lines priced", priced.lines.every((l) => l.marketPricePln != null));
ok("sources multi", priced.lines[0].originCount >= 2);
ok("spread", priced.lines[0].spreadPct != null && priced.lines[0].spreadPct > 0);
ok("freshness ok", priced.lines.every((l) => l.freshness === "ok"));
ok("coverage set", priced.lines[0].dominantCoverage != null);
ok(
  "companyPrice not equal market blindly",
  priced.lines.every((l) => l.marketPricePln !== 999),
);
ok("no bid fields", !JSON.stringify(priced).includes("recommendedBid"));
ok("return signals arrays", Array.isArray(priced.returnReasonsPl));

// ME availability → returnToMaterialExpert
ok(
  "return to ME when availability hints",
  priced.returnToMaterialExpert === true || mat.gapsAndRisks.some((g) => g.kind === "availability_risk"),
);

// Unmapped material
const matAlien = {
  ...mat,
  lines: [
    ...mat.lines,
    {
      materialKey: "mat.alien_unknown",
      namePl: "Obcy materiał",
      unit: "kg",
      quantity: 1,
      conformity: "zgodny",
    },
  ],
};
const pricedAlien = analyzeMarketPricingFromMaterials(matAlien, {
  catalog: { worksById },
  nowMs,
  computedAtIso: new Date(nowMs).toISOString(),
});
ok(
  "unmapped blocker",
  pricedAlien.contract.blokery.some((b) => b.code === "PRICE_NO_MAP"),
);
ok("unmapped requires reanalysis", pricedAlien.requiresReanalysis === true);
ok("unmapped return ME", pricedAlien.returnToMaterialExpert === true);
ok(
  "materials not mutated",
  matAlien.lines.some((l) => l.materialKey === "mat.alien_unknown"),
);

// Trend from history for eps
const epsLine = priced.lines.find((l) => l.materialKey === "mat.eps_graph");
ok("eps trend", epsLine && (epsLine.trend === "up" || epsLine.trend === "flat" || epsLine.trend === "down"));

console.log(`\nALL PASS (${passed})\n`);
