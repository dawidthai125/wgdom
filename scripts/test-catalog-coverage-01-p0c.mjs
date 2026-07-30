/**
 * CATALOG-COVERAGE-01 P0c — Alias Resolver unit + integration.
 * Uruchom: npx vite-node scripts/test-catalog-coverage-01-p0c.mjs
 */
import {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  CATALOG_COVERAGE_P0C_WAVE1_RULE_IDS,
  countCatalogCoverageAliasHits,
  resolveCatalogCoverageAlias,
  resolveCatalogCoverageAliasStable,
  normalizeOfferBoqDescription,
  classifyOfferBoqLineNoise,
} from "../src/lib/catalog-coverage/index.ts";
import { mapOfferBoqLine, mapOfferBoqLineCore } from "../src/lib/tender-offer-boq-mapping.ts";
import { foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function baseLine(description, unit = "szt") {
  return {
    lineId: "t1",
    lp: "1",
    description,
    quantity: 1,
    quantityRaw: "1",
    unit,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
  };
}

function fakeWork(id, namePl = id) {
  return {
    id,
    namePl,
    unit: "szt",
    active: true,
    tradeId: "INNE",
    keywords: [],
    companyPricePln: 10,
    marketQuotes: {},
    updatedAt: "2026-07-30T00:00:00.000Z",
    freshnessStatus: "ok",
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

const ALL_WORKS = CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) =>
  fakeWork(r.productId, r.labelPl),
);

console.log("=== CATALOG-COVERAGE-01 P0c Alias Resolver ===\n");

console.log("1. Pack Wave 1 — SSOT");
assert(CATALOG_COVERAGE_P0C_WAVE1_PACK.length === 6, "Pack ma dokładnie 6 reguł");
assert(CATALOG_COVERAGE_P0C_WAVE1_RULE_IDS.length === 6, "6 rule IDs");
assert(
  new Set(CATALOG_COVERAGE_P0C_WAVE1_RULE_IDS).size === 6,
  "Unikalne aliasRuleId (brak duplikatów)",
);
assert(
  new Set(CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) => r.productId)).size === 6,
  "1 reguła → 1 Product ID (unikalne)",
);
assert(
  CATALOG_COVERAGE_P0C_WAVE1_PACK.every((r, i) => r.order === i + 1),
  "Kolejność order #1–#6",
);

console.log("\n2. Match + Product ID (z fixture works)");
const samples = [
  ["Zaprawianie bruzd", "zaprawianie_bruzd"],
  ["Zaprawianie bruzd o szer. do 100 mm", "zaprawianie_bruzd"],
  ["Zawór odpowietrzający o śr. 6 mm", "zawor_odpowietrzajacy"],
  ["Zabezpieczenie okien folią", "zabezpieczenie_folia"],
  ["Montaż stop ptaków", "stop_ptakow"],
  ["Instalowanie multiswitcha 9/20 w obudowie", "multiswitch_antenowy"],
  ["Rozebranie pieców i trzonów kuchennych oblicowanych kaflami", "piece_demontaz"],
  ["Demontaż pieca kaflowego", "piece_demontaz"],
];
for (const [desc, ruleId] of samples) {
  const r = resolveCatalogCoverageAlias({ description: desc, works: ALL_WORKS });
  assert(r.matched && r.aliasRuleId === ruleId, `match ${ruleId}: ${desc.slice(0, 40)}`);
  assert(!!r.resolvedProductId, `resolvedProductId dla ${ruleId}`);
}

console.log("\n3. piece_demontaz — AR binding (bez gołego piece)");
assert(
  !resolveCatalogCoverageAlias({
    description: "piece of equipment",
    works: ALL_WORKS,
  }).matched,
  "samotne 'piece' (EN) → brak match",
);
assert(
  !resolveCatalogCoverageAlias({
    description: "Wymiana pieca gazowego",
    works: ALL_WORKS,
  }).matched,
  "sam 'piec' bez demontaż/rozebranie → brak",
);
assert(
  !resolveCatalogCoverageAlias({
    description: "Demontaż drzwi wewnętrznych",
    works: ALL_WORKS,
  }).matched,
  "demontaż bez piec/trzon → brak",
);
assert(
  resolveCatalogCoverageAlias({
    description: "Rozebranie pieców i trzonów kuchennych",
    works: ALL_WORKS,
  }).aliasRuleId === "piece_demontaz",
  "rozebranie + piec → piece_demontaz",
);

