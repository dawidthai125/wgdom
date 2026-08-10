/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S4 — Owner-Approved Exact Alias Expansion.
 * npx vite-node scripts/test-price-intelligence-demand-research-s4.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectPriceDemandCandidates } from "../src/lib/price-intelligence/index.ts";
import { extractExactAliasLinesFromOfferBoq } from "../src/lib/price-intelligence/offer-boq-exact-alias-lines.ts";
import {
  DEFAULT_MATERIAL_COVERAGE_ALIASES,
  DEFAULT_MATERIAL_MARKET_MAP,
  S4_OWNER_APPROVED_EXACT_ALIASES,
  S4_REJECTED_ALIASES,
  isLaborCatalogWorkBlockedForProductQuotes,
  isProductCatalogWorkId,
  lookupMaterialKeyByExactAlias,
  mapMaterialToMarketWork,
  normalizeCoverageAliasKey,
  preferProductCatalogWorkId,
  resolveDemandProductIdentityExact,
} from "../src/lib/pricing-expert/material-market-map.ts";

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

console.log("\n=== DEMAND-RESEARCH-01 S4 EXACT ALIAS EXPANSION ===\n");

ok("0 S4 aliases > 0", S4_OWNER_APPROVED_EXACT_ALIASES.length > 0);
eq("0 S4 count", S4_OWNER_APPROVED_EXACT_ALIASES.length, 32);

const mapKeys = new Set(DEFAULT_MATERIAL_MARKET_MAP.map((e) => e.materialKey));

// 1–2 each S4 alias → materialKey + correct unit HIT + CatalogWork
for (const a of S4_OWNER_APPROVED_EXACT_ALIASES) {
  ok(`1 exists ${a.materialKey}`, mapKeys.has(a.materialKey));
  eq(`1 alias ${a.namePl}|${a.unit}`, lookupMaterialKeyByExactAlias(a.namePl, a.unit), a.materialKey);
  const map = mapMaterialToMarketWork(a.materialKey);
  ok(`2 map ${a.materialKey}`, !!map);
  const cw = preferProductCatalogWorkId(map);
  ok(`2 work ${a.namePl}`, !!cw);
  const id = resolveDemandProductIdentityExact({ namePl: a.namePl, unit: a.unit });
  eq(`2 identity mk ${a.namePl}`, id?.materialKey, a.materialKey);
  eq(`2 identity cw ${a.namePl}`, id?.catalogWorkId, cw);
}

// 3 wrong unit → MISS
eq("3 wrong unit umywalka", lookupMaterialKeyByExactAlias("Umywalka ceramiczna", "m2"), null);
eq("3 wrong unit farba", lookupMaterialKeyByExactAlias("Farba lateksowa", "kg"), null);

// 4 canonical S2-C still HIT
eq("4 canonical Umywalka", lookupMaterialKeyByExactAlias("Umywalka", "szt"), "mat.umywalka");
eq("4 canonical Kompakt WC", lookupMaterialKeyByExactAlias("Kompakt WC", "szt"), "mat.wc_compact");
eq(
  "4 canonical Farba lateksowa wewnętrzna",
  lookupMaterialKeyByExactAlias("Farba lateksowa wewnętrzna", "l"),
  "mat.farba_lateksowa_wewnetrzna",
);

// 5 S2-B / ETICS regression
eq("5 EPS grafit full", lookupMaterialKeyByExactAlias("Płyta EPS grafit", "m2"), "mat.eps_graph");
eq("5 Klej do ETICS", lookupMaterialKeyByExactAlias("Klej do ETICS", "kg"), "mat.glue_etics");
eq("5 Kostka betonowa", lookupMaterialKeyByExactAlias("Kostka betonowa", "m2"), "mat.cubes_beton");
eq("5 Piasek", lookupMaterialKeyByExactAlias("Piasek podsypkowy", "m3"), "mat.sand");

