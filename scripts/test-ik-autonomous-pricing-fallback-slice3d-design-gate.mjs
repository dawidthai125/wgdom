/**
 * IK-AUTONOMOUS-PRICING-FALLBACK — Slice 3D design gate tests.
 * Energospin nomination · PER_MEASUREMENT · OWNER_EXTERNAL_SOURCE_EVIDENCE.
 * HTTP=0 · no CatalogWork · no OUR RATE · no Accept · no KV.
 *
 * npx vite-node scripts/test-ik-autonomous-pricing-fallback-slice3d-design-gate.mjs
 */

import {
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  isP527MeasurementOutOfResearch,
  evaluateExistingCategoryReuseGate,
  WORK_RATE_RESEARCH_PLANE_NORMAL,
} from "../src/lib/work-catalog/work-rate-discovery-allowlist.ts";
import { WORK_RATE_ALLOWED_HOSTS } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";
import { isWorkRateResearchAllowed } from "../src/lib/work-catalog/work-rate-legal.ts";
import {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN,
  APF_ENERGOSPIN_EXPLICITLY_ABSENT_KNR_TABLES,
  APF_OWNER_NOMINATED_SOURCE_ROUTES,
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  createDefaultApfLaborMarketPort,
  evaluateApfEphemeralSelectiveResearchPolicy,
  isApfBoqUnitQualifiedByPricingBasis,
  isApfForbiddenUnitProxyForMeasurement,
  isApfNominatedHostInKeep4,
  isApfNominatedSourceEligibleForNormalWorkRate,
  isApfNominatedSourceId,
  qualifyApfOwnerExternalEvidenceRow,
  resolveApfOwnerNominatedRoute,
  runAutonomousPricingFallback,
} from "../src/lib/tender-position-cost/autonomous-pricing-fallback/index.ts";

let passed = 0;
let failed = 0;
let httpCalls = 0;

