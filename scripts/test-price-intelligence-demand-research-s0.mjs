/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S0 — Manual Price Research.
 * npx vite-node scripts/test-price-intelligence-demand-research-s0.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  acceptManualMarketPriceResearchPure,
  buildManualMarketQuotesPreview,
  buildPriceCandidateFromManualInput,
  buildPriceDemandId,
  invoiceAcceptWritesMarketQuotes,
  listActivePriceDemands,
  mapManualProviderToQuoteOrigin,
  normalizePriceDemandStore,
  resolveMarketLayerForDemand,
  upsertPriceDemandCandidates,
  validateManualPriceResearchInput,
} from "../src/lib/price-intelligence/index.ts";
import { resolveMaterialMarketCoverage } from "../src/lib/pricing-expert/material-market-map.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
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
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

const T0 = "2026-08-09T12:00:00.000Z";
const WORK_ID = "cw.etics.boards";
const MAT = "mat.eps_graph";

function baseCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T0,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: T0,
        works: [
          {
            id: WORK_ID,
            tradeId: "MALOWANIE",
            namePl: "Płyta EPS grafit",
            unit: "m2",
            companyPricePln: 100,
            updatedAt: T0,
            keywords: ["eps", "grafit"],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "seed",
            freshnessStatus: "missing",
          },
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt: T0, works: [] },
    },
  });
}

function memoryDeps(initial) {
  let current = structuredClone(initial);
  return {
    load: async () => structuredClone(current),
    save: async (store) => {
      current = structuredClone(store);
      return { ok: true, saved: true };
    },
    loadLocal: () => structuredClone(current),
    saveLocal: (store) => {
      current = structuredClone(store);
    },
    get: () => current,
  };
}

function formBase(over = {}) {
  return {
    demandId: buildPriceDemandId({
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
    }),
    materialKey: MAT,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    provider: "castorama",
    name: "Wanna 170 cm",
    unit: "szt.",
    priceNet: 849,
    priceDate: "2026-08-09",
    sourceUrl: "https://example.castorama/wanna",
    ...over,
  };
}

console.log("\n=== DEMAND-RESEARCH-01 S0 Manual Price Research ===\n");
resetTf();

// 1 valid
{
  const built = buildPriceCandidateFromManualInput(formBase(), {
    candidateId: "pc_test_1",
    retrievedAt: T0,
  });
  ok("1 valid manual candidate", built.ok === true);
  eq("1 priceNet", built.ok && built.candidate.priceNet, 849);
  eq("1 provenance", built.ok && built.candidate.provenance, "manual_owner");
  eq("1 sourceType", built.ok && built.candidate.sourceType, "market_reference");
}

// 2–7 invalid
eq("2 invalid price", validateManualPriceResearchInput(formBase({ priceNet: 0 })), "invalid_price");
eq("2b invalid price neg", validateManualPriceResearchInput(formBase({ priceNet: -1 })), "invalid_price");
eq("3 missing name", validateManualPriceResearchInput(formBase({ name: "  " })), "missing_name");
eq("4 missing unit", validateManualPriceResearchInput(formBase({ unit: "" })), "missing_unit");
eq("5 missing date", validateManualPriceResearchInput(formBase({ priceDate: "" })), "missing_price_date");
eq(
  "6 missing materialKey",
  validateManualPriceResearchInput(formBase({ materialKey: "" })),
  "missing_material_key",
);
eq(
  "7 missing catalogWorkId",
  validateManualPriceResearchInput(formBase({ catalogWorkId: null })),
  "missing_catalog_work_id",
);

