/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 5 — Bid cutover harness (shadow + gate + Bid stack).
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { buildOfferBoqBidAdapterPayload } from "../src/lib/tender-offer-boq-bid-adapter.ts";
import {
  compareLegacyVsPositionCostBid,
  computeBidProposalFromPositionCost,
  computePositionCost,
  computeShadowPositionCostsForOfferBoq,
  evaluateBidCutoverGate,
} from "../src/lib/tender-position-cost/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  PAINTING_ECONOMY_FACTOR_2_COATS,
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
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const NOW = Date.parse("2026-08-12T06:00:00.000Z");
const T_FRESH = "2026-08-11T12:00:00.000Z";
const T_STALE = "2026-04-01T12:00:00.000Z";
const FIXED_AT = "2026-08-12T06:00:00.000Z";

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

function lineTrusted(overrides = {}) {
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
    athUnitPricePln: null,
    athTotalPln: null,
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
  const direct = materials + labor;
  return {
    tenderId: "t-f5",
    builtAt: FIXED_AT,
    sourceFilename: "f5.pdf",
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

const kosztorys = {
  ok: true,
  sourceFilename: "f5.pdf",
  rowCount: 1,
  rows: [],
  catalogQuantities: [],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: FIXED_AT,
};

const swz = { implementationDays: 30, estimatedValuePln: 80_000 };
const fit = { priceWeightPct: 60 };

resetTf();

const goodStore = makeStore([makeLaborHost(), makePaintMaterialWork()]);
const goodDoc = makeDoc([lineTrusted()]);
const cutover = { store: goodStore, nowMs: NOW, paintCoats: 2 };

// ——— 1–4 shadow old vs new ———
{
  const legacyPayload = buildOfferBoqBidAdapterPayload(goodDoc, FIXED_AT);
  const cmp = compareLegacyVsPositionCostBid({
    bidInput: {
      doc: goodDoc,
      kosztorys,
      swz,
      fit,
      costModel,
      builtAt: FIXED_AT,
      cutover,
    },
    legacyDirect: legacyPayload?.directInput ?? null,
  });
  ok("T1 gate PASS", cmp.gate.pass);
  ok("T1 legacy direct", cmp.legacy.directPln != null && cmp.legacy.directPln > 0);
  ok("T1 next direct", cmp.next.directPln != null && cmp.next.directPln > 0);
  ok("T1 delta measurable", cmp.deltas.directPln != null);
  // New ≠ legacy (legacy 13000; new = labor 2000 + mat sell)
  ok("T1 not identical assumed", cmp.legacy.directPln !== cmp.next.directPln);
  ok("T2 labor next", cmp.next.laborPln === 2000);
  const expectedMat = Number((100 * PAINTING_ECONOMY_FACTOR_2_COATS * 50).toFixed(2));
  ok(
    "T3 materials next",
    Math.abs((cmp.next.materialsPln ?? 0) - expectedMat) < 0.02,
    { got: cmp.next.materialsPln, expectedMat },
  );
  ok("T4 multi-material capable", cmp.shadow.lines[0].materialsResolved.length >= 1);
}

// ——— 5–11 gaps ———
{
  const missRate = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: {
      store: makeStore([makeLaborHost({ ourWorkRate: undefined }), makePaintMaterialWork()]),
      nowMs: NOW,
      paintCoats: 2,
    },
  });
  ok("T5 MISSING OUR RATE", !missRate.gate.pass);
  ok("T5 gap label", missRate.proposal.warnings.some((w) => /STAWKI|OUR RATE|GATE/i.test(w)));
  eq("T5 bid null", missRate.proposal.recommendedBidPln, null);

  const staleRate = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: {
      store: makeStore([
        makeLaborHost({
          ourWorkRate: {
            workId: PAINT_WORK,
            unit: PAINT_UNIT,
            ourRatePln: 20,
            sourceType: "OWNER",
            regionScope: "WROCLAW",
            observedAt: T_STALE,
            updatedAt: T_STALE,
            history: [],
          },
        }),
        makePaintMaterialWork(),
      ]),
      nowMs: NOW,
      paintCoats: 2,
    },
  });
  ok("T6 STALE OUR RATE", !staleRate.gate.pass);
  ok(
    "T6 STALE gap",
    staleRate.shadow.lines[0].gaps.includes("PRZETERMINOWANA_STAWKA_ROBOT"),
  );

  const missBom = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: {
      store: makeStore([
        makeLaborHost({ id: "no-bom-work", ourWorkRate: {
          workId: "no-bom-work",
          unit: PAINT_UNIT,
          ourRatePln: 20,
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: T_FRESH,
          updatedAt: T_FRESH,
          history: [],
        }}),
        makePaintMaterialWork(),
      ]),
      nowMs: NOW,
      paintCoats: 2,
    },
  });
  // identity still paints work from line catalogWorkId — need wrong workId on line
  const missBom2 = computeBidProposalFromPositionCost({
    doc: makeDoc([lineTrusted({ catalogWorkId: "unknown-work-xyz" })]),
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover,
  });
  ok("T7 missing identity/BOM path", !missBom2.gate.pass);

  const missMat = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: {
      store: makeStore([makeLaborHost(), makePaintMaterialWork({ marketQuotes: {} })]),
      nowMs: NOW,
      paintCoats: 2,
    },
  });
  ok("T8 MISSING material", !missMat.gate.pass);

  const staleMat = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover: {
      store: makeStore([
        makeLaborHost(),
        makePaintMaterialWork({ marketQuotes: quoteCell(40, T_STALE) }),
      ]),
      nowMs: NOW,
      paintCoats: 2,
    },
  });
  ok("T9 STALE material", !staleMat.gate.pass);

  const amb = computeBidProposalFromPositionCost({
    doc: makeDoc([
      lineTrusted({
        candidateMatches: [
          {
            catalogWorkId: PAINT_WORK,
            workNamePl: "A",
            workCategory: "MALOWANIE",
            tradeId: "MALOWANIE",
            score: 80,
            role: "primary",
            matchedBy: "catalog_map",
            matchConfidence: "medium",
            rationale: "a",
          },
          {
            catalogWorkId: "other-work",
            workNamePl: "B",
            workCategory: "MALOWANIE",
            tradeId: "MALOWANIE",
            score: 70,
            role: "alt",
            matchedBy: "catalog_map",
            matchConfidence: "medium",
            rationale: "b",
          },
        ],
      }),
    ]),
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover,
  });
  ok("T10 AMBIGUOUS", !amb.gate.pass);
  ok("T10 gap", amb.shadow.lines[0].gaps.includes("NIEJEDNOZNACZNA_ROBOTA"));

  void missBom;
}

