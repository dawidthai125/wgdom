/**
 * WIRE-CHIEF-RO-ADAPTERS-01 — unit tests.
 * npx vite-node scripts/test-wire-chief-ro-adapters-01.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assembleChiefWireRuntimeRo,
  buildChiefCompanyCostRo,
  buildChiefOfferBoqRo,
  buildChiefOfferStrategyParamsRo,
  buildChiefPricingOptionsRo,
} from "../src/lib/chief-wire-adapters/index.ts";
import { defaultOfferStrategyParams } from "../src/lib/offer-expert/index.ts";
import {
  OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
  OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
  buildCompanyKnowledgeEntryId,
  buildCompanyKnowledgeNameKey,
} from "../src/lib/tender-offer-boq-company-knowledge.ts";
import {
  TENDERS_COMPANY_PROFILE_KEY,
  defaultCompanyProfile,
} from "../src/lib/tenders-bzp-company.ts";
import {
  WORK_CATALOG_SCHEMA_VERSION,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => {
    storage.set(k, String(v));
  },
  removeItem: (k) => {
    storage.delete(k);
  },
  clear: () => {
    storage.clear();
  },
  key: (i) => [...storage.keys()][i] ?? null,
  get length() {
    return storage.size;
  },
};

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

function seedProfile(overrides = {}) {
  const p = defaultCompanyProfile();
  p.costModel = { ...p.costModel, ...overrides };
  p.updatedAt = "2026-08-07T00:00:00.000Z";
  localStorage.setItem(TENDERS_COMPANY_PROFILE_KEY, JSON.stringify(p));
}

function seedKnowledge(entries) {
  localStorage.setItem(
    OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
      updatedAt: "2026-08-07T00:00:00.000Z",
      entries,
    }),
  );
}

function seedCatalog(works) {
  localStorage.setItem(
    WORK_CATALOG_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
      updatedAt: "2026-08-07T00:00:00.000Z",
      activeRegion: "wroclaw",
      catalogs: {
        wroclaw: {
          region: "wroclaw",
          updatedAt: "2026-08-07T00:00:00.000Z",
          works,
        },
      },
    }),
  );
}

function makeWork(id, active = true) {
  return {
    id,
    tradeId: "POZOSTALE",
    namePl: id,
    unit: "m2",
    companyPricePln: 10,
    updatedAt: "2026-08-07T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: [],
    active,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

storage.clear();

// ——— T1: OfferBoq null on empty item ———
const emptyItem = {
  id: "t-empty",
  title: "Empty",
  tenderDossier: null,
};
const boqNull = buildChiefOfferBoqRo({ item: emptyItem, builtAt: "2026-08-07T12:00:00.000Z" });
assert.equal(boqNull.offerBoq, null);
assert.ok(boqNull.gaps.some((g) => g.code === "OFFER_BOQ_UNAVAILABLE"));
ok("T1 OfferBoq unavailable → null + gap");

// ——— T2: OfferBoq with lines (dossier kosztorys) ———
const itemWithBoq = {
  id: "t-boq",
  title: "With BOQ",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "test.pdf",
      rowCount: 1,
      rows: [{ lp: "1", description: "Roboty ogólnobudowlane ETICS", unit: "m2", quantity: "10" }],
      catalogQuantities: [
        { lp: "1", description: "Roboty ogólnobudowlane ETICS", unit: "m2", quantity: "10" },
      ],
      totalValue: null,
      currency: "PLN",
    },
  },
};
seedCatalog([makeWork("cw.test.1")]);
seedProfile({ avgGrossHourlyPln: 55, kpPct: 14 });
const boqOk = buildChiefOfferBoqRo({ item: itemWithBoq, builtAt: "2026-08-07T12:00:00.000Z" });
assert.ok(boqOk.offerBoq != null, "offerBoq expected");
assert.ok(boqOk.offerBoq.lines.length > 0, "lines expected");
assert.equal(boqOk.gaps.length, 0);
ok(`T2 OfferBoq lines=${boqOk.offerBoq.lines.length}`);

// ——— T3: Catalog worksById (+ P3.1 ETICS seed) ———
seedCatalog([makeWork("cw.a"), makeWork("cw.b", false), makeWork("cw.c")]);
const cat = buildChiefPricingOptionsRo();
assert.ok(cat.pricing != null);
assert.equal(cat.pricing.catalog.worksById.size, 6); // 2 seeded active + 4 P3.1 ETICS
assert.ok(cat.pricing.catalog.worksById.has("cw.etics.boards"));
assert.ok(cat.pricing.catalog.worksById.has("cw.etics.substrate"));
assert.ok(cat.pricing.catalog.worksById.has("cw.etics.render"));
assert.equal(cat.source, "kw-wgdom-work-catalog");
assert.equal(cat.pricing.priceHistory, undefined);
assert.equal(cat.pricing.materialMap, undefined);
ok("T3 Catalog active worksById includes seed + P3.1 ETICS");

// ——— T4: Catalog empty LS → P3.1 still seeds ETICS Quotes ———
seedCatalog([]);
const catEmpty = buildChiefPricingOptionsRo();
assert.ok(catEmpty.pricing != null);
assert.equal(catEmpty.pricing.catalog.worksById.size, 4);
assert.ok(catEmpty.pricing.catalog.worksById.has("cw.etics.mesh"));
assert.ok(!catEmpty.gaps.some((g) => g.code === "CATALOG_EMPTY"));
ok("T4 Catalog empty LS → P3.1 ETICS Quotes seed (4)");

// ——— T5: Company labour + kp (+ P3.1 ETICS seed when knowledge empty) ———
seedProfile({ avgGrossHourlyPln: 60, kpPct: 20 });
seedKnowledge([]);
const company = buildChiefCompanyCostRo();
assert.equal(company.company.defaultLaborPlnPerHour, 60);
assert.equal(company.company.auxiliaryPctOfDirect, 0.2);
assert.equal(company.company.internalOverheadPct, 0);
assert.equal(company.company.equipmentRateByKey["eq.scaffold"]?.unitPricePln, 8);
assert.equal(company.company.equipmentRateByKey["eq.mixer"]?.unitPricePln, 120);
assert.ok(company.gaps.some((g) => g.code === "COMPANY_INTERNAL_OVERHEAD_UNMAPPED"));
assert.ok(company.gaps.some((g) => g.code === "COMPANY_EQUIPMENT_P31_ETICS"));
assert.ok(company.company.purchaseByMaterialKey["mat.eps_graph"]?.unitPricePln > 0);
assert.ok(!company.gaps.some((g) => g.code === "COMPANY_PURCHASE_EMPTY"));
ok("T5 Company labour+kp + P3.1 ETICS Purchase/equipment seed");

// ——— T6: Company purchase from knowledge keyed by materialKey (P1) ———
seedKnowledge([
  {
    entryId: buildCompanyKnowledgeEntryId("Płyta EPS grafit", "material", "m2"),
    namePl: "Płyta EPS grafit",
    nameKey: buildCompanyKnowledgeNameKey("Płyta EPS grafit"),
    category: "material",
    unit: "m2",
    occurrenceCount: 1,
    approvedCount: 1,
    changedCount: 0,
    lastUnitPricePln: 12.5,
    avgUnitPricePln: 11,
    lastUsedAt: "2026-08-07T00:00:00.000Z",
    lastSourceKind: "user",
    lastSourceLabelPl: "user",
    primarilyFromUser: true,
    observations: [],
  },
]);
const companyPurch = buildChiefCompanyCostRo();
assert.equal(companyPurch.company.purchaseByMaterialKey["mat.eps_graph"]?.unitPricePln, 12.5);
assert.equal(companyPurch.company.purchaseByMaterialKey["mat.eps_graph"]?.labelPl, "Płyta EPS grafit");
assert.ok(!companyPurch.gaps.some((g) => g.code === "COMPANY_PURCHASE_EMPTY"));
ok("T6 purchaseByMaterialKey from knowledge materialKey (P1)");

// ——— T7: OfferStrategy defaults ———
const strat = buildChiefOfferStrategyParamsRo();
const def = defaultOfferStrategyParams();
assert.deepEqual(strat.offerStrategy, def);
assert.ok(strat.gaps.some((g) => g.code === "OFFER_STRATEGY_DEFAULTS"));
ok("T7 OfferStrategy === defaultOfferStrategyParams");

// ——— T8: assemble ready=false (null item) ———
seedCatalog([makeWork("cw.x")]);
seedProfile({ avgGrossHourlyPln: 50, kpPct: 14 });
const assembledNull = assembleChiefWireRuntimeRo({
  item: null,
  builtAtIso: "2026-08-07T15:00:00.000Z",
});
assert.equal(assembledNull.readyForChiefInput, false);
assert.equal(assembledNull.offerBoq, null);
assert.ok(assembledNull.pricing != null);
assert.equal(assembledNull.meta.builtAtIso, "2026-08-07T15:00:00.000Z");
ok("T8 assemble item=null → readyForChiefInput false");

// ——— T9: assemble ready=true ———
seedCatalog([makeWork("cw.ready")]);
const assembled = assembleChiefWireRuntimeRo({
  item: itemWithBoq,
  builtAtIso: "2026-08-07T15:00:00.000Z",
});
assert.equal(assembled.readyForChiefInput, true);
assert.ok(assembled.offerBoq?.lines.length > 0);
assert.ok(assembled.pricing?.catalog.worksById.size >= 1);
assert.equal(assembled.meta.sources.offerStrategy, "offer-expert.defaultOfferStrategyParams");
ok("T9 assemble readyForChiefInput true");

// ——— T10: immutable after assemble ———
assert.throws(() => {
  assembled.readyForChiefInput = false;
}, TypeError);
assert.throws(() => {
  assembled.meta.gaps.push({
    code: "X",
    field: "x",
    messagePl: "x",
    severity: "info",
  });
}, TypeError);
ok("T10 ChiefWireRuntimeRo frozen");

// ——— T11: boundary — no Chief.run / analyze* imports in adapters ———
const adapterDir = join(root, "src/lib/chief-wire-adapters");
for (const file of [
  "assemble.ts",
  "catalog.ts",
  "company-cost.ts",
  "offer-boq.ts",
  "offer-strategy.ts",
  "index.ts",
  "types.ts",
]) {
  const src = readFileSync(join(adapterDir, file), "utf8");
  assert.ok(!src.includes("runChiefOrchestrator"), `${file}: no runChiefOrchestrator`);
  assert.ok(!/analyze(Execution|Materials|Market|RealCost|Offer)/.test(src), `${file}: no analyze*`);
  assert.ok(!src.includes("chief-orchestrator/run"), `${file}: no chief run import`);
  assert.ok(!src.includes("from \"react\""), `${file}: no react`);
}
ok("T11 boundary: no Chief.run / analyze* / React");

// ——— T12: labour clamp w profilu (LS) — adapter dostaje już ≥15 ———
seedProfile({ avgGrossHourlyPln: 0, kpPct: 10 });
const laborNorm = buildChiefCompanyCostRo();
assert.ok(laborNorm.company.defaultLaborPlnPerHour >= 15);
assert.ok(!laborNorm.gaps.some((g) => g.code === "COMPANY_LABOR_MISSING"));
const companySrc = readFileSync(join(adapterDir, "company-cost.ts"), "utf8");
assert.ok(companySrc.includes("COMPANY_LABOR_MISSING"), "defensive labor gap retained");
ok("T12 profile clamp ≥15 · defensive COMPANY_LABOR_MISSING in source");

console.log(`\nALL ${passed} PASS`);
