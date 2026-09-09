/**
 * GO48 / KB-03 — Knowledge Destination Router runtime tests.
 * Fixture · ZERO live HTTP · ZERO TPI/729 control · ZERO OUR RATE Accept.
 *
 * npx vite-node scripts/test-knowledge-destination-router-go48.mjs
 */
import {
  KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
  classifyKnowledge,
  persistKnowledge,
  resolveKnowledgeReuse,
  routeKnowledge,
} from "../src/lib/knowledge-destination-router/index.ts";
import {
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  clearLaborSourceEvidenceStoreLocalForTests,
  loadLaborSourceEvidenceStoreLocal,
} from "../src/lib/labor-source-evidence/index.ts";
import { WORK_CATALOG_STORAGE_KEY } from "../src/lib/work-catalog/work-catalog-store.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/index.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

const T_FRESH = "2026-08-14T12:00:00.000Z";
const FIX_WORK = "legacy-malowanie-m2";
const FIX_NAME = "Malowanie ścian dwukrotne";
const FIX_UNIT = "m2";

function obs(rate = 40) {
  return {
    sourceId: "cennikremontow_pl",
    workNamePl: FIX_NAME,
    ratePln: rate,
    unit: FIX_UNIT,
    regionScope: "WROCLAW",
    laborOnly: true,
    sourceUrl: "https://cennikremontow.pl/fixture-go48",
    observedAt: T_FRESH,
    netGross: "netto",
  };
}

function reset() {
  storage.clear();
  clearLaborSourceEvidenceStoreLocalForTests();
}

function emptyCatalogStore() {
  return {
    schemaVersion: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: T_FRESH, works: [] },
      dolnyslask: { region: "dolnyslask", updatedAt: T_FRESH, works: [] },
    },
  };
}

reset();
ok("router id", KB03_KNOWLEDGE_DESTINATION_ROUTER_ID.includes("KB-03"));
ok("not catalog-write-router", classifyKnowledge({ knowledgeType: "EVIDENCE" }).isCatalogWriteRouter === false);

// 1. LABOR_EVIDENCE routes + persists to Evidence store
{
  reset();
  const plan = routeKnowledge({ knowledgeType: "EVIDENCE" });
  ok("1 dest LABOR_SOURCE_EVIDENCE", plan.destination === "LABOR_SOURCE_EVIDENCE");
  ok("1 not canonical", plan.canonical === false);
  ok("1 authority observation", plan.authority === "EVIDENCE_OBSERVATION");
  const pers = persistKnowledge({
    knowledgeType: "EVIDENCE",
    laborEvidence: {
      workId: FIX_WORK,
      workNamePl: FIX_NAME,
      unit: FIX_UNIT,
      observations: [obs(41)],
    },
  });
  ok("1 wrote", pers.wrote === true, pers);
  ok("1 ourRateWritten false", pers.ourRateWritten === false);
  ok("1 store rows", loadLaborSourceEvidenceStoreLocal().observations.length >= 1);
}

// 2. IDENTITY_CANDIDATE → existing store destination, Owner required, no write
{
  const plan = routeKnowledge({ knowledgeType: "IDENTITY_CANDIDATE" });
  ok("2 dest IC store", plan.destination === "IDENTITY_CANDIDATE_STORE");
  ok("2 OWNER_REQUIRED", plan.status === "OWNER_REQUIRED");
  const pers = persistKnowledge({ knowledgeType: "IDENTITY_CANDIDATE", ownerAuthorized: false });
  ok("2 no write", pers.wrote === false);
  ok("2 identityCandidateMutated false", pers.identityCandidateMutated === false);
}

// 3. WORK_CATALOG routes through plan pointing at WC — Owner required, no auto write
{
  const plan = routeKnowledge({ knowledgeType: "WORK_CATALOG" });
  ok("3 dest WORK_CATALOG", plan.destination === "WORK_CATALOG");
  ok("3 OWNER_REQUIRED", plan.status === "OWNER_REQUIRED");
  const pers = persistKnowledge({ knowledgeType: "WORK_CATALOG" });
  ok("3 no write", pers.wrote === false);
  ok("3 workCatalogMutated false", pers.workCatalogMutated === false);
}

// 4. OUR_RATE does not bypass canonical authorization
{
  const plan = routeKnowledge({ knowledgeType: "OUR_RATE" });
  ok("4 OWNER_REQUIRED", plan.status === "OWNER_REQUIRED");
  ok("4 dest OUR_RATE_VIA_ACCEPT", plan.destination === "OUR_RATE_VIA_ACCEPT");
  const pers = persistKnowledge({
    knowledgeType: "OUR_RATE",
    ownerAuthorized: true,
    requestCanonicalWrite: true,
  });
  ok("4 still no auto write even with owner flag", pers.wrote === false);
  ok("4 ourRateWritten false", pers.ourRateWritten === false);
}

// 5. MATERIAL_PRICE → PM via Accept only
{
  const plan = routeKnowledge({ knowledgeType: "MATERIAL_PRICE" });
  ok("5 dest PRICE_MEMORY_VIA_ACCEPT", plan.destination === "PRICE_MEMORY_VIA_ACCEPT");
  ok("5 OWNER_REQUIRED", plan.status === "OWNER_REQUIRED");
  const pers = persistKnowledge({ knowledgeType: "MATERIAL_PRICE" });
  ok("5 no write", pers.wrote === false && pers.priceMemoryWritten === false);
}

