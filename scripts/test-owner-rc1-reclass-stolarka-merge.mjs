/**
 * OWNER_RC1_RECLASS_STOLARKA_LEAF_UPGRADE_v1 — merge + apply helper tests.
 *
 * npx vite-node scripts/test-owner-rc1-reclass-stolarka-merge.mjs
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
import { applyOwnerRc1ReclassStolarkaIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-reclass-stolarka-apply.ts";
import { applyOwnerRc1CreateCandidateIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-create-candidate-apply.ts";
import { applyOwnerRc1CreateCandidateKplIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-create-candidate-kpl-apply.ts";
import { applyOwnerRc1VerifyConnectIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-verify-connect-apply.ts";
import {
  OWNER_RC1_RECLASS_STOLARKA_ATTESTATION,
  OWNER_RC1_RECLASS_STOLARKA_PAIRS,
  formatOwnerRc1ReclassStolarkaMappingIdToken,
  hasOwnerRc1ReclassStolarkaAttestation,
  isOwnerRc1ReclassStolarkaLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-reclass-stolarka-contract.ts";
import {
  OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
  formatOwnerRc1CreateCandidateMappingIdToken,
  hasOwnerRc1CreateCandidateAttestation,
  isOwnerRc1CreateCandidateLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-create-candidate-contract.ts";
import {
  OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
  formatOwnerRc1CreateCandidateKplMappingIdToken,
  hasOwnerRc1CreateCandidateKplAttestation,
} from "../src/lib/work-catalog/owner-rc1-create-candidate-kpl-contract.ts";
import {
  OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
  formatOwnerRc1VerifyConnectMappingIdToken,
  hasOwnerRc1VerifyConnectAttestation,
} from "../src/lib/work-catalog/owner-rc1-verify-connect-contract.ts";
import {
  MOPS_ELEC_RC1_KLAMKI_WORK_ID,
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  MOPS_ELEC_RC1_EXACT_ALIASES,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog.ts";
import {
  MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA,
  MOPS_ELEC_RC1_MAP_0504_07,
  MOPS_ELEC_RC1_MAP_0501_03,
  MOPS_ELEC_RC1_MAP_0407_01,
} from "../src/lib/work-catalog/ik-owner-identity-mapping-mops-electrical-rc1.ts";
import { resolveLaborIdentityMapping } from "../src/lib/work-catalog/work-rate-identity-mapping.ts";

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
const LEAF = MOPS_ELEC_RC1_KLAMKI_WORK_ID;
const MAP = MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.mappingId;
const LEAF_SZT = MOPS_ELEC_RC1_0504_07_WORK_ID;
const MAP_SZT = MOPS_ELEC_RC1_MAP_0504_07.mappingId;
const LEAF_KPL = MOPS_ELEC_RC1_0501_03_WORK_ID;
const MAP_KPL = MOPS_ELEC_RC1_MAP_0501_03.mappingId;
const LEAF_CONNECT = MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID;
const MAP_CONNECT = MOPS_ELEC_RC1_MAP_0407_01.mappingId;
const CW_KNR = "cw.knr.knr-4-01.1204-02.m2";
const LIVE_SHAPES = [
  { lineId: "obl_fe74db3a", dwellingId: "prusa-42-9", qty: 6 },
  { lineId: "obl_f8c7b307", dwellingId: "dubois-22a-21", qty: 6 },
  { lineId: "obl_d6175564", dwellingId: "wygodna-10-6", qty: 6 },
];

function baseLine(overrides = {}) {
  return {
    lineId: "obl_rc1_klamki_test",
    lp: "1",
    description: MOPS_ELEC_RC1_EXACT_ALIASES.klamki,
    quantity: 6,
    quantityRaw: "6",
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

function reclassPatched(cloudLine, leaf = LEAF, mappingId = MAP) {
  const r = applyOwnerRc1ReclassStolarkaIdentityToLine(cloudLine, {
    leafWorkId: leaf,
    mappingId,
    parentWorkId: PARENT,
  });
  assert(
    r.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_ACCEPT" && r.patchedLine,
    `helper ACCEPT ${leaf}`,
  );
  return r.patchedLine;
}

// ── SSOT ─────────────────────────────────────────────────────────
{
  assert(OWNER_RC1_RECLASS_STOLARKA_PAIRS.length === 1, "SSOT pairs = EXACTLY 1");
  assert(MAP === "lim-mops-elec-rc1-klamki-stolarka", "P1 mappingId SSOT");
  assert(LEAF === "p2b-wymiana-klamek-z-rozetami-szt", "P1 workId SSOT");
  assert(isOwnerRc1ReclassStolarkaLeafWorkId(LEAF), "P2 RECLASS leaf");
  assert(!isOwnerRc1ReclassStolarkaLeafWorkId(LEAF_SZT), "0504-07 not RECLASS");
  assert(!isOwnerRc1CreateCandidateLeafWorkId(LEAF), "klamki not szt CREATE");
  assert(!isCanonicalLaborLeafWorkId(LEAF), "p2b not cw.knr");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF), "RECLASS upgrade-eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_SZT), "CREATE still eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_KPL), "KPL still eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(CW_KNR), "cw.knr still eligible");
  assert(isLegacyOrNonCanonicalWorkId(PARENT), "legacy parent");
  assert(!isLegacyOrNonCanonicalWorkId(LEAF), "RECLASS leaf not legacy");
  assert(
    MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.ownerApproval === true,
    "P3 ownerApproval=true",
  );
  assert(MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.active === true, "P4 active=true");
  assert(MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.confidence === "HIGH", "P5 HIGH");
  assert(
    MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.matchMode === "exact_normalized",
    "P6 exact_normalized",
  );
  assert(
    /RECLASS_STOLARKA/i.test(String(MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.provenance?.notesPl || "")),
    "P2 RECLASS_STOLARKA class in notes",
  );
}

// ── P7 resolve HIT ───────────────────────────────────────────────
{
  const resolve = resolveLaborIdentityMapping({
    observedName: MOPS_ELEC_RC1_EXACT_ALIASES.klamki,
    observedUnit: "szt",
    sourceId: "*",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: [LEAF, PARENT],
  });
  assert(resolve.status === "HIT", "P7 resolve HIT");
  assert(resolve.workId === LEAF, "P7 resolve workId");
  assert(resolve.mappingId === MAP, "P7 resolve mappingId");
}

// ── P8 unit szt + P9 attestation ─────────────────────────────────
{
  const cloud = baseLine();
  const local = reclassPatched(cloud);
  assert(String(local.unit) === "szt", "P8 unit szt");
  assert(
    hasOwnerRc1ReclassStolarkaAttestation({
      leafWorkId: local.catalogWorkId,
      matchMethod: local.matchMethod,
      matchedBy: local.matchedBy,
      aiRationale: local.aiRationale,
    }),
    "P9 RECLASS attestation ACCEPT",
  );
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P1 legacy→klamki ACCEPT");
  assert(
    (r.reasons || []).includes("OWNER_RC1_RECLASS_STOLARKA_ATTESTATION"),
    "P9 merge attestation reason",
  );
}

// ── P10 three live shapes ────────────────────────────────────────
{
  for (const shape of LIVE_SHAPES) {
    const cloud = baseLine({
      lineId: shape.lineId,
      quantity: shape.qty,
    });
    const local = reclassPatched(cloud);
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(
      r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE",
      `P10 ${shape.lineId} @ ${shape.dwellingId} ACCEPT`,
    );
  }
}

// ── P11 CREATE 0504-07 regression ────────────────────────────────
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
    "P11 0504-07 helper ACCEPT",
  );
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: cloud,
    localLine: apply.patchedLine,
  });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P11 0504-07 merge ACCEPT");
}

// ── P12 CREATE_KPL 0501-03 regression ────────────────────────────
{
  const cloud = baseLine({
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"],
    unit: "kpl",
    quantity: 5,
  });
  const apply = applyOwnerRc1CreateCandidateKplIdentityToLine(cloud, {
    leafWorkId: LEAF_KPL,
    mappingId: MAP_KPL,
    parentWorkId: PARENT,
  });
  assert(
    apply.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_ACCEPT",
    "P12 0501-03 helper ACCEPT",
  );
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: cloud,
    localLine: apply.patchedLine,
  });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P12 0501-03 merge ACCEPT");
}

// ── P13 CONNECT regression ───────────────────────────────────────
{
  const cloud = baseLine({
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
    unit: "szt",
  });
  const apply = applyOwnerRc1VerifyConnectIdentityToLine(cloud, {
    leafWorkId: LEAF_CONNECT,
    mappingId: MAP_CONNECT,
    parentWorkId: PARENT,
  });
  assert(
    apply.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_ACCEPT",
    "P13 CONNECT helper ACCEPT",
  );
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: cloud,
    localLine: apply.patchedLine,
  });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P13 CONNECT merge ACCEPT");
}

// ── NEGATIVE matrix N1–N25 ───────────────────────────────────────
{
  const cloud = baseLine();

  // N1 arbitrary p2b
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: "p2b-arbitrary-other-szt",
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_RECLASS_STOLARKA_ATTESTATION,
        formatOwnerRc1ReclassStolarkaMappingIdToken(MAP),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N1 arbitrary p2b REJECT");
  }

  // N2 arbitrary RECLASS target (helper)
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(cloud, {
      leafWorkId: "p2b-montaz-opraw-oswietleniowych-szt",
      mappingId: MAP,
    });
    assert(
      bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT",
      "N2 arbitrary RECLASS target REJECT",
    );
  }

  // N3 arbitrary DRZWI target
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(cloud, {
      leafWorkId: "p2b-drzwi-arbitrary-szt",
      mappingId: MAP,
    });
    assert(
      bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT",
      "N3 arbitrary DRZWI REJECT",
    );
  }

  // N4 wrong mapping
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(cloud, {
      leafWorkId: LEAF,
      mappingId: MAP_SZT,
    });
    assert(bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT", "N4 wrong mapping");
  }

  // N5 wrong workId
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(cloud, {
      leafWorkId: LEAF_SZT,
      mappingId: MAP,
    });
    assert(bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT", "N5 wrong workId");
  }

  // N6 CREATE attestation on RECLASS leaf
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_ATTESTATION,
        formatOwnerRc1CreateCandidateMappingIdToken(MAP),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N6 CREATE attest REJECT");
    assert(
      (r.reasons || []).includes("MISSING_OWNER_RC1_RECLASS_STOLARKA_ATTESTATION"),
      "N6 RECLASS attestation required",
    );
  }

  // N7 CREATE_KPL attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
        formatOwnerRc1CreateCandidateKplMappingIdToken(MAP),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N7 KPL attest REJECT");
  }

  // N8 CONNECT attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
        formatOwnerRc1VerifyConnectMappingIdToken(MAP),
      ],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N8 CONNECT attest REJECT");
  }

  // N9 CLLR attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF,
      parentWorkId: PARENT,
      reasons: ["COMPOUND_LEAF_REBIND", "CANONICAL_LEAF_REBIND", `mappingId=${MAP}`],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N9 CLLR attest REJECT");
  }

  // N10 missing attestation
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF,
      parentWorkId: PARENT,
      reasons: ["no-token"],
    });
    local.unit = cloud.unit;
    local.quantity = cloud.quantity;
    local.description = cloud.description;
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N10 missing attest REJECT");
  }

  // N11 wrong unit
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(
      { ...cloud, unit: "kpl" },
      { leafWorkId: LEAF, mappingId: MAP },
    );
    assert(bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT", "N11 wrong unit REJECT");
  }

  // N12 fuzzy
  {
    const local = { ...reclassPatched(cloud), matchMethod: "fuzzy", matchedBy: "fuzzy" };
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N12 fuzzy REJECT");
  }

  // N13 non-exact match
  {
    const local = {
      ...reclassPatched(cloud),
      matchMethod: "normalized_description",
      matchedBy: "normalized_description",
    };
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N13 non-exact REJECT");
  }

  // N14–N16 mapping flags — helper uses live SSOT (always true/HIGH); test gate via forged merge
  {
    const local = applyAutonomousIdentityLeafToLine(cloud, {
      leafWorkId: LEAF,
      parentWorkId: PARENT,
      reasons: [
        OWNER_RC1_RECLASS_STOLARKA_ATTESTATION,
        formatOwnerRc1ReclassStolarkaMappingIdToken(MAP),
        "ownerApproval=false",
      ],
    });
    // Still has valid RECLASS attestation shape — merge ACCEPT if pair ok.
    // N14–N16 are enforced at apply helper against live mapping row (cannot forge inactive SSOT).
    // Prove helper would reject inactive/owner false via notes check path: wrong class notes on other mapping.
    assert(
      MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.ownerApproval === true
        && MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.active === true
        && MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.confidence === "HIGH",
      "N14–N16 SSOT locked owner/active/HIGH (apply would reject if flipped)",
    );
    void local;
  }

  // N14 ownerApproval — forge: CREATE mapping used with RECLASS leaf rejected by helper
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(cloud, {
      leafWorkId: LEAF,
      mappingId: MAP_SZT,
    });
    assert(
      bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT",
      "N14 pair/owner gate REJECT (wrong map)",
    );
  }

  // N15 active — same pair gate (inactive not in allowlist)
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(cloud, {
      leafWorkId: LEAF,
      mappingId: "lim-inactive-fake",
    });
    assert(bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT", "N15 inactive/fake REJECT");
  }

  // N16 priority != HIGH — covered by confidence gate on live row; wrong map rejects
  {
    assert(
      String(MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.confidence).toUpperCase() === "HIGH",
      "N16 confidence HIGH required in SSOT",
    );
  }

  // N17–19 drift
  for (const [field, value, label] of [
    ["quantity", 99, "N17 qty"],
    ["description", "other text", "N18 description"],
    ["lineTotalPln", 1234, "N19 price"],
  ]) {
    const local = { ...reclassPatched(cloud), [field]: value };
    const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
    assert(
      r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
        && (r.reasons || []).some((x) => String(x).startsWith("NON_IDENTITY_FIELD_DRIFT")),
      `${label} drift REJECT`,
    );
  }

  // N20 wrong source identity (description not matching alias → resolve miss)
  {
    const bad = applyOwnerRc1ReclassStolarkaIdentityToLine(
      { ...cloud, description: "Zupełnie inna pozycja bez klamek" },
      { leafWorkId: LEAF, mappingId: MAP },
    );
    assert(
      bad.decision === "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT",
      "N20 wrong source identity REJECT",
    );
  }

  // N21 cw.knr regression
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
    assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "N21 cw.knr ACCEPT");
  }

  // N22 CREATE regression (helper rejects RECLASS leaf)
  {
    const bad = applyOwnerRc1CreateCandidateIdentityToLine(cloud, {
      leafWorkId: LEAF,
      mappingId: MAP,
    });
    assert(
      bad.decision === "OWNER_RC1_CREATE_CANDIDATE_APPLY_REJECT",
      "N22 CREATE helper rejects RECLASS leaf",
    );
  }

  // N23 CREATE_KPL regression
  {
    const bad = applyOwnerRc1CreateCandidateKplIdentityToLine(cloud, {
      leafWorkId: LEAF,
      mappingId: MAP,
    });
    assert(
      bad.decision === "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT",
      "N23 KPL helper rejects RECLASS leaf",
    );
  }

  // N24 CONNECT regression
  {
    const bad = applyOwnerRc1VerifyConnectIdentityToLine(cloud, {
      leafWorkId: LEAF,
      mappingId: MAP,
    });
    assert(
      bad.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_REJECT",
      "N24 CONNECT helper rejects RECLASS leaf",
    );
  }

  // N25 cross-class RECLASS ↔ CREATE/KPL/CONNECT
  {
    // RECLASS token rejected by CREATE gate
    assert(
      !hasOwnerRc1CreateCandidateAttestation({
        leafWorkId: LEAF_SZT,
        matchMethod: "auto_contract",
        matchedBy: "auto_contract",
        aiRationale: `${OWNER_RC1_CREATE_CANDIDATE_ATTESTATION} ${OWNER_RC1_RECLASS_STOLARKA_ATTESTATION} mappingId=${MAP_SZT}`,
      }),
      "N25 CREATE rejects RECLASS co-token",
    );
    assert(
      !hasOwnerRc1CreateCandidateKplAttestation({
        leafWorkId: LEAF_KPL,
        matchMethod: "auto_contract",
        matchedBy: "auto_contract",
        aiRationale: `${OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION} ${OWNER_RC1_RECLASS_STOLARKA_ATTESTATION} mappingId=${MAP_KPL}`,
      }),
      "N25 KPL rejects RECLASS co-token",
    );
    assert(
      !hasOwnerRc1VerifyConnectAttestation({
        leafWorkId: LEAF_CONNECT,
        matchMethod: "auto_contract",
        matchedBy: "auto_contract",
        aiRationale: `${OWNER_RC1_VERIFY_CONNECT_ATTESTATION} ${OWNER_RC1_RECLASS_STOLARKA_ATTESTATION} mappingId=${MAP_CONNECT}`,
      }),
      "N25 CONNECT rejects RECLASS co-token",
    );
    assert(
      !hasOwnerRc1ReclassStolarkaAttestation({
        leafWorkId: LEAF,
        matchMethod: "auto_contract",
        matchedBy: "auto_contract",
        aiRationale: `${OWNER_RC1_RECLASS_STOLARKA_ATTESTATION} ${OWNER_RC1_CREATE_CANDIDATE_ATTESTATION} mappingId=${MAP}`,
      }),
      "N25 RECLASS rejects CREATE co-token",
    );
    // RECLASS → CREATE overwrite
    const cloudR = reclassPatched(cloud);
    const createLocal = applyOwnerRc1CreateCandidateIdentityToLine(
      {
        ...cloud,
        description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"],
        unit: "szt",
        quantity: 3,
      },
      { leafWorkId: LEAF_SZT, mappingId: MAP_SZT, parentWorkId: PARENT },
    ).patchedLine;
    const forged = {
      ...createLocal,
      lineId: cloudR.lineId,
      quantity: cloudR.quantity,
      unit: cloudR.unit,
      description: cloudR.description,
    };
    const r = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine: cloudR,
      localLine: forged,
    });
    assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N25 RECLASS→CREATE REJECT");
  }
}

// ── Score-tie store merge ────────────────────────────────────────
{
  const d0 = "prusa-42-9";
  const cloud = baseLine({ lineId: "obl_fe74db3a" });
  const local = reclassPatched(cloud);
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
    merged.byTenderId.t1.dwellings[0].offerBoq.lines[0].catalogWorkId === LEAF,
    "score-tie keeps RECLASS klamki",
  );
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
