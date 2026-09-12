/**
 * APF Evidence → canonical durable Evidence persist (SEPA 1301 pomiar).
 * ZERO Accept · ZERO OUR RATE · ZERO cloud push · ZERO fixture-as-production.
 *
 * npx vite-node scripts/test-apf-labor-evidence-persist-01.mjs
 */
import {
  persistApfLaborEvidenceToCanonical,
  mapApfEvidenceToCanonicalObservations,
  resolveApfEvidenceCatalogUnit,
  resolveAutonomousLaborResearchPath,
  APF_EVIDENCE_PARSER_VERSION,
  APF_EVIDENCE_RESEARCH_METHOD,
} from "../src/lib/intelligent-estimator/index.ts";
import {
  assertLaborSourceEvidenceHostLock,
  clearLaborSourceEvidenceStoreLocalForTests,
  loadLaborSourceEvidenceStoreLocal,
  isLaborSourceEvidenceKeep5SourceId,
  isLaborSourceEvidenceRuntimeSourceId,
} from "../src/lib/labor-source-evidence/index.ts";
import { isP527MeasurementOutOfResearch } from "../src/lib/work-catalog/work-rate-discovery-allowlist.ts";
import { assertApfHostsNotInKeep4 } from "../src/lib/tender-position-cost/autonomous-pricing-fallback/apf-source-authorization.ts";
import { lookupWorkRate, normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  SEPA_KNNR_1301_01_WORK_ID,
  buildSepaKnr1301PomiarCatalogWork,
  getSepaKnr1301WorkSpec,
} from "../src/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog.ts";

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

const T = "2026-09-10T23:30:00.000Z";
const spec = getSepaKnr1301WorkSpec(SEPA_KNNR_1301_01_WORK_ID);
const WORK_ID = SEPA_KNNR_1301_01_WORK_ID;
const NAME = spec.namePl;
const UNIT = "pomiar";

const apfEvidence = [
  {
    evidenceId: "apf-energospin_pl-pomiar-rezystancji-izolacji-obwodow-1-fazowych-10",
    kind: "MARKET_LABOR_OBS",
    summaryPl: "Pomiar rezystancji izolacji obwodów 1-fazowych",
    sourceId: "energospin_pl",
    retrievedAt: "2026-09-10",
    marketUnitRatePln: 10,
    marketUnit: "pomiar",
    sourceUrl: "https://www.energospin.pl/cennik/",
  },
  {
    evidenceId: "apf-energospin_pl-pomiar-rezystancji-izolacji-obwodow-3-fazowych-10",
    kind: "MARKET_LABOR_OBS",
    summaryPl: "Pomiar rezystancji izolacji obwodów 3-fazowych",
    sourceId: "energospin_pl",
    retrievedAt: "2026-09-10",
    marketUnitRatePln: 10,
    marketUnit: "pomiar",
    sourceUrl: "https://www.energospin.pl/cennik/",
  },
];

clearLaborSourceEvidenceStoreLocalForTests();

// 17–19 policy unchanged
ok("17 P5.27 pomiar OUT_OF_RESEARCH", isP527MeasurementOutOfResearch({ unit: UNIT, namePl: NAME }) === true);
ok(
  "18–19 APF path fallback not KEEP-4 bypass",
  resolveAutonomousLaborResearchPath({ unit: UNIT, namePl: NAME }).path ===
    "APF_MEASUREMENT_EPHEMERAL" && assertApfHostsNotInKeep4() === true,
);
ok(
  "APF sourceId Evidence-allowed but not KEEP-5",
  isLaborSourceEvidenceRuntimeSourceId("energospin_pl") &&
    !isLaborSourceEvidenceKeep5SourceId("energospin_pl"),
);
ok(
  "host lock accepts APF energospin",
  assertLaborSourceEvidenceHostLock({
    sourceId: "energospin_pl",
    sourceUrl: "https://www.energospin.pl/cennik/",
  }).ok === true,
);
ok(
  "host lock rejects arbitrary",
  assertLaborSourceEvidenceHostLock({
    sourceId: "random_host",
    sourceUrl: "https://example.com/",
  }).ok === false,
);
ok("catalog unit stays pomiar", resolveApfEvidenceCatalogUnit("pomiar") === "pomiar");

// 10 invalid identity
{
  const r = persistApfLaborEvidenceToCanonical({
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
    apfEvidence,
    identityTrusted: false,
    nowIso: T,
  });
  ok("10 invalid identity fail-closed", r.ok === false && r.failReason === "INVALID_IDENTITY", r);
}

// 11 invalid unit
{
  const r = persistApfLaborEvidenceToCanonical({
    workId: WORK_ID,
    workNamePl: NAME,
    unit: "",
    apfEvidence,
    identityTrusted: true,
    nowIso: T,
  });
  ok("11 invalid unit fail-closed", r.ok === false && r.failReason === "INVALID_UNIT", r);
}

// missing provenance / observedAt
{
  const bad = [
    {
      ...apfEvidence[0],
      sourceUrl: "",
    },
  ];
  const r = mapApfEvidenceToCanonicalObservations({
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
    apfEvidence: bad,
  });
  ok("missing provenance fail-closed", r.ok === false && r.reason === "MISSING_PROVENANCE", r);
}
{
  const bad = [{ ...apfEvidence[0], retrievedAt: "" }];
  const r = mapApfEvidenceToCanonicalObservations({
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
    apfEvidence: bad,
  });
  ok("8/ missing observedAt fail-closed", r.ok === false && r.reason === "MISSING_OBSERVED_AT", r);
}

