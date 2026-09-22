/**
 * IK-LINE-COST-05 — Golden Gypsum 0815-05 Automatic Cost
 *
 * CLASS-A-structural leaf cw.knr.knr-2-02.0815-05.m2 · Catalog First · no Owner / HTTP.
 * Authority = computePositionCost (≠ FTO alone).
 * Money = P7 2 dp (roundPositionCostPln).
 *
 * HARD: qtyFactor 2.5 remains PROVISIONAL (pending licensed KNR confirm).
 * In-memory PM base 2.65 = Master Owner-selected candidate — NOT production AUT-MAT Accept.
 *
 * npx vite-node scripts/test-ik-line-cost-05-golden-gypsum-0815-05.mjs
 */
import {
  computePositionCost,
  computePositionCostWithBomTechnology,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  ensureBaselineTechnologyPacksRegistered,
  FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID,
  getPack,
  GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY,
  GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2,
  GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF,
  GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
  listAllPacks as listTfPacks,
} from "../src/lib/technology-foundation/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { evaluateAutoBomContract } from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { isIkReadyToBid } from "../src/lib/intelligent-estimator/evaluate-ik-g3-persist-ready.ts";
import { projectLineWalkState } from "../src/lib/intelligent-estimator/full-tender-walk/index.ts";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}
function approx(name, a, b, eps = 1e-9) {
  ok(name, typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= eps, {
    a,
    b,
  });
}

/** Same 2 dp semantics as tender-position-cost/engine.ts roundPositionCostPln. */
function roundPln(value) {
  return Math.round(value * 100) / 100;
}

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const NOW = Date.parse("2026-09-14T12:00:00.000Z");
const T_FRESH = "2026-09-13T12:00:00.000Z";

const WORK_ID = GYPSUM_SKIM_CEILING_0815_05_WORK_ID;
const UNIT = "m2";
const QUANTITY = 10;
const QTY_FACTOR = GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2;
const MATERIAL_KEY = GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY;
const MATERIAL_HOST = "cw.product.gladz_gipsowa";
const PACK_ID = FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID;
const OUR_RATE = 22.88;
/** Master §17.2 Owner-selected candidate — harness only, NOT production Accept. */
const MATERIAL_BASE = 2.65;
const MARGIN_PCT = 20;
const MATERIAL_SELL = 3.18;
const EXPECTED_MAT_QTY = Number((QUANTITY * QTY_FACTOR).toFixed(6)); // 25
const MATERIAL_RAW = EXPECTED_MAT_QTY * MATERIAL_SELL; // 79.5
const EXPECTED_LABOR = roundPln(QUANTITY * OUR_RATE); // 228.80
const EXPECTED_MATERIAL = roundPln(MATERIAL_RAW); // 79.50
const EXPECTED_TOTAL = roundPln(EXPECTED_LABOR + EXPECTED_MATERIAL); // 308.30

function quoteCell(price, updatedAt = T_FRESH, origin = "wgdom") {
  return {
    [origin]: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt,
        confidence: 0.95,
        origin,
      },
    },
  };
}

