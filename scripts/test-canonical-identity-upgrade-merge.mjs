/**
 * Canonical identity upgrade merge — PASS/FAIL matrix + MOPS prod snapshot sim (read-only).
 *
 * npx vite-node scripts/test-canonical-identity-upgrade-merge.mjs
 *
 * ZERO production write.
 */
import {
  evaluateCanonicalIdentityUpgradeMerge,
  applyCanonicalIdentityFieldsFromLocal,
  mergeOfferBoqPreferringCanonicalIdentityUpgrades,
  mergeTenderPackageOnScoreTie,
  mergeMultiDwellingPackageStore,
  scoreTenderPackageRichness,
} from "../src/lib/multi-dwelling/index.ts";
import { applyCompoundLaborLeafRebindToLine } from "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts";
import { loadEnv } from "vite";

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

const TARGETS = {
  "1204-02": "cw.knr.knr-4-01.1204-02.m2",
  "1505-01": "cw.knr.knr-2-02.1505-01.m2",
  "1134-01": "cw.knr.nnrnkb.1134-01.m2",
  "1134-02": "cw.knr.nnrnkb.1134-02.m2",
};
const LEAF_0815 = "cw.knr.knr-2-02.0815-05.m2";
const PARENT_GLADZIE = "legacy-gladzie_tynki-m2";
const PARENT_MALOWANIE = "legacy-malowanie-m2";

function baseLine(overrides = {}) {
  return {
    lineId: "obl_test_1",
    lp: "1",
    description: "Malowanie ścian emulsją KNR 4-01 1204-02",
    quantity: 10,
    quantityRaw: "10",
    unit: "m2",
    catalogWorkId: PARENT_GLADZIE,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "medium",
    candidateMatches: [
      {
        catalogWorkId: PARENT_GLADZIE,
        workNamePl: PARENT_GLADZIE,
        workCategory: "",
        tradeId: null,
        score: 1,
        role: "primary",
        matchedBy: "catalog_map",
        matchConfidence: "medium",
        rationale: "map",
      },
    ],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "",
    aiConfidence: "medium",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...overrides,
  };
}

function makeAcceptResult(leafWorkId, parentWorkId, ruleId, extraReasons = []) {
  return {
    decision: "COMPOUND_LEAF_REBIND_ACCEPT",
    leafWorkId,
    parentWorkId,
    ruleId,
    matchConfidence: "high",
    ourRatePln: 1.0,
    reasons: [
      "EXACT_IDENTITY_ATTESTED",
      parentWorkId === PARENT_MALOWANIE
        ? "SOURCE_MODE=LABOR_TO_CANONICAL"
        : "SOURCE_MODE=COMPOUND",
      "TARGET_IN_CATALOG",
      "NO_FUZZY",
      ...extraReasons,
    ],
  };
}

function upgraded(cloudLine, leafWorkId, parentWorkId, ruleId) {
  return applyCompoundLaborLeafRebindToLine(
    cloudLine,
    makeAcceptResult(leafWorkId, parentWorkId, ruleId),
  );
}

