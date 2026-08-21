/**
 * IK-KNR KL-APP-2-ID — Pricing Identity harness.
 *
 * npx vite-node scripts/test-knr-pricing-identity-kl-app2-id.mjs
 *
 * ZERO PLN · ZERO Host · ZERO BOQ write · ZERO P5/P6/F5 calls
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_KNOWLEDGE_KL_APP2_ID_IMPLEMENTED,
  OWNER_KNR_MATERIAL_MAPPINGS,
  resolveKnrPricingIdentity,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { OWNER_KNR_MAPPINGS } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-21T17:00:00.000Z";

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

const works = [{ id: "work-m2-install", unit: "m2", active: true }];

const positionHit = [
  {
    mappingId: "d-pos-1",
    normalizedKey: "KNR|2-02|0803-01",
    workId: "work-m2-install",
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
  },
];

const materialHit = [
  {
    mappingId: "m-1",
    mappingVersion: 1,
    knrNormCode: "M-01",
    resourceUnit: "kg",
    materialKey: "mat.wire.kg",
    pricingUnit: "kg",
    ownerApproval: true,
    active: true,
    provenance: { approvedBy: "dawid", approvedAt: NOW, notesPl: "test" },
  },
];

function laborR() {
  return [
    {
      kind: "R",
      code: "R-FAKE-SHOULD-NOT-MAP",
      description: "Robocizna",
      resourceUnit: "r-g",
      normQuantity: 0.25,
      requiredQuantity: 25,
    },
  ];
}

function materialLine(code = "M-01", unit = "kg") {
  return [
    {
      kind: "M",
      code,
      description: "Material",
      resourceUnit: unit,
      normQuantity: 1.05,
      requiredQuantity: 105,
    },
  ];
}

function equipmentLine() {
  return [
    {
      kind: "S",
      code: "S-01",
      description: "Sprzet",
      resourceUnit: "m-h",
      normQuantity: 0.1,
      requiredQuantity: 10,
    },
  ];
}

function baseInput(overrides = {}) {
  return {
    lineId: "L1",
    knrIdentityKeyV2: "KNR|2-02|TEST||||0803|01||",
    catalogBasisNormalizedKey: "KNR|2-02|0803-01",
    boqUnit: "m2",
    labor: laborR(),
    materials: materialLine(),
    equipment: equipmentLine(),
    positionTable: positionHit,
    materialTable: materialHit,
    works,
    nowIso: NOW,
    ...overrides,
  };
}

assert("T-APP2-ID-M implemented", KNR_KNOWLEDGE_KL_APP2_ID_IMPLEMENTED === true);
assert("T-APP2-ID-15 empty material table legal", OWNER_KNR_MATERIAL_MAPPINGS.length === 0);
assert(
  "T-APP2-ID-15 prod position pilot 1",
  OWNER_KNR_MAPPINGS.length === 1 &&
    OWNER_KNR_MAPPINGS[0]?.normalizedKey === "KNR-W|4-01|1202-07" &&
    OWNER_KNR_MAPPINGS[0]?.workId === "cc-w2-wykwity-zacieki" &&
    OWNER_KNR_MAPPINGS[0]?.catalogUnit === "m2",
);

// 1 Position HIT
{
  const r = resolveKnrPricingIdentity(baseInput());
  assert("T-APP2-ID-1 MAPPED", r.positionLabor.status === "MAPPED");
  assert("T-APP2-ID-1 catalogWorkId", r.positionLabor.catalogWorkId === "work-m2-install");
  assert("T-APP2-ID-1 canFeedP5", r.summary.canFeedP5 === true);
  assert("T-APP2-ID-1 canFeedF5Equipment false", r.summary.canFeedF5Equipment === false);
}

// 2–3 R evidence only
{
  const r = resolveKnrPricingIdentity(baseInput());
  assert("T-APP2-ID-2 evidenceOnly", r.positionLabor.laborNormsEvidenceOnly === true);
  assert(
    "T-APP2-ID-3 R.code not workId",
    r.positionLabor.catalogWorkId !== "R-FAKE-SHOULD-NOT-MAP",
  );
}

// 4 M exact
{
  const r = resolveKnrPricingIdentity(baseInput());
  assert("T-APP2-ID-4 M MAPPED", r.materials[0]?.status === "MAPPED");
  assert("T-APP2-ID-4 materialKey", r.materials[0]?.materialKey === "mat.wire.kg");
  assert("T-APP2-ID-4 qty preserved", r.materials[0]?.requiredQuantity === 105);
  assert("T-APP2-ID-4 canFeedP6Partial", r.summary.canFeedP6Partial === true);
}

// 5 M missing
{
  const r = resolveKnrPricingIdentity(
    baseInput({ materialTable: [], materials: materialLine("M-MISSING") }),
  );
  assert("T-APP2-ID-5 UNMAPPED", r.materials[0]?.status === "UNMAPPED");
}

// 6 M duplicate
{
  const dup = [
    ...materialHit,
    {
      ...materialHit[0],
      mappingId: "m-2",
      materialKey: "mat.other.kg",
    },
  ];
  const r = resolveKnrPricingIdentity(baseInput({ materialTable: dup }));
  assert("T-APP2-ID-6 AMBIGUOUS", r.materials[0]?.status === "AMBIGUOUS");
}

// 7 M unit mismatch
{
  const badUnit = [
    {
      ...materialHit[0],
      resourceUnit: "kg",
      pricingUnit: "kg",
    },
  ];
  const r = resolveKnrPricingIdentity(
    baseInput({ materialTable: badUnit, materials: materialLine("M-01", "t") }),
  );
  assert("T-APP2-ID-7 INVALID", r.materials[0]?.status === "INVALID");
}

// 8 M inactive → STALE
{
  const inactive = [{ ...materialHit[0], active: false }];
  const r = resolveKnrPricingIdentity(baseInput({ materialTable: inactive }));
  assert("T-APP2-ID-8 STALE", r.materials[0]?.status === "STALE");
}

// 9 S UNSUPPORTED
{
  const r = resolveKnrPricingIdentity(baseInput());
  assert("T-APP2-ID-9 UNSUPPORTED", r.equipment[0]?.status === "UNSUPPORTED");
}

// 10–11 static no PLN / no pricing calls
{
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-pricing-identity.ts"),
    "utf8",
  );
  const types = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-pricing-identity-types.ts"),
    "utf8",
  );
  const joined = src + types;
  assert("T-APP2-ID-10 no Pln", !/\w*Pln\b/.test(joined) && !joined.includes("pricePln"));
  assert("T-APP2-ID-10 no ourRate", !joined.includes("ourRate"));
  assert("T-APP2-ID-10 no sell/margin/bid", !joined.includes("sell") && !joined.includes("margin") && !joined.includes("bid"));
  assert("T-APP2-ID-11 no lookupWorkRate", !src.includes("lookupWorkRate"));
  assert("T-APP2-ID-11 no computePositionCost", !src.includes("computePositionCost"));
  assert("T-APP2-ID-11 no Price Memory", !src.includes("price-memory") && !src.includes("evaluateMaterialCache"));
  assert("T-APP2-ID-13 no research import", !src.includes("knr-research") && !src.includes("runSelective"));
}

// 12 no BOQ mutation
{
  const boq = { lineId: "L1", quantity: 100, unit: "m2", catalogWorkId: null };
  const snap = JSON.stringify(boq);
  resolveKnrPricingIdentity(baseInput({ lineId: boq.lineId, boqUnit: boq.unit }));
  assert("T-APP2-ID-12 BOQ untouched", JSON.stringify(boq) === snap);
}

// 14 deterministic
{
  const a = resolveKnrPricingIdentity(baseInput());
  const b = resolveKnrPricingIdentity(baseInput());
  assert("T-APP2-ID-14 deterministic", JSON.stringify(a) === JSON.stringify(b));
}

// 16 ambiguous position
{
  const amb = [
    ...positionHit,
    {
      mappingId: "d-pos-2",
      normalizedKey: "KNR|2-02|0803-01",
      workId: "work-other",
      catalogUnit: "m2",
      ownerApproval: true,
      active: true,
    },
  ];
  const r = resolveKnrPricingIdentity(
    baseInput({
      positionTable: amb,
      works: [...works, { id: "work-other", unit: "m2", active: true }],
    }),
  );
  assert("T-APP2-ID-16 AMBIGUOUS position", r.positionLabor.status === "AMBIGUOUS");
  assert("T-APP2-ID-16 canFeedP5 false", r.summary.canFeedP5 === false);
}

// 17 invalid owner row (unit fail)
{
  const r = resolveKnrPricingIdentity(baseInput({ boqUnit: "szt" }));
  assert("T-APP2-ID-17 INVALID unit", r.positionLabor.status === "INVALID");
  assert("T-APP2-ID-17 canFeedP5 false", r.summary.canFeedP5 === false);
}

// provenance
{
  const r = resolveKnrPricingIdentity(baseInput());
  assert("T-APP2-ID provenance source", r.provenance.source === "KL_APP_2_ID");
  assert("T-APP2-ID tableVersions", r.provenance.tableVersions.positionTableVersion === 1);
}

// empty tables default
{
  const r = resolveKnrPricingIdentity({
    lineId: "L2",
    knrIdentityKeyV2: "x",
    catalogBasisNormalizedKey: "NOPE",
    boqUnit: "m2",
    materials: materialLine(),
    equipment: equipmentLine(),
    nowIso: NOW,
  });
  assert("T-APP2-ID default empty UNMAPPED pos", r.positionLabor.status === "UNMAPPED");
  assert("T-APP2-ID default empty UNMAPPED mat", r.materials[0]?.status === "UNMAPPED");
}

console.log(`\nKL-APP-2-ID result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
