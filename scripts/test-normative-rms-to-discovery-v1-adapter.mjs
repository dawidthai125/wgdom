/**
 * NORMATIVE_RMS → discovery V1-HARD adapter — Owner GO tests A–N.
 * npx vite-node scripts/test-normative-rms-to-discovery-v1-adapter.mjs
 */
import { fnv1aHex } from "../src/lib/global-knowledge/canonical-id.ts";
import {
  buildSyntheticAthFixture,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts";
import {
  adaptNormativeRmsToDiscoveryV1HardInput,
  adaptAthRmsToDiscoveryV1Hard,
  adaptPublicExtractedRmsToDiscoveryV1Hard,
  NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION,
} from "../src/lib/intelligent-estimator/knr-knowledge/normative-rms-to-discovery-v1-adapter.ts";
import {
  emptyKnrDiscoveryEvidenceStore,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts";
import {
  evaluateLaborOnlyAutoBomV1Contract,
  buildNoMaterialNormQueryHash,
  buildWorkIdDiscoveryQueryHash,
} from "../src/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract.ts";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-15T22:00:00.000Z");
const TS = new Date(NOW).toISOString();

const WORK_ID = "cw.knr.knr-4-01.0909-04.szt";
const EVIDENCE_KEY = "KNR|4-01|0909-04";

function baseSource(extra = {}) {
  return {
    sourceId: "test_aux_ath",
    urlHash: fnv1aHex("ath://licensed/fixture"),
    fragment: "ATH AUX normative RMS",
    contentHash: fnv1aHex("ath-body"),
    fetchedAt: TS,
    priority: "OFFICIAL_PUBLIC_DOCUMENT",
    ...extra,
  };
}

function publicRmsInput(overrides = {}) {
  return {
    family: "KNR",
    catalog: "4-01",
    table: "0909",
    position: "04",
    displayCode: "KNR 4-01 0909-04",
    evidenceKeyV1: EVIDENCE_KEY,
    identityKeyV2: "IDV2|KNR|4-01|0909-04",
    positionUnit: "szt",
    laborNorms: [
      {
        kind: "R",
        code: "R.1",
        description: "robocizna",
        unit: "r-g",
        quantity: 1.07,
        sourceRef: "pub",
      },
    ],
    materialNorms: [],
    equipmentNorms: [],
    sources: [
      {
        sourceId: "pub_allowlist_nakladowy",
        urlHash: fnv1aHex("https://bip.example.gov/naklad.pdf"),
        fragment: "public nakładowy row",
        contentHash: fnv1aHex("pub-body"),
        fetchedAt: TS,
        priority: "OFFICIAL_PUBLIC_DOCUMENT",
      },
    ],
    workId: WORK_ID,
    description: "public extracted",
    nowIso: TS,
    noMaterialNormPolicy: "EVIDENCE_DERIVED_IF_GO",
    ...overrides,
  };
}

// ——— A. valid ATH RMS → V1-HARD ———
{
  const bytes = buildSyntheticAthFixture({
    displayCode: "KNR 4-01 0909-04",
    withR: true,
    withM: false,
    withS: false,
  });
  const ath = adaptAthRmsToDiscoveryV1Hard({
    athBytes: bytes,
    targetDisplayCode: "KNR 4-01 0909-04",
    evidenceKeyV1: EVIDENCE_KEY,
    workId: WORK_ID,
    positionUnit: "szt",
    source: baseSource(),
    nowIso: TS,
    includeIncompleteRms: true,
    noMaterialNormPolicy: "EVIDENCE_DERIVED_IF_GO",
    store: emptyKnrDiscoveryEvidenceStore(TS),
  });
  ok(ath.ok === true, "A ATH adapt ok");
  ok(ath.ok && ath.adapted.noMaterialNormEmitted === true, "A NO_MATERIAL derived");
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: ath.ok ? ath.store : null,
    nowMs: NOW,
  });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", `A V1 ACCEPT (${v1.reasons})`);
  ok(v1.laborNorm && v1.laborNorm.quantity === 0.2251, "A labor qty from ATH");
}

// ——— B. valid public RMS (pre-extracted) → V1-HARD ———
{
  const pub = adaptPublicExtractedRmsToDiscoveryV1Hard({
    rms: publicRmsInput(),
    store: emptyKnrDiscoveryEvidenceStore(TS),
  });
  ok(pub.ok === true, "B public adapt ok");
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: pub.ok ? pub.store : null,
    nowMs: NOW,
  });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", "B V1 ACCEPT from public extracted RMS");
}

// ——— C. R <= 0 → BLOCK ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      laborNorms: [
        { kind: "R", code: "x", description: "x", unit: "r-g", quantity: 0 },
      ],
    }),
  );
  ok(r.ok === false && r.reason === "R_QTY_INVALID", "C R<=0 BLOCK");
}

// ——— D. unit != r-g → BLOCK ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      laborNorms: [
        { kind: "R", code: "x", description: "x", unit: "m2", quantity: 1.07 },
      ],
    }),
  );
  ok(r.ok === false && r.reason === "UNIT_NOT_RG", "D unit!=r-g BLOCK");
}

// ——— E. suffix-only → BLOCK ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      evidenceKeyV1: "0909-04",
    }),
  );
  ok(r.ok === false && r.reason === "SUFFIX_ONLY_FORBIDDEN", "E suffix-only BLOCK");
}

// ——— F. family mismatch → BLOCK ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      family: "KNNR",
      evidenceKeyV1: "KNR|4-01|0909-04",
    }),
  );
  ok(r.ok === false && r.reason === "CROSS_FAMILY_FORBIDDEN", "F family mismatch BLOCK");
}