function emptyDoc(lines) {
  return {
    schemaVersion: 1,
    tenderId: "t",
    version: 1,
    builtAt: "2026-09-13T00:00:00.000Z",
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: {
      materialsPln: null,
      laborPln: null,
      equipmentPln: null,
      directPln: null,
      kpPln: null,
      overheadPln: null,
      costPricePln: null,
      marginPln: null,
      recommendedBidPln: null,
      profitPln: null,
      profitabilityPct: null,
      estimatedDurationDays: null,
      workingCapitalPln: null,
      lineCount: lines.length,
      pricedLineCount: 0,
    },
    recomputeToken: "tok",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

function unit(dwellingId, lines, sourceDocumentIds = [`doc-${dwellingId}`]) {
  return {
    dwellingId,
    labelPl: dwellingId,
    sourceDocumentIds,
    offerBoq: emptyDoc(lines),
    costSnapshot: null,
    lineProvenance: null,
    costMulti: null,
    f5Gate: null,
    subtotals: null,
  };
}

function pkg(tenderId, dwellings, documentToDwelling = {}) {
  return {
    tenderId,
    expectedDwellingCount: dwellings.length,
    dwellings,
    mode: "multi",
    documentToDwelling,
  };
}

// ── PASS 1: legacy → canonical, score tie via evaluate ────────────
{
  const cloud = baseLine();
  const local = upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "paint-1204-02");
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P1 legacy→canonical ACCEPT");
}

// ── PASS 2: all four targets ─────────────────────────────────────
{
  const cases = [
    ["1204-02", PARENT_GLADZIE, "Malowanie ścian KNR 4-01 1204-02"],
    ["1505-01", PARENT_GLADZIE, "Malowanie sufitów KNR 2-02 1505-01"],
    ["1134-01", PARENT_MALOWANIE, "Gruntowanie poziome NNRNKB 1134-01"],
    ["1134-02", PARENT_MALOWANIE, "Gruntowanie pionowe NNRNKB 1134-02"],
  ];
  for (const [code, parent, desc] of cases) {
    const cloud = baseLine({
      lineId: `obl_${code}`,
      description: desc,
      catalogWorkId: parent,
    });
    const local = upgraded(cloud, TARGETS[code], parent, `rule-${code}`);
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(
      r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE",
      `P2 target ${code} ACCEPT`,
    );
  }
}

// ── PASS 3: COMPOUND source-plane ────────────────────────────────
{
  const cloud = baseLine({ catalogWorkId: PARENT_GLADZIE });
  const local = upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "compound");
  assert(
    String(local.aiRationale).includes("SOURCE_MODE=COMPOUND"),
    "P3 COMPOUND attestation present",
  );
  assert(
    evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local })
      .decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE",
    "P3 COMPOUND upgrade ACCEPT",
  );
}

// ── PASS 4: LABOR source-plane ───────────────────────────────────
{
  const cloud = baseLine({
    catalogWorkId: PARENT_MALOWANIE,
    description: "Gruntowanie NNRNKB 1134-01",
  });
  const local = upgraded(cloud, TARGETS["1134-01"], PARENT_MALOWANIE, "labor");
  assert(
    String(local.aiRationale).includes("SOURCE_MODE=LABOR_TO_CANONICAL"),
    "P4 LABOR attestation present",
  );
  assert(
    evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local })
      .decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE",
    "P4 LABOR upgrade ACCEPT",
  );
}

// ── PASS 5: exact auto_contract metadata ─────────────────────────
{
  const cloud = baseLine();
  const local = upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "meta");
  assert(local.matchMethod === "auto_contract", "P5 matchMethod auto_contract");
  assert(local.matchedBy === "auto_contract", "P5 matchedBy auto_contract");
}

// ── PASS 6: 3-dwelling merge ─────────────────────────────────────
{
  const makeDwelling = (did, lineId, code, parent) => {
    const cloudLine = baseLine({
      lineId,
      description: `Pos ${code}`,
      catalogWorkId: parent,
    });
    const localLine = upgraded(cloudLine, TARGETS[code], parent, code);
    return {
      cloud: unit(did, [cloudLine], [`doc-${did}`]),
      local: unit(did, [localLine], [`doc-${did}`]),
    };
  };
  const a = makeDwelling("prusa-42-9", "obl_a", "1204-02", PARENT_GLADZIE);
  const b = makeDwelling("dubois-22a-21", "obl_b", "1505-01", PARENT_GLADZIE);
  const c = makeDwelling("wygodna-10-6", "obl_c", "1134-01", PARENT_MALOWANIE);
  const map = {
    "doc-prusa-42-9": "prusa-42-9",
    "doc-dubois-22a-21": "dubois-22a-21",
    "doc-wygodna-10-6": "wygodna-10-6",
  };
  const cloudPkg = pkg("t1", [a.cloud, b.cloud, c.cloud], map);
  const localPkg = pkg("t1", [a.local, b.local, c.local], map);
  assert(
    scoreTenderPackageRichness(cloudPkg) === scoreTenderPackageRichness(localPkg),
    "P6 equal score",
  );
  const merged = mergeTenderPackageOnScoreTie(localPkg, cloudPkg);
  assert(merged.documentToDwelling["doc-prusa-42-9"] === "prusa-42-9", "P6 map intact");
  assert(
    merged.dwellings[0].offerBoq.lines[0].catalogWorkId === TARGETS["1204-02"],
    "P6 dwelling0 upgraded",
  );
  assert(
    merged.dwellings[1].offerBoq.lines[0].catalogWorkId === TARGETS["1505-01"],
    "P6 dwelling1 upgraded",
  );
  assert(
    merged.dwellings[2].offerBoq.lines[0].catalogWorkId === TARGETS["1134-01"],
    "P6 dwelling2 upgraded",
  );
  assert(
    merged.dwellings[0].sourceDocumentIds[0] === "doc-prusa-42-9",
    "P6 sourceDocumentIds preserved",
  );
}