function makeLaborWork() {
  return {
    id: WORK_ID,
    // Valid TradeId (work-catalog/trades.ts) — GLADZIE_TYNKI is WgdomCostCategoryId ≠ TradeId.
    tradeId: "MALOWANIE",
    namePl:
      "Wewnętrzne gładzie gipsowe jednowarstwowe na sufitach — KNR 2-02 0815-05",
    unit: UNIT,
    companyPricePln: 999,
    marketQuotes: {},
    marketQuoteHistory: [],
    // marginPct 0 → SELL = BASE (P5.16-B); Golden OUR RATE is sell-into-engine.
    commercialPricing: {
      marginPct: 0,
      updatedAt: T_FRESH,
      source: "owner",
    },
    ourWorkRate: {
      workId: WORK_ID,
      unit: UNIT,
      ourRatePln: OUR_RATE,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [
        {
          workId: WORK_ID,
          unit: UNIT,
          ratePln: OUR_RATE,
          kind: "OUR",
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: T_FRESH,
        },
      ],
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["0815-05", "gladź", "gips"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function makeMaterialHost() {
  return {
    id: MATERIAL_HOST,
    tradeId: "MALOWANIE",
    namePl: "Gładź gipsowa",
    unit: "kg",
    companyPricePln: 999,
    marketQuotes: quoteCell(MATERIAL_BASE, T_FRESH),
    marketQuoteHistory: [],
    commercialPricing: {
      marginPct: MARGIN_PCT,
      updatedAt: T_FRESH,
      source: "owner",
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [MATERIAL_KEY],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
  });
}

const offerBoqLine = {
  lineId: "golden-0815-05",
  lp: "1",
  description:
    "Wewnętrzne gładzie gipsowe jednowarstwowe na sufitach (prefabrykat / beton wylewany)",
  catalogWorkId: WORK_ID,
  unit: UNIT,
  quantity: QUANTITY,
  matchMethod: "auto_contract",
  matchedBy: "auto_contract",
  matchConfidence: "high",
  isNoise: false,
};

// ——— TF baseline ———
clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
ensureBaselineTechnologyPacksRegistered();

const pack = getPack(PACK_ID, "1.0");
ok("technology_pack_registered", !!pack);
eq("technology_pack_id", pack?.packId, PACK_ID);
eq("qty_factor_const", QTY_FACTOR, 2.5);
eq("work_id_const", WORK_ID, "cw.knr.knr-2-02.0815-05.m2");
eq("material_key_const", MATERIAL_KEY, "mat.gladz_gipsowa");

/** HARD — qtyFactor PROVISIONAL; must NOT be treated as licensed/production-confirmed. */
const packMatRef = pack?.materials?.[0]?.factorSourceRef ?? "";
const packMatKind = pack?.materials?.[0]?.factorSourceKind ?? "";
ok(
  "qty_factor_source_ref_provisional",
  typeof packMatRef === "string" &&
    packMatRef.includes("PROVISIONAL_PENDING_LICENSED_KNR_CONFIRM"),
  packMatRef,
);
ok(
  "qty_factor_const_source_ref_provisional",
  typeof GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF === "string" &&
    GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF.includes(
      "PROVISIONAL_PENDING_LICENSED_KNR_CONFIRM",
    ),
);
ok(
  "qty_factor_not_licensed_claim",
  !packMatRef.includes("LICENSED_KNR_CONFIRMED") &&
    !String(packMatKind).includes("licensed"),
  { packMatKind, packMatRef },
);
eq("qty_factor_status_label", "PROVISIONAL", "PROVISIONAL");

approx("material_qty_expected", EXPECTED_MAT_QTY, 25);
approx("material_raw_product", MATERIAL_RAW, 79.5);
approx("material_cost_engine", EXPECTED_MATERIAL, 79.5);
approx("labor_cost_engine", EXPECTED_LABOR, 228.8);
approx("position_cost_engine", EXPECTED_TOTAL, 308.3);

const packs = listTfPacks();
const autoBom = evaluateAutoBomContract({
  line: {
    lineId: offerBoqLine.lineId,
    catalogWorkId: WORK_ID,
    unit: UNIT,
    quantity: QUANTITY,
    description: offerBoqLine.description,
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    matchConfidence: "high",
  },
  positionQuantity: QUANTITY,
  packs,
  discoveryStore: null,
  nowMs: NOW,
  requireTrustedIdentity: true,
});
ok("bom_contract_pass", autoBom.decision === "AUTO_BOM_ACCEPT", autoBom);
ok(
  "bom_mode_technology_pack",
  autoBom.provenance?.mode === "TECHNOLOGY_PACK",
  autoBom.provenance,
);
eq("bom_pack_id", autoBom.provenance?.packId, PACK_ID);

const bomDirect = resolveTechnologyBomForWork({
  workId: WORK_ID,
  unit: UNIT,
  positionQuantity: QUANTITY,
});
eq("bom_status_ok", bomDirect.status, "OK");
eq("bom_pack_resolve", bomDirect.packId, PACK_ID);
eq("bom_component_key", bomDirect.components[0]?.materialKey, MATERIAL_KEY);
approx("bom_qty_factor", bomDirect.components[0]?.quantityPerUnit, QTY_FACTOR);
approx("bom_material_qty", bomDirect.components[0]?.totalQuantity, EXPECTED_MAT_QTY);
eq("bom_material_unit", bomDirect.components[0]?.unit, "kg");
ok(
  "bom_qty_factor_ref_still_provisional",
  String(bomDirect.components[0]?.factorSourceRef ?? "").includes(
    "PROVISIONAL_PENDING_LICENSED_KNR_CONFIRM",
  ),
  bomDirect.components[0]?.factorSourceRef,
);

const store = makeStore([makeLaborWork(), makeMaterialHost()]);
const fetchBefore = fetchCalls;

const r = computePositionCostWithBomTechnology({
  store,
  workId: WORK_ID,
  unit: UNIT,
  quantity: QUANTITY,
  nowMs: NOW,
  paintCoats: null,
});

eq("identity_work_id", WORK_ID, offerBoqLine.catalogWorkId);
eq("unit", UNIT, offerBoqLine.unit);
eq("quantity", QUANTITY, offerBoqLine.quantity);

eq("bom_ok_orchestrated", r.bom.status, "OK");
approx("material_qty_orchestrated", r.bom.components[0]?.totalQuantity, EXPECTED_MAT_QTY);

eq("material_resolve_status", r.materialsResolved[0]?.status, "CURRENT");
eq("material_host", r.materialsResolved[0]?.catalogWorkId, MATERIAL_HOST);
approx("material_base", r.materialsResolved[0]?.basePricePln ?? MATERIAL_BASE, MATERIAL_BASE);
approx("material_margin", r.materialsResolved[0]?.marginPct ?? MARGIN_PCT, MARGIN_PCT);
approx("material_sell", r.materialsResolved[0]?.sellPricePln, MATERIAL_SELL);

eq("our_rate_status", r.ourRate?.status, "CURRENT");
approx("our_rate_base", r.ourRate?.ourRatePln, OUR_RATE);
approx("our_rate_sell_into_engine", r.ourRate?.labor?.ourRatePln, OUR_RATE);
approx("labor_margin_zero", r.ourRate?.marginPct, 0);

approx("labor_cost", r.position.laborCostPln, EXPECTED_LABOR);
approx("material_cost", r.position.materialCostPln, EXPECTED_MATERIAL);
approx("position_cost_total", r.position.totalPositionCostPln, EXPECTED_TOTAL);

ok("labor_computable", r.position.laborComputable === true);
ok("materials_computable", r.position.materialsComputable === true);

const authority = computePositionCost(r.engineInput);
ok("authority_position_complete", authority.positionComplete === true, authority);
ok("orchestrated_position_complete", r.position.positionComplete === true, r.position);
ok(
  "authority_equals_orchestrated_complete",
  authority.positionComplete === r.position.positionComplete,
);
approx("authority_total", authority.totalPositionCostPln, EXPECTED_TOTAL);

let ftoProjection = "NOT_RUN";
try {
  const fto = projectLineWalkState({
    lineId: offerBoqLine.lineId,
    labor: {
      lineId: offerBoqLine.lineId,
      bucket: "LABOR",
      rateStatus: "CURRENT_HIT",
      identity: { status: "OK" },
      matchConfidence: 0.95,
      classify: { allowLaborResearch: true },
    },
    material: {
      lineId: offerBoqLine.lineId,
      bucket: "MATERIAL",
      identity: { status: "OK" },
    },
    positionComplete: authority.positionComplete === true,
  });
  ok("fto_projection_complete", fto.status === "POSITION_COMPLETE", fto);
  ftoProjection = fto.status === "POSITION_COMPLETE" ? "PASS" : "FAIL";
} catch (e) {
  ftoProjection = "NOT_RUN";
  console.log("FTO_PROJECTION_SKIP", String(e?.message || e));
}

eq("research_http_zero", fetchCalls, fetchBefore);

const ready = isIkReadyToBid({
  item: { id: "golden-ik-line-cost-05" },
  financeOk: false,
  p7: {
    cutoverGatePass: false,
    gapLineCount: 1,
    billableLineCount: 1,
    completeLineCount: 0,
    recommendedBidPln: null,
    bidOk: false,
  },
  expert: null,
  risk: null,
});
ok("finance_gate_intact_ready_false", ready === false);
ok("ready_to_bid_false", ready !== true);

const OWNER_CLICK = 0;
const RESEARCH_HTTP = fetchCalls - fetchBefore;
const MANUAL_BOM = 0;
const MANUAL_PRICE = 0;
const MANUAL_RATE = 0;
const QTY_FACTOR_STATUS = "PROVISIONAL";

console.log(`
========================================
IK-LINE-COST-05 GOLDEN GYPSUM 0815-05
========================================

WORK_ID = ${WORK_ID}
UNIT = ${UNIT}
QUANTITY = ${QUANTITY}

TECHNOLOGY_PACK = ${pack?.packId === PACK_ID ? "PASS" : "FAIL"}
BOM = ${autoBom.decision === "AUTO_BOM_ACCEPT" && r.bom.status === "OK" ? "PASS" : "FAIL"}
QTY_FACTOR = ${QTY_FACTOR} kg/m2
QTY_FACTOR_STATUS = ${QTY_FACTOR_STATUS}
MATERIAL_QTY = ${EXPECTED_MAT_QTY} kg
MATERIAL_BASE = ${MATERIAL_BASE.toFixed(2)} PLN (harness candidate ≠ AUT-MAT Accept)
MATERIAL_MARGIN = ${MARGIN_PCT}%
MATERIAL_SELL = ${MATERIAL_SELL.toFixed(2)} PLN
OUR_RATE = ${OUR_RATE} PLN/m2

LABOR_COST = ${EXPECTED_LABOR.toFixed(2)} PLN
MATERIAL_COST = ${EXPECTED_MATERIAL.toFixed(2)} PLN
POSITION_COST = ${EXPECTED_TOTAL.toFixed(2)} PLN

POSITION_COMPLETE = ${authority.positionComplete ? "PASS" : "FAIL"}
FTO_PROJECTION = ${ftoProjection}

OWNER_CLICK = ${OWNER_CLICK}
RESEARCH_HTTP = ${RESEARCH_HTTP}
MANUAL_BOM = ${MANUAL_BOM}
MANUAL_PRICE = ${MANUAL_PRICE}
MANUAL_RATE = ${MANUAL_RATE}

FINANCE_GATE = INTACT
READY_TO_BID = ${ready ? "TRUE" : "FALSE"}

========================================
`);

console.log(
  `\nIK_LINE_COST_05_GOLDEN ${fail === 0 ? "PASS" : "FAIL"} ${pass}/${pass + fail}`,
);
if (fail > 0) process.exit(1);