// 8–18 ACCEPT paths
{
  const deps = memoryDeps(baseCatalog());
  const built = buildPriceCandidateFromManualInput(formBase(), {
    candidateId: "pc_acc",
    retrievedAt: T0,
  });
  ok("8 build ok", built.ok);
  let demandStore = upsertPriceDemandCandidates(normalizePriceDemandStore(null), [
    {
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      namePl: "EPS",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      tenderId: "tender-1",
      requestedAt: T0,
      reason: "PRICE DATA MISSING",
    },
  ]).store;

  const acc = await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore,
    commitOptions: { deps, updatedAtIso: T0 },
  });
  ok("8 ACCEPT ok", acc.ok);
  ok("8 commit status", acc.commit?.status === "committed" || acc.commit?.status === "noop");
  const work = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  ok("8 marketQuotes castorama", !!work?.marketQuotes?.castorama?.wroclaw);
  eq("8 castorama price", work?.marketQuotes?.castorama?.wroclaw?.price, 849);
  ok("8 companion wgdom (PE visibility)", !!work?.marketQuotes?.wgdom?.wroclaw);
  eq("9 wroteCompanyKnowledge false", acc.wroteCompanyKnowledge, false);
  eq("10 wrotePurchase false", acc.wrotePurchase, false);
  ok("11 MARKET layer resolves", acc.demandResolved);
  const activeAfter = listActivePriceDemands(acc.nextDemandStore);
  ok(
    "11 market demand gone/resolved",
    !activeAfter.some(
      (d) =>
        d.materialKey === MAT &&
        (d.missingLayer === "MARKET_QUOTE_MISSING" || d.missingLayer === "BOTH_MISSING"),
    ),
  );
}

// 12 BOTH → PURCHASE_MISSING
{
  let demandStore = upsertPriceDemandCandidates(normalizePriceDemandStore(null), [
    {
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      namePl: "EPS",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "BOTH_MISSING",
      tenderId: "t1",
      requestedAt: T0,
      reason: "PRICE DATA MISSING",
    },
  ]).store;
  const r = resolveMarketLayerForDemand(demandStore, {
    materialKey: MAT,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    resolvedAt: T0,
  });
  const active = listActivePriceDemands(r.store);
  eq("12 active count 1", active.length, 1);
  eq("12 PURCHASE_MISSING remains", active[0]?.missingLayer, "PURCHASE_MISSING");
  ok("12 BOTH resolved/removed", !active.some((d) => d.missingLayer === "BOTH_MISSING"));
}

// 13 rejected candidate does not write
{
  const deps = memoryDeps(baseCatalog());
  const fpBefore = JSON.stringify(deps.get().catalogs.wroclaw.works[0]?.marketQuotes ?? null);
  const built = buildPriceCandidateFromManualInput(formBase({ priceNet: 0 }));
  ok("13 invalid not built", built.ok === false);
  eq("13 catalog untouched", JSON.stringify(deps.get().catalogs.wroclaw.works[0]?.marketQuotes ?? null), fpBefore);
}

// 14 edited candidate uses edited values
{
  const a = buildPriceCandidateFromManualInput(formBase({ priceNet: 100, name: "A" }), {
    candidateId: "e1",
    retrievedAt: T0,
  });
  const b = buildPriceCandidateFromManualInput(formBase({ priceNet: 849, name: "Wanna 170 cm" }), {
    candidateId: "e1",
    retrievedAt: T0,
  });
  ok("14a", a.ok && b.ok);
  eq("14 edited price", b.candidate.priceNet, 849);
  eq("14 edited name", b.candidate.name, "Wanna 170 cm");
  ok("14 different from first edit", a.candidate.priceNet !== b.candidate.priceNet);
}

eq("15 leroy → leroy", mapManualProviderToQuoteOrigin("leroy"), "leroy");
eq("16 castorama → castorama", mapManualProviderToQuoteOrigin("castorama"), "castorama");
eq("17 obi → wgdom", mapManualProviderToQuoteOrigin("obi"), "wgdom");
eq("18 other → wgdom", mapManualProviderToQuoteOrigin("other"), "wgdom");

{
  const built = buildPriceCandidateFromManualInput(formBase({ provider: "obi", sourceUrl: "https://obi.pl/x" }), {
    candidateId: "obi1",
    retrievedAt: T0,
  });
  const preview = buildManualMarketQuotesPreview(built.candidate);
  eq("17 preview origin wgdom", preview.matched[0]?.snapshot?.origin, "wgdom");
  ok("17 provenance on candidate", built.candidate.provenance === "manual_owner");
  ok("17 sourceUrl kept", built.candidate.sourceUrl?.includes("obi"));
}

{
  const built = buildPriceCandidateFromManualInput(formBase({ provider: "other" }), {
    candidateId: "oth1",
    retrievedAt: T0,
  });
  const preview = buildManualMarketQuotesPreview(built.candidate);
  eq("18 other snapshot wgdom", preview.matched[0]?.snapshot?.origin, "wgdom");
}