// ── PASS 7: unrelated cloud fields preserved ─────────────────────
{
  const cloud = baseLine({
    costSnapshotMarker: undefined,
    laborCostPln: 99,
    lineTotalPln: 99,
  });
  // laborCostPln on cloud — local must match for ACCEPT; set equal then upgrade identity only
  const cloud2 = baseLine({ laborCostPln: 99, lineTotalPln: 99 });
  const local = {
    ...upgraded(cloud2, TARGETS["1204-02"], PARENT_GLADZIE, "u"),
    laborCostPln: 99,
    lineTotalPln: 99,
  };
  const applied = applyCanonicalIdentityFieldsFromLocal(cloud2, local);
  assert(applied.laborCostPln === 99, "P7 laborCost preserved from cloud shell");
  assert(applied.lineTotalPln === 99, "P7 lineTotal preserved");
  assert(applied.catalogWorkId === TARGETS["1204-02"], "P7 identity applied");
  assert(applied.quantity === cloud2.quantity, "P7 quantity preserved");
  assert(applied.description === cloud2.description, "P7 description preserved");
}

// ── PASS 8: parent secondary preserved ───────────────────────────
{
  const cloud = baseLine();
  const local = upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "sec");
  const parentCand = (local.candidateMatches || []).find(
    (c) => c.catalogWorkId === PARENT_GLADZIE,
  );
  assert(!!parentCand, "P8 prior parent retained in candidates");
  const applied = applyCanonicalIdentityFieldsFromLocal(cloud, local);
  const parentCand2 = (applied.candidateMatches || []).find(
    (c) => c.catalogWorkId === PARENT_GLADZIE,
  );
  assert(!!parentCand2, "P8 parent preserved after apply");
  assert(
    applied.candidateMatches[0]?.catalogWorkId === TARGETS["1204-02"],
    "P8 primary is canonical leaf",
  );
}

// ── PASS 9: idempotent second merge ──────────────────────────────
{
  const cloud = baseLine();
  const local = upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "idemp");
  const once = mergeOfferBoqPreferringCanonicalIdentityUpgrades(
    emptyDoc([local]),
    emptyDoc([cloud]),
  );
  assert(once.accepted === 1, "P9 first accept=1");
  const twice = mergeOfferBoqPreferringCanonicalIdentityUpgrades(
    emptyDoc([local]),
    once.document,
  );
  assert(twice.accepted === 0, "P9 second accept=0");
  assert(
    twice.document.lines[0].catalogWorkId === TARGETS["1204-02"],
    "P9 still canonical",
  );
}

