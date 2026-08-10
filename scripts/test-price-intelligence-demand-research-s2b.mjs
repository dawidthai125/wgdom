/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S2-B — Deterministic WGDOM Coverage Dictionary.
 * Exact identity only · ZERO fuzzy · ZERO price invent · ZERO HTTP/SQL/KV Price.
 * npx vite-node scripts/test-price-intelligence-demand-research-s2b.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_MATERIAL_COVERAGE_ALIASES,
  DEFAULT_MATERIAL_MARKET_MAP,
  WGDOM_COVERAGE_CANDIDATES,
  WGDOM_COVERAGE_REJECTED,
  acceptManualMarketPriceResearchPure,
  buildPriceCandidateFromManualInput,
  buildPriceDemandId,
  buildResearchIntelligenceBrief,
  buildMaterialMarketMapIndex,
  isDemandResearchableS0,
  lookupMaterialKeyByExactAlias,
  lookupPriceMemory,
  mapMaterialToMarketWork,
  materialCoverageUsesFuzzyMatching,
  materialCoverageWritesMarketQuotes,
  materialCoverageWritesPurchase,
  normalizePriceDemandStore,
  resolveExactCatalogWork,
  resolveMaterialCoverageExact,
  suggestResearchLookupPathHint,
  upsertPriceDemandCandidates,
  useExistingMarketPricePure,
} from "../src/lib/price-intelligence/index.ts";
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

const T0 = "2026-08-01T12:00:00.000Z";
const T1 = "2026-08-09T12:00:00.000Z";
const WORK_ID = "cw.etics.boards";
const MAT = "mat.eps_graph";
const MAT_NEW = "mat.eps_white";

const LEGACY_KEYS = [
  "mat.eps_graph",
  "mat.glue_etics",
  "mat.mesh",
  "mat.render",
  "mat.cubes_beton",
  "mat.sand",
];

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
            keywords: ["eps"],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "seed",
            freshnessStatus: "missing",
            marketQuotes: {
              castorama: {
                wroclaw: {
                  price: 42.5,
                  regionCode: "wroclaw",
                  coverage: "full",
                  updatedAt: T0,
                  confidence: 0.9,
                  origin: "castorama",
                },
              },
            },
          },
          {
            id: "cw.etics.substrate",
            tradeId: "POZOSTALE",
            namePl: "Klej ETICS",
            unit: "kg",
            companyPricePln: 10,
            updatedAt: T0,
            keywords: ["klej"],
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
}

function worksByIdFrom(store) {
  const m = new Map();
  for (const w of store.catalogs.wroclaw.works) m.set(w.id, w);
  return m;
}

console.log("=== S2-B Coverage Dictionary ===\n");

// 1. existing materialKey remains valid
for (const k of LEGACY_KEYS) {
  ok(`1 existing materialKey ${k}`, Boolean(mapMaterialToMarketWork(k)));
}

// 2. new exact mapping → HIT
ok("2 new exact mat.eps_white HIT", Boolean(mapMaterialToMarketWork(MAT_NEW)));
eq("2 mat.eps_white → cw.etics.boards candidate", mapMaterialToMarketWork(MAT_NEW).candidateWorkIds.includes(WORK_ID), true);

// 3. exact alias → HIT
eq(
  "3 exact alias Płyta EPS grafit|m2",
  lookupMaterialKeyByExactAlias("Płyta EPS grafit", "m2"),
  MAT,
);
eq(
  "3 resolveMaterialCoverageExact alias",
  resolveMaterialCoverageExact({ namePl: "Klej do ETICS", unit: "kg" })?.materialKey,
  "mat.glue_etics",
);

// 4. alias miss → MISS
eq("4 alias miss unknown name", lookupMaterialKeyByExactAlias("Wanna 170x70", "szt"), null);
eq("4 alias miss empty", lookupMaterialKeyByExactAlias("", "m2"), null);