// 19–23 static guarantees
{
  const src = [
    readFileSync(resolve("src/lib/price-intelligence/manual-price-research.ts"), "utf8"),
    readFileSync(resolve("src/lib/price-intelligence/price-candidate-types.ts"), "utf8"),
    readFileSync(resolve("src/lib/price-intelligence/demand-resolve-layer.ts"), "utf8"),
    readFileSync(resolve("src/app/expert-workspace/DemandPriceResearchPanel.tsx"), "utf8"),
  ].join("\n");
  ok("19 0 external fetch", !/\bfetch\s*\(/.test(src));
  ok("20 no fuzzy match impl", !/fuzzyMatch|fuse\.js|string-similarity|levenshtein/i.test(src));
  ok("21 no LLM", !/\bopenai\b|\banthropic\b|\bchat\.completions\b/i.test(src));
  ok("22 no SQL", !/\bCREATE TABLE\b|\bSELECT\s+\*|supabase\.from\(/i.test(src));
  ok("23 no second queue table", !/researchJobTable|candidateDatabase/i.test(src));
}

// 24 Tender #2 reads existing market quote (PE path)
{
  resetTf();
  const deps = memoryDeps(baseCatalog());
  const built = buildPriceCandidateFromManualInput(formBase(), {
    candidateId: "t2",
    retrievedAt: T0,
  });
  await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore: normalizePriceDemandStore(null),
    commitOptions: { deps, updatedAtIso: T0 },
  });
  const worksById = new Map(deps.get().catalogs.wroclaw.works.map((w) => [w.id, w]));
  const cov = resolveMaterialMarketCoverage(MAT, worksById);
  ok("24 coverage from existing Quotes", !!cov?.work?.marketQuotes);
  const { analyzeMaterialMarketLine } = await import(
    "../src/lib/pricing-expert/analyze-line.ts"
  );
  const line = analyzeMaterialMarketLine({
    materialKey: MAT,
    namePl: "EPS",
    quantity: 1,
    unit: "m2",
    map: cov.map,
    work: cov.work,
    nowMs: Date.parse(T0),
    computedAtIso: T0,
  });
  ok("24 PE marketPricePln from Quotes", line?.marketPricePln != null && line.marketPricePln > 0);
  eq("24 PE ~849", line?.marketPricePln, 849);
}

ok("25 invoice ACCEPT ≠ marketQuotes helper", invoiceAcceptWritesMarketQuotes() === false);

// 26–29 regressions (smoke import / static)
{
  const { processInvoiceCompanyPurchaseBatch } = await import(
    "../src/lib/price-intelligence/index.ts"
  );
  ok("26 P0 invoice export still present", typeof processInvoiceCompanyPurchaseBatch === "function");
  const { lookupInvoiceApprovedMap } = await import("../src/lib/price-intelligence/index.ts");
  ok("26 P1 map export still present", typeof lookupInvoiceApprovedMap === "function");
  const { computeMissingLayer, collectPriceDemandCandidates } = await import(
    "../src/lib/price-intelligence/index.ts"
  );
  eq(
    "27 P3.2 computeMissingLayer both",
    computeMissingLayer({ purchaseOk: false, marketOk: false }),
    "BOTH_MISSING",
  );
  ok("27 collect still fn", typeof collectPriceDemandCandidates === "function");
  const { ensurePi31EticsApprovedDataLocal } = await import(
    "../src/lib/price-intelligence/index.ts"
  );
  ok("28 P3.1 ensure still fn", typeof ensurePi31EticsApprovedDataLocal === "function");
  const { commitMarketQuotesImport } = await import(
    "../src/lib/work-catalog/commit-market-quotes.ts"
  );
  ok("29 Market Sync commit still fn", typeof commitMarketQuotesImport === "function");
  const msSrc = readFileSync(resolve("src/lib/market-sync/publish.ts"), "utf8");
  ok("29 Market Sync publish untouched pattern", msSrc.includes("commitMarketQuotesImport"));
}

console.log(`\n=== S0 DONE: ${passed} PASS ===\n`);
