/**
 * C-MODE-1a FALLBACK REMOVAL — OfferBoq null → GAP (ZERO ath/catalog/companyPrice).
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-fallback-removal.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeCatalogBidProposalForPricingAuto,
  resolveTenderPricingAutoProposal,
} from "../src/app/hooks/useTenderPricingAuto.ts";
import { computeRuntimeBidFromOfferBoq } from "../src/lib/tender-offer-boq-explainability.ts";
import {
  resolveTenderBidPricingMode,
  computeTenderBidProposal,
} from "../src/lib/tenders-bid-calculator.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  computeBidProposalFromPositionCost,
} from "../src/lib/tender-position-cost/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const FIXED_AT = "2026-08-12T09:00:00.000Z";
const NOW = Date.parse(FIXED_AT);
const T_FRESH = "2026-08-11T12:00:00.000Z";
const PAINT_WORK = "legacy-malowanie-m2";
const PAINT_UNIT = "m2";
const PAINT_MAT = "mat.farba_lateksowa_wewnetrzna";
const PAINT_HOST = "cw.product.farba_lateksowa_wewnetrzna";
const costModel = defaultCostModelFromPayroll();

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function quoteCell(price) {
  return {
    wgdom: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt: T_FRESH,
        confidence: 0.85,
        origin: "wgdom",
      },
    },
  };
}

function makePaintMaterialWork(overrides = {}) {
  return {
    id: PAINT_HOST,
    tradeId: "MALOWANIE",
    namePl: "Farba lateksowa",
    unit: "l",
    companyPricePln: 999,
    marketQuotes: quoteCell(40),
    marketQuoteHistory: [],
    commercialPricing: {
      marginPct: 25,
      updatedAt: T_FRESH,
      source: "owner",
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [PAINT_MAT],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

function makeLaborHost(overrides = {}) {
  return {
    id: PAINT_WORK,
    tradeId: "MALOWANIE",
    namePl: "Malowanie",
    unit: PAINT_UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
    ourWorkRate: {
      workId: PAINT_WORK,
      unit: PAINT_UNIT,
      ourRatePln: 20,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [
        {
          workId: PAINT_WORK,
          unit: PAINT_UNIT,
          ratePln: 20,
          kind: "OUR",
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: T_FRESH,
        },
      ],
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function paintLine(overrides = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "Malowanie ścian",
    quantity: 100,
    quantityRaw: "100",
    unit: PAINT_UNIT,
    catalogWorkId: PAINT_WORK,
    workCategory: "MALOWANIE",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: "Malowanie ścian",
    aliasRuleId: null,
    knrHint: null,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
    candidateMatches: [
      {
        catalogWorkId: PAINT_WORK,
        workNamePl: "Malowanie",
        workCategory: "MALOWANIE",
        tradeId: "MALOWANIE",
        score: 90,
        role: "primary",
        matchedBy: "catalog_map",
        matchConfidence: "high",
        rationale: "test",
      },
    ],
    costIntelligence: null,
    linePricing: {
      confidence: "high",
      aggregates: {
        materialsPln: 5000,
        laborPln: 8000,
        equipmentPln: 0,
        transportPln: 0,
        auxiliaryPln: 0,
      },
      components: [],
    },
    materialUnitPln: null,
    materialCostPln: 5000,
    materialSource: { kind: "unknown", labelPl: "?" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: 8000,
    laborSource: { kind: "unknown", labelPl: "?" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "?" },
    directCostPln: 13000,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: 13000,
    athUnitPricePln: 50,
    athTotalPln: 5000,
    pricingSourceLabelPl: "legacy-test",
    aiConfidence: "high",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...overrides,
  };
}

function makeDoc(lines) {
  const materials = lines.reduce((s, l) => s + (l.materialCostPln ?? 0), 0);
  const labor = lines.reduce((s, l) => s + (l.laborCostPln ?? 0), 0);
  return {
    tenderId: "t-fb-rem",
    builtAt: FIXED_AT,
    sourceFilename: "przedmiar.ath",
    buildStatus: "priced",
    lines,
    totals: {
      lineCount: lines.length,
      materialsPln: materials,
      laborPln: labor,
      equipmentPln: 0,
      directPln: materials + labor,
      kpPln: null,
      overheadPln: null,
      costPricePln: materials + labor,
      marginPln: null,
      recommendedBidPln: null,
      profitPln: null,
      profitabilityPct: null,
    },
    pricingStats: {
      componentCount: lines.length,
      pricedComponentCount: lines.length,
      highCount: lines.length,
      mediumCount: 0,
      lowCount: 0,
    },
    warnings: [],
  };
}

/** OfferBoq null: brak linii, ale totalValue ATH — stary fallback brałby ath_priced. */
const athHeaderOnlyItem = {
  id: "tid-ath-header",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "ath-only.ath",
      rowCount: 0,
      rows: [],
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
      totalValue: "12500",
    },
    swz: { implementationDays: 30, estimatedValuePln: 80_000 },
    fit: { priceWeightPct: 60 },
  },
  swzAnalysis: { implementationDays: 30, estimatedValuePln: 80_000 },
  tenderFit: { priceWeightPct: 60 },
};

