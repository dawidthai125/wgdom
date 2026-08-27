/**
 * IK-AUTONOMOUS-PRICING-FALLBACK — Slice 3B route audit (READ-ONLY).
 * Deterministic SSOT inventory + APF policy state — ZERO HTTP/KV/CREATE/Accept.
 *
 * npx vite-node scripts/test-ik-autonomous-pricing-fallback-slice3b-route-audit.mjs
 */

import {
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  WORK_RATE_RESEARCH_PLANE_NORMAL,
  evaluateExistingCategoryReuseGate,
  isP527MeasurementOutOfResearch,
  resolveWorkRatePass2Url,
} from "../src/lib/work-catalog/work-rate-discovery-allowlist.ts";
import { WORK_RATE_LEGAL_GATE } from "../src/lib/work-catalog/work-rate-legal.ts";
import { WORK_RATE_ALLOWED_HOSTS } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";
import {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  evaluateApfEphemeralSelectiveResearchPolicy,
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

const MEASUREMENT_KEYS = [
  "measurement",
  "testing",
  "pomiar",
  "prob",
  "próba",
  "pomiary",
];

console.log("\n=== INV: PASS2 category keys (SSOT) ===");
const pass2Keys = [...new Set(WORK_RATE_PASS2_CATEGORY_ALLOWLIST.map((e) => e.categoryKey))];
ok("INV 9 PASS2 entries", WORK_RATE_PASS2_CATEGORY_ALLOWLIST.length === 9);
ok(
  "INV no measurement categoryKey",
  !pass2Keys.some((k) => MEASUREMENT_KEYS.includes(k)),
  pass2Keys,
);

console.log("\n=== INV: electrical route SSOT only ===");
const elec = WORK_RATE_PASS2_CATEGORY_ALLOWLIST.find(
  (e) => e.sourceId === "cennikremontow_pl" && e.categoryKey === "electrical",
);
ok("INV electrical entry exists", Boolean(elec));
ok(
  "INV electrical URL SSOT",
  elec?.url === "https://cennikremontow.pl/instalacje-elektryczne-cennik",
  elec?.url,
);
ok(
  "INV resolve electrical URL",
  resolveWorkRatePass2Url("cennikremontow_pl", "electrical") === elec?.url,
);

console.log("\n=== INV: hosts + legal gate ===");
for (const h of [
  "kb.pl",
  "sccot.pl",
  "extradom.pl",
  "cennikremontow.pl",
]) {
  ok(`INV host ${h}`, WORK_RATE_ALLOWED_HOSTS.has(h));
}
ok("INV WORK_RATE_LEGAL_GATE PASS", WORK_RATE_LEGAL_GATE === "PASS");

console.log("\n=== APF policy: Owner GO — routes authorized (Slice 3C) ===");
for (const unit of ["pomiar", "prob"]) {
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit });
  ok(`APF ${unit} policy GRANTED`, pol.policyAuthorization === "GRANTED");
  ok(`APF ${unit} routeAuthorized true`, pol.routeAuthorized === true);
  ok(`APF ${unit} httpPermitted true`, pol.httpPermitted === true);
  ok(`APF ${unit} executionPermitted true`, pol.executionPermitted === true);
  ok(`APF ${unit} policy httpCalls 0`, pol.sideEffects.httpCalls === 0);
  ok(`APF ${unit} CREATE 0`, pol.sideEffects.catalogWorkCreateCalls === 0);
  ok(`APF ${unit} KV 0`, pol.sideEffects.kvWriteCalls === 0);
  ok(`APF ${unit} Accept 0`, pol.sideEffects.acceptCalls === 0);
  ok(`APF ${unit} OUR RATE 0`, pol.sideEffects.ourRateWriteCalls === 0);
}
ok("APF routes registry has 2 entries", APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.length === 2);

console.log("\n=== P5.27 NORMAL plane unchanged ===");
ok(
  "P5.27 pomiar blocked NORMAL",
  evaluateExistingCategoryReuseGate({
    family: "electrical",
    categoryKey: "electrical",
    namePl: "Pomiar rezystancji",
    domain: "LABOR",
    unit: "pomiar",
    researchPlane: WORK_RATE_RESEARCH_PLANE_NORMAL,
  }).rejectReason === "OUT_OF_RESEARCH_MEASUREMENT",
);
ok(
  "P5.27 helper pomiar",
  isP527MeasurementOutOfResearch({ unit: "pomiar", namePl: "x" }),
);

console.log("\n========================================");
console.log(
  `SLICE3B ROUTE AUDIT: ${passed} PASS / ${failed} FAIL · HTTP=0 CREATE=0 KV=0 ACCEPT=0`,
);
if (failed > 0) process.exit(1);