// ── PASS 10: cloud already canonical → no downgrade ──────────────
{
  const cloud = baseLine({
    catalogWorkId: TARGETS["1204-02"],
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: "CANONICAL_LEAF_REBIND already",
  });
  const local = baseLine({
    catalogWorkId: PARENT_GLADZIE,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      || r.decision === "KEEP_CLOUD",
    "P10 no downgrade from canonical cloud",
  );
  assert(
    r.reasons.some(
      (x) =>
        x.includes("NO_DOWNGRADE")
        || x.includes("LOCAL_NOT_CANONICAL")
        || x.includes("MISSING_CANONICAL"),
    ),
    "P10 reason guards downgrade",
  );
}

// ── FAIL 11: fuzzy mapping ───────────────────────────────────────
{
  const cloud = baseLine();
  const local = {
    ...cloud,
    catalogWorkId: TARGETS["1204-02"],
    matchMethod: "fuzzy",
    matchedBy: "fuzzy",
    aiRationale: "COMPOUND_LEAF_REBIND fuzzy",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "F11 fuzzy REJECT");
}

// ── FAIL 12: normalized-description-only (no attestation) ────────
{
  const cloud = baseLine();
  const local = {
    ...cloud,
    catalogWorkId: TARGETS["1204-02"],
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: "normalized description only",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.includes("MISSING_CANONICAL_REBIND_ATTESTATION"),
    "F12 no attestation REJECT",
  );
}

// ── FAIL 13: score tie without canonical evidence ────────────────
{
  const cloud = baseLine();
  const local = {
    ...cloud,
    catalogWorkId: TARGETS["1204-02"],
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: null,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "F13 no evidence REJECT");
}

// ── FAIL 14: local legacy vs canonical cloud ─────────────────────
{
  const cloud = baseLine({
    catalogWorkId: TARGETS["1204-02"],
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: "CANONICAL_LEAF_REBIND ok",
  });
  const local = baseLine({ catalogWorkId: PARENT_GLADZIE });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision !== "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "F14 local legacy REJECT");
}

// ── FAIL 15: canonical cloud vs different canonical local ────────
{
  const cloud = baseLine({
    catalogWorkId: TARGETS["1204-02"],
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: "CANONICAL_LEAF_REBIND a",
  });
  const local = {
    ...cloud,
    catalogWorkId: TARGETS["1505-01"],
    aiRationale: "COMPOUND_LEAF_REBIND · EXACT_IDENTITY_ATTESTED · SOURCE_MODE=COMPOUND",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.includes("NO_DOWNGRADE_OR_OVERWRITE_CANONICAL_CLOUD"),
    "F15 no overwrite canonical",
  );
}

// ── FAIL 16: different logical line ──────────────────────────────
{
  const cloud = baseLine({ lineId: "obl_a" });
  const local = upgraded(
    baseLine({ lineId: "obl_b" }),
    TARGETS["1204-02"],
    PARENT_GLADZIE,
    "x",
  );
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.includes("DIFFERENT_LOGICAL_LINE"),
    "F16 different line",
  );
}

// ── FAIL 17: unit mismatch ───────────────────────────────────────
{
  const cloud = baseLine({ unit: "m2" });
  const local = {
    ...upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "u"),
    unit: "m3",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.some((x) => x.includes("unit")),
    "F17 unit mismatch",
  );
}

// ── FAIL 18: quantity mutation ───────────────────────────────────
{
  const cloud = baseLine({ quantity: 10 });
  const local = {
    ...upgraded(cloud, TARGETS["1204-02"], PARENT_GLADZIE, "q"),
    quantity: 11,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.some((x) => x.includes("quantity")),
    "F18 quantity mutation",
  );
}

// ── FAIL 19: OUR RATE / labor rate mutation on line ──────────────
{
  const cloud = baseLine({ laborRatePlnPerH: 22.9 });
  const local = {
    ...upgraded(cloud, TARGETS["1134-01"], PARENT_MALOWANIE, "rate"),
    laborRatePlnPerH: 22.9,
  };
  // equal rates OK — mutate local rate to prove reject
  const localBad = { ...local, laborRatePlnPerH: 1.04 };
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: cloud,
    localLine: localBad,
  });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.some((x) => x.includes("laborRatePlnPerH")),
    "F19 rate field mutation REJECT",
  );
}

// ── FAIL 20: BOM / costIntelligence mutation ─────────────────────
{
  const cloud = baseLine({ costIntelligence: { strategy: "A" } });
  const local = {
    ...upgraded(
      baseLine({ costIntelligence: { strategy: "A" } }),
      TARGETS["1204-02"],
      PARENT_GLADZIE,
      "bom",
    ),
    costIntelligence: { strategy: "B" },
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.some((x) => x.includes("costIntelligence")),
    "F20 BOM/costIntelligence mutation",
  );
}

// ── FAIL 21: unrelated via store merge must not global-win local ─
{
  const cloudLine = baseLine({ lineId: "obl_keep", catalogWorkId: PARENT_GLADZIE });
  const localNoise = baseLine({
    lineId: "obl_keep",
    catalogWorkId: PARENT_GLADZIE,
    description: "CHANGED DESCRIPTION SHOULD BLOCK WHOLE-LINE REPLACE",
    quantity: 10,
  });
  // Even with equal package score, non-attested local must not replace cloud identity
  const cloudPkg = pkg("t-noise", [unit("d1", [cloudLine])], { "doc-d1": "d1" });
  const localPkg = pkg("t-noise", [unit("d1", [localNoise])], { "doc-d1": "d1" });
  const store = mergeMultiDwellingPackageStore(
    { version: 1, byTenderId: { "t-noise": localPkg } },
    { version: 1, byTenderId: { "t-noise": cloudPkg } },
  );
  const out = store.byTenderId["t-noise"].dwellings[0].offerBoq.lines[0];
  assert(out.catalogWorkId === PARENT_GLADZIE, "F21 no unsafe identity change");
  assert(out.description === cloudLine.description, "F21 cloud description kept");
}

