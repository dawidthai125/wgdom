/**
 * CATALOG-WAVE-2 — unit tests (Alias Pack MED + Quotes gate + collision).
 * npx vite-node scripts/test-catalog-wave-2.mjs
 */
import {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  CATALOG_COVERAGE_WAVE2_PACK,
  CATALOG_COVERAGE_WAVE2_RULE_IDS,
  CATALOG_WAVE2_PRODUCT_IDS,
  CATALOG_COVERAGE_ALIAS_PACK_DEFAULT,
  resolveCatalogCoverageAlias,
  countCatalogCoverageAliasHits,
  catalogWorkHasUsefulQuotes,
} from "../src/lib/catalog-coverage/index.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`);
  }
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
    marketQuotes: {
      wgdom: { wroclaw: { price: 10, updatedAt: "2026-08-07T00:00:00.000Z", confidence: 0.9 } },
    },
    updatedAt: "2026-08-07T00:00:00.000Z",
    freshnessStatus: "ok",
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

const W1_WORKS = CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) => fakeWork(r.productId, r.labelPl));
const W2_WORKS = CATALOG_COVERAGE_WAVE2_PACK.map((r) => fakeWork(r.productId, r.labelPl));
const ALL = [...W1_WORKS, ...W2_WORKS];

function baseLine(description) {
  return {
    id: "l1",
    lp: "1",
    description,
    unit: "szt",
    quantity: 1,
    catalogWorkId: null,
    matchMethod: null,
    matchedBy: null,
    matchConfidence: null,
    candidateMatches: [],
    aiConfidence: null,
    aiRationale: null,
    costIntelligence: null,
    linePricing: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    workCategory: null,
    categoryId: null,
  };
}

console.log("=== CATALOG-WAVE-2 ===\n");

console.log("1. Pack SSOT");
assert(CATALOG_COVERAGE_WAVE2_PACK.length === 8, "Pack Wave2 = 8 reguł");
assert(CATALOG_COVERAGE_WAVE2_RULE_IDS.length === 8, "8 rule IDs");
assert(new Set(CATALOG_COVERAGE_WAVE2_RULE_IDS).size === 8, "unikalne aliasRuleId");
assert(
  new Set(CATALOG_COVERAGE_WAVE2_PACK.map((r) => r.productId)).size === 8,
  "1 reguła → 1 Product ID",
);
assert(
  CATALOG_COVERAGE_ALIAS_PACK_DEFAULT.length ===
    CATALOG_COVERAGE_P0C_WAVE1_PACK.length + CATALOG_COVERAGE_WAVE2_PACK.length,
  "default pack = Wave1 + Wave2",
);
assert(
  CATALOG_COVERAGE_ALIAS_PACK_DEFAULT[0].aliasRuleId === "zaprawianie_bruzd",
  "Wave1 first",
);
assert(
  CATALOG_COVERAGE_ALIAS_PACK_DEFAULT[6].aliasRuleId === "przebijanie_otworow",
  "Wave2 starts after Wave1",
);

console.log("\n2. Match TOP100 samples → Product ID");
const samples = [
  ["Mechaniczne przebijanie otworów w ścianach lub stropach z cegły", "przebijanie_otworow"],
  [
    "Mocowanie na gotowym.podłożu aparatów o masie do 2.5 kg (il. otworów mocujących do 2) Dzwonek",
    "mocowanie_aparatow",
  ],
  ["Przykręcanie drobnych elementów konstrukcji o masie do 0.5 kg na gotowym podłożu", "mocowanie_aparatow"],
  [
    "Przygotowanie podłoża do zabudowania aparatów-kucie mechan. pod kołki aparat rozp.plast.w podł. z cegły",
    "przygotowanie_pod_osprzet",
  ],
  [
    "Przygotowanie podłoża pod mocowanie osprzętu na zaprawie cementowej z wykonaniem ślepych otworów mechanicznie w cegle",
    "przygotowanie_pod_osprzet",
  ],
  ["Skasowanie wykwitów (zacieków)", "wykwity_zacieki"],
  ["Oczyszczenie i zmywanie podłoża", "oczyszczenie_podloza"],
  ["Przygotowanie i naprawa podłoża - oczyszczenie powierzchni muru", "oczyszczenie_podloza"],
  ["Oczyszczenie powierzchni ścian z cegły", "oczyszczenie_podloza"],
  ["Impregnacja przeciwsolna ręczna", "oczyszczenie_podloza"],
  ["Montaż na gotowym podłożu haczyków", "mocowanie_aparatow"],
  ["Montaż aparatów odbiorczych domofonu", "mocowanie_aparatow"],
  [
    "Obudowa belek i podciągów płytami gipsowo-kartonowymi na rusztach metalowych",
    "plyta_gk_zabudowa",
  ],
  ["Obudowa słupów płytami gipsowo-kartonowymi na rusztach metalowych", "plyta_gk_zabudowa"],
  ["Zawory /pod mywalką,zlewem,bojlerem, o śr. nominalnej 15 mm", "zawor_odcinajacy_15"],
  ["Wykucie wnęk o głębokości do 1 ceg. w ścianach z cegieł", "wykucie_wnek"],
];
for (const [desc, ruleId] of samples) {
  const r = resolveCatalogCoverageAlias({ description: desc, works: ALL });
  assert(r.matched && r.aliasRuleId === ruleId, `match ${ruleId}: ${desc.slice(0, 48)}`);
  assert(
    r.resolvedProductId === CATALOG_WAVE2_PRODUCT_IDS[ruleId],
    `resolved ${ruleId} → ${CATALOG_WAVE2_PRODUCT_IDS[ruleId]}`,
  );
}

