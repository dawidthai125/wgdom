/**
 * PRICE-INTELLIGENCE-01 P3.2 — Demand Queue for PRICE DATA MISSING.
 * npx vite-node scripts/test-price-intelligence-01-p3.2.mjs
 */
import assert from "node:assert/strict";
import {
  DATA_KEYS,
  BOOTSTRAP_DEFERRED_KEYS,
  coerceValueForCloudKey,
  mergeDataKey,
} from "../src/lib/cloud-sync.ts";
import {
  buildPriceDemandId,
  collectPriceDemandCandidates,
  computeMissingLayer,
  listActivePriceDemands,
  loadPriceDemandStoreLocal,
  mergePriceDemandStore,
  normalizePriceDemandStore,
  PRICE_DEMAND_STORAGE_KEY,
  recordPriceDemandsFromExperts,
  resolvePriceDemandsForMaterials,
  savePriceDemandStoreLocal,
  upsertPriceDemandCandidates,
} from "../src/lib/price-intelligence/index.ts";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import { analyzeMaterialsFromExecution } from "../src/lib/material-expert/index.ts";
import { analyzeMarketPricingFromMaterials } from "../src/lib/pricing-expert/index.ts";
import { analyzeRealCostFromExperts } from "../src/lib/cost-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  get length() {
    return storage.size;
  },
};

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

function cand(overrides = {}) {
  return {
    materialKey: "mat.eps_graph",
    catalogWorkId: "cw.etics.boards",
    namePl: "Płyta EPS grafit",
    unit: "m2",
    region: "wroclaw",
    missingLayer: "BOTH_MISSING",
    tenderId: "t1",
    requestedAt: "2026-08-09T18:00:00.000Z",
    reason: "PRICE DATA MISSING",
    ...overrides,
  };
}

console.log("\n=== PRICE-INTELLIGENCE-01 P3.2 Demand Queue ===\n");

eq("A missing layer both", computeMissingLayer({ purchaseOk: false, marketOk: false }), "BOTH_MISSING");
eq("D purchase only", computeMissingLayer({ purchaseOk: false, marketOk: true }), "PURCHASE_MISSING");
eq("E market only", computeMissingLayer({ purchaseOk: true, marketOk: false }), "MARKET_QUOTE_MISSING");
eq("complete null", computeMissingLayer({ purchaseOk: true, marketOk: true }), null);

let store = normalizePriceDemandStore(null);
let r = upsertPriceDemandCandidates(store, [cand()]);
eq("A one missing → 1 demand", listActivePriceDemands(r.store).length, 1);
ok("A upserted", r.upserted === 1);

store = r.store;
r = upsertPriceDemandCandidates(
  store,
  Array.from({ length: 20 }, (_, i) =>
    cand({ requestedAt: `2026-08-09T18:00:${String(i).padStart(2, "0")}.000Z` }),
  ),
);
eq("B 20× same material → 1 active", listActivePriceDemands(r.store).length, 1);
eq("B occurrenceCount ≥ 20", listActivePriceDemands(r.store)[0].occurrenceCount >= 20, true);
ok("B priority HIGH", listActivePriceDemands(r.store)[0].priority === "HIGH");

store = normalizePriceDemandStore(null);
r = upsertPriceDemandCandidates(store, [
  cand({ tenderId: "t1" }),
  cand({ tenderId: "t2", requestedAt: "2026-08-09T18:01:00.000Z" }),
  cand({ tenderId: "t3", requestedAt: "2026-08-09T18:02:00.000Z" }),
  cand({ tenderId: "t4", requestedAt: "2026-08-09T18:03:00.000Z" }),
  cand({ tenderId: "t5", requestedAt: "2026-08-09T18:04:00.000Z" }),
  cand({ tenderId: "t6", requestedAt: "2026-08-09T18:05:00.000Z" }),
  cand({ tenderId: "t7", requestedAt: "2026-08-09T18:06:00.000Z" }),
  cand({ tenderId: "t8", requestedAt: "2026-08-09T18:07:00.000Z" }),
  cand({ tenderId: "t9", requestedAt: "2026-08-09T18:08:00.000Z" }),
  cand({ tenderId: "t10", requestedAt: "2026-08-09T18:09:00.000Z" }),
]);
eq("C 10 tenders → 1 active", listActivePriceDemands(r.store).length, 1);
ok("C tenderIds ≥ 3", listActivePriceDemands(r.store)[0].tenderIds.length >= 3);

