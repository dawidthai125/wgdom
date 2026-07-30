/**
 * CATALOG-COVERAGE-01 P0d-A — unit + TN/TP/TR + TN-CORE-Z1.
 * Uruchom: npx vite-node scripts/test-catalog-coverage-01-p0d-a.mjs
 */
import {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID,
  countCatalogCoverageAliasHits,
  decideCatalogCoverageBindProductId,
  hasZaprawianieBruzdNegation,
  hasZaprawianieBruzdPositive,
  isProductIdForbiddenByNegationGuard,
  listNegationGuardedForbiddenProductIds,
  normalizeOfferBoqDescription,
  resolveCatalogCoverageAlias,
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

function fakeWork(id, namePl = id, keywords = []) {
  return {
    id,
    namePl,
    unit: "szt",
    active: true,
    tradeId: "INNE",
    keywords,
    companyPricePln: 10,
    marketQuotes: {
      wgdom: {
        wroclaw: { price: 10, updatedAt: "2026-07-30T00:00:00.000Z", confidence: 0.9 },
      },
    },
    updatedAt: "2026-07-30T00:00:00.000Z",
    freshnessStatus: "ok",
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

const SAFE_WORKS = [
  fakeWork("cc-p0c-w1-zawor-odpowietrzajacy", "Zawór odpowietrzający", [
    "zawór odpowietrzający",
    "odpowietrznik",
  ]),
  fakeWork("cc-p0c-w1-stop-ptakow", "Montaż stop ptaków", ["stop ptaków", "kolce przeciw"]),
];

const ZAPRAW_WORK = fakeWork(
  CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID,
  "Zaprawianie / zamurowanie bruzd",
  ["zaprawianie bruzd", "zamurowanie bruzd"],
);

const ALL_PACK_WORKS = CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) =>
  fakeWork(r.productId, r.labelPl, [r.labelPl]),
);

console.log("=== CATALOG-COVERAGE-01 P0d-A Precision + Guard + SAFE ===\n");

console.log("TN-Z — bez zaprawiania bruzd");
const negSamples = [
  "Przewody kabelkowe układane w gotowych bruzdach bez zaprawiania bruzd na podłożu nie-betonowym",
  "bez zaprawiania bruzd",
  "z wyłączeniem zaprawiania bruzd",
];
for (const desc of negSamples) {
  const fold = foldPolishText(normalizeOfferBoqDescription(desc).normalizedDescription || desc);
  assert(hasZaprawianieBruzdNegation(fold), `TN-Z negation detect: ${desc.slice(0, 50)}`);
  assert(!hasZaprawianieBruzdPositive(fold), `TN-Z no positive: ${desc.slice(0, 50)}`);
  const a = resolveCatalogCoverageAlias({ description: desc, works: ALL_PACK_WORKS });
  assert(!a.matched && !a.resolvedProductId, `TN-Z Alias NO: ${desc.slice(0, 50)}`);
  assert(
    isProductIdForbiddenByNegationGuard(desc, CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID),
    `TN-Z Guard forbids ID: ${desc.slice(0, 40)}`,
  );
}

console.log("\nTN-M — RTV/SAT bez multiswitch");
const rtvSamples = [
  "Wypusty na gniazdo antenowe RTV/SAT",
  "instalacja antenowa w budynku",
  "okablowanie RTV-SAT",
];
for (const desc of rtvSamples) {
  const a = resolveCatalogCoverageAlias({ description: desc, works: ALL_PACK_WORKS });
  assert(
    a.aliasRuleId !== "multiswitch_antenowy",
    `TN-M no multiswitch: ${desc.slice(0, 50)}`,
  );
}

console.log("\nTN-CORE-Z1 — Guard blokuje Core keywords");
{
  const desc =
    "Przewody kabelkowe układane w gotowych bruzdach bez zaprawiania bruzd na podłożu nie-betonowym";
  const works = [...SAFE_WORKS, ZAPRAW_WORK, fakeWork("legacy-elektryka-mb", "Elektryka (mb)", [
    "przewody kabelkowe",
    "układane w gotowych bruzdach",
  ])];
  // Core alone (bez Guard w Core export) mógłby trafić w keywords zaprawiania —
  // pełny tor mapOfferBoqLine MUSI odrzucić ID zaprawianie.
  const mapped = mapOfferBoqLine(baseLine(desc, "mb"), {
    works,
    cenyMaterialowUplift: true,
  });
  assert(
    mapped.catalogWorkId !== CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID,
    "TN-CORE-Z1: catalogWorkId ≠ zaprawianie-seed",
  );
  assert(
    decideCatalogCoverageBindProductId(desc, CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID) === null,
    "TN-CORE-Z1: Bind Decision null dla zaprawianie",
  );
  const forbidden = listNegationGuardedForbiddenProductIds(desc);
  assert(forbidden.has(CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID), "TN-CORE-Z1: forbidden set");
}

console.log("\nTP — pozytywne");
{
  const z1 = resolveCatalogCoverageAlias({
    description: "Zaprawianie bruzd",
    works: ALL_PACK_WORKS,
  });
  assert(z1.aliasRuleId === "zaprawianie_bruzd" && !!z1.resolvedProductId, "TP-Z1");
  const z2 = resolveCatalogCoverageAlias({
    description: "Zaprawianie bruzd o szer. do 50 mm",
    works: ALL_PACK_WORKS,
  });
  assert(z2.aliasRuleId === "zaprawianie_bruzd", "TP-Z2");
  const z3 = resolveCatalogCoverageAlias({
    description: "Zamurowanie bruzd poziomych o szerokości 1/2 ceg.",
    works: ALL_PACK_WORKS,
  });
  assert(z3.aliasRuleId === "zaprawianie_bruzd", "TP-Z3");
  const m1 = resolveCatalogCoverageAlias({
    description: "Instalowanie multiswitcha 9/20 w obudowie metalowej",
    works: ALL_PACK_WORKS,
  });
  assert(m1.aliasRuleId === "multiswitch_antenowy", "TP-M1");
  const v1 = mapOfferBoqLine(baseLine("Zawór odpowietrzający o śr. 6 mm"), {
    works: SAFE_WORKS,
  });
  assert(v1.catalogWorkId === "cc-p0c-w1-zawor-odpowietrzajacy", "TP-V1 SAFE bind");
  assert(v1.matchMethod === "alias", "TP-V1 alias method");
  const s1 = mapOfferBoqLine(baseLine("Montaż stop ptaków", "m"), { works: SAFE_WORKS });
  assert(s1.catalogWorkId === "cc-p0c-w1-stop-ptakow", "TP-S1 SAFE bind");
}

console.log("\nTR — regresja");
{
  assert(CATALOG_COVERAGE_P0C_WAVE1_PACK.length === 6, "TR: Pack nadal 6 reguł");
  assert(
    countCatalogCoverageAliasHits("Zawór odpowietrzający o śr. 6 mm") === 1,
    "TR: single-hit zawór",
  );
  const core = mapOfferBoqLineCore(baseLine("Zaprawianie bruzd"), { works: ALL_PACK_WORKS });
  assert(core.matchMethod !== "alias", "TR: Core bez alias method");
  // Guard shared: Alias i Core decision ten sam werdykt
  const hay = "bez zaprawiania bruzd";
  assert(
    decideCatalogCoverageBindProductId(hay, CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID) === null,
    "TR-GUARD: Alias/Core shared decision",
  );
}

console.log("\nP0e OUT — brak seedów FULL w SAFE fixture");
assert(
  !SAFE_WORKS.some((w) =>
    ["cc-p0c-w1-zaprawianie-bruzd", "cc-p0c-w1-zabezpieczenie-folia", "cc-p0c-w1-multiswitch-antenowy"].includes(
      w.id,
    ),
  ),
  "SAFE fixture bez P0e IDs",
);

console.log(`\n=== WYNIK P0d-A: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
