/**
 * IK-KNR KL-APP-1 — Norm Application harness.
 *
 * npx vite-node scripts/test-knr-norm-application-kl-app1.mjs
 *
 * ZERO PLN · ZERO Host · ZERO BOQ write · ZERO pricing
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_APP1_VERIFICATION_FROM_NORM_APP,
  KNR_KNOWLEDGE_KL_APP1_IMPLEMENTED,
  applyVerifiedKnrNorms,
  foldKnrNormAppUnit,
  knrNormAppUnitsCompatible,
  knrNormAppVerificationFromNormApp,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-21T16:00:00.000Z";
const HASH = "content-hash-kl-app1-test";

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

function baseEntry(overrides = {}) {
  return {
    schemaVersion: 1,
    identityKeyV2: "KNR|2-02|TEST|1998||0803|01||",
    evidenceKeyV1: "KNR|2-02|0803-01",
    identity: { family: "KNR", catalog: "2-02", table: "0803", column: "01" },
    originalSourceCode: "KNR 2-02 0803-01",
    displayCode: "KNR 2-02 0803-01",
    description: "Test position",
    unit: "m2",
    norms: {
      laborNorms: [
        {
          kind: "R",
          code: "R-01",
          description: "Robocizna",
          unit: "r-g",
          quantity: 0.25,
          sourceRef: "ath:R",
        },
      ],
      materialNorms: [
        {
          kind: "M",
          code: "M-01",
          description: "Material",
          unit: "kg",
          quantity: 1.05,
          sourceRef: "ath:M",
        },
      ],
      equipmentNorms: [],
    },
    provenance: {
      sourceType: "LICENSED_EXPORT",
      sourceIdentifier: "synthetic",
      acquisitionMethod: "OWNER_FILE",
      capturedAt: NOW,
      parserVersion: "test",
      contentHash: HASH,
      rawEvidenceRef: null,
      revision: 1,
    },
    verificationStatus: "VERIFIED",
    validationState: "VALID",
    lifecycleState: "ACTIVE",
    contentHash: HASH,
    verifiedAt: NOW,
    verifiedBy: "dawid",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
    norms: overrides.norms ?? {
      laborNorms: [
        {
          kind: "R",
          code: "R-01",
          description: "Robocizna",
          unit: "r-g",
          quantity: 0.25,
          sourceRef: "ath:R",
        },
      ],
      materialNorms: [
        {
          kind: "M",
          code: "M-01",
          description: "Material",
          unit: "kg",
          quantity: 1.05,
          sourceRef: "ath:M",
        },
      ],
      equipmentNorms: [],
    },
  };
}

function apply(overrides = {}, entryOverrides = {}) {
  const entry = baseEntry(entryOverrides);
  return applyVerifiedKnrNorms({
    lineId: "L1",
    boqQuantity: 100,
    boqUnit: "m2",
    entry,
    nowIso: NOW,
    ...overrides,
    entry: overrides.entry ?? entry,
  });
}

assert("T-KL-APP1-M implemented", KNR_KNOWLEDGE_KL_APP1_IMPLEMENTED === true);
assert("T-KL-APP1-M verificationFromNormApp literal", KNR_APP1_VERIFICATION_FROM_NORM_APP === false);
assert("T-KL-APP1-M helper false", knrNormAppVerificationFromNormApp() === false);

// 1–3 APPLIED math
{
  const r = apply();
  assert("T-KL-APP1-1 APPLIED", r.status === "APPLIED");
  assert("T-KL-APP1-1 has R+M", r.labor.length === 1 && r.materials.length === 1);
  assert("T-KL-APP1-2 R 100×0.25=25", r.labor[0].requiredQuantity === 25);
  assert("T-KL-APP1-3 M 100×1.05=105", r.materials[0].requiredQuantity === 105);
  assert("T-KL-APP1-21 resourceUnit r-g", r.labor[0].resourceUnit === "r-g");
  assert("T-KL-APP1-21 resourceUnit kg", r.materials[0].resourceUnit === "kg");
  assert("T-KL-APP1-22 normQuantity preserved R", r.labor[0].normQuantity === 0.25);
  assert("T-KL-APP1-22 normQuantity preserved M", r.materials[0].normQuantity === 1.05);
}

// 4–5 NOT_VERIFIED
{
  const pending = apply({}, { verificationStatus: "PENDING_VERIFY", verifiedAt: null, verifiedBy: null });
  assert("T-KL-APP1-4 PENDING", pending.status === "REJECT" && pending.holdReason === "NOT_VERIFIED");
  const rejected = apply({}, { verificationStatus: "REJECTED", verifiedAt: null, verifiedBy: null });
  assert("T-KL-APP1-5 REJECTED", rejected.status === "REJECT" && rejected.holdReason === "NOT_VERIFIED");
}

// 6 unit mismatch m² vs m
{
  const r = apply({ boqUnit: "m" }, { unit: "m2" });
  assert("T-KL-APP1-6 UNIT_MISMATCH", r.status === "HOLD" && r.holdReason === "UNIT_MISMATCH");
}

// 7 zero qty
{
  const r = apply({ boqQuantity: 0 });
  assert("T-KL-APP1-7 APPLIED zeros", r.status === "APPLIED" && r.labor[0].requiredQuantity === 0);
}

// 8 NaN
{
  const r = apply({ boqQuantity: Number.NaN });
  assert("T-KL-APP1-8 QUANTITY_INVALID", r.status === "REJECT" && r.holdReason === "QUANTITY_INVALID");
}

// 9–10 empty norms
{
  const emptyEv = apply(
    {},
    {
      norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
      emptyNormsWithEvidence: true,
    },
  );
  assert("T-KL-APP1-9 empty+evidence APPLIED", emptyEv.status === "APPLIED");
  assert("T-KL-APP1-20 EMPTY_NORMS flag", emptyEv.provenance.emptyNormsWithEvidence === true);
  assert("T-KL-APP1-20 diagnostics", emptyEv.diagnostics?.emptyNormsWithEvidence === true);

  const emptyNo = apply(
    {},
    {
      norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
      emptyNormsWithEvidence: false,
    },
  );
  assert(
    "T-KL-APP1-10 empty without flag HOLD",
    emptyNo.status === "HOLD" && emptyNo.holdReason === "NORMS_INCOMPLETE",
  );
}

// 11 contentHash
{
  const r = apply({ contentHashExpected: "other-hash" });
  assert(
    "T-KL-APP1-11 CONTENT_HASH_MISMATCH",
    r.status === "REJECT" && r.holdReason === "CONTENT_HASH_MISMATCH",
  );
}

// 12–13 static source checks
{
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-norm-application.ts"),
    "utf8",
  );
  const types = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-norm-application-types.ts"),
    "utf8",
  );
  const joined = src + types;
  assert("T-KL-APP1-12 no Pln", !/\w*Pln\b/.test(joined) && !joined.includes("pricePln"));
  assert("T-KL-APP1-12 no ourRate", !joined.includes("ourRate"));
  assert("T-KL-APP1-12 no sellPrice/bid/margin", !joined.includes("sellPrice") && !joined.includes("bid") && !joined.includes("margin"));
  assert("T-KL-APP1-13 no computePositionCost", !src.includes("computePositionCost"));
  assert("T-KL-APP1-13 no lookupWorkRate", !src.includes("lookupWorkRate"));
  assert("T-KL-APP1-27 no fetch", !src.includes("fetch("));
  assert("T-KL-APP1-27 no localStorage", !src.includes("localStorage"));
}

// 14 no mutation of BOQ-like object
{
  const boqLike = { lineId: "L1", quantity: 100, unit: "m2", catalogWorkId: "x" };
  const snap = JSON.stringify(boqLike);
  apply({ lineId: boqLike.lineId, boqQuantity: boqLike.quantity, boqUnit: boqLike.unit });
  assert("T-KL-APP1-14/26 BOQ not mutated", JSON.stringify(boqLike) === snap);
}

// 15 deterministic
{
  const a = apply();
  const b = apply();
  assert("T-KL-APP1-15 deterministic", JSON.stringify(a) === JSON.stringify(b));
}

// 16 lifecycle
{
  const r = apply({}, { lifecycleState: "SUPERSEDED" });
  assert("T-KL-APP1-16 LIFECYCLE", r.status === "HOLD" && r.holdReason === "LIFECYCLE_INACTIVE");
}

// 17 STALE
{
  const r = apply({}, { verificationStatus: "STALE" });
  assert("T-KL-APP1-17 STALE_NORMS", r.status === "HOLD" && r.holdReason === "STALE_NORMS");
}

// 18 identity mismatch
{
  const r = apply({ identityKeyV2: "OTHER|KEY" });
  assert("T-KL-APP1-18 IDENTITY", r.status === "REJECT" && r.holdReason === "IDENTITY_MISMATCH");
}

// 19 partial M/S without R
{
  const r = apply(
    {},
    {
      norms: {
        laborNorms: [],
        materialNorms: [
          { kind: "M", code: "M-01", description: "M", unit: "kg", quantity: 1.05 },
        ],
        equipmentNorms: [
          { kind: "S", code: "S-01", description: "S", unit: "m-h", quantity: 0.1 },
        ],
      },
    },
  );
  assert("T-KL-APP1-19 APPLIED partial", r.status === "APPLIED");
  assert("T-KL-APP1-19 LABOR_NORMS_EMPTY", r.provenance.laborNormsEmpty === true);
  assert("T-KL-APP1-19 diagnostics", r.diagnostics?.laborNormsEmpty === true);
  assert("T-KL-APP1-19 materials applied", r.materials[0].requiredQuantity === 105);
  assert("T-KL-APP1-19 equipment applied", r.equipment[0].requiredQuantity === 10);
}

// 23 exact fold variants
{
  assert("T-KL-APP1-23 fold m²", foldKnrNormAppUnit("m²") === "m2");
  assert("T-KL-APP1-23 fold m^2", foldKnrNormAppUnit("m^2") === "m2");
  assert("T-KL-APP1-23 fold m2", foldKnrNormAppUnit("m2") === "m2");
  assert("T-KL-APP1-23 compat m²/m2", knrNormAppUnitsCompatible("m²", "m2") === true);
  const r = apply({ boqUnit: "m²" }, { unit: "m2" });
  assert("T-KL-APP1-23 APPLIED fold", r.status === "APPLIED");
}

// 24 loose mb/m must NOT match
{
  assert("T-KL-APP1-24 mb≠m", knrNormAppUnitsCompatible("mb", "m") === false);
  const r = apply({ boqUnit: "mb" }, { unit: "m" });
  assert("T-KL-APP1-24 HOLD", r.status === "HOLD" && r.holdReason === "UNIT_MISMATCH");
}

// 25 verificationFromNormApp
assert("T-KL-APP1-25 false", knrNormAppVerificationFromNormApp() === false);

// invalid norm quantity
{
  const r = apply(
    {},
    {
      norms: {
        laborNorms: [
          { kind: "R", code: "R", description: "x", unit: "r-g", quantity: Number.NaN },
        ],
        materialNorms: [],
        equipmentNorms: [],
      },
    },
  );
  assert("T-KL-APP1 norm NaN", r.status === "REJECT" && r.holdReason === "QUANTITY_INVALID");
}

console.log(`\nKL-APP-1 result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
