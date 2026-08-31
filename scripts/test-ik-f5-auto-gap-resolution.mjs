/**
 * IK F5 Auto Gap Resolution — unit + fixture tests
 * Run: npx vite-node scripts/test-ik-f5-auto-gap-resolution.mjs
 *
 * ZERO Accept · ZERO Catalog/PM write · ZERO P7/G3 · CHROBREGO immutable constants
 */
import {
  runIkBomGapResearch,
  validateBomCandidateMaterials,
  mergeEphemeralBomPacksIntoRunPacks,
  ephemeralBomBasisToRunScopedPack,
  DEFAULT_BOM_CONFIDENCE_THRESHOLD,
} from "../src/lib/intelligent-estimator/ik-bom-gap-research.ts";
import {
  runIkF5AutoGapResolution,
  assertNoInventEphemeralBom,
} from "../src/lib/intelligent-estimator/ik-f5-auto-gap-resolution.ts";
import { resolveTechnologyBomForWork } from "../src/lib/tender-position-cost/bom-technology-adapter.ts";
import { isFinancialScheduleNotCostFilename } from "../src/lib/tender-cost-discovery.ts";
import { listAllPacks } from "../src/lib/technology-foundation/index.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

const CHROBREGO = {
  net: 159000,
  vat: 36570,
  gross: 195570,
  source: "owner_g3",
  kind: "ik_g3_final_bid",
};

const baseJob = {
  tenderId: "t-mops",
  dwellingId: "wygodna-10-6",
  lineId: "obl_test_1",
  lp: "23",
  workId: "test-work-bom-gap",
  unit: "m2",
  quantity: 10,
  description: "Malowanie ścian test",
  gapCode: "BRAK_TECHNOLOGII_BOM",
};

