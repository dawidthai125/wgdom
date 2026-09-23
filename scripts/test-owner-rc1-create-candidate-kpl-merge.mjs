/**
 * OWNER_RC1_CREATE_CANDIDATE_KPL_LEAF_UPGRADE_v1 — merge + apply helper tests.
 *
 * npx vite-node scripts/test-owner-rc1-create-candidate-kpl-merge.mjs
 *
 * ZERO production / cloud write.
 */
import {
  evaluateCanonicalIdentityUpgradeMerge,
  mergeMultiDwellingPackageStore,
  isCanonicalLaborLeafWorkId,
  isIdentityUpgradeEligibleLeafWorkId,
  isLegacyOrNonCanonicalWorkId,
} from "../src/lib/multi-dwelling/index.ts";
import { applyCompoundLaborLeafRebindToLine } from "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts";
import { applyAutonomousIdentityLeafToLine } from "../src/lib/intelligent-estimator/orchestra/ik-autonomous-identity-writeback.ts";
import { applyOwnerRc1CreateCandidateKplIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-create-candidate-kpl-apply.ts";
import { applyOwnerRc1CreateCandidateIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-create-candidate-apply.ts";
import { applyOwnerRc1VerifyConnectIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-verify-connect-apply.ts";
import {
  OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
  OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS,
  formatOwnerRc1CreateCandidateKplMappingIdToken,
  hasOwnerRc1CreateCandidateKplAttestation,
  isOwnerRc1CreateCandidateKplLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-create-candidate-kpl-contract.ts";
import {
  OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
  formatOwnerRc1CreateCandidateMappingIdToken,
  hasOwnerRc1CreateCandidateAttestation,
  isOwnerRc1CreateCandidateLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-create-candidate-contract.ts";
import {
  OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
  formatOwnerRc1VerifyConnectMappingIdToken,
} from "../src/lib/work-catalog/owner-rc1-verify-connect-contract.ts";
import {
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0402_03_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  MOPS_ELEC_RC1_EXACT_ALIASES,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog.ts";
import {
  MOPS_ELEC_RC1_MAP_0501_03,
  MOPS_ELEC_RC1_MAP_0504_07,
  MOPS_ELEC_RC1_MAP_0407_01,
} from "../src/lib/work-catalog/ik-owner-identity-mapping-mops-electrical-rc1.ts";

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

const PARENT = "legacy-elektryka-szt";
const LEAF_KPL = MOPS_ELEC_RC1_0501_03_WORK_ID;
const MAP_KPL = MOPS_ELEC_RC1_MAP_0501_03.mappingId;
const LEAF_SZT = MOPS_ELEC_RC1_0504_07_WORK_ID;
const MAP_SZT = MOPS_ELEC_RC1_MAP_0504_07.mappingId;
const LEAF_CONNECT = MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID;
const MAP_CONNECT = MOPS_ELEC_RC1_MAP_0407_01.mappingId;
const CW_KNR = "cw.knr.knr-4-01.1204-02.m2";
const LIVE_SHAPES = [
  { lineId: "obl_c141b486", dwellingId: "prusa-42-9", qty: 5 },
  { lineId: "obl_1241244b", dwellingId: "dubois-22a-21", qty: 5 },
  { lineId: "obl_1bda2710", dwellingId: "wygodna-10-6", qty: 5 },
];

function baseLine(overrides = {}) {
  return {
    lineId: "obl_rc1_kpl_test",
    lp: "1",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"],
    quantity: 5,
    quantityRaw: "5",
    unit: "kpl",
    catalogWorkId: PARENT,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
    candidateMatches: [],
    materialUnitPln: null,
    materialCostPln: null,
    laborCostPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    aiConfidence: "high",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...overrides,
  };
}

function kplPatched(cloudLine, leaf = LEAF_KPL, mappingId = MAP_KPL) {
  const r = applyOwnerRc1CreateCandidateKplIdentityToLine(cloudLine, {
    leafWorkId: leaf,
    mappingId,
    parentWorkId: PARENT,
  });
  assert(
    r.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_ACCEPT" && r.patchedLine,
    `helper ACCEPT ${leaf}`,
  );
  return r.patchedLine;
}

// ── SSOT ─────────────────────────────────────────────────────────
{
  assert(OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS.length === 1, "SSOT pairs = EXACTLY 1");
  assert(MAP_KPL === "lim-mops-elec-rc1-0501-03-podloze-kpl", "0501-03 mappingId SSOT");
  assert(LEAF_KPL === "knr-wc-knr-5-08-0501-03-kpl", "0501-03 workId SSOT");
  assert(isOwnerRc1CreateCandidateKplLeafWorkId(LEAF_KPL), "0501-03 is KPL leaf");
  assert(!isOwnerRc1CreateCandidateKplLeafWorkId(LEAF_SZT), "0504-07 not KPL");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(LEAF_KPL), "0501-03 not szt CREATE");
  assert(isOwnerRc1CreateCandidateLeafWorkId(LEAF_SZT), "0504-07 still szt CREATE");
  assert(!isCanonicalLaborLeafWorkId(LEAF_KPL), "kpl knr-wc not cw.knr");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_KPL), "KPL upgrade-eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_SZT), "szt CREATE still eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(CW_KNR), "cw.knr still eligible");
  assert(isLegacyOrNonCanonicalWorkId(PARENT), "legacy parent");
  assert(!isLegacyOrNonCanonicalWorkId(LEAF_KPL), "KPL leaf not legacy");
}

// ── CROSS-CLASS ATTESTATION ──────────────────────────────────────
{
  const kplOk = hasOwnerRc1CreateCandidateKplAttestation({
    leafWorkId: LEAF_KPL,
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: `${OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION} mappingId=${MAP_KPL}`,
  });
  assert(kplOk, "P3 KPL attestation ACCEPT");

  const bareOnKpl = hasOwnerRc1CreateCandidateKplAttestation({
    leafWorkId: LEAF_KPL,
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: `${OWNER_RC1_CREATE_CANDIDATE_ATTESTATION} mappingId=${MAP_KPL}`,
  });
  assert(!bareOnKpl, "bare szt CREATE rejected by KPL gate");

  const kplOnSzt = hasOwnerRc1CreateCandidateAttestation({
    leafWorkId: LEAF_SZT,
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    aiRationale: `${OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION} mappingId=${MAP_SZT}`,
  });
  assert(!kplOnSzt, "KPL token rejected by szt CREATE gate (substring trap)");
}

// ── POSITIVE 1: exact 0501-03 ACCEPT ─────────────────────────────
{
  const cloud = baseLine();
  const local = kplPatched(cloud);
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P1 legacy→0501-03 ACCEPT");
  assert(
    (r.reasons || []).includes("OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION"),
    "P1 KPL attestation reason",
  );
}

// ── POSITIVE 2: all 3 live shapes dry-run ────────────────────────
{
  for (const shape of LIVE_SHAPES) {
    const cloud = baseLine({
      lineId: shape.lineId,
      quantity: shape.qty,
    });
    const local = kplPatched(cloud);
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(
      r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE",
      `P2 ${shape.lineId} @ ${shape.dwellingId} ACCEPT`,
    );
  }
}

// ── POSITIVE 3 already covered above; KEEP identical ─────────────
{
  const cloud = baseLine();
  const local = kplPatched(cloud);
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: local,
    localLine: local,
  });
  assert(r.decision === "KEEP_CLOUD", `P3 identical KPL KEEP (got ${r.decision})`);
}

// ── POSITIVE 4: 0504-07 szt CREATE still PASS ────────────────────
{
  const cloud = baseLine({
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"],
    unit: "szt",
    quantity: 3,
  });
  const apply = applyOwnerRc1CreateCandidateIdentityToLine(cloud, {
    leafWorkId: LEAF_SZT,
    mappingId: MAP_SZT,
    parentWorkId: PARENT,
  });
  assert(
    apply.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_ACCEPT",
    "P4 0504-07 helper ACCEPT",
  );
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: cloud,
    localLine: apply.patchedLine,
  });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P4 0504-07 merge ACCEPT");
}