// 5. no fuzzy match
eq("5 fuzzy guard", materialCoverageUsesFuzzyMatching(), false);
eq(
  "5 similar name miss (EPS grafitowy ≠ exact)",
  lookupMaterialKeyByExactAlias("Płyta EPS grafitowy", "m2"),
  null,
);

// 6. no LLM — static source scan
{
  const src = readFileSync(resolve("src/lib/pricing-expert/material-market-map.ts"), "utf8");
  ok(
    "6 no LLM/openai/embedding imports",
    !/from\s+["']openai|createEmbedding|levenshtein|cosineSimilarity|fuzzyMatch\s*\(/.test(src),
  );
}

// 7. no price generation
eq(
  "7 coverage exact does not invent price field",
  resolveMaterialCoverageExact({ materialKey: MAT })?.price ?? null,
  null,
);

// 8–9. no Purchase / marketQuotes write
eq("8 no Purchase write", materialCoverageWritesPurchase(), false);
eq("9 no marketQuotes write", materialCoverageWritesMarketQuotes(), false);

// 10. existing CatalogWork reused (map points at known ids — no new CatalogWork seed in S2-B)
{
  const ids = new Set();
  for (const e of DEFAULT_MATERIAL_MARKET_MAP) {
    ids.add(e.workId);
    for (const c of e.candidateWorkIds ?? []) ids.add(c);
  }
  ok("10 map reuses market/cw.* ids only", [...ids].every((id) => /^(cw\.|wc\.market\.)/.test(id)));
}

// 11–12. Trade from CatalogWork / UNKNOWN without work
{
  const store = baseCatalog();
  const byId = worksByIdFrom(store);
  const resolved = resolveExactCatalogWork({ materialKey: MAT, worksById: byId });
  eq("11 Trade from CatalogWork", resolved?.work.tradeId, "MALOWANIE");
  eq(
    "12 unknown Trade when no CatalogWork",
    resolveExactCatalogWork({
      materialKey: "mat.no_such_key",
      worksById: byId,
    }),
    null,
  );
}

// 13. S0 researchable only after valid identity
{
  const bare = {
    demandId: "x",
    materialKey: "",
    catalogWorkId: null,
    region: "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    namePl: "x",
    unit: "m2",
    tenderIds: [],
    occurrenceCount: 1,
    createdAt: T0,
    updatedAt: T0,
  };
  ok("13 bare demand not researchable", !isDemandResearchableS0(bare));
  const mapped = resolveMaterialCoverageExact({ materialKey: MAT_NEW });
  const researchable = {
    ...bare,
    materialKey: mapped.materialKey,
    catalogWorkId: mapped.candidateWorkIds[0],
  };
  ok("13 identity → researchable", isDemandResearchableS0(researchable));
}

// 14. S1-A HIT after accepted price (new materialKey → same CatalogWork)
{
  resetTf();
  let store = baseCatalog();
  const byId = worksByIdFrom(store);
  const mem = lookupPriceMemory({
    materialKey: MAT_NEW,
    region: "wroclaw",
    worksById: byId,
    nowMs: Date.parse(T1),
  });
  eq("14 S1-A HIT via new mat.eps_white", mem.status, "HIT");
  eq("14 HIT workId", mem.hit.workId, WORK_ID);
}

// 15. S2-A receives CatalogWork/Trade
{
  resetTf();
  const store = baseCatalog();
  const byId = worksByIdFrom(store);
  const demand = {
    demandId: buildPriceDemandId({ materialKey: MAT_NEW, region: "wroclaw", catalogWorkId: WORK_ID }),
    materialKey: MAT_NEW,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    namePl: "Płyta EPS biały",
    unit: "m2",
    tenderIds: ["t1"],
    occurrenceCount: 2,
    createdAt: T0,
    updatedAt: T0,
  };
  const brief = buildResearchIntelligenceBrief({
    demand,
    worksById: byId,
    nowMs: Date.parse(T1),
  });
  eq("15 S2-A tradeId", brief.tradeId, "MALOWANIE");
  eq("15 S2-A catalogWorkId", brief.catalogWorkId, WORK_ID);
  eq("15 S2-A memory HIT", brief.memoryStatus, "HIT");
}

// 16. wrong unit → MISS
eq("16 wrong unit", lookupMaterialKeyByExactAlias("Płyta EPS grafit", "szt"), null);

// 17. wrong exact name → MISS
eq("17 wrong name", lookupMaterialKeyByExactAlias("Wanna", "m2"), null);

// 18. no duplicate materialKey
{
  const keys = DEFAULT_MATERIAL_MARKET_MAP.map((e) => e.materialKey);
  eq("18 unique materialKeys", new Set(keys).size, keys.length);
  ok("18 buildIndex accepts map", Boolean(buildMaterialMarketMapIndex()));
}

// 19. no duplicate CatalogWork invented (candidates report-only)
ok(
  "19 candidates are OWNER_REVIEW only",
  WGDOM_COVERAGE_CANDIDATES.every((c) => c.status === "CANDIDATE_OWNER_REVIEW"),
);
ok("19 rejected list non-empty", WGDOM_COVERAGE_REJECTED.length >= 1);

// 20–22. 0 HTTP / SQL / new Price KV — static + guards
{
  const src = readFileSync(resolve("src/lib/pricing-expert/material-market-map.ts"), "utf8");
  ok("20 no fetch/http", !/\bfetch\s*\(|XMLHttpRequest|axios\./.test(src));
  ok("21 no SQL", !/\bSELECT\b|\bINSERT\b|sqlite|postgres/i.test(src));
  ok("22 no PRICE_ KV invent", !/kw-price-|PRICE_KV|new Price/.test(src));
}

// Hint path deterministic
eq("hint path[0]", suggestResearchLookupPathHint()[0], "purchase");
eq("hint path length", suggestResearchLookupPathHint().length, 4);

// Alias table: every alias materialKey must exist in map
for (const a of DEFAULT_MATERIAL_COVERAGE_ALIASES) {
  ok(`alias→map ${a.materialKey}`, Boolean(mapMaterialToMarketWork(a.materialKey)));
}

// S0 form builds with identity from map
{
  const built = buildPriceCandidateFromManualInput(
    {
      demandId: buildPriceDemandId({
        materialKey: MAT,
        catalogWorkId: WORK_ID,
        region: "wroclaw",
        missingLayer: "MARKET_QUOTE_MISSING",
      }),
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      region: "wroclaw",
      provider: "other",
      name: "EPS",
      unit: "m2",
      priceNet: 55,
      priceDate: "2026-08-09",
    },
    { candidateId: "s2b_cand", retrievedAt: T1 },
  );
  ok("S0 candidate builds", Boolean(built.candidate));
}

// Use-existing after HIT (S1 reuse) — wroteQuotes false
{
  resetTf();
  const demandStore = normalizePriceDemandStore({
    schemaVersion: 1,
    updatedAt: T0,
    demands: [
      {
        demandId: buildPriceDemandId({
          materialKey: MAT,
          region: "wroclaw",
          catalogWorkId: WORK_ID,
        }),
        materialKey: MAT,
        catalogWorkId: WORK_ID,
        region: "wroclaw",
        missingLayer: "MARKET_QUOTE_MISSING",
        status: "QUEUED",
        namePl: "EPS",
        unit: "m2",
        tenderIds: ["t1"],
        occurrenceCount: 1,
        createdAt: T0,
        updatedAt: T0,
      },
    ],
  });
  const reuse = useExistingMarketPricePure({
    demandStore,
    materialKey: MAT,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    resolvedAt: T1,
  });
  eq("S1 useExisting wroteQuotes false", reuse.wroteQuotes, false);
}

console.log(`\n=== S2-B DONE: ${passed} PASS ===`);
