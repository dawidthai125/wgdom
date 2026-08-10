/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S3 — Tender Line → Product Demand Identity Bridge.
 * npx vite-node scripts/test-price-intelligence-demand-research-s3.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  acceptManualMarketPriceResearchPure,
  buildManualResearchBrief,
  buildPriceCandidateFromManualInput,
  buildPriceDemandId,
  collectPriceDemandCandidates,
  lookupPriceMemory,
  useExistingMarketPricePure,
} from "../src/lib/price-intelligence/index.ts";
import { extractExactAliasLinesFromOfferBoq } from "../src/lib/price-intelligence/offer-boq-exact-alias-lines.ts";
import {
  isLaborCatalogWorkBlockedForProductQuotes,
  isProductCatalogWorkId,
  mapMaterialToMarketWork,
  preferProductCatalogWorkId,
  resolveDemandProductIdentityExact,
} from "../src/lib/pricing-expert/material-market-map.ts";
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
const T1 = "2026-08-10T12:00:00.000Z";

function emptyExperts() {
  return {
    execution: { bom: { materials: [], labour: [], equipment: [] } },
    pricing: { lines: [] },
    company: { purchaseByMaterialKey: {}, defaultLaborPlnPerHour: 50, laborPlnPerHourByKey: {}, equipmentRateByKey: {} },
  };
}

function collectFromBoq(lines, company = emptyExperts().company) {
  const exactAliasLines = extractExactAliasLinesFromOfferBoq({ lines });
  const { execution, pricing } = emptyExperts();
  return collectPriceDemandCandidates({
    execution,
    pricing,
    company,
    context: {
      tenderId: "tender-s3",
      region: "wroclaw",
      requestedAt: T0,
      exactAliasLines,
    },
  });
}

console.log("\n=== DEMAND-RESEARCH-01 S3 TENDER LINE BRIDGE ===\n");
resetTf();

// 1 EPS exact alias from OfferBoq description
{
  const cands = collectFromBoq([
    { description: "Płyta EPS grafit", unit: "m2", catalogWorkId: null },
  ]);
  eq("1 count", cands.length, 1);
  eq("1 materialKey", cands[0].materialKey, "mat.eps_graph");
  const map = mapMaterialToMarketWork("mat.eps_graph");
  eq("1 catalogWorkId", cands[0].catalogWorkId, preferProductCatalogWorkId(map));
  ok("1 Demand HIT", cands[0].missingLayer === "BOTH_MISSING" || cands[0].missingLayer === "MARKET_QUOTE_MISSING");
}

// 2 S2-C canonical product alias
{
  const cands = collectFromBoq([{ description: "Umywalka", unit: "szt" }]);
  eq("2 count", cands.length, 1);
  eq("2 materialKey", cands[0].materialKey, "mat.umywalka");
  eq("2 catalogWorkId", cands[0].catalogWorkId, "cw.product.umywalka");
  ok("2 product", isProductCatalogWorkId(cands[0].catalogWorkId));
}

// 3 wrong unit → MISS
{
  const cands = collectFromBoq([{ description: "Umywalka", unit: "m2" }]);
  eq("3 wrong unit MISS", cands.length, 0);
}

// 4 unknown → MISS
{
  const cands = collectFromBoq([{ description: "SuperGizmo XYZ-99", unit: "szt" }]);
  eq("4 unknown MISS", cands.length, 0);
}

// 5 bare WC → MISS
{
  const cands = collectFromBoq([{ description: "WC", unit: "szt" }]);
  eq("5 WC MISS", cands.length, 0);
}

// 6 Montaż WC → MISS · labor never product
{
  const cands = collectFromBoq([
    { description: "Montaż WC", unit: "szt", catalogWorkId: "montaz-wc-szt" },
  ]);
  eq("6 montaz MISS", cands.length, 0);
  ok("6 labor blocked", isLaborCatalogWorkBlockedForProductQuotes("montaz-wc-szt"));
}

// 7 concrete exact product
{
  const cands = collectFromBoq([{ description: "Kompakt WC", unit: "szt" }]);
  eq("7 HIT", cands[0]?.materialKey, "mat.wc_compact");
  eq("7 cw", cands[0]?.catalogWorkId, "cw.product.wc_compact");
}

// 8 labor CatalogWork alone → not product Demand
{
  const cands = collectFromBoq([
    { description: "", unit: "szt", catalogWorkId: "montaz-umywalki-szt" },
  ]);
  eq("8 labor alone MISS", cands.length, 0);
  const id = resolveDemandProductIdentityExact({
    catalogWorkId: "montaz-umywalki-szt",
    unit: "szt",
  });
  eq("8 identity null", id, null);
}

