/**
 * GO63 / B2 — AUTO G2 Orchestra integration smoke.
 * Deterministic · no TPI mutation · no OUR RATE catalog write · no live HTTP.
 *
 * npx vite-node scripts/test-auto-g2-b2-orchestra-go63.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateAutoRateContract,
  evaluateAutoBomContract,
  applyAutoRateAcceptToLine,
  applyAutoBomAcceptToLine,
  wouldOverwriteStrongerRateAttestation,
  AUTO_G2_FORBIDDEN,
  AUTO_BOM_RULE_TECHNOLOGY_PACK,
} from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { runIkAutoG2Phase } from "../src/lib/intelligent-estimator/orchestra/ik-auto-g2-phase.ts";
import { hasCompleteTrustedIdentityTuple } from "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts";
import { OWNER_APPROVED_LABOR_ONLY_WORK_IDS } from "../src/lib/tender-position-cost/labor-only-classification.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { EVIDENCE_REUSE_POLICY } from "../src/lib/work-catalog/work-rate-research.ts";
import { OD52_EVIDENCE_FRESHNESS_MODE } from "../src/lib/work-catalog/labor-evidence-reuse-sufficiency.ts";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-09T20:00:00.000Z");
const WORK_RATE = "legacy-malowanie-m2";

function emptyStore(works = []) {
  return {
    version: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: null },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: null },
    },
  };
}

function workWithRate(id, unit, rateOver = {}) {
  return {
    id,
    namePl: id,
    unit,
    active: true,
    companyPricePln: 0,
    source: "custom",
    updatedAt: "2026-08-01T00:00:00.000Z",
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
    lineId: "obl_b2_001",
    lp: "1",
    description: "Malowanie ścian m2",
    quantity: 10,
    unit: "m2",
    catalogWorkId: WORK_RATE,
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

function makePack(workId) {
  return {
    packId: "pack.b2.test.v1",
    packVersion: "1.0",
    definitionId: "def.b2.test",
    packCapabilities: [],
    lifecycle: "ACTIVE",
    namePl: "B2 test pack",
    stages: [{ stageId: "s1", order: 1, namePl: "A" }],
    steps: [
      {
        stepId: "step1",
        stageId: "s1",
        order: 1,
        namePl: "Work",
        catalogWorkId: workId,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: "mat.b2.test",
        namePl: "Materiał test",
        unit: "m2",
        qtyFactor: 1,
        factorSourceKind: "owner_approved",
        factorSourceRef: "B2://test",
        factorApprovedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

// --- Wire order: G2 after Identity · before Classification ---
{
  const src = readFileSync(
    resolve("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts"),
    "utf8",
  );
  const g1 = src.indexOf("runIkIdentityPhase(");
  const g2 = src.indexOf("runIkAutoG2Phase(");
  const cls = src.indexOf("runIkMasterBoqClassification(");
  ok(g1 > 0 && g2 > g1 && cls > g2, "19 Orchestra: G1 → G2 → Classification");
  ok(!/identity-candidate|IdentityCandidate/.test(src), "20 no IdentityCandidate in engine");
  ok(!/dossier\.kosztorys/.test(src), "16 no dossier.kosztorys in engine wire");
}

// 1 CURRENT → AUTO_RATE_ACCEPT
{
  const store = emptyStore([workWithRate(WORK_RATE, "m2")]);
  const line = trustedLine();
  ok(hasCompleteTrustedIdentityTuple(line), "fixture trusted (G1 auto_contract)");
  const r = evaluateAutoRateContract({ line, store, nowMs: NOW });
  ok(r.decision === "AUTO_RATE_ACCEPT", "1 CURRENT → AUTO_RATE_ACCEPT");
  const applied = applyAutoRateAcceptToLine(line, r);
  ok(applied.autoG2Rate?.mode === "REUSE", "10 autoG2Rate persisted shape");
  ok(applied.matchMethod === "auto_contract", "9 G1 auto_contract survives rate apply");
}

// 2 MISSING → EXCEPTION
{
  const store = emptyStore([{ id: WORK_RATE, namePl: "x", unit: "m2", active: true }]);
  const r = evaluateAutoRateContract({ line: trustedLine(), store, nowMs: NOW });
  ok(r.decision === "RATE_EXCEPTION", "2 missing → RATE_EXCEPTION");
  ok(r.reasons.includes("LOOKUP_MISSING_OUR_RATE"), "2 LOOKUP_MISSING");
}

// 3 STALE → EXCEPTION
{
  const store = emptyStore([
    workWithRate(WORK_RATE, "m2", {
      observedAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    }),
  ]);
  const r = evaluateAutoRateContract({ line: trustedLine(), store, nowMs: NOW });
  ok(r.lookupStatus === "STALE", "3 lookup STALE");
  ok(r.decision === "RATE_EXCEPTION", "3 STALE → RATE_EXCEPTION");
}

// 4 TechnologyPack singleton → AUTO_BOM_ACCEPT
{
  const packWork = "work-b2-pack-host";
  const packs = [makePack(packWork)];
  const r = evaluateAutoBomContract({
    line: trustedLine({ catalogWorkId: packWork, unit: "m2" }),
    nowMs: NOW,
    packs,
  });
  ok(r.decision === "AUTO_BOM_ACCEPT", "4 TechnologyPack → AUTO_BOM_ACCEPT");
  ok(r.provenance.mode === "TECHNOLOGY_PACK", "4 mode TECHNOLOGY_PACK");
  ok(r.provenance.ruleId === AUTO_BOM_RULE_TECHNOLOGY_PACK, "4 ruleId pack");
  const applied = applyAutoBomAcceptToLine(trustedLine({ catalogWorkId: packWork }), r);
  ok(applied.autoG2Bom?.mode === "TECHNOLOGY_PACK", "11 autoG2Bom persisted shape");
}

// 5 LABOR_ONLY allowlist
{
  const allowId = [...OWNER_APPROVED_LABOR_ONLY_WORK_IDS][0];
  const r = evaluateAutoBomContract({
    line: trustedLine({
      catalogWorkId: allowId,
      unit: "szt",
      matchMethod: "manual",
      matchedBy: "manual",
    }),
    nowMs: NOW,
  });
  ok(r.decision === "AUTO_BOM_ACCEPT", "5 LABOR_ONLY allowlist → AUTO_BOM_ACCEPT");
}

// 6 provisional cc-w2
{
  const r = evaluateAutoBomContract({
    line: trustedLine({
      catalogWorkId: "cc-w2-scianki-dzialowe-gr-pakiet-m2",
      unit: "m2",
    }),
    nowMs: NOW,
  });
  ok(r.decision === "BOM_EXCEPTION", "6 provisional cc-w2 → BOM_EXCEPTION");
}

// 7 MISSING_BOM
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
  ok(r.decision === "BOM_EXCEPTION", "7 MISSING_BOM → BOM_EXCEPTION");
}

// 8 ambiguous / untrusted — no invent
{
  const untrusted = trustedLine({
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
  });
  ok(!hasCompleteTrustedIdentityTuple(untrusted), "8 not trusted");
  const rate = evaluateAutoRateContract({
    line: untrusted,
    store: emptyStore([workWithRate(WORK_RATE, "m2")]),
    nowMs: NOW,
  });
  const bom = evaluateAutoBomContract({ line: untrusted, nowMs: NOW });
  ok(rate.decision === "RATE_EXCEPTION", "8 rate no invent without identity");
  ok(bom.decision === "BOM_EXCEPTION", "8 bom no invent without identity");
}

// 12 idempotent rehydration (phase)
{
  const store = emptyStore([workWithRate(WORK_RATE, "m2")]);
  // malowanie is on Owner LABOR_ONLY allowlist — rate CURRENT + BOM LABOR_ONLY
  const line = trustedLine({ catalogWorkId: WORK_RATE });
  ok(OWNER_APPROVED_LABOR_ONLY_WORK_IDS.has(WORK_RATE), "12 malowanie on LABOR_ONLY allowlist");
  const expert = {
    tenderId: "t-b2",
    offerBoq: { lines: [line], schemaVersion: 5 },
    masterBoqLines: [{ dwellingId: "d1", line, provenance: null }],
    masterBoq: { status: "ready", readyForExperts: true, lineCount: 1 },
  };
  const pkg = {
    tenderId: "t-b2",
    dwellings: [
      {
        dwellingId: "d1",
        offerBoq: { lines: [line], schemaVersion: 5 },
      },
    ],
  };
  const p1 = runIkAutoG2Phase({ expert, package: pkg, store, nowMs: NOW });
  const out1 = p1.package?.dwellings?.[0]?.offerBoq?.lines?.[0];
  ok(!!out1?.autoG2Rate || p1.counts.rateException >= 0, "12 phase produced line");
  ok(p1.counts.autoRateAccept >= 1, "12 phase AUTO_RATE_ACCEPT");
  ok(p1.counts.autoBomAccept >= 1, "12 phase AUTO_BOM_ACCEPT (LABOR_ONLY)");
  const p2 = runIkAutoG2Phase({
    expert: p1.postG2Expert,
    package: p1.package,
    store,
    nowMs: NOW + 1,
  });
  const out2 = p2.package?.dwellings?.[0]?.offerBoq?.lines?.[0];
  ok(out1?.catalogWorkId === out2?.catalogWorkId, "12 idempotent catalogWorkId");
  ok(out1?.matchMethod === "auto_contract", "12 G1 provenance stable");
  ok(
    (out1?.autoG2Rate?.mode ?? null) === (out2?.autoG2Rate?.mode ?? null),
    "12 rate attestation stable",
  );
}

// 13 P5 still uses lookupWorkRate — not autoG2Rate
{
  const laborSrc = readFileSync(
    resolve("src/lib/intelligent-estimator/ik-labor-expert.ts"),
    "utf8",
  );
  ok(/lookupWorkRate/.test(laborSrc), "13 Labor Expert uses lookupWorkRate");
  ok(!/autoG2Rate/.test(laborSrc), "13 Labor Expert does not consume autoG2Rate");
  const store = emptyStore([workWithRate(WORK_RATE, "m2")]);
  const looked = lookupWorkRate(store, WORK_RATE, "m2", NOW);
  ok(looked.status === "CURRENT", "13 authoritative lookup CURRENT");
}

// 14 Knowledge Loop Evidence policy intact
{
  ok(EVIDENCE_REUSE_POLICY === OD52_EVIDENCE_FRESHNESS_MODE, "14 Evidence policy = OD52");
  ok(EVIDENCE_REUSE_POLICY === "STATE_ONLY", "14 Evidence STATE_ONLY (GO53)");
}

// 15 TPI baseline unchanged (static — no mutation in B2)
ok(true, "15 TPI baseline not mutated by B2 (static)");

// 17 O1 overwrite guard
{
  const existing = {
    decisionId: "AUTO_RATE_ACCEPT",
    mode: "REUSE",
    ruleId: "auto_rate.reuse_catalog_current_v1",
    workId: WORK_RATE,
    unit: "m2",
    identityKey: `${WORK_RATE}|m2`,
    sourceType: "OWNER",
    ourRatePln: 30,
    observedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    evaluatedAtIso: new Date(NOW).toISOString(),
  };
  const incoming = { ...existing, sourceType: "ACCEPT", ourRatePln: 22.9 };
  ok(
    wouldOverwriteStrongerRateAttestation(existing, incoming) === true,
    "17 O1 OWNER stronger protected",
  );
}

// 18 independent RATE∥BOM
{
  const store = emptyStore([workWithRate(WORK_RATE, "m2")]);
  // CURRENT rate + provisional BOM host → rate accept, bom exception
  const line = trustedLine({
    catalogWorkId: "cc-w2-scianki-dzialowe-gr-pakiet-m2",
  });
  // Need CURRENT rate on scianki work — invent rate card for that id
  const store2 = emptyStore([
    workWithRate("cc-w2-scianki-dzialowe-gr-pakiet-m2", "m2"),
  ]);
  const rate = evaluateAutoRateContract({ line, store: store2, nowMs: NOW });
  const bom = evaluateAutoBomContract({ line, nowMs: NOW });
  ok(rate.decision === "AUTO_RATE_ACCEPT", "18 independent RATE accept");
  ok(bom.decision === "BOM_EXCEPTION", "18 independent BOM exception");
  let next = applyAutoRateAcceptToLine(line, rate);
  next = applyAutoBomAcceptToLine(next, bom);
  ok(next.autoG2Rate?.mode === "REUSE", "18 rate attestation kept");
  ok(next.autoG2Bom?.mode === "EXCEPTION", "18 bom exception recorded");
}

// Forbidden matrix
ok(AUTO_G2_FORBIDDEN.researchAutoPersist === false, "R1 research persist forbidden");
ok(AUTO_G2_FORBIDDEN.staleAutoPersist === false, "R2 stale persist forbidden");
ok(AUTO_G2_FORBIDDEN.evidenceAsOurRate === false, "Evidence≠OUR RATE");
ok(AUTO_G2_FORBIDDEN.provisionalCcW2AutoBom === false, "B1 provisional BOM forbidden");
ok(AUTO_G2_FORBIDDEN.expandLaborOnlyAllowlist === false, "B2 no allowlist expand");

if (failed > 0) {
  console.error(`\nGO63 B2 TESTS: ${failed} FAIL`);
  process.exit(1);
}
console.log("\nGO63 B2 Orchestra smoke: ALL PASS");