// ── NEGATIVE matrix ──────────────────────────────────────────────
{
  const cloud = baseLine();

  // N1 arbitrary knr-wc
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: "knr-wc-arbitrary-foobar-kpl",
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
        formatOwnerRc1CreateCandidateKplMappingIdToken(MAP_KPL),
      ],
    });
    local.unit = "kpl";
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N1 arbitrary knr-wc REJECT");
  }

  // N2 0504-07 target + 0501-03 mapping
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF_SZT,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
        formatOwnerRc1CreateCandidateKplMappingIdToken(MAP_KPL),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N2 0504+0501map REJECT");
  }

  // N3 0501-03 target + 0504-07 mapping
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF_KPL,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
        formatOwnerRc1CreateCandidateKplMappingIdToken(MAP_SZT),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N3 0501+0504map REJECT");
  }

  // N4 wrong mapping (helper)
  {
    const bad = applyOwnerRc1CreateCandidateKplIdentityToLine(cloud, {
      leafWorkId: LEAF_KPL,
      mappingId: MAP_SZT,
    });
    assert(bad.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT", "N4 helper wrong map");
  }

  // N5 wrong attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF_KPL,
      parentWorkId: PARENT,
      reasons: ["WRONG_TOKEN", formatOwnerRc1CreateCandidateKplMappingIdToken(MAP_KPL)],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N5 wrong attest REJECT");
  }

  // N6 bare old CREATE attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF_KPL,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
        formatOwnerRc1CreateCandidateMappingIdToken(MAP_KPL),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N6 bare CREATE REJECT");
    assert(
      (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION"),
      "N6 KPL attestation required",
    );
  }

  // N7 missing attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF_KPL,
      parentWorkId: PARENT,
      reasons: ["no-token"],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N7 missing attest REJECT");
  }

  // N8 unit=szt
  {
    const bad = applyOwnerRc1CreateCandidateKplIdentityToLine(
      { ...cloud, unit: "szt" },
      { leafWorkId: LEAF_KPL, mappingId: MAP_KPL },
    );
    assert(bad.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT", "N8 unit=szt REJECT");
  }

  // N9 unit!=kpl
  {
    const bad = applyOwnerRc1CreateCandidateKplIdentityToLine(
      { ...cloud, unit: "m2" },
      { leafWorkId: LEAF_KPL, mappingId: MAP_KPL },
    );
    assert(bad.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT", "N9 unit!=kpl REJECT");
  }

  // N10 fuzzy
  {
    const local = { ...kplPatched(cloud), matchMethod: "fuzzy", matchedBy: "fuzzy" };
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N10 fuzzy REJECT");
  }

  // N11 CREATE A → CREATE B
  {
    const cloudKpl = kplPatched(cloud);
    const local = applyAutonomousIdentityLeafToLine(
      { ...cloud, catalogWorkId: PARENT },
      {
        leafWorkId: MOPS_ELEC_RC1_0402_03_WORK_ID,
        parentWorkId: PARENT,
        reasons: [
          OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
          formatOwnerRc1CreateCandidateKplMappingIdToken(MAP_KPL),
        ],
      },
    );
    const forged = {
      ...local,
      lineId: cloudKpl.lineId,
      quantity: cloudKpl.quantity,
      unit: cloudKpl.unit,
      description: cloudKpl.description,
    };
    const r = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine: cloudKpl,
      localLine: forged,
    });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N11 CREATE A→B REJECT");
  }

  // N12 CREATE → CONNECT
  {
    const cloudKpl = kplPatched(cloud);
    const conn = applyOwnerRc1VerifyConnectIdentityToLine(
      {
        ...cloud,
        description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
        unit: "szt",
      },
      {
        leafWorkId: LEAF_CONNECT,
        mappingId: MAP_CONNECT,
        parentWorkId: PARENT,
      },
    );
    assert(conn.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_ACCEPT", "N12 setup CONNECT");
    const local = {
      ...conn.patchedLine,
      lineId: cloudKpl.lineId,
      quantity: cloudKpl.quantity,
      unit: cloudKpl.unit,
      description: cloudKpl.description,
    };
    const r = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine: cloudKpl,
      localLine: local,
    });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N12 CREATE→CONNECT REJECT");
  }

  // N13 CONNECT → CREATE
  {
    const connCloud = applyOwnerRc1VerifyConnectIdentityToLine(
      {
        ...cloud,
        description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
        unit: "szt",
      },
      {
        leafWorkId: LEAF_CONNECT,
        mappingId: MAP_CONNECT,
        parentWorkId: PARENT,
      },
    ).patchedLine;
    const local = {
      ...kplPatched(baseLine()),
      lineId: connCloud.lineId,
      quantity: connCloud.quantity,
      unit: connCloud.unit,
      description: connCloud.description,
    };
    const r = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine: connCloud,
      localLine: local,
    });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N13 CONNECT→CREATE REJECT");
  }

  // N14 arbitrary lineId — helper does not care; merge requires same lineId
  {
    const local = { ...kplPatched(cloud), lineId: "obl_arbitrary_other" };
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N14 arbitrary lineId REJECT");
  }

  // N15–17 drift
  for (const [field, value, label] of [
    ["quantity", 99, "qty"],
    ["description", "other text", "description"],
    ["lineTotalPln", 1234, "price"],
  ]) {
    const local = { ...kplPatched(cloud), [field]: value };
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(
      r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
        && (r.reasons || []).some((x) => String(x).startsWith("NON_IDENTITY_FIELD_DRIFT")),
      `N drift ${label} REJECT`,
    );
  }

  // N18 cw.knr
  {
    const local = applyCompoundLaborLeafRebindToLine(
      {
        ...cloud,
        unit: "m2",
        description: "Malowanie ścian emulsją KNR 4-01 1204-02",
        catalogWorkId: "legacy-gladzie_tynki-m2",
      },
      {
        decision: "COMPOUND_LEAF_REBIND_ACCEPT",
        leafWorkId: CW_KNR,
        parentWorkId: "legacy-gladzie_tynki-m2",
        ruleId: "paint-1204-02",
        matchConfidence: "high",
        ourRatePln: 1,
        reasons: [
          "EXACT_IDENTITY_ATTESTED",
          "SOURCE_MODE=COMPOUND",
          "TARGET_IN_CATALOG",
          "NO_FUZZY",
        ],
      },
    );
    const r = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine: {
        ...cloud,
        unit: "m2",
        description: "Malowanie ścian emulsją KNR 4-01 1204-02",
        catalogWorkId: "legacy-gladzie_tynki-m2",
      },
      localLine: local,
    });
    assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "N18/R cw.knr ACCEPT");
  }

  // N19 CONNECT regression
  {
    const cCloud = {
      ...cloud,
      description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
      unit: "szt",
    };
    const conn = applyOwnerRc1VerifyConnectIdentityToLine(cCloud, {
      leafWorkId: LEAF_CONNECT,
      mappingId: MAP_CONNECT,
      parentWorkId: PARENT,
    });
    assert(conn.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_ACCEPT", "N19 CONNECT helper");
    const r = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine: cCloud,
      localLine: conn.patchedLine,
    });
    assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "N19 CONNECT merge");
  }

  // N20 0504-07 CREATE regression (already P4; assert helper reject KPL on szt leaf)
  {
    const bad = applyOwnerRc1CreateCandidateKplIdentityToLine(
      {
        ...cloud,
        description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"],
        unit: "szt",
      },
      { leafWorkId: LEAF_SZT, mappingId: MAP_SZT },
    );
    assert(
      bad.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT",
      "N20 KPL helper rejects szt CREATE leaf",
    );
  }
}

// ── Score-tie store merge ────────────────────────────────────────
{
  const d0 = "prusa-42-9";
  const cloud = baseLine({ lineId: "obl_c141b486" });
  const local = kplPatched(cloud);
  function pkg(lines) {
    return {
      tenderId: "08def932-550d-d6f5-962b-1200014aa6e7",
      mode: "multi",
      expectedDwellingCount: 1,
      dwellings: [
        {
          dwellingId: d0,
          labelPl: d0,
          sourceDocumentIds: [`doc-${d0}`],
          offerBoq: {
            schemaVersion: 1,
            lines,
            mappingAppliedAt: "2026-09-23T00:00:00.000Z",
          },
          costMulti: null,
          f5Gate: null,
          subtotals: null,
        },
      ],
      documentToDwelling: { [`doc-${d0}`]: d0 },
    };
  }
  const merged = mergeMultiDwellingPackageStore(
    { version: 1, byTenderId: { t1: pkg([local]) } },
    { version: 1, byTenderId: { t1: pkg([cloud]) } },
  );
  assert(
    merged.byTenderId.t1.dwellings[0].offerBoq.lines[0].catalogWorkId === LEAF_KPL,
    "score-tie keeps KPL 0501-03",
  );
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
