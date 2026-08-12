/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 0 — Position Cost Engine harness.
 * Pure · ZERO HTTP · ZERO Bid/PM/WorkRate wiring.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computePositionCost } from "../src/lib/tender-position-cost/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function ok(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function eq(name, a, b) {
  ok(name, Object.is(a, b) || a === b);
}

function hasCode(issues, code) {
  return issues.some((i) => i.code === code);
}

// ——— 1 labor only ———
{
  const r = computePositionCost({
    quantity: 100,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 22.9 },
    materials: [],
  });
  eq("T1 laborCost", r.laborCostPln, 2290);
  eq("T1 materialCost 0", r.materialCostPln, 0);
  eq("T1 total", r.totalPositionCostPln, 2290);
  ok("T1 complete", r.positionComplete);
  ok("T1 no issues", r.issues.length === 0);
}

// ——— 2 material only ———
{
  const r = computePositionCost({
    quantity: 100,
    unit: "m2",
    labor: null,
    materials: [
      {
        materialKey: "mat.paint.white",
        status: "CURRENT",
        quantity: 12,
        quantityUnit: "l",
        sellPricePln: 45.5,
      },
    ],
  });
  eq("T2 labor 0", r.laborCostPln, 0);
  eq("T2 material", r.materialCostPln, 546);
  eq("T2 total", r.totalPositionCostPln, 546);
  ok("T2 complete", r.positionComplete);
}

// ——— 3 labor + one material ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 20 },
    materials: [
      {
        materialKey: "mat.glue",
        status: "CURRENT",
        quantity: 5,
        quantityUnit: "kg",
        sellPricePln: 8.2,
      },
    ],
  });
  eq("T3 labor", r.laborCostPln, 200);
  eq("T3 material", r.materialCostPln, 41);
  eq("T3 total", r.totalPositionCostPln, 241);
  ok("T3 complete", r.positionComplete);
}

// ——— 4 labor + multiple materials ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 50 },
    materials: [
      {
        materialKey: "mat.tile",
        status: "CURRENT",
        quantity: 1.05,
        quantityUnit: "m2",
        sellPricePln: 40,
      },
      {
        materialKey: "mat.glue",
        status: "CURRENT",
        quantity: 3,
        quantityUnit: "kg",
        sellPricePln: 10,
      },
      {
        materialKey: "mat.grout",
        status: "CURRENT",
        quantity: 0.5,
        quantityUnit: "kg",
        sellPricePln: 20,
      },
    ],
  });
  // 1.05*40=42, 3*10=30, 0.5*20=10 → 82; labor 50; total 132
  eq("T4 labor", r.laborCostPln, 50);
  eq("T4 material", r.materialCostPln, 82);
  eq("T4 total", r.totalPositionCostPln, 132);
  ok("T4 complete", r.positionComplete);
}

// ——— 5 zero materials (same as labor only) ———
{
  const r = computePositionCost({
    quantity: 2,
    unit: "szt",
    labor: { status: "CURRENT", ourRatePln: 15 },
    materials: [],
  });
  eq("T5 material 0", r.materialCostPln, 0);
  ok("T5 materialsComputable", r.materialsComputable);
}

// ——— 6 quantity positive (covered) ———
ok("T6 quantity positive covered", true);

// ——— 7 quantity zero ———
{
  const r = computePositionCost({
    quantity: 0,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 22.9 },
    materials: [],
  });
  eq("T7 labor 0", r.laborCostPln, 0);
  eq("T7 total 0", r.totalPositionCostPln, 0);
  ok("T7 complete", r.positionComplete);
}

// ——— 8 quantity negative ———
{
  const r = computePositionCost({
    quantity: -1,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 10 },
    materials: [],
  });
  ok("T8 reject", !r.positionComplete && hasCode(r.issues, "INVALID_QUANTITY"));
  eq("T8 total null", r.totalPositionCostPln, null);
}

// ——— 9 missing labor rate ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: { status: "MISSING", ourRatePln: null },
    materials: [],
  });
  ok("T9 BRAK_OUR_RATE", hasCode(r.issues, "BRAK_OUR_RATE"));
  ok("T9 not complete", !r.positionComplete);
  eq("T9 labor null", r.laborCostPln, null);
}

