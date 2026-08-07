/**
 * DECISION-WORKSPACE-01 — harness (VM · cache ≤1 · gates · Dual Outcome).
 * npx vite-node scripts/test-decision-workspace-01.mjs
 *
 * Zero Expert/Chief/Session/Validation BC edits · fixtures only.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idleChiefSessionOutput } from "../src/lib/chief-session/types.ts";
import {
  buildDecisionWorkspaceViewModel,
  buildValidationCacheKey,
  forceDecisionWorkspaceForTests,
  getValidationAnalyzeCallCountForTests,
  isDecisionWorkspaceEnabled,
  resetValidationCacheForTests,
  resolveValidationForDossier,
} from "../src/lib/decision-workspace-ui/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function ok(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(e);
  }
}

function baseTrace(overrides = {}) {
  return {
    co: "test",
    dlaczego: "test",
    naPodstawieCzego: "fixture",
    pewnosc: "high",
    blokery: [],
    zgodnoscZRozumieniemWykonania: "aligned",
    zgodnoscOpisPl: "ok",
    ...overrides,
  };
}

function costExpert() {
  return {
    contract: baseTrace(),
    completenessOk: true,
    materialLines: [],
    labourLines: [],
    equipmentLines: [],
    breakdown: {
      purchaseMaterialsPln: 100,
      labourPln: 50,
      equipmentPln: 10,
      auxiliaryPln: 5,
      overheadPln: 5,
      realCostPln: 170,
    },
    comparative: {
      marketMaterialsPln: 100,
      purchaseMaterialsPln: 100,
      realCostPln: 170,
      purchaseVsMarketPct: 0,
      realVsPurchaseMaterialsPct: 70,
      realVsMarketMaterialsPct: 10,
      notesPl: [],
    },
    handoffToOfferExpert: true,
    handoffBlockersPl: [],
    offerHandoffPayload: {
      realCostPln: 170,
      breakdown: {
        purchaseMaterialsPln: 100,
        labourPln: 50,
        equipmentPln: 10,
        auxiliaryPln: 5,
        overheadPln: 5,
        realCostPln: 170,
      },
      comparative: {
        marketMaterialsPln: 100,
        purchaseMaterialsPln: 100,
        realCostPln: 170,
        purchaseVsMarketPct: 0,
        realVsPurchaseMaterialsPct: 70,
        realVsMarketMaterialsPct: 10,
        notesPl: [],
      },
      notesPl: [],
    },
  };
}

function offerExpert() {
  const breakdown = {
    realCostPln: 170,
    marginPct: 0.1,
    marginPln: 17,
    riskPct: 0.05,
    riskPln: 8.5,
    offerPricePln: 195.5,
  };
  const primary = {
    strategy: "rekomendowany",
    offerPricePln: 195.5,
    breakdown,
    summaryPl: "Rekomendacja testowa",
  };
  const scenarios = [
    { strategy: "agresywny", labelPl: "Agresywny", breakdown },
    { strategy: "rekomendowany", labelPl: "Rekomendowany", breakdown },
    { strategy: "bezpieczny", labelPl: "Bezpieczny", breakdown },
  ];
  return {
    contract: baseTrace(),
    primaryRecommendation: primary,
    scenarios,
    signalToDecisionMaker: true,
    decisionMakerPayload: {
      offerPricePln: 195.5,
      realCostPln: 170,
      breakdown,
      scenarios,
      primarySummaryPl: "Rekomendacja testowa",
      pewnosc: "high",
      contractCo: "oferta",
    },
  };
}

function readyDossier(overrides = {}) {
  const cost = costExpert();
  const offer = offerExpert();
  return {
    caseId: "case-dw-1",
    status: "ready_for_decydent",
    createdAt: "2026-08-08T10:00:00.000Z",
    finishedAt: "2026-08-08T10:01:00.000Z",
    loopCount: 0,
    tasks: [],
    traces: {
      execution: baseTrace(),
      materials: baseTrace(),
      pricing: baseTrace(),
      cost: cost.contract,
      offer: offer.contract,
    },
    experts: {
      execution: { contract: baseTrace() },
      materials: {
        contract: baseTrace(),
        lines: [],
        gapsAndRisks: [],
        variants: [],
        completeness: "kompletny",
        completenessNotePl: "ok",
        packMaterialCoverage: { required: 10, present: 10, conforming: 10 },
      },
      pricing: {
        contract: baseTrace(),
        returnToMaterialExpert: false,
        requiresReanalysis: false,
      },
      cost,
      offer,
    },
    offerHandoffPayload: cost.offerHandoffPayload,
    decisionMakerPayload: offer.decisionMakerPayload,
    primaryRecommendation: offer.primaryRecommendation,
    scenarios: offer.scenarios,
    orchestrationNotesPl: [],
    handoffBlockersPl: [],
    returnFlags: {
      returnToMaterialExpert: false,
      requiresReanalysis: false,
    },
    ...overrides,
  };
}

function readySession(dossier = readyDossier()) {
  return idleChiefSessionOutput({
    status: "ready_for_decydent",
    caseState: "ready_for_decydent",
    dossier,
    readyForDecision: true,
    caseId: dossier.caseId,
    requestId: 1,
  });
}

// --- tests ---

ok("flag default OFF", () => {
  forceDecisionWorkspaceForTests(null);
  assert.equal(isDecisionWorkspaceEnabled(), false);
});

ok("flag force ON for tests", () => {
  forceDecisionWorkspaceForTests(true);
  assert.equal(isDecisionWorkspaceEnabled(), true);
  forceDecisionWorkspaceForTests(null);
});

ok("cacheKey = caseId|finishedAt", () => {
  assert.equal(
    buildValidationCacheKey("c1", "t1"),
    "c1|t1",
  );
});

ok("validation cache ≤1 analyze per dossier key", () => {
  resetValidationCacheForTests();
  const d = readyDossier();
  const a = resolveValidationForDossier(d);
  const b = resolveValidationForDossier(d);
  assert.equal(a.validationFailed, false);
  assert.ok(a.validation);
  assert.equal(b.validation, a.validation);
  assert.equal(getValidationAnalyzeCallCountForTests(), 1);
});

ok("validation null dossier → 0 analyze", () => {
  resetValidationCacheForTests();
  const r = resolveValidationForDossier(null);
  assert.equal(r.validation, null);
  assert.equal(getValidationAnalyzeCallCountForTests(), 0);
});

ok("new finishedAt → second analyze", () => {
  resetValidationCacheForTests();
  const d1 = readyDossier({ finishedAt: "2026-08-08T10:01:00.000Z" });
  const d2 = readyDossier({ finishedAt: "2026-08-08T10:02:00.000Z" });
  resolveValidationForDossier(d1);
  resolveValidationForDossier(d2);
  assert.equal(getValidationAnalyzeCallCountForTests(), 2);
});

ok("VM hidden when flag OFF", () => {
  const session = readySession();
  const { validation } = resolveValidationForDossier(session.dossier);
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation,
    localDecision: null,
    flagEnabled: false,
  });
  assert.equal(vm.uiPhase, "hidden");
});

ok("VM ready_for_decision + Dual chips", () => {
  resetValidationCacheForTests();
  const session = readySession();
  const { validation } = resolveValidationForDossier(session.dossier);
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation,
    localDecision: null,
    flagEnabled: true,
  });
  assert.equal(vm.uiPhase, "ready_for_decision");
  assert.ok(vm.processChipPl.startsWith("Proces:"));
  assert.ok(vm.qaChipPl.startsWith("Walidacja:"));
  assert.equal(vm.businessDecisionChipPl, "Decyzja: brak");
  assert.ok(vm.tre01NotePl.includes("TRE-01"));
  assert.equal(vm.canApprove, true);
  assert.equal(vm.canReject, true);
  assert.equal(vm.canNeedsReview, true);
  assert.equal(vm.canReturn, true);
  assert.equal(vm.hasPrimary, true);
});

ok("Approve OFF when verdict blocked (forced)", () => {
  resetValidationCacheForTests();
  const session = readySession();
  const { validation } = resolveValidationForDossier(session.dossier);
  assert.ok(validation);
  const blockedValidation = {
    ...validation,
    verdict: "blocked",
    hardFindings: validation.hardFindings,
    softFindings: validation.softFindings,
    findings: validation.findings,
    report: validation.report,
    contract: validation.contract,
  };
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation: blockedValidation,
    localDecision: null,
    flagEnabled: true,
  });
  assert.equal(vm.canApprove, false);
  assert.ok(vm.disabledReasonPl);
});

ok("decision_recorded after approve local", () => {
  resetValidationCacheForTests();
  const session = readySession();
  const { validation } = resolveValidationForDossier(session.dossier);
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation,
    localDecision: {
      action: "approve",
      scenarioStrategy: null,
      decidedAt: "2026-08-08T12:00:00.000Z",
      caseId: "case-dw-1",
    },
    flagEnabled: true,
  });
  assert.equal(vm.uiPhase, "decision_recorded");
  assert.equal(vm.businessDecisionChipPl, "Decyzja: zatwierdzono");
  assert.equal(vm.canApprove, true);
});

ok("return action clears to brak in chip helper path", () => {
  const session = readySession();
  const { validation } = resolveValidationForDossier(session.dossier);
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation,
    localDecision: {
      action: "return",
      scenarioStrategy: null,
      decidedAt: "2026-08-08T12:00:00.000Z",
      caseId: "case-dw-1",
    },
    flagEnabled: true,
  });
  assert.equal(vm.uiPhase, "ready_for_decision");
  assert.equal(vm.localDecision, null);
  assert.equal(vm.businessDecisionChipPl, "Decyzja: brak");
});

ok("Findings Hard before Soft order preserved from validation lists", () => {
  resetValidationCacheForTests();
  const session = readySession();
  const { validation } = resolveValidationForDossier(session.dossier);
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation,
    localDecision: null,
    flagEnabled: true,
  });
  const sevs = vm.findingRows.map((r) => r.severity);
  const firstSoft = sevs.indexOf("soft");
  const lastHard = sevs.lastIndexOf("hard");
  if (firstSoft >= 0 && lastHard >= 0) {
    assert.ok(lastHard < firstSoft);
  }
});

ok("no_dossier phase", () => {
  const session = idleChiefSessionOutput({ status: "idle" });
  const vm = buildDecisionWorkspaceViewModel({
    session,
    validation: null,
    localDecision: null,
    flagEnabled: true,
  });
  assert.equal(vm.uiPhase, "no_dossier");
  assert.equal(vm.canApprove, false);
  assert.equal(vm.canReject, false);
});

ok("allowlist paths exist", () => {
  const paths = [
    "src/lib/decision-workspace-ui/flag.ts",
    "src/lib/decision-workspace-ui/view-model.ts",
    "src/lib/decision-workspace-ui/validation-cache.ts",
    "src/app/decision-workspace/DecisionWorkspaceSurface.tsx",
    "src/app/decision-workspace/DecisionWorkspaceHost.tsx",
  ];
  for (const p of paths) {
    assert.ok(fs.existsSync(path.join(root, p)), p);
  }
});

ok("NO TOUCH markers — decision-workspace does not import runChief", () => {
  const host = fs.readFileSync(
    path.join(root, "src/app/decision-workspace/DecisionWorkspaceHost.tsx"),
    "utf8",
  );
  assert.ok(!host.includes("runChiefOrchestrator"));
  assert.ok(!host.includes("analyzeExecution"));
  const vm = fs.readFileSync(
    path.join(root, "src/lib/decision-workspace-ui/view-model.ts"),
    "utf8",
  );
  assert.ok(!vm.includes("runConsistencyChecks"));
  assert.ok(!vm.includes("runQaRules"));
});

forceDecisionWorkspaceForTests(null);
resetValidationCacheForTests();

console.log("");
console.log(`RESULT  ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
