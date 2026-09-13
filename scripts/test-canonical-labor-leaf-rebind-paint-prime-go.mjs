/**
 * Canonical labor leaf rebind — paint/prime PASS/FAIL matrix + 0815-05 regression.
 * npx vite-node scripts/test-canonical-labor-leaf-rebind-paint-prime-go.mjs
 */
import {
  evaluateCanonicalLaborLeafRebind,
  evaluateCompoundToLaborLeafRebind,
  evaluateLaborToCanonicalLeafRebind,
  applyCompoundLaborLeafRebindToLine,
  isWallsEmulsionPaint120402Activity,
  isCeilingEmulsionPaint150501Activity,
  isPrimingHorizontal113401Activity,
  isPrimingVertical113402Activity,
  isAmbiguous1134PrimingIdentity,
  isCeilingSingleLayerGypsumSkimActivity,
  CLLR_LEAF_0815_05,
  CLLR_LEAF_1204_02,
  CLLR_LEAF_1505_01,
  CLLR_LEAF_1134_01,
  CLLR_LEAF_1134_02,
} from "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts";
import {
  evaluateExactCanonicalLaborLeafRebind,
} from "../src/lib/intelligent-estimator/orchestra/canonical-labor-leaf-rebind-contract.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${msg}`);
  } else {
    fail += 1;
    console.log(`FAIL ${msg}`);
  }
}

const NOW = Date.parse("2026-09-13T18:00:00.000Z");
const PARENT_GLADZIE = "legacy-gladzie_tynki-m2";
const PARENT_MALOWANIE = "legacy-malowanie-m2";

function leafWork(id, rate) {
  return {
    id,
    tradeId: "MALOWANIE",
    namePl: id,
    unit: "m2",
    updatedAt: new Date(NOW).toISOString(),
    freshnessStatus: "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...(rate != null
      ? {
          ourWorkRate: {
            ourRatePln: rate,
            unit: "m2",
            sourceType: "AUTO_R1",
            updatedAt: new Date(NOW).toISOString(),
            observedAt: new Date(NOW).toISOString(),
            regionScope: "POLSKA",
            history: [],
          },
        }
      : {}),
  };
}

function parentWork(id, planeHint) {
  return {
    id,
    tradeId: planeHint === "LABOR" ? "MALOWANIE" : "SCIANY_GK",
    namePl: id,
    unit: "m2",
    updatedAt: new Date(NOW).toISOString(),
    freshnessStatus: "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function makeStore(opts = {}) {
  const {
    includePaintRates = true,
    include0815 = true,
    stale1204 = false,
    omit1505Cw = false,
  } = opts;
  const works = [
    parentWork(PARENT_GLADZIE, "COMPOUND"),
    parentWork(PARENT_MALOWANIE, "LABOR"),
  ];
  if (include0815) {
    works.push(leafWork(CLLR_LEAF_0815_05, 22.88));
  }
  if (includePaintRates) {
    works.push(
      leafWork(CLLR_LEAF_1204_02, stale1204 ? undefined : 3.72),
      ...(omit1505Cw ? [] : [leafWork(CLLR_LEAF_1505_01, 1.18)]),
      leafWork(CLLR_LEAF_1134_01, 1.04),
      leafWork(CLLR_LEAF_1134_02, 1.39),
    );
    if (stale1204) {
      const w = works.find((x) => x.id === CLLR_LEAF_1204_02);
      w.ourWorkRate = {
        ourRatePln: 3.72,
        unit: "m2",
        sourceType: "AUTO_R1",
        updatedAt: "2020-01-01T00:00:00.000Z",
        observedAt: "2020-01-01T00:00:00.000Z",
        regionScope: "POLSKA",
        history: [],
        // force STALE via missing freshness — lookup uses observedAt age
      };
    }
  }
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: new Date(NOW).toISOString() },
      dolnyslask: {
        region: "dolnyslask",
        works: structuredClone(works),
        updatedAt: new Date(NOW).toISOString(),
      },
    },
    updatedAt: new Date(NOW).toISOString(),
  });
}

const DESC_1204 =
  "Dwukrotne malowanie farbami emulsyjnymi starych m2 d.1.1 1204-02 tynków wewnętrznych ścian poz.1";
const DESC_1505 =
  "Dwukrotne malowanie farbami emulsyjnymi powierzchni m2 d.1.2 1505-01 wewnętrznych-tynków gładkich bez gruntowania-sufity poz.4";
const DESC_113401 =
  "(z.VII) Gruntowanie podłoży-sufity m2 d.1.2 202 1134-01 10,31 + 19,41";
const DESC_113402 =
  "(z.VII) Gruntowanie podłoży-powierzchnie pionowe m2 d.1.1 202 1134-02 36,76 + 50,11";
const DESC_0815 = "Gładź gipsowa na sufitach jednowarstwowa m2 d.1 0815-05 poz.1";

