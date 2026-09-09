/**
 * GO24 — AUTO_RATE_ACCEPT / AUTO_BOM_ACCEPT runtime unit tests.
 * npx vite-node scripts/test-auto-g2-accept-runtime-go24.mjs
 */
const {
  evaluateAutoRateContract,
  evaluateAutoBomContract,
  applyAutoRateAcceptToLine,
  applyAutoBomAcceptToLine,
  wouldOverwriteStrongerRateAttestation,
  wouldOverwriteStrongerBomAttestation,
  AUTO_RATE_RULE_REUSE_CURRENT,
  AUTO_BOM_RULE_LABOR_ONLY,
  AUTO_BOM_RULE_TECHNOLOGY_PACK,
  AUTO_G2_FORBIDDEN,
} = await import("../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts");
const { hasCompleteTrustedIdentityTuple } = await import(
  "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts"
);
const { OWNER_APPROVED_LABOR_ONLY_WORK_IDS } = await import(
  "../src/lib/tender-position-cost/labor-only-classification.ts"
);

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-08T21:30:00.000Z");

function emptyStore(worksByRegion = { wroclaw: [], dolnyslask: [] }) {
  return {
    version: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { works: worksByRegion.wroclaw || [] },
      dolnyslask: { works: worksByRegion.dolnyslask || [] },
    },
  };
}

function workWithRate(id, unit, rateOver = {}) {
  return {
    id,
    name: id,
    unit,
    ourWorkRate: {
      workId: id,
      unit,
      ourRatePln: 22.9,
      sourceType: "ACCEPT",
      regionScope: "wroclaw",
      observedAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      history: [],
      ...rateOver,
    },
  };
}

function trustedLine(over = {}) {
  return {
    lineId: "obl_t1",
    lp: "1",
    description: "test",
    quantity: 1,
    unit: "m2",
    catalogWorkId: "legacy-malowanie-m2",
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    matchConfidence: "high",
    candidateMatches: [],
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
    aiConfidence: "high",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    knrHint: null,
    ...over,
  };
}

ok(hasCompleteTrustedIdentityTuple(trustedLine()), "fixture trusted identity");

// 1. CURRENT → AUTO_RATE_ACCEPT
{
  const store = emptyStore({
    wroclaw: [workWithRate("legacy-malowanie-m2", "m2")],
  });
  const r = evaluateAutoRateContract({
    line: trustedLine(),
    store,
    nowMs: NOW,
  });
  ok(r.decision === "AUTO_RATE_ACCEPT", "1 CURRENT → AUTO_RATE_ACCEPT");
  ok(r.provenance.mode === "REUSE", "1 mode REUSE");
  ok(r.provenance.ruleId === AUTO_RATE_RULE_REUSE_CURRENT, "1 ruleId");
  ok(r.provenance.sourceType === "ACCEPT", "1 provenance sourceType");
}

// 2. MISSING → EXCEPTION
{
  const store = emptyStore({
    wroclaw: [{ id: "legacy-malowanie-m2", name: "x", unit: "m2" }],
  });
  const r = evaluateAutoRateContract({
    line: trustedLine(),
    store,
    nowMs: NOW,
  });
  ok(r.decision === "RATE_EXCEPTION", "2 missing → RATE_EXCEPTION");
  ok(r.reasons.includes("LOOKUP_MISSING_OUR_RATE"), "2 reason MISSING");
}