const emptyItem = {
  id: "tid-empty",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "empty.pdf",
      rowCount: 0,
      rows: [],
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
    swz: null,
    fit: null,
  },
};

const richQtyItem = {
  id: "tid-rich-qty",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar.pdf",
      rowCount: 1,
      rows: [],
      catalogQuantities: [
        {
          lp: "1",
          description: "Malowanie dwukrotne ścian farbą lateksową",
          unit: "m2",
          quantity: "50",
        },
      ],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
    swz: { implementationDays: 30, estimatedValuePln: 50_000 },
    fit: { priceWeightPct: 60 },
  },
  swzAnalysis: { implementationDays: 30, estimatedValuePln: 50_000 },
  tenderFit: { priceWeightPct: 60 },
};

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

resetTf();

// ——— CASE 1: OfferBoq istnieje → F5 path ———
{
  const runtime = computeRuntimeBidFromOfferBoq({
    item: richQtyItem,
    builtAt: FIXED_AT,
    positionCostCutover: true,
  });
  ok("C1 OfferBoq runtime exists", runtime != null);
  const proposal = resolveTenderPricingAutoProposal({
    item: richQtyItem,
    swz: richQtyItem.tenderDossier.swz,
    priceOverrides: [],
    costPipeline01Enabled: true,
    positionCostCutover: true,
  });
  ok("C1 proposal from F5 path", proposal != null);
  ok("C1 mode offer_boq_ai", proposal?.pricingMode === "offer_boq_ai");
  ok("C1 not ath_priced", proposal?.pricingMode !== "ath_priced");
  ok("C1 not catalog", proposal?.pricingMode !== "catalog");
}

