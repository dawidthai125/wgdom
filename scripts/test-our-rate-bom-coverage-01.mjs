/**
 * OUR-RATE-BOM-COVERAGE-01 — LABOR_ONLY thin wire + Wave 1 contracts.
 *
 * npx vite-node scripts/test-our-rate-bom-coverage-01.mjs
 */
import {
  computeShadowPositionCostForOfferBoqLine,
  evaluateBidCutoverGate,
  computeShadowPositionCostsForOfferBoq,
  isExplicitLaborOnlyWork,
  OWNER_APPROVED_LABOR_ONLY_WORK_IDS,
  OWNER_MATERIALS_REQUIRED_WORK_IDS,
  OWNER_WAVE1_UNIT_HOLD_WORK_IDS,
  resolveLaborOnlyBomForWork,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/index.ts";
import { WAVE1_MATERIALS_REQUIRED_PENDING } from "../src/lib/tender-position-cost/wave1-materials-required.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  clearPackRegistryForTests,
  clearDefinitionRegistryForTests,
  clearCapabilityRegistryForTests,
  seedB0Fixtures,
  listAllPacks,
} from "../src/lib/technology-foundation/index.ts";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

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

const T_FRESH = "2026-08-13T12:00:00.000Z";
const NOW = Date.parse("2026-08-13T20:00:00.000Z");

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function makeLaborWork(id, unit, ratePln) {
  return {
    id,
    tradeId: "ELEKTRYKA",
    namePl: id,
    unit,
    companyPricePln: 999,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
    ourWorkRate: {
      workId: id,
      unit,
      ourRatePln: ratePln,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [],
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
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

function emptyLine(extra) {
  return {
    lineId: "L1",
    lp: "1",
    description: "test",
    quantity: 2,
    quantityRaw: "2",
    unit: "szt",
    catalogWorkId: null,
    knrHint: null,
    matchMethod: "alias",
    matchedBy: "alias",
    matchConfidence: "high",
    aiConfidence: "high",
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "Brak" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "test",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...extra,
  };
}

resetTf();

// T1 — MISSING_BOM ≠ LABOR_ONLY (random work without pack)
{
  const id = "cc-unknown-no-pack";
  ok("T1 not labor-only by default", !isExplicitLaborOnlyWork(id));
  const bom = resolveTechnologyBomForWork({
    workId: id,
    unit: "szt",
    positionQuantity: 1,
    packs: listAllPacks(),
  });
  ok("T1 MISSING_BOM when no pack", bom.status === "MISSING_BOM", bom.status);
}

// T2 — Owner allowlist
{
  for (const id of OWNER_APPROVED_LABOR_ONLY_WORK_IDS) {
    ok(`T2 labor-only ${id}`, isExplicitLaborOnlyWork(id));
  }
  for (const id of OWNER_MATERIALS_REQUIRED_WORK_IDS) {
    ok(`T2 materials-required not labor-only ${id}`, !isExplicitLaborOnlyWork(id));
  }
  ok(
    "T2 wykucie HOLD not labor-only",
    !isExplicitLaborOnlyWork("cc-w2-wykucie-wnek") &&
      OWNER_WAVE1_UNIT_HOLD_WORK_IDS.has("cc-w2-wykucie-wnek"),
  );
}

// T3 — LABOR_ONLY resolve
{
  const bom = resolveLaborOnlyBomForWork({
    workId: "cc-w2-mocowanie-aparatow",
    unit: "szt",
    positionQuantity: 5,
  });
  ok("T3 status LABOR_ONLY", bom.status === "LABOR_ONLY", bom.status);
  ok("T3 no materialSpecs", bom.materialSpecs.length === 0);
}

// T4 — F5 shadow: LABOR_ONLY + OUR RATE → complete
{
  const workId = "cc-w2-mocowanie-aparatow";
  const store = makeStore([makeLaborWork(workId, "szt", 45)]);
  const line = emptyLine({
    catalogWorkId: workId,
    matchMethod: "alias",
    matchConfidence: "high",
    unit: "szt",
    quantity: 5,
    description: "Mocowanie aparatów",
  });
  const row = computeShadowPositionCostForOfferBoqLine({
    line,
    store,
    nowMs: NOW,
  });
  ok("T4 identity OK", row.identity.status === "OK", row.identity);
  ok("T4 ourRate CURRENT", row.ourRate?.status === "CURRENT", row.ourRate);
  ok("T4 bom LABOR_ONLY", row.bom?.status === "LABOR_ONLY", row.bom?.status);
  ok("T4 no BRAK_TECHNOLOGII", !row.gaps.includes("BRAK_TECHNOLOGII_BOM"), row.gaps);
  ok("T4 materials empty", row.engineInput?.materials?.length === 0, row.engineInput);
  ok("T4 positionComplete", row.positionComplete === true, {
    complete: row.positionComplete,
    gaps: row.gaps,
    total: row.position?.totalPositionCostPln,
  });
  ok(
    "T4 labor cost = qty × rate",
    row.position?.laborCostPln === 225,
    row.position?.laborCostPln,
  );
  ok("T4 materialCost 0", row.position?.materialCostPln === 0);
}

// T5 — MATERIALS_REQUIRED without pack → still GAP (even with OUR RATE)
{
  const workId = "cc-p0c-w1-zabezpieczenie-folia";
  const store = makeStore([makeLaborWork(workId, "m2", 12)]);
  const line = emptyLine({
    catalogWorkId: workId,
    matchMethod: "alias",
    matchConfidence: "high",
    unit: "m2",
    quantity: 10,
    description: "Zabezpieczenie okien folią",
  });
  const row = computeShadowPositionCostForOfferBoqLine({
    line,
    store,
    nowMs: NOW,
    packs: listAllPacks(),
  });
  ok("T5 not labor-only", !isExplicitLaborOnlyWork(workId));
  ok("T5 MISSING_BOM gap", row.gaps.includes("BRAK_TECHNOLOGII_BOM"), row.gaps);
  ok("T5 not complete", row.positionComplete === false);
  ok(
    "T5 pending norms documented",
    WAVE1_MATERIALS_REQUIRED_PENDING.some((p) => p.workId === workId),
  );
}

// T6 — MISSING OUR RATE + LABOR_ONLY → still BRAK_STAWKI (no invent PLN)
{
  const workId = "cc-w2-przebijanie-otworow";
  const store = makeStore([
    {
      ...makeLaborWork(workId, "szt", 85),
      ourWorkRate: undefined,
      companyPricePln: 85,
    },
  ]);
  const line = emptyLine({
    catalogWorkId: workId,
    matchMethod: "alias",
    matchConfidence: "high",
    unit: "szt",
    quantity: 3,
  });
  const row = computeShadowPositionCostForOfferBoqLine({
    line,
    store,
    nowMs: NOW,
  });
  ok("T6 bom LABOR_ONLY", row.bom?.status === "LABOR_ONLY");
  ok("T6 BRAK_STAWKI", row.gaps.includes("BRAK_STAWKI_ROBOT"), row.gaps);
  ok("T6 not complete", row.positionComplete === false);
  ok(
    "T6 no invent from companyPrice",
    row.position?.totalPositionCostPln == null || row.ourRate?.status === "MISSING",
  );
}

// T7 — extraLaborOnlyWorkIds override (explicit only)
{
  const workId = "cc-test-extra-lo";
  ok("T7 not on default list", !isExplicitLaborOnlyWork(workId));
  ok(
    "T7 extra allowlist",
    isExplicitLaborOnlyWork(workId, { extraLaborOnlyWorkIds: [workId] }),
  );
  const store = makeStore([makeLaborWork(workId, "szt", 10)]);
  const line = emptyLine({
    catalogWorkId: workId,
    matchMethod: "alias",
    matchConfidence: "high",
    unit: "szt",
    quantity: 1,
  });
  const row = computeShadowPositionCostForOfferBoqLine({
    line,
    store,
    nowMs: NOW,
    laborOnlyWorkIds: [workId],
  });
  ok("T7 complete via extra", row.positionComplete === true, row.gaps);
}

// T8 — gate complete > 0 with Wave 1 labor-only lines
{
  const works = [
    makeLaborWork("cc-w2-przygotowanie-osprzet", "szt", 38),
    makeLaborWork("cc-w2-przebijanie-otworow", "szt", 85),
    makeLaborWork("cc-w2-mocowanie-aparatow", "szt", 45),
  ];
  const store = makeStore(works);
  const doc = {
    lines: works.map((w, i) =>
      emptyLine({
        lineId: `L${i}`,
        lp: String(i + 1),
        catalogWorkId: w.id,
        matchMethod: "alias",
        matchConfidence: "high",
        unit: w.unit,
        quantity: 1,
        description: w.namePl,
      }),
    ),
  };
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc,
    store,
    nowMs: NOW,
  });
  const gate = evaluateBidCutoverGate(shadow);
  ok("T8 complete >= 3", gate.completeLineCount >= 3, gate);
  ok("T8 pass or complete>0", gate.completeLineCount > 0);
}

console.log(`\nOUR-RATE-BOM-COVERAGE-01: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