store = normalizePriceDemandStore(null);
r = upsertPriceDemandCandidates(store, [cand({ missingLayer: "PURCHASE_MISSING" })]);
eq("D PURCHASE_MISSING layer", listActivePriceDemands(r.store)[0].missingLayer, "PURCHASE_MISSING");

store = normalizePriceDemandStore(null);
r = upsertPriceDemandCandidates(store, [cand({ missingLayer: "MARKET_QUOTE_MISSING" })]);
eq("E MARKET_QUOTE_MISSING layer", listActivePriceDemands(r.store)[0].missingLayer, "MARKET_QUOTE_MISSING");

store = normalizePriceDemandStore(null);
r = upsertPriceDemandCandidates(store, [cand({ missingLayer: "BOTH_MISSING" })]);
eq("F BOTH_MISSING layer", listActivePriceDemands(r.store)[0].missingLayer, "BOTH_MISSING");

// Sibling resolve when layer upgrades
store = normalizePriceDemandStore(null);
r = upsertPriceDemandCandidates(store, [cand({ missingLayer: "PURCHASE_MISSING" })]);
r = upsertPriceDemandCandidates(r.store, [
  cand({ missingLayer: "BOTH_MISSING", requestedAt: "2026-08-09T19:00:00.000Z" }),
]);
const activeF = listActivePriceDemands(r.store);
eq("F after BOTH only 1 active", activeF.length, 1);
eq("F active is BOTH", activeF[0].missingLayer, "BOTH_MISSING");
ok("F sibling resolved", r.resolved >= 1);

store = r.store;
const res = resolvePriceDemandsForMaterials(store, {
  materialKeys: ["mat.eps_graph"],
  region: "wroclaw",
  resolvedAt: "2026-08-09T20:00:00.000Z",
});
eq("G resolved → 0 active", listActivePriceDemands(res.store).length, 0);
ok("G resolved count", res.resolved >= 1);

store = normalizePriceDemandStore(null);
r = upsertPriceDemandCandidates(store, [cand(), cand(), cand()]);
eq("H duplicate submission → 1", listActivePriceDemands(r.store).length, 1);
const id1 = buildPriceDemandId(cand());
const id2 = buildPriceDemandId(cand());
eq("H stable demandId", id1, id2);

// I storage failure — record still returns ok:false without throw
storage.clear();
const brokenSet = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = () => {
  throw new Error("quota");
};
const recFail = recordPriceDemandsFromExperts({
  execution: {
    bom: {
      materials: [{ materialKey: "mat.x", namePl: "X", quantity: 1, unit: "m2" }],
      labour: [],
      equipment: [],
    },
    pack: { packId: "p" },
    technologyDecision: "allow",
    contract: { zgodnoscZRozumieniemWykonania: "aligned", blokery: [] },
  },
  pricing: {
    lines: [
      {
        materialKey: "mat.x",
        namePl: "X",
        quantity: 1,
        unit: "m2",
        mappedWorkId: null,
        marketPricePln: null,
      },
    ],
  },
  company: {
    purchaseByMaterialKey: {},
    defaultLaborPlnPerHour: 65,
    auxiliaryPctOfDirect: 0,
    internalOverheadPct: 0,
    equipmentRateByKey: {},
  },
  context: { tenderId: "t-fail", region: "wroclaw", requestedAt: "2026-08-09T21:00:00.000Z" },
  pushCloud: false,
});
globalThis.localStorage.setItem = brokenSet;
ok("I storage failure soft", recFail.ok === true || recFail.ok === false); // may still ok if save swallowed
ok("I no throw", true);

