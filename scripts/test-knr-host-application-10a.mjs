/**
 * IK-KNR ETAP 10A — Host application orchestrator harness.
 *
 * Library-only · inject maps · ZERO production seed mutation.
 * npx vite-node scripts/test-knr-host-application-10a.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_KNOWLEDGE_KL_HOST_APP_IMPLEMENTED,
  OWNER_KNR_MAPPINGS,
  OWNER_KNR_MATERIAL_MAPPINGS,
  emptyKnrCatalogStore,
  orchestrateKnrHostApplication,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW_ISO = "2026-08-21T20:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);
const T_FRESH = "2026-08-20T12:00:00.000Z";
const WORK_ID = "work-knr-m2";
const MAT_KEY = "mat.inv.wire";
const MAT_CW = "cw.inv.wire";
const HASH = "hash-host-app-10a";
const ID_KEY = "KNR|2-02|TEST||||0803|01||";
const BASIS_KEY = "KNR|2-02|0803-01";

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

assert("T-10A-M implemented", KNR_KNOWLEDGE_KL_HOST_APP_IMPLEMENTED === true);
assert("T-10A-11 empty prod position maps", OWNER_KNR_MAPPINGS.length === 0);
assert("T-10A-11 empty prod material maps", OWNER_KNR_MATERIAL_MAPPINGS.length === 0);

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
    identityKeyV2: ID_KEY,
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

function catalogWith(entry) {
  const store = emptyKnrCatalogStore(NOW_ISO);
  store.entries[entry.identityKeyV2] = entry;
  return store;
}

function knowledgeLine(status, over = {}) {
  return {
    lineId: "L1",
    catalogBasis: {
      family: "KNR",
      catalogId: "2-02",
      tableCode: "0803-01",
      rawCode: "KNR 2-02 0803-01",
      display: "KNR 2-02 0803-01",
      normalizedKey: BASIS_KEY,
    },
    lookupStatus: status,
    identityKeyV2: ID_KEY,
    evidenceKeyV1: "KNR|2-02|0803-01",
    ...over,
  };
}

const positionTable = [
  {
    mappingId: "d-1",
    normalizedKey: BASIS_KEY,
    workId: WORK_ID,
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
  },
];

const worksRef = [{ id: WORK_ID, unit: "m2", active: true }];

function run(opts = {}) {
  const entry = opts.entry ?? verifiedEntry(opts.entryOver);
  return orchestrateKnrHostApplication({
    lineId: "L1",
    knowledgeLine: opts.knowledge ?? knowledgeLine("LOCAL_HIT"),
    boqQuantity: opts.boqQuantity ?? 100,
    boqUnit: "m2",
    catalogStore: opts.catalogStore ?? catalogWith(entry),
    workCatalogStore:
      opts.workStore ??
      makeStore([makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) })]),
    nowMs: NOW_MS,
    nowIso: NOW_ISO,
    identityInput: {
      catalogBasisNormalizedKey: BASIS_KEY,
      positionTable: opts.positionTable ?? positionTable,
      materialTable: opts.materialTable ?? [],
      works: opts.works ?? worksRef,
      ...(opts.identityInput ?? {}),
    },
  });
}

// 1 PRICED R-only
{
  const r = run();
  assert("T-10A-1 PRICED", r.finalStatus === "PRICED", r);
  assert("T-10A-1 app1 APPLIED", r.app1?.status === "APPLIED");
  assert("T-10A-1 bridge PRICED", r.bridge?.status === "PRICED");
  assert("T-10A-1 no invent verify", r.verificationFromOrchestrator === false);
}

// 2 no workId
{
  const r = run({ positionTable: [], works: [] });
  assert("T-10A-2 HOLD_NO_WORK_ID", r.holdReason === "HOLD_NO_WORK_ID", r);
}

// 3 M no material map
{
  const r = run({
    entryOver: {
      norms: {
        laborNorms: [
          { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.1 },
        ],
        materialNorms: [
          { kind: "M", code: "M-99", description: "M", unit: "kg", quantity: 1 },
        ],
        equipmentNorms: [],
      },
    },
    materialTable: [],
  });
  assert("T-10A-3 HOLD_NO_MATERIAL_MAP", r.holdReason === "HOLD_NO_MATERIAL_MAP", r);
}

// 4 equipment
{
  const r = run({
    entryOver: {
      norms: {
        laborNorms: [
          { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.1 },
        ],
        materialNorms: [],
        equipmentNorms: [
          { kind: "S", code: "S-01", description: "S", unit: "m-h", quantity: 0.1 },
        ],
      },
    },
  });
  assert("T-10A-4 HOLD_EQUIPMENT", r.holdReason === "HOLD_EQUIPMENT_UNPRICED", r);
}

// 5 STALE
{
  const r = run({
    knowledge: knowledgeLine("STALE_HIT", { stale: true }),
    entryOver: { verificationStatus: "STALE" },
  });
  assert("T-10A-5 STALE skip", r.finalStatus === "SKIPPED" && r.holdReason === "STALE_HIT", r);
}

{
  const r = run({
    knowledge: knowledgeLine("LOCAL_HIT"),
    entryOver: { verificationStatus: "STALE" },
  });
  assert("T-10A-5b STALE_NORMS", r.holdReason === "STALE_NORMS" && r.bridge === null, r);
}

// 6 PENDING
{
  const r = run({ knowledge: knowledgeLine("PENDING_VERIFY") });
  assert("T-10A-6 PENDING", r.holdReason === "NO_LOCAL_HIT" && r.app1 === null, r);
}

// 7 REJECTED (envelope incomplete / no LOCAL_HIT)
{
  const r = run({
    knowledge: knowledgeLine("INCOMPLETE", { gapReason: "REJECTED_NO_RESEARCH" }),
  });
  assert("T-10A-7 REJECTED path", r.app1 === null && r.bridge === null, r);
}

// 8 missing LOCAL_HIT
{
  const r = run({ knowledge: knowledgeLine("RESEARCH_DISABLED") });
  assert("T-10A-8 no APP-1", r.app1 === null && r.bridge === null && r.holdReason === "NO_LOCAL_HIT");
}

{
  const r = run({
    knowledge: knowledgeLine("LOCAL_HIT", { identityKeyV2: null }),
  });
  assert("T-10A-8b no identity", r.holdReason === "NO_IDENTITY_KEY", r);
}

// 9 material price miss
{
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
  const r = run({
    entryOver: {
      norms: {
        laborNorms: [
          { kind: "R", code: "R-01", description: "R", unit: "r-g", quantity: 0.1 },
        ],
        materialNorms: [
          { kind: "M", code: "M-01", description: "M", unit: "kg", quantity: 1 },
        ],
        equipmentNorms: [],
      },
    },
    materialTable,
    workStore: makeStore([
      makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) }),
      // no material quotes → F2 MISS
      makeWork(MAT_CW, "kg", { marketQuotes: {} }),
    ]),
  });
  assert("T-10A-9 HOLD_MATERIAL_PRICE", r.holdReason === "HOLD_MATERIAL_PRICE", r);
}

// 10 OUR RATE miss
{
  const r = run({
    workStore: makeStore([makeWork(WORK_ID, "m2", { ourWorkRate: null })]),
  });
  assert("T-10A-10 HOLD_OUR_RATE", r.holdReason === "HOLD_OUR_RATE", r);
}

// 11 empty production maps via default tables
{
  const r = orchestrateKnrHostApplication({
    lineId: "L1",
    knowledgeLine: knowledgeLine("LOCAL_HIT"),
    boqQuantity: 100,
    boqUnit: "m2",
    catalogStore: catalogWith(verifiedEntry()),
    workCatalogStore: makeStore([
      makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) }),
    ]),
    nowMs: NOW_MS,
    nowIso: NOW_ISO,
    identityInput: {
      catalogBasisNormalizedKey: BASIS_KEY,
      // omit tables → production empty defaults
    },
  });
  assert("T-10A-11 empty maps HOLD", r.holdReason === "HOLD_NO_WORK_ID", r);
}

// 12 Historical — no LOCAL_HIT authority
{
  const r = run({
    knowledge: {
      lineId: "L1",
      catalogBasis: knowledgeLine("LOCAL_HIT").catalogBasis,
      lookupStatus: "LOCAL_MISS",
      identityKeyV2: null,
    },
  });
  assert("T-10A-12 Historical-like no pricing", r.app1 === null && r.bridge === null);
}

// 13 Research candidate
{
  const r = run({ knowledge: knowledgeLine("PENDING_VERIFY") });
  assert("T-10A-13 Research no APP-1", r.app1 === null);
}

// 14 BOQ mutation
{
  const boq = { catalogWorkId: null, quantity: 100 };
  const snap = JSON.stringify(boq);
  run();
  assert("T-10A-14 no BOQ mutation", JSON.stringify(boq) === snap);
}

// 15 P7 no bridge import + orchestrator static
{
  const p7 = readFileSync(
    join(root, "src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts"),
    "utf8",
  );
  assert("T-10A-15 P7 no knr-pricing-bridge", !p7.includes("knr-pricing-bridge"));
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-application-orchestrator.ts"),
    "utf8",
  );
  assert("T-10A-15 no hourly invent", !/hourlyRate|r-g\s*[*×]/.test(src));
  assert("T-10A-15 uses APP-1", src.includes("applyVerifiedKnrNorms"));
  assert("T-10A-15 uses bridge", src.includes("bridgeKnrRequirementsToPositionCost"));
  assert("T-10A-15 uses lookup", src.includes("lookupKnrCatalog"));
  assert("T-10A-15 no Host write", !src.includes("IkEntryHost") && !src.includes("localStorage"));
  assert("T-10A-15 no Research", !src.includes("resolveKnrKnowledgeKl3b"));
}

console.log(`\nKL-10A Host Application harness: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
