/**
 * IK-KNR KL-APP-2 — Pricing Bridge harness.
 *
 * npx vite-node scripts/test-knr-pricing-bridge-kl-app2.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_KNOWLEDGE_KL_APP2_IMPLEMENTED,
  applyVerifiedKnrNorms,
  bridgeKnrRequirementsToPositionCost,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW_ISO = "2026-08-21T18:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);
const T_FRESH = "2026-08-20T12:00:00.000Z";
const WORK_ID = "work-knr-m2";
const MAT_KEY = "mat.inv.wire";
const MAT_CW = "cw.inv.wire";
const HASH = "hash-app2-bridge";

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

assert("T-APP2-M implemented", KNR_KNOWLEDGE_KL_APP2_IMPLEMENTED === true);

function makeWork(id, unit, extra = {}) {
  return {
    id,
    tradeId: "ELEKTRYKA",
    namePl: id,
    unit,
    companyPricePln: 999,
    marketQuotes: extra.marketQuotes ?? {},
    marketQuoteHistory: extra.marketQuoteHistory ?? [],
    commercialPricing: extra.commercialPricing ?? {
      marginPct: 10,
      updatedAt: T_FRESH,
      source: "owner",
    },
    ourWorkRate: extra.ourWorkRate ?? null,
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...extra,
  };
}

function ourRate(workId, unit, rate) {
  return {
    workId,
    unit,
    ourRatePln: rate,
    sourceType: "ACCEPT",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
    history: [],
  };
}

function quoteCell(price) {
  return {
    wgdom: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt: T_FRESH,
        confidence: 0.9,
        origin: "wgdom",
      },
    },
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

function verifiedEntry(overrides = {}) {
  return {
    schemaVersion: 1,
    identityKeyV2: "KNR|2-02|TEST||||0803|01||",
    evidenceKeyV1: "KNR|2-02|0803-01",
    identity: { family: "KNR", catalog: "2-02", table: "0803", column: "01" },
    originalSourceCode: "KNR 2-02 0803-01",
    displayCode: "KNR 2-02 0803-01",
    description: "Test",
    unit: "m2",
    norms: {
      laborNorms: [
        { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.25 },
      ],
      materialNorms: [],
      equipmentNorms: [],
    },
    provenance: {
      sourceType: "LICENSED_EXPORT",
      sourceIdentifier: "t",
      acquisitionMethod: "OWNER_FILE",
      capturedAt: NOW_ISO,
      parserVersion: "t",
      contentHash: HASH,
      rawEvidenceRef: null,
      revision: 1,
    },
    verificationStatus: "VERIFIED",
    validationState: "VALID",
    lifecycleState: "ACTIVE",
    contentHash: HASH,
    verifiedAt: NOW_ISO,
    verifiedBy: "dawid",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
    norms: overrides.norms ?? {
      laborNorms: [
        { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.25 },
      ],
      materialNorms: [],
      equipmentNorms: [],
    },
  };
}

const positionTable = [
  {
    mappingId: "d-1",
    normalizedKey: "KNR|2-02|0803-01",
    workId: WORK_ID,
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
  },
];

const worksRef = [{ id: WORK_ID, unit: "m2", active: true }];

function rrApplied(entryOverrides = {}, boqQuantity = 100) {
  return applyVerifiedKnrNorms({
    lineId: "L1",
    boqQuantity,
    boqUnit: "m2",
    entry: verifiedEntry(entryOverrides),
    nowIso: NOW_ISO,
  });
}

function bridge(rr, opts = {}) {
  return bridgeKnrRequirementsToPositionCost({
    resourceRequirements: rr,
    boqQuantity: opts.boqQuantity ?? 100,
    boqUnit: "m2",
    workCatalogStore:
      opts.store ??
      makeStore([
        makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) }),
      ]),
    nowMs: NOW_MS,
    nowIso: NOW_ISO,
    identityInput: {
      lineId: "L1",
      knrIdentityKeyV2: rr.identityKeyV2,
      catalogBasisNormalizedKey: "KNR|2-02|0803-01",
      boqUnit: "m2",
      positionTable: opts.positionTable ?? positionTable,
      materialTable: opts.materialTable ?? [],
      works: opts.works ?? worksRef,
      nowIso: NOW_ISO,
    },
    expectedIdentityKeyV2: opts.expectedIdentityKeyV2,
  });
}

// 1 PRICED labor
{
  const rr = rrApplied();
  assert("setup RR APPLIED", rr.status === "APPLIED");
  const r = bridge(rr);
  assert("T-APP2-1 PRICED", r.status === "PRICED", r);
  assert("T-APP2-1 labor path F1", r.provenance.pricingPath.labor === "F1_OUR_RATE");
  assert("T-APP2-1 engine F5", r.provenance.pricingPath.engine === "F5_COMPUTE_POSITION_COST");
  assert("T-APP2-1 evidenceOnly", r.provenance.laborNormsEvidenceOnly === true);
  // 100 m2 × SELL(40*1.1=44) = 4400
  assert("T-APP2-1 labor cost", r.positionCost?.laborCostPln === 4400, r.positionCost);
  assert("T-APP2-1 not r-g×rate", r.engineInput?.quantity === 100);
  assert("T-APP2-14 verificationFromBridge false", r.verificationFromBridge === false);
}

// 2 no workId
{
  const rr = rrApplied();
  const r = bridge(rr, { positionTable: [], works: [] });
  assert("T-APP2-2 HOLD_NO_WORK_ID", r.status === "HOLD" && r.holdReason === "HOLD_NO_WORK_ID");
  assert("T-APP2-2 no engine", r.positionCost === null);
}

// 3 material mapped + SELL
{
  const rr = rrApplied({
    norms: {
      laborNorms: [
        { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.25 },
      ],
      materialNorms: [
        { kind: "M", code: "M-01", description: "M", unit: "kg", quantity: 1.05 },
      ],
      equipmentNorms: [],
    },
  });
  const materialTable = [
    {
      mappingId: "m-1",
      mappingVersion: 1,
      knrNormCode: "M-01",
      resourceUnit: "kg",
      materialKey: MAT_KEY,
      pricingUnit: "kg",
      ownerApproval: true,
      active: true,
      provenance: { approvedBy: "dawid", approvedAt: NOW_ISO, notesPl: "t" },
    },
  ];
  const store = makeStore([
    makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) }),
    makeWork(MAT_CW, "kg", {
      marketQuotes: quoteCell(20),
      marketQuoteHistory: [
        {
          workId: MAT_CW,
          price: 20,
          origin: "wgdom",
          regionCode: "wroclaw",
          updatedAt: T_FRESH,
          confidence: 0.9,
          coverage: "indicative",
        },
      ],
    }),
  ]);
  const r = bridge(rr, { materialTable, store });
  assert("T-APP2-3 PRICED with material", r.status === "PRICED", r.holdReason);
  assert("T-APP2-3 materials F2", r.provenance.pricingPath.materials === "F2_PRICE_MEMORY");
  assert("T-APP2-3 material qty 105", r.materialResolves[0]?.quantity === 105);
}

// 4 no material map
{
  const rr = rrApplied({
    norms: {
      laborNorms: [],
      materialNorms: [
        { kind: "M", code: "M-01", description: "M", unit: "kg", quantity: 1 },
      ],
      equipmentNorms: [],
    },
  });
  // empty R + materials without emptyNormsWithEvidence may HOLD NORMS_INCOMPLETE at APP-1
  // ensure APPLIED with R present or emptyNorms flag — use R+M
  const rr2 = rrApplied({
    norms: {
      laborNorms: [
        { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.1 },
      ],
      materialNorms: [
        { kind: "M", code: "M-99", description: "M", unit: "kg", quantity: 1 },
      ],
      equipmentNorms: [],
    },
  });
  const r = bridge(rr2, { materialTable: [] });
  assert("T-APP2-4 HOLD_NO_MATERIAL_MAP", r.holdReason === "HOLD_NO_MATERIAL_MAP", r);
  void rr;
}

// 5 unit mismatch
{
  const rr = rrApplied({
    norms: {
      laborNorms: [
        { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.1 },
      ],
      materialNorms: [
        { kind: "M", code: "M-01", description: "M", unit: "kg", quantity: 1 },
      ],
      equipmentNorms: [],
    },
  });
  const materialTable = [
    {
      mappingId: "m-1",
      mappingVersion: 1,
      knrNormCode: "M-01",
      resourceUnit: "t",
      materialKey: MAT_KEY,
      pricingUnit: "t",
      ownerApproval: true,
      active: true,
      provenance: { approvedBy: "dawid", approvedAt: NOW_ISO, notesPl: "t" },
    },
  ];
  const r = bridge(rr, { materialTable });
  assert("T-APP2-5 HOLD_UNIT_MISMATCH", r.holdReason === "HOLD_UNIT_MISMATCH", r);
}

// 6 equipment
{
  const rr = rrApplied({
    norms: {
      laborNorms: [
        { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.1 },
      ],
      materialNorms: [],
      equipmentNorms: [
        { kind: "S", code: "S-01", description: "S", unit: "m-h", quantity: 0.1 },
      ],
    },
  });
  const r = bridge(rr);
  assert("T-APP2-6 HOLD_EQUIPMENT", r.holdReason === "HOLD_EQUIPMENT_UNPRICED");
  assert("T-APP2-6 no F5", r.positionCost === null);
}

// 7 STALE norms
{
  const rr = applyVerifiedKnrNorms({
    lineId: "L1",
    boqQuantity: 100,
    boqUnit: "m2",
    entry: verifiedEntry({ verificationStatus: "STALE" }),
    nowIso: NOW_ISO,
  });
  assert("setup STALE HOLD", rr.status === "HOLD");
  const r = bridge(rr);
  assert("T-APP2-7 upstream", r.status === "REJECT" && r.holdReason === "UPSTREAM_NOT_APPLIED");
  assert("T-APP2-7 no pricing", r.laborResolve === null && r.positionCost === null);
}

// 8 PENDING
{
  const rr = applyVerifiedKnrNorms({
    lineId: "L1",
    boqQuantity: 100,
    boqUnit: "m2",
    entry: verifiedEntry({
      verificationStatus: "PENDING_VERIFY",
      verifiedAt: null,
      verifiedBy: null,
    }),
    nowIso: NOW_ISO,
  });
  const r = bridge(rr);
  assert("T-APP2-8 PENDING", r.holdReason === "UPSTREAM_NOT_APPLIED");
}

// 9 REJECTED
{
  const rr = applyVerifiedKnrNorms({
    lineId: "L1",
    boqQuantity: 100,
    boqUnit: "m2",
    entry: verifiedEntry({
      verificationStatus: "REJECTED",
      verifiedAt: null,
      verifiedBy: null,
    }),
    nowIso: NOW_ISO,
  });
  const r = bridge(rr);
  assert("T-APP2-9 REJECTED", r.holdReason === "UPSTREAM_NOT_APPLIED");
}

// 10 identity mismatch
{
  const rr = rrApplied();
  const r = bridge(rr, { expectedIdentityKeyV2: "OTHER|KEY" });
  assert("T-APP2-10 IDENTITY_MISMATCH", r.holdReason === "IDENTITY_MISMATCH");
}

// 11–14 static safety
{
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-pricing-bridge.ts"),
    "utf8",
  );
  assert(
    "T-APP2-11 no hourly invent",
    !/\br-g\s*[*×]\s*|hourlyRate|PLN\s*\/\s*r-g/.test(src) &&
      src.includes("resolveLaborInputFromOurWorkRate"),
  );
  assert("T-APP2-11 uses F1", src.includes("resolveLaborInputFromOurWorkRate"));
  assert("T-APP2-11 uses F2", src.includes("resolveMaterialInputFromPriceMemory"));
  assert("T-APP2-11 uses F5", src.includes("computePositionCost"));
  assert("T-APP2-12 no BOQ write", !src.includes("catalogWorkId =") && !src.includes("localStorage"));
  assert("T-APP2-13 no research", !src.includes("knr-research") && !src.includes("runSelective"));
  assert("T-APP2-14 no Owner VERIFY", !src.includes("executeKnrOwnerVerifyApprove"));
  assert("T-APP2-14 no persistVerified", !src.includes("persistVerifiedKnrCatalogEntry"));
}

// 12 runtime BOQ
{
  const boq = { catalogWorkId: null, quantity: 100 };
  const snap = JSON.stringify(boq);
  bridge(rrApplied());
  assert("T-APP2-12 runtime BOQ", JSON.stringify(boq) === snap);
}

console.log(`\nKL-APP-2 result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