assert(isWallsEmulsionPaint120402Activity(DESC_1204), "1 scope 1204-02");
assert(isCeilingEmulsionPaint150501Activity(DESC_1505), "2 scope 1505-01");
assert(isPrimingHorizontal113401Activity(DESC_113401), "3 scope 1134-01");
assert(isPrimingVertical113402Activity(DESC_113402), "4 scope 1134-02");
assert(isCeilingSingleLayerGypsumSkimActivity(DESC_0815), "5 scope 0815-05");

const store = makeStore();

// PASS 1–4
const r1204 = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "l1",
    description: DESC_1204,
    normalizedDescription: "Dwukrotne malowanie farbami emulsyjnymi starych m2 tynków",
    unit: "m2",
    quantity: 10,
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(r1204.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "PASS1 1204-02 ACCEPT");
assert(r1204.leafWorkId === CLLR_LEAF_1204_02, "PASS1 leaf");
assert(r1204.ourRatePln === 3.72, "PASS1 rate 3.72");

const r1505 = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "l2",
    description: DESC_1505,
    unit: "m2",
    quantity: 10,
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(r1505.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "PASS2 1505-01 ACCEPT");
assert(r1505.leafWorkId === CLLR_LEAF_1505_01, "PASS2 leaf");
assert(r1505.ourRatePln === 1.18, "PASS2 rate 1.18");

const r113401 = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "l3",
    description: DESC_113401,
    unit: "m2",
    quantity: 10,
    catalogWorkId: PARENT_MALOWANIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(r113401.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "PASS3 1134-01 ACCEPT");
assert(r113401.leafWorkId === CLLR_LEAF_1134_01, "PASS3 leaf");
assert(r113401.ourRatePln === 1.04, "PASS3 rate 1.04");
assert(r113401.reasons.some((x) => x.includes("LABOR_TO_CANONICAL")), "PASS3 labor mode");

const r113402 = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "l4",
    description: DESC_113402,
    unit: "m2",
    quantity: 10,
    catalogWorkId: PARENT_MALOWANIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(r113402.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "PASS4 1134-02 ACCEPT");
assert(r113402.leafWorkId === CLLR_LEAF_1134_02, "PASS4 leaf");
assert(r113402.ourRatePln === 1.39, "PASS4 rate 1.39");

// PASS 5 — 0815-05 unchanged via compound entry
const r0815 = evaluateCompoundToLaborLeafRebind({
  line: {
    lineId: "l5",
    description: DESC_0815,
    unit: "m2",
    quantity: 10,
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "manual",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(r0815.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "PASS5 0815-05 ACCEPT");
assert(r0815.leafWorkId === CLLR_LEAF_0815_05, "PASS5 leaf");
assert(r0815.ourRatePln === 22.88, "PASS5 rate 22.88");

// PASS 6–7 — apply + idempotent
const applied = applyCompoundLaborLeafRebindToLine(
  {
    lineId: "l1",
    description: DESC_1204,
    unit: "m2",
    quantity: 10,
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
    candidateMatches: [],
  },
  r1204,
);
assert(applied.catalogWorkId === CLLR_LEAF_1204_02, "PASS7 durable catalogWorkId");
assert(applied.matchMethod === "auto_contract", "PASS7 auto_contract");
assert(
  (applied.candidateMatches || []).some((c) => c.catalogWorkId === PARENT_GLADZIE),
  "PASS7 prior parent secondary",
);

const idem = evaluateCanonicalLaborLeafRebind({
  line: applied,
  store,
  nowMs: NOW,
});
assert(idem.decision === "COMPOUND_LEAF_REBIND_IDEMPOTENT", "PASS6 idempotent");

// PASS 8 — cold-start preserve (already on leaf)
const cold = evaluateCanonicalLaborLeafRebind({
  line: {
    ...applied,
    matchMethod: "auto_contract",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(cold.decision === "COMPOUND_LEAF_REBIND_IDEMPOTENT", "PASS8 cold-start preserve");

// FAIL matrix
assert(
  !isWallsEmulsionPaint120402Activity("malowanie emulsyjne ścian bez kodu"),
  "FAIL15 fuzzy description only",
);

const normOnly = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "fn",
    description: "Dwukrotne malowanie farbami emulsyjnymi starych tynków ścian",
    normalizedDescription: "Dwukrotne malowanie farbami emulsyjnymi starych tynków ścian",
    unit: "m2",
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(
  normOnly.decision === "COMPOUND_LEAF_REBIND_EXCEPTION",
  "FAIL16 normalized-only without code",
);

const parentGlobal = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "pg",
    description: "Roboty malarskie ogólne bez kodu KNR",
    unit: "m2",
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "catalog_map",
    matchConfidence: "high",
  },
  store,
  nowMs: NOW,
});
assert(
  parentGlobal.decision === "COMPOUND_LEAF_REBIND_EXCEPTION",
  "FAIL17 parent-global mapping refused",
);

const wrongFamily = evaluateLaborToCanonicalLeafRebind({
  line: {
    lineId: "wf",
    description: "KNR 2-02 1134-01 gruntowanie sufitow bez tokenu rodziny NNR",
    unit: "m2",
    catalogWorkId: PARENT_MALOWANIE,
  },
  store,
  nowMs: NOW,
});
assert(
  wrongFamily.decision === "COMPOUND_LEAF_REBIND_EXCEPTION",
  "FAIL9 wrong family (no 202/NNRNKB)",
);

const wrongCode = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "wc",
    description: DESC_1204.replace("1204-02", "1204-99"),
    unit: "m2",
    catalogWorkId: PARENT_GLADZIE,
  },
  store,
  nowMs: NOW,
});
assert(wrongCode.decision === "COMPOUND_LEAF_REBIND_EXCEPTION", "FAIL10 wrong code");