console.log("\n4. Eligible only (noise)");
const noiseAlias = resolveCatalogCoverageAlias({
  description: "Zaprawianie bruzd",
  isNoise: true,
  works: ALL_WORKS,
});
assert(!noiseAlias.matched && !noiseAlias.resolvedProductId, "isNoise → Resolver SKIP");

console.log("\n5. DATA FIRST — brak work → null (no-op)");
const missing = resolveCatalogCoverageAlias({
  description: "Zaprawianie bruzd",
  works: [],
});
assert(missing.matched && missing.missingWork && !missing.resolvedProductId, "match tekstowy, brak work → null");

console.log("\n6. Determinizm / idempotencja");
for (const [desc] of samples) {
  const a = resolveCatalogCoverageAlias({ description: desc, works: ALL_WORKS });
  const b = resolveCatalogCoverageAliasStable({ description: desc, works: ALL_WORKS });
  assert(
    a.aliasRuleId === b.aliasRuleId && a.resolvedProductId === b.resolvedProductId,
    `idempotent: ${desc.slice(0, 36)}`,
  );
}

console.log("\n7. First match + multi-hit");
// Syntetyczny opis trafiający w folię i stop — folia (#3) wygrywa nad stop (#4)
const overlapDesc = "Zabezpieczenie okien folią przed ptakami";
const hitCount = countCatalogCoverageAliasHits(overlapDesc);
assert(hitCount >= 1, `overlap sample hits=${hitCount}`);
const first = resolveCatalogCoverageAlias({ description: overlapDesc, works: ALL_WORKS });
assert(
  first.aliasRuleId === "zabezpieczenie_folia",
  "first match: zabezpieczenie_folia przed stop_ptakow",
);

// Brak multi-hit na kanonicznych próbkach Wave 1
for (const [desc] of samples) {
  assert(countCatalogCoverageAliasHits(desc) === 1, `single-hit: ${desc.slice(0, 40)}`);
}

console.log("\n8. Integracja mapOfferBoqLine (po Normalizer, override Core)");
const mapped = mapOfferBoqLine(baseLine("Zaprawianie bruzd o szer. do 100 mm"), {
  works: ALL_WORKS,
});
assert(mapped.catalogWorkId === "cc-p0c-w1-zaprawianie-bruzd", "bind Product ID");
assert(mapped.matchMethod === "alias" && mapped.matchedBy === "alias", "matchedBy=alias");
assert(mapped.aliasRuleId === "zaprawianie_bruzd", "aliasRuleId na linii");
assert(mapped.description === "Zaprawianie bruzd o szer. do 100 mm", "UI description SSOT");
assert(!!mapped.normalizedDescription, "normalizedDescription ephemeral");

const noiseLine = mapOfferBoqLine(baseLine("Kalkulacja własna"), { works: ALL_WORKS });
assert(noiseLine.isNoise === true && !noiseLine.catalogWorkId, "noise → brak alias bind");

const coreOnly = mapOfferBoqLineCore(baseLine("Zaprawianie bruzd"), { works: ALL_WORKS });
assert(
  coreOnly.matchMethod !== "alias",
  "Core sam nie ustawia alias (wire tylko w mapOfferBoqLine)",
);

console.log("\n9. Po Normalizer — hay znormalized");
const messy = "Zawór odpowietrzający o śr. 6 mm  d.3.2 0101-08";
const norm = normalizeOfferBoqDescription(messy);
const viaNorm = resolveCatalogCoverageAlias({
  description: norm.normalizedDescription,
  works: ALL_WORKS,
});
assert(viaNorm.aliasRuleId === "zawor_odpowietrzajacy", "match po Normalizer");

console.log("\n10. Fold smoke piece");
assert(foldPolishText("Rozebranie pieców").includes("piec"), "fold pieców→piec");

console.log(`\n=== WYNIK: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
