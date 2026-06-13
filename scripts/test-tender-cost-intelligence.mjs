/**
 * P2-G.1A + P2-G.1B — Tender Cost Intelligence (katalog + integracja kalkulatora).
 * npx vite-node scripts/test-tender-cost-intelligence.mjs
 */
import { classifyAthLineCategory, classifyAthLineCategoryWithoutDictionary, foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";
import {
  CATALOG_QUANTITIES_CAP,
  athPreviewToSnapshot,
  buildCatalogQuantitiesFromPreview,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  defaultWgdomCostCatalog,
  defaultWgdomCostCatalogStore,
  getCategoryRate,
  normalizeWgdomCostUnit,
  WGDOM_COST_CATEGORY_IDS,
} from "../src/lib/wgdom-cost-catalog.ts";
import {
  aggregateCatalogDirectCost,
  aggregateHasTransportUtillizationLines,
  computeFromCatalogRow,
} from "../src/lib/wgdom-catalog-cost-engine.ts";
import { defaultCostModelFromPayroll, weeklyAncillaryLines } from "../src/lib/company-labor-cost.ts";
import {
  computeTenderBidProposal,
  resolveCatalogQuantities,
  resolveTenderBidPricingMode,
} from "../src/lib/tenders-bid-calculator.ts";
import { buildOurEstimateDisplaySsot, buildOurEstimateTileDisplay } from "../src/lib/tender-data-ssot.ts";
import {
  assessBidQuality,
  enrichBidProposalMeta,
  extractCalculationBasis,
  getBidSourceLabel,
  coveragePercentFromUnknownFraction,
  shouldShowUnknownReviewAdvice,
  TENDER_BID_DISCLAIMER,
  TENDER_UNKNOWN_REVIEW_ADVICE,
} from "../src/lib/tender-bid-quality.ts";
import {
  mergeWgdomCostCatalogStore,
  normalizeWgdomCostCatalogStore,
  restoreDefaultWgdomCostCatalogStore,
  updateCategoryPrimaryRates,
  WGDOM_COST_CATALOG_KEY,
} from "../src/lib/wgdom-cost-catalog-store.ts";
import {
  buildBidFlowExplanation,
  canNavigateToBidDetails,
  COST_FIELD_HINTS,
  OUR_ESTIMATE_TILE_NAV_HINT,
  classificationCoverageTone,
  PROFILE_SECTION_IDS,
  PROFILE_SECTION_TITLES,
  TENDER_BID_PROPOSAL_PANEL_ID,
} from "../src/lib/tender-bid-ux.ts";
import { computeBidPrepChecks } from "../src/lib/tenders-bid-prep.ts";
import {
  buildCatalogTuningHints,
  buildClassificationSummary,
  buildUnknownPhraseHints,
  buildUnknownRows,
  CLASSIFICATION_CATEGORY_ORDER,
} from "../src/lib/tender-classification-inspector.ts";
import {
  countWgdomPhraseRules,
  findWgdomPhraseRule,
  matchWgdomPhraseRules,
  wgdomPhrasePatternMatches,
} from "../src/lib/wgdom-phrase-rules.ts";
import {
  countConstructionDictionaryTerms,
  matchConstructionDictionary,
  WGDOM_CONSTRUCTION_DICTIONARY,
  WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER,
} from "../src/lib/wgdom-construction-dictionary.ts";
import {
  addUserClassificationEntry,
  assignUserCategoryFromAthLine,
  defaultUserClassificationDictionaryStore,
  mergeWgdomUserClassificationDictionaryStore,
  normalizeClassificationPhrase,
  normalizeWgdomUserClassificationDictionaryStore,
  phraseFromAthDescription,
  removeUserClassificationEntry,
  restoreDefaultUserClassificationDictionaryStore,
  setUserClassificationDictionaryCache,
  updateUserClassificationEntry,
  migrateUserClassificationCategory,
  WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY,
} from "../src/lib/wgdom-user-classification-dictionary.ts";

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function assertEq(actual, expected, label) {
  assert(actual === expected, `${label} (expected ${expected}, got ${actual})`);
}

function assertGt(actual, min, label) {
  assert(actual > min, `${label} (${actual} > ${min})`);
}

function assertGte(actual, min, label) {
  assert(actual >= min, `${label} (${actual} >= ${min})`);
}

function assertLt(actual, max, label) {
  assert(actual < max, `${label} (${actual} < ${max})`);
}

const costModel = defaultCostModelFromPayroll();

const CATALOG_DESCRIPTIONS = [
  "Malowanie ścian farbą emulsyjną",
  "Gładź gipsowa ścian",
  "Układanie płytek ceramicznych",
  "Wykładina podłogowa",
  "Punkt gniazda wtyczkowego",
  "Instalacja wod-kan",
  "Demontaż posadzki",
  "Montaż drzwi wewnętrznych",
];

function makeCatalogQuantities(count) {
  return Array.from({ length: count }, (_, i) => ({
    lp: String(i + 1),
    description: CATALOG_DESCRIPTIONS[i % CATALOG_DESCRIPTIONS.length],
    unit: i % 7 === 4 ? "szt" : "m2",
    quantity: String(8 + (i % 12)),
  }));
}

function makeNoPriceKosztorys(count = 221) {
  const catalogQuantities = makeCatalogQuantities(count);
  return {
    ok: true,
    sourceFilename: "tbs-przedmiar.ath",
    rowCount: count,
    rows: catalogQuantities.slice(0, 40).map((q) => ({
      ...q,
      unitPrice: "",
      total: "",
    })),
    catalogQuantities,
    totalValue: "",
    currency: "PLN",
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-13T00:00:00.000Z",
  };
}

/** 221 poz. z ~40 UNKNOWN (prod-like ~18%) — P2-G.1E inspektor. */
function makeMixedUnknownKosztorys() {
  const classified = makeCatalogQuantities(181);
  const unknownTemplates = [
    "Montaż lamperii przy oknach",
    "Wykonanie cokolików aluminiowych",
    "Parapetowanie wewnętrzne",
    "Roboty ogólne budowlane",
  ];
  const unknown = Array.from({ length: 40 }, (_, i) => ({
    lp: String(181 + i + 1),
    description: unknownTemplates[i % unknownTemplates.length],
    unit: "mb",
    quantity: String(50 - (i % 15)),
  }));
  const catalogQuantities = [...classified, ...unknown];
  return {
    ok: true,
    sourceFilename: "tbs-mixed.ath",
    rowCount: catalogQuantities.length,
    rows: catalogQuantities.slice(0, 40).map((q) => ({ ...q, unitPrice: "", total: "" })),
    catalogQuantities,
    totalValue: "",
    currency: "PLN",
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-13T00:00:00.000Z",
  };
}

function makePricedKosztorys() {
  return {
    ok: true,
    sourceFilename: "priced.ath",
    rowCount: 4,
    rows: [
      { lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "500", unitPrice: "18", total: "9000" },
      { lp: "2", description: "Gładź gipsowa", unit: "m2", quantity: "400", unitPrice: "22", total: "8800" },
      { lp: "3", description: "Płytki podłogowe", unit: "m2", quantity: "120", unitPrice: "85", total: "10200" },
      { lp: "4", description: "Montaż drzwi", unit: "szt", quantity: "12", unitPrice: "450", total: "5400" },
    ],
    totalValue: "33400",
    currency: "PLN",
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-13T00:00:00.000Z",
  };
}

console.log("P2-G.1A — Tender Cost Intelligence\n");

console.log("1. ATH Classifier");
assertEq(
  classifyAthLineCategory("Malowanie ścian farbą emulsyjną", "m2"),
  "MALOWANIE",
  "MALOWANIE — malowanie ścian",
);
assertEq(
  classifyAthLineCategory("Gładź gipsowa ścian", "m2"),
  "GK",
  "GK — gładź gipsowa",
);
assertEq(
  classifyAthLineCategory("Układanie płytek ceramicznych na ścianie", "m2"),
  "GLAZURA",
  "GLAZURA — płytki",
);
assertEq(
  classifyAthLineCategory("Punkt gniazda wtyczkowego", "szt"),
  "ELEKTRYKA",
  "ELEKTRYKA — gniazdo",
);
assertEq(
  classifyAthLineCategory("Roboty ogólne budowlane", "kpl"),
  "UNKNOWN",
  "UNKNOWN — roboty ogólne",
);
assertEq(
  classifyAthLineCategory("Montaż drzwi wewnętrznych", "szt"),
  "STOLARKA",
  "STOLARKA — drzwi",
);
assertEq(
  classifyAthLineCategory("Demontaż posadzki", "m2"),
  "ROZBIORKI",
  "ROZBIORKI — demontaż",
);
assertEq(
  classifyAthLineCategory("Instalacja wod-kan", "mb"),
  "HYDRAULIKA",
  "HYDRAULIKA — wod-kan",
);

console.log("\n2. Unit normalization");
assertEq(normalizeWgdomCostUnit("m²"), "m2", "m² → m2");
assertEq(normalizeWgdomCostUnit("mp"), "m2", "mp → m2");
assertEq(normalizeWgdomCostUnit("rbh"), "rbh", "rbh");
assertEq(normalizeWgdomCostUnit("szt."), "szt", "szt.");

console.log("\n3. foldPolishText");
assert(foldPolishText("Gładź") === "gladz", "fold PL — gładź");

console.log("\n4. Catalog seed");
const catalogW = defaultWgdomCostCatalog("wroclaw");
assertEq(catalogW.schemaVersion, 1, "schemaVersion 1");
assertEq(catalogW.regionMultiplier, 1.0, "wroclaw multiplier 1.0");
assertEq(catalogW.categories.length, WGDOM_COST_CATEGORY_IDS.length, "10 kategorii MVP");
const store = defaultWgdomCostCatalogStore();
assertEq(store.catalogs.dolnyslask.regionMultiplier, 0.92, "dolnyslask multiplier 0.92");

console.log("\n5. Row cost");
const rowCost = computeFromCatalogRow(
  { description: "Malowanie ścian farbą emulsyjną", unit: "m2", quantity: "100" },
  catalogW,
  costModel,
);
assertGt(rowCost.materialCost, 0, "row materialCost > 0");
assertGt(rowCost.laborHours, 0, "row laborHours > 0");
assertGt(rowCost.laborCost, 0, "row laborCost > 0");
assertGt(rowCost.directCost, 0, "row directCost > 0");
assertEq(rowCost.category, "MALOWANIE", "row category MALOWANIE");

const rbhRow = computeFromCatalogRow(
  { description: "Roboty elektryczne", unit: "rbh", quantity: "8" },
  catalogW,
  costModel,
);
assertEq(rbhRow.laborHours, 8, "rbh row laborHours = qty");

console.log("\n6. Aggregate");
const fixture = [
  { description: "Malowanie ścian", unit: "m2", quantity: "200" },
  { description: "Gładź gipsowa", unit: "m2", quantity: "150" },
  { description: "Płytki na podłodze", unit: "m2", quantity: "80" },
  { description: "Roboty ogólne", unit: "kpl", quantity: "1" },
];
const agg = aggregateCatalogDirectCost(fixture, catalogW, costModel);
assertGt(agg.totals.direct, 0, "aggregate direct > 0");
assertGt(agg.totals.material, 0, "aggregate material > 0");
assertGt(agg.totals.labor, 0, "aggregate labor > 0");
assertEq(agg.rowCount, 4, "aggregate rowCount 4");
assert(agg.lines.length === 4, "aggregate lines length 4");

console.log("\n7. Region — wroclaw vs dolnyslask");
const catalogD = defaultWgdomCostCatalog("dolnyslask");
const rowW = computeFromCatalogRow(
  { description: "Malowanie ścian", unit: "m2", quantity: "100" },
  catalogW,
  costModel,
);
const rowD = computeFromCatalogRow(
  { description: "Malowanie ścian", unit: "m2", quantity: "100" },
  catalogD,
  costModel,
);
assert(rowD.materialCost < rowW.materialCost, "dolnyslask material < wroclaw");
assertEq(rowW.laborCost, rowD.laborCost, "labor cost same region-independent rate × same rbh");

const rateW = getCategoryRate(catalogW, "MALOWANIE", "m2");
const rateD = getCategoryRate(catalogD, "MALOWANIE", "m2");
assert(rateD.materialPlnPerUnit < rateW.materialPlnPerUnit, "getCategoryRate dolnyslask material lower");

console.log("\n8. P2-G.1B — Snapshot catalogQuantities");
const preview221 = {
  ok: true,
  format: "text",
  rows: makeCatalogQuantities(221).map((q) => ({
    ...q,
    code: "",
    unitPrice: "",
    total: "",
  })),
  warnings: [],
};
const snap = athPreviewToSnapshot(preview221, "tbs.ath");
assertEq(snap.catalogQuantities?.length, 221, "snapshot catalogQuantities 221 poz.");
assertEq(snap.rowCount, 221, "snapshot rowCount 221");
assert(snap.rows.length <= 40, "snapshot rows UI cap 40");
assertEq(buildCatalogQuantitiesFromPreview(preview221).length, 221, "buildCatalogQuantitiesFromPreview 221");
assertEq(CATALOG_QUANTITIES_CAP, 250, "CATALOG_QUANTITIES_CAP 250");
const snap250 = athPreviewToSnapshot(
  { ...preview221, rows: makeCatalogQuantities(300).map((q) => ({ ...q, code: "", unitPrice: "", total: "" })) },
  "big.ath",
);
assertEq(snap250.catalogQuantities?.length, 250, "snapshot cap 250 poz.");

console.log("\n9. P2-G.1B — pricingMode resolve");
const noPriceK = makeNoPriceKosztorys(221);
const pricedK = makePricedKosztorys();
assertEq(resolveTenderBidPricingMode(noPriceK), "catalog", "FOUND_NO_VALUE → catalog");
assertEq(resolveTenderBidPricingMode(pricedK), "ath_priced", "priced → ath_priced");
assertEq(resolveCatalogQuantities(noPriceK).length, 221, "resolveCatalogQuantities 221");

console.log("\n10. P2-G.1B — computeTenderBidProposal catalog (221 poz.)");
const bidCatalog = computeTenderBidProposal({
  kosztorys: noPriceK,
  swz: { estimatedValuePln: 1_200_000 } ,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidCatalog.ok, true, "AC-1 catalog 221 poz. ok === true");
assertEq(bidCatalog.pricingMode, "catalog", "pricingMode catalog");
assertEq(bidCatalog.sourceLabelPl, "Katalog WGDOM", "AC-7 source Katalog WGDOM");
assertEq(bidCatalog.qualityLabelPl, "Wysoka", "quality Wysoka catalog 100% coverage");
assert(bidCatalog.calculationBasis != null, "calculationBasis present");
assertGt(bidCatalog.calculationBasis?.executionCostPln ?? 0, 0, "basis executionCost > 0");
assertGt(bidCatalog.costPricePln ?? 0, 0, "AC-2 costPricePln > 0");
assertGt(bidCatalog.recommendedBidPln ?? 0, 0, "AC-3 recommendedBidPln > 0");
assertGte(
  bidCatalog.recommendedBidPln ?? 0,
  bidCatalog.floorBidPln ?? 0,
  "recommended >= floor",
);
assertGt(bidCatalog.aggressiveBidPln ?? 0, 0, "aggressiveBidPln > 0");
assertGt(bidCatalog.floorBidPln ?? 0, 0, "floorBidPln > 0");
assert(bidCatalog.costStack.length >= 6, "costStack ma Kp + poboczne + stałe");
assert(
  bidCatalog.assumptions.some((a) => a.includes("katalogowa WGDOM")),
  "assumption wycena katalogowa",
);

console.log("\n11. P2-G.1B — computeTenderBidProposal ath_priced regresja");
const bidPriced = computeTenderBidProposal({
  kosztorys: pricedK,
  swz: { estimatedValuePln: 350_000, implementationDays: 60 },
  fit: { priceWeightPct: 60 } ,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidPriced.ok, true, "AC-4 ath_priced ok");
assertEq(bidPriced.pricingMode, "ath_priced", "pricingMode ath_priced");
assertEq(bidPriced.sourceLabelPl, "Kosztorys ATH", "AC-6 source Kosztorys ATH");
assertEq(bidPriced.qualityLabelPl, "Wysoka", "quality Wysoka ath_priced");
assertEq(bidPriced.costPricePln, 130_900, "ath_priced costPricePln baseline");
assertEq(bidPriced.floorBidPln, 137_400, "ath_priced floorBidPln baseline");
assertEq(bidPriced.recommendedBidPln, 137_400, "ath_priced recommended baseline");
assertEq(bidPriced.aggressiveBidPln, 133_300, "ath_priced aggressive baseline");
assert(
  bidPriced.costStack[0]?.label.includes("Robocizna"),
  "ath_priced stack robocizna",
);

console.log("\n12. P2-G.1C — Nasza wycena tile (catalog)");
const displayCatalog = buildOurEstimateTileDisplay({
  item: { tenderDossier: { kosztorys: noPriceK } },
  bidProposal: bidCatalog,
});
assert(
  !displayCatalog.display.includes("Nie można automatycznie"),
  "AC-1 kafelek bez komunikatu braku wyceny",
);
assert(
  displayCatalog.lines?.some((l) => l.startsWith("Koszt wykonania:")),
  "AC-1 linia Koszt wykonania",
);
assert(
  displayCatalog.lines?.some((l) => l.startsWith("Rekomendowana:")),
  "AC-1 linia Rekomendowana",
);
assert(
  displayCatalog.lines?.some((l) => l.includes("Katalog WGDOM")),
  "AC-1 źródło Katalog WGDOM",
);
assertEq(displayCatalog.sourceLabel, "Katalog WGDOM", "sourceLabel catalog");

console.log("\n13. P2-G.1C — tender-bid-quality");
assertEq(getBidSourceLabel("catalog"), "Katalog WGDOM", "badge catalog");
assertEq(getBidSourceLabel("ath_priced"), "Kosztorys ATH", "badge ath_priced");
assertEq(assessBidQuality("ath_priced").level, "high", "quality high");
assertEq(assessBidQuality("catalog", 0.05).level, "high", "quality high 95% coverage");
assertEq(assessBidQuality("catalog", 0.08).level, "good", "quality good 92% coverage");
assertEq(assessBidQuality("catalog", 0.12).level, "good", "quality good 88% coverage");
assertEq(assessBidQuality("catalog", 0.16).level, "medium", "quality medium 84% coverage");
assertEq(assessBidQuality("catalog", 0.2).level, "medium", "quality medium 80% coverage");
assertEq(assessBidQuality("catalog", 0.35).level, "limited", "quality limited 65% coverage");
assert(Math.abs(coveragePercentFromUnknownFraction(0.181) - 81.9) < 0.01, "coverage ~81.9%");
assert(shouldShowUnknownReviewAdvice(0.18), "advice when UNKNOWN>15%");
assert(!shouldShowUnknownReviewAdvice(0.15), "no advice at 15%");
assert(TENDER_UNKNOWN_REVIEW_ADVICE.includes("niesklasyfikowane"), "advice text");
assert(TENDER_BID_DISCLAIMER.includes("Autorska wycena WGDOM"), "disclaimer text");
const enriched = enrichBidProposalMeta({ ...bidCatalog });
assertEq(enriched.sourceLabelPl, "Katalog WGDOM", "enrich source");
const basis = extractCalculationBasis(bidCatalog);
assertGt(basis?.laborPln ?? 0, 0, "basis labor > 0");
assertGt(basis?.materialPln ?? 0, 0, "basis material > 0");

console.log("\n14. P2-G.1C — catalog store / cloud merge");
assertEq(WGDOM_COST_CATALOG_KEY, "kw-wgdom-cost-catalog", "cloud key");
const storeDefault = restoreDefaultWgdomCostCatalogStore();
assertEq(storeDefault.activeRegion, "wroclaw", "default activeRegion");
const edited = updateCategoryPrimaryRates(storeDefault, "MALOWANIE", 99, 0.25);
const malRow = edited.catalogs.wroclaw.categories.find((c) => c.id === "MALOWANIE");
assertEq(malRow?.rates[0]?.materialPlnPerUnit, 99, "edit material rate");
const merged = mergeWgdomCostCatalogStore(edited, storeDefault);
assert(
  merged.catalogs.wroclaw.categories.find((c) => c.id === "MALOWANIE")?.rates[0]?.materialPlnPerUnit === 99,
  "merge keeps newer local",
);
const normalized = normalizeWgdomCostCatalogStore({ schemaVersion: 1, activeRegion: "dolnyslask", catalogs: {} });
assertEq(normalized.activeRegion, "dolnyslask", "normalize region");
assertEq(normalized.catalogs.dolnyslask.regionMultiplier, 0.92, "normalize dolnyslask multiplier");
const restored = restoreDefaultWgdomCostCatalogStore();
assertEq(
  restored.catalogs.wroclaw.categories.find((c) => c.id === "MALOWANIE")?.rates[0]?.materialPlnPerUnit,
  8,
  "AC-5 restore defaults MALOWANIE material",
);

console.log("\n15. P2-G.1B — brak ilości → fail");
const emptyK = {
  ...noPriceK,
  catalogQuantities: [],
  rows: [],
  rowCount: 0,
};
const bidEmpty = computeTenderBidProposal({
  kosztorys: emptyK,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidEmpty.ok, false, "brak ilości ok false");

console.log("\n16. P2-G.1D — UX discoverability + explainability");
assertEq(TENDER_BID_PROPOSAL_PANEL_ID, "tender-bid-proposal-panel", "panel anchor id");
assert(OUR_ESTIMATE_TILE_NAV_HINT.includes("szczegóły"), "tile nav hint");
assertEq(canNavigateToBidDetails(true, null), true, "nav when bid ok");
assertEq(canNavigateToBidDetails(false, 100000), true, "nav when estimate set");
assertEq(canNavigateToBidDetails(false, null), false, "no nav without data");
const catalogFlow = buildBidFlowExplanation("catalog");
assert(catalogFlow.length >= 6, "catalog flow steps");
assert(catalogFlow.some((s) => s.includes("Katalog")), "catalog flow mentions catalog");
const athFlow = buildBidFlowExplanation("ath_priced");
assert(athFlow.some((s) => s.includes("ATH")), "ath flow mentions ATH");
assert(PROFILE_SECTION_IDS.costIntelligence === "profile-section-cost-intelligence", "cost section id");
assert(PROFILE_SECTION_TITLES.qualification === "Profil kwalifikacyjny", "qualification title");
assert(COST_FIELD_HINTS.avgGrossHourlyPln.includes("wycen"), "rbh hint");
assert(COST_FIELD_HINTS.profitPct.includes("ofert"), "profit hint");
assert(COST_FIELD_HINTS.riskReservePct.includes("ryzyko"), "risk hint");
const prepChecks = computeBidPrepChecks(
  { ourEstimatePln: null, tenderDossier: { kosztorys: { ok: true } } },
  null,
  null,
  bidCatalog,
);
const ourBidCheck = prepChecks.find((c) => c.id === "our-bid");
assertEq(ourBidCheck?.navigateToBidDetails, true, "our-bid tile navigable");
assertEq(ourBidCheck?.actionHint, OUR_ESTIMATE_TILE_NAV_HINT, "our-bid action hint");

console.log("\n17. P2-G.1E — Classification Inspector");
const mixedK = makeMixedUnknownKosztorys();
assertEq(mixedK.catalogQuantities.length, 221, "mixed 221 poz.");
const classSummary = buildClassificationSummary(mixedK.catalogQuantities);
assertEq(classSummary.totalRows, 221, "summary totalRows");
assertEq(classSummary.classifiedRows, 211, "summary classifiedRows after dict");
assertEq(classSummary.unknownRows, 10, "summary unknownRows after dict");
assert(classSummary.classifiedPercent >= 95, "coverage ≥95% after dict");
assert(classSummary.coverageDelta != null, "coverageDelta present");
assert(Math.abs(classSummary.coverageDelta.classifiedPercentBefore - 81.9) < 0.2, "before ~81.9%");
assert(classSummary.coverageDelta.coverageDelta > 10, "delta >10pp");
assertEq(CLASSIFICATION_CATEGORY_ORDER.length, 11, "11 categories incl UNKNOWN");
assert(classSummary.categories.some((c) => c.id === "UNKNOWN" && c.count === 10), "UNKNOWN bucket 10");
assert(classSummary.categories.some((c) => c.id === "MALOWANIE" && c.count > 0), "MALOWANIE bucket");
const malCat = classSummary.categories.find((c) => c.id === "MALOWANIE");
assert(malCat?.unitDistribution?.length > 0, "unit distribution present");
const unknownList = buildUnknownRows(mixedK.catalogQuantities);
assertEq(unknownList.length, 10, "unknown rows count after dict");
assert(unknownList[0].quantity >= unknownList[unknownList.length - 1].quantity, "unknown sorted by qty desc");
const sortedQtys = unknownList.map((r) => r.quantity);
const expectedSorted = [...sortedQtys].sort((a, b) => b - a);
assert(JSON.stringify(sortedQtys) === JSON.stringify(expectedSorted), "unknown qty sort order");
const hints = buildCatalogTuningHints(unknownList);
assert(hints.length >= 0, "tuning hints ok");
const bidMixed = computeTenderBidProposal({
  kosztorys: mixedK,
  swz: { estimatedValuePln: 1_200_000 },
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidMixed.ok, true, "mixed catalog bid ok");
assertEq(bidMixed.qualityLevel, "high", "mixed ~95% → Wysoka");
assertLt(bidMixed.catalogUnknownPct ?? 1, 0.15, "mixed unknown <15% after dict");
const bidMixedRepeat = computeTenderBidProposal({
  kosztorys: mixedK,
  swz: { estimatedValuePln: 1_200_000 },
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidMixed.costPricePln, bidMixedRepeat.costPricePln, "AC-6 calculator idempotent");

console.log("\n18. P2-G.1F — Construction Dictionary");
const dictCount = countConstructionDictionaryTerms();
assertGte(dictCount, 150, "AC-2 dictionary 150+ terms");
assertEq(WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER.length, 10, "10 dict categories");
assert(WGDOM_CONSTRUCTION_DICTIONARY.MALOWANIE.includes("lamperia"), "dict has lamperia");
assert(WGDOM_CONSTRUCTION_DICTIONARY.PODLOGI.includes("cokolik"), "dict has cokolik");
assertEq(classifyAthLineCategory("Montaż lamperii przy oknach", "mb"), "MALOWANIE", "AC-3 lamperia → MALOWANIE");
assertEq(classifyAthLineCategory("Wykonanie cokolików aluminiowych", "mb"), "PODLOGI", "AC-4 cokolik → PODLOGI");
assertEq(classifyAthLineCategory("Montaż ościeżnicy regulowanej", "szt"), "STOLARKA", "AC-5 ościeżnica → STOLARKA");
assertEq(classifyAthLineCategory("Parapet wewnętrzny konglomerat", "mb"), "STOLARKA", "parapet → STOLARKA");
assertEq(classifyAthLineCategory("Wykonanie szlichty podlogowej", "m2"), "PODLOGI", "szlichta → PODLOGI");
assertEq(classifyAthLineCategory("Montaż odbojnicy ściennej", "mb"), "STOLARKA", "odbojnica → STOLARKA");
assertEq(classifyAthLineCategory("Parapetowanie wewnętrzne", "mb"), "STOLARKA", "parapetowanie → STOLARKA");
assertEq(classifyAthLineCategory("Licowanie posadzki", "m2"), "PODLOGI", "licowanie → PODLOGI");
assertEq(classifyAthLineCategory("Opaska podłogowa", "mb"), "PODLOGI", "opaska → PODLOGI");
assertEq(classifyAthLineCategory("Obróbka okienna", "mb"), "STOLARKA", "obrobka → STOLARKA");
assertEq(classifyAthLineCategoryWithoutDictionary("Montaż lamperii", "mb"), "UNKNOWN", "before dict lamperia UNKNOWN");
assertEq(classifyAthLineCategory("Montaż lamperii", "mb"), "MALOWANIE", "after dict lamperia MALOWANIE");
assertEq(matchConstructionDictionary(foldPolishText("cokolik podlogowy")), "PODLOGI", "matchConstructionDictionary cokolik");
assertEq(classifyAthLineCategory("Roboty ogólne budowlane", "kpl"), "UNKNOWN", "generic still UNKNOWN");
const summaryBeforeOnly = buildClassificationSummary(mixedK.catalogQuantities);
assert(summaryBeforeOnly.coverageDelta.unknownRowsBefore === 40, "delta before 40 UNKNOWN");
assert(summaryBeforeOnly.coverageDelta.unknownRowsAfter === 10, "delta after 10 UNKNOWN");
assertGte(summaryBeforeOnly.coverageDelta.coverageDelta, 13, "TBS/WM coverage boost ≥13pp");
for (const id of WGDOM_COST_CATEGORY_IDS) {
  assert(Array.isArray(WGDOM_CONSTRUCTION_DICTIONARY[id]), `dict array ${id}`);
  assertGte(WGDOM_CONSTRUCTION_DICTIONARY[id].length, 10, `dict ${id} min terms`);
}

console.log("\n19. P2-G.2A — Assisted Classification (User Learning)");
assertEq(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY, "kw-wgdom-classification-dictionary", "cloud key");
const emptyDict = defaultUserClassificationDictionaryStore();
assertEq(emptyDict.entries.length, 0, "default dict empty");
assertEq(emptyDict.schemaVersion, 1, "dict schema v1");
assertEq(normalizeClassificationPhrase("  Cokolik PCV  "), "cokolik pcv", "normalize phrase");
assert(phraseFromAthDescription("Roboty ogólne budowlane").includes("roboty"), "phrase from ATH");
const savedEntry = addUserClassificationEntry(emptyDict, "cokolik pcv", "PODLOGI", "manual");
assertEq(savedEntry.entries.length, 1, "save dictionary entry");
assertEq(savedEntry.entries[0].category, "PODLOGI", "entry category");
assertEq(savedEntry.entries[0].source, "manual", "entry source manual");
setUserClassificationDictionaryCache(savedEntry);
assertEq(classifyAthLineCategory("Wykonanie cokolików PCV podłogowych", "mb"), "PODLOGI", "user dict match");
assertEq(classifyAthLineCategoryWithoutDictionary("Wykonanie cokolików PCV podłogowych", "mb"), "PODLOGI", "user dict in withoutDictionary");
const localDict = addUserClassificationEntry(emptyDict, "lamperia okienna", "MALOWANIE", "manual");
const cloudDict = addUserClassificationEntry(emptyDict, "lamperia okienna", "STOLARKA", "manual");
cloudDict.entries[0].updatedAt = new Date(Date.now() + 5000).toISOString();
const mergedDict = mergeWgdomUserClassificationDictionaryStore(localDict, cloudDict);
assertEq(mergedDict.entries[0].category, "STOLARKA", "cloud merge newer wins");
const dupMerge = mergeWgdomUserClassificationDictionaryStore(
  addUserClassificationEntry(emptyDict, "opaska scienna", "PODLOGI"),
  addUserClassificationEntry(emptyDict, "opaska scienna", "GLAZURA"),
);
assertEq(dupMerge.entries.length, 1, "merge dedupe by phrase");
setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
const beforeUserLearn = buildClassificationSummary(mixedK.catalogQuantities);
assertEq(beforeUserLearn.unknownRows, 10, "before user learn 10 UNKNOWN");
assertEq(beforeUserLearn.classifiedRows, 211, "before user learn 211 classified");
const learned = assignUserCategoryFromAthLine(
  defaultUserClassificationDictionaryStore(),
  "Roboty ogólne budowlane",
  "ROZBIORKI",
);
setUserClassificationDictionaryCache(learned);
const afterUserLearn = buildClassificationSummary(mixedK.catalogQuantities);
assertEq(afterUserLearn.unknownRows, 0, "reclassification — 0 UNKNOWN after assign");
assertEq(afterUserLearn.classifiedRows, 221, "coverage increase 211→221");
assertGte(afterUserLearn.classifiedPercent, 99.9, "coverage ~100% after user learn");
assertEq(classifyAthLineCategory("Roboty ogólne budowlane", "kpl"), "ROZBIORKI", "generic now classified");
const afterUnknownList = buildUnknownRows(mixedK.catalogQuantities);
assertEq(afterUnknownList.length, 0, "unknown rows empty after learn");
const editedDict = updateUserClassificationEntry(learned, learned.entries[0].id, { category: "GK" });
assertEq(editedDict.entries[0].category, "GK", "dictionary edit");
const removed = removeUserClassificationEntry(editedDict, editedDict.entries[0].id);
assertEq(removed.entries.length, 0, "dictionary delete");
setUserClassificationDictionaryCache(removed);
assertEq(classifyAthLineCategory("Roboty ogólne budowlane", "kpl"), "UNKNOWN", "after delete back to UNKNOWN");
const normalizedBad = normalizeWgdomUserClassificationDictionaryStore({
  entries: [{ phrase: "x", category: "INVALID" }, { phrase: "ok fraza", category: "GK" }],
});
assertEq(normalizedBad.entries.length, 1, "normalize drops invalid");
assertEq(normalizedBad.entries[0].category, "GK", "normalize keeps valid");
assertEq(classificationCoverageTone(98), "good", "coverage tone good >97");
assertEq(classificationCoverageTone(97), "warn", "coverage tone warn at 97");
assertEq(classificationCoverageTone(95), "warn", "coverage tone warn 90-97");
assertEq(classificationCoverageTone(89), "bad", "coverage tone bad <90");
assert(PROFILE_SECTION_IDS.classificationDictionary.includes("classification-dictionary"), "profile section id");
assert(PROFILE_SECTION_TITLES.classificationDictionary.includes("Classification"), "profile section title");
setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());

console.log("\n20. P2-G.2B — Cost Category Expansion (CORE)");
assertEq(WGDOM_COST_CATEGORY_IDS.length, 10, "10 MVP categories");
assert(WGDOM_COST_CATEGORY_IDS.includes("TRANSPORT_UTYLIZACJA"), "has TRANSPORT_UTYLIZACJA");
assert(WGDOM_COST_CATEGORY_IDS.includes("WENTYLACJA"), "has WENTYLACJA");
assertEq(classifyAthLineCategory("Wywiezienie gruzu", "m3"), "TRANSPORT_UTYLIZACJA", "AC-1 wywiezienie gruzu");
assertEq(classifyAthLineCategory("Zagospodarowanie odpadów budowlanych", "m3"), "TRANSPORT_UTYLIZACJA", "AC-2 zagospodarowanie odpadów");
assertEq(classifyAthLineCategory("Transport i utylizacja gruzu", "m3"), "TRANSPORT_UTYLIZACJA", "transport gruzu not ROZBIORKI");
assertEq(classifyAthLineCategory("Obsadzenie kratek wentylacyjnych", "szt"), "WENTYLACJA", "AC-3 kratki wentylacyjne");
assertEq(classifyAthLineCategory("Montaż kratki wentylacyjnej", "szt"), "WENTYLACJA", "kratka wentylacyjna");
assertEq(
  classifyAthLineCategory("Pierwszy pomiar skuteczności zerowania", "kpl"),
  "ELEKTRYKA",
  "AC-4 pomiar zerowania",
);
assertEq(classifyAthLineCategory("Demontaż posadzki", "m2"), "ROZBIORKI", "demontaż still ROZBIORKI");
assertEq(matchConstructionDictionary(foldPolishText("transport gruzu")), "TRANSPORT_UTYLIZACJA", "dict transport gruzu");
assert(!WGDOM_CONSTRUCTION_DICTIONARY.ROZBIORKI.includes("transport gruzu"), "gruz removed from ROZBIORKI dict");
const transportDef = defaultWgdomCostCatalog().categories.find((c) => c.id === "TRANSPORT_UTYLIZACJA");
const ventDef = defaultWgdomCostCatalog().categories.find((c) => c.id === "WENTYLACJA");
assert(transportDef?.rates.some((r) => r.unit === "m3"), "AC-5 transport m3 rate");
assert(transportDef?.rates.some((r) => r.unit === "kpl"), "AC-5 transport kpl rate");
assert(ventDef?.rates.some((r) => r.unit === "szt"), "AC-5 vent szt rate");
assert(ventDef?.rates.some((r) => r.unit === "mb"), "AC-5 vent mb rate");
const oldStoreSnapshot = {
  schemaVersion: 1,
  activeRegion: "wroclaw",
  catalogs: {
    wroclaw: {
      schemaVersion: 1,
      region: "wroclaw",
      regionMultiplier: 1,
      categories: defaultWgdomCostCatalog("wroclaw").categories.filter(
        (c) => !["WENTYLACJA", "TRANSPORT_UTYLIZACJA"].includes(c.id),
      ),
      unknownFallback: defaultWgdomCostCatalog().unknownFallback,
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    dolnyslask: defaultWgdomCostCatalog("dolnyslask"),
  },
};
const migratedCatalog = normalizeWgdomCostCatalogStore(oldStoreSnapshot);
assertEq(migratedCatalog.catalogs.wroclaw.categories.length, 10, "AC-6 migrate catalog to 10 cats");
assert(migratedCatalog.catalogs.wroclaw.categories.some((c) => c.id === "TRANSPORT_UTYLIZACJA"), "AC-6 transport in migrated");
assert(migratedCatalog.catalogs.wroclaw.categories.some((c) => c.id === "WENTYLACJA"), "AC-6 vent in migrated");
const gruzRows = [{ description: "Wywiezienie gruzu", unit: "m3", quantity: "10" }];
const aggGruz = aggregateCatalogDirectCost(gruzRows, defaultWgdomCostCatalog(), costModel);
assertEq(aggGruz.lines[0].category, "TRANSPORT_UTYLIZACJA", "aggregate gruz category");
assert(aggregateHasTransportUtillizationLines(aggGruz), "has transport lines flag");
const costModelDefault = defaultCostModelFromPayroll();
const ancillaryFull = weeklyAncillaryLines(costModelDefault).reduce((s, l) => s + l.pln, 0);
const ancillaryNoWaste = weeklyAncillaryLines(costModelDefault, { excludeWasteDisposal: true }).reduce((s, l) => s + l.pln, 0);
assertEq(ancillaryFull - ancillaryNoWaste, costModelDefault.wasteDisposalWeeklyPln, "AC-9 waste line isolated");
const gruzKosztorys = {
  ok: true,
  sourceFilename: "gruz.ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [{ lp: "1", description: "Wywiezienie gruzu", unit: "m3", quantity: "10" }],
  totalValue: "",
  currency: "PLN",
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: "2026-06-13T00:00:00.000Z",
};
const paintKosztorys = {
  ok: true,
  sourceFilename: "paint.ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [{ lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "500" }],
  totalValue: "",
  currency: "PLN",
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: "2026-06-13T00:00:00.000Z",
};
const bidGruz = computeTenderBidProposal({
  kosztorys: gruzKosztorys,
  swz: { estimatedValuePln: 500_000 },
  fit: null,
  costModel: costModelDefault,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
const bidPaint = computeTenderBidProposal({
  kosztorys: paintKosztorys,
  swz: { estimatedValuePln: 500_000 },
  fit: null,
  costModel: costModelDefault,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidGruz.ok, true, "gruz bid ok");
const poboczneGruz = bidGruz.costStack.find((l) => l.label.includes("poboczne"));
const pobocznePaint = bidPaint.costStack.find((l) => l.label.includes("poboczne"));
assert(poboczneGruz && pobocznePaint, "poboczne lines present");
assertLt(poboczneGruz.pln, pobocznePaint.pln, "AC-9 gruz bid excludes weekly waste share");
assert(bidGruz.assumptions.some((a) => a.includes("wywóz gruzu")), "AC-9 assumption note");
assertEq(
  migrateUserClassificationCategory("wywiezienie gruzu", "ROZBIORKI"),
  "TRANSPORT_UTYLIZACJA",
  "user dict migrate transport phrase",
);
const migratedUser = normalizeWgdomUserClassificationDictionaryStore({
  schemaVersion: 1,
  entries: [{ id: "u1", phrase: "wywiezienie gruzu", category: "ROZBIORKI", source: "manual" }],
});
assertEq(migratedUser.entries[0].category, "TRANSPORT_UTYLIZACJA", "user dict normalize migrate");
setUserClassificationDictionaryCache(migratedUser);
assertEq(classifyAthLineCategory("Wywiezienie gruzu budowlany", "m3"), "TRANSPORT_UTYLIZACJA", "user dict works after migrate");
setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
const summaryVent = buildClassificationSummary([
  { lp: "1", description: "Obsadzenie kratek wentylacyjnych", unit: "szt", quantity: "8" },
  { lp: "2", description: "Wywiezienie gruzu", unit: "m3", quantity: "12" },
]);
assert(summaryVent.categories.some((c) => c.id === "WENTYLACJA" && c.count === 1), "inspector WENTYLACJA bucket");
assert(summaryVent.categories.some((c) => c.id === "TRANSPORT_UTYLIZACJA" && c.count === 1), "inspector TRANSPORT bucket");

console.log("\n21. P2-G.2D — Phrase-Based Classification");
assertGte(countWgdomPhraseRules(), 40, "AC-D1 at least 40 phrase rules");
assert(countWgdomPhraseRules() <= 75, "phrase rules bounded");
assertEq(
  classifyAthLineCategory("Narożniki z kątownika aluminiowego 30x30x2 mm", "mb"),
  "GK",
  "AC-D3 narożniki katownik → GK phrase rule",
);
assertEq(
  classifyAthLineCategory("Narożniki aluminiowe 25x25", "mb"),
  "GK",
  "narożniki aluminiowe phrase",
);
const tabliczkiRule = findWgdomPhraseRule(foldPolishText("Przykręcanie tabliczek opisowych"));
assert(tabliczkiRule != null, "AC-D4 tabliczki phrase rule match");
assertEq(tabliczkiRule?.pattern, "przykrecanie tabliczek opisow", "tabliczki rule pattern");
assertEq(
  classifyAthLineCategory("Przykręcanie tabliczek opisowych", "szt"),
  "UNKNOWN",
  "tabliczki still UNKNOWN until WYPOSAZENIE 2C",
);
assertEq(
  classifyAthLineCategory("Pomiar skuteczności zerowania instalacji", "kpl"),
  "ELEKTRYKA",
  "AC-D3/D pomiar zerowania phrase",
);
assert(wgdomPhrasePatternMatches("narozniki z katownika aluminiowego", "narozniki z katownika aluminiow", "prefix"), "prefix inflection match");
assert(!wgdomPhrasePatternMatches("xnarozniki z katownika", "narozniki z katownika", "prefix"), "prefix word boundary");
assertEq(matchWgdomPhraseRules(foldPolishText("Wywiezienie gruzu budowlany")), "TRANSPORT_UTYLIZACJA", "phrase transport");
const phraseHintRows = [
  { lp: "1", description: "Przykręcanie tabliczek opisowych", unit: "szt", quantity: 5 },
  { lp: "2", description: "Przykręcanie tabliczek opisowych", unit: "szt", quantity: 5 },
  { lp: "3", description: "Oznaczenia pomieszczeń numerami", unit: "szt", quantity: 3 },
];
const phraseHints = buildUnknownPhraseHints(phraseHintRows, 5);
assert(phraseHints.length >= 2, "AC-D5 phrase hints aggregated");
assert(phraseHints[0].phrase.length > 10, "AC-D5 full phrase not token");
assert(!phraseHints.some((h) => /^(30x30|lokatorskie|aluminiowego)$/i.test(h.phrase)), "AC-D5 no bare tokens");
assert(phraseHints.some((h) => h.phrase.toLowerCase().includes("tablicz")), "AC-D5 tabliczki phrase");
const tabliczkiHint = phraseHints.find((h) => h.phrase.toLowerCase().includes("tablicz"));
assert(tabliczkiHint && tabliczkiHint.count === 2, "AC-D5 tabliczki count aggregated");
assert((tabliczkiHint?.impact ?? 0) === 10, "AC-D5 impact sum quantity");
setUserClassificationDictionaryCache(
  addUserClassificationEntry(restoreDefaultUserClassificationDictionaryStore(), "narozniki z katownika aluminiowego", "ROZBIORKI"),
);
assertEq(
  classifyAthLineCategory("Narożniki z kątownika aluminiowego 30x30x2 mm", "mb"),
  "ROZBIORKI",
  "AC-D2 user dict beats phrase GK rule",
);
setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
assertEq(classifyAthLineCategory("Wywiezienie gruzu", "m3"), "TRANSPORT_UTYLIZACJA", "AC-D6 2B regression gruz");
assertEq(classifyAthLineCategory("Obsadzenie kratek wentylacyjnych", "szt"), "WENTYLACJA", "AC-D6 2B regression wentylacja");
assertEq(classifyAthLineCategory("Demontaż posadzki", "m2"), "ROZBIORKI", "AC-D6 2B regression demontaż");

console.log(`\n---\nPASS: ${passed}  FAIL: ${failed}  TOTAL: ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