// 9–10 no price / purchase writes (static + runtime empty)
{
  const adapter = readFileSync(
    resolve("src/lib/price-intelligence/offer-boq-exact-alias-lines.ts"),
    "utf8",
  );
  const run = readFileSync(resolve("src/lib/chief-orchestrator/run.ts"), "utf8");
  const collect = readFileSync(resolve("src/lib/price-intelligence/demand-collect.ts"), "utf8");
  const src = [adapter, run, collect].join("\n");
  ok("9 no marketQuotes write", !/commitMarketQuotesImport|marketQuotes\s*=/.test(adapter));
  ok("10 no Purchase write", !/purchaseByMaterialKey\s*\[|applyPi31ApprovedPurchase|invoiceAccept/.test(adapter));
  ok("9b S3 wiring present", run.includes("extractExactAliasLinesFromOfferBoq"));
  ok("9c collect catalogWorkId on alias", collect.includes("catalogWorkId: line.catalogWorkId"));
}

// 11–13 external / SQL / KV
{
  const adapter = readFileSync(
    resolve("src/lib/price-intelligence/offer-boq-exact-alias-lines.ts"),
    "utf8",
  );
  ok("11 0 fetch", !/\bfetch\s*\(/.test(adapter));
  ok("12 0 SQL", !/\bCREATE TABLE\b|\bSELECT\s+|supabase\.from\(/i.test(adapter));
  ok("13 0 Price KV", !/kw-price-|kw-market-quote-history/i.test(adapter));
  ok("11b no fuzzy impl", !/fuzzyMatch|fuse\.js|string-similarity|levenshtein/i.test(adapter));
  ok("11c no LLM", !/\bopenai\b|\banthropic\b|\bembedding/i.test(adapter));
}

// 14 S2-A brief from product identity
{
  const identity = resolveDemandProductIdentityExact({
    namePl: "Bateria umywalkowa",
    unit: "szt",
  });
  ok("14 identity", !!identity);
  const brief = buildManualResearchBrief(
    {
      demandId: "d-s3",
      materialKey: identity.materialKey,
      catalogWorkId: identity.catalogWorkId,
      namePl: identity.labelPl,
      unit: "szt",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      status: "QUEUED",
      tenderIds: ["t1"],
      occurrenceCount: 1,
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: identity.catalogWorkId,
      tradeId: "LAZIENKA",
      namePl: identity.labelPl,
      unit: "szt",
    },
  );
  eq("14 brief materialKey", brief.materialKey, "mat.bateria_umywalkowa");
  eq("14 brief catalogWorkId", brief.catalogWorkId, "cw.product.bateria_umywalkowa");
  ok("14 Trade hint", /LAZIENKA|łazien|Lazien/i.test(JSON.stringify(brief)) || brief.tradeId === "LAZIENKA" || !!brief.hintPl);
}

// 15 ACCEPT → S1-A memory
{
  resetTf();
  let current = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T0,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: T0,
        works: [
          {
            id: "cw.product.umywalka",
            tradeId: "LAZIENKA",
            namePl: "Umywalka",
            unit: "szt",
            companyPricePln: 0,
            updatedAt: T0,
            keywords: ["mat.umywalka"],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "seed",
            freshnessStatus: "missing",
          },
        ],
      },
    },
  });
  const deps = {
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
  const built = buildPriceCandidateFromManualInput(
    {
      demandId: buildPriceDemandId({
        materialKey: "mat.umywalka",
        catalogWorkId: "cw.product.umywalka",
        region: "wroclaw",
        missingLayer: "MARKET_QUOTE_MISSING",
      }),
      materialKey: "mat.umywalka",
      catalogWorkId: "cw.product.umywalka",
      region: "wroclaw",
      provider: "castorama",
      name: "Umywalka",
      unit: "szt",
      priceNet: 310,
      priceDate: "2026-08-01",
    },
    { candidateId: "s3_1", retrievedAt: T0 },
  );
  const acc = await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore: { schemaVersion: 1, updatedAt: T0, demands: [] },
    commitOptions: { deps, updatedAtIso: T0 },
  });
  ok("15 ACCEPT ok", acc.ok);
  const mem = lookupPriceMemory({
    materialKey: "mat.umywalka",
    catalogWorkId: "cw.product.umywalka",
    region: "wroclaw",
    worksById: new Map(current.catalogs.wroclaw.works.map((w) => [w.id, w])),
    nowMs: Date.parse(T1),
  });
  eq("15 S1 HIT", mem.status, "HIT");
  eq("15 price", mem.hit.price, 310);
  const reuse = useExistingMarketPricePure({
    demandStore: {
      schemaVersion: 1,
      updatedAt: T0,
      demands: [
        {
          demandId: "d2",
          materialKey: "mat.umywalka",
          catalogWorkId: "cw.product.umywalka",
          region: "wroclaw",
          missingLayer: "MARKET_QUOTE_MISSING",
          status: "QUEUED",
          namePl: "Umywalka",
          unit: "szt",
          tenderIds: ["t2"],
          occurrenceCount: 1,
          createdAt: T0,
          updatedAt: T0,
        },
      ],
    },
    materialKey: "mat.umywalka",
    catalogWorkId: "cw.product.umywalka",
    region: "wroclaw",
    resolvedAt: T1,
  });
  eq("15 wroteQuotes false", reuse.wroteQuotes, false);
}

// Bridge: product catalogWorkId on line without matching description text
{
  const cands = collectFromBoq([
    {
      description: "pozycja katalogowa",
      unit: "szt",
      catalogWorkId: "cw.product.klamka",
    },
  ]);
  // description won't alias; catalogWorkId product should still resolve
  const hit = cands.find((c) => c.materialKey === "mat.klamka");
  ok("bridge product cw HIT", !!hit);
  eq("bridge cw id", hit?.catalogWorkId, "cw.product.klamka");
}

// Noise skipped
{
  const lines = extractExactAliasLinesFromOfferBoq({
    lines: [{ description: "Umywalka", unit: "szt", isNoise: true }],
  });
  eq("noise skipped", lines.length, 0);
}

// Batteries distinct via BOQ
{
  const a = collectFromBoq([{ description: "Bateria umywalkowa", unit: "szt" }]);
  const b = collectFromBoq([{ description: "Bateria prysznicowa", unit: "szt" }]);
  ok("batteries distinct", a[0].materialKey !== b[0].materialKey);
}

console.log(`\n=== S3 DONE: ${passed} PASS ===\n`);
