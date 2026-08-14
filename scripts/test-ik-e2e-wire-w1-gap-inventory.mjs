/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W1 — gap inventory (ZERO side effects).
 *
 * npx vite-node scripts/test-ik-e2e-wire-w1-gap-inventory.mjs
 */
import { inventoryIkGapsFromShadow } from "../src/lib/ik-pricing-orchestrator/index.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const TENDER = "t-wm-d01";

function emptyAgg() {
  return {
    completeLineCount: 0,
    gapLineCount: 0,
    skippedNoiseCount: 0,
    laborCostPln: null,
    materialCostPln: null,
    equipmentCostPln: 0,
    transportCostPln: 0,
    totalPositionCostPln: null,
  };
}

function baseLine(overrides = {}) {
  return {
    lineId: "L1",
    lp: "60",
    description: "Zamurowanie bruzd",
    quantity: 10,
    unitRaw: "mb",
    identity: {
      status: "OK",
      statusLabelPl: "OK",
      workId: "cc-p0c-w1-zamurowanie-bruzd-0326-01",
      unit: "mb",
      unitRaw: "mb",
      matchMethod: "catalog_map",
      matchConfidence: "high",
      gaps: [],
    },
    gaps: [],
    gapLabelsPl: [],
    bom: null,
    ourRate: {
      status: "MISSING",
      statusLabelPl: "BRAK STAWKI",
      workId: "cc-p0c-w1-zamurowanie-bruzd-0326-01",
      unit: "mb",
      identityKey: "x",
      ourRatePln: null,
      sourceType: null,
      regionScope: null,
      observedAt: null,
      updatedAt: null,
      labor: { status: "MISSING", ourRatePln: null },
      lookup: null,
    },
    materialsResolved: [],
    position: null,
    engineInput: null,
    legacyLineTotalPln: null,
    positionComplete: false,
    equipment: null,
    transport: null,
    ...overrides,
  };
}

function shadow(lines) {
  return {
    schemaVersion: 1,
    mode: "shadow",
    lineCount: lines.length,
    lines,
    aggregates: emptyAgg(),
  };
}

let sideEffects = 0;
const origFetch = globalThis.fetch;
globalThis.fetch = async () => {
  sideEffects += 1;
  throw new Error("UNEXPECTED_HTTP");
};

// 1. labor MISSING → job
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        gaps: ["BRAK_STAWKI_ROBOT"],
      }),
    ]),
  });
  ok("T1 labor job count 1", inv.laborJobs.length === 1);
  ok("T1 workId", inv.laborJobs[0]?.workId === "cc-p0c-w1-zamurowanie-bruzd-0326-01");
  ok("T1 unit mb", inv.laborJobs[0]?.unit === "mb");
  ok("T1 domain labor", inv.laborJobs[0]?.domain === "labor");
}

// 2. labor NO_IDENTITY → no job
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        identity: {
          status: "NO_IDENTITY",
          statusLabelPl: "BRAK",
          workId: null,
          unit: "mb",
          unitRaw: "mb",
          matchMethod: null,
          matchConfidence: null,
          gaps: ["BRAK_IDENTYFIKACJI_ROBOTY"],
        },
        gaps: ["BRAK_IDENTYFIKACJI_ROBOTY", "BRAK_STAWKI_ROBOT"],
      }),
    ]),
  });
  ok("T2 no labor job", inv.laborJobs.length === 0);
}

// 3. AMBIGUOUS → no job
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        identity: {
          status: "AMBIGUOUS",
          statusLabelPl: "NIEJEDNOZNACZNA",
          workId: null,
          unit: "mb",
          unitRaw: "mb",
          matchMethod: "category_heuristic",
          matchConfidence: "low",
          gaps: ["NIEJEDNOZNACZNA_ROBOTA"],
        },
        gaps: ["NIEJEDNOZNACZNA_ROBOTA", "BRAK_STAWKI_ROBOT"],
      }),
    ]),
  });
  ok("T3 AMBIGUOUS no labor", inv.laborJobs.length === 0);
}