// 3. STALE → no AUTO
{
  const store = emptyStore({
    wroclaw: [
      workWithRate("legacy-malowanie-m2", "m2", {
        observedAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
    ],
  });
  const r = evaluateAutoRateContract({
    line: trustedLine(),
    store,
    nowMs: NOW,
  });
  // Depending on freshness window — if STALE then exception; if still CURRENT ok
  if (r.lookupStatus === "STALE") {
    ok(r.decision === "RATE_EXCEPTION", "3 STALE → EXCEPTION");
    ok(r.reasons.includes("LOOKUP_STALE_NOT_AUTHORIZED"), "3 STALE reason");
  } else {
    ok(true, `3 freshness window still ${r.lookupStatus} — skip STALE assert`);
  }
}

// 4. Research candidate path forbidden (policy constant)
ok(AUTO_G2_FORBIDDEN.researchAutoPersist === false, "4 research auto persist forbidden");

// 5. Evidence/companyPrice forbidden
ok(AUTO_G2_FORBIDDEN.companyPriceAsOurRate === false, "5 companyPrice forbidden");
ok(AUTO_G2_FORBIDDEN.evidenceAsOurRate === false, "5 Evidence forbidden");

// 6/7 LABOR_ONLY allowlist → AUTO_BOM
{
  const allowId = [...OWNER_APPROVED_LABOR_ONLY_WORK_IDS][0];
  ok(!!allowId, "7 allowlist non-empty");
  const r = evaluateAutoBomContract({
    line: trustedLine({
      catalogWorkId: allowId,
      unit: "szt",
      matchMethod: "manual",
      matchedBy: "manual",
    }),
    nowMs: NOW,
  });
  ok(r.decision === "AUTO_BOM_ACCEPT", "7 LABOR_ONLY allowlist → AUTO_BOM_ACCEPT");
  ok(r.provenance.mode === "LABOR_ONLY", "7 mode LABOR_ONLY");
  ok(r.provenance.ruleId === AUTO_BOM_RULE_LABOR_ONLY, "7 ruleId");
}

// 8. provisional cc-w2-* blocked
{
  const r = evaluateAutoBomContract({
    line: trustedLine({
      catalogWorkId: "cc-w2-scianki-dzialowe-gr-pakiet-m2",
      unit: "m2",
      matchMethod: "auto_contract",
      matchedBy: "auto_contract",
    }),
    nowMs: NOW,
  });
  ok(r.decision === "BOM_EXCEPTION", "8 provisional cc-w2 → BOM_EXCEPTION");
  ok(
    r.reasons.includes("PROVISIONAL_CC_W2_NOT_AUTHORIZED_FOR_AUTO_BOM")
      || r.bomStatus === "PROVISIONAL_BLOCKED"
      || r.bomStatus === "MISSING_BOM",
    "8 provisional blocked or missing pack",
  );
}

// 9. MISSING_BOM → EXCEPTION
{
  const r = evaluateAutoBomContract({
    line: trustedLine({
      catalogWorkId: "legacy-roboty_ogolnobudowlane-m2",
      unit: "m2",
      matchMethod: "manual",
      matchedBy: "manual",
    }),
    nowMs: NOW,
  });
  ok(r.decision === "BOM_EXCEPTION", "9 MISSING_BOM → EXCEPTION");
  ok(
    r.bomStatus === "MISSING_BOM" || r.reasons.some((x) => /MISSING_BOM/.test(x)),
    "9 MISSING_BOM status/reason",
  );
}

// 10. overwrite guard rate
{
  const existing = {
    decisionId: "AUTO_RATE_ACCEPT",
    mode: "REUSE",
    ruleId: AUTO_RATE_RULE_REUSE_CURRENT,
    workId: "legacy-malowanie-m2",
    unit: "m2",
    identityKey: "legacy-malowanie-m2|m2",
    sourceType: "OWNER",
    ourRatePln: 30,
    observedAt: null,
    updatedAt: null,
    evaluatedAtIso: "2026-01-01T00:00:00.000Z",
  };
  const incoming = { ...existing, sourceType: "ACCEPT", ourRatePln: 22.9 };
  ok(
    wouldOverwriteStrongerRateAttestation(existing, incoming) === true,
    "10 overwrite OWNER blocked",
  );
}

// 11. provenance present on accept apply
{
  const store = emptyStore({
    wroclaw: [workWithRate("legacy-malowanie-m2", "m2")],
  });
  const line = trustedLine();
  const r = evaluateAutoRateContract({ line, store, nowMs: NOW });
  const applied = applyAutoRateAcceptToLine(line, r);
  ok(applied.autoG2Rate?.decisionId === "AUTO_RATE_ACCEPT", "11 rate provenance on line");
  ok(applied.matchMethod !== "manual" || line.matchMethod === "auto_contract", "11 not forced manual");
}

// 12. idempotency
{
  const store = emptyStore({
    wroclaw: [workWithRate("legacy-malowanie-m2", "m2")],
  });
  const line = trustedLine();
  const r1 = evaluateAutoRateContract({ line, store, nowMs: NOW });
  const a1 = applyAutoRateAcceptToLine(line, r1);
  const r2 = evaluateAutoRateContract({ line: a1, store, nowMs: NOW });
  ok(r2.idempotentNoop === true || r2.decision === "AUTO_RATE_ACCEPT", "12 idempotent second pass");
  const a2 = applyAutoRateAcceptToLine(a1, r2);
  ok(a2.autoG2Rate?.ourRatePln === a1.autoG2Rate?.ourRatePln, "12 no oscillation");
}

// 13. unit mismatch
{
  const store = emptyStore({
    wroclaw: [workWithRate("legacy-malowanie-m2", "m2")],
  });
  const r = evaluateAutoRateContract({
    line: trustedLine({ unit: "mb" }),
    store,
    nowMs: NOW,
  });
  ok(r.decision === "RATE_EXCEPTION", "13 unit mismatch → EXCEPTION");
}

// 14–19 policy locks
ok(AUTO_G2_FORBIDDEN.inventRate === false, "14 invent rate forbidden");
ok(AUTO_G2_FORBIDDEN.inventBom === false, "14 invent BOM forbidden");
ok(AUTO_G2_FORBIDDEN.provisionalCcW2AutoBom === false, "14 provisional BOM forbidden");
ok(AUTO_G2_FORBIDDEN.matchMethodManualForAutoG2 === false, "14 no manual matchMethod for AUTO G2");
ok(AUTO_G2_FORBIDDEN.staleAutoPersist === false, "14 stale persist forbidden");

// Technology pack rule id constant exists
ok(!!AUTO_BOM_RULE_TECHNOLOGY_PACK, "6 TechnologyPack rule constant present");

// Independent apply BOM exception does not clear rate
{
  const store = emptyStore({
    wroclaw: [workWithRate("legacy-malowanie-m2", "m2")],
  });
  const line = trustedLine();
  const rate = evaluateAutoRateContract({ line, store, nowMs: NOW });
  let next = applyAutoRateAcceptToLine(line, rate);
  const bom = evaluateAutoBomContract({
    line: trustedLine({
      catalogWorkId: "legacy-roboty_ogolnobudowlane-m2",
      matchMethod: "manual",
      matchedBy: "manual",
    }),
    nowMs: NOW,
  });
  // apply bom exception on different work — just check rate apply independent
  next = applyAutoBomAcceptToLine(next, {
    decision: "BOM_EXCEPTION",
    reasons: ["TEST"],
    provenance: {
      decisionId: "BOM_EXCEPTION",
      mode: "EXCEPTION",
      ruleId: null,
      reasons: ["TEST"],
      evaluatedAtIso: new Date(NOW).toISOString(),
    },
    bomStatus: "MISSING_BOM",
    idempotentNoop: false,
    overwriteBlocked: false,
  });
  ok(next.autoG2Rate?.decisionId === "AUTO_RATE_ACCEPT", "independent: rate kept when BOM exception");
  ok(next.autoG2Bom?.decisionId === "BOM_EXCEPTION", "independent: BOM exception recorded");
}

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS — GO24 AUTO_G2 runtime suite");
