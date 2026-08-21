/**
 * Owner KNR Identity Seed v1 harness.
 *
 * Production tables stay EMPTY (no invent). Policy cases use inject fixtures only.
 *
 * npx vite-node scripts/test-knr-owner-identity-seed-v1.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_OWNER_IDENTITY_SEED_V1_IMPLEMENTED,
  KNR_OWNER_IDENTITY_SEED_V1_STATUS,
  OWNER_KNR_MAPPINGS,
  OWNER_KNR_MATERIAL_MAPPINGS,
  getOwnerKnrIdentitySeedV1Snapshot,
  resolveKnrPricingIdentity,
  validateOwnerKnrMaterialSeedTable,
  validateOwnerKnrPositionSeedTable,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { applyOwnerKnrMapping } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-21T19:00:00.000Z";
const KEY = "KNR|4-01|1202-07";
const WORK = "work-seed-pilot";

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

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

assert("T-SEED-M implemented", KNR_OWNER_IDENTITY_SEED_V1_IMPLEMENTED === true);
assert("T-SEED-M status EMPTY", KNR_OWNER_IDENTITY_SEED_V1_STATUS === "EMPTY");

const snap = getOwnerKnrIdentitySeedV1Snapshot();
assert("T-SEED-empty position", snap.positionCount === 0 && OWNER_KNR_MAPPINGS.length === 0);
assert("T-SEED-empty material", snap.materialCount === 0 && OWNER_KNR_MATERIAL_MAPPINGS.length === 0);
assert("T-SEED-missing documented", snap.missing.length >= 2);

const posValidateEmpty = validateOwnerKnrPositionSeedTable(OWNER_KNR_MAPPINGS);
assert("T-SEED-validate empty position ok", posValidateEmpty.ok);
const matValidateEmpty = validateOwnerKnrMaterialSeedTable(OWNER_KNR_MATERIAL_MAPPINGS);
assert("T-SEED-validate empty material ok", matValidateEmpty.ok);

function posRow(over = {}) {
  return {
    mappingId: "pos-1",
    normalizedKey: KEY,
    workId: WORK,
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
    ...over,
  };
}

function matRow(over = {}) {
  return {
    mappingId: "mat-1",
    mappingVersion: 1,
    knrNormCode: "M-01",
    resourceUnit: "kg",
    materialKey: "mat.inv.wire",
    pricingUnit: "kg",
    ownerApproval: true,
    active: true,
    provenance: {
      approvedBy: "owner",
      approvedAt: NOW,
      notesPl: "harness inject only — not production seed",
    },
    ...over,
  };
}

const works = [{ id: WORK, unit: "m2", active: true }];

function resolvePos(table, over = {}) {
  return resolveKnrPricingIdentity({
    lineId: "L1",
    knrIdentityKeyV2: "KNR|4-01|||||1202|07||",
    catalogBasisNormalizedKey: KEY,
    boqUnit: "m2",
    labor: [
      { kind: "R", code: "R-01", description: "R", resourceUnit: "r-g", requiredQuantity: 1, sourceNormUnit: "r-g", sourceNormQuantity: 0.1 },
    ],
    materials: [],
    equipment: [],
    positionTable: table,
    materialTable: [],
    works,
    nowIso: NOW,
    ...over,
  });
}

function resolveMat(table, resourceUnit = "kg") {
  return resolveKnrPricingIdentity({
    lineId: "L1",
    knrIdentityKeyV2: "KNR|4-01|||||1202|07||",
    catalogBasisNormalizedKey: KEY,
    boqUnit: "m2",
    labor: [],
    materials: [
      {
        kind: "M",
        code: "M-01",
        description: "M",
        resourceUnit,
        requiredQuantity: 10,
        sourceNormUnit: resourceUnit,
        sourceNormQuantity: 0.1,
      },
    ],
    equipment: [],
    positionTable: [posRow()],
    materialTable: table,
    works,
    nowIso: NOW,
  });
}

// POSITION
{
  const r = resolvePos([posRow()]);
  assert("T-SEED-P1 valid exact-one", r.positionLabor.status === "MAPPED" && r.positionLabor.catalogWorkId === WORK);
  assert("T-SEED-P1 evidenceOnly", r.positionLabor.laborNormsEvidenceOnly === true);
}

{
  const r = resolvePos([]);
  assert("T-SEED-P2 missing", r.positionLabor.status === "UNMAPPED");
}

{
  const table = [posRow({ mappingId: "a" }), posRow({ mappingId: "b" })];
  const r = resolvePos(table);
  assert("T-SEED-P3 duplicate/ambiguous", r.positionLabor.status === "AMBIGUOUS");
  const v = validateOwnerKnrPositionSeedTable(table, works);
  assert("T-SEED-P3 validate DUPLICATE", v.issues.some((i) => i.kind === "DUPLICATE_LEGAL"));
}

{
  const r = resolvePos([posRow({ active: false })]);
  assert("T-SEED-P4 stale inactive", r.positionLabor.status === "STALE");
}

{
  const r = resolvePos([posRow({ ownerApproval: false })]);
  assert("T-SEED-P4b stale unapproved", r.positionLabor.status === "STALE");
}

{
  const r = resolvePos([posRow({ workId: "missing-work" })]);
  assert("T-SEED-P5 invalid workId", r.positionLabor.status === "INVALID");
}

{
  const r = resolvePos([posRow({ catalogUnit: "mb" })]);
  assert("T-SEED-P6 unit mismatch", r.positionLabor.status === "INVALID");
}

// MATERIAL
{
  const r = resolveMat([matRow()]);
  assert("T-SEED-M1 valid", r.materials[0]?.status === "MAPPED" && r.materials[0]?.materialKey === "mat.inv.wire");
}

{
  const r = resolveMat([]);
  assert("T-SEED-M2 missing", r.materials[0]?.status === "UNMAPPED");
}

{
  const table = [matRow({ mappingId: "a" }), matRow({ mappingId: "b" })];
  const r = resolveMat(table);
  assert("T-SEED-M3 ambiguous", r.materials[0]?.status === "AMBIGUOUS");
  const v = validateOwnerKnrMaterialSeedTable(table);
  assert("T-SEED-M3 validate DUPLICATE", v.issues.some((i) => i.kind === "DUPLICATE_LEGAL"));
}

{
  const r = resolveMat([matRow({ active: false })]);
  assert("T-SEED-M4 stale", r.materials[0]?.status === "STALE");
}

{
  const v = validateOwnerKnrMaterialSeedTable([matRow({ materialKey: "" })]);
  assert("T-SEED-M5 invalid materialKey", !v.ok && v.issues.some((i) => i.kind === "INVALID_ROW"));
}

{
  const r = resolveMat([matRow({ resourceUnit: "t", pricingUnit: "t" })], "kg");
  assert("T-SEED-M6 unit mismatch", r.materials[0]?.status === "INVALID");
}

// POLICY R / S
{
  const r = resolvePos([posRow()]);
  assert("T-SEED-R not workId from R", r.positionLabor.catalogWorkId === WORK);
  assert("T-SEED-R evidence only flag", r.positionLabor.laborNormsEvidenceOnly === true);
  const src = read("src/lib/intelligent-estimator/knr-knowledge/knr-pricing-identity.ts");
  assert("T-SEED-R void labor for workId", src.includes("void input.labor"));
  assert("T-SEED-R no hourly invent", !/hourlyRate|r-g\s*[*×]/.test(src));
}

{
  const r = resolveKnrPricingIdentity({
    lineId: "L1",
    knrIdentityKeyV2: "k",
    catalogBasisNormalizedKey: KEY,
    boqUnit: "m2",
    labor: [],
    materials: [],
    equipment: [
      {
        kind: "S",
        code: "S-01",
        description: "S",
        resourceUnit: "m-h",
        requiredQuantity: 1,
        sourceNormUnit: "m-h",
        sourceNormQuantity: 0.1,
      },
    ],
    positionTable: [posRow()],
    materialTable: [],
    works,
    nowIso: NOW,
  });
  assert("T-SEED-S UNSUPPORTED", r.equipment[0]?.status === "UNSUPPORTED");
  assert("T-SEED-S no F5 equipment", r.summary.canFeedF5Equipment === false);
}

// BOQ / engine / matcher
{
  const boq = { catalogWorkId: null, quantity: 10 };
  const snapBoq = JSON.stringify(boq);
  resolvePos([posRow()]);
  assert("T-SEED-no BOQ mutation resolve", JSON.stringify(boq) === snapBoq);

  const overlay = applyOwnerKnrMapping({
    documentExpert: {
      status: "COMPLETED",
      masterBoqLines: [
        {
          dwellingId: "d1",
          line: { lineId: "L1", unit: "m2", catalogWorkId: null, catalogBasis: { normalizedKey: KEY } },
        },
      ],
    },
    knr: null,
    works,
    table: OWNER_KNR_MAPPINGS,
  });
  assert("T-SEED-empty table no overlay write", overlay.catalogWorkIdWritten === 0);
}

{
  const seedSrc = read("src/lib/intelligent-estimator/knr-knowledge/knr-owner-identity-seed.ts");
  assert("T-SEED-no pricing engine", !seedSrc.includes("computePositionCost") && !seedSrc.includes("ourRatePln"));
  assert("T-SEED-no matcher", !seedSrc.includes("fuzzy") && !seedSrc.includes("rank"));
  assert("T-SEED-no Research authority", !seedSrc.includes("executeKnrOwnerVerify") && !seedSrc.includes("PENDING_VERIFY"));
  assert("T-SEED-no Host", !seedSrc.includes("IkEntryHost") && !seedSrc.includes("resolveHostKnr"));
}

// identity key policy — R code must not be position key
{
  const r = resolveKnrPricingIdentity({
    lineId: "L1",
    knrIdentityKeyV2: "k",
    catalogBasisNormalizedKey: null,
    boqUnit: "m2",
    labor: [
      {
        kind: "R",
        code: KEY,
        description: "spoof",
        resourceUnit: "r-g",
        requiredQuantity: 1,
        sourceNormUnit: "r-g",
        sourceNormQuantity: 1,
      },
    ],
    materials: [],
    equipment: [],
    positionTable: [posRow()],
    materialTable: [],
    works,
    nowIso: NOW,
  });
  assert("T-SEED-R-code not position identity", r.positionLabor.status === "UNMAPPED");
}

console.log(`\nOwner Identity Seed v1 harness: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
