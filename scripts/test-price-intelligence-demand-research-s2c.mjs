/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S2-C — Bathroom + Core Finish Product Pack.
 * npx vite-node scripts/test-price-intelligence-demand-research-s2c.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_MATERIAL_MARKET_MAP,
  LABOR_CATALOG_WORK_BLOCKLIST,
  acceptManualMarketPriceResearchPure,
  buildPriceCandidateFromManualInput,
  buildPriceDemandId,
  buildResearchIntelligenceBrief,
  collectPriceDemandCandidates,
  isDemandResearchableS0,
  isLaborCatalogWorkBlockedForProductQuotes,
  isProductCatalogWorkId,
  lookupMaterialKeyByCatalogWorkId,
  lookupMaterialKeyByExactAlias,
  lookupPriceMemory,
  mapMaterialToMarketWork,
  materialCoverageUsesFuzzyMatching,
  materialCoverageWritesMarketQuotes,
  materialCoverageWritesPurchase,
  resolveDemandProductIdentityExact,
  resolveMaterialCoverageExact,
  useExistingMarketPricePure,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore, validateSeedManifestYaml } from "../src/lib/work-catalog/index.ts";
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

const S2C_PRODUCTS = [
  ["mat.wc_compact", "cw.product.wc_compact", "Kompakt WC", "szt", "LAZIENKA"],
  ["mat.umywalka", "cw.product.umywalka", "Umywalka", "szt", "LAZIENKA"],
  ["mat.bateria_umywalkowa", "cw.product.bateria_umywalkowa", "Bateria umywalkowa", "szt", "LAZIENKA"],
  ["mat.bateria_prysznicowa", "cw.product.bateria_prysznicowa", "Bateria prysznicowa", "szt", "LAZIENKA"],
  ["mat.kabina_prysznicowa", "cw.product.kabina_prysznicowa", "Kabina prysznicowa", "szt", "LAZIENKA"],
  ["mat.brodzik", "cw.product.brodzik", "Brodzik", "szt", "LAZIENKA"],
  ["mat.odplyw_liniowy", "cw.product.odplyw_liniowy", "Odpływ liniowy", "szt", "LAZIENKA"],
  ["mat.syfon_umywalkowy", "cw.product.syfon_umywalkowy", "Syfon umywalkowy", "szt", "LAZIENKA"],
  ["mat.stelaz_wc", "cw.product.stelaz_wc", "Stelaż WC podtynkowy", "szt", "LAZIENKA"],
  ["mat.plytki_scienne", "cw.product.plytki_scienne", "Płytki ścienne", "m2", "LAZIENKA"],
  ["mat.plytki_podlogowe", "cw.product.plytki_podlogowe", "Płytki podłogowe", "m2", "PODLOGI"],
  ["mat.klej_plytki", "cw.product.klej_plytki", "Klej do płytek", "kg", "PODLOGI"],
  ["mat.fuga", "cw.product.fuga", "Fuga", "kg", "PODLOGI"],
  ["mat.silikon_sanitarny", "cw.product.silikon_sanitarny", "Silikon sanitarny", "szt", "LAZIENKA"],
  ["mat.hydroizolacja", "cw.product.hydroizolacja", "Hydroizolacja pod płytki", "m2", "LAZIENKA"],
  ["mat.panel_laminowany", "cw.product.panel_laminowany", "Panel laminowany", "m2", "PODLOGI"],
  ["mat.skrzydlo_drzwiowe", "cw.product.skrzydlo_drzwiowe", "Skrzydło drzwiowe", "szt", "DRZWI"],
  ["mat.oscieznica", "cw.product.oscieznica", "Ościeżnica", "szt", "DRZWI"],
  ["mat.klamka", "cw.product.klamka", "Klamka", "szt", "DRZWI"],
  ["mat.zamek", "cw.product.zamek", "Zamek", "szt", "DRZWI"],
  ["mat.farba_lateksowa_wewnetrzna", "cw.product.farba_lateksowa_wewnetrzna", "Farba lateksowa wewnętrzna", "l", "MALOWANIE"],
  ["mat.grunt", "cw.product.grunt", "Grunt podłoża", "l", "MALOWANIE"],
  ["mat.gladz_gipsowa", "cw.product.gladz_gipsowa", "Gładź gipsowa", "kg", "SCIANY_GK"],
  ["mat.plyta_gk", "cw.product.plyta_gk", "Płyta GK", "m2", "SCIANY_GK"],
  ["mat.gniazdo", "cw.product.gniazdo", "Gniazdo wtyczkowe", "szt", "ELEKTRYKA"],
  ["mat.wlacznik", "cw.product.wlacznik", "Włącznik światła", "szt", "ELEKTRYKA"],
];

function productCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T0,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: T0,
        works: S2C_PRODUCTS.map(([mk, cw, name, unit, tradeId]) => ({
          id: cw,
          tradeId,
          namePl: name,
          unit,
          companyPricePln: 0,
          updatedAt: T0,
          keywords: [mk, "produkt"],
          active: true,
          favorite: false,
          usageCount: 0,
          source: "seed",
          freshnessStatus: "missing",
        })),
      },
    },
  });
}

function worksByIdFrom(store) {
  return new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
}

console.log("=== S2-C Product Coverage Pack ===\n");

eq("0 pack size 26", S2C_PRODUCTS.length, 26);

// 1–2 materialKey + CatalogWork HIT
for (const [mk, cw] of S2C_PRODUCTS) {
  const map = mapMaterialToMarketWork(mk);
  ok(`1 map HIT ${mk}`, Boolean(map));
  eq(`2 workId ${mk}`, map.workId, cw);
  ok(`2 product id ${cw}`, isProductCatalogWorkId(cw));
  eq(`2 reverse ${cw}`, lookupMaterialKeyByCatalogWorkId(cw), mk);
}

// 3 exact alias + unit → HIT
for (const [mk, , name, unit] of S2C_PRODUCTS) {
  eq(`3 alias ${name}|${unit}`, lookupMaterialKeyByExactAlias(name, unit), mk);
}

// 4 wrong unit → MISS
eq("4 wrong unit WC", lookupMaterialKeyByExactAlias("Kompakt WC", "m2"), null);

// 5 unknown name → MISS
eq("5 unknown", lookupMaterialKeyByExactAlias("WC", "szt"), null);
eq("5 bateria bare", lookupMaterialKeyByExactAlias("Bateria", "szt"), null);
eq("5 klej bare", lookupMaterialKeyByExactAlias("Klej", "kg"), null);

// 6 labor ≠ product Quotes host
for (const labor of LABOR_CATALOG_WORK_BLOCKLIST) {
  ok(`6 labor blocked ${labor}`, isLaborCatalogWorkBlockedForProductQuotes(labor));
  ok(
    `6 labor not product workId ${labor}`,
    !DEFAULT_MATERIAL_MARKET_MAP.some(
      (e) => e.workId === labor || (e.candidateWorkIds ?? []).includes(labor),
    ),
  );
}

// 7 product → S0 researchable
{
  const d = {
    materialKey: "mat.wc_compact",
    catalogWorkId: "cw.product.wc_compact",
  };
  ok("7 researchable", isDemandResearchableS0(d));
  ok(
    "7 labor not product identity",
    resolveDemandProductIdentityExact({ catalogWorkId: "montaz-wc-szt" }) === null,
  );
}

// 8 S2-A Trade
{
  resetTf();
  const store = productCatalog();
  const byId = worksByIdFrom(store);
  const demand = {
    demandId: buildPriceDemandId({
      materialKey: "mat.wc_compact",
      region: "wroclaw",
      catalogWorkId: "cw.product.wc_compact",
    }),
    materialKey: "mat.wc_compact",
    catalogWorkId: "cw.product.wc_compact",
    region: "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    namePl: "Kompakt WC",
    unit: "szt",
    tenderIds: ["t1"],
    occurrenceCount: 1,
    createdAt: T0,
    updatedAt: T0,
  };
  const brief = buildResearchIntelligenceBrief({ demand, worksById: byId, nowMs: Date.parse(T1) });
  eq("8 Trade LAZIENKA", brief.tradeId, "LAZIENKA");
  eq("8 catalogWorkId product", brief.catalogWorkId, "cw.product.wc_compact");
}

// 9 S1-A after ACCEPT
{
  resetTf();
  let current = productCatalog();
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
      priceNet: 299,
      priceDate: "2026-08-01",
    },
    { candidateId: "s2c_1", retrievedAt: T0 },
  );
  const acc = await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore: { schemaVersion: 1, updatedAt: T0, demands: [] },
    commitOptions: { deps, updatedAtIso: T0 },
  });
  ok("9 ACCEPT ok", acc.ok);
  const mem = lookupPriceMemory({
    materialKey: "mat.umywalka",
    catalogWorkId: "cw.product.umywalka",
    region: "wroclaw",
    worksById: worksByIdFrom(deps.get()),
    nowMs: Date.parse(T1),
  });
  eq("9 S1 HIT", mem.status, "HIT");
  eq("9 price", mem.hit.price, 299);
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
  eq("9 wroteQuotes false", reuse.wroteQuotes, false);
}

