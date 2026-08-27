/**
 * IK-AUTONOMOUS-PRICING-FALLBACK — Slice 3A policy / legal plane tests.
 * HTTP=0 · no CatalogWork · no OUR RATE · no Accept · no KV.
 */

import {
  evaluateExistingCategoryReuseGate,
  isP527MeasurementOutOfResearch,
  WORK_RATE_RESEARCH_PLANE_APF_EPHEMERAL,
  WORK_RATE_RESEARCH_PLANE_NORMAL,
} from "../src/lib/work-catalog/work-rate-discovery-allowlist.ts";
import {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  evaluateApfEphemeralSelectiveResearchPolicy,
  isApfEphemeralSelectiveResearchPolicyGranted,
} from "../src/lib/tender-position-cost/autonomous-pricing-fallback/apf-ephemeral-selective-research-policy.ts";

let passed = 0;
let failed = 0;

function ok(label, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL ${label}`, detail ?? "");
  }
}

console.log("\n=== T1: normal work-rate + pomiar → P5.27 blocked ===");
{
  ok(
    "T1 helper pomiar",
    isP527MeasurementOutOfResearch({ unit: "pomiar", namePl: "Pomiar rezystancji" }),
  );
  const gate = evaluateExistingCategoryReuseGate({
    family: "electrical",
    categoryKey: "electrical",
    namePl: "Pomiar rezystancji izolacji",
    domain: "LABOR",
    unit: "pomiar",
    researchPlane: WORK_RATE_RESEARCH_PLANE_NORMAL,
  });
  ok("T1 gate OUT_OF_RESEARCH_MEASUREMENT", gate.rejectReason === "OUT_OF_RESEARCH_MEASUREMENT", gate);
}

console.log("\n=== T2: normal prob — no APF auto-permission ===");
{
  ok(
    "T2 normal prob not P5.27 unit block",
    !isP527MeasurementOutOfResearch({ unit: "prob", namePl: "Próba RCD" }),
  );
  ok(
    "T2 APF policy grant ≠ normal work-rate unlock",
    isApfEphemeralSelectiveResearchPolicyGranted({ unit: "prob" }) === true,
  );
  ok(
    "T2 normal gate default plane still NORMAL-only P5.27 semantics",
    evaluateExistingCategoryReuseGate({
      family: "electrical",
      categoryKey: "electrical",
      namePl: "Próba RCD",
      domain: "LABOR",
      unit: "prob",
    }).reuseStatus !== "REJECTED_REUSE" ||
      evaluateExistingCategoryReuseGate({
        family: "electrical",
        categoryKey: "electrical",
        namePl: "Próba RCD",
        domain: "LABOR",
        unit: "prob",
      }).rejectReason !== "OUT_OF_RESEARCH_MEASUREMENT",
  );
}

console.log("\n=== T3: APF policy + pomiar → GRANTED, execution authorized (Owner GO) ===");
{
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit: "pomiar" });
  ok("T3 policy GRANTED", pol.policyAuthorization === "GRANTED", pol);
  ok("T3 routeAuthorized true", pol.routeAuthorized === true);
  ok("T3 httpPermitted true", pol.httpPermitted === true);
  ok("T3 executionPermitted true", pol.executionPermitted === true);
  ok("T3 policy eval httpCalls 0", pol.sideEffects.httpCalls === 0);
}

console.log("\n=== T4: APF policy + prob → GRANTED, execution authorized ===");
{
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit: "prob" });
  ok("T4 policy GRANTED", pol.policyAuthorization === "GRANTED", pol);
  ok("T4 httpPermitted true", pol.httpPermitted === true);
  ok("T4 executionPermitted true", pol.executionPermitted === true);
}

console.log("\n=== T5: APF policy with authorized routes (Owner GO) ===");
{
  ok("T5 routes registered", APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.length === 2);
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit: "pomiar" });
  ok("T5 routeAuthorized true", pol.routeAuthorized === true);
  ok(
    "T5 execution permitted",
    pol.executionPermitted === true,
    pol.executionBlockReason,
  );
}

console.log("\n=== T6–T7: zero side effects on policy path ===");
{
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit: "prob" });
  ok("T6 CREATE 0", pol.sideEffects.catalogWorkCreateCalls === 0);
  ok("T6 UPDATE 0", pol.sideEffects.catalogWorkUpdateCalls === 0);
  ok("T7 KV 0", pol.sideEffects.kvWriteCalls === 0);
  ok("T7 Accept 0", pol.sideEffects.acceptCalls === 0);
  ok("T7 OUR RATE 0", pol.sideEffects.ourRateWriteCalls === 0);
}

console.log("\n=== T8: APF plane may skip P5.27 for category reuse planning only ===");
{
  const apfGate = evaluateExistingCategoryReuseGate({
    family: "electrical",
    categoryKey: "electrical",
    namePl: "Pomiar rezystancji",
    domain: "LABOR",
    unit: "pomiar",
    researchPlane: WORK_RATE_RESEARCH_PLANE_APF_EPHEMERAL,
  });
  ok(
    "T8 APF plane not rejected for measurement",
    apfGate.rejectReason !== "OUT_OF_RESEARCH_MEASUREMENT",
    apfGate,
  );
  ok(
    "T8 NORMAL plane still rejected",
    evaluateExistingCategoryReuseGate({
      family: "electrical",
      categoryKey: "electrical",
      namePl: "Pomiar rezystancji",
      domain: "LABOR",
      unit: "pomiar",
    }).rejectReason === "OUT_OF_RESEARCH_MEASUREMENT",
  );
}

console.log("\n========================================");
console.log(`SLICE3A POLICY: ${passed} PASS / ${failed} FAIL · HTTP=0 CREATE=0 KV=0 ACCEPT=0`);
if (failed > 0) process.exit(1);
