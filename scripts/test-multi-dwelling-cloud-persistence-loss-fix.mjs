/**
 * IK-IDENTITY-KLAMKI-CLOUD-PERSISTENCE-LOSS-FIX-C-D — regression
 *
 * C: SUCCESS forbidden while cloudFlush pending; await settle required
 * D: CLOUD readback required for SUCCESS; 2/3 / mismatch / protected drift = FAIL
 * Live cloud: fail-closed without ALLOW opt-in (BLOCKED, not hang)
 *
 * npx vite-node scripts/test-multi-dwelling-cloud-persistence-loss-fix.mjs
 */
import assert from "node:assert/strict";

process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH = "1";
delete process.env.WGDOM_ALLOW_LIVE_MULTI_DWELLING_CLOUD_PUSH;

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

const {
  MULTI_DWELLING_PACKAGE_LS_KEY,
  clearMultiDwellingPackageStore,
  confirmDwelling,
  enableMultiDwellingMode,
  mapDocumentToDwelling,
  getTenderPackage,
  attachOfferBoqToDwelling,
  resetMultiDwellingCloudPushAttemptCountForTests,
  getMultiDwellingCloudPushAttemptCountForTests,
  runWithMultiDwellingCloudPushSuspended,
  saveMultiDwellingPackageStore,
  loadMultiDwellingPackageStore,
  flushMultiDwellingPackageStoreToCloud,
  assertMultiDwellingLiveCloudWriteAllowed,
  isMultiDwellingLiveCloudWriteAllowed,
} = await import("../src/lib/multi-dwelling/index.ts");

const {
  computeOfferBoqIdentityPayloadHash,
  runGatedIdentityPersist,
  runGatedIdentityPersistAwaitCloud,
  settleGatedIdentityPersistCloud,
  shouldLatchIdentityPersistAttempt,
  isGatedIdentityPersistSuccess,
  setGatedIdentityCloudPackageReaderForTests,
  verifyGatedIdentityCloudReadback,
  readbackGatedIdentityLocalLines,
} = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts"
);

const TID = "tender-persist-loss-fix-cd";
const TARGET = "p2b-wymiana-klamek-z-rozetami-szt";
const PARENT = "legacy-elektryka-szt";
const DWELLINGS = [
  { id: "prusa-42-9", lineId: "obl_fe74db3a", qty: 8, doc: "doc-prusa" },
  { id: "dubois-22a-21", lineId: "obl_f8c7b307", qty: 6, doc: "doc-dubois" },
  { id: "wygodna-10-6", lineId: "obl_d6175564", qty: 9, doc: "doc-wygodna" },
];

let passed = 0;
function ok(name, cond) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    process.exit(1);
  }
  console.log(`PASS: ${name}`);
  passed += 1;
}

function makeBoq(lines) {
  return {
    schemaVersion: 1,
    tenderId: TID,
    version: 1,
    builtAt: "2026-09-23T00:00:00.000Z",
    buildStatus: "ok",
    lines,
    totals: {},
    warnings: [],
  };
}

function makeLine(lineId, qty, workId, method = "catalog_map") {
  return {
    lineId,
    lp: "7",
    description: "Wymiana klamek z rozetami",
    quantity: qty,
    unit: "szt",
    catalogWorkId: workId,
    matchMethod: method,
    matchedBy: method,
    matchConfidence: "high",
    aiRationale:
      workId === TARGET
        ? "OWNER_RC1_RECLASS_STOLARKA mappingId=lim-mops-elec-rc1-klamki-stolarka RECLASS_STOLARKA"
        : "legacy map",
    candidateMatches: [],
    warnings: [],
    lineTotalPln: null,
    laborCostPln: null,
    materialCostPln: null,
    isNoise: false,
  };
}

function seedPackage() {
  clearMultiDwellingPackageStore();
  ls.clear();
  setGatedIdentityCloudPackageReaderForTests(null);
  enableMultiDwellingMode(TID, { expectedDwellingCount: 3 });
  for (const d of DWELLINGS) {
    assert.equal(
      confirmDwelling({ tenderId: TID, dwellingId: d.id, labelPl: d.id }).ok,
      true,
    );
    assert.equal(
      mapDocumentToDwelling({
        tenderId: TID,
        documentId: d.doc,
        dwellingId: d.id,
      }).ok,
      true,
    );
    const lines = [
      makeLine(d.lineId, d.qty, PARENT, "catalog_map"),
      makeLine(`other-${d.id}`, 1, "legacy-other", "catalog_map"),
    ];
    assert.equal(
      attachOfferBoqToDwelling({
        tenderId: TID,
        dwellingId: d.id,
        offerBoq: makeBoq(lines),
        cloud: false,
      }).ok,
      true,
    );
  }
}