console.log("\n3. OUT / false-positive guard");
assert(
  !resolveCatalogCoverageAlias({
    description: "Wykucie z muru podokienników drewnianych, stalowych",
    works: ALL,
  }).matched,
  "OUT BIZ podokienniki → brak match",
);
assert(
  !resolveCatalogCoverageAlias({
    description: "Przygotowanie starego podłoża pod docieplenie metodą lekką-mokrą - oczyszczenie mechaniczne i zmycie",
    works: ALL,
  }).matched,
  "OUT docieplenie lekka-mokra → brak",
);
assert(
  !resolveCatalogCoverageAlias({
    description: "Sprawdzenie samoczynnego wyłączania zasilania (pierwsza próba)",
    works: ALL,
  }).matched,
  "OUT service RCD → brak",
);
assert(
  resolveCatalogCoverageAlias({
    description: "Zawór odpowietrzający o śr. 6 mm",
    works: ALL,
  }).aliasRuleId === "zawor_odpowietrzajacy",
  "Wave1 odpowietrzający nie kradzie Wave2 odcinający",
);
assert(
  !resolveCatalogCoverageAlias({
    description: "Warstwa odcinająca (piasek) zagęszczana mechanicznie",
    works: ALL,
  }).matched,
  "OUT warstwa odcinająca (piasek) ≠ zawór",
);

console.log("\n3b. Strict OUT-BIZ — 0 catalogWorkId cc-w2-* (Alias + Core)");
const outBizLines = [
  "Wykucie z muru podokienników drewnianych, stalowych",
  "Przygotowanie starego podłoża pod docieplenie metodą lekką-mokrą - oczyszczenie mechaniczne i zmycie",
  "Warstwa odcinająca (piasek) zagęszczana mechanicznie",
];
const W2_SET = new Set(Object.values(CATALOG_WAVE2_PRODUCT_IDS));
for (const desc of outBizLines) {
  const mapped = mapOfferBoqLine(baseLine(desc), { works: ALL });
  assert(
    !W2_SET.has(mapped.catalogWorkId || ""),
    `strict no W2 catalogWorkId: ${desc.slice(0, 48)}`,
  );
}

console.log("\n4. Alias Collision Audit — Wave1 samples unchanged");
const w1Samples = [
  ["Zaprawianie bruzd o szer. do 100 mm", "zaprawianie_bruzd"],
  ["Zawór odpowietrzający o śr. 6 mm", "zawor_odpowietrzajacy"],
  ["Zabezpieczenie okien folią", "zabezpieczenie_folia"],
  ["Montaż stop ptaków", "stop_ptakow"],
  ["Instalowanie multiswitcha 9/20 w obudowie", "multiswitch_antenowy"],
  ["Rozebranie pieców i trzonów kuchennych oblicowanych kaflami", "piece_demontaz"],
];
for (const [desc, ruleId] of w1Samples) {
  const r = resolveCatalogCoverageAlias({ description: desc, works: ALL });
  assert(r.aliasRuleId === ruleId, `collision W1: ${ruleId}`);
  assert(countCatalogCoverageAliasHits(desc) === 1, `single-hit W1: ${ruleId}`);
}

console.log("\n5. Quotes gate + DATA FIRST");
assert(catalogWorkHasUsefulQuotes(W2_WORKS[0]), "fixture has useful Quotes");
const noWork = resolveCatalogCoverageAlias({
  description: "Skasowanie wykwitów (zacieków)",
  works: W1_WORKS,
});
assert(noWork.matched && noWork.missingWork && !noWork.resolvedProductId, "brak W2 work → null");
const emptyQ = {
  ...fakeWork(CATALOG_WAVE2_PRODUCT_IDS.wykwity_zacieki),
  marketQuotes: {},
};
const noQ = resolveCatalogCoverageAlias({
  description: "Skasowanie wykwitów (zacieków)",
  works: [...W1_WORKS, emptyQ],
});
assert(noQ.matched && noQ.missingQuotes && !noQ.resolvedProductId, "brak Quotes → null");

console.log("\n6. mapOfferBoqLine wire");
const mapped = mapOfferBoqLine(baseLine("Skasowanie wykwitów (zacieków)"), { works: ALL });
assert(mapped.catalogWorkId === CATALOG_WAVE2_PRODUCT_IDS.wykwity_zacieki, "bind W2 Product");
assert(mapped.matchMethod === "alias" && mapped.aliasRuleId === "wykwity_zacieki", "matchedBy alias");

const pod = mapOfferBoqLine(
  baseLine("Wykucie z muru podokienników drewnianych, stalowych"),
  { works: ALL },
);
assert(!pod.catalogWorkId || pod.aliasRuleId !== "wykucie_wnek", "podokienniki bez W2 bind");

console.log("\n7. Fold smoke");
assert(foldPolishText("wnęk").includes("wnek"), "fold wnęk→wnek");

console.log(`\n=== WYNIK: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
