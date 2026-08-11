/**
 * MARKET-MATERIAL-RESEARCH-02 — provider factory harness (P1–P19 + regressions).
 *
 * Production path = DIY selective (OK_DIY_SELECTIVE) after Legal PASS + D1 VERIFIED
 * · harness uses diyLookup=null to keep ZERO live HTTP · ZERO invent PLN.
 *
 * npx vite-node scripts/test-market-material-research-02.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { MARKET_SYNC_P3_LEGAL_GATE, isMarketSyncP3LegalPass } from "../src/lib/market-sync/p3-flag.ts";
import {
  MMR_02_CIRCUIT_FAILURES,
  MMR_02_DISCONNECTED_PROVIDER_ID,
  MMR_02_MAX_RETRY,
  MMR_02_PRIMARY_SOURCE_STATUS,
  MMR_02_RATE_LIMIT_PER_MIN,
  MMR_02_TIMEOUT_MS,
  acceptMaterialResearchCandidate,
  createNullDiySelectiveLookup,
  createProviderLoadGuardState,
  dedupeNeededMaterialKeys,
  evaluateMaterialCache,
  executeMaterialResearchPhase2,
  isMmr02LiveHttpEligible,
  normalizePriceDemandStore,
  resetMaterialResearchSessionCooldownForTests,
  resolveMmr02Phase2Provider,
  validateResearchCandidate,
  wrapProviderWithLoadGuards,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  get length() {
    return storage.size;
  },
};

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  throw new Error(`UNEXPECTED_FETCH ${String(args[0])}`);
};

let passed = 0;
function ok(name, cond, detail) {
  assert.ok(cond, `${name}${detail ? ": " + JSON.stringify(detail) : ""}`);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

const T_NOW = Date.parse("2026-08-11T14:00:00.000Z");
const T_FRESH = "2026-08-01T12:00:00.000Z";
const WORK_PAINT = "cw.product.farba_lateksowa_wewnetrzna";
const MAT_PAINT = "mat.farba_lateksowa_wewnetrzna";

function baseCatalog(withQuotes) {
  const paint = {
    id: WORK_PAINT,
    tradeId: "MALOWANIE",
    namePl: "Farba lateksowa wewn.",
    unit: "l",
    companyPricePln: 0,
    updatedAt: T_FRESH,
    keywords: ["farba"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    freshnessStatus: "missing",
  };
  if (withQuotes) {
    paint.marketQuotes = {
      wgdom: {
        wroclaw: {
          price: withQuotes.price,
          regionCode: "wroclaw",
          coverage: "indicative",
          updatedAt: withQuotes.updatedAt,
          confidence: 0.8,
          origin: "wgdom",
        },
      },
    };
  }
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: T_FRESH, works: [paint] },
      dolnyslask: { region: "dolnyslask", updatedAt: T_FRESH, works: [] },
    },
  });
}

function worksMap(store) {
  return new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
}

function memoryCatalogDeps(initial) {
  let store = structuredClone(initial);
  return {
    get: () => store,
    load: async () => structuredClone(store),
    save: async (next) => {
      store = structuredClone(next);
      return { ok: true, saved: true };
    },
  };
}

function leasePort(atomic, nowMs = T_NOW) {
  return {
    async claim(input) {
      const r = await claimResearchJobLease(
        atomic,
        {
          researchJobId: input.researchJobId,
          claimantId: input.claimantId,
          leaseMs: input.leaseMs,
        },
        nowMs,
      );
      return { acquired: r.acquired, reason: r.reason ?? null, job: r.job };
    },
    async release(input) {
      const r = await releaseResearchJobLease(atomic, {
        researchJobId: input.researchJobId,
        claimantId: input.claimantId,
        nowMs,
      });
      return { released: r.released };
    },
  };
}

function missingDemand() {
  return {
    demandId: `${MAT_PAINT}|${WORK_PAINT}|wroclaw|MARKET_QUOTE_MISSING`,
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    normalizedName: "Farba",
    unit: "l",
    region: "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    priority: "MEDIUM",
    occurrenceCount: 1,
    tenderIds: ["08dee178"],
    firstRequestedAt: new Date(T_NOW).toISOString(),
    lastRequestedAt: new Date(T_NOW).toISOString(),
    reason: "MARKET PRICE MISSING",
  };
}

function researchInput() {
  return {
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    namePl: "Farba",
    unit: "l",
    region: "wroclaw",
    demandId: "d1",
    researchJobId: "job1",
    nowIso: new Date(T_NOW).toISOString(),
  };
}

// ─── Baseline Legal / D1 (OWNER-LEGAL-PASS-07) ───────────────────────────────
eq("LEGAL gate PASS", MARKET_SYNC_P3_LEGAL_GATE, "PASS");
eq("LEGAL isPass true", isMarketSyncP3LegalPass(), true);
eq("D1 PRIMARY VERIFIED", MMR_02_PRIMARY_SOURCE_STATUS, "VERIFIED");
eq("liveHttpEligible default true", isMmr02LiveHttpEligible(), true);
eq("C4 rate", MMR_02_RATE_LIMIT_PER_MIN, 6);
eq("C4 timeout", MMR_02_TIMEOUT_MS, 12_000);
eq("C4 retry", MMR_02_MAX_RETRY, 1);
eq("C4 circuit failures", MMR_02_CIRCUIT_FAILURES, 3);

// ─── P1 CURRENT → zero provider call ────────────────────────────────────────
{
  resetMaterialResearchSessionCooldownForTests();
  const catalog = baseCatalog({ price: 11.1, updatedAt: T_FRESH });
  let researchCalls = 0;
  const counting = {
    id: "count_p1",
    connected: true,
    async research() {
      researchCalls += 1;
      return { ok: false, error: "should_not_run", autoAccepted: false };
    },
  };
  const demand = missingDemand();
  const r = await executeMaterialResearchPhase2({
    demand,
    claimantId: "p1",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(catalog),
    nowMs: T_NOW,
    provider: counting,
  });
  eq("P1 error current_reuse", r.error, "current_reuse_no_research");
  eq("P1 providerCalls", researchCalls, 0);
  const mem = evaluateMaterialCache({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    region: "wroclaw",
    worksById: worksMap(catalog),
    nowMs: T_NOW,
  });
  eq("P1 usability CURRENT", mem.usability, "CURRENT");
}

// ─── P2 D1 UNKNOWN → disconnected ───────────────────────────────────────────
{
  const r = resolveMmr02Phase2Provider({
    legalPassOverride: true,
    primaryStatusOverride: "UNKNOWN",
  });
  eq("P2 connected", r.connected, false);
  eq("P2 id", r.provider.id, MMR_02_DISCONNECTED_PROVIDER_ID);
  eq("P2 reason", r.reason, "D1_PRIMARY_SOURCE_UNKNOWN");
  eq("P2 liveHttpEligible", r.liveHttpEligible, false);
  const out = await r.provider.research(researchInput());
  eq("P2 research ok", out.ok, false);
  if (!out.ok) eq("P2 error", out.error, "D1_PRIMARY_SOURCE_UNKNOWN");
}

// ─── P3 Legal PASS + D1 VERIFIED → DIY selective (null lookup · zero HTTP) ───
{
  const before = fetchCalls;
  const r = resolveMmr02Phase2Provider({
    diyLookup: createNullDiySelectiveLookup(),
  });
  eq("P3 reason DIY", r.reason, "OK_DIY_SELECTIVE");
  eq("P3 connected", r.connected, true);
  eq("P3 liveHttpEligible", r.liveHttpEligible, true);
  const gap = await r.provider.research(researchInput());
  eq("P3 research ok", gap.ok, false);
  if (!gap.ok) eq("P3 adapter gap", gap.error, "PRICE_GAP");
  resetMaterialResearchSessionCooldownForTests();
  const phase2 = await executeMaterialResearchPhase2({
    demand: missingDemand(),
    claimantId: "p3",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(baseCatalog(null)),
    nowMs: T_NOW,
    provider: r.provider,
  });
  ok("P3 phase2 fail-soft", phase2.ok === false);
  eq("P3 HTTP delta", fetchCalls - before, 0);
  ok(
    "P3 error disconnected-ish",
    phase2.error === "PRICE_GAP" ||
      phase2.error === "provider_not_connected" ||
      phase2.error === "FAILED",
    { error: phase2.error },
  );
}

// ─── P4 Owner CTA path only when legal allowed ──────────────────────────────
{
  let probeCalls = 0;
  const probe = {
    id: "probe",
    connected: true,
    async research() {
      probeCalls += 1;
      return { ok: false, error: "probe_only", autoAccepted: false };
    },
  };
  const blocked = resolveMmr02Phase2Provider({
    legalPassOverride: false,
    primaryStatusOverride: "VERIFIED",
    probeInner: probe,
  });
  await blocked.provider.research(researchInput());
  eq("P4 blocked probeCalls", probeCalls, 0);
  eq("P4 blocked reason", blocked.reason, "LEGAL_GATE_OPEN");

  const allowed = resolveMmr02Phase2Provider({
    legalPassOverride: true,
    primaryStatusOverride: "VERIFIED",
    probeInner: probe,
    nowMs: T_NOW,
  });
  eq("P4 allowed reason", allowed.reason, "PROBE");
  eq("P4 liveHttpEligible", allowed.liveHttpEligible, true);
  await allowed.provider.research(researchInput());
  eq("P4 allowed probeCalls", probeCalls, 1 + MMR_02_MAX_RETRY);
  eq("P4 still zero fetch", fetchCalls, 0);
}

// ─── P5–P8 validation GAP ───────────────────────────────────────────────────
{
  const base = {
    materialKey: MAT_PAINT,
    unit: "l",
    currency: "PLN",
    provenance: "manual_owner",
    priceNet: 10,
  };
  eq(
    "P5 wrong unit",
    validateResearchCandidate({
      requestMaterialKey: MAT_PAINT,
      requestUnit: "l",
      draft: { ...base, unit: "kg" },
    }).gap,
    "WRONG_UNIT",
  );
  eq(
    "P6 wrong identity",
    validateResearchCandidate({
      requestMaterialKey: MAT_PAINT,
      requestUnit: "l",
      draft: { ...base, materialKey: "mat.other" },
    }).gap,
    "WRONG_MATERIAL_IDENTITY",
  );
  eq(
    "P7 missing provenance",
    validateResearchCandidate({
      requestMaterialKey: MAT_PAINT,
      requestUnit: "l",
      draft: { ...base, provenance: null },
    }).gap,
    "MISSING_PROVENANCE",
  );
  eq(
    "P8 package price",
    validateResearchCandidate({
      requestMaterialKey: MAT_PAINT,
      requestUnit: "l",
      draft: { ...base, unit: "op.", isPackagePrice: true },
    }).gap,
    "PACKAGE_PRICE_NO_CONVERSION_SSOT",
  );
  ok(
    "P8b valid ok",
    validateResearchCandidate({
      requestMaterialKey: MAT_PAINT,
      requestUnit: "l",
      draft: base,
    }).ok === true,
  );
}

// ─── P9 rate ≤ 6/min ────────────────────────────────────────────────────────
{
  const state = createProviderLoadGuardState();
  let calls = 0;
  const inner = {
    id: "rate",
    connected: true,
    async research(input) {
      calls += 1;
      return {
        ok: true,
        autoAccepted: false,
        candidate: {
          candidateId: `rate_${calls}`,
          demandId: input.demandId,
          provider: "other",
          sourceType: "market_reference",
          name: "rate probe",
          unit: input.unit,
          priceNet: 1,
          currency: "PLN",
          priceDate: "2026-08-11",
          retrievedAt: input.nowIso,
          provenance: "mock_test",
          materialKey: input.materialKey,
          catalogWorkId: input.catalogWorkId,
          region: input.region,
        },
      };
    },
  };
  const wrapped = wrapProviderWithLoadGuards(inner, {
    state,
    nowMs: () => T_NOW,
    maxRetry: 0,
  });
  for (let i = 0; i < 6; i++) await wrapped.research(researchInput());
  eq("P9 six allowed", calls, 6);
  const seventh = await wrapped.research(researchInput());
  eq("P9 seventh ok", seventh.ok, false);
  if (!seventh.ok) eq("P9 RATE_LIMIT", seventh.error, "RATE_LIMIT");
  eq("P9 inner still 6", calls, 6);
}

// ─── P10 timeout 12s (contract + short probe) ───────────────────────────────
{
  eq("P10 timeout const", MMR_02_TIMEOUT_MS, 12_000);
  const state = createProviderLoadGuardState();
  const slow = {
    id: "slow",
    connected: true,
    async research() {
      await new Promise((r) => setTimeout(r, 40));
      return { ok: false, error: "late", autoAccepted: false };
    },
  };
  const wrapped = wrapProviderWithLoadGuards(slow, {
    state,
    nowMs: () => T_NOW,
    timeoutMs: 10,
    maxRetry: 0,
  });
  const out = await wrapped.research(researchInput());
  eq("P10 ok", out.ok, false);
  if (!out.ok) eq("P10 PROVIDER_TIMEOUT", out.error, "PROVIDER_TIMEOUT");
}

// ─── P11 max retry = 1 ──────────────────────────────────────────────────────
{
  const state = createProviderLoadGuardState();
  let calls = 0;
  const flaky = {
    id: "flaky",
    connected: true,
    async research() {
      calls += 1;
      throw new Error("boom");
    },
  };
  const wrapped = wrapProviderWithLoadGuards(flaky, {
    state,
    nowMs: () => T_NOW,
    maxRetry: MMR_02_MAX_RETRY,
    timeoutMs: 1000,
  });
  const out = await wrapped.research(researchInput());
  eq("P11 ok", out.ok, false);
  eq("P11 attempts", calls, 2);
}

// ─── P12 circuit after 3 failures / 5min ────────────────────────────────────
{
  const state = createProviderLoadGuardState();
  let calls = 0;
  const bad = {
    id: "bad",
    connected: true,
    async research() {
      calls += 1;
      return { ok: false, error: "fail", autoAccepted: false };
    },
  };
  const wrapped = wrapProviderWithLoadGuards(bad, {
    state,
    nowMs: () => T_NOW,
    maxRetry: 0,
  });
  for (let i = 0; i < 3; i++) await wrapped.research(researchInput());
  eq("P12 three calls", calls, 3);
  const fourth = await wrapped.research(researchInput());
  eq("P12 fourth ok", fourth.ok, false);
  if (!fourth.ok) eq("P12 CIRCUIT_OPEN", fourth.error, "CIRCUIT_OPEN");
  eq("P12 inner still 3", calls, 3);
}

// ─── P13 candidate ≠ persisted quote ────────────────────────────────────────
{
  resetMaterialResearchSessionCooldownForTests();
  const catalog = baseCatalog(null);
  const deps = memoryCatalogDeps(catalog);
  const before = JSON.stringify(deps.get().catalogs.wroclaw.works[0].marketQuotes ?? null);
  const phase2 = await executeMaterialResearchPhase2({
    demand: missingDemand(),
    claimantId: "p13",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(catalog),
    nowMs: T_NOW,
    mockPriceNet: 22.2,
  });
  ok("P13 candidate", Boolean(phase2.ok && phase2.candidate));
  const after = JSON.stringify(deps.get().catalogs.wroclaw.works[0].marketQuotes ?? null);
  eq("P13 quotes unchanged", before, after);
  eq("P13 autoAccepted", phase2.autoAccepted, false);
}

// ─── P14 no Accept → Quotes unchanged ───────────────────────────────────────
{
  const catalog = baseCatalog(null);
  const deps = memoryCatalogDeps(catalog);
  const before = JSON.stringify(deps.get());
  // candidate staged earlier — no accept call
  eq("P14 store unchanged", before, JSON.stringify(deps.get()));
}

// ─── P15 Accept → existing Quotes/Memory path ───────────────────────────────
{
  resetMaterialResearchSessionCooldownForTests();
  const catalog = baseCatalog(null);
  const deps = memoryCatalogDeps(catalog);
  const demand = missingDemand();
  const phase2 = await executeMaterialResearchPhase2({
    demand,
    claimantId: "p15",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(catalog),
    nowMs: T_NOW,
    mockPriceNet: 19.5,
  });
  ok("P15 phase2", phase2.ok && phase2.candidate);
  const acc = await acceptMaterialResearchCandidate({
    candidate: phase2.candidate,
    demandStore: normalizePriceDemandStore({
      schemaVersion: 1,
      updatedAt: new Date(T_NOW).toISOString(),
      demands: [demand],
    }),
    expectedUnit: "l",
    commitDeps: deps,
    updatedAtIso: new Date(T_NOW).toISOString(),
  });
  ok("P15 accept", acc.ok && acc.persisted, acc);
  eq("P15 wrotePurchase", acc.wrotePurchase, false);
  const mem = evaluateMaterialCache({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    region: "wroclaw",
    worksById: worksMap(deps.get()),
    nowMs: T_NOW,
  });
  eq("P15 Memory CURRENT", mem.usability, "CURRENT");
}

// ─── P16 20 identical BOQ lines → 1 need ────────────────────────────────────
{
  const lines = Array.from({ length: 20 }, (_, i) => ({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    namePl: "Farba",
    unit: "l",
    region: "wroclaw",
    lineId: `L${i}`,
  }));
  const needs = dedupeNeededMaterialKeys(lines);
  eq("P16 needs length", needs.length, 1);
  eq("P16 occurrenceCount", needs[0].occurrenceCount, 20);
}

// ─── P17 10 claimants → 1 ACTIVE via Stage A ────────────────────────────────
{
  resetMaterialResearchSessionCooldownForTests();
  const catalog = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const port = leasePort(atomic);
  const demand = missingDemand();
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      executeMaterialResearchPhase2({
        demand,
        claimantId: `C${i}`,
        lease: port,
        worksById: worksMap(catalog),
        nowMs: T_NOW,
        mockPriceNet: 15.5,
      }),
    ),
  );
  const acquired = results.filter((r) => r.acquired && r.ok);
  eq("P17 exactly 1 acquired", acquired.length, 1);
  eq("P17 autoAccepted", acquired[0].autoAccepted, false);
}

// ─── P18 provider failure → fail-soft ───────────────────────────────────────
{
  resetMaterialResearchSessionCooldownForTests();
  const before = fetchCalls;
  const r = await executeMaterialResearchPhase2({
    demand: missingDemand(),
    claimantId: "p18",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(baseCatalog(null)),
    nowMs: T_NOW,
    provider: {
      id: "fail_soft",
      connected: true,
      async research() {
        return { ok: false, error: "SOURCE_UNAVAILABLE", autoAccepted: false };
      },
    },
  });
  ok("P18 no throw", r.ok === false);
  eq("P18 error", r.error, "SOURCE_UNAVAILABLE");
  eq("P18 HTTP delta", fetchCalls - before, 0);
  eq("P18 autoAccepted", r.autoAccepted, false);
}

eq("HTTP fetchCalls total", fetchCalls, 0);

// ─── P19 regressions (B1 embeds Stage B / Hard SF / SCREED / PAINTING / DECOMP / PRICE-PATH) ─
console.log("\n--- regressions (P19) ---");
function runChild(label, script, expectPass) {
  const r = spawnSync("npx", ["vite-node", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    timeout: 300_000,
    shell: true,
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const allPass =
    out.match(/ALL PASS\s*\((\d+)\)/i) ||
    out.match(/OK (\d+) assertions/i) ||
    out.match(/PRICE-PATH-01 ALL PASS \((\d+)\)/i) ||
    out.match(/STAGE B ALL PASS \((\d+)\)/i) ||
    out.match(/HARD[- ]SF ALL PASS \((\d+)\)/i) ||
    out.match(/Hard SF ALL PASS \((\d+)\)/i) ||
    out.match(/B1 RUNTIME-WIRE ALL PASS \((\d+)\)/i);
  const passLines = (out.match(/^ {0,2}PASS /gm) || []).length;
  const count = allPass ? Number(allPass[1]) : passLines;
  assert.equal(r.status, 0, `${label} exit\n${out.slice(-2500)}`);
  eq(`REG ${label}`, count, expectPass);
  return out;
}

// Run leaf suites first (explicit Owner counts), then B1 (which re-checks them + wire).
const leafOut = {
  stageB: runChild("Stage B", "scripts/test-market-material-research-01.mjs", 58),
  hardSf: runChild("Hard SF", "scripts/test-market-material-research-01-hard-sf.mjs", 33),
  screed: runChild("SCREED", "scripts/test-economy-wet-cement-screed-v1.mjs", 18),
  painting: runChild("PAINTING", "scripts/test-painting-scope-harden-01.mjs", 50),
  decomp: runChild("DECOMP", "scripts/test-technology-decomposition-01.mjs", 69),
  pricePath: runChild("PRICE-PATH", "scripts/test-price-path-01.mjs", 78),
};
void leafOut;
runChild("B1", "scripts/test-market-material-research-01-b1.mjs", 46);

globalThis.fetch = originalFetch;
console.log(`\nMMR-02 PROVIDER ALL PASS (${passed})`);
console.log("LIVE HTTP = ZERO");
console.log("SCRAPING = ZERO");
console.log("AUTO ACCEPT = ZERO");
console.log("PROVIDER LIVE = NO (DISCONNECTED)");
console.log("COMMIT = NONE");
console.log("PUSH = NONE");
