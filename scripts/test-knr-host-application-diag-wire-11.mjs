/**
 * IK-KNR ETAP 11 — Host application diagnostic wire harness.
 *
 * Pure batch + static Host/P7 isolation. Fixture maps only.
 * npx vite-node scripts/test-knr-host-application-diag-wire-11.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_KNOWLEDGE_KL_HOST_APP_DIAG_IMPLEMENTED,
  OWNER_KNR_MAPPINGS,
  OWNER_KNR_MATERIAL_MAPPINGS,
  emptyKnrCatalogStore,
  runKnrHostApplicationDiagBatch,
  summarizeKnrHostAppDiag,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW_ISO = "2026-08-21T21:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);
const T_FRESH = "2026-08-20T12:00:00.000Z";
const WORK_ID = "work-knr-m2";
const MAT_KEY = "mat.inv.wire";
const MAT_CW = "cw.inv.wire";
const HASH = "hash-host-app-11";
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

assert("T-11-M implemented", KNR_KNOWLEDGE_KL_HOST_APP_DIAG_IMPLEMENTED === true);
assert(
  "T-11 prod maps pilot position 1 material 0",
  OWNER_KNR_MAPPINGS.length === 1 &&
    OWNER_KNR_MAPPINGS[0]?.mappingId === "owner-knr-wykwity-1202-07" &&
    OWNER_KNR_MATERIAL_MAPPINGS.length === 0,
);

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

function batch(opts = {}) {
  const entry = opts.entry ?? verifiedEntry(opts.entryOver);
  return runKnrHostApplicationDiagBatch({
    readyForExperts: opts.readyForExperts !== false,
    knowledgeLines: opts.lines ?? [knowledgeLine(opts.status ?? "LOCAL_HIT")],
    boqByLineId: opts.boqByLineId ?? {
      L1: { lineId: "L1", quantity: 100, unit: "m2" },
    },
    catalogStore: opts.catalogStore ?? catalogWith(entry),
    workCatalogStore:
      opts.workStore ??
      makeStore([makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) })]),
    nowMs: NOW_MS,
    nowIso: NOW_ISO,
    identityInput: {
      catalogBasisNormalizedKey: BASIS_KEY,
      positionTable: opts.positionTable ?? [],
      materialTable: opts.materialTable ?? [],
      works: opts.works ?? [{ id: WORK_ID, unit: "m2", active: true }],
      ...(opts.identityInput ?? {}),
    },
  });
}

// 1 readyForExperts=false
{
  const r = batch({ readyForExperts: false });
  assert("T-11-1 not ready empty", r.length === 0);
  assert("T-11-1 summary skipped", summarizeKnrHostAppDiag(r, false).status === "skipped");
}

// 2 MISS
{
  const r = batch({ status: "LOCAL_MISS" });
  assert("T-11-2 MISS SKIPPED", r[0]?.holdReason === "NO_LOCAL_HIT" && r[0]?.app1 === null);
}

// 3 PENDING
{
  const r = batch({ status: "PENDING_VERIFY" });
  assert("T-11-3 PENDING SKIPPED", r[0]?.finalStatus === "SKIPPED" && r[0]?.bridge === null);
}

// 4 STALE_HIT
{
  const r = batch({ status: "STALE_HIT" });
  assert("T-11-4 STALE_HIT", r[0]?.holdReason === "STALE_HIT");
}

// 5 empty maps HOLD
{
  const r = batch({ positionTable: [] });
  assert("T-11-5 empty maps HOLD", r[0]?.holdReason === "HOLD_NO_WORK_ID", r[0]);
}

// 6 fixture PRICED
{
  const r = batch({ positionTable });
  assert("T-11-6 PRICED", r[0]?.finalStatus === "PRICED", r[0]);
}

// 7 STALE entry
{
  const r = batch({
    entryOver: { verificationStatus: "STALE" },
    positionTable,
  });
  assert("T-11-7 STALE_NORMS", r[0]?.holdReason === "STALE_NORMS" && r[0]?.bridge === null);
}

// 8 no qty
{
  const r = batch({
    boqByLineId: { L1: { lineId: "L1", quantity: null, unit: "m2" } },
    positionTable,
  });
  assert("T-11-8 no qty", r[0]?.holdReason === "NO_BOQ_QUANTITY" && r[0]?.app1 === null);
}

// 9 no unit
{
  const r = batch({
    boqByLineId: { L1: { lineId: "L1", quantity: 100, unit: "" } },
    positionTable,
  });
  assert("T-11-9 no unit", r[0]?.holdReason === "NO_BOQ_UNIT");
}

// 10 equipment
{
  const r = batch({
    positionTable,
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
  assert("T-11-10 equipment", r[0]?.holdReason === "HOLD_EQUIPMENT_UNPRICED");
}

// 11 material no map
{
  const r = batch({
    positionTable,
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
  assert("T-11-11 no material map", r[0]?.holdReason === "HOLD_NO_MATERIAL_MAP");
}

// 12 material price miss
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
  const r = batch({
    positionTable,
    materialTable,
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
    workStore: makeStore([
      makeWork(WORK_ID, "m2", { ourWorkRate: ourRate(WORK_ID, "m2", 40) }),
      makeWork(MAT_CW, "kg", { marketQuotes: {} }),
    ]),
  });
  assert("T-11-12 material price", r[0]?.holdReason === "HOLD_MATERIAL_PRICE");
}

// 13 OUR RATE
{
  const r = batch({
    positionTable,
    workStore: makeStore([makeWork(WORK_ID, "m2", { ourWorkRate: null })]),
  });
  assert("T-11-13 OUR RATE", r[0]?.holdReason === "HOLD_OUR_RATE");
}

// 14 BOQ mutation
{
  const boq = { L1: { lineId: "L1", quantity: 100, unit: "m2" } };
  const snap = JSON.stringify(boq);
  batch({ boqByLineId: boq, positionTable });
  assert("T-11-14 no BOQ mutation", JSON.stringify(boq) === snap);
}

// 15–18 static Host / P7
{
  const host = readFileSync(
    join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"),
    "utf8",
  );
  const p7 = readFileSync(
    join(root, "src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts"),
    "utf8",
  );
  const diag = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-application-diag.ts"),
    "utf8",
  );

  assert("T-11-15 no Research HTTP in diag", !/fetch\(|httpRequest|explicitResearch\s*:\s*true/.test(diag));
  assert(
    "T-11-16 Host no P7 feed",
    !/runIkP7PositionCostBid\([^)]*knrApp|positionCostBid\s*=\s*knrApplication|knrApplicationResults/.test(
      host.split("runIkP7PositionCostBid")[1]?.slice(0, 400) ?? "",
    ) &&
      !host.includes("positionCostBid: knrApplication") &&
      host.includes("data-ik-knr-app-diag-only"),
  );
  assert(
    "T-11-16b Host uses diag batch not direct APP-1",
    host.includes("runKnrHostApplicationDiagBatch") &&
      !host.includes("applyVerifiedKnrNorms") &&
      !host.includes("bridgeKnrRequirementsToPositionCost") &&
      !host.includes("lookupKnrCatalog"),
  );
  assert(
    "T-11-17 P7 no bridge/orchestrator",
    !p7.includes("knr-pricing-bridge") &&
      !p7.includes("knr-host-application-orchestrator") &&
      !p7.includes("runKnrHostApplicationDiagBatch"),
  );
  assert(
    "T-11-18 KL-3 diagnostics remain",
    host.includes("data-ik-knr-knowledge-status") &&
      host.includes("resolveHostKnrKnowledgeLookupOnly") &&
      host.includes("data-ik-knr-app-status") &&
      host.includes("data-ik-knr-app-priced"),
  );
  assert("T-11-18b Host not conversation", !/buildIkEntryConversationViewModel\([\s\S]*knrApplication/.test(host));
}

console.log(`\nKL-11 Host App Diag Wire harness: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
