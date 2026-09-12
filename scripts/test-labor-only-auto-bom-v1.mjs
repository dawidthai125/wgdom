/**
 * LABOR_ONLY_AUTO_BOM_V1 — fail-closed unit tests + 8-target smoke.
 * npx vite-node scripts/test-labor-only-auto-bom-v1.mjs
 */
import { fnv1aHex } from "../src/lib/global-knowledge/canonical-id.ts";
import {
  emptyKnrDiscoveryEvidenceStore,
  rebuildKnrDiscoveryIndexes,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts";
import {
  evaluateLaborOnlyAutoBomV1Contract,
  buildNoMaterialNormQueryHash,
  buildWorkIdDiscoveryQueryHash,
  evidenceKeyHintFromCanonicalWorkId,
} from "../src/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract.ts";
import {
  evaluateAutoBomContract,
  AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1,
  applyAutoBomAcceptToLine,
} from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { resolveLaborOnlyBomForWork } from "../src/lib/tender-position-cost/bom-technology-adapter.ts";
import { isExplicitLaborOnlyWork } from "../src/lib/tender-position-cost/labor-only-classification.ts";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-12T18:00:00.000Z");
const TS = new Date(NOW).toISOString();

const TARGETS = [
  {
    workId: "cw.knr.knr-4-01.0909-04.szt",
    evidenceKeyV1: "KNR|4-01|0909-04",
    unit: "szt",
    labor: 1.07,
  },
  {
    workId: "cw.knr.knr-4-03.1205-05-00.pomiar",
    evidenceKeyV1: "KNR|4-03|1205-05",
    unit: "pomiar",
    labor: 0.5,
  },
  {
    workId: "cw.knr.knr-4-03.1205-02.pomiar",
    evidenceKeyV1: "KNR|4-03|1205-02",
    unit: "pomiar",
    labor: 0.56,
  },
  {
    workId: "cw.knr.knr-4-01.0349-02.m3",
    evidenceKeyV1: "KNR|4-01|0349-02",
    unit: "m3",
    labor: 7.27,
  },
];

function makeRecord(t, overrides = {}) {
  const noMatHash = buildNoMaterialNormQueryHash(t.evidenceKeyV1);
  const base = {
    schemaVersion: 1,
    evidenceKeyV1: t.evidenceKeyV1,
    identityKeyV2: `IDV2|${t.evidenceKeyV1}`,
    family: "KNR",
    displayCode: t.evidenceKeyV1,
    description: t.workId,
    unit: t.unit,
    discoveryStatus: "DISCOVERED",
    lifecycleState: "ACTIVE",
    sources: [
      {
        sourceId: "test_hard",
        urlHash: fnv1aHex("https://example.gov/test.pdf"),
        fragment: `NO_MATERIAL_NORM · labor=${t.labor} r-g`,
        contentHash: fnv1aHex(`frag|${t.evidenceKeyV1}`),
        fetchedAt: TS,
        priority: "OFFICIAL_PUBLIC_DOCUMENT",
      },
    ],
    norms: {
      laborNorms: [
        {
          kind: "R",
          code: `R.${t.evidenceKeyV1}`,
          description: "labor",
          unit: "r-g",
          quantity: t.labor,
          sourceRef: "https://example.gov/test.pdf",
        },
      ],
      materialNorms: [],
      equipmentNorms: [],
    },
    queryHashes: [
      buildWorkIdDiscoveryQueryHash(t.workId),
      noMatHash,
      fnv1aHex(`LABOR|${t.labor}|${t.unit}`),
    ],
    freshness: "FRESH",
    contentHash: fnv1aHex(`NO_MATERIAL_NORM|LABOR|${t.evidenceKeyV1}|${t.labor}`),
    lastFetchedAt: TS,
    createdAt: TS,
    updatedAt: TS,
    catalogRevisionLink: null,
  };
  return { ...base, ...overrides, norms: { ...base.norms, ...(overrides.norms || {}) } };
}

function storeFromRecords(records) {
  const entries = {};
  for (const r of records) entries[r.evidenceKeyV1] = r;
  const idx = rebuildKnrDiscoveryIndexes(entries);
  return {
    ...emptyKnrDiscoveryEvidenceStore(TS),
    updatedAt: TS,
    entries,
    ...idx,
  };
}

// --- identity hints ---
ok(
  evidenceKeyHintFromCanonicalWorkId("cw.knr.knr-4-03.1205-05-00.pomiar") === "KNR|4-03|1205-05",
  "hint strips -00 suffix for 1205-05-00",
);
ok(
  evidenceKeyHintFromCanonicalWorkId("cw.knr.knr-4-01.0909-04.szt") === "KNR|4-01|0909-04",
  "hint 0909-04",
);

// --- 8 targets ACCEPT (4 work families) ---
{
  const store = storeFromRecords(TARGETS.map((t) => makeRecord(t)));
  for (const t of TARGETS) {
    ok(!isExplicitLaborOnlyWork(t.workId), `${t.workId} not on Owner allowlist`);
    const v1 = evaluateLaborOnlyAutoBomV1Contract({
      workId: t.workId,
      unit: t.unit,
      discoveryStore: store,
      nowMs: NOW,
    });
    ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", `V1 ACCEPT ${t.workId}`);
    ok(v1.laborNorm?.quantity === t.labor, `laborNorm unchanged ${t.labor}`);
    ok(v1.materialsEmpty && v1.noMaterialNorm, `empty mats + NO_MATERIAL_NORM ${t.workId}`);
    ok(v1.ownerRuntimeDependency === 0, `ownerRuntimeDependency=0 ${t.workId}`);

    const bom = evaluateAutoBomContract({
      line: {
        catalogWorkId: t.workId,
        unit: t.unit,
        quantity: 1,
        matchMethod: "exact_knr",
        matchConfidence: "high",
        isNoise: false,
      },
      nowMs: NOW,
      packs: [],
      discoveryStore: store,
    });
    ok(bom.decision === "AUTO_BOM_ACCEPT", `AUTO_BOM ACCEPT ${t.workId}`);
    ok(bom.bomStatus === "LABOR_ONLY", `bomStatus LABOR_ONLY ${t.workId}`);
    ok(
      bom.provenance?.ruleId === AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1,
      `ruleId V1 ${t.workId}`,
    );
    const resolved = resolveLaborOnlyBomForWork({
      workId: t.workId,
      unit: t.unit,
      positionQuantity: 1,
    });
    ok(resolved.status === "LABOR_ONLY", `Position Cost LABOR_ONLY ${t.workId}`);
    ok((resolved.materials || []).length === 0, `no invented materials ${t.workId}`);
  }
}

// --- fail-closed matrix ---
{
  const base = TARGETS[0];
  const softStore = storeFromRecords([
    makeRecord(base, {
      norms: {
        laborNorms: [],
        materialNorms: [],
        equipmentNorms: [],
      },
    }),
  ]);
  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: base.unit,
      discoveryStore: softStore,
      nowMs: NOW,
    }).reasons.includes("SOFT_ONLY")
      || evaluateLaborOnlyAutoBomV1Contract({
          workId: base.workId,
          unit: base.unit,
          discoveryStore: softStore,
          nowMs: NOW,
        }).reasons.includes("MISSING_LABOR_NORM"),
    "SOFT_ONLY / missing labor FAIL",
  );

  const noLaborStore = storeFromRecords([
    makeRecord(base, {
      norms: {
        laborNorms: [{ kind: "R", code: "x", description: "x", unit: "r-g", quantity: 0 }],
        materialNorms: [],
        equipmentNorms: [],
      },
    }),
  ]);
  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: base.unit,
      discoveryStore: noLaborStore,
      nowMs: NOW,
    }).decision === "LABOR_ONLY_AUTO_BOM_EXCEPTION",
    "missing laborNorm (qty=0) FAIL",
  );

  const noMarker = makeRecord(base);
  noMarker.queryHashes = [buildWorkIdDiscoveryQueryHash(base.workId)];
  noMarker.sources = [
    {
      ...noMarker.sources[0],
      fragment: "labor only without marker",
    },
  ];
  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: base.unit,
      discoveryStore: storeFromRecords([noMarker]),
      nowMs: NOW,
    }).reasons.includes("MISSING_NO_MATERIAL_NORM"),
    "missing NO_MATERIAL_NORM FAIL",
  );

  const withMat = makeRecord(base, {
    norms: {
      laborNorms: makeRecord(base).norms.laborNorms,
      materialNorms: [
        {
          kind: "M",
          code: "M.fake",
          description: "invented",
          unit: "kg",
          quantity: 1,
        },
      ],
      equipmentNorms: [],
    },
  });
  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: base.unit,
      discoveryStore: storeFromRecords([withMat]),
      nowMs: NOW,
    }).reasons.includes("MATERIALS_PRESENT"),
    "materials present FAIL",
  );

  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: "not-a-canonical-id",
      unit: "szt",
      discoveryStore: storeFromRecords([makeRecord(base)]),
      nowMs: NOW,
    }).decision === "LABOR_ONLY_AUTO_BOM_EXCEPTION",
    "ambiguous / no identity FAIL",
  );

  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: "",
      discoveryStore: storeFromRecords([makeRecord(base)]),
      nowMs: NOW,
    }).reasons.includes("INVALID_UNIT") || evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: "",
      discoveryStore: storeFromRecords([makeRecord(base)]),
      nowMs: NOW,
    }).reasons.includes("NO_UNIT"),
    "invalid unit FAIL",
  );

  const conflict = makeRecord(base, { discoveryStatus: "CONFLICT" });
  ok(
    evaluateLaborOnlyAutoBomV1Contract({
      workId: base.workId,
      unit: base.unit,
      discoveryStore: storeFromRecords([conflict]),
      nowMs: NOW,
    }).reasons.includes("CONFLICTING_EVIDENCE"),
    "conflicting evidence FAIL",
  );
}

