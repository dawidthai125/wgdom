/**
 * Chief Orchestrator P0 — unit tests.
 * npx vite-node scripts/test-chief-orchestrator-p0.mjs
 */
import assert from "node:assert/strict";
import { runChiefOrchestrator } from "../src/lib/chief-orchestrator/index.ts";
import { defaultExecutionExpertBusinessProfile } from "../src/lib/execution-expert/index.ts";
import { DEFAULT_MATERIAL_MARKET_MAP } from "../src/lib/pricing-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function snap(price, origin, updatedAt, confidence = 0.85) {
  return {
    price,
    regionCode: "dolnyslask",
    coverage: "full",
    updatedAt,
    confidence,
    origin,
  };
}

function makeWork(id, price) {
  const freshAt = "2026-07-15T00:00:00.000Z";
  return {
    id,
    tradeId: "POZOSTALE",
    namePl: id,
    unit: "m2",
    companyPricePln: 999,
    marketQuotes: {
      kb_pl: { dolnyslask: snap(price, "kb_pl", freshAt) },
      interbud: { dolnyslask: snap(price * 1.1, "interbud", freshAt, 0.7) },
      sekocenbud: { dolnyslask: snap(price * 1.05, "sekocenbud", freshAt) },
      wgdom: { dolnyslask: snap(price * 0.98, "wgdom", freshAt) },
    },
    updatedAt: freshAt,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function eticsLine() {
  return {
    lineId: "L1",
    lp: "1",
    description: "Ocieplenie ścian zewnętrznych systemem ETICS",
    quantity: 100,
    quantityRaw: "100",
    unit: "m2",
    catalogWorkId: "cw.etics.boards",
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
  };
}

function noiseLine() {
  return {
    lineId: "L9",
    lp: "9",
    description: "Usługa konsultingowa prawna XYZ niezwiązana",
    quantity: 1,
    quantityRaw: "1",
    unit: "kpl",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
  };
}

function baseDoc(lines, tenderId = "t-chief-p0") {
  return {
    schemaVersion: 5,
    tenderId,
    version: 1,
    builtAt: new Date().toISOString(),
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: {
      materialsPln: null,
      laborPln: null,
      equipmentPln: null,
      directPln: null,
      kpPln: null,
      overheadPln: null,
      costPricePln: null,
      marginPln: null,
      recommendedBidPln: null,
      profitPln: null,
      profitabilityPct: null,
      estimatedDurationDays: null,
      workingCapitalPln: null,
      lineCount: lines.length,
      pricedLineCount: 0,
    },
    recomputeToken: "x",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

function companyRo() {
  return {
    purchaseByMaterialKey: {
      "mat.eps_graph": { unitPricePln: 45 },
      "mat.glue_etics": { unitPricePln: 3.2 },
      "mat.mesh": { unitPricePln: 4.5 },
      "mat.render": { unitPricePln: 2.8 },
    },
    defaultLaborPlnPerHour: 65,
    equipmentRateByKey: {
      "eq.scaffold": { unitPricePln: 8 },
      "eq.mixer": { unitPricePln: 120 },
    },
    auxiliaryPctOfDirect: 0.03,
    internalOverheadPct: 0.08,
  };
}

function catalogMap() {
  const worksById = new Map();
  for (const e of DEFAULT_MATERIAL_MARKET_MAP) {
    worksById.set(e.workId, makeWork(e.workId, 50));
  }
  return worksById;
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
const nowIso = new Date(nowMs).toISOString();

console.log("\n=== Chief Orchestrator P0 — happy path ===\n");
resetTf();

const happy = runChiefOrchestrator({
  caseId: "case-happy",
  offerBoq: baseDoc([eticsLine()]),
  executionProfile: defaultExecutionExpertBusinessProfile(),
  pricing: {
    catalog: { worksById: catalogMap() },
    nowMs,
    computedAtIso: nowIso,
  },
  company: companyRo(),
  // N=0: bez LOOP — happy path czysto T1→T5 (availability RETURN nie blokuje G-COST)
  maxReturnLoops: 0,
  nowIso,
});

ok("happy status ready", happy.status === "ready_for_decydent");
ok("happy loop 0", happy.loopCount === 0);
ok("happy T1 done", happy.tasks.find((t) => t.id === "T1_execution")?.status === "done");
ok("happy T5 done", happy.tasks.find((t) => t.id === "T5_offer")?.status === "done");
ok("happy T6 done", happy.tasks.find((t) => t.id === "T6_assemble_dossier")?.status === "done");
ok(
  "happy return tasks skipped",
  happy.tasks.find((t) => t.id === "T2_materials_return")?.status === "skipped" &&
    happy.tasks.find((t) => t.id === "T3_pricing_return")?.status === "skipped",
);
ok("happy dossier signal", happy.dossier.decisionMakerPayload != null);
ok("happy primary", happy.dossier.primaryRecommendation != null);
ok("happy 5 traces", Object.values(happy.dossier.traces).every((c) => c != null));
ok("happy no domain in notes invent", !JSON.stringify(happy.dossier).includes("bidCalculator"));

console.log("\n=== Chief Orchestrator P0 — blocked Cost ===\n");
resetTf();

const blockedCost = runChiefOrchestrator({
  caseId: "case-blocked-cost",
  offerBoq: baseDoc([eticsLine()], "t-chief-block-cost"),
  pricing: {
    catalog: { worksById: catalogMap() },
    nowMs,
    computedAtIso: nowIso,
  },
  company: { ...companyRo(), purchaseByMaterialKey: {} },
  nowIso,
});

ok("blocked-cost status", blockedCost.status === "blocked");
ok("blocked-cost T4 failed", blockedCost.tasks.find((t) => t.id === "T4_cost")?.status === "failed");
ok("blocked-cost T5 skipped", blockedCost.tasks.find((t) => t.id === "T5_offer")?.status === "skipped");
ok("blocked-cost no offer", blockedCost.experts.offer == null);
ok("blocked-cost dossier status", blockedCost.dossier.status === "blocked");

console.log("\n=== Chief Orchestrator P0 — blocked EE ===\n");
resetTf();

const blockedEe = runChiefOrchestrator({
  caseId: "case-blocked-ee",
  offerBoq: baseDoc([noiseLine()], "t-chief-block-ee"),
  pricing: {
    catalog: { worksById: catalogMap() },
    nowMs,
    computedAtIso: nowIso,
  },
  company: companyRo(),
  nowIso,
});

ok("blocked-ee status", blockedEe.status === "blocked");
ok("blocked-ee T1 failed", blockedEe.tasks.find((t) => t.id === "T1_execution")?.status === "failed");
ok("blocked-ee T2 skipped", blockedEe.tasks.find((t) => t.id === "T2_materials")?.status === "skipped");
ok("blocked-ee no materials", blockedEe.experts.materials == null);

console.log("\n=== Chief Orchestrator P0 — LOOP PE→ME N=1 ===\n");
resetTf();

// ETICS fixtures: ME availability hints → PE returnToMaterialExpert → dokładnie 1× LOOP,
// potem forward do Cost (residual return nie hard-blockuje — G-COST decyduje).
const looped = runChiefOrchestrator({
  caseId: "case-loop",
  offerBoq: baseDoc([eticsLine()], "t-chief-loop"),
  pricing: {
    catalog: { worksById: catalogMap() },
    nowMs,
    computedAtIso: nowIso,
  },
  company: companyRo(),
  maxReturnLoops: 1,
  nowIso,
});

ok("loop count 1", looped.loopCount === 1);
ok(
  "loop T2 return done",
  looped.tasks.find((t) => t.id === "T2_materials_return")?.status === "done",
);
ok(
  "loop T3 return done",
  looped.tasks.find((t) => t.id === "T3_pricing_return")?.status === "done",
);
ok("loop reached Cost", looped.tasks.find((t) => t.id === "T4_cost")?.status === "done");
ok("loop ready after forward", looped.status === "ready_for_decydent");
ok(
  "loop notes mention LOOP",
  looped.dossier.orchestrationNotesPl.some((n) => n.includes("LOOP PE→ME")),
);
ok(
  "loop notes forward residual",
  looped.dossier.orchestrationNotesPl.some((n) => n.includes("G-PE-FORWARD after LOOP")),
);

console.log(`\nALL PASS (${passed})\n`);