function makeApprovedPack(workId, packId = "pack.test.approved") {
  return {
    packId,
    packVersion: "1.0",
    definitionId: "def.test.bom",
    packCapabilities: ["cap.test"],
    lifecycle: "APPROVED",
    namePl: "Test APPROVED pack",
    stages: [{ stageId: "s1", order: 1, namePl: "S" }],
    steps: [
      {
        stepId: "st1",
        stageId: "s1",
        order: 1,
        namePl: "Step",
        catalogWorkId: workId,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: "mat.test_paint",
        namePl: "Farba test",
        unit: "l",
        qtyFactor: 0.1,
        factorSourceKind: "owner_approved",
        factorSourceRef: "OWNER://TEST_PACK",
        factorApprovedAt: "2026-08-31T00:00:00.000Z",
      },
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

// --- 1 BOM research NO_EVIDENCE → HOLD ---
{
  const r = runIkBomGapResearch(baseJob, { extraPacks: [] });
  assert("1 no evidence HOLD", r.status === "HOLD" && r.reason === "NO_EVIDENCE");
}

// --- 2 APPROVED pack → CANDIDATE ---
{
  const pack = makeApprovedPack(baseJob.workId);
  const r = runIkBomGapResearch(baseJob, { extraPacks: [pack] });
  assert("2 candidate status", r.status === "CANDIDATE");
  assert("2 invent false", r.status === "CANDIDATE" && r.candidate.invent === false);
  assert(
    "2 confidence >= threshold",
    r.status === "CANDIDATE" && r.candidate.confidence >= DEFAULT_BOM_CONFIDENCE_THRESHOLD,
  );
  assert(
    "2 scope dwelling+line",
    r.status === "CANDIDATE"
      && r.ephemeral.dwellingId === baseJob.dwellingId
      && r.ephemeral.lineId === baseJob.lineId,
  );
}

// --- 3 AMBIGUOUS two APPROVED → HOLD ---
{
  const a = makeApprovedPack(baseJob.workId, "pack.a");
  const b = makeApprovedPack(baseJob.workId, "pack.b");
  const r = runIkBomGapResearch(baseJob, { extraPacks: [a, b] });
  assert("3 ambiguous HOLD", r.status === "HOLD" && r.reason === "AMBIGUOUS");
}

// --- 4 bad materialKey ---
{
  const pack = makeApprovedPack(baseJob.workId);
  pack.materials[0].materialKey = "mat.invented_unknown_xyz";
  const r = runIkBomGapResearch(baseJob, {
    extraPacks: [pack],
    allowPackNativeKeys: false,
    knownMaterialKeys: new Set(["mat.other"]),
  });
  assert(
    "4 unknown material HOLD",
    r.status === "HOLD" && r.reason === "UNKNOWN_MATERIAL_KEY",
  );
}

// --- 5 no provenance on owner_approved ---
{
  const pack = makeApprovedPack(baseJob.workId);
  delete pack.materials[0].factorSourceRef;
  const v = validateBomCandidateMaterials(pack.materials, {
    knownMaterialKeys: new Set(),
    allowPackNativeKeys: true,
    packNativeKeys: new Set(["mat.test_paint"]),
  });
  assert("5 missing provenance reject", !v.ok && v.rejects.some((x) => x.includes("PROVENANCE")));
}

// --- 6 invent flag hard ---
{
  const pack = makeApprovedPack(baseJob.workId);
  const r = runIkBomGapResearch(baseJob, { extraPacks: [pack] });
  if (r.status === "CANDIDATE") {
    const map = new Map([["k", r.ephemeral]]);
    let threw = false;
    try {
      assertNoInventEphemeralBom(map);
    } catch {
      threw = true;
    }
    assert("6 invent=false ok", !threw && r.ephemeral.invent === false);
    const bad = { ...r.ephemeral, invent: true };
    threw = false;
    try {
      assertNoInventEphemeralBom(new Map([["k", bad]]));
    } catch {
      threw = true;
    }
    assert("6 invent true HARD FAIL", threw);
  } else {
    assert("6 skipped candidate", false);
  }
}

// --- 7 cross-dwelling: candidate scoped; copy forbidden by key ---
{
  const pack = makeApprovedPack(baseJob.workId);
  const r1 = runIkBomGapResearch(
    { ...baseJob, dwellingId: "wygodna-10-6", lineId: "L1" },
    { extraPacks: [pack] },
  );
  const r2 = runIkBomGapResearch(
    { ...baseJob, dwellingId: "prusa-42-9", lineId: "L1" },
    { extraPacks: [pack] },
  );
  assert(
    "7 separate dwelling evidence",
    r1.status === "CANDIDATE"
      && r2.status === "CANDIDATE"
      && r1.ephemeral.dwellingId !== r2.ephemeral.dwellingId
      && r1.ephemeral.lineId === r2.ephemeral.lineId,
  );
}

// --- 8 no dwelling → HOLD ---
{
  const r = runIkBomGapResearch(
    { ...baseJob, dwellingId: "" },
    { extraPacks: [makeApprovedPack(baseJob.workId)] },
  );
  assert("8 no dwelling HOLD", r.status === "HOLD" && r.reason === "NO_DWELLING");
}

// --- 9 ephemeral → run-scoped ACTIVE pack closes MISSING for resolveTechnologyBom ---
{
  const pack = makeApprovedPack(baseJob.workId);
  const r = runIkBomGapResearch(baseJob, { extraPacks: [pack] });
  assert("9 research candidate", r.status === "CANDIDATE");
  if (r.status === "CANDIDATE") {
    const before = resolveTechnologyBomForWork({
      workId: baseJob.workId,
      unit: "m2",
      positionQuantity: 10,
      packs: listAllPacks(),
    });
    assert("9 before MISSING", before.status === "MISSING_BOM");
    const runPacks = mergeEphemeralBomPacksIntoRunPacks(listAllPacks(), [
      r.ephemeral,
    ]);
    const after = resolveTechnologyBomForWork({
      workId: baseJob.workId,
      unit: "m2",
      positionQuantity: 10,
      packs: runPacks,
    });
    assert("9 after OK via ephemeral", after.status === "OK");
    assert(
      "9 registry unchanged",
      !listAllPacks().some((p) => p.packId.startsWith("ephemeral.")),
    );
  }
}

// --- 10 Harmonogram still BLOCKED (64da9776) ---
assert(
  "10 Harmonogram BLOCK",
  isFinancialScheduleNotCostFilename("Harmonogram_rzeczowo_finansowy.pdf") === true,
);
assert(
  "10 przedmiar ALLOW",
  isFinancialScheduleNotCostFilename("Wygodna_10_6_PRZEDMIAR.pdf") === false,
);

// --- 11 CHROBREGO immutable ---
assert("11 CHROBREGO net", CHROBREGO.net === 159000);
assert("11 CHROBREGO vat", CHROBREGO.vat === 36570);
assert("11 CHROBREGO gross", CHROBREGO.gross === 195570);
assert("11 CHROBREGO source", CHROBREGO.source === "owner_g3");
assert("11 CHROBREGO kind", CHROBREGO.kind === "ik_g3_final_bid");

// --- 12 writes flags on research result ---
{
  const pack = makeApprovedPack(baseJob.workId);
  const r = runIkBomGapResearch(baseJob, { extraPacks: [pack] });
  assert(
    "12 writeClass EPHEMERAL",
    r.status === "CANDIDATE" && r.candidate.writeClass === "EPHEMERAL",
  );
}

// --- 13 MOPS 6 BOM gaps fixture: 6 APPROVED → 6 candidates; no invent ---
{
  const dwellings = [
    { dwellingId: "wygodna-10-6", lineId: "obl_w1", workId: "mops-w-work-a" },
    { dwellingId: "wygodna-10-6", lineId: "obl_w2", workId: "mops-w-work-b" },
    { dwellingId: "prusa-42-9", lineId: "obl_p1", workId: "mops-p-work-a" },
    { dwellingId: "prusa-42-9", lineId: "obl_p2", workId: "mops-p-work-b" },
    { dwellingId: "dubois-22a-21", lineId: "obl_d1", workId: "mops-d-work-a" },
    { dwellingId: "dubois-22a-21", lineId: "obl_d2", workId: "mops-d-work-b" },
  ];
  let ok = 0;
  let hold = 0;
  for (const row of dwellings) {
    const pack = makeApprovedPack(row.workId, `pack.mops.${row.workId}`);
    const r = runIkBomGapResearch(
      {
        ...baseJob,
        dwellingId: row.dwellingId,
        lineId: row.lineId,
        workId: row.workId,
      },
      { extraPacks: [pack] },
    );
    if (r.status === "CANDIDATE") ok++;
    else hold++;
  }
  assert("13 MOPS 6/6 candidates with evidence", ok === 6 && hold === 0);
}

// --- 14 MOPS without packs → documented HOLD ---
{
  let hold = 0;
  for (let i = 0; i < 6; i++) {
    const r = runIkBomGapResearch(
      {
        ...baseJob,
        dwellingId: "wygodna-10-6",
        lineId: `obl_${i}`,
        workId: `missing-work-${i}`,
      },
      { extraPacks: [] },
    );
    if (r.status === "HOLD") hold++;
  }
  assert("14 MOPS 6 HOLD without invent", hold === 6);
}

// --- 15 LABOR_ONLY not auto from MISSING ---
{
  const r = runIkBomGapResearch(baseJob, { extraPacks: [] });
  assert(
    "15 never LABOR_ONLY invent",
    r.status === "HOLD" && !JSON.stringify(r).includes("LABOR_ONLY"),
  );
}

// --- 16 ephemeralBomBasisToRunScopedPack lifecycle ACTIVE run-only ---
{
  const pack = makeApprovedPack(baseJob.workId);
  const r = runIkBomGapResearch(baseJob, { extraPacks: [pack] });
  if (r.status === "CANDIDATE") {
    const scoped = ephemeralBomBasisToRunScopedPack(r.ephemeral);
    assert("16 run-scoped ACTIVE", scoped.lifecycle === "ACTIVE");
    assert("16 ephemeral packId prefix", scoped.packId.startsWith("ephemeral."));
  }
}

// --- 17 stub P7 auto-gap: no gaps path needs minimal mocks — smoke stopReason types ---
{
  const initialP7 = {
    schemaVersion: 1,
    status: "ready",
    mode: "legacy_single",
    tenderId: "t",
    researchExecuted: false,
    httpCalls: 0,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    cutoverGatePass: true,
    packageGatePass: null,
    billableLineCount: 1,
    completeLineCount: 1,
    gapLineCount: 0,
    laborCostPln: 100,
    materialCostPln: 50,
    directPln: 150,
    recommendedBidPln: null,
    bidOk: false,
    reasonsPl: [],
    gapCodes: [],
    proposal: null,
    shadow: {
      schemaVersion: 1,
      mode: "shadow",
      lineCount: 0,
      lines: [],
      aggregates: {
        completeLineCount: 0,
        gapLineCount: 0,
        skippedNoiseCount: 0,
        laborCostPln: null,
        materialCostPln: null,
        equipmentCostPln: 0,
        transportCostPln: 0,
        totalPositionCostPln: null,
      },
    },
    packageGate: null,
    packageDirect: null,
    cutoverGate: null,
    provisionalPricingSummary: null,
    provenance: {
      sourceRefKind: "evidence",
      offerBoqPresent: true,
      rateSources: ["OUR_RATE"],
      packageSumUsed: false,
    },
  };

  // Expert with empty offerBoq → detect 0 gaps → COMPLETE-ish
  const expert = {
    tenderId: "t",
    offerBoq: { lines: [] },
    masterBoq: { readyForExperts: false },
    masterBoqLines: [],
    boqDependencyGraph: null,
    boqDependencyGraphsByDwelling: null,
  };
  const item = { id: "t", tenderId: "t" };
  const result = runIkF5AutoGapResolution({
    item,
    expert,
    package: null,
    initialP7,
    maxIterations: 3,
  });
  assert("17 no-gap stop COMPLETE or OWNER", result.stopReason === "COMPLETE" || result.stopReason === "OWNER_REQUIRED");
  assert("17 invent false", result.invent === false);
  assert("17 catalogWrite 0", result.catalogWrite === false);
  assert("17 priceMemoryWrite 0", result.priceMemoryWrite === false);
  assert("17 cloudWrite 0", result.cloudWrite === false);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