// ── FAIL 22: 0815-05 mutation ────────────────────────────────────
{
  const cloud = baseLine({
    catalogWorkId: LEAF_0815,
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: "CANONICAL_LEAF_REBIND 0815",
    description: "Gładź 0815-05",
  });
  const local = {
    ...cloud,
    catalogWorkId: TARGETS["1204-02"],
    aiRationale:
      "COMPOUND_LEAF_REBIND · EXACT_IDENTITY_ATTESTED · SOURCE_MODE=COMPOUND",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && r.reasons.includes("0815_05_MUST_REMAIN_UNTOUCHED"),
    "F22 0815-05 untouched",
  );
}

// ── FAIL 23: local package must not globally win on equal score ──
{
  const cloudExtra = baseLine({
    lineId: "obl_other",
    description: "Inna pozycja",
    catalogWorkId: "legacy-other-m2",
    laborCostPln: 5,
  });
  const localExtra = {
    ...cloudExtra,
    laborCostPln: 999, // would be catastrophic if whole local package won
  };
  const cloudUp = baseLine({ lineId: "obl_up" });
  const localUp = upgraded(cloudUp, TARGETS["1204-02"], PARENT_GLADZIE, "win");
  const cloudPkg = pkg(
    "t-global",
    [unit("d1", [cloudUp, cloudExtra], ["doc-d1"])],
    { "doc-d1": "d1" },
  );
  const localPkg = pkg(
    "t-global",
    [unit("d1", [localUp, localExtra], ["doc-d1"])],
    { "doc-d1": "d1" },
  );
  const merged = mergeMultiDwellingPackageStore(
    { version: 1, byTenderId: { "t-global": localPkg } },
    { version: 1, byTenderId: { "t-global": cloudPkg } },
  );
  const lines = merged.byTenderId["t-global"].dwellings[0].offerBoq.lines;
  const up = lines.find((l) => l.lineId === "obl_up");
  const other = lines.find((l) => l.lineId === "obl_other");
  assert(up.catalogWorkId === TARGETS["1204-02"], "F23 identity upgrade applied");
  assert(other.laborCostPln === 5, "F23 unrelated cloud field NOT replaced by local");
  assert(other.catalogWorkId === "legacy-other-m2", "F23 unrelated identity kept");
}

// ── FAIL 24: legacy-malowanie 22.9 not rate authority via merge ──
{
  const cloud = baseLine({
    catalogWorkId: PARENT_MALOWANIE,
    laborRatePlnPerH: 22.9,
    description: "Gruntowanie 1134-01",
  });
  const local = {
    ...upgraded(
      baseLine({
        catalogWorkId: PARENT_MALOWANIE,
        laborRatePlnPerH: 22.9,
        description: "Gruntowanie 1134-01",
      }),
      TARGETS["1134-01"],
      PARENT_MALOWANIE,
      "auth",
    ),
    laborRatePlnPerH: 22.9, // unchanged — merge must not invent 1.04 either
  };
  const applied = applyCanonicalIdentityFieldsFromLocal(cloud, local);
  assert(applied.catalogWorkId === TARGETS["1134-01"], "F24 identity upgraded");
  assert(applied.laborRatePlnPerH === 22.9, "F24 line rate field unchanged by merge");
  // Merge never copies OUR RATE from catalog — only identity fields
  assert(
    !String(applied.aiRationale || "").includes("OUR_RATE_TRANSFER"),
    "F24 no rate-transfer attestation invented",
  );
}