function buildPlans(subset = DWELLINGS) {
  const pkg = getTenderPackage(TID);
  const plans = [];
  for (const d of subset) {
    const unit = pkg.dwellings.find((x) => x.dwellingId === d.id);
    const nextLines = unit.offerBoq.lines.map((ln) =>
      ln.lineId === d.lineId
        ? makeLine(d.lineId, d.qty, TARGET, "auto_contract")
        : ln,
    );
    plans.push({
      dwellingId: d.id,
      identityHash: computeOfferBoqIdentityPayloadHash(nextLines),
      offerBoq: { ...unit.offerBoq, lines: nextLines },
    });
  }
  return plans;
}

// ── Live-cloud fail-closed guard ─────────────────────────────────
{
  ok(
    "non-browser without ALLOW: live write NOT allowed",
    isMultiDwellingLiveCloudWriteAllowed() === false,
  );
  let blocked = false;
  try {
    // Soft-disable takes precedence in assert — temporarily clear
    const prev = process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH;
    delete process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH;
    assertMultiDwellingLiveCloudWriteAllowed("test-probe");
  } catch (e) {
    blocked = String(e.message || e).includes("WGDOM_LIVE_CLOUD_BLOCKED");
  } finally {
    process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH = "1";
  }
  ok("LIVE_CLOUD_WRITE_ATTEMPT = BLOCKED (assert throws)", blocked);

  // flush without soft-disable should return blocked/ok:false
  {
    const prev = process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH;
    delete process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH;
    const r = await flushMultiDwellingPackageStoreToCloud(
      loadMultiDwellingPackageStore(),
    );
    process.env.WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH = prev || "1";
    ok(
      "flush without ALLOW: ok=false blocked",
      r.ok === false && r.blocked === true,
    );
  }
}