// --- provisional cc-w2 unchanged (no V1 evidence) ---
{
  const empty = emptyKnrDiscoveryEvidenceStore(TS);
  const bom = evaluateAutoBomContract({
    line: {
      catalogWorkId: "cc-w2-przygotowanie-osprzet-NOT-ON-LIST-fake",
      unit: "kpl",
      quantity: 1,
      matchMethod: "exact_knr",
      matchConfidence: "high",
    },
    nowMs: NOW,
    packs: [],
    discoveryStore: empty,
  });
  // If id looks provisional, exception; otherwise MISSING_BOM — either way not invent accept
  ok(bom.decision === "BOM_EXCEPTION", "no invent AUTO_BOM without evidence");
}

// --- idempotence ---
{
  const t = TARGETS[0];
  const store = storeFromRecords([makeRecord(t)]);
  const line0 = {
    catalogWorkId: t.workId,
    unit: t.unit,
    quantity: 1,
    matchMethod: "exact_knr",
    matchConfidence: "high",
    isNoise: false,
  };
  const r1 = evaluateAutoBomContract({ line: line0, nowMs: NOW, packs: [], discoveryStore: store });
  const line1 = applyAutoBomAcceptToLine(line0, r1);
  const r2 = evaluateAutoBomContract({ line: line1, nowMs: NOW + 1000, packs: [], discoveryStore: store });
  ok(r2.idempotentNoop === true, "second AUTO_BOM idempotent noop");
  const line2 = applyAutoBomAcceptToLine(line1, r2);
  ok(line2 === line1, "no duplicate side effect on line");
}

console.log(failed === 0 ? "\nALL PASS" : `\nFAILED=${failed}`);
process.exit(failed === 0 ? 0 : 1);