// ── Store-level score superiority still works ────────────────────
{
  const small = pkg("t-score", [unit("d1", [baseLine()], ["doc-d1"])], {
    "doc-d1": "d1",
  });
  const big = pkg(
    "t-score",
    [
      unit("d1", [baseLine()], ["doc-d1"]),
      unit("d2", [baseLine({ lineId: "x" })], ["doc-d2"]),
    ],
    { "doc-d1": "d1", "doc-d2": "d2" },
  );
  const merged = mergeMultiDwellingPackageStore(
    { version: 1, byTenderId: { "t-score": small } },
    { version: 1, byTenderId: { "t-score": big } },
  );
  assert(merged.byTenderId["t-score"].dwellings.length === 2, "score cloud>local keeps cloud");
}

console.log(`\nunit matrix: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// ── PROD SNAPSHOT SIMULATION (read-only · no cloud write) ────────
console.log("\n=== PROD SNAPSHOT SIMULATION (read-only) ===");
const env = loadEnv("", process.cwd(), "");
Object.assign(process.env, env);
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!anon) {
  console.log("SKIP prod snapshot — no anon key");
  process.exit(0);
}

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const edge = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;
const TID = "08def932-550d-d6f5-962b-1200014aa6e7";
const unwrap = (x) => (typeof x === "string" ? JSON.parse(x) : x);

const res = await fetch(`${edge}/batch-get`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    keys: ["kw-multi-dwelling-package-v1", "kw-wgdom-work-catalog"],
  }),
  signal: AbortSignal.timeout(180000),
});
if (!res.ok) {
  console.error("batch-get failed", res.status);
  process.exit(2);
}
const j = await res.json();
const cloudStore = unwrap(j.values[0]);
const catalog = unwrap(j.values[1]);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));
localStorage.setItem("kw-multi-dwelling-package-v1", JSON.stringify(cloudStore));

const {
  clearPackRegistryForTests,
  clearDefinitionRegistryForTests,
  clearCapabilityRegistryForTests,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
} = await import("../src/lib/technology-foundation/index.ts");
const { ensureBaselineTechnologyPacksRegistered } = await import(
  "../src/lib/technology-foundation/ensure-baseline-technology-packs.ts"
);
const { getTenderPackage, loadMultiDwellingPackageStore } = await import(
  "../src/lib/multi-dwelling/store.ts"
);
const { runIkDocumentExpert } = await import(
  "../src/lib/intelligent-estimator/ik-document-expert.ts"
);
const { runIkIdentityPhase } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"
);
const { runGatedIdentityPersist } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts"
);
const { lookupWorkRate } = await import("../src/lib/work-catalog/work-rate-lookup.ts");
const { normalizeWorkCatalogStore, loadWorkCatalogStoreLocal } = await import(
  "../src/lib/work-catalog/index.ts"
);

clearPackRegistryForTests();
clearDefinitionRegistryForTests();
clearCapabilityRegistryForTests();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
ensureBaselineTechnologyPacksRegistered();

const pkgLive = getTenderPackage(TID);
if (!pkgLive) {
  console.error("missing tender in cloud store");
  process.exit(3);
}
const item = { id: TID, tenderId: TID, title: "merge-sim" };
const doc = runIkDocumentExpert({ item, package: pkgLive });
const phase = runIkIdentityPhase({
  structuralReport: doc,
  sliceDExpert: doc,
  item,
  package: pkgLive,
  manualOverrides: [],
  nowMs: Date.now(),
});
const gated = runGatedIdentityPersist({
  tenderId: TID,
  package: getTenderPackage(TID),
  plans: phase.context.persistPlans,
  sessionGate: new Map(),
});
assert(gated.writes.length === 3, "SIM gated writes=3");

const localStoreAfter = loadMultiDwellingPackageStore();
const mergedStore = mergeMultiDwellingPackageStore(localStoreAfter, cloudStore);
const mergedPkg = mergedStore.byTenderId[TID];

const re1204 = /1204[\s\-\/]*0?2/i;
const re1505 = /1505[\s\-\/]*0?1/i;
const re01 = /1134[\s\-\/]*0?1/i;
const re02 = /1134[\s\-\/]*0?2/i;
function codeOf(desc) {
  const d = String(desc || "");
  if (re1204.test(d) && !re1505.test(d)) return "1204-02";
  if (re1505.test(d) && !re1204.test(d)) return "1505-01";
  if (re01.test(d) && !re02.test(d)) return "1134-01";
  if (re02.test(d) && !re01.test(d)) return "1134-02";
  return null;
}

const counts = {
  "1204-02": { n: 0, ids: {}, methods: {} },
  "1505-01": { n: 0, ids: {}, methods: {} },
  "1134-01": { n: 0, ids: {}, methods: {} },
  "1134-02": { n: 0, ids: {}, methods: {} },
};
let legacyAmongTargets = 0;
for (const d of mergedPkg.dwellings) {
  for (const line of d.offerBoq.lines || []) {
    const c = codeOf(line.description);
    if (!c) continue;
    counts[c].n += 1;
    const id = line.catalogWorkId || "null";
    const m = line.matchMethod || "null";
    counts[c].ids[id] = (counts[c].ids[id] || 0) + 1;
    counts[c].methods[m] = (counts[c].methods[m] || 0) + 1;
    if (String(id).startsWith("legacy-")) legacyAmongTargets += 1;
  }
}

for (const code of Object.keys(TARGETS)) {
  assert(counts[code].n === 3, `SIM ${code} count=3`);
  assert(counts[code].ids[TARGETS[code]] === 3, `SIM ${code} → ${TARGETS[code]}`);
  assert(counts[code].methods.auto_contract === 3, `SIM ${code} auto_contract`);
}
assert(legacyAmongTargets === 0, "SIM 0 legacy among targets");

// Unrelated line: pick a non-target line and compare catalogWorkId to cloud
const cloudPkg = cloudStore.byTenderId[TID];
let unrelatedOk = true;
for (const d of cloudPkg.dwellings) {
  const md = mergedPkg.dwellings.find((x) => x.dwellingId === d.dwellingId);
  for (const line of d.offerBoq.lines || []) {
    if (codeOf(line.description)) continue;
    const mLine = (md.offerBoq.lines || []).find((l) => l.lineId === line.lineId);
    if (!mLine) {
      unrelatedOk = false;
      break;
    }
    if (
      mLine.catalogWorkId !== line.catalogWorkId
      || mLine.quantity !== line.quantity
      || mLine.unit !== line.unit
      || mLine.description !== line.description
    ) {
      unrelatedOk = false;
      break;
    }
  }
}
assert(unrelatedOk, "SIM unrelated lines unchanged");
assert(
  JSON.stringify(mergedPkg.documentToDwelling)
    === JSON.stringify(cloudPkg.documentToDwelling),
  "SIM documentToDwelling intact",
);

const rateStore = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const NOW = Date.now();
const immutable = {
  [LEAF_0815]: 22.88,
  "cw.knr.knr-2-02.0815-04.m2": 13.15,
  "cw.knr.knr-2-02.2006-04.m2": 9.62,
  "cw.knr.knr-2-02.1118-09.m2": 48.2,
  "cw.knr.knr-2-02.0829-03.m2": 61.12,
  [TARGETS["1204-02"]]: 3.72,
  [TARGETS["1505-01"]]: 1.18,
  [TARGETS["1134-01"]]: 1.04,
  [TARGETS["1134-02"]]: 1.39,
};
for (const [wid, expected] of Object.entries(immutable)) {
  const lr = lookupWorkRate(rateStore, wid, "m2", NOW);
  assert(
    lr.status === "CURRENT" && Number(lr.ourRatePln) === expected,
    `SIM rate ${wid}=${expected}`,
  );
}
const mal = lookupWorkRate(rateStore, PARENT_MALOWANIE, "m2", NOW);
assert(Number(mal.ourRatePln) === 22.9, "SIM legacy-malowanie=22.9");
assert(
  Number(lookupWorkRate(rateStore, TARGETS["1134-01"], "m2", NOW).ourRatePln) !== 22.9,
  "SIM 1134-01 ≠ 22.9",
);

// Idempotent merge again
const merged2 = mergeMultiDwellingPackageStore(mergedStore, cloudStore);
let acceptAgain = 0;
for (const d of merged2.byTenderId[TID].dwellings) {
  for (const line of d.offerBoq.lines || []) {
    const c = codeOf(line.description);
    if (!c) continue;
    if (line.catalogWorkId !== TARGETS[c]) acceptAgain += 1;
  }
}
assert(acceptAgain === 0, "SIM second merge still canonical");

console.log(`\nALL: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