// 9 conflict
{
  const conflict = [
    apfEvidence[0],
    { ...apfEvidence[1], marketUnitRatePln: 99, evidenceId: "apf-conflict-99" },
  ];
  const r = persistApfLaborEvidenceToCanonical({
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
    apfEvidence: conflict,
    identityTrusted: true,
    nowIso: T,
  });
  ok("9 conflict → fail-closed", r.ok === false && r.failReason === "PRICE_CONFLICT", r);
}

// unauthorized source (not OWNER invent / not KEEP-5 fake as APF)
{
  const bad = [
    {
      ...apfEvidence[0],
      sourceId: "kb_pl",
      sourceUrl: "https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/",
    },
  ];
  const r = persistApfLaborEvidenceToCanonical({
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
    apfEvidence: bad,
    identityTrusted: true,
    nowIso: T,
  });
  ok(
    "KEEP-5 via APF adapter rejected (UNAUTHORIZED_SOURCE)",
    r.ok === false && r.failReason === "UNAUTHORIZED_SOURCE",
    r,
  );
}

// 1–7 + 12–16 happy path
clearLaborSourceEvidenceStoreLocalForTests();
const first = persistApfLaborEvidenceToCanonical({
  workId: WORK_ID,
  workNamePl: NAME,
  unit: UNIT,
  apfEvidence,
  identityTrusted: true,
  nowIso: T,
  marginPct: 20,
  persist: true,
});
ok("1 APF → canonical writer ok", first.ok === true && first.cas?.ok === true, first);
ok(
  "2–6 provenance/observedAt/identity/unit/source",
  first.readBack.length >= 1 &&
    first.readBack.every(
      (o) =>
        o.workId === WORK_ID &&
        o.unit === "pomiar" &&
        o.sourceId === "energospin_pl" &&
        o.sourceUrl.includes("energospin") &&
        o.observedAt &&
        o.provenance.sectionHint === APF_EVIDENCE_RESEARCH_METHOD &&
        (o.parserVersion === APF_EVIDENCE_PARSER_VERSION || o.provenance.fetchTraceId),
    ),
  first.readBack,
);
ok(
  "12 read-back canonical",
  first.readBack.every((o) => o.qualityStatus === "VALID" && o.pricePoint === 10),
  first.readBack,
);
ok(
  "13 durable Evidence → Candidate",
  first.candidateFromDurable != null &&
    first.candidateFromDurable.workId === WORK_ID &&
    first.candidateFromDurable.unit === "pomiar" &&
    first.candidateFromDurable.marketBaseRatePln === 10 &&
    first.candidateFromDurable.observations.length >= 1,
  first.candidateFromDurable,
);
ok("14 no OUR RATE", first.ourRateWritten === false);
ok("15 no AUT_R1 Accept", first.acceptExecuted === false);
ok("16 no Finance/BOM/cloud", first.workCatalogMutated === false && first.productionCloudPush === false);

const storeAfter = normalizeWorkCatalogStore({
  schemaVersion: 1,
  activeRegion: "wroclaw",
  catalogs: {
    wroclaw: {
      region: "wroclaw",
      updatedAt: T,
      works: [
        {
          ...buildSepaKnr1301PomiarCatalogWork(spec, T),
          commercialPricing: { marginPct: 20, updatedAt: T, source: "owner" },
        },
      ],
    },
  },
});
const rateLookup = lookupWorkRate(storeAfter, WORK_ID, "pomiar", Date.parse(T));
ok(
  "14b Catalog OUR RATE still MISSING",
  rateLookup.status === "MISSING" || rateLookup.ourRatePln == null,
  rateLookup,
);

// 7 idempotent
const beforeCount = loadLaborSourceEvidenceStoreLocal().observations.length;
const second = persistApfLaborEvidenceToCanonical({
  workId: WORK_ID,
  workNamePl: NAME,
  unit: UNIT,
  apfEvidence,
  identityTrusted: true,
  nowIso: T,
  persist: true,
});
const afterCount = loadLaborSourceEvidenceStoreLocal().observations.length;
ok("7 idempotent duplicate write", second.ok === true && afterCount === beforeCount, {
  beforeCount,
  afterCount,
});

// 8 fresh stronger protected — try overwrite VALID with STALE same dedupe via weaker quality
{
  const weaker = first.readBack.map((o) => ({
    ...o,
    qualityStatus: "STALE",
    retrievedAt: "2020-01-01T00:00:00.000Z",
    evidenceId: `stale-${o.evidenceId}`,
  }));
  const { upsertLaborSourceEvidenceObservations } = await import(
    "../src/lib/labor-source-evidence/index.ts"
  );
  const cas = upsertLaborSourceEvidenceObservations({
    observations: weaker,
    nowIso: "2020-01-01T00:00:00.000Z",
  });
  const still = loadLaborSourceEvidenceStoreLocal().observations.filter(
    (o) => o.workId === WORK_ID && o.sourceId === "energospin_pl",
  );
  ok(
    "8 fresh stronger evidence protected",
    cas.ok === true && still.every((o) => o.qualityStatus === "VALID"),
    still.map((o) => o.qualityStatus),
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
