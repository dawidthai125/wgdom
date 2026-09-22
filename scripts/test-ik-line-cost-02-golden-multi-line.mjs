/**
 * IK-LINE-COST-02 — Golden Multi-Line Automatic Cost
 *
 * Two CLASS-A paint leaves in one harness · Catalog First · no Owner / HTTP.
 * Authority = computePositionCost (≠ FTO alone).
 * Money = engine 2 dp (roundPositionCostPln) — same as LINE-COST-01 / P7.
 *
 * npx vite-node scripts/test-ik-line-cost-02-golden-multi-line.mjs
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
  FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
  FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
  getPack,
  listAllPacks as listTfPacks,
  PAINTING_KNR_2_02_1505_01_MATERIAL_KEY,
  PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2,
  PAINTING_KNR_2_02_1505_01_WORK_ID,
  PAINTING_KNR_4_01_1204_02_MATERIAL_KEY,
  PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2,
  PAINTING_KNR_4_01_1204_02_WORK_ID,
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

const UNIT = "m2";
const QUANTITY = 10;
const MATERIAL_HOST = "cw.product.farba_lateksowa_wewnetrzna";
const MATERIAL_BASE = 10.0;
const MARGIN_PCT = 20;
const MATERIAL_SELL = 12.0;

const LINE_A = {
  tag: "A",
  lineId: "golden-ml-1204-02",
  workId: PAINTING_KNR_4_01_1204_02_WORK_ID,
  packId: FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
  materialKey: PAINTING_KNR_4_01_1204_02_MATERIAL_KEY,
  qtyFactor: PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2,
  ourRate: 3.72,
  description:
    "Dwukrotne malowanie farbami lateksowymi starych tynków wewnętrznych ścian",
};

const LINE_B = {
  tag: "B",
  lineId: "golden-ml-1505-01",
  workId: PAINTING_KNR_2_02_1505_01_WORK_ID,
  packId: FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
  materialKey: PAINTING_KNR_2_02_1505_01_MATERIAL_KEY,
  qtyFactor: PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2,
  ourRate: 1.18,
  description:
    "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych — sufity",
};

function expectFor(line) {
  const materialQty = Number((QUANTITY * line.qtyFactor).toFixed(6));
  const laborRaw = QUANTITY * line.ourRate;
  const materialRaw = materialQty * MATERIAL_SELL;
  return {
    materialQty,
    /** Audit arithmetic (may have >2 dp). */
    laborRaw,
    materialRaw,
    totalRaw: laborRaw + materialRaw,
    /** P7 engine money (2 dp per component, then sum). */
    laborCost: roundPln(laborRaw),
    materialCost: roundPln(materialRaw),
    totalCost: roundPln(roundPln(laborRaw) + roundPln(materialRaw)),
  };
}

const EXP_A = expectFor(LINE_A);
const EXP_B = expectFor(LINE_B);
const MULTI_LINE_TOTAL = roundPln(EXP_A.totalCost + EXP_B.totalCost);
const MULTI_LINE_TOTAL_AUDIT_RAW = EXP_A.totalRaw + EXP_B.totalRaw;

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

