/**
 * EQUIPMENT-01 — contract-only harness (D-EQ-01…12).
 *
 * npx vite-node scripts/test-wm-tender-equipment-01.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEquipmentComponentResult,
  createUnresolvedEquipmentPriceProvider,
  computePositionCost,
  computeShadowPositionCostsForOfferBoq,
  evaluateBidCutoverGate,
  resolveWorkIdentityFromOfferBoqLine,
} from "../src/lib/tender-position-cost/index.ts";
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

const NOW = Date.parse("2026-08-12T12:00:00.000Z");
const T_FRESH = "2026-08-11T12:00:00.000Z";
const PAINT_WORK = "legacy-malowanie-m2";

function quoteCell(price, updatedAt = T_FRESH, origin = "wgdom") {
  return {
    [origin]: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt,
        source: "test",
      },
    },
  };
}

function makeStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        works: [
          {
            id: PAINT_WORK,
            tradeId: "MALOWANIE",
            namePl: "Malowanie",
            unit: "m2",
            companyPricePln: 35,
            marketQuotes: {},
            marketQuoteHistory: [],
            commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
            updatedAt: T_FRESH,
            freshnessStatus: "ok",
            keywords: [],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "custom",
          },
        ],
        updatedAt: T_FRESH,
      },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function lineBase(over = {}) {
  return {
    lineId: "EQ1",
    lp: "1",
    description: "Rusztowanie",
    quantity: 10,
    unit: "m2",
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: { lineKind: "Equipment" },
    lineTotalPln: null,
    unitPricePln: null,
    ...over,
  };
}

function makeDoc(lines) {
  return {
    schemaVersion: 1,
    tenderId: "t-eq-01",
    lines,
    updatedAt: T_FRESH,
  };
}

// ——— T1 Equipment recognized ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(lineBase());
  eq("T1 status", id.status, "EQUIPMENT_GAP");
  ok("T1 gap code", id.gaps.includes("EQUIPMENT_OUT_OF_SCOPE"));
}

// ——— T2 Equipment ≠ Transport ———
{
  const eqId = resolveWorkIdentityFromOfferBoqLine(lineBase());
  const trId = resolveWorkIdentityFromOfferBoqLine(
    lineBase({
      lineId: "TR1",
      costIntelligence: null,
      noiseKind: "transport",
    }),
  );
  eq("T2 eq", eqId.status, "EQUIPMENT_GAP");
  eq("T2 transport", trId.status, "AUXILIARY_GAP");
  ok("T2 distinct", eqId.status !== trId.status);
}

// ——— T3 Equipment ≠ Auxiliary (AUXILIARY_GAP reserved for transport path) ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(lineBase());
  ok("T3 not AUXILIARY_GAP", id.status !== "AUXILIARY_GAP");
  ok("T3 not AUXILIARY_OUT_OF_SCOPE", !id.gaps.includes("AUXILIARY_OUT_OF_SCOPE"));
}

// ——— T4 equipmentKey null is valid ———
{
  const c = buildEquipmentComponentResult({
    lineId: "EQ1",
    namePl: "Rusztowanie",
    quantity: 10,
    unit: "m2",
    offerBoqLineKind: "Equipment",
    equipmentKey: null,
  });
  eq("T4 equipmentKey", c.equipmentKey, null);
  eq("T4 identity", c.identityKind, "equipment_line");
}

// ——— T5 invalid qty/unit → GAP/INVALID ———
{
  const badQty = buildEquipmentComponentResult({
    lineId: "EQ-bad-q",
    namePl: "X",
    quantity: 0,
    unit: "m2",
    offerBoqLineKind: "Equipment",
  });
  const badUnit = buildEquipmentComponentResult({
    lineId: "EQ-bad-u",
    namePl: "X",
    quantity: 1,
    unit: "   ",
    offerBoqLineKind: "Equipment",
  });
  eq("T5 qty INVALID", badQty.rateStatus, "INVALID");
  eq("T5 unit INVALID", badUnit.rateStatus, "INVALID");
  eq("T5 qty null rate", badQty.unitRatePln, null);
  eq("T5 qty null total", badQty.totalPln, null);
}

// ——— T6–T9 UNRESOLVED ———
{
  const c = buildEquipmentComponentResult({
    lineId: "EQ1",
    namePl: "Rusztowanie",
    quantity: 10,
    unit: "m2",
    offerBoqLineKind: "Equipment",
  });
  eq("T6 rateStatus", c.rateStatus, "UNRESOLVED");
  eq("T7 unitRatePln", c.unitRatePln, null);
  eq("T8 totalPln", c.totalPln, null);
  ok("T9 never 0 PLN rate", c.unitRatePln !== 0);
  ok("T9 never 0 PLN total", c.totalPln !== 0);
}

// ——— T10–T14 no forbidden fallbacks (source scan + provider pure) ———
{
  const src = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/equipment-contract.ts"),
    "utf8",
  );
  ok("T10 no ath_priced", !src.includes("ath_priced"));
  ok("T11 no catalog fallback", !src.includes("lookupCatalog") && !src.includes("fromCatalog") && !src.includes("catalogWorkId"));
  ok("T12 no companyPrice", !src.includes("companyPricePln") && !src.includes("companyPrice"));
  ok("T13 no heuristic", !src.includes("heuristic") && !src.includes("45/85") && !src.includes("legacyLineTotal"));
  ok("T14 no PI31/Expert", !src.includes("PI31") && !src.includes("equipmentRateByKey") && !src.includes("Cost Expert"));

  const provider = createUnresolvedEquipmentPriceProvider();
  const looked = provider.lookup({
    lineId: "EQ1",
    namePl: "X",
    quantity: 1,
    unit: "szt",
    equipmentKey: "eq.scaffold",
  });
  eq("T14b provider UNRESOLVED", looked.rateStatus, "UNRESOLVED");
  eq("T14b provider rate null", looked.unitRatePln, null);
}

// ——— T15 C-MODE null behavior unchanged (OfferBoq null → no invented equipment price) ———
{
  const c = buildEquipmentComponentResult({
    lineId: "EQ-null",
    namePl: "Equipment bez ceny",
    quantity: 1,
    unit: "szt",
    offerBoqLineKind: "Equipment",
  });
  ok("T15 null rates", c.unitRatePln == null && c.totalPln == null);
  eq("T15 UNRESOLVED", c.rateStatus, "UNRESOLVED");
}

// ——— T16 F5 gate still FAILS for Equipment ———
{
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: makeDoc([lineBase()]),
    store: makeStore(),
    nowMs: NOW,
  });
  const gate = evaluateBidCutoverGate(shadow);
  ok("T16 gate FAIL", !gate.pass);
  ok("T16 equipmentGapCount", gate.equipmentGapCount >= 1);
  eq("T16 auxiliaryGapCount", gate.auxiliaryGapCount, 0);
  ok("T16 gapCodes", gate.gapCodes.includes("EQUIPMENT_OUT_OF_SCOPE"));
}

// ——— T17 OfferBoqLineKind.Equipment remains compatible ———
{
  const c = buildEquipmentComponentResult({
    lineId: "EQ1",
    namePl: "Rusztowanie",
    quantity: 2,
    unit: "szt",
    offerBoqLineKind: "Equipment",
  });
  eq("T17 offerBoqLineKind", c.offerBoqLineKind, "Equipment");
  const id = resolveWorkIdentityFromOfferBoqLine(lineBase({ costIntelligence: { lineKind: "Equipment" } }));
  eq("T17 shadow EQUIPMENT_GAP", id.status, "EQUIPMENT_GAP");
}

// ——— T18 Labor/Materials existing fixtures unchanged (F0 pure) ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 10 },
    materials: [],
  });
  eq("T18 F0 labor", r.totalPositionCostPln, 10);
  eq("T18 F0 materials", r.materialCostPln, 0);
}

eq("TFETCH", fetchCalls, 0);

console.log(`\nWYNIK EQUIPMENT-01: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