const wrongUnit = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "wu",
    description: DESC_1204,
    unit: "mb",
    catalogWorkId: PARENT_GLADZIE,
  },
  store,
  nowMs: NOW,
});
assert(
  wrongUnit.decision === "COMPOUND_LEAF_REBIND_EXCEPTION"
    && wrongUnit.reasons.some((r) => /UNIT/i.test(r)),
  "FAIL11 wrong unit",
);

const missCw = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "mc",
    description: DESC_1505,
    unit: "m2",
    catalogWorkId: PARENT_GLADZIE,
  },
  store: makeStore({ omit1505Cw: true }),
  nowMs: NOW,
});
assert(
  missCw.decision === "COMPOUND_LEAF_REBIND_EXCEPTION"
    && missCw.reasons.some((r) => /LEAF_NOT_IN_CATALOG|TARGET_CATALOGWORK_MISSING/i.test(r)),
  "FAIL12 missing target CW",
);

const missRate = evaluateCanonicalLaborLeafRebind({
  line: {
    lineId: "mr",
    description: DESC_1204,
    unit: "m2",
    catalogWorkId: PARENT_GLADZIE,
  },
  store: makeStore({ includePaintRates: false, include0815: true }),
  nowMs: NOW,
});
assert(
  missRate.decision === "COMPOUND_LEAF_REBIND_EXCEPTION",
  "FAIL13 missing target rate (leaf absent)",
);

assert(isAmbiguous1134PrimingIdentity("202 1134-01 oraz 1134-02"), "FAIL20/21 ambiguous both");
const amb = evaluateLaborToCanonicalLeafRebind({
  line: {
    lineId: "amb",
    description: "Gruntowanie 202 1134-01 i 1134-02",
    unit: "m2",
    catalogWorkId: PARENT_MALOWANIE,
  },
  store,
  nowMs: NOW,
});
assert(
  amb.decision === "COMPOUND_LEAF_REBIND_EXCEPTION"
    && amb.reasons.includes("AMBIGUOUS_IDENTITY"),
  "FAIL20/21 1134 mutual exclusion",
);

assert(!isPrimingHorizontal113401Activity(DESC_113402), "FAIL20 1134-02≠1134-01 scope");
assert(!isPrimingVertical113402Activity(DESC_113401), "FAIL21 1134-01≠1134-02 scope");

const demote = evaluateLaborToCanonicalLeafRebind({
  line: {
    lineId: "dem",
    description: DESC_113401,
    unit: "m2",
    catalogWorkId: CLLR_LEAF_1204_02,
  },
  store,
  nowMs: NOW,
});
assert(
  demote.decision === "COMPOUND_LEAF_REBIND_EXCEPTION"
    && demote.reasons.some((r) => /CANONICAL_DEMOTION|SOURCE_PLANE/i.test(r)),
  "FAIL23 canonical→canonical demotion",
);

const exactNoInvent = evaluateExactCanonicalLaborLeafRebind({
  lineId: "ei",
  currentCatalogWorkId: PARENT_MALOWANIE,
  currentPlane: "LABOR",
  rawDescription: DESC_113401,
  normalizedDescription: null,
  unit: "m2",
  targetCatalogWorkId: CLLR_LEAF_1134_01,
  targetFamily: "NNRNKB",
  targetCode: "1134-01",
  targetUnit: "m2",
  identityAttested: true,
  identityMethod: "ckrk_exact_token_raw_description",
  ruleId: "cllr.priming_horizontal.1134_01_v1",
  sourceMode: "LABOR_TO_CANONICAL",
  store,
  nowMs: NOW,
});
assert(exactNoInvent.invent === false, "FAIL24 invent=false");
assert(exactNoInvent.ownerRuntimeDependency === 0, "FAIL24 ownerRuntime=0");
assert(exactNoInvent.ok === true, "exact primitive ACCEPT");

// Never use legacy-malowanie 22.90 as authority — ourRate stays leaf
assert(r113401.ourRatePln !== 22.9 && r113401.ourRatePln === 1.04, "FAIL22 no legacy 22.90");

// Rate similarity / semantic nearest — not implemented as matchers
assert(
  !isWallsEmulsionPaint120402Activity("podobne malowanie ścian emulsją"),
  "FAIL18/19 no rate/semantic nearest",
);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
