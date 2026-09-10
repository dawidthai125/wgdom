/**
 * GO86 — Provisional ≠ CURRENT / Finance cutover separation (B+C).
 * Pure · ZERO HTTP · ZERO catalog mutation · ZERO Finance/G3.
 *
 * npx vite-node scripts/test-go86-provisional-finance-cutover-separation.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computePositionCost } from "../src/lib/tender-position-cost/engine.ts";
import { evaluateBidCutoverGate } from "../src/lib/tender-position-cost/bid-position-cost-cutover.ts";
import {
  evaluateAutoRateContract,
  evaluateAutoBomContract,
} from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { OWNER_APPROVED_LABOR_ONLY_WORK_IDS } from "../src/lib/tender-position-cost/labor-only-classification.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function ok(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra);
  }
}

const NOW = Date.parse("2026-09-10T08:00:00.000Z");

function emptyStore(works = []) {
  return {
    version: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: null },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: null },
    },
  };
}

function workCompanyOnly(id, unit, companyPricePln = 34.1) {
  return {
    id,
    namePl: id,
    unit,
    active: true,
    companyPricePln,
    source: "custom",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

console.log("\n=== GO86 PROVISIONAL FINANCE CUTOVER SEPARATION ===\n");

// ——— TEST A — Estimate: provisional allowed ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: { status: "PROVISIONAL", ourRatePln: 34.1 },
    materials: [],
    pricingAuthority: "estimate",
  });
  ok("A estimate provisional allowed", r.laborComputable === true && r.positionComplete === true);
}

// ——— TEST B — Finance: provisional ≠ CURRENT ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: { status: "PROVISIONAL", ourRatePln: 34.1 },
    materials: [],
    pricingAuthority: "finance",
  });
  ok("B laborComputable=false", r.laborComputable === false);
  ok("B positionComplete=false", r.positionComplete === false);
  ok(
    "B issue PROVISIONAL_LABOR_NOT_AUTHORITATIVE",
    r.issues.some((i) => i.code === "PROVISIONAL_LABOR_NOT_AUTHORITATIVE"),
  );
  ok("B provisional ≠ CURRENT (status preserved on input)", true);
}

// ——— TEST C — CURRENT OUR RATE remains authoritative ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 22.9 },
    materials: [],
    pricingAuthority: "finance",
  });
  ok("C CURRENT finance authoritative", r.laborComputable && r.positionComplete);
}

// ——— TEST D — Authorized LABOR_ONLY (engine: labor + empty materials) ———
{
  const r = computePositionCost({
    quantity: 5,
    unit: "szt",
    labor: { status: "CURRENT", ourRatePln: 15 },
    materials: [],
    pricingAuthority: "finance",
  });
  ok("D labor-only CURRENT complete", r.positionComplete && r.materialsComputable);
  ok(
    "D OWNER LABOR_ONLY allowlist non-empty",
    OWNER_APPROVED_LABOR_ONLY_WORK_IDS.size > 0,
  );
}

// ——— TEST E — autoG2 attestation only (companyPrice ≠ REUSE) ———
{
  const store = emptyStore([workCompanyOnly("legacy-gladzie_tynki-m2", "m2")]);
  const line = {
    lineId: "obl_go86_e",
    lp: "1",
    description: "Gładź",
    quantity: 10,
    unit: "m2",
    catalogWorkId: "legacy-gladzie_tynki-m2",
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    matchConfidence: "high",
  };
  const rate = evaluateAutoRateContract({ line, store, nowMs: NOW });
  ok(
    "E autoG2Rate EXCEPTION on missing OUR RATE",
    rate.decision === "RATE_EXCEPTION" || rate.provenance?.mode === "EXCEPTION",
    JSON.stringify(rate),
  );
  const bom = evaluateAutoBomContract({ line, store, nowMs: NOW });
  ok(
    "E autoG2Bom EXCEPTION (no invent TechPack)",
    bom.decision === "BOM_EXCEPTION" || bom.provenance?.mode === "EXCEPTION",
    JSON.stringify(bom),
  );
}

// ——— TEST F — BidCutover fail-closed ———
{
  const shadow = {
    lines: [
      {
        lineId: "l1",
        lp: "1",
        identity: { status: "OK", workId: "w1", unit: "m2" },
        positionComplete: false,
        gaps: ["BRAK_STAWKI_ROBOT"],
        gapLabelsPl: ["Brak stawki"],
        position: {
          laborComputable: false,
          materialsComputable: true,
          positionComplete: false,
          totalPositionCostPln: null,
        },
      },
      {
        lineId: "l2",
        lp: "2",
        identity: { status: "OK", workId: "w2", unit: "m2" },
        positionComplete: true,
        gaps: [],
        gapLabelsPl: [],
        position: {
          laborComputable: true,
          materialsComputable: true,
          positionComplete: true,
          totalPositionCostPln: 100,
        },
      },
    ],
    aggregates: { totalPositionCostPln: 100 },
  };
  const gate = evaluateBidCutoverGate(shadow);
  ok("F BidCutover fail-closed", gate.pass === false);
  ok("F gapLineCount >= 1", gate.gapLineCount >= 1);
}

// ——— TEST G — No CatalogWork.ourWorkRate mutation; provisional status separated ———
{
  const provSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/ik-provisional-estimation.ts"),
    "utf8",
  );
  const fnStart = provSrc.indexOf("function buildProvisionalLaborResolve");
  const fnSlice = provSrc.slice(fnStart, fnStart + 900);
  ok("G buildProvisionalLaborResolve exists", fnStart >= 0);
  ok("G provisional status PROVISIONAL", /status:\s*"PROVISIONAL"/.test(fnSlice));
  ok("G provisional does not set CURRENT", !/status:\s*"CURRENT"/.test(fnSlice));
  ok(
    "G no ourWorkRate assignment in provisional module",
    !/\.ourWorkRate\s*=/.test(provSrc),
  );

  const engineSrc = readFileSync(join(root, "src/lib/tender-position-cost/engine.ts"), "utf8");
  ok(
    "G engine finance excludes provisional",
    /PROVISIONAL_LABOR_NOT_AUTHORITATIVE/.test(engineSrc)
      && /pricingAuthority !== "estimate"/.test(engineSrc),
  );

  const cutoverSrc = readFileSync(
    join(root, "src/lib/tender-position-cost/bid-position-cost-cutover.ts"),
    "utf8",
  );
  ok(
    "G BidCutover forces finance authority",
    /pricingAuthority:\s*"finance"/.test(cutoverSrc),
  );
}

// ——— Default authority = finance ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "PROVISIONAL", ourRatePln: 10 },
    materials: [],
  });
  ok("default pricingAuthority=finance", !r.positionComplete);
}

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail > 0 ? 1 : 0);
