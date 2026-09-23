/**
 * OWNER_RC1_VERIFY_CONNECT_LEAF_UPGRADE_v1 — merge + apply helper tests.
 *
 * npx vite-node scripts/test-owner-rc1-verify-connect-merge.mjs
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
import { applyOwnerRc1VerifyConnectIdentityToLine } from "../src/lib/intelligent-estimator/orchestra/owner-rc1-verify-connect-apply.ts";
import {
  OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
  OWNER_RC1_VERIFY_CONNECT_PAIRS,
  formatOwnerRc1VerifyConnectMappingIdToken,
  isOwnerRc1VerifyConnectLeafWorkId,
} from "../src/lib/work-catalog/owner-rc1-verify-connect-contract.ts";
import {
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_EXACT_ALIASES,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog.ts";
import {
  MOPS_ELEC_RC1_MAP_0407_01,
  MOPS_ELEC_RC1_MAP_0504_03,
} from "../src/lib/work-catalog/ik-owner-identity-mapping-mops-electrical-rc1.ts";
import {
  computeOfferBoqIdentityPayloadHash,
  runGatedIdentityPersist,
} from "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts";

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
const LEAF_0407 = MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID;
const LEAF_0504 = MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID;
const MAP_0407 = MOPS_ELEC_RC1_MAP_0407_01.mappingId;
const MAP_0504 = MOPS_ELEC_RC1_MAP_0504_03.mappingId;
const CW_KNR = "cw.knr.knr-4-01.1204-02.m2";
const LEAF_0815 = "cw.knr.knr-2-02.0815-05.m2";

function baseLine(overrides = {}) {
  return {
    lineId: "obl_rc1_test",
    lp: "1",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
    quantity: 10,
    quantityRaw: "10",
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

function rc1Patched(cloudLine, leaf, mappingId) {
  const r = applyOwnerRc1VerifyConnectIdentityToLine(cloudLine, {
    leafWorkId: leaf,
    mappingId,
    parentWorkId: PARENT,
  });
  assert(
    r.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_ACCEPT" && r.patchedLine,
    `helper ACCEPT ${leaf}`,
  );
  return r.patchedLine;
}

// ── SSOT ─────────────────────────────────────────────────────────
{
  assert(OWNER_RC1_VERIFY_CONNECT_PAIRS.length === 2, "SSOT pairs = 2");
  assert(MAP_0407 === "lim-mops-elec-rc1-0407-01-wylacznik-nadpradowy", "0407 mappingId SSOT");
  assert(MAP_0504 === "lim-mops-elec-rc1-0504-03-oprawy-ip20", "0504 mappingId SSOT");
  assert(isOwnerRc1VerifyConnectLeafWorkId(LEAF_0407), "0407 is CONNECT leaf");
  assert(isOwnerRc1VerifyConnectLeafWorkId(LEAF_0504), "0504 is CONNECT leaf");
  assert(!isOwnerRc1VerifyConnectLeafWorkId("p2b-montaz-gniazd-lacznikow-szt"), "arbitrary p2b rejected");
  assert(!isCanonicalLaborLeafWorkId(LEAF_0407), "p2b still not cw.knr predicate");
  assert(isIdentityUpgradeEligibleLeafWorkId(LEAF_0407), "p2b CONNECT upgrade-eligible");
  assert(isIdentityUpgradeEligibleLeafWorkId(CW_KNR), "cw.knr still upgrade-eligible");
  assert(isLegacyOrNonCanonicalWorkId(PARENT), "legacy parent");
  assert(!isLegacyOrNonCanonicalWorkId(LEAF_0407), "CONNECT leaf not legacy/non-canonical");
}

// ── POSITIVE 1–2: merge ACCEPT ───────────────────────────────────
{
  const cloud = baseLine({ lineId: "obl_0407", description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const local = rc1Patched(cloud, LEAF_0407, MAP_0407);
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P1 0407 merge ACCEPT");
  assert(
    (r.reasons || []).includes("OWNER_RC1_VERIFY_CONNECT_ATTESTATION"),
    "P1 RC1 attestation reason",
  );
}
{
  const cloud = baseLine({
    lineId: "obl_0504",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-03"],
    quantity: 6,
  });
  const local = rc1Patched(cloud, LEAF_0504, MAP_0504);
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "P2 0504 merge ACCEPT");
}

// ── POSITIVE 3: score-tie store merge keeps both ──────────────────
{
  const d0407 = "prusa-42-9";
  const d0504 = "dubois-22a-21";
  const cloud0407 = baseLine({
    lineId: "obl_89c4e932",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
  });
  const cloud0504 = baseLine({
    lineId: "obl_3306cb09",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-03"],
    quantity: 6,
  });
  const local0407 = rc1Patched(cloud0407, LEAF_0407, MAP_0407);
  const local0504 = rc1Patched(cloud0504, LEAF_0504, MAP_0504);

  function pkg(linesByDwelling) {
    return {
      tenderId: "08def932-550d-d6f5-962b-1200014aa6e7",
      mode: "multi",
      expectedDwellingCount: 2,
      dwellings: Object.entries(linesByDwelling).map(([dwellingId, lines]) => ({
        dwellingId,
        labelPl: dwellingId,
        sourceDocumentIds: [`doc-${dwellingId}`],
        offerBoq: {
          schemaVersion: 1,
          lines,
          mappingAppliedAt: "2026-09-22T00:00:00.000Z",
        },
        costMulti: null,
        f5Gate: null,
        subtotals: null,
      })),
      documentToDwelling: {
        [`doc-${d0407}`]: d0407,
        [`doc-${d0504}`]: d0504,
      },
    };
  }

  const cloudStore = {
    version: 1,
    byTenderId: {
      t1: pkg({
        [d0407]: [cloud0407],
        [d0504]: [cloud0504],
      }),
    },
  };
  const localStore = {
    version: 1,
    byTenderId: {
      t1: pkg({
        [d0407]: [local0407],
        [d0504]: [local0504],
      }),
    },
  };
  const merged = mergeMultiDwellingPackageStore(localStore, cloudStore);
  const mPkg = merged.byTenderId.t1;
  const l0 = mPkg.dwellings.find((d) => d.dwellingId === d0407).offerBoq.lines[0];
  const l1 = mPkg.dwellings.find((d) => d.dwellingId === d0504).offerBoq.lines[0];
  assert(l0.catalogWorkId === LEAF_0407, "P3 score-tie keeps 0407 CONNECT");
  assert(l1.catalogWorkId === LEAF_0504, "P3 score-tie keeps 0504 CONNECT");
}

// ── POSITIVE 4: identical CONNECT KEEP ───────────────────────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const local = rc1Patched(cloud, LEAF_0407, MAP_0407);
  const r = evaluateCanonicalIdentityUpgradeMerge({
    cloudLine: local,
    localLine: local,
  });
  assert(
    r.decision === "KEEP_CLOUD",
    `P4 identical CONNECT KEEP (got ${r.decision})`,
  );
}

// ── NEGATIVE 5: arbitrary p2b ────────────────────────────────────
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: "p2b-montaz-gniazd-lacznikow-szt",
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
      formatOwnerRc1VerifyConnectMappingIdToken(MAP_0407),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N5 arbitrary p2b REJECT");
  assert((r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"), "N5 LOCAL_NOT_CANONICAL_LEAF");
}

// ── NEGATIVE 6: wrong mappingId ──────────────────────────────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_0407,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
      formatOwnerRc1VerifyConnectMappingIdToken(MAP_0504), // wrong
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N6 wrong mappingId REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_VERIFY_CONNECT_ATTESTATION"),
    "N6 missing/invalid RC1 attestation",
  );
}

// ── NEGATIVE 7–8: missing OWNER_RC1 / only AUTONOMOUS writeback ───
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: LEAF_0407,
    parentWorkId: PARENT,
    reasons: ["no-rc1-token"],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N7/8 no RC1 attestation REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_VERIFY_CONNECT_ATTESTATION"),
    "N7 MISSING_OWNER_RC1_VERIFY_CONNECT_ATTESTATION",
  );
}

// ── NEGATIVE 9: fuzzy ────────────────────────────────────────────
{
  const cloud = baseLine();
  const local = {
    ...rc1Patched(cloud, LEAF_0407, MAP_0407),
    matchMethod: "fuzzy",
    matchedBy: "fuzzy",
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N9 fuzzy REJECT");
}

// ── NEGATIVE 10–13: non-identity drift ───────────────────────────
for (const [field, value, label] of [
  ["unit", "kpl", "unit"],
  ["quantity", 99, "qty"],
  ["description", "other text", "description"],
  ["lineTotalPln", 1234, "price"],
]) {
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const local = { ...rc1Patched(cloud, LEAF_0407, MAP_0407), [field]: value };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE"
      && (r.reasons || []).some((x) => String(x).startsWith("NON_IDENTITY_FIELD_DRIFT")),
    `N drift ${label} REJECT`,
  );
}

// ── NEGATIVE 14–16: other CREATE / OPEN leaves (0504-07 → CREATE class; CONNECT attest still REJECT) ──
{
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: MOPS_ELEC_RC1_0504_07_WORK_ID,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
      formatOwnerRc1VerifyConnectMappingIdToken(MAP_0407),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N CREATE 0504-07 with CONNECT attest REJECT");
  assert(
    (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION")
      || (r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"),
    "N 0504-07 requires CREATE attestation (not CONNECT)",
  );
}
for (const [leaf, label] of [
  [MOPS_ELEC_RC1_0501_03_WORK_ID, "0501-03"],
  ["p2b-demontaz-baterii-armatury-szt", "OPEN/other p2b"],
]) {
  const cloud = baseLine();
  const local = applyAutonomousIdentityLeafToLine(cloud, {
    leafWorkId: leaf,
    parentWorkId: PARENT,
    reasons: [
      OWNER_RC1_VERIFY_CONNECT_ATTESTATION,
      formatOwnerRc1VerifyConnectMappingIdToken(MAP_0407),
    ],
  });
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", `N CREATE/OPEN ${label} REJECT`);
  if (label === "0501-03") {
    assert(
      (r.reasons || []).includes("MISSING_OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION")
        || (r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"),
      `N ${label} requires KPL class (not CONNECT)`,
    );
  } else {
    assert((r.reasons || []).includes("LOCAL_NOT_CANONICAL_LEAF"), `N ${label} NOT_CANONICAL`);
  }
}

// ── NEGATIVE / REGRESSION 17: cw.knr still ACCEPT ────────────────
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
  assert(r.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE", "R17 cw.knr regression ACCEPT");
}

// ── NEGATIVE 18: CONNECT A → CONNECT B ───────────────────────────
{
  const cloudBase = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const cloud = rc1Patched(cloudBase, LEAF_0407, MAP_0407);
  const localBase = baseLine({
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-03"],
    quantity: 6,
  });
  // Force same lineId, swap leaf (simulate illegal change)
  const local = {
    ...rc1Patched(localBase, LEAF_0504, MAP_0504),
    lineId: cloud.lineId,
    quantity: cloud.quantity,
    unit: cloud.unit,
    description: cloud.description,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(
    r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE",
    `N18 CONNECT→CONNECT change REJECT (got ${r.decision})`,
  );
  assert(
    (r.reasons || []).includes("NO_DOWNGRADE_OR_OVERWRITE_CANONICAL_CLOUD"),
    "N18 anti-overwrite",
  );
}

// ── NEGATIVE 19: 0815-05 untouched ───────────────────────────────
{
  const cloud = baseLine({
    unit: "m2",
    catalogWorkId: LEAF_0815,
    description: "Gładź 0815-05",
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
  });
  const local = {
    ...cloud,
    catalogWorkId: LEAF_0407,
    aiRationale: `${OWNER_RC1_VERIFY_CONNECT_ATTESTATION} · ${formatOwnerRc1VerifyConnectMappingIdToken(MAP_0407)}`,
  };
  const r = evaluateCanonicalIdentityUpgradeMerge({ cloudLine: cloud, localLine: local });
  assert(r.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE", "N19 0815-05 reject");
  assert(
    (r.reasons || []).includes("0815_05_MUST_REMAIN_UNTOUCHED")
      || (r.reasons || []).includes("NO_DOWNGRADE_OR_OVERWRITE_CANONICAL_CLOUD"),
    "N19 0815 or anti-downgrade",
  );
}

// ── NEGATIVE 20: helper rejects wrong mapping / leaf ─────────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"] });
  const bad = applyOwnerRc1VerifyConnectIdentityToLine(cloud, {
    leafWorkId: LEAF_0407,
    mappingId: MAP_0504,
  });
  assert(bad.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_REJECT", "N20 helper pair mismatch");
  assert(bad.patchedLine == null, "N20 no patch");
}

// ── Helper: invent COMPOUND token not required; RC1 path ─────────
{
  const cloud = baseLine({ description: MOPS_ELEC_RC1_EXACT_ALIASES["0504-03"], quantity: 6 });
  const ok = applyOwnerRc1VerifyConnectIdentityToLine(cloud, {
    leafWorkId: LEAF_0504,
    mappingId: MAP_0504,
  });
  assert(ok.decision === "OWNER_RC1_VERIFY_CONNECT_APPLY_ACCEPT", "helper 0504 ACCEPT");
  const rat = String(ok.patchedLine?.aiRationale || "");
  assert(rat.includes(OWNER_RC1_VERIFY_CONNECT_ATTESTATION), "helper emits RC1 attestation");
  assert(!rat.includes("COMPOUND_LEAF_REBIND"), "helper does not fake COMPOUND");
  assert(!rat.includes("CANONICAL_LEAF_REBIND"), "helper does not fake CANONICAL");
  assert(ok.patchedLine.quantity === cloud.quantity, "qty preserved");
  assert(ok.patchedLine.unit === cloud.unit, "unit preserved");
  assert(ok.patchedLine.description === cloud.description, "description preserved");
}

// ── Persist glue: IDENTICAL_PAYLOAD / session (in-memory LS) ─────
{
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
  const { MULTI_DWELLING_PACKAGE_LS_KEY } = await import(
    "../src/lib/multi-dwelling/constants.ts"
  );
  const { upsertTenderPackage, getTenderPackage } = await import(
    "../src/lib/multi-dwelling/store.ts"
  );
  const TID = "tid-rc1-persist-test";
  const cloud = baseLine({
    lineId: "obl_persist_1",
    description: MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"],
  });
  const patched = rc1Patched(cloud, LEAF_0407, MAP_0407);
  const offerBoq = {
    schemaVersion: 1,
    lines: [patched],
    mappingAppliedAt: new Date().toISOString(),
  };
  const pkg = {
    tenderId: TID,
    mode: "legacy_single",
    expectedDwellingCount: 1,
    dwellings: [
      {
        dwellingId: "d1",
        labelPl: "d1",
        sourceDocumentIds: [],
        offerBoq: { schemaVersion: 1, lines: [cloud] },
        costMulti: null,
        f5Gate: null,
        subtotals: null,
      },
    ],
    documentToDwelling: {},
  };
  localStorage.setItem(
    MULTI_DWELLING_PACKAGE_LS_KEY,
    JSON.stringify({ version: 1, byTenderId: { [TID]: pkg } }),
  );
  upsertTenderPackage(pkg);

  const hash = computeOfferBoqIdentityPayloadHash(offerBoq.lines);
  const plan = { dwellingId: "d1", identityHash: hash, offerBoq };
  const gate = new Map();
  const first = runGatedIdentityPersist({
    tenderId: TID,
    package: getTenderPackage(TID),
    plans: [plan],
    sessionGate: gate,
  });
  assert(first.writes.length === 1, "persist first write");
  const second = runGatedIdentityPersist({
    tenderId: TID,
    package: getTenderPackage(TID),
    plans: [plan],
    sessionGate: gate,
  });
  assert(
    second.skips.some(
      (s) =>
        s.reason === "IDENTICAL_PAYLOAD" || s.reason === "ALREADY_WRITTEN_SESSION",
    ),
    `persist idempotent skip (got ${JSON.stringify(second.skips)})`,
  );
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
