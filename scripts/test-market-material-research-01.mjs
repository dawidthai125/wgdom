/**
 * MARKET-MATERIAL-RESEARCH-01 Stage B — orchestration harness.
 * CACHE FIRST · DEDUP · Hard SF · MOCK · Owner Accept · ZERO live HTTP.
 *
 * npx vite-node scripts/test-market-material-research-01.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  MMR_DEFAULT_COOLDOWN_MS,
  MMR_MOCK_MARKER,
  acceptMaterialResearchCandidate,
  buildMaterialResearchJobId,
  createMockManualResearchProvider,
  createDisconnectedLiveProviderStub,
  dedupeNeededMaterialKeys,
  evaluateMaterialCache,
  invoiceAcceptWritesMarketQuotes,
  lookupPriceMemory,
  normalizePriceDemandStore,
  orchestrateMaterialResearch,
  unitsCompatible,
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

const T_NOW = Date.parse("2026-08-11T10:00:00.000Z");
const T_FRESH = "2026-08-01T12:00:00.000Z";
const T_STALE = "2025-01-01T12:00:00.000Z";
const WORK_PAINT = "cw.product.paint.test";
const WORK_PRIMER = "cw.product.primer.test";
const MAT_PAINT = "mat.paint.x";
const MAT_PRIMER = "mat.grunt.y";

function baseCatalog(withQuotes) {
  const paint = {
    id: WORK_PAINT,
    tradeId: "MALOWANIE",
    namePl: "Farba X test",
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
  const primer = {
    id: WORK_PRIMER,
    tradeId: "MALOWANIE",
    namePl: "Grunt Y test",
    unit: "l",
    companyPricePln: 0,
    updatedAt: T_FRESH,
    keywords: ["grunt"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    freshnessStatus: "missing",
  };
  if (withQuotes?.paint) {
    paint.marketQuotes = {
      wgdom: {
        wroclaw: {
          price: withQuotes.paint.price,
          regionCode: "wroclaw",
          coverage: "indicative",
          updatedAt: withQuotes.paint.updatedAt,
          confidence: 0.8,
          origin: "wgdom",
        },
      },
    };
  }
  if (withQuotes?.primer) {
    primer.marketQuotes = {
      wgdom: {
        wroclaw: {
          price: withQuotes.primer.price,
          regionCode: "wroclaw",
          coverage: "indicative",
          updatedAt: withQuotes.primer.updatedAt,
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
      wroclaw: { region: "wroclaw", updatedAt: T_FRESH, works: [paint, primer] },
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
    loadLocal: () => structuredClone(store),
    saveLocal: (next) => {
      store = structuredClone(next);
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

function paintLine(overrides = {}) {
  return {
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    namePl: "Farba X",
    unit: "l",
    region: "wroclaw",
    tenderId: "tender-1",
    ...overrides,
  };
}

console.log("=== MARKET-MATERIAL-RESEARCH-01 STAGE B ===\n");

// ─── T2 / dedup pure ────────────────────────────────────────────────────────
{
  const lines = [
    paintLine({ lineId: "1" }),
    paintLine({ lineId: "2" }),
    paintLine({ lineId: "3" }),
    {
      materialKey: MAT_PRIMER,
      catalogWorkId: WORK_PRIMER,
      namePl: "Grunt Y",
      unit: "l",
      region: "wroclaw",
      tenderId: "tender-1",
      lineId: "4",
    },
    paintLine({ lineId: "5" }),
  ];
  const d = dedupeNeededMaterialKeys(lines);
  eq("T2 dedup unique count", d.length, 2);
  eq("T2 paint occurrences", d.find((x) => x.materialKey === MAT_PAINT).occurrenceCount, 4);
}

// ─── T1: 1 needed · MISS · 1 demand · 1 job ─────────────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider({ mockPriceNet: 22.5 }),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  eq("T1 unique keys", r.uniqueMaterialKeys.length, 1);
  eq("T1 demands", r.demandsCreated, 1);
  eq("T1 jobs claimed", r.jobsClaimed, 1);
  eq("T1 candidate ready", r.candidatesReady, 1);
  eq("T1 action", r.decisions[0].action, "CANDIDATE_READY");
  ok("T1 mock marker", r.decisions[0].job.candidate.notes.includes(MMR_MOCK_MARKER));
  eq("T1 not auto accepted", r.decisions[0].job.accepted, false);
}

// ─── T2 orchestration: 20 BOQ lines same key → 1 job ────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const lines = Array.from({ length: 20 }, (_, i) => paintLine({ lineId: `L${i}` }));
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines,
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider(),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  eq("T2 orch unique", r.uniqueMaterialKeys.length, 1);
  eq("T2 orch demands", r.demandsCreated, 1);
  eq("T2 orch jobs", r.jobsClaimed, 1);
  eq("T2 atomic keys", atomic.dump().size, 1);
}

// ─── T3: 10 users same missing → Hard SF 1 active ───────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const port = leasePort(atomic);
  const provider = createMockManualResearchProvider();
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      orchestrateMaterialResearch({
    executeResearch: true,
        lines: [paintLine({ tenderId: `t-${i}` })],
        worksById: worksMap(store),
        demandStore: normalizePriceDemandStore(null),
        lease: port,
        provider,
        claimantId: `U${i}`,
        nowMs: T_NOW,
      }),
    ),
  );
  const claimed = results.filter((r) => r.jobsClaimed === 1);
  const held = results.filter((r) => r.jobsHeld === 1);
  eq("T3 exactly one claimer", claimed.length, 1);
  eq("T3 nine held", held.length, 9);
  eq("T3 one lease key", atomic.dump().size, 1);
}

// ─── T4 CURRENT → REUSE · 0 jobs ────────────────────────────────────────────
{
  const store = baseCatalog({ paint: { price: 45, updatedAt: T_FRESH } });
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider(),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  eq("T4 reuse", r.reusedCurrent, 1);
  eq("T4 zero jobs", r.jobsClaimed, 0);
  eq("T4 zero demands", r.demandsCreated, 0);
  eq("T4 action REUSE", r.decisions[0].action, "REUSE");
  eq("T4 usability CURRENT", r.decisions[0].usability, "CURRENT");
}

// ─── T5 STALE → demand ──────────────────────────────────────────────────────
{
  const store = baseCatalog({ paint: { price: 40, updatedAt: T_STALE } });
  const cache = evaluateMaterialCache({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    region: "wroclaw",
    worksById: worksMap(store),
    nowMs: T_NOW,
  });
  eq("T5 usability STALE", cache.usability, "STALE");
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider(),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  eq("T5 demand research", r.demandsCreated, 1);
  eq("T5 job claimed", r.jobsClaimed, 1);
  eq("T5 not CURRENT reuse", r.reusedCurrent, 0);
}

// ─── T6 MISSING → demand ────────────────────────────────────────────────────
{
  const store = baseCatalog(null);
  const cache = evaluateMaterialCache({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    worksById: worksMap(store),
    nowMs: T_NOW,
  });
  eq("T6 MISSING", cache.usability, "MISSING");
}

// ─── T7 two materials → two jobs ────────────────────────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [
      paintLine(),
      {
        materialKey: MAT_PRIMER,
        catalogWorkId: WORK_PRIMER,
        namePl: "Grunt Y",
        unit: "l",
        region: "wroclaw",
        tenderId: "tender-1",
      },
    ],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider(),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  eq("T7 two keys", r.uniqueMaterialKeys.length, 2);
  eq("T7 two jobs", r.jobsClaimed, 2);
  eq("T7 two lease keys", atomic.dump().size, 2);
  ok(
    "T7 independent job ids",
    buildMaterialResearchJobId({ materialKey: MAT_PAINT, regionScope: "wroclaw" }) !==
      buildMaterialResearchJobId({ materialKey: MAT_PRIMER, regionScope: "wroclaw" }),
  );
}

// ─── T8 candidate NOT auto-accepted ─────────────────────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider({ mockPriceNet: 19.99 }),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  const cand = r.decisions[0].job.candidate;
  eq("T8 accepted false", r.decisions[0].job.accepted, false);
  eq("T8 persisted false", r.decisions[0].job.persisted, false);
  eq("T8 provenance mock", cand.provenance, "mock_test");
  // Quotes still empty
  const mem = lookupPriceMemory({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    worksById: worksMap(store),
    nowMs: T_NOW,
  });
  eq("T8 still MISS without Accept", mem.status, "MISS");
}

// ─── T9 Owner Accept → Market Quote ─────────────────────────────────────────
{
  const catalog = baseCatalog(null);
  const deps = memoryCatalogDeps(catalog);
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(deps.get()),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider({ mockPriceNet: 33.3 }),
    claimantId: "owner",
    nowMs: T_NOW,
  });
  const candidate = r.decisions[0].job.candidate;
  const acc = await acceptMaterialResearchCandidate({
    candidate,
    demandStore: r.demandStore,
    expectedUnit: "l",
    commitDeps: deps,
    updatedAtIso: new Date(T_NOW).toISOString(),
  });
  eq("T9 accept ok", acc.ok, true);
  eq("T9 wrotePurchase", acc.wrotePurchase, false);
  eq("T9 wroteCK", acc.wroteCompanyKnowledge, false);
  const mem = lookupPriceMemory({
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    worksById: worksMap(deps.get()),
    nowMs: T_NOW,
  });
  eq("T9 memory HIT", mem.status, "HIT");
  ok("T9 price persisted", mem.status === "HIT" && mem.hit.price === 33.3);
}

// ─── T10 next tender CURRENT → REUSE · 0 research ───────────────────────────
{
  const catalog = baseCatalog({ paint: { price: 33.3, updatedAt: T_FRESH } });
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine({ tenderId: "tender-2" })],
    worksById: worksMap(catalog),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider(),
    claimantId: "user-b",
    nowMs: T_NOW,
  });
  eq("T10 REUSE", r.decisions[0].action, "REUSE");
  eq("T10 zero research jobs", r.jobsClaimed, 0);
  eq("T10 zero external", r.decisions[0].externalResearchAttempted, false);
}

// ─── T11 failure → cooldown · no storm ──────────────────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const provider = createMockManualResearchProvider({ fail: true, failError: "mock_fail" });
  const r1 = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider,
    claimantId: "user-a",
    nowMs: T_NOW,
    cooldownMs: MMR_DEFAULT_COOLDOWN_MS,
  });
  eq("T11 first FAILED", r1.decisions[0].action, "FAILED");
  // same cooldown map — second pass must skip
  const r2 = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine()],
    worksById: worksMap(store),
    demandStore: r1.demandStore,
    lease: leasePort(atomic),
    provider,
    claimantId: "user-a",
    nowMs: T_NOW + 1_000,
    cooldown: r1.cooldown,
    cooldownMs: MMR_DEFAULT_COOLDOWN_MS,
  });
  eq("T11 cooldown skip", r2.decisions[0].action, "COOLDOWN_SKIP");
  eq("T11 no second claim storm", r2.jobsClaimed, 0);
}

// ─── T12 wrong unit → PRICE-GAP / reject ────────────────────────────────────
{
  const store = baseCatalog(null);
  const atomic = createMemoryAtomicResearchJobStore();
  const r = await orchestrateMaterialResearch({
    executeResearch: true,
    lines: [paintLine({ unit: "l" })],
    worksById: worksMap(store),
    demandStore: normalizePriceDemandStore(null),
    lease: leasePort(atomic),
    provider: createMockManualResearchProvider({ forceCandidateUnit: "kg" }),
    claimantId: "user-a",
    nowMs: T_NOW,
  });
  eq("T12 UNIT_REJECT", r.decisions[0].action, "UNIT_REJECT");
  eq("T12 not accepted", r.decisions[0].job.accepted, false);
  eq("T12 unitsCompatible", unitsCompatible("l", "kg"), false);
}

// ─── T13 Market ≠ Purchase ──────────────────────────────────────────────────
{
  eq("T13 invoice path ≠ marketQuotes helper", invoiceAcceptWritesMarketQuotes(), false);
  const live = createDisconnectedLiveProviderStub("leroy");
  eq("T13 leroy not connected", live.connected, false);
}

// ─── T14 Stage A 10-way concurrency (lease) ──────────────────────────────────
{
  const atomic = createMemoryAtomicResearchJobStore();
  const jobId = buildMaterialResearchJobId({
    materialKey: MAT_PAINT,
    regionScope: "wroclaw",
  });
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      claimResearchJobLease(
        atomic,
        { researchJobId: jobId, claimantId: `C${i}`, leaseMs: 60_000 },
        T_NOW,
      ),
    ),
  );
  eq("T14 one acquired", results.filter((r) => r.acquired).length, 1);
}

// ─── T9b accept rejects wrong unit ──────────────────────────────────────────
{
  const catalog = baseCatalog(null);
  const deps = memoryCatalogDeps(catalog);
  const bad = {
    candidateId: "bad",
    demandId: "d",
    provider: "other",
    sourceType: "market_reference",
    name: "bad",
    unit: "kg",
    priceNet: 1,
    currency: "PLN",
    priceDate: "2026-08-11",
    retrievedAt: new Date(T_NOW).toISOString(),
    provenance: "mock_test",
    materialKey: MAT_PAINT,
    catalogWorkId: WORK_PAINT,
    region: "wroclaw",
  };
  const acc = await acceptMaterialResearchCandidate({
    candidate: bad,
    demandStore: normalizePriceDemandStore(null),
    expectedUnit: "l",
    commitDeps: deps,
  });
  eq("T12b accept unit reject", acc.ok, false);
  eq("T12b error", acc.error, "unit_mismatch_price_gap");
}

eq("HTTP fetchCalls", fetchCalls, 0);

console.log("\n--- T15 regressions ---");
function runChild(label, script, expectPass) {
  const r = spawnSync("npx", ["vite-node", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    timeout: 180_000,
    shell: true,
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const allPass =
    out.match(/ALL PASS\s*\((\d+)\)/i) ||
    out.match(/OK (\d+) assertions/i) ||
    out.match(/PRICE-PATH-01 ALL PASS \((\d+)\)/i);
  const passLines = (out.match(/^ {0,2}PASS /gm) || []).length;
  const count = allPass ? Number(allPass[1]) : passLines;
  assert.equal(r.status, 0, `T15 ${label} exit\n${out.slice(-2000)}`);
  eq(`T15 ${label}`, count, expectPass);
}

runChild("SCREED", "scripts/test-economy-wet-cement-screed-v1.mjs", 18);
runChild("PAINTING", "scripts/test-painting-scope-harden-01.mjs", 50);
runChild("DECOMP", "scripts/test-technology-decomposition-01.mjs", 69);
runChild("PRICE-PATH", "scripts/test-price-path-01.mjs", 78);

globalThis.fetch = originalFetch;
console.log(`\nSTAGE B ALL PASS (${passed})`);
console.log("EXTERNAL HTTP = ZERO");
console.log("AUTO ACCEPT = NO");
console.log("MARKET ≠ REAL COST");
