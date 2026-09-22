/**
 * OWNER_RC1_CREATE_CANDIDATE_LEAF_UPGRADE_v1 — merge + apply helper tests.
 *
 * npx vite-node scripts/test-owner-rc1-create-candidate-merge.mjs
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
import { applyOwnerRc1CreateCandidateIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-create-candidate-apply.ts";
import { applyOwnerRc1VerifyConnectIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-verify-connect-apply.ts";
import {
  OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
  OWNER_RC1_CREATE_CANDIDATE_PAIRS,
  formatOwnerRc1CreateCandidateMappingIdToken,
  isOwnerRc1CreateCandidateLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-create-candidate-contract.ts";
import {
  OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
  formatOwnerRc1VerifyConnectMappingIdToken,
  isOwnerRc1VerifyConnectLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-verify-connect-contract.ts";
import {
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_0402_03_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  MOPS_ELEC_RC1_EXACT_ALIASES,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog.ts";
import {
  MOPS_ELEC_RC1_MAP_0504_07,
  MOPS_ELEC_RC1_MAP_0407_01,
  MOPS_ELEC_RC1_MAP_0504_03,
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
const LEAF_CREATE = MOPS_ELEC_RC1_0504_07_WORK_ID;
const MAP_CREATE = MOPS_ELEC_RC1_MAP_0504_07.mappingId;
const LEAF_CONNECT = MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID;
const MAP_CONNECT = MOPS_ELEC_RC1_MAP_0407_01.mappingId;
const LEAF_CONNECT_0504 = MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID;
const MAP_CONNECT_0504 = MOPS_ELEC_RC1_MAP_0504_03.mappingId;
const CW_KNR = "cw.knr.knr-4-01.1204-02.m2";
const OTHER_KNR_WC = "knr-wc-knr-5-08-0501-03-kpl";

function baseLine(overrides = {}) {
  return {
    lineId: "obl_rc1_create_test",
    lp: "1",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"],
    quantity: 4,
    quantityRaw: "4",
    unit: "szt",
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

function createPatched(cloudLine, leaf = LEAF_CREATE, mappingId = MAP_CREATE) {
  const r = applyOwnerRc1CreateCandidateIdentityToLine(cloudLine, {
    leafWorkId: leaf,
    mappingId,
    parentWorkId: PARENT,
  });
  assert(
    r.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_ACCEPT" && r.patchedLine,
    `helper ACCEPT ${leaf}`,
  );
  return r.patchedLine;
}

// ── SSOT ─────────────────────────────────────────────────────────
{
  assert(OWNER_RC1_CREATE_CANDIDATE_PAIRS.length === 1, "SSOT pairs = EXACTLY 1");
  assert(MAP_CREATE === "lim-mops-elec-rc1-0504-07-oprawy-ip44", "0504-07 mappingId SSOT");
  assert(LEAF_CREATE === "knr-wc-knr-5-08-0504-07-szt", "0504-07 workId SSOT");
  assert(isOwnerRc1CreateCandidateLeafWorkId(LEAF_CREATE), "0504-07 is CREATE leaf");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(MOPS_ELEC_RC1_0501_03_WORK_ID), "0501-03 not CREATE allowlist");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(MOPS_ELEC_RC1_0402_03_WORK_ID), "0402-03 not CREATE allowlist");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(LEAF_CONNECT), "CONNECT leaf not CREATE");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(OTHER_KNR_WC), "arbitrary knr-wc rejected");
  assert(!isCanonicalLaborLeafWorkId(LEAF_CREATE), "knr-wc still not cw.knr predicate");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_CREATE), "CREATE upgrade-eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(CW_KNR), "cw.knr still upgrade-eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_CONNECT), "CONNECT still upgrade-eligible");
  assert(isLegacyOrNonCanonicalWorkId(PARENT), "legacy parent");
  assert(!isLegacyOrNonCanonicalWorkId(LEAF_CREATE), "CREATE leaf not legacy/non-canonical");
}

// ── POSITIVE 1: legacy → 0504-07 ACCEPT ──────────────────────────
{
  const cloud = baseLine();
  const local = createPatched(cloud);
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P1 legacy→0504-07 ACCEPT");
  assert(
    (r.reasons || []).includes("OWNER_RC1_CREATE_CANDIDATE_ATTESTATION"),
    "P1 CREATE attestation reason",
  );
}

// ── POSITIVE 2: score-tie merge ACCEPT ───────────────────────────
{
  const d0 = "prusa-42-9";
  const cloud = baseLine({ lineId: "obl_b1b12940" });
  const local = createPatched(cloud);
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
            mappingAppliedAt: "2026-09-22T00:00:00.000Z",
          },
          costMulti: null,
          f5Gate: null,
          subtotals: null,
        },
      ],
      documentToDwelling: { [`doc-${d0}`]: d0 },
    };
  }
  const cloudStore = { version: 1, byTenderId: { t1: pkg([cloud]) } };
  const localStore = { version: 1, byTenderId: { t1: pkg([local]) } };
  const merged = mergeMultiDwellingPackageStore(localStore, cloudStore);
  const line = merged.byTenderId.t1.dwellings[0].offerBoq.lines[0];
  assert(line.catalogWorkId === LEAF_CREATE, "P2 score-tie keeps CREATE 0504-07");
}

// ── POSITIVE 3: identical approved CREATE → KEEP ─────────────────
{
  const cloud = baseLine();
  const local = createPatched(cloud);
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: local,
    localLine: local,
  });
  assert(r.decision === "KEEP_CLOUD", `P3 identical CREATE KEEP (got ${r.decision})`);
}

// ── POSITIVE 4: correct CREATE attestation → ACCEPT ──────────────
{
  const cloud = baseLine();
  const local = createPatched(cloud);
  const rat = String(local.aiRationale || "");
  assert(rat.includes(OWNER_RC1_CREATE_CANDIDATE_ATTESTATION), "P4 CREATE attestation present");
  assert(
    rat.includes(formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE)),
    "P4 mappingId token present",
  );
  assert(!rat.includes(OWNER_RC1_VERIFY_CONNECT_ATTESTATION), "P4 no CONNECT leak");
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P4 merge ACCEPT");
}

// ── NEGATIVE 5: arbitrary knr-wc-* → REJECT ───────────────────────
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: OTHER_KNR_WC,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N5 arbitrary knr-wc REJECT");
  assert((r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"), "N5 LOCAL_NOT_CANONICAL_LEAF");
}

// ── NEGATIVE 6: wrong mappingId → REJECT ─────────────────────────
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_CREATE,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CONNECT),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N6 wrong mappingId REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION"),
    "N6 missing/invalid CREATE attestation",
  );
}

// ── NEGATIVE 7: CONNECT mapping / leaf as CREATE → REJECT ────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_CONNECT,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N7 CONNECT leaf + CREATE attest REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_VERIFY_CONNECT_ATTESTATION"),
    "N7 CONNECT class requires CONNECT attest",
  );
}

// ── NEGATIVE 8: wrong CREATE leaf (0501-03) → REJECT ──────────────
{
  const cloud = baseLine({
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"],
    unit: "kpl",
  });
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: MOPS_ELEC_RC1_0501_03_WORK_ID,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N8 wrong CREATE leaf REJECT");
  assert((r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"), "N8 0501-03 not allowlisted");
}

// ── NEGATIVE 9: missing CREATE attestation → REJECT ──────────────
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_CREATE,
    parentWorkId: PARENT,
    reasons: ["no-create-token"],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N9 missing CREATE attest REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION"),
    "N9 MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION",
  );
}

// ── NEGATIVE 10: CONNECT attestation on CREATE leaf → REJECT ─────
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_CREATE,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
      formatOwnerRc1VerifyConnectMappingIdToken(MAP_CONNECT),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N10 CONNECT attest on CREATE REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION"),
    "N10 CREATE class rejects CONNECT attest",
  );
}

// ── NEGATIVE 11: COMPOUND_LEAF_REBIND as CREATE authority → REJECT
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_CREATE,
    parentWorkId: PARENT,
    reasons: [
      "COMPOUND_LEAF_REBIND",
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N11 COMPOUND + CREATE REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION"),
    "N11 COMPOUND not CREATE authority",
  );
}

// ── NEGATIVE 12: fuzzy → REJECT ──────────────────────────────────
{
  const cloud = baseLine();
  const local = {
    ...createPatched(cloud),
    matchMethod: "fuzzy",
    matchedBy: "fuzzy",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N12 fuzzy REJECT");
}

// ── NEGATIVE 13–16: non-identity drift ───────────────────────────
for (const [field, value, label] of [
  ["unit", "kpl", "unit"],
  ["quantity", 99, "qty"],
  ["description", "other text", "description"],
  ["lineTotalPln", 1234, "price"],
]) {
  const cloud = baseLine();
  const local = { ...createPatched(cloud), [field]: value };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && (r.reasons || []).some((x) => String(x).startsWith("NON_IDENTITY_FIELD_DRIFT")),
    `N drift ${label} REJECT`,
  );
}

// ── NEGATIVE 17: 0501-03 → REJECT (already N8; helper also) ───────
{
  const cloud = baseLine({
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"],
    unit: "kpl",
  });
  const bad = applyOwnerRc1CreateCandidateIdentityToLine(cloud, {
    leafWorkId: MOPS_ELEC_RC1_0501_03_WORK_ID,
    mappingId: "lim-mops-elec-rc1-0501-03-podloze-kpl",
  });
  assert(bad.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_REJECT", "N17 helper 0501-03 REJECT");
}

// ── NEGATIVE 18: 0402-03 → REJECT ────────────────────────────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0402-03"] });
  const bad = applyOwnerRc1CreateCandidateIdentityToLine(cloud, {
    leafWorkId: MOPS_ELEC_RC1_0402_03_WORK_ID,
    mappingId: "lim-mops-elec-rc1-0402-03-rcd-test",
  });
  assert(bad.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_REJECT", "N18 helper 0402-03 REJECT");
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: MOPS_ELEC_RC1_0402_03_WORK_ID,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N18 merge 0402-03 REJECT");
}

// ── NEGATIVE 19: arbitrary p2b → REJECT ──────────────────────────
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: "p2b-montaz-gniazd-lacznikow-szt",
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
      formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N19 arbitrary p2b REJECT");
  assert((r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"), "N19 NOT_CANONICAL");
}

// ── REGRESSION 20: CONNECT existing → PASS ───────────────────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const conn = applyOwnerRc1VerifyConnectIdentityToLine(cloud, {
    leafWorkId: LEAF_CONNECT,
    mappingId: MAP_CONNECT,
    parentWorkId: PARENT,
  });
  assert(conn.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_ACCEPT", "R20 CONNECT helper ACCEPT");
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: cloud,
    localLine: conn.patchedLine,
  });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "R20 CONNECT merge ACCEPT");
  assert(isOwnerRc1VerifyConnectLeafWorkId(LEAF_CONNECT), "R20 CONNECT still CONNECT");
}

// ── REGRESSION 21: cw.knr existing → PASS ────────────────────────
{
  const cloud = baseLine({
    unit: "m2",
    quantity: 10,
    description: "Malowanie ścian emulsją KNR 4-01 1204-02",
    catalogWorkId: "legacy-gladzie_tynki-m2",
  });
  const local = applyCompoundLaborLeafRebindToLine(cloud, {
    decision: "COMPOUND_LEAF_REBIND_ACCEPT",
    leafWorkId: CW_KNR,
    parentWorkId: "legacy-gladzie_tynki-m2",
    ruleId: "paint-1204-02",
    matchConfidence: "high",
    ourRatePln: 1,
    reasons: ["EXACT_IDENTITY_ATTESTED", "SOURCE_MODE=COMPOUND", "TARGET_IN_CATALOG", "NO_FUZZY"],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "R21 cw.knr regression ACCEPT");
}

// ── NEGATIVE 22: CONNECT → CREATE → REJECT ───────────────────────
{
  const cloudBase = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const cloud = applyOwnerRc1VerifyConnectIdentityToLine(cloudBase, {
    leafWorkId: LEAF_CONNECT,
    mappingId: MAP_CONNECT,
    parentWorkId: PARENT,
  }).patchedLine;
  const local = {
    ...createPatched(baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"] })),
    lineId: cloud.lineId,
    quantity: cloud.quantity,
    unit: cloud.unit,
    description: cloud.description,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N22 CONNECT→CREATE REJECT");
  assert(
    (r.reasons || []).includes("NO_DOWNGRADE_OR_OVERWRITE_CANONICAL_CLOUD"),
    "N22 anti-overwrite",
  );
}

// ── NEGATIVE 23: CREATE → CONNECT → REJECT ───────────────────────
{
  const cloudBase = baseLine();
  const cloud = createPatched(cloudBase);
  const connectLocal = applyOwnerRc1VerifyConnectIdentityToLine(
    baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] }),
    {
      leafWorkId: LEAF_CONNECT,
      mappingId: MAP_CONNECT,
      parentWorkId: PARENT,
    },
  ).patchedLine;
  const local = {
    ...connectLocal,
    lineId: cloud.lineId,
    quantity: cloud.quantity,
    unit: cloud.unit,
    description: cloud.description,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N23 CREATE→CONNECT REJECT");
  assert(
    (r.reasons || []).includes("NO_DOWNGRADE_OR_OVERWRITE_CANONICAL_CLOUD"),
    "N23 anti-overwrite",
  );
}

// ── NEGATIVE 24: CREATE A → CREATE B → REJECT ────────────────────
{
  const cloud = createPatched(baseLine());
  // Simulate different CREATE leaf with forged attestation (not allowlisted)
  const local = applyAutonomousIdentityLeafToLine(
    { ...cloud, catalogWorkId: PARENT },
    {
      leafWorkId: MOPS_ELEC_RC1_0402_03_WORK_ID,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
        formatOwnerRc1CreateCandidateMappingIdToken(MAP_CREATE),
      ],
    },
  );
  const forged = {
    ...local,
    lineId: cloud.lineId,
    quantity: cloud.quantity,
    unit: cloud.unit,
    description: cloud.description,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: forged });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N24 CREATE A→B REJECT");
}

// ── Helper: pair mismatch / invent guards ────────────────────────
{
  const cloud = baseLine();
  const bad = applyOwnerRc1CreateCandidateIdentityToLine(cloud, {
    leafWorkId: LEAF_CREATE,
    mappingId: MAP_CONNECT,
  });
  assert(bad.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_REJECT", "helper pair mismatch REJECT");
  assert(bad.patchedLine == null, "helper no patch on reject");

  const ok = applyOwnerRc1CreateCandidateIdentityToLine(cloud, {
    leafWorkId: LEAF_CREATE,
    mappingId: MAP_CREATE,
  });
  assert(ok.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_ACCEPT", "helper CREATE ACCEPT");
  const rat = String(ok.patchedLine?.aiRationale || "");
  assert(rat.includes(OWNER_RC1_CREATE_CANDIDATE_ATTESTATION), "helper emits CREATE attestation");
  assert(!rat.includes("COMPOUND_LEAF_REBIND"), "helper does not fake COMPOUND");
  assert(!rat.includes("CANONICAL_LEAF_REBIND"), "helper does not fake CANONICAL");
  assert(!rat.includes(OWNER_RC1_VERIFY_CONNECT_ATTESTATION), "helper does not fake CONNECT");
  assert(ok.patchedLine.quantity === cloud.quantity, "qty preserved");
  assert(ok.patchedLine.unit === cloud.unit, "unit preserved");
  assert(ok.patchedLine.description === cloud.description, "description preserved");
}

// ── CONNECT 0504-03 still separate from CREATE 0504-07 ───────────
{
  assert(LEAF_CONNECT_0504 !== LEAF_CREATE, "CONNECT 0504-03 ≠ CREATE 0504-07");
  assert(MAP_CONNECT_0504 !== MAP_CREATE, "mappingIds distinct");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(LEAF_CONNECT_0504), "CONNECT 0504-03 not CREATE");
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