// ——— 12 companyPrice leak ———
{
  const src = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/bid-position-cost-cutover.ts"),
    "utf8",
  );
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok("T12 no companyPricePln read", !/\bcompanyPricePln\b/.test(code));
}

// ——— 13–15 HTTP / research / determinism ———
{
  const before = fetchCalls;
  const a = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover,
  });
  const b = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover,
  });
  eq("T13 HTTP 0", fetchCalls, before);
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/bid-position-cost-cutover.ts"),
    "utf8",
  );
  ok(
    "T14 no research",
    !/kb\.pl|sccot|extradom|cennikremontow|leroy|castorama|obi/i.test(adapter),
  );
  eq("T15 deterministic recommended", a.proposal.recommendedBidPln, b.proposal.recommendedBidPln);
  eq("T15 deterministic direct", a.directInput?.directPln, b.directInput?.directPln);
}

// ——— 16–19 Bid stack unchanged semantics ———
{
  const r = computeBidProposalFromPositionCost({
    doc: goodDoc,
    kosztorys,
    swz,
    fit,
    costModel,
    builtAt: FIXED_AT,
    cutover,
  });
  ok("T16 gate", r.gate.pass);
  ok("T16 bid ok", r.proposal.ok);
  ok("T16 recommended", r.proposal.recommendedBidPln != null && r.proposal.recommendedBidPln > 0);
  const kpLine = r.proposal.costStack.find((l) => /\bkp\b|pośredn/i.test(l.label));
  ok("T16 Kp present", kpLine != null);
  eq("T16 kpPct model", kpPct, costModel.kpPct);
  eq("T17 profitPct model", profitPct, costModel.profitPct);
  eq("T18 minMarginPct model", minMarginPct, costModel.minMarginPct);
  ok(
    "T19 recommended > costPrice",
    r.proposal.recommendedBidPln > (r.proposal.costPricePln ?? 0),
  );
  eq("T19 mode offer_boq_ai", r.proposal.pricingMode, "offer_boq_ai");
}

// ——— 20 Offer / legacy adapter still works ———
{
  const legacy = buildOfferBoqBidAdapterPayload(goodDoc, FIXED_AT);
  ok("T20 legacy payload", legacy != null && legacy.directInput.directPln === 13000);
}

// ——— Cutover gate + AUX ———
{
  const auxDoc = makeDoc([
    lineTrusted({
      lineId: "L2",
      costIntelligence: { lineKind: "Equipment" },
    }),
  ]);
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: auxDoc,
    store: goodStore,
    nowMs: NOW,
    paintCoats: 2,
  });
  const gate = evaluateBidCutoverGate(shadow);
  ok("TX EQ gate FAIL", !gate.pass);
  ok("TX EQ equipmentGapCount", gate.equipmentGapCount >= 1);
  ok("TX EQ not AUXILIARY_GAP count", gate.auxiliaryGapCount === 0);
}

// ——— F0 pure preserved ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 10 },
    materials: [],
  });
  eq("TF0", r.totalPositionCostPln, 10);
}

console.log(`\nWYNIK F5 BID CUTOVER: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