// ── A: pending → SUCCESS REJECT ──────────────────────────────────
{
  seedPackage();
  resetMultiDwellingCloudPushAttemptCountForTests();
  const plans = buildPlans(DWELLINGS);
  const pending = runGatedIdentityPersist({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  ok("A: cloudFlush pending", pending.cloudFlush === "pending");
  ok("A: gateStatus incomplete", pending.gateStatus === "incomplete");
  ok("A: success === false", pending.success === false);
  ok("A: isGatedIdentityPersistSuccess REJECT", !isGatedIdentityPersistSuccess(pending));
  ok("A: shouldLatch REJECT while pending", !shouldLatchIdentityPersistAttempt(pending));
}

// ── B+D: resolved flush + readback 3/3 SUCCESS ───────────────────
{
  seedPackage();
  resetMultiDwellingCloudPushAttemptCountForTests();
  const plans = buildPlans(DWELLINGS);
  const outcome = await runGatedIdentityPersistAwaitCloud({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  ok("B: cloudFlush completed|skipped", outcome.cloudFlush !== "pending");
  ok("D: cloudReadback pass", outcome.cloudReadback === "pass");
  ok("D: readback 3 dwellings lines ok", outcome.cloudReadbackOkCount === outcome.cloudReadbackTargetCount && outcome.cloudReadbackTargetCount > 0);
  ok("B: gateStatus success", outcome.gateStatus === "success");
  ok("B: isGatedIdentityPersistSuccess", isGatedIdentityPersistSuccess(outcome));
  ok("B: latch OK after success", shouldLatchIdentityPersistAttempt(outcome));
  ok("H: exactly 1 cloud flush attempt", getMultiDwellingCloudPushAttemptCountForTests() === 1);
  const fail = readbackGatedIdentityLocalLines({
    tenderId: TID,
    lineIds: ["obl_d6175564"],
  })[0];
  ok("H: wygodna TARGET (lost-update closed)", fail.catalogWorkId === TARGET);
}

// ── C: flush rejected → SUCCESS REJECT ───────────────────────────
{
  seedPackage();
  const plans = buildPlans([DWELLINGS[0]]);
  const pending = runGatedIdentityPersist({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  // Force settle with a rejected flush promise
  const forced = {
    ...pending,
    cloudFlushPromise: Promise.resolve({
      ok: false,
      error: "SIMULATED_FLUSH_FAIL",
    }),
  };
  const settled = await settleGatedIdentityPersistCloud(forced, {
    tenderId: TID,
    plans,
  });
  ok("C: flush fail → gateStatus fail", settled.gateStatus === "fail");
  ok("C: success false", settled.success === false);
  ok("C: isGatedIdentityPersistSuccess REJECT", !isGatedIdentityPersistSuccess(settled));
}

// ── E: cloud readback 2/3 → FAIL ─────────────────────────────────
{
  seedPackage();
  const plans = buildPlans(DWELLINGS);
  setGatedIdentityCloudPackageReaderForTests(async () => {
    const pkg = structuredClone(getTenderPackage(TID));
    // Drop RECLASS on wygodna — simulate lost-update durable state
    const w = pkg.dwellings.find((d) => d.dwellingId === "wygodna-10-6");
    for (const ln of w.offerBoq.lines) {
      if (ln.lineId === "obl_d6175564") {
        ln.catalogWorkId = PARENT;
        ln.matchMethod = "catalog_map";
        ln.matchedBy = "catalog_map";
        ln.aiRationale = "legacy map";
      }
    }
    return pkg;
  });
  const outcome = await runGatedIdentityPersistAwaitCloud({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  setGatedIdentityCloudPackageReaderForTests(null);
  ok("E: cloudReadback fail", outcome.cloudReadback === "fail");
  ok("E: okCount < targetCount", outcome.cloudReadbackOkCount < outcome.cloudReadbackTargetCount);
  ok("E: SUCCESS REJECT", !isGatedIdentityPersistSuccess(outcome));
  ok("E: gateStatus fail", outcome.gateStatus === "fail");
}

// ── F: identity mismatch → FAIL ──────────────────────────────────
{
  seedPackage();
  const plans = buildPlans([DWELLINGS[0]]);
  setGatedIdentityCloudPackageReaderForTests(async () => {
    const pkg = structuredClone(getTenderPackage(TID));
    const d = pkg.dwellings.find((x) => x.dwellingId === "prusa-42-9");
    for (const ln of d.offerBoq.lines) {
      if (ln.lineId === "obl_fe74db3a") {
        ln.catalogWorkId = "wrong-work-id";
      }
    }
    return pkg;
  });
  const outcome = await runGatedIdentityPersistAwaitCloud({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  setGatedIdentityCloudPackageReaderForTests(null);
  ok("F: identity mismatch FAIL", outcome.gateStatus === "fail");
  ok(
    "F: WORK_ID_MISMATCH reason",
    outcome.cloudReadbackLines.some((l) => l.reason === "WORK_ID_MISMATCH"),
  );
}

// ── G: protected field drift → FAIL ──────────────────────────────
{
  seedPackage();
  const plans = buildPlans([DWELLINGS[0]]);
  setGatedIdentityCloudPackageReaderForTests(async () => {
    const pkg = structuredClone(getTenderPackage(TID));
    const d = pkg.dwellings.find((x) => x.dwellingId === "prusa-42-9");
    for (const ln of d.offerBoq.lines) {
      if (ln.lineId === "obl_fe74db3a") {
        ln.quantity = 999;
      }
    }
    return pkg;
  });
  const outcome = await runGatedIdentityPersistAwaitCloud({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  setGatedIdentityCloudPackageReaderForTests(null);
  ok("G: protected drift FAIL", outcome.gateStatus === "fail");
  ok(
    "G: PROTECTED_FIELD_DRIFT",
    outcome.cloudReadbackLines.some((l) => l.reason === "PROTECTED_FIELD_DRIFT"),
  );
}

// ── I: single-line PASS ──────────────────────────────────────────
{
  seedPackage();
  const plans = buildPlans([DWELLINGS[0]]);
  const outcome = await runGatedIdentityPersistAwaitCloud({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  ok("I: single-line SUCCESS", isGatedIdentityPersistSuccess(outcome));
}

// ── J: 2-line PASS ───────────────────────────────────────────────
{
  seedPackage();
  const plans = buildPlans(DWELLINGS.slice(0, 2));
  const outcome = await runGatedIdentityPersistAwaitCloud({
    tenderId: TID,
    plans,
    sessionGate: new Map(),
  });
  ok("J: 2-line SUCCESS", isGatedIdentityPersistSuccess(outcome));
  const third = readbackGatedIdentityLocalLines({
    tenderId: TID,
    lineIds: ["obl_d6175564"],
  })[0];
  ok("J: third remains legacy", third.catalogWorkId === PARENT);
}

// ── suspend still blocks intermediate saves ──────────────────────
{
  seedPackage();
  resetMultiDwellingCloudPushAttemptCountForTests();
  const before = getMultiDwellingCloudPushAttemptCountForTests();
  runWithMultiDwellingCloudPushSuspended(() => {
    const store = loadMultiDwellingPackageStore();
    saveMultiDwellingPackageStore(store);
    saveMultiDwellingPackageStore(store);
  });
  ok(
    "suspend: saves do not increment cloud push",
    getMultiDwellingCloudPushAttemptCountForTests() === before,
  );
}

console.log(`\nOK ${passed} assertions · key=${MULTI_DWELLING_PACKAGE_LS_KEY}`);
console.log("LIVE_CLOUD_MUTATION = 0");
process.exit(0);
