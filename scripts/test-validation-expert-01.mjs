/**
 * VALIDATION-EXPERT-01 — harness (≥20 PASS).
 * npx vite-node scripts/test-validation-expert-01.mjs
 *
 * Zero Expert analyze* · zero Chief run · fixtures dossier RO only.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOFT_FINDINGS_VALIDATED_MAX,
  analyzeValidationFromDossier,
  computeVerdict,
  dedupeFindings,
  buildFinding,
} from "../src/lib/validation-expert/index.ts";

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

function baseExpert(contractOverrides = {}) {
  return {
    contract: baseTrace(contractOverrides),
  };
}

function materialsExpert(overrides = {}) {
  return {
    contract: baseTrace(),
    lines: [],
    gapsAndRisks: [],
    variants: [],
    completeness: "kompletny",
    completenessNotePl: "ok",
    packMaterialCoverage: { required: 10, present: 10, conforming: 10 },
    ...overrides,
  };
}

function costExpert(overrides = {}) {
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
      contractSummaryPl: "ok",
      pewnosc: "high",
    },
    ...overrides,
  };
}

function offerExpert(realCostPln = 170, offerPricePln = 200) {
  const breakdown = {
    realCostPln,
    marginPct: 0.1,
    marginPln: 17,
    riskPct: 0.05,
    riskPln: 9.35,
    offerPricePln,
  };
  return {
    contract: baseTrace(),
    handoffOk: true,
    breakdown,
    scenarios: [
      { strategy: "agresywny", labelPl: "A", breakdown: { ...breakdown, offerPricePln: offerPricePln - 10 } },
      { strategy: "rekomendowany", labelPl: "R", breakdown },
      { strategy: "bezpieczny", labelPl: "B", breakdown: { ...breakdown, offerPricePln: offerPricePln + 10 } },
    ],
    primaryRecommendation: {
      strategy: "rekomendowany",
      offerPricePln,
      breakdown,
      summaryPl: "rek",
    },
    signalToDecisionMaker: true,
    decisionMakerPayload: {
      offerPricePln,
      realCostPln,
      breakdown,
      scenarios: [],
      primarySummaryPl: "rek",
      pewnosc: "high",
      contractCo: "oferta",
    },
  };
}

function cleanReadyDossier(overrides = {}) {
  const cost = costExpert();
  const offer = offerExpert(170, 200);
  return {
    caseId: "case-clean",
    status: "ready_for_decydent",
    createdAt: "2026-08-07T00:00:00.000Z",
    finishedAt: "2026-08-07T00:01:00.000Z",
    loopCount: 0,
    tasks: [],
    traces: {
      execution: baseTrace(),
      materials: baseTrace(),
      pricing: baseTrace(),
      cost: baseTrace(),
      offer: baseTrace(),
    },
    experts: {
      execution: baseExpert(),
      materials: materialsExpert(),
      pricing: { contract: baseTrace(), lines: [], requiresReanalysis: false, returnToMaterialExpert: false },
      cost,
      offer,
    },
    offerHandoffPayload: cost.offerHandoffPayload,
    decisionMakerPayload: offer.decisionMakerPayload,
    primaryRecommendation: offer.primaryRecommendation,
    scenarios: offer.scenarios,
    orchestrationNotesPl: [],
    handoffBlockersPl: [],
    returnFlags: { returnToMaterialExpert: false, requiresReanalysis: false },
    ...overrides,
  };
}

const FINDING_KEYS = [
  "id",
  "severity",
  "category",
  "source",
  "code",
  "messagePl",
  "evidence",
  "recommendationPl",
];

const TRACE_KEYS = [
  "co",
  "dlaczego",
  "naPodstawieCzego",
  "pewnosc",
  "blokery",
  "zgodnoscZRozumieniemWykonania",
  "zgodnoscOpisPl",
];

// --- T1 validated ---
ok("T1 clean ready → validated", () => {
  const r = analyzeValidationFromDossier(cleanReadyDossier());
  assert.equal(r.verdict, "validated");
  assert.equal(r.hardFindings.length, 0);
  assert.ok(r.softFindings.length <= SOFT_FINDINGS_VALIDATED_MAX);
});

// --- T2 C2 Real mismatch ---
ok("T2 C2 Real identity mismatch → blocked", () => {
  const d = cleanReadyDossier({
    decisionMakerPayload: {
      ...cleanReadyDossier().decisionMakerPayload,
      realCostPln: 999,
    },
  });
  const r = analyzeValidationFromDossier(d);
  assert.equal(r.verdict, "blocked");
  assert.ok(r.hardFindings.some((f) => f.code === "VAL_C2_REAL_IDENTITY_MISMATCH"));
});

// --- T3 Soft > 3 → needs_review ---
ok("T3 Soft count > 3 → needs_review", () => {
  const d = cleanReadyDossier({
    returnFlags: { returnToMaterialExpert: true, requiresReanalysis: false },
    traces: {
      execution: baseTrace({ pewnosc: "low", blokery: [{ code: "B1", messagePl: "b1" }] }),
      materials: baseTrace({ pewnosc: "low" }),
      pricing: null,
      cost: baseTrace(),
      offer: baseTrace(),
    },
    experts: {
      ...cleanReadyDossier().experts,
      pricing: { contract: baseTrace(), lines: [], requiresReanalysis: false, returnToMaterialExpert: false },
      // C7: pricing expert present, pricing trace null → soft
    },
    primaryRecommendation: {
      strategy: "rekomendowany",
      offerPricePln: 12345,
      breakdown: cleanReadyDossier().primaryRecommendation.breakdown,
      summaryPl: "x",
    },
  });
  // Force more soft: low coverage
  d.experts.materials = materialsExpert({
    packMaterialCoverage: { required: 10, present: 3, conforming: 3 },
  });
  // Q6
  d.experts.cost = costExpert({ completenessOk: false });
  d.offerHandoffPayload = d.experts.cost.offerHandoffPayload;

  const r = analyzeValidationFromDossier(d);
  assert.equal(r.hardFindings.length, 0, `unexpected hard: ${r.hardFindings.map((f) => f.code)}`);
  assert.ok(r.softFindings.length > 3, `soft=${r.softFindings.length} codes=${r.softFindings.map((f) => f.code)}`);
  assert.equal(r.verdict, "needs_review");
});

// --- T4 C5 alone ---
ok("T4 C5 residual RETURN → soft · validated if alone", () => {
  const d = cleanReadyDossier({
    returnFlags: { returnToMaterialExpert: true, requiresReanalysis: true },
  });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_C5_RESIDUAL_RETURN"));
  assert.equal(r.hardFindings.length, 0);
  assert.equal(r.verdict, "validated");
});

// --- T5 C6 ---
ok("T5 C6 not_aligned → blocked", () => {
  const d = cleanReadyDossier();
  d.traces.execution = baseTrace({ zgodnoscZRozumieniemWykonania: "not_aligned" });
  const r = analyzeValidationFromDossier(d);
  assert.equal(r.verdict, "blocked");
  assert.ok(r.hardFindings.some((f) => f.code === "VAL_C6_TRACE_NOT_ALIGNED"));
});

// --- T6 C3 ---
ok("T6 C3 missing decisionMakerPayload → blocked", () => {
  const d = cleanReadyDossier({ decisionMakerPayload: null });
  const r = analyzeValidationFromDossier(d);
  assert.equal(r.verdict, "blocked");
  assert.ok(r.hardFindings.some((f) => f.code === "VAL_C3_MISSING_DECYDENT_SIGNAL"));
});

// --- T7 Q1 hard ---
ok("T7 Q1 abs(pct)>80 → hard blocked", () => {
  const d = cleanReadyDossier();
  d.offerHandoffPayload = {
    ...d.offerHandoffPayload,
    comparative: {
      ...d.offerHandoffPayload.comparative,
      realVsMarketMaterialsPct: 85,
    },
  };
  const r = analyzeValidationFromDossier(d);
  assert.equal(r.verdict, "blocked");
  const f = r.hardFindings.find((x) => x.code === "VAL_Q1_COMPARATIVE_OUTLIER");
  assert.ok(f);
  assert.equal(f.severity, "hard");
});

// --- T8 Q1 soft ---
ok("T8 Q1 40<abs≤80 → soft", () => {
  const d = cleanReadyDossier();
  d.offerHandoffPayload = {
    ...d.offerHandoffPayload,
    comparative: {
      ...d.offerHandoffPayload.comparative,
      realVsMarketMaterialsPct: 55,
    },
  };
  const r = analyzeValidationFromDossier(d);
  assert.equal(r.hardFindings.length, 0);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_Q1_COMPARATIVE_OUTLIER"));
  assert.equal(r.verdict, "validated");
});

// --- T9 no analyze* imports ---
ok("T9 boundary: validation-expert sources have no analyze* expert calls", () => {
  const dir = path.join(root, "src/lib/validation-expert");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const banned = [
    "analyzeExecutionFromOfferBoq",
    "analyzeMaterialsFromExecution",
    "analyzeMarketPricingFromMaterials",
    "analyzeRealCostFromExperts",
    "analyzeOfferFromCost",
    "runChiefOrchestrator",
  ];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const b of banned) {
      assert.ok(!text.includes(b), `${file} contains banned ${b}`);
    }
    // type-only chief import ok; value import of analyze forbidden already
    if (file !== "types.ts") {
      assert.ok(
        !/from ["']@\/lib\/(execution|material|pricing|cost|offer)-expert["']/.test(text) ||
          text.includes("import type"),
        `${file} should not value-import experts`,
      );
    }
  }
});

// --- T10 Trace fields ---
ok("T10 Trace contract fields complete", () => {
  const r = analyzeValidationFromDossier(cleanReadyDossier());
  for (const k of TRACE_KEYS) {
    assert.ok(k in r.contract, `missing ${k}`);
  }
  assert.equal(r.contract.pewnosc, "high");
  assert.equal(r.contract.zgodnoscZRozumieniemWykonania, "aligned");
});

// --- T11 Finding shape ---
ok("T11 Finding exact keys", () => {
  const d = cleanReadyDossier({
    returnFlags: { returnToMaterialExpert: true, requiresReanalysis: false },
  });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.findings.length >= 1);
  for (const f of r.findings) {
    assert.deepEqual(Object.keys(f).sort(), [...FINDING_KEYS].sort());
    assert.ok(f.evidence.path);
    assert.ok(f.severity === "hard" || f.severity === "soft");
  }
});

// --- T12 softLimit ---
ok("T12 report.softLimit === 3", () => {
  const r = analyzeValidationFromDossier(cleanReadyDossier());
  assert.equal(r.report.softLimit, 3);
  assert.equal(SOFT_FINDINGS_VALIDATED_MAX, 3);
});

// --- C1 ---
ok("C1 missing cost/offer at ready → hard", () => {
  const d = cleanReadyDossier();
  d.experts.cost = null;
  d.offerHandoffPayload = null;
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.hardFindings.some((f) => f.code === "VAL_C1_MISSING_COST_OR_OFFER"));
  assert.equal(r.verdict, "blocked");
});

// --- C4 ---
ok("C4 ME niekompletny → hard", () => {
  const d = cleanReadyDossier();
  d.experts.materials = materialsExpert({ completeness: "niekompletny" });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.hardFindings.some((f) => f.code === "VAL_C4_ME_INCOMPLETE"));
});

// --- C7 ---
ok("C7 expert without trace → soft", () => {
  const d = cleanReadyDossier();
  d.traces.pricing = null;
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_C7_TRACE_MISSING"));
});

// --- C8 ---
ok("C8 primary not in scenarios → soft", () => {
  const d = cleanReadyDossier();
  d.primaryRecommendation = {
    ...d.primaryRecommendation,
    offerPricePln: 99999,
  };
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_C8_PRIMARY_NOT_IN_SCENARIOS"));
});

// --- Q2 ---
ok("Q2 low coverage → soft", () => {
  const d = cleanReadyDossier();
  d.experts.materials = materialsExpert({
    packMaterialCoverage: { required: 10, present: 2, conforming: 2 },
  });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_Q2_LOW_MATERIAL_COVERAGE"));
});

// --- Q3 ---
ok("Q3 PE risk concentration → soft", () => {
  const d = cleanReadyDossier();
  d.experts.pricing = {
    contract: baseTrace(),
    lines: [
      { priceRisk: "high", freshness: "ok" },
      { priceRisk: "high", freshness: "stale" },
      { priceRisk: "low", freshness: "ok" },
    ],
    requiresReanalysis: false,
    returnToMaterialExpert: false,
  };
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_Q3_PRICE_RISK_CONCENTRATION"));
});

// --- Q4 ---
ok("Q4 low confidence rollup → soft", () => {
  const d = cleanReadyDossier();
  d.traces.execution = baseTrace({ pewnosc: "low" });
  d.traces.materials = baseTrace({ pewnosc: "low" });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_Q4_LOW_CONFIDENCE_ROLLUP"));
});

// --- Q5 ---
ok("Q5 blocker rollup → soft", () => {
  const d = cleanReadyDossier();
  d.traces.cost = baseTrace({ blokery: [{ code: "X", messagePl: "x" }] });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_Q5_EXPERT_BLOCKER_ROLLUP"));
});

// --- Q6 ---
ok("Q6 completenessOk false → soft", () => {
  const d = cleanReadyDossier();
  d.experts.cost = costExpert({ completenessOk: false });
  const r = analyzeValidationFromDossier(d);
  assert.ok(r.softFindings.some((f) => f.code === "VAL_Q6_PARTIAL_PURCHASE_IMPACT"));
});

// --- result shape AC2 ---
ok("AC2 result keys present", () => {
  const r = analyzeValidationFromDossier(cleanReadyDossier());
  for (const k of ["contract", "findings", "hardFindings", "softFindings", "report", "verdict"]) {
    assert.ok(k in r, k);
  }
});

// --- verdict policy unit ---
ok("verdict policy Soft<=3 validated", () => {
  const softs = [1, 2, 3].map((i) =>
    buildFinding({
      code: "VAL_C5_RESIDUAL_RETURN",
      severity: "soft",
      category: "risk",
      source: "dossier",
      messagePl: `s${i}`,
      recommendationPl: "r",
      evidence: { path: `p${i}` },
      ordinal: i,
    }),
  );
  const v = computeVerdict(softs);
  assert.equal(v.verdict, "validated");
  assert.equal(v.softCount, 3);
});

ok("verdict policy Soft>3 needs_review", () => {
  const softs = [1, 2, 3, 4].map((i) =>
    buildFinding({
      code: "VAL_C5_RESIDUAL_RETURN",
      severity: "soft",
      category: "risk",
      source: "dossier",
      messagePl: `s${i}`,
      recommendationPl: "r",
      evidence: { path: `p${i}` },
      ordinal: i,
    }),
  );
  assert.equal(computeVerdict(softs).verdict, "needs_review");
});

ok("dedupe findings by code|source|path", () => {
  const a = buildFinding({
    code: "VAL_C5_RESIDUAL_RETURN",
    severity: "soft",
    category: "risk",
    source: "dossier",
    messagePl: "a",
    recommendationPl: "r",
    evidence: { path: "returnFlags.returnToMaterialExpert" },
  });
  const b = { ...a, id: "other", messagePl: "b" };
  assert.equal(dedupeFindings([a, b]).length, 1);
});

ok("non-ready skips C1 hard missing", () => {
  const d = cleanReadyDossier({ status: "blocked", experts: { ...cleanReadyDossier().experts, cost: null } });
  const r = analyzeValidationFromDossier(d);
  assert.ok(!r.hardFindings.some((f) => f.code === "VAL_C1_MISSING_COST_OR_OFFER"));
});

ok("chainCoverage mirrors experts", () => {
  const r = analyzeValidationFromDossier(cleanReadyDossier());
  assert.deepEqual(r.report.chainCoverage, {
    execution: true,
    materials: true,
    pricing: true,
    cost: true,
    offer: true,
  });
});

console.log("");
console.log(`RESULT  ${passed} PASS / ${failed} FAIL`);
if (failed > 0 || passed < 20) {
  process.exit(1);
}