// 10 brodzik != wanna
eq("10 brodzik alias", lookupMaterialKeyByExactAlias("Brodzik", "szt"), "mat.brodzik");
eq("10 wanna miss", lookupMaterialKeyByExactAlias("Wanna", "szt"), null);
ok(
  "10 no mat.wanna",
  !DEFAULT_MATERIAL_MARKET_MAP.some((e) => e.materialKey === "mat.wanna"),
);

// 11 klamka != zamek
eq("11 klamka", lookupMaterialKeyByExactAlias("Klamka", "szt"), "mat.klamka");
eq("11 zamek", lookupMaterialKeyByExactAlias("Zamek", "szt"), "mat.zamek");
ok(
  "11 distinct works",
  mapMaterialToMarketWork("mat.klamka").workId !== mapMaterialToMarketWork("mat.zamek").workId,
);

// 12 batteries distinct
ok(
  "12 batteries distinct",
  mapMaterialToMarketWork("mat.bateria_umywalkowa").workId !==
    mapMaterialToMarketWork("mat.bateria_prysznicowa").workId,
);

// 13 klej plytki != glue etics
ok(
  "13 klej != etics",
  mapMaterialToMarketWork("mat.klej_plytki").workId !==
    mapMaterialToMarketWork("mat.glue_etics").workId,
);

// 14–15 zero price / purchase writes from coverage
eq("14 no Quotes write", materialCoverageWritesMarketQuotes(), false);
eq("15 no Purchase write", materialCoverageWritesPurchase(), false);

// 16–19 static + fuzzy
{
  const src = [
    readFileSync(resolve("src/lib/pricing-expert/material-market-map.ts"), "utf8"),
    readFileSync(resolve("src/lib/price-intelligence/demand-collect.ts"), "utf8"),
  ].join("\n");
  ok("16 0 fetch", !/\bfetch\s*\(/.test(src));
  ok("17 0 SQL", !/\bSELECT\b|\bINSERT\b|sqlite|postgres/i.test(src));
  ok("18 0 Price KV", !/kw-price-|PRICE_KV/.test(src));
  eq("19 fuzzy false", materialCoverageUsesFuzzyMatching(), false);
  ok("19 no LLM imports", !/from\s+["']openai|createEmbedding|levenshtein\(/.test(src));
}

// Demand wiring: exact alias lines
{
  const cands = collectPriceDemandCandidates({
    execution: { bom: { materials: [] } },
    pricing: { lines: [] },
    company: { purchaseByMaterialKey: {} },
    context: {
      exactAliasLines: [
        { namePl: "Kompakt WC", unit: "szt" },
        { namePl: "WC", unit: "szt" },
      ],
      region: "wroclaw",
      tenderId: "t-alias",
      requestedAt: T0,
    },
  });
  eq("wiring alias HIT count", cands.length, 1);
  eq("wiring materialKey", cands[0].materialKey, "mat.wc_compact");
  eq("wiring catalogWorkId", cands[0].catalogWorkId, "cw.product.wc_compact");
}

// Demand wiring: materialKey path prefers product
{
  const cands = collectPriceDemandCandidates({
    execution: {
      bom: {
        materials: [{ materialKey: "mat.klej_plytki", namePl: "Klej do płytek", unit: "kg" }],
      },
    },
    pricing: { lines: [] },
    company: { purchaseByMaterialKey: {} },
    context: { region: "wroclaw", requestedAt: T0 },
  });
  eq("wiring bom catalogWorkId", cands[0]?.catalogWorkId, "cw.product.klej_plytki");
}

// Seed manifest valid + 26 products
{
  const yaml = readFileSync(resolve("docs/work-catalog/SEED-MANIFEST-v1.0.yaml"), "utf8");
  const v = validateSeedManifestYaml(yaml);
  ok("seed valid", v.valid);
  const productLines = yaml.split("\n").filter((l) => l.includes("id: cw.product."));
  eq("seed 26 product ids", productLines.length, 26);
}

// Existing ETICS still present
ok("etics retained", Boolean(mapMaterialToMarketWork("mat.eps_graph")));
ok("sand retained", Boolean(mapMaterialToMarketWork("mat.sand")));

// resolveMaterialCoverageExact
eq(
  "resolve exact alias",
  resolveMaterialCoverageExact({ namePl: "Fuga", unit: "kg" })?.materialKey,
  "mat.fuga",
);

console.log(`\n=== S2-C DONE: ${passed} PASS ===`);
