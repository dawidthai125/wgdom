/**
 * PRICE-INTELLIGENCE-01 P3.1 — WGDOM approved ETICS prices + company knowledge cloud mirror.
 * npx vite-node scripts/test-price-intelligence-01-p3.1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  collectMaterialPurchaseAliases,
  projectPurchaseByMaterialKey,
} from "../src/lib/chief-wire-adapters/index.ts";
import {
  DATA_KEYS,
  BOOTSTRAP_DEFERRED_KEYS,
  coerceValueForCloudKey,
  mergeDataKey,
} from "../src/lib/cloud-sync.ts";
import { validateCostExpertInputs } from "../src/lib/cost-expert/completeness.ts";
import { assembleRealCost } from "../src/lib/cost-expert/assemble.ts";
import { analyzeRealCostFromExperts } from "../src/lib/cost-expert/analyze.ts";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import { analyzeMaterialsFromExecution } from "../src/lib/material-expert/index.ts";
import { analyzeOfferFromCost } from "../src/lib/offer-expert/index.ts";
import {
  applyPi31ApprovedPurchaseToKnowledge,
  applyPi31ApprovedQuotesToWorkCatalog,
  assertPi31MaterialMapAligned,
  buildPi31EquipmentRateByKey,
  PI31_APPROVED_MATERIALS,
  PI31_WGDOM_CONFIDENCE,
} from "../src/lib/price-intelligence/index.ts";
import {
  analyzeMarketPricingFromMaterials,
  resolveMaterialMarketCoverage,
} from "../src/lib/pricing-expert/index.ts";
import {
  applyOfferBoqPricing,
} from "../src/lib/tender-offer-boq-pricing-engine.ts";
import {
  OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
  OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
  mergeCompanyKnowledgeStore,
  normalizeCompanyKnowledgeStore,
} from "../src/lib/tender-offer-boq-company-knowledge.ts";
import { indexWorksById } from "../src/lib/work-catalog/index.ts";
import { defaultWorkCatalogStoreForPersist } from "../src/lib/work-catalog/work-catalog-store.ts";
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

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${a} !== ${b}`);
  passed += 1;
  console.log(`PASS ${name}`);
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
    editedFields: [],
  };
}

function baseDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: "t-pi-31",
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

console.log("\n=== PRICE-INTELLIGENCE-01 P3.1 ===\n");

assertPi31MaterialMapAligned();
ok("A0 P2 catalogWorkId alignment", true);

resetTf();
const emptyKn = normalizeCompanyKnowledgeStore(null);
const knApplied = applyPi31ApprovedPurchaseToKnowledge(emptyKn);
eq("A purchase upsert count", knApplied.entriesUpserted, 4);
ok("A knowledge changed", knApplied.changed);
const purchase = projectPurchaseByMaterialKey(knApplied.store);
const keys = PI31_APPROVED_MATERIALS.map((m) => m.materialKey);
eq("A Purchase 4/4", keys.filter((k) => purchase[k]?.unitPricePln > 0).length, 4);
for (const m of PI31_APPROVED_MATERIALS) {
  eq(`A ${m.materialKey} price`, purchase[m.materialKey].unitPricePln, m.purchaseUnitPricePln);
}

const cat0 = defaultWorkCatalogStoreForPersist();
const catApplied = applyPi31ApprovedQuotesToWorkCatalog(cat0);
ok("C catalog changed", catApplied.changed);
eq("C works upserted (unique×regions)", catApplied.worksUpserted, 8); // 4 works × 2 regions
const worksById = indexWorksById([
  ...catApplied.store.catalogs.wroclaw.works,
  ...catApplied.store.catalogs.dolnyslask.works,
]);
let marketHit = 0;
for (const m of PI31_APPROVED_MATERIALS) {
  const cov = resolveMaterialMarketCoverage(m.materialKey, worksById);
  ok(`B ${m.materialKey} → catalogWorkId`, cov?.work?.id === m.catalogWorkId);
  const snap = cov?.work?.marketQuotes?.wgdom?.wroclaw;
  ok(`C ${m.materialKey} has wgdom quote`, snap?.price === m.marketQuotePln);
  ok(`C ${m.materialKey} origin wgdom`, snap?.origin === "wgdom");
  ok(`C ${m.materialKey} confidence medium`, snap?.confidence === PI31_WGDOM_CONFIDENCE);
  ok(`C ${m.materialKey} coverage indicative`, snap?.coverage === "indicative");
  if (snap?.price > 0) marketHit += 1;
}
eq("C Market Quotes 4/4", marketHit, 4);

const emptyPurchase = projectPurchaseByMaterialKey(emptyKn);
eq("D empty Purchase 0/4", keys.filter((k) => emptyPurchase[k]?.unitPricePln > 0).length, 0);
const execEmpty = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
const meEmpty = analyzeMaterialsFromExecution(execEmpty);
const peEmpty = analyzeMarketPricingFromMaterials(meEmpty, {
  catalog: { worksById: new Map() },
});
const completenessEmpty = validateCostExpertInputs({
  execution: execEmpty,
  materials: meEmpty,
  pricing: peEmpty,
  company: {
    purchaseByMaterialKey: {},
    defaultLaborPlnPerHour: 65,
    auxiliaryPctOfDirect: 0.1,
    internalOverheadPct: 0,
    equipmentRateByKey: buildPi31EquipmentRateByKey(),
  },
});
ok(
  "D PRICE DATA MISSING in COST_NO_PURCHASE",
  completenessEmpty.blockers.some(
    (b) => b.code === "COST_NO_PURCHASE" && /PRICE DATA MISSING/.test(b.messagePl),
  ),
);

const priced = applyOfferBoqPricing(baseDoc([baseLine()]), {
  companyPriceByWorkId: { "cw.etics.boards": 120 },
});
ok("E OfferBoq pricing regression", priced.totals.pricedLineCount >= 1);

ok(
  "F DATA_KEYS includes company knowledge",
  DATA_KEYS.includes(OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY),
);
ok(
  "F BOOTSTRAP_DEFERRED includes company knowledge",
  BOOTSTRAP_DEFERRED_KEYS.includes(OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY),
);
const coerced = coerceValueForCloudKey(OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY, null);
ok("F coerce empty → object store (not [])", !Array.isArray(coerced) && coerced?.schemaVersion === 1);
const mergedKn = mergeDataKey(
  OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
  knApplied.store,
  normalizeCompanyKnowledgeStore(null),
);
eq("F merge keeps 4 entries", mergedKn.entries.length, 4);
const union = mergeCompanyKnowledgeStore(
  knApplied.store,
  normalizeCompanyKnowledgeStore({
    schemaVersion: OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
    updatedAt: "2026-01-01T00:00:00.000Z",
    entries: [
      {
        ...knApplied.store.entries[0],
        entryId: "ck_extra_p31",
        namePl: "Extra",
        nameKey: "extra",
        lastUnitPricePln: 1,
        avgUnitPricePln: 1,
      },
    ],
  }),
);
ok("F merge union entryId", union.entries.length >= 5);

const aliases = collectMaterialPurchaseAliases();
ok("G aliases still include ETICS", aliases.some((a) => a.materialKey === "mat.eps_graph"));

const publishSrc = readFileSync(
  resolve("src/lib/market-sync/publish.ts"),
  "utf8",
);
ok("G Market Sync publish still uses commitMarketQuotesImport", /commitMarketQuotesImport/.test(publishSrc));
const applySrc = readFileSync(
  resolve("src/lib/price-intelligence/apply-etics-approved-seed.ts"),
  "utf8",
);
ok("G P3.1 does not invent DIY origins", !/castorama|leroy|kb_pl|sekocenbud/i.test(applySrc));
ok("G P3.1 origin wgdom only", /origin:\s*"wgdom"/.test(applySrc));

resetTf();
const exec = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
const me = analyzeMaterialsFromExecution(exec);
const pe = analyzeMarketPricingFromMaterials(me, {
  catalog: { worksById },
});
eq("Pipeline Market priced lines", pe.lines.filter((l) => l.marketPricePln != null).length, me.lines.length);
const company = {
  purchaseByMaterialKey: purchase,
  defaultLaborPlnPerHour: 65,
  auxiliaryPctOfDirect: 0.08,
  internalOverheadPct: 0,
  equipmentRateByKey: buildPi31EquipmentRateByKey(),
};
const cost = analyzeRealCostFromExperts({
  execution: exec,
  materials: me,
  pricing: pe,
  company,
});
ok("Pipeline Real Cost", cost.breakdown.realCostPln != null && cost.breakdown.realCostPln > 0);
ok("Pipeline Cost handoff", cost.handoffToOfferExpert === true);
const offer = analyzeOfferFromCost(cost);
ok("Pipeline Offer handoffOk", offer.handoffOk === true || offer.signalToDecisionMaker === true || offer.primaryRecommendation != null);
ok(
  "Pipeline Offer recommended",
  offer.primaryRecommendation != null && offer.primaryRecommendation.offerPricePln > 0,
);

const assembled = assembleRealCost({ execution: exec, pricing: pe, company });
ok("Pipeline equipment filled", assembled.equipmentLines.every((e) => e.totalPln != null));

console.log(`\n=== P3.1 PASS ${passed} · Real Cost ${cost.breakdown.realCostPln} PLN ===\n`);