// 6. UNKNOWN knowledge type fails closed
{
  const plan = classifyKnowledge({ knowledgeType: "NOT_A_REAL_TYPE" });
  ok("6 AMBIGUOUS_TYPE", plan.status === "AMBIGUOUS_TYPE");
  ok("6 null type", plan.knowledgeType === null);
}

// 7. ambiguous destination fails closed
{
  const plan = classifyKnowledge({
    knowledgeType: "EVIDENCE",
    intendedDestination: "WORK_CATALOG",
  });
  ok("7 AMBIGUOUS_DESTINATION", plan.status === "AMBIGUOUS_DESTINATION");
}

// 8. missing authority / Owner-required does not write
{
  const pers = persistKnowledge({ knowledgeType: "MARGIN" });
  ok("8 OWNER_REQUIRED", pers.status === "OWNER_REQUIRED");
  ok("8 no write", pers.wrote === false);
}

// 9. Owner-required transition does not write (IC / WC)
{
  const pers = persistKnowledge({
    knowledgeType: "IDENTITY_CANDIDATE",
    ownerAuthorized: true,
  });
  // Even with ownerAuthorized, GO48 does not perform Accept write
  ok("9 IC no auto Accept write", pers.wrote === false);
  ok("9 identityCandidateMutated false", pers.identityCandidateMutated === false);
}

// 10. Evidence never becomes OUR RATE
{
  reset();
  persistKnowledge({
    knowledgeType: "EVIDENCE",
    requestCanonicalWrite: true,
    laborEvidence: {
      workId: FIX_WORK,
      workNamePl: FIX_NAME,
      unit: FIX_UNIT,
      observations: [obs(50)],
    },
  });
  const forbidden = classifyKnowledge({
    knowledgeType: "EVIDENCE",
    requestCanonicalWrite: true,
  });
  ok("10 FORBIDDEN_CANONICAL_WRITE", forbidden.status === "FORBIDDEN_CANONICAL_WRITE");
  const store = emptyCatalogStore();
  ok(
    "10 lookup OUR RATE MISSING",
    lookupWorkRate(store, FIX_WORK, FIX_UNIT, Date.parse(T_FRESH)).status === "MISSING",
  );
  ok(
    "10 no WC LS key",
    localStorage.getItem(WORK_CATALOG_STORAGE_KEY) == null,
  );
}

// 11. SELL remains derived
{
  const plan = routeKnowledge({ knowledgeType: "SELL" });
  ok("11 DERIVED_NO_STORE", plan.destination === "DERIVED_NO_STORE");
  ok("11 authority DERIVED", plan.authority === "DERIVED");
  ok("11 not canonical", plan.canonical === false);
  const pers = persistKnowledge({ knowledgeType: "SELL" });
  ok("11 no write", pers.wrote === false);
}

// 12. duplicate / idempotent Evidence
{
  reset();
  const payload = {
    knowledgeType: "EVIDENCE",
    laborEvidence: {
      workId: FIX_WORK,
      workNamePl: FIX_NAME,
      unit: FIX_UNIT,
      observations: [obs(42)],
    },
  };
  const a = persistKnowledge(payload);
  const n1 = loadLaborSourceEvidenceStoreLocal().observations.length;
  const b = persistKnowledge(payload);
  const n2 = loadLaborSourceEvidenceStoreLocal().observations.length;
  ok("12 first wrote", a.wrote === true);
  ok("12 count stable", n2 === n1 && n1 >= 1, { n1, n2 });
  ok("12 second ourRate false", b.ourRateWritten === false);
}

// 13. unsupported plane returns UNSUPPORTED
{
  const plan = routeKnowledge({ knowledgeType: "TECHNOLOGY_PACK" });
  ok("13 UNSUPPORTED_DESTINATION", plan.status === "UNSUPPORTED_DESTINATION");
  ok("13 BOM unsupported", routeKnowledge({ knowledgeType: "BOM" }).status === "UNSUPPORTED_DESTINATION");
  ok(
    "13 G177 unsupported",
    routeKnowledge({ knowledgeType: "G177_MAPPING" }).status === "UNSUPPORTED_DESTINATION",
  );
}

// 14. reuse adapter for Evidence; not OUR RATE
{
  reset();
  persistKnowledge({
    knowledgeType: "LABOR_RATE",
    laborEvidence: {
      workId: FIX_WORK,
      workNamePl: FIX_NAME,
      unit: FIX_UNIT,
      observations: [obs(39)],
    },
  });
  const reuse = resolveKnowledgeReuse({
    knowledgeType: "EVIDENCE",
    workId: FIX_WORK,
    workNamePl: FIX_NAME,
    unit: FIX_UNIT,
  });
  ok("14 reuse hit", reuse.hit === true);
  ok("14 isOurRate false", reuse.isOurRate === false);
  ok("14 orphanReuse", reuse.orphanReuse === true);
}

ok(
  "control work unused",
  !String(storage.get(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) || "").includes(
    "cc-ic-accept-6c2b8e82",
  ),
);

console.log(`\nGO48 KDR TESTS: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
