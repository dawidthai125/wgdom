/**
 * CATALOG-COVERAGE-01 P0e — unit + TN/TP (fixture works FULL).
 * Uruchom: npx vite-node scripts/test-catalog-coverage-01-p0e.mjs
 */
import {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID,
  hasZaprawianieBruzdNegation,
  hasZaprawianieBruzdPositive,
  isProductIdForbiddenByNegationGuard,
  normalizeOfferBoqDescription,
  resolveCatalogCoverageAlias,
} from "../src/lib/catalog-coverage/index.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
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

function baseLine(description, unit = "m") {
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

function fakeWork(id, namePl, keywords, unit = "szt") {
  return {
    id,
    namePl,
    unit,
    active: true,
    tradeId: "INNE",
    keywords,
    companyPricePln: 10,
    marketQuotes: {
      wgdom: {
        wroclaw: { price: 10, updatedAt: "2026-07-31T00:00:00.000Z", confidence: 0.9 },
      },
    },
    updatedAt: "2026-07-31T00:00:00.000Z",
    freshnessStatus: "ok",
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

const FULL_WORKS = [
  fakeWork(
    "cc-p0c-w1-zaprawianie-bruzd",
    "Zaprawianie / zamurowanie bruzd",
    ["zaprawianie bruzd", "zamurowanie bruzd"],
    "mb",
  ),
  fakeWork(
    "cc-p0c-w1-zabezpieczenie-folia",
    "Zabezpieczenie powierzchni folią",
    [
      "zabezpieczenie okien folią",
      "zabezpieczenie podłóg folią",
      "zabezpieczenie stolarki folią",
    ],
    "m2",
  ),
  fakeWork("cc-p0c-w1-multiswitch-antenowy", "Multiswitch antenowy", [
    "multiswitch",
    "multiswitch antenowy",
  ]),
];

const SAFE_WORKS = [
  fakeWork("cc-p0c-w1-zawor-odpowietrzajacy", "Odpowietrznik automatyczny CO", [
    "zawór odpowietrzający",
    "odpowietrznik automatyczny",
  ]),
  fakeWork(
    "cc-p0c-w1-stop-ptakow",
    "Kolce przeciwptasie (elewacja)",
    ["stop ptaków", "kolce przeciwptasie"],
    "mb",
  ),
];

const ALL = [...SAFE_WORKS, ...FULL_WORKS];

console.log("=== CATALOG-COVERAGE-01 P0e FULL ===\n");

console.log("Pack AS-IS (0 zmian Precision)");
assert(CATALOG_COVERAGE_P0C_WAVE1_PACK.length === 6, "Pack 6 rules");
assert(
  CATALOG_COVERAGE_P0C_WAVE1_PACK.find((r) => r.aliasRuleId === "zabezpieczenie_folia")
    ?.productId === "cc-p0c-w1-zabezpieczenie-folia",
  "BIZ A: 1 Product ID folia",
);
assert(
  CATALOG_COVERAGE_P0C_WAVE1_PACK.find((r) => r.aliasRuleId === "multiswitch_antenowy")
    ?.test(foldPolishText("rtv sat gniazdo")) === false,
  "multiswitch Precision: no RTV/SAT",
);

console.log("\nTN — negacja + RTV");
{
  const desc =
    "Przewody kabelkowe układane w gotowych bruzdach bez zaprawiania bruzd na podłożu nie-betonowym";
  const fold = foldPolishText(normalizeOfferBoqDescription(desc).normalizedDescription || desc);
  assert(hasZaprawianieBruzdNegation(fold), "TN-Z negation");
  assert(!hasZaprawianieBruzdPositive(fold), "TN-Z no positive");
  const a = resolveCatalogCoverageAlias({ description: desc, works: ALL });
  assert(!a.resolvedProductId, "TN-Z Alias no bind");
  const m = mapOfferBoqLine(baseLine(desc, "mb"), { works: ALL, cenyMaterialowUplift: true });
  assert(m.catalogWorkId !== CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID, "TN-CORE: no zaprawianie bind");
  assert(
    isProductIdForbiddenByNegationGuard(desc, CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID),
    "TN Guard forbids",
  );
}
{
  const desc = "Wypusty na gniazdo antenowe RTV/SAT";
  const m = mapOfferBoqLine(baseLine(desc, "szt"), { works: ALL, cenyMaterialowUplift: true });
  assert(m.catalogWorkId !== "cc-p0c-w1-multiswitch-antenowy", "TN-M no multiswitch");
}

console.log("\nTP — FULL binds (DATA FIRST)");
{
  const z = mapOfferBoqLine(baseLine("Zaprawianie bruzd", "m"), {
    works: ALL,
    cenyMaterialowUplift: true,
  });
  assert(z.catalogWorkId === "cc-p0c-w1-zaprawianie-bruzd", "TP-Z1 zaprawianie");
  assert(z.matchMethod === "alias", "TP-Z1 alias method");

  const z2 = mapOfferBoqLine(baseLine("Zamurowanie bruzd poziomych o szerokości 1/2 ceg.", "m"), {
    works: ALL,
    cenyMaterialowUplift: true,
  });
  assert(z2.catalogWorkId === "cc-p0c-w1-zaprawianie-bruzd", "TP-Z2 zamurowanie");

  const f = mapOfferBoqLine(baseLine("Zabezpieczenie okien folią", "m2"), {
    works: ALL,
    cenyMaterialowUplift: true,
  });
  assert(f.catalogWorkId === "cc-p0c-w1-zabezpieczenie-folia", "TP-F1 folia");

  const m = mapOfferBoqLine(
    baseLine("Instalowanie multiswitcha 9/20 w obudowie metalowej", "szt"),
    { works: ALL, cenyMaterialowUplift: true },
  );
  assert(m.catalogWorkId === "cc-p0c-w1-multiswitch-antenowy", "TP-M1 multiswitch");
}

console.log("\nDATA FIRST — bez work = no-op");
{
  const a = resolveCatalogCoverageAlias({
    description: "Zaprawianie bruzd",
    works: SAFE_WORKS,
  });
  assert(a.matched && a.missingWork && !a.resolvedProductId, "missingWork no bind");
}

console.log("\n=== WYNIK P0e:", `${passed} PASS · ${failed} FAIL ===`);
if (failed) process.exit(1);