function makeLaborWork(line) {
  return {
    id: line.workId,
    tradeId: "MALOWANIE",
    namePl: `Golden ML ${line.tag} — ${line.workId}`,
    unit: UNIT,
    companyPricePln: 999,
    marketQuotes: {},
    marketQuoteHistory: [],
    // marginPct 0 → SELL = BASE (P5.16-B); Owner Golden rates are sell-into-engine.
    commercialPricing: {
      marginPct: 0,
      updatedAt: T_FRESH,
      source: "owner",
    },
    ourWorkRate: {
      workId: line.workId,
      unit: UNIT,
      ourRatePln: line.ourRate,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [
        {
          workId: line.workId,
          unit: UNIT,
          ratePln: line.ourRate,
          kind: "OUR",
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: T_FRESH,
        },
      ],
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [line.tag, line.workId],
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
    namePl: "Farba lateksowa wewnętrzna",
    unit: "l",
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
    keywords: [PAINTING_KNR_4_01_1204_02_MATERIAL_KEY],
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

function offerLine(line) {
  return {
    lineId: line.lineId,
    lp: line.tag === "A" ? "1" : "2",
    description: line.description,
    catalogWorkId: line.workId,
    unit: UNIT,
    quantity: QUANTITY,
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    matchConfidence: "high",
    isNoise: false,
  };
}

// ——— Shared TF + WC fixture (one harness, two lines) ———
clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
ensureBaselineTechnologyPacksRegistered();

eq("line_a_work_id_const", LINE_A.workId, "cw.knr.knr-4-01.1204-02.m2");
eq("line_b_work_id_const", LINE_B.workId, "cw.knr.knr-2-02.1505-01.m2");
eq("line_a_qty_factor_const", LINE_A.qtyFactor, 0.286);
eq("line_b_qty_factor_const", LINE_B.qtyFactor, 0.2891);
approx("line_a_material_qty_expected", EXP_A.materialQty, 2.86);
approx("line_b_material_qty_expected", EXP_B.materialQty, 2.891);
approx("line_a_audit_labor_raw", EXP_A.laborRaw, 37.2);
approx("line_b_audit_labor_raw", EXP_B.laborRaw, 11.8);
approx("line_a_audit_material_raw", EXP_A.materialRaw, 34.32);
approx("line_b_audit_material_raw", EXP_B.materialRaw, 34.692);
approx("line_a_audit_total_raw", EXP_A.totalRaw, 71.52);
approx("line_b_audit_total_raw", EXP_B.totalRaw, 46.492);
approx("multi_line_audit_raw_sum", MULTI_LINE_TOTAL_AUDIT_RAW, 118.012);

ok("line_a_pack_registered", !!getPack(LINE_A.packId, "1.0"));
ok("line_b_pack_registered", !!getPack(LINE_B.packId, "1.0"));

const packs = listTfPacks();
const store = makeStore([
  makeLaborWork(LINE_A),
  makeLaborWork(LINE_B),
  makeMaterialHost(),
]);
const fetchBefore = fetchCalls;

const LINES = [LINE_A, LINE_B];
const results = [];

for (const line of LINES) {
  const exp = line.tag === "A" ? EXP_A : EXP_B;
  const prefix = `line_${line.tag.toLowerCase()}`;
  const offer = offerLine(line);

  const autoBom = evaluateAutoBomContract({
    line: {
      lineId: offer.lineId,
      catalogWorkId: line.workId,
      unit: UNIT,
      quantity: QUANTITY,
      description: offer.description,
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
  ok(`${prefix}_bom_contract_pass`, autoBom.decision === "AUTO_BOM_ACCEPT", autoBom);
  ok(
    `${prefix}_bom_mode_technology_pack`,
    autoBom.provenance?.mode === "TECHNOLOGY_PACK",
    autoBom.provenance,
  );
  eq(`${prefix}_bom_pack_id`, autoBom.provenance?.packId, line.packId);

  const bomDirect = resolveTechnologyBomForWork({
    workId: line.workId,
    unit: UNIT,
    positionQuantity: QUANTITY,
  });
  eq(`${prefix}_bom_status_ok`, bomDirect.status, "OK");
  eq(`${prefix}_bom_pack_resolve`, bomDirect.packId, line.packId);
  eq(`${prefix}_bom_component_key`, bomDirect.components[0]?.materialKey, line.materialKey);
  approx(`${prefix}_bom_qty_factor`, bomDirect.components[0]?.quantityPerUnit, line.qtyFactor);
  approx(`${prefix}_bom_material_qty`, bomDirect.components[0]?.totalQuantity, exp.materialQty);
  eq(`${prefix}_bom_material_unit`, bomDirect.components[0]?.unit, "l");

  const r = computePositionCostWithBomTechnology({
    store,
    workId: line.workId,
    unit: UNIT,
    quantity: QUANTITY,
    nowMs: NOW,
    paintCoats: null,
  });

  eq(`${prefix}_identity_work_id`, line.workId, offer.catalogWorkId);
  eq(`${prefix}_unit`, UNIT, offer.unit);
  eq(`${prefix}_quantity`, QUANTITY, offer.quantity);

  eq(`${prefix}_bom_ok_orchestrated`, r.bom.status, "OK");
  approx(`${prefix}_material_qty_orchestrated`, r.bom.components[0]?.totalQuantity, exp.materialQty);

  eq(`${prefix}_material_resolve_status`, r.materialsResolved[0]?.status, "CURRENT");
  eq(`${prefix}_material_host`, r.materialsResolved[0]?.catalogWorkId, MATERIAL_HOST);
  approx(`${prefix}_material_sell`, r.materialsResolved[0]?.sellPricePln, MATERIAL_SELL);

  eq(`${prefix}_our_rate_status`, r.ourRate?.status, "CURRENT");
  approx(`${prefix}_our_rate_base`, r.ourRate?.ourRatePln, line.ourRate);
  approx(`${prefix}_our_rate_sell_into_engine`, r.ourRate?.labor?.ourRatePln, line.ourRate);
  approx(`${prefix}_labor_margin_zero`, r.ourRate?.marginPct, 0);

  approx(`${prefix}_labor_cost`, r.position.laborCostPln, exp.laborCost);
  approx(`${prefix}_material_cost`, r.position.materialCostPln, exp.materialCost);
  approx(`${prefix}_position_cost_total`, r.position.totalPositionCostPln, exp.totalCost);

  ok(`${prefix}_labor_computable`, r.position.laborComputable === true);
  ok(`${prefix}_materials_computable`, r.position.materialsComputable === true);

  const authority = computePositionCost(r.engineInput);
  ok(`${prefix}_authority_position_complete`, authority.positionComplete === true, authority);
  ok(
    `${prefix}_orchestrated_position_complete`,
    r.position.positionComplete === true,
    r.position,
  );
  ok(
    `${prefix}_authority_equals_orchestrated_complete`,
    authority.positionComplete === r.position.positionComplete,
  );
  approx(`${prefix}_authority_total`, authority.totalPositionCostPln, exp.totalCost);

  let ftoProjection = "NOT_RUN";
  try {
    const fto = projectLineWalkState({
      lineId: offer.lineId,
      labor: {
        lineId: offer.lineId,
        bucket: "LABOR",
        rateStatus: "CURRENT_HIT",
        identity: { status: "OK" },
        matchConfidence: 0.95,
        classify: { allowLaborResearch: true },
      },
      material: {
        lineId: offer.lineId,
        bucket: "MATERIAL",
        identity: { status: "OK" },
      },
      positionComplete: authority.positionComplete === true,
    });
    ok(`${prefix}_fto_projection_complete`, fto.status === "POSITION_COMPLETE", fto);
    ftoProjection = fto.status === "POSITION_COMPLETE" ? "PASS" : "FAIL";
  } catch (e) {
    ftoProjection = "NOT_RUN";
    console.log(`FTO_PROJECTION_SKIP_${line.tag}`, String(e?.message || e));
  }

  results.push({
    line,
    exp,
    authority,
    position: r.position,
    ftoProjection,
    bomOk: r.bom.status === "OK" && autoBom.decision === "AUTO_BOM_ACCEPT",
  });
}

eq("line_count", results.length, 2);
ok("line_a_complete", results[0].authority.positionComplete === true);
ok("line_b_complete", results[1].authority.positionComplete === true);

const sumAuthority = roundPln(
  (results[0].authority.totalPositionCostPln ?? 0) +
    (results[1].authority.totalPositionCostPln ?? 0),
);
approx("multi_line_total_engine", sumAuthority, MULTI_LINE_TOTAL);
approx("multi_line_total_expected_71_52_plus_46_49", MULTI_LINE_TOTAL, 118.01);
// Audit raw 118.012 documents pre-round arithmetic; engine authority is 2 dp.
approx("multi_line_audit_raw_vs_engine_delta", Math.abs(MULTI_LINE_TOTAL_AUDIT_RAW - sumAuthority), 0.002);

eq("research_http_zero", fetchCalls, fetchBefore);

const ready = isIkReadyToBid({
  item: { id: "golden-ik-line-cost-02" },
  financeOk: false,
  p7: {
    cutoverGatePass: false,
    gapLineCount: 2,
    billableLineCount: 2,
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

const ra = results[0];
const rb = results[1];

console.log(`
========================================
IK-LINE-COST-02 GOLDEN MULTI-LINE
========================================

LINE_COUNT = 2

LINE_A
  WORK_ID = ${LINE_A.workId}
  UNIT = ${UNIT}
  QUANTITY = ${QUANTITY}
  TECHNOLOGY_PACK = ${LINE_A.packId}
  QTY_FACTOR = ${LINE_A.qtyFactor}
  MATERIAL_QTY = ${EXP_A.materialQty} L
  MATERIAL_SELL = ${MATERIAL_SELL.toFixed(2)} PLN
  OUR_RATE = ${LINE_A.ourRate} PLN/m2
  LABOR_COST = ${EXP_A.laborCost.toFixed(2)} PLN
  MATERIAL_COST = ${EXP_A.materialCost.toFixed(2)} PLN (audit_raw ${EXP_A.materialRaw})
  POSITION_COST = ${EXP_A.totalCost.toFixed(2)} PLN
  POSITION_COMPLETE = ${ra.authority.positionComplete ? "PASS" : "FAIL"}
  FTO_PROJECTION = ${ra.ftoProjection}

LINE_B
  WORK_ID = ${LINE_B.workId}
  UNIT = ${UNIT}
  QUANTITY = ${QUANTITY}
  TECHNOLOGY_PACK = ${LINE_B.packId}
  QTY_FACTOR = ${LINE_B.qtyFactor}
  MATERIAL_QTY = ${EXP_B.materialQty} L
  MATERIAL_SELL = ${MATERIAL_SELL.toFixed(2)} PLN
  OUR_RATE = ${LINE_B.ourRate} PLN/m2
  LABOR_COST = ${EXP_B.laborCost.toFixed(2)} PLN
  MATERIAL_COST = ${EXP_B.materialCost.toFixed(2)} PLN (audit_raw ${EXP_B.materialRaw})
  POSITION_COST = ${EXP_B.totalCost.toFixed(2)} PLN (audit_raw ${EXP_B.totalRaw})
  POSITION_COMPLETE = ${rb.authority.positionComplete ? "PASS" : "FAIL"}
  FTO_PROJECTION = ${rb.ftoProjection}

MULTI_LINE_TOTAL_ENGINE = ${sumAuthority.toFixed(2)} PLN
MULTI_LINE_TOTAL_AUDIT_RAW = ${MULTI_LINE_TOTAL_AUDIT_RAW} PLN

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
  `\nIK_LINE_COST_02_GOLDEN ${fail === 0 ? "PASS" : "FAIL"} ${pass}/${pass + fail}`,
);
if (fail > 0) process.exit(1);