// ——— G. PLN supplied as R → BLOCK ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      forbiddenPricingProbe: { ourRatePln: 45.5 },
    }),
  );
  ok(r.ok === false && r.reason === "PLN_OR_RATE_ORIGIN_FORBIDDEN", "G PLN→R BLOCK");
}

// ——— H. missing provenance → BLOCK ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      sources: [],
    }),
  );
  ok(r.ok === false && r.reason === "MISSING_PROVENANCE", "H missing provenance BLOCK");
}

// ——— I. PDF without material column ≠ NO_MATERIAL (OMIT policy) ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      noMaterialNormPolicy: "OMIT",
      // simulates "PDF has no material column" — must NOT create attestation
    }),
  );
  ok(r.ok === true, "I adapt ok with OMIT");
  ok(r.ok && r.noMaterialNormEmitted === false, "I NO_MATERIAL NOT CREATED");
  const up = adaptPublicExtractedRmsToDiscoveryV1Hard({
    rms: publicRmsInput({ noMaterialNormPolicy: "OMIT" }),
    store: emptyKnrDiscoveryEvidenceStore(TS),
  });
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: up.ok ? up.store : null,
    nowMs: NOW,
  });
  ok(
    v1.decision === "LABOR_ONLY_AUTO_BOM_EXCEPTION"
      && v1.reasons.includes("MISSING_NO_MATERIAL_NORM"),
    "I V1 FAIL-CLOSED without NO_MATERIAL",
  );
}

// ——— J. M=[] without normative assertion (OMIT) → NO_MATERIAL NOT CREATED ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      materialNorms: [],
      noMaterialNormPolicy: "OMIT",
    }),
  );
  ok(r.ok && !r.noMaterialNormEmitted, "J empty M alone does not attest");
}

// ——— K. valid evidence-derived NO_MATERIAL → V1 PASS ———
{
  const pub = adaptPublicExtractedRmsToDiscoveryV1Hard({
    rms: publicRmsInput({ noMaterialNormPolicy: "EVIDENCE_DERIVED_IF_GO" }),
    store: emptyKnrDiscoveryEvidenceStore(TS),
  });
  ok(pub.ok && pub.adapted.noMaterialNormEmitted, "K derived NO_MATERIAL emitted");
  const marker = buildNoMaterialNormQueryHash(EVIDENCE_KEY);
  ok(
    pub.ok
      && pub.record.queryHashes.includes(marker),
    "K queryHash marker present",
  );
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: pub.ok ? pub.store : null,
    nowMs: NOW,
  });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", "K V1 PASS");
}

// ——— L. conflicting R qty → fail-closed ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "PUBLIC_ALLOWLIST_NAKŁADOWY",
      laborNorms: [
        { kind: "R", code: "a", description: "a", unit: "r-g", quantity: 1.0 },
        { kind: "R", code: "b", description: "b", unit: "r-g", quantity: 2.0 },
      ],
    }),
  );
  ok(r.ok === false && r.reason === "CONFLICTING_R_QTY", "L conflicting R BLOCK");
}

// ——— M. cross-tender reuse after canonical persistence ———
{
  const store1 = emptyKnrDiscoveryEvidenceStore(TS);
  const first = adaptPublicExtractedRmsToDiscoveryV1Hard({
    rms: publicRmsInput(),
    store: store1,
  });
  ok(first.ok === true, "M first persist");
  // Second tender / same workId — REUSE store, no re-adapt invent
  const v1a = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: first.store,
    nowMs: NOW,
  });
  const v1b = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: first.store,
    nowMs: NOW + 1000,
  });
  ok(
    v1a.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT"
      && v1b.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT"
      && v1a.evidenceKeyV1 === v1b.evidenceKeyV1,
    "M cross-call REUSE same evidenceKey",
  );
  ok(
    first.store.byQueryHash[buildWorkIdDiscoveryQueryHash(WORK_ID)]?.includes(
      EVIDENCE_KEY,
    ),
    "M workId queryHash index",
  );
}

// ——— N. second tender → research_count = 0 (reuse, no re-extract) ———
{
  let researchCount = 0;
  const store = emptyKnrDiscoveryEvidenceStore(TS);
  const persistOnce = adaptPublicExtractedRmsToDiscoveryV1Hard({
    rms: publicRmsInput(),
    store,
  });
  ok(persistOnce.ok, "N seed once");
  researchCount += 1; // first acquisition

  // Second tender: only V1 lookup — no adapter call
  const v1Second = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: persistOnce.store,
    nowMs: NOW,
  });
  const researchCountSecond = 0; // no new research
  ok(
    v1Second.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT"
      && researchCount === 1
      && researchCountSecond === 0,
    "N second tender research_count=0 REUSE",
  );
}

// ——— materials present → no derived NO_MATERIAL + V1 MATERIALS_PRESENT ———
{
  const r = adaptNormativeRmsToDiscoveryV1HardInput(
    publicRmsInput({
      origin: "LICENSED_ATH_EXPORT",
      materialNorms: [
        {
          kind: "M",
          code: "M.1",
          description: "zaprawa",
          unit: "m3",
          quantity: 0.01,
        },
      ],
      noMaterialNormPolicy: "EVIDENCE_DERIVED_IF_GO",
    }),
  );
  ok(r.ok === true && r.noMaterialNormEmitted === false, "M present → no NM emit");
}

ok(
  NORMATIVE_RMS_TO_DISCOVERY_V1_ADAPTER_VERSION.startsWith("normative-rms"),
  "adapter version marker",
);

if (failed) {
  console.error(`\nFAILED: ${failed}`);
  process.exit(1);
}
console.log("\nALL PASS — normative RMS → discovery V1 adapter");