// 6 duplicate alias key → same materialKey (no ambiguity)
{
  const byKey = new Map();
  let ambiguous = 0;
  for (const a of DEFAULT_MATERIAL_COVERAGE_ALIASES) {
    const key = normalizeCoverageAliasKey(a.namePl, a.unit);
    if (byKey.has(key) && byKey.get(key) !== a.materialKey) ambiguous += 1;
    else if (!byKey.has(key)) byKey.set(key, a.materialKey);
  }
  eq("6 ambiguous duplicates", ambiguous, 0);
}

// 7 labor blocked
ok("7 labor montaz-wc", isLaborCatalogWorkBlockedForProductQuotes("montaz-wc-szt"));
eq(
  "7 labor identity",
  resolveDemandProductIdentityExact({ catalogWorkId: "montaz-wc-szt", unit: "szt" }),
  null,
);

// 8–10 MISS cases
eq("8 Montaż WC", lookupMaterialKeyByExactAlias("Montaż WC", "szt"), null);
eq("8 Montaż umywalki", lookupMaterialKeyByExactAlias("Montaż umywalki", "szt"), null);
eq("9 WC bare", lookupMaterialKeyByExactAlias("WC", "szt"), null);
eq("9 bateria bare", lookupMaterialKeyByExactAlias("bateria", "szt"), null);
eq("9 Farba bare", lookupMaterialKeyByExactAlias("Farba", "l"), null);
eq("9 Klej bare", lookupMaterialKeyByExactAlias("Klej", "kg"), null);
eq("10 unknown", lookupMaterialKeyByExactAlias("SuperGizmo XYZ", "szt"), null);
eq("10 wanna", lookupMaterialKeyByExactAlias("wanna 170x70", "szt"), null);
ok("10 rejected list", S4_REJECTED_ALIASES.length >= 8);

// S3 bridge + S4 alias → Demand HIT
{
  const exactAliasLines = extractExactAliasLinesFromOfferBoq({
    lines: [{ description: "Umywalka ceramiczna", unit: "szt" }],
  });
  const cands = collectPriceDemandCandidates({
    execution: { bom: { materials: [], labour: [], equipment: [] } },
    pricing: { lines: [] },
    company: {
      purchaseByMaterialKey: {},
      defaultLaborPlnPerHour: 50,
      laborPlnPerHourByKey: {},
      equipmentRateByKey: {},
    },
    context: {
      tenderId: "t-s4",
      region: "wroclaw",
      requestedAt: "2026-08-10T00:00:00.000Z",
      exactAliasLines,
    },
  });
  eq("S3+S4 Demand HIT mk", cands[0]?.materialKey, "mat.umywalka");
  ok("S3+S4 product cw", isProductCatalogWorkId(cands[0]?.catalogWorkId ?? ""));
}

// 11–15 safety static
{
  const src = readFileSync(resolve("src/lib/pricing-expert/material-market-map.ts"), "utf8");
  const s4Zone = src.slice(src.indexOf("S4_OWNER_APPROVED"), src.indexOf("S4_REJECTED"));
  ok("11 no Quotes write in S4 aliases", !/commitMarketQuotesImport|marketQuotes\s*=/.test(s4Zone));
  ok("12 no Purchase write in S4", !/purchaseByMaterialKey|applyPi31ApprovedPurchase/.test(s4Zone));
  ok("13 0 fetch in S4 zone", !/\bfetch\s*\(/.test(s4Zone));
  ok("14 0 SQL", !/\bCREATE TABLE\b|\bSELECT\s+\*/i.test(s4Zone));
  ok("15 0 Price KV", !/kw-price-|kw-market-quote-history/i.test(s4Zone));
  ok("11b no fuzzyMatch", !/fuzzyMatch|fuse\.js|levenshtein|string-similarity/i.test(s4Zone));
  ok(
    "11c no new OUT materialKey in S4",
    !/materialKey:\s*"mat\.(wanna|listwa|pex|cement|osb)/.test(s4Zone),
  );
}

// Owner example
eq(
  "Owner example Umywalka ceramiczna",
  lookupMaterialKeyByExactAlias("Umywalka ceramiczna", "szt"),
  "mat.umywalka",
);

console.log(`\n=== S4 DONE: ${passed} PASS · aliases=${S4_OWNER_APPROVED_EXACT_ALIASES.length} ===\n`);