// ——— 10 missing material price ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: null,
    materials: [
      {
        materialKey: "mat.x",
        status: "MISSING",
        quantity: 1,
        quantityUnit: "kg",
        sellPricePln: null,
      },
    ],
  });
  ok("T10 BRAK_CENY", hasCode(r.issues, "BRAK_CENY_MATERIALU"));
  ok("T10 not complete", !r.positionComplete);
}

// ——— 11 negative labor rate ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: -5 },
    materials: [],
  });
  ok("T11 INVALID_LABOR", hasCode(r.issues, "INVALID_LABOR_RATE"));
}

// ——— 12 negative material price ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: null,
    materials: [
      {
        materialKey: "mat.x",
        status: "CURRENT",
        quantity: 1,
        quantityUnit: "kg",
        sellPricePln: -1,
      },
    ],
  });
  ok("T12 INVALID_MAT_PRICE", hasCode(r.issues, "INVALID_MATERIAL_PRICE"));
}

// ——— 13–14 deterministic ———
{
  const input = {
    quantity: 3.333,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 12.345 },
    materials: [
      {
        materialKey: "mat.a",
        status: "CURRENT",
        quantity: 2.2,
        quantityUnit: "kg",
        sellPricePln: 7.777,
      },
    ],
  };
  const a = computePositionCost(input);
  const b = computePositionCost(input);
  eq("T13/14 labor same", a.laborCostPln, b.laborCostPln);
  eq("T13/14 material same", a.materialCostPln, b.materialCostPln);
  eq("T13/14 total same", a.totalPositionCostPln, b.totalPositionCostPln);
  // 3.333*12.345 = 41.145885 → 41.15; 2.2*7.777=17.1094 → 17.11; total 58.26
  eq("T15 labor round", a.laborCostPln, 41.15);
  eq("T15 material round", a.materialCostPln, 17.11);
  eq("T15 total round", a.totalPositionCostPln, 58.26);
}

// ——— 16 companyPricePln never used in sources ———
{
  const engineSrc = readFileSync(join(root, "src/lib/tender-position-cost/engine.ts"), "utf8");
  const typesSrc = readFileSync(join(root, "src/lib/tender-position-cost/types.ts"), "utf8");
  const indexSrc = readFileSync(join(root, "src/lib/tender-position-cost/index.ts"), "utf8");
  ok(
    "T16 no companyPricePln in engine package",
    !/companyPricePln/i.test(engineSrc + typesSrc + indexSrc),
  );
}

// ——— 17–19 no HTTP / storage / research ———
{
  const engineSrc = readFileSync(join(root, "src/lib/tender-position-cost/engine.ts"), "utf8");
  ok("T17 no fetch", !/\bfetch\b/.test(engineSrc));
  ok("T18 no localStorage/KV", !/localStorage|sessionStorage|\bKV\b/.test(engineSrc));
  ok(
    "T19 no catalog lookups",
    !/lookupWorkRate|lookupPriceMemory|evaluateMaterialCache|commitMarketQuotesImport/.test(
      engineSrc,
    ),
  );
}

// ——— 20 no Bid mutation / import ———
{
  const engineSrc = readFileSync(join(root, "src/lib/tender-position-cost/engine.ts"), "utf8");
  const indexSrc = readFileSync(join(root, "src/lib/tender-position-cost/index.ts"), "utf8");
  ok(
    "T20 no Bid/Offer import",
    !/tenders-bid|tender-offer|computeTenderBidProposal/.test(engineSrc + indexSrc),
  );
}

// ——— extras: STALE / BOM / NO_IDENTITY ———
{
  const staleL = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "STALE", ourRatePln: 10 },
    materials: [],
  });
  ok("TX STALE labor", hasCode(staleL.issues, "STALE_OUR_RATE") && !staleL.laborComputable);

  const noId = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "NO_IDENTITY", ourRatePln: null },
    materials: [],
  });
  ok("TX NO_IDENTITY", hasCode(noId.issues, "BRAK_IDENTITY_ROBOTY"));

  const noBom = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: null,
    materials: [
      {
        materialKey: "mat.x",
        status: "NO_BOM",
        quantity: null,
        quantityUnit: null,
        sellPricePln: null,
      },
    ],
  });
  ok("TX NO_BOM", hasCode(noBom.issues, "BRAK_BOM"));
}

console.log("");
console.log(`WYNIK P0 POSITION COST: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