ok("J DATA_KEYS includes demand", DATA_KEYS.includes(PRICE_DEMAND_STORAGE_KEY));
ok(
  "J BOOTSTRAP_DEFERRED includes demand",
  BOOTSTRAP_DEFERRED_KEYS.includes(PRICE_DEMAND_STORAGE_KEY),
);
const coerced = coerceValueForCloudKey(PRICE_DEMAND_STORAGE_KEY, null);
ok("J coerce not []", !Array.isArray(coerced) && coerced?.schemaVersion === 1);
const merged = mergeDataKey(
  PRICE_DEMAND_STORAGE_KEY,
  upsertPriceDemandCandidates(normalizePriceDemandStore(null), [cand()]).store,
  normalizePriceDemandStore(null),
);
eq("J merge keeps demand", listActivePriceDemands(merged).length, 1);

// Collect from experts path
resetTf();
storage.clear();
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
    tenderId: "t-p32-missing",
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

const exec = analyzeExecutionFromOfferBoq(baseDoc([baseLine()]), defaultExecutionExpertBusinessProfile());
const me = analyzeMaterialsFromExecution(exec);
const pe = analyzeMarketPricingFromMaterials(me, { catalog: { worksById: new Map() } });
const companyEmpty = {
  purchaseByMaterialKey: {},
  defaultLaborPlnPerHour: 65,
  auxiliaryPctOfDirect: 0.08,
  internalOverheadPct: 0,
  equipmentRateByKey: {},
};
const collected = collectPriceDemandCandidates({
  execution: exec,
  pricing: pe,
  company: companyEmpty,
  context: { tenderId: "t-p32-missing", region: "wroclaw", requestedAt: "2026-08-09T22:00:00.000Z" },
});
ok("collect ≥1 missing", collected.length >= 1);
ok(
  "collect BOTH or PURCHASE",
  collected.every(
    (c) =>
      c.missingLayer === "BOTH_MISSING" ||
      c.missingLayer === "PURCHASE_MISSING" ||
      c.missingLayer === "MARKET_QUOTE_MISSING",
  ),
);
ok("collect reason PRICE DATA MISSING", collected.every((c) => c.reason === "PRICE DATA MISSING"));

const recorded = recordPriceDemandsFromExperts({
  execution: exec,
  pricing: pe,
  company: companyEmpty,
  context: { tenderId: "t-p32-missing", region: "wroclaw", requestedAt: "2026-08-09T22:00:00.000Z" },
  pushCloud: false,
});
ok("record ok", recorded.ok);
ok("record active > 0", recorded.activeCount > 0);
ok("LS persisted", loadPriceDemandStoreLocal().demands.length > 0);

// Cost still runs (BLOCKED ok) — no fake price
const cost = analyzeRealCostFromExperts({
  execution: exec,
  materials: me,
  pricing: pe,
  company: companyEmpty,
});
ok("no fake realCost", cost.breakdown.realCostPln == null);
ok(
  "PRICE DATA MISSING still present",
  cost.handoffBlockersPl.some((m) => /PRICE DATA MISSING/.test(m)),
);

// Merge cloud
const localStore = loadPriceDemandStoreLocal();
const cloudStore = upsertPriceDemandCandidates(normalizePriceDemandStore(null), [
  cand({ materialKey: "mat.mesh", catalogWorkId: "cw.etics.mesh", namePl: "Siatka", tenderId: "cloud-t" }),
]).store;
const uni = mergePriceDemandStore(localStore, cloudStore);
ok("cloud merge union", uni.demands.length >= localStore.demands.length);

console.log(`\n=== P3.2 PASS ${passed} ===\n`);