// ——— CASE 2: OfferBoq null → GAP ———
{
  const runtime = computeRuntimeBidFromOfferBoq({
    item: emptyItem,
    builtAt: FIXED_AT,
  });
  ok("C2 runtime null", runtime == null);
  const proposal = resolveTenderPricingAutoProposal({
    item: emptyItem,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  ok("C2 GAP null", proposal == null);
}

// ——— CASE 3: OfferBoq null + ath_priced temptation → GAP · NIE ath_priced ———
{
  const mode = resolveTenderBidPricingMode(athHeaderOnlyItem.tenderDossier.kosztorys);
  ok("C3 legacy mode would be ath_priced", mode === "ath_priced");
  const runtime = computeRuntimeBidFromOfferBoq({
    item: athHeaderOnlyItem,
    builtAt: FIXED_AT,
  });
  ok("C3 OfferBoq null", runtime == null);
  const temptation = computeCatalogBidProposalForPricingAuto({
    item: athHeaderOnlyItem,
    swz: athHeaderOnlyItem.tenderDossier.swz,
    priceOverrides: [],
  });
  ok("C3 temptation ath_priced", temptation.pricingMode === "ath_priced");
  const proposal = resolveTenderPricingAutoProposal({
    item: athHeaderOnlyItem,
    swz: athHeaderOnlyItem.tenderDossier.swz,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  ok("C3 GAP not ath_priced", proposal == null);
}

// ——— CASE 4: OfferBoq null + catalog API exists → GAP · NIE catalog ———
{
  const proposal = resolveTenderPricingAutoProposal({
    item: emptyItem,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  ok("C4 GAP", proposal == null);
  ok("C4 not catalog object", proposal?.pricingMode !== "catalog");
  // Legacy helper KEEP TECHNICAL (pipeline OFF / P7) — nie używany w C-MODE path.
  ok(
    "C4 catalog helper retained",
    typeof computeCatalogBidProposalForPricingAuto === "function",
  );
}

// ——— CASE 5: OfferBoq null + companyPrice temptation → GAP ———
{
  const withCompany = {
    ...athHeaderOnlyItem,
    id: "tid-company",
  };
  const temptation = computeCatalogBidProposalForPricingAuto({
    item: withCompany,
    swz: withCompany.tenderDossier.swz,
    priceOverrides: [],
  });
  ok("C5 temptation still has pricingMode", temptation.pricingMode != null);
  const proposal = resolveTenderPricingAutoProposal({
    item: withCompany,
    swz: withCompany.tenderDossier.swz,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  ok("C5 GAP no companyPrice Bid", proposal == null);
  const src = read("src/app/hooks/useTenderPricingAuto.ts");
  ok(
    "C5 source has OfferBoq null → return null",
    /OfferBoq null[\s\S]{0,120}return null/.test(src),
  );
}

// ——— CASE 6–8: OfferBoq exists · missing OUR RATE / material / identity → GAP ———
{
  const storeMissingRate = makeStore([
    makeLaborHost({ ourWorkRate: undefined, companyPricePln: 777 }),
    makePaintMaterialWork(),
  ]);
  const r6 = computeBidProposalFromPositionCost({
    doc: makeDoc([paintLine()]),
    kosztorys: richQtyItem.tenderDossier.kosztorys,
    swz: richQtyItem.tenderDossier.swz,
    fit: richQtyItem.tenderDossier.fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: { store: storeMissingRate, nowMs: NOW, paintCoats: 2 },
  });
  ok("C6 OUR RATE missing → GAP", r6.proposal.ok === false);
  ok("C6 no catalog mode", r6.proposal.pricingMode !== "catalog");
  ok("C6 no ath_priced", r6.proposal.pricingMode !== "ath_priced");

  const storeMissingMat = makeStore([
    makeLaborHost(),
    makePaintMaterialWork({
      marketQuotes: {},
      commercialPricing: undefined,
      companyPricePln: 888,
    }),
  ]);
  const r7 = computeBidProposalFromPositionCost({
    doc: makeDoc([paintLine()]),
    kosztorys: richQtyItem.tenderDossier.kosztorys,
    swz: richQtyItem.tenderDossier.swz,
    fit: richQtyItem.tenderDossier.fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: { store: storeMissingMat, nowMs: NOW, paintCoats: 2 },
  });
  ok("C7 material missing → GAP", r7.proposal.ok === false);
  ok("C7 no catalog", r7.proposal.pricingMode !== "catalog");

  const storeOk = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const r8 = computeBidProposalFromPositionCost({
    doc: makeDoc([
      paintLine({
        catalogWorkId: null,
        matchMethod: "none",
        matchedBy: "none",
        matchConfidence: "low",
        candidateMatches: [],
      }),
    ]),
    kosztorys: richQtyItem.tenderDossier.kosztorys,
    swz: richQtyItem.tenderDossier.swz,
    fit: richQtyItem.tenderDossier.fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: { store: storeOk, nowMs: NOW, paintCoats: 2 },
  });
  ok("C8 BOM/identity missing → GAP", r8.proposal.ok === false);
  ok("C8 no invent recommended", r8.proposal.recommendedBidPln == null);
}

// ——— CASE 9: F5 happy path ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const r = computeBidProposalFromPositionCost({
    doc: makeDoc([paintLine()]),
    kosztorys: richQtyItem.tenderDossier.kosztorys,
    swz: richQtyItem.tenderDossier.swz,
    fit: richQtyItem.tenderDossier.fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: { store, nowMs: NOW, paintCoats: 2 },
  });
  ok("C9 gate PASS", r.gate.pass);
  ok("C9 bid ok", r.proposal.ok);
  ok("C9 offer_boq_ai", r.proposal.pricingMode === "offer_boq_ai");
  ok("C9 recommended > 0", (r.proposal.recommendedBidPln ?? 0) > 0);
  ok("C9 HTTP 0", fetchCalls === 0);
}

// ——— CASE 10: ATH SEPARATE INPUT retained ———
{
  const athParser = read("src/lib/ath-parser.ts");
  ok("C10 ath-parser retained", /parseKosztorysBytes|AthPreview/.test(athParser));
  const calc = read("src/lib/tenders-bid-calculator.ts");
  ok("C10 ath_priced enum retained", /ath_priced/.test(calc));
  const auto = read("src/app/hooks/useTenderPricingAuto.ts");
  ok("C10 no BUGFIX catalog fallback in resolve", !/BUGFIX-01: bezpieczny fallback/.test(auto));
  ok("C10 C-MODE-1a comment present", /C-MODE-1a/.test(auto));
  // Direct ATH Bid API still callable (KEEP) — not via auto pricing null path.
  const athProposal = computeTenderBidProposal({
    kosztorys: athHeaderOnlyItem.tenderDossier.kosztorys,
    swz: athHeaderOnlyItem.tenderDossier.swz,
    fit: athHeaderOnlyItem.tenderDossier.fit,
    costModel,
    minProjectDays: 14,
    maxConcurrentProjects: 2,
  });
  ok("C10 direct ath_priced API KEEP", athProposal.pricingMode === "ath_priced");
}

console.log(`\nWYNIK C-MODE-1a FALLBACK REMOVAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