function ok(label, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL ${label}`, detail ?? "");
  }
}

console.log("\n=== T1: nomination registry — Owner authorized APF sources ===");
{
  ok("T1 two nominated routes", APF_OWNER_NOMINATED_SOURCE_ROUTES.length === 2);
  const nom = APF_OWNER_NOMINATED_SOURCE_ROUTES[0];
  ok("T1 sourceId energospin_pl", nom.sourceId === "energospin_pl");
  ok("T1 categoryKey electrical_measurement", nom.categoryKey === "electrical_measurement");
  ok("T1 pricingBasis PER_MEASUREMENT", nom.pricingBasis === APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT);
  ok("T1 keep4AmendmentRequired false", nom.keep4AmendmentRequired === false);
  ok("T1 legalExecutionAuthorized true", nom.legalExecutionAuthorized === true);
  ok("T1 distinctFromPass2Electrical", nom.distinctFromPass2Electrical === true);
  ok(
    "T1 resolve route",
    resolveApfOwnerNominatedRoute("energospin_pl", "electrical_measurement")?.nominationId ===
      nom.nominationId,
  );
  ok("T1 APF authorized routes count 2", APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.length === 2);
}

console.log("\n=== T2: KEEP-4 — energospin NOT in allowed hosts ===");
{
  ok("T2 isApfNominatedSourceId", isApfNominatedSourceId("energospin_pl"));
  ok("T2 host NOT in KEEP4", !isApfNominatedHostInKeep4("energospin.pl"));
  ok("T2 WORK_RATE_ALLOWED_HOSTS no energospin", !WORK_RATE_ALLOWED_HOSTS.has("energospin.pl"));
  ok(
    "T2 blocked from NORMAL work-rate",
    isApfNominatedSourceEligibleForNormalWorkRate("energospin_pl") === false,
  );
  ok(
    "T2 kb_pl still NORMAL-eligible",
    isApfNominatedSourceEligibleForNormalWorkRate("kb_pl") === true,
  );
}

console.log("\n=== T3: cennikremontow_pl::electrical remains separate ===");
{
  const elec = WORK_RATE_PASS2_CATEGORY_ALLOWLIST.find(
    (e) => e.sourceId === "cennikremontow_pl" && e.categoryKey === "electrical",
  );
  ok("T3 CR electrical PASS2 exists", Boolean(elec));
  ok(
    "T3 CR electrical URL unchanged",
    elec?.url === "https://cennikremontow.pl/instalacje-elektryczne-cennik",
  );
  ok(
    "T3 no electrical_measurement in PASS2",
    !WORK_RATE_PASS2_CATEGORY_ALLOWLIST.some((e) => e.categoryKey === "electrical_measurement"),
  );
  ok(
    "T3 nomination URL != CR electrical",
    APF_OWNER_NOMINATED_SOURCE_ROUTES[0].url !== elec?.url,
  );
}

console.log("\n=== T4: P5.27 NORMAL unchanged ===");
{
  ok(
    "T4 pomiar blocked NORMAL",
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
  ok("T4 gate OUT_OF_RESEARCH_MEASUREMENT", gate.rejectReason === "OUT_OF_RESEARCH_MEASUREMENT", gate);
}

console.log("\n=== T5: APF policy — execution authorized (Owner GO) ===");
{
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit: "pomiar" });
  ok("T5 policy GRANTED", pol.policyAuthorization === "GRANTED");
  ok("T5 routeAuthorized true", pol.routeAuthorized === true);
  ok("T5 httpPermitted true", pol.httpPermitted === true);
  ok("T5 executionPermitted true", pol.executionPermitted === true);
  ok("T5 policy eval httpCalls 0", pol.sideEffects.httpCalls === 0);
}

console.log("\n=== T6: OWNER_EXTERNAL_SOURCE_EVIDENCE — 5 rows exact ===");
{
  ok("T6 five rows", APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN.length === 5);
  for (const row of APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN) {
    ok(`T6 provenance ${row.evidenceId}`, row.provenance === "OWNER_EXTERNAL_SOURCE_EVIDENCE");
    ok(`T6 pricingBasis ${row.evidenceId}`, row.pricingBasis === "PER_MEASUREMENT");
    ok(`T6 netto ${row.evidenceId}`, row.netGross === "netto");
    ok(`T6 laborOnly ${row.evidenceId}`, row.laborOnly === true);
    ok(`T6 no tableCode ${row.evidenceId}`, row.tableCode === null && row.knrHint === null);
    ok(`T6 PLN ${row.evidenceId}`, row.currency === "PLN" && row.unitRatePln > 0);
  }
  const prices = APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN.map((r) => r.unitRatePln).sort((a, b) => a - b);
  ok("T6 price set 5,10,10,10,20", JSON.stringify(prices) === JSON.stringify([5, 10, 10, 10, 20]), prices);
}

console.log("\n=== T7: no fabricated 1205-05/06 or 1305-02 ===");
{
  for (const tc of APF_ENERGOSPIN_EXPLICITLY_ABSENT_KNR_TABLES) {
    const hit = APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN.some(
      (r) =>
        String(r.tableCode ?? "").includes(tc) ||
        String(r.knrHint ?? "").includes(tc) ||
        r.descriptionPl.includes(tc),
    );
    ok(`T7 absent ${tc}`, !hit);
  }
}

console.log("\n=== T8: unit proxy forbidden ===");
{
  for (const u of ["szt", "pkt", "obw", "m2", "mb"]) {
    ok(`T8 proxy ${u}`, isApfForbiddenUnitProxyForMeasurement(u));
    const q = qualifyApfOwnerExternalEvidenceRow({
      row: APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN[0],
      query: { unit: u, description: "test" },
    });
    ok(`T8 qualify rejects ${u}`, q.ok === false && q.reason === "FORBIDDEN_UNIT_PROXY");
  }
}

console.log("\n=== T9: PER_MEASUREMENT BOQ qualification ===");
{
  const izol1f = APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN[1];
  ok(
    "T9 pomiar qualifies izolacja 1f",
    isApfBoqUnitQualifiedByPricingBasis({
      boqUnit: "pomiar",
      pricingBasis: "PER_MEASUREMENT",
      sourceDescriptionPl: izol1f.descriptionPl,
    }),
  );
  ok(
    "T9 prob qualifies RCD row only",
    isApfBoqUnitQualifiedByPricingBasis({
      boqUnit: "prob",
      pricingBasis: "PER_MEASUREMENT",
      sourceDescriptionPl: APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN[3].descriptionPl,
    }),
  );
  ok(
    "T9 prob NOT on izolacja row without explicit RCD",
    !isApfBoqUnitQualifiedByPricingBasis({
      boqUnit: "prob",
      pricingBasis: "PER_MEASUREMENT",
      sourceDescriptionPl: izol1f.descriptionPl,
    }),
  );
  const qPomiar = qualifyApfOwnerExternalEvidenceRow({
    row: izol1f,
    query: { unit: "pomiar", description: "Pomiar rezystancji izolacji" },
  });
  ok("T9 qualify pomiar row OK", qPomiar.ok === true, qPomiar);
}

console.log("\n=== T10: default APF labor port NO_SOURCES (HTTP=0) ===");
{
  ok("T10 legal gate PASS", isWorkRateResearchAllowed());
  const port = createDefaultApfLaborMarketPort();
  const res = await Promise.resolve(
    port.research({
      tenderId: "T-3D",
      lineId: "L1",
      description: "Pomiar rezystancji izolacji obwodów 1 fazowych",
      unit: "pomiar",
    }),
  );
  httpCalls += res.httpCalls;
  ok("T10 NO_SOURCES", res.status === "NO_SOURCES");
  ok("T10 httpCalls 0", res.httpCalls === 0);
}

console.log("\n=== T11: runAutonomousPricingFallback fail-closed ===");
{
  const r = await runAutonomousPricingFallback({
    tenderId: "T-3D-RUN",
    line: {
      lineId: "L-rcd",
      description: "Sprawdzenie samoczynnego wyłączania zasilania",
      unit: "prob",
      catalogWorkId: null,
      knrHint: "KNR 4-03 1305-01",
    },
  });
  httpCalls += r.counters.httpCalls;
  ok("T11 HOLD", r.status === "HOLD");
  ok("T11 NO_SOURCES or KNOWLEDGE_ONLY", r.holdCode === "NO_SOURCES" || r.holdCode === "KNOWLEDGE_ONLY", r.holdCode);
  ok("T11 no candidate", r.candidate === null);
  ok("T11 httpCalls 0", r.counters.httpCalls === 0);
  ok("T11 kv 0", r.counters.kvWriteCalls === 0);
  ok("T11 accept 0", r.counters.acceptCalls === 0);
}

console.log("\n========================================");
console.log(`SLICE3D DESIGN GATE: ${passed} PASS / ${failed} FAIL · HTTP=${httpCalls}`);
process.exit(failed > 0 ? 1 : 0);
