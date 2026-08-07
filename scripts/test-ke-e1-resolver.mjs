/**
 * KE-E1 — unit tests Resolver / eligibility / scorecard / empty-CK parity.
 * npx vite-node scripts/test-ke-e1-resolver.mjs
 */

import {
  KE_N_MIN,
  isCompanyEligible,
  lookupToKnowledgeCandidate,
  mergeKePolicy,
  resolveKnowledgePrice,
  toKnowledgeEngineExplainMeta,
} from "../src/lib/knowledge-engine/index.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${msg}`);
  }
}

console.log("=== KE-E1 Resolver ===\n");

const now = "2026-08-07T00:00:00.000Z";
const policy = mergeKePolicy();

console.log("1. Eligibility Company");
{
  const low = {
    id: "c1",
    source: "company",
    unitPricePln: 10,
    chainIndex: 0,
    confidence: "low",
    freshness: "ok",
    n: 1,
    nApprovals: 0,
  };
  const eligLow = isCompanyEligible(low, policy, now);
  assert(!eligLow.eligible, "n=1 → COMPANY_INELIGIBLE");
  assert(eligLow.reasons.includes("COMPANY_N_BELOW_MIN"), "reason N_BELOW_MIN");

  const ok = { ...low, n: KE_N_MIN, confidence: "medium" };
  assert(isCompanyEligible(ok, policy, now).eligible, `n=${KE_N_MIN} → eligible`);

  const viaAppr = { ...low, n: 1, nApprovals: 2 };
  assert(isCompanyEligible(viaAppr, policy, now).eligible, "approvals≥2 → eligible");
}

console.log("\n2. Empty Company → Market-first (chain order)");
{
  const market = {
    id: "m1",
    source: "market",
    unitPricePln: 100,
    chainIndex: 0,
    confidence: "medium",
    freshness: "fresh",
    n: 2,
    asOf: now,
    labelPl: "Market",
  };
  const catalog = {
    id: "w1",
    source: "company",
    unitPricePln: 80,
    chainIndex: 1,
    confidence: "medium",
    freshness: "ok",
    n: KE_N_MIN,
    labelPl: "Catalog",
    originKind: "work_catalog",
  };
  const global = {
    id: "g1",
    source: "global",
    unitPricePln: 50,
    chainIndex: 2,
    confidence: "low",
    freshness: "missing",
    n: 1,
    labelPl: "Heuristic",
  };
  const out = resolveKnowledgePrice({
    candidates: [market, catalog, global],
    nowIso: now,
  });
  assert(out.source === "market", "select market");
  assert(out.unitPricePln === 100, "price 100");
  assert(out.reasonCodes.includes("SELECTED_BY_CHAIN_ORDER"), "chain order");
  assert(out.scorecard != null && out.scorecard.totalScore > 0, "scorecard present");
  assert(out.alternates.length >= 1, "alternates");
  assert(out.explain.includes("Market"), "explain PL");
  const meta = toKnowledgeEngineExplainMeta(out);
  assert(meta.schemaVersion === 1, "explain schema v1");
  assert(meta.policy.blendEnabled === false, "blend OFF");
}

console.log("\n3. Sparse Company skipped → Market");
{
  const company = {
    id: "ck",
    source: "company",
    unitPricePln: 999,
    chainIndex: 0,
    confidence: "high",
    freshness: "ok",
    n: 1,
    nApprovals: 0,
    originKind: "company_knowledge",
  };
  const market = {
    id: "m",
    source: "market",
    unitPricePln: 100,
    chainIndex: 1,
    confidence: "medium",
    freshness: "fresh",
    n: 3,
    asOf: now,
  };
  const out = resolveKnowledgePrice({ candidates: [company, market], nowIso: now });
  assert(out.source === "market", "sparse CK skipped");
  assert(out.unitPricePln === 100, "market price");
  assert(out.reasonCodes.includes("COMPANY_INELIGIBLE"), "ineligible flagged");
}

console.log("\n4. Eligible Company (n≥N_min) wins chain-first");
{
  const company = {
    id: "ck",
    source: "company",
    unitPricePln: 120,
    chainIndex: 0,
    confidence: "high",
    freshness: "ok",
    n: 8,
    nApprovals: 3,
  };
  const market = {
    id: "m",
    source: "market",
    unitPricePln: 100,
    chainIndex: 1,
    confidence: "medium",
    freshness: "fresh",
    n: 2,
    asOf: now,
  };
  const out = resolveKnowledgePrice({ candidates: [company, market], nowIso: now });
  assert(out.source === "company", "eligible company first in chain");
  assert(out.unitPricePln === 120, "company price");
}

console.log("\n5. Owner lock wins");
{
  const out = resolveKnowledgePrice({
    candidates: [
      {
        id: "m",
        source: "market",
        unitPricePln: 100,
        chainIndex: 0,
        confidence: "medium",
        freshness: "fresh",
        n: 2,
      },
    ],
    ownerLock: { unitPricePln: 77, refId: "lock1" },
    nowIso: now,
  });
  assert(out.source === "owner", "owner lock");
  assert(out.unitPricePln === 77, "owner price");
}

console.log("\n6. OUT skip");
{
  const out = resolveKnowledgePrice({
    candidates: [
      {
        id: "m",
        source: "market",
        unitPricePln: 100,
        chainIndex: 0,
        confidence: "medium",
        freshness: "fresh",
        n: 1,
      },
    ],
    isOut: true,
    nowIso: now,
  });
  assert(out.source === "none", "OUT none");
  assert(out.reasonCodes.includes("OUT_SKIP"), "OUT_SKIP");
}

console.log("\n7. Adapter company_knowledge n from occurrenceCount");
{
  const c = lookupToKnowledgeCandidate(
    {
      unitPricePln: 10,
      origin: { kind: "company_knowledge", refId: "e1", labelPl: "CK" },
      confidence: "low",
      rationale: "x",
      companyKnowledge: {
        entryId: "e1",
        occurrenceCount: 2,
        lastUsedAt: null,
        confidenceBoosted: false,
      },
    },
    0,
    now,
  );
  assert(c != null && c.n === 2, "adapter n=2");
  assert(c.source === "company", "adapter source company");
}

console.log(`\n=== WYNIK: ${pass} PASS · ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