// 4. INVALID_UNIT → no job
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        identity: {
          status: "INVALID_UNIT",
          statusLabelPl: "UNIT",
          workId: "cc-x",
          unit: null,
          unitRaw: "xyz",
          matchMethod: "catalog_map",
          matchConfidence: "high",
          gaps: ["NIEPRAWIDLOWA_JEDNOSTKA"],
        },
        gaps: ["NIEPRAWIDLOWA_JEDNOSTKA", "BRAK_STAWKI_ROBOT"],
      }),
    ]),
  });
  ok("T4 INVALID_UNIT no labor", inv.laborJobs.length === 0);
}

// 5. STALE → no auto job
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        gaps: ["PRZETERMINOWANA_STAWKA_ROBOT"],
        ourRate: {
          status: "STALE",
          statusLabelPl: "STALE",
          workId: "cc-p0c-w1-zamurowanie-bruzd-0326-01",
          unit: "mb",
          identityKey: "x",
          ourRatePln: 21,
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          labor: { status: "STALE", ourRatePln: 21 },
          lookup: null,
        },
      }),
    ]),
  });
  ok("T5 STALE no labor job", inv.laborJobs.length === 0);
  ok("T5 skipped includes STALE code", inv.skippedGapCodes.includes("PRZETERMINOWANA_STAWKA_ROBOT"));
}

// 6. material MISSING → material DTO
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        gaps: ["BRAK_CENY_MATERIALU"],
        ourRate: {
          status: "CURRENT",
          statusLabelPl: "AKTUALNA",
          workId: "cc-p0c-w1-zamurowanie-bruzd-0326-01",
          unit: "mb",
          identityKey: "x",
          ourRatePln: 21,
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
          labor: { status: "CURRENT", ourRatePln: 21 },
          lookup: null,
        },
        materialsResolved: [
          {
            status: "MISSING",
            statusLabelPl: "BRAK",
            materialKey: "mat.cegla_budowlana_pelna",
            catalogWorkId: "cw.mat.cegla",
            basePricePln: null,
            marginPct: 0.2,
            sellPricePln: null,
            quantity: 40,
            quantityUnit: "szt",
            priceObservedAt: null,
            cache: null,
            hit: null,
            material: {
              materialKey: "mat.cegla_budowlana_pelna",
              status: "MISSING",
              quantity: 40,
              quantityUnit: "szt",
              sellPricePln: null,
            },
          },
        ],
      }),
    ]),
  });
  ok("T6 material job 1", inv.materialJobs.length === 1);
  ok("T6 materialKey", inv.materialJobs[0]?.materialKey === "mat.cegla_budowlana_pelna");
  ok("T6 catalogWorkId", inv.materialJobs[0]?.catalogWorkId === "cw.mat.cegla");
  ok("T6 labor jobs 0", inv.laborJobs.length === 0);
}

// 7. unknown materialKey → no material job
{
  const inv = inventoryIkGapsFromShadow({
    tenderId: TENDER,
    shadow: shadow([
      baseLine({
        gaps: ["BRAK_CENY_MATERIALU"],
        materialsResolved: [
          {
            status: "MISSING",
            statusLabelPl: "BRAK",
            materialKey: null,
            catalogWorkId: null,
            basePricePln: null,
            marginPct: null,
            sellPricePln: null,
            quantity: 1,
            quantityUnit: "szt",
            priceObservedAt: null,
            cache: null,
            hit: null,
            material: {
              materialKey: null,
              status: "NO_KEY",
              quantity: 1,
              quantityUnit: "szt",
              sellPricePln: null,
            },
          },
        ],
      }),
    ]),
  });
  ok("T7 no material job without keys", inv.materialJobs.length === 0);
}

// 8. ZERO side effects (no fetch)
{
  ok("T8 zero HTTP side effects", sideEffects === 0);
}

globalThis.fetch = origFetch;

console.log(`\nW1 gap inventory: ${passed} PASS · ${failed} FAIL`);
if (failed > 0) process.exit(1);
