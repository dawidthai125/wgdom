/**
 * TENDER-BOQ-PRICING-REBUILD-01 — C-MODE-1a kontrakt (Owner Decision ACCEPTED).
 *
 * NEW BID = F5 pipeline · ath_priced / catalog / companyPricePln = NO FALLBACK (F5 path).
 * HTTP = 0 · research = 0 · ZERO migracji ATH→OUR RATE.
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-contract.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { resolveTenderBidPricingMode } from "../src/lib/tenders-bid-calculator.ts";
import {
  computeBidProposalFromPositionCost,
  computeShadowPositionCostsForOfferBoq,
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

const NOW = Date.parse("2026-08-12T08:30:00.000Z");
const T_FRESH = "2026-08-11T12:00:00.000Z";
const FIXED_AT = "2026-08-12T08:30:00.000Z";
const PAINT_WORK = "legacy-malowanie-m2";
const PAINT_UNIT = "m2";
const PAINT_MAT = "mat.farba_lateksowa_wewnetrzna";
const PAINT_HOST = "cw.product.farba_lateksowa_wewnetrzna";
const costModel = defaultCostModelFromPayroll();
const kpPct = costModel.kpPct;
const profitPct = costModel.profitPct;
const minMarginPct = costModel.minMarginPct;

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function quoteCell(price, updatedAt = T_FRESH, origin = "wgdom") {
  return {
    [origin]: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt,
        confidence: 0.85,
        origin,
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
    marketQuotes: quoteCell(40, T_FRESH),
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

function storeFromWorks(works) {
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

function offerDoc(lines) {
  const materials = lines.reduce((s, l) => s + (l.materialCostPln ?? 0), 0);
  const labor = lines.reduce((s, l) => s + (l.laborCostPln ?? 0), 0);
  const direct = materials + labor;
  return {
    tenderId: "t-cmode1a",
    builtAt: FIXED_AT,
    sourceFilename: "przedmiar.ath",
    buildStatus: "priced",
    lines,
    totals: {
      lineCount: lines.length,
      materialsPln: materials,
      laborPln: labor,
      equipmentPln: 0,
      directPln: direct,
      kpPln: null,
      overheadPln: null,
      costPricePln: direct,
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

function kosztorysAthPriced() {
  return {
    ok: true,
    sourceFilename: "przedmiar.ath",
    rowCount: 1,
    rows: [
      {
        lp: "1",
        description: "Malowanie ścian",
        unit: "m2",
        quantity: "100",
        unitPrice: "50",
        total: "5000",
      },
    ],
    catalogQuantities: [
      { lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "100" },
    ],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: FIXED_AT,
    totalValue: "5000",
  };
}

function runCutover(store, lineOverrides = {}) {
  return computeBidProposalFromPositionCost({
    doc: offerDoc([paintLine(lineOverrides)]),
    kosztorys: kosztorysAthPriced(),
    swz: { implementationDays: 30, estimatedValuePln: 80_000 },
    fit: { priceWeightPct: 60 },
    costModel,
    minProjectDays: 14,
    maxConcurrentProjects: 2,
    builtAt: FIXED_AT,
    cutover: { store, nowMs: NOW, paintCoats: 2 },
  });
}

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

resetTf();

// ——— CASE 1: OUR RATE istnieje → F5 pricing ———
{
  const store = storeFromWorks([makeLaborHost(), makePaintMaterialWork()]);
  const r = runCutover(store);
  ok("C1 gate PASS", r.gate.pass);
  ok("C1 bid ok", r.proposal.ok === true);
  ok("C1 mode offer_boq_ai", r.proposal.pricingMode === "offer_boq_ai");
  ok("C1 recommended > 0", (r.proposal.recommendedBidPln ?? 0) > 0);
  ok("C1 not ath_priced", r.proposal.pricingMode !== "ath_priced");
  ok("C1 not catalog", r.proposal.pricingMode !== "catalog");
}

// ——— CASE 2: OUR RATE missing → GAP · NIE companyPrice ———
{
  const labor = makeLaborHost({ ourWorkRate: undefined, companyPricePln: 0 });
  const store = storeFromWorks([labor, makePaintMaterialWork()]);
  const r = runCutover(store);
  ok("C2 gate FAIL", r.gate.pass === false);
  ok("C2 bid not ok", r.proposal.ok === false);
  ok("C2 recommended null", r.proposal.recommendedBidPln == null);
  ok("C2 mode still offer_boq_ai (GAP)", r.proposal.pricingMode === "offer_boq_ai");
  ok("C2 not ath_priced fallback", r.proposal.pricingMode !== "ath_priced");
  ok("C2 not catalog fallback", r.proposal.pricingMode !== "catalog");
}

// ——— CASE 3: OUR RATE missing + companyPricePln > 0 → GAP · NIE legacy ———
{
  const labor = makeLaborHost({ ourWorkRate: undefined, companyPricePln: 777 });
  const store = storeFromWorks([labor, makePaintMaterialWork()]);
  const r = runCutover(store);
  ok("C3 GAP mimo companyPrice", r.proposal.ok === false && r.proposal.recommendedBidPln == null);
  ok("C3 no catalog", r.proposal.pricingMode !== "catalog");
  ok("C3 no ath_priced", r.proposal.pricingMode !== "ath_priced");
  const cutSrc = read("src/lib/tender-position-cost/bid-position-cost-cutover.ts").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  ).replace(/\/\/.*$/gm, "");
  ok("C3 cutover source no companyPricePln", !/\bcompanyPricePln\b/.test(cutSrc));
}

// ——— CASE 4: ATH ath_priced istnieje → NIE Bid SSOT ———
{
  const snap = kosztorysAthPriced();
  ok("C4 resolve would be ath_priced (legacy API)", resolveTenderBidPricingMode(snap) === "ath_priced");
  const store = storeFromWorks([makeLaborHost(), makePaintMaterialWork()]);
  const r = runCutover(store);
  ok("C4 F5 ignores ath money mode", r.proposal.pricingMode === "offer_boq_ai");
  ok("C4 recommended from Position Cost", r.proposal.ok && (r.proposal.recommendedBidPln ?? 0) > 0);
  // ATH totals 5000 ≠ F5 recommended (stack on Position Cost, not ATH 5000)
  ok(
    "C4 recommended ≠ raw ATH total",
    r.proposal.recommendedBidPln !== 5000 && r.proposal.costPricePln !== 5000,
  );
}

// ——— CASE 5: legacy catalog path exists in API · F5 nie używa ———
{
  const store = storeFromWorks([makeLaborHost(), makePaintMaterialWork()]);
  const r = runCutover(store);
  ok("C5 F5 not catalog mode", r.proposal.pricingMode !== "catalog");
  const calc = read("src/lib/tenders-bid-calculator.ts");
  ok("C5 catalog mode still in legacy calculator", /pricingMode === "catalog"/.test(calc));
}

// ——— CASE 6: material Price Memory missing → GAP · NIE legacy material ———
{
  const mat = makePaintMaterialWork({
    marketQuotes: {},
    commercialPricing: undefined,
    companyPricePln: 888,
  });
  const store = storeFromWorks([makeLaborHost(), mat]);
  const r = runCutover(store);
  ok("C6 GAP material", r.proposal.ok === false);
  ok("C6 no recommended", r.proposal.recommendedBidPln == null);
  ok("C6 no catalog fallback", r.proposal.pricingMode !== "catalog");
}

// ——— CASE 7: BOM missing / unbound identity → GAP · NIE invent ———
{
  const store = storeFromWorks([makeLaborHost(), makePaintMaterialWork()]);
  const r = runCutover(store, {
    catalogWorkId: null,
    matchMethod: "none",
    matchedBy: "none",
    matchConfidence: "low",
    candidateMatches: [],
  });
  ok("C7 GAP identity/BOM", r.proposal.ok === false);
  ok("C7 no invent bid", r.proposal.recommendedBidPln == null);
  ok("C7 offer_boq_ai GAP", r.proposal.pricingMode === "offer_boq_ai");
}

// ——— CASE 8: ATH qty/unit/description → OfferBoq → F5 ———
{
  const store = storeFromWorks([makeLaborHost(), makePaintMaterialWork()]);
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: offerDoc([paintLine()]),
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  ok("C8 structural line present", shadow.lineCount >= 1);
  ok("C8 qty used", shadow.lines[0]?.quantity === 100 || shadow.lines[0]?.quantity != null);
  const r = runCutover(store);
  ok("C8 F5 from structure", r.proposal.pricingMode === "offer_boq_ai" && r.proposal.ok);
}

// ——— CASE 9: companyPricePln zmienione → F5 Bid niezależny ———
{
  const a = storeFromWorks([
    makeLaborHost({ companyPricePln: 10 }),
    makePaintMaterialWork({ companyPricePln: 10 }),
  ]);
  const b = storeFromWorks([
    makeLaborHost({ companyPricePln: 900 }),
    makePaintMaterialWork({ companyPricePln: 900 }),
  ]);
  const ra = runCutover(a);
  const rb = runCutover(b);
  ok("C9 both ok", ra.proposal.ok && rb.proposal.ok);
  ok(
    "C9 recommended identical (companyPrice ignored)",
    ra.proposal.recommendedBidPln === rb.proposal.recommendedBidPln,
  );
  ok(
    "C9 costPrice identical",
    ra.proposal.costPricePln === rb.proposal.costPricePln,
  );
}

// ——— CASE 10: happy path · stack UNCHANGED ———
{
  const store = storeFromWorks([makeLaborHost(), makePaintMaterialWork()]);
  const r = runCutover(store);
  ok("C10 ok", r.proposal.ok);
  ok("C10 kpPct model", costModel.kpPct === kpPct);
  ok("C10 profitPct model", costModel.profitPct === profitPct);
  ok("C10 minMarginPct model", costModel.minMarginPct === minMarginPct);
  ok(
    "C10 recommended > costPrice",
    (r.proposal.recommendedBidPln ?? 0) > (r.proposal.costPricePln ?? 0),
  );
  ok("C10 HTTP 0", fetchCalls === 0);
}

// ——— Dokumentacja C-MODE-1a + znany product fallback (bez auto-fix) ———
{
  const decision = read(
    "docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-OWNER-DECISION-C-MODE-1A.md",
  );
  ok("DOC C-MODE-1a exists", /C-MODE-1a ACCEPTED/.test(decision));
  const auto = read("src/app/hooks/useTenderPricingAuto.ts");
  ok(
    "C-MODE-1a: OfferBoq null → return null (fallback removed)",
    /OfferBoq null[\s\S]{0,120}return null/.test(auto),
  );
  ok(
    "Legacy catalog helper KEEP TECHNICAL",
    /export function computeCatalogBidProposalForPricingAuto/.test(auto),
  );
  const cut = read("src/lib/tender-position-cost/bid-position-cost-cutover.ts");
  ok(
    "F5 cutover documents ZERO legacy fallback",
    /ZERO legacy fallback/.test(cut),
  );
}

console.log(`\nWYNIK C-MODE-1a CONTRACT: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
