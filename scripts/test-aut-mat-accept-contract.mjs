/**
 * AUT-MAT — Material Accept contract matrix (pure + thin Accept adapter).
 *
 * Run: npx vite-node scripts/test-aut-mat-accept-contract.mjs
 */
import {
  evaluateAutMatMaterialAcceptContract,
  AUT_MAT_RULE_ID,
} from "../src/lib/price-intelligence/aut-mat-accept-contract.ts";
import { tryAutMatAcceptMaterialCandidate } from "../src/lib/price-intelligence/aut-mat-accept.ts";
import { evaluateAutMatMaterialAcceptContract as evaluateFromIndex } from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { evaluateMaterialCache } from "../src/lib/price-intelligence/market-material-research-cache.ts";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const T_FRESH = "2026-09-09T12:00:00.000Z";
const WORK_ID = "cw.autmat.paint_white";
const MAT_KEY = "mat.autmat.paint_white";
const UNIT = "l";
const PRICE = 19.9;

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: "Farba lateksowa biała",
    unit: UNIT,
    companyPricePln: 999,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "missing",
    keywords: ["farba"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

function quoteCell(price, at, decisionKind) {
  return {
    wgdom: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt: at,
        confidence: 0.8,
        origin: "wgdom",
        ...(decisionKind ? { decisionKind } : {}),
      },
    },
  };
}

function makeStore(work) {
  const works = [work];
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: structuredClone(works), updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function candidate(overrides = {}) {
  return {
    candidateId: "pc_autmat_1",
    demandId: "pd_autmat_1",
    provider: "other",
    sourceType: "market_reference",
    name: "Farba lateksowa biała",
    unit: UNIT,
    priceNet: PRICE,
    currency: "PLN",
    priceDate: "2026-09-09",
    sourceUrl: "https://example.test/paint",
    retrievedAt: T_FRESH,
    provenance: "mock_test",
    notes: "TEST / MOCK / NON-PRODUCTION · single_source · shops=other",
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    ...overrides,
  };
}

function worksById(store) {
  return new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
}

function memoryDeps(initial) {
  let store = structuredClone(initial);
  return {
    load: async () => structuredClone(store),
    save: async (next) => {
      store = structuredClone(next);
      return { ok: true, saved: true };
    },
    loadLocal: () => store,
    saveLocal: (next) => {
      store = next;
    },
  };
}

ok("export evaluate from index", typeof evaluateFromIndex === "function");

// ─── A PASS ─────────────────────────────────────────────────────────────────
{
  const store = makeStore(makeWork());
  const c = candidate();
  const contract = evaluateAutMatMaterialAcceptContract({
    worksById: worksById(store),
    candidate: c,
    expectedUnit: UNIT,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok("A contract PASS", contract.decision === "AUT_MAT_ACCEPT");
  ok("A mayPersist", contract.mayPersistPriceMemory === true);
  ok("A not noop", contract.idempotentNoop === false);

  const deps = memoryDeps(store);
  const applied = await tryAutMatAcceptMaterialCandidate({
    worksById: worksById(store),
    candidate: c,
    expectedUnit: UNIT,
    identityTrusted: true,
    nowMs: NOW,
    commitDeps: deps,
  });
  ok("A Accept applied", applied.ok && applied.accepted);
  ok("A autMat flag", applied.autMatAutonomousAccept === true);
  ok("A no companyPrice", applied.companyPriceUsedAsMaterialPrice === false);
  ok("A aiAutoAccept false", applied.aiAutoAccept === false);

  const after = deps.loadLocal();
  const map = worksById(after);
  const cache = evaluateMaterialCache({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    worksById: map,
    nowMs: NOW + 1000,
  });
  ok("A PM CURRENT", cache.usability === "CURRENT");
  ok("A price", cache.hit?.price === PRICE, cache.hit);
  const snap = after.catalogs.wroclaw.works[0].marketQuotes?.wgdom?.wroclaw
    ?? after.catalogs.wroclaw.works[0].marketQuotes?.leroy?.wroclaw
    ?? after.catalogs.wroclaw.works[0].marketQuotes?.other?.wroclaw;
  ok("A decisionKind AUT_MAT", snap?.decisionKind === "AUT_MAT", snap);
  ok("A ruleId", snap?.decisionRuleId === AUT_MAT_RULE_ID, snap);
}

// ─── B Idempotent ───────────────────────────────────────────────────────────
{
  const store0 = makeStore(makeWork({ marketQuotes: quoteCell(PRICE, T_FRESH, "AUT_MAT") }));
  const c = candidate();
  const second = await tryAutMatAcceptMaterialCandidate({
    worksById: worksById(store0),
    candidate: c,
    expectedUnit: UNIT,
    identityTrusted: true,
    nowMs: NOW,
    commitDeps: memoryDeps(store0),
  });
  ok("B idempotent noop", second.ok && second.idempotentNoop);
  ok("B no write", second.accepted === false);
}

// ─── C Missing candidate / evidence ─────────────────────────────────────────
{
  const store = makeStore(makeWork());
  ok(
    "C no candidate",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: null,
      expectedUnit: UNIT,
      identityTrusted: true,
      nowMs: NOW,
    }).reasons.includes("NO_CANDIDATE"),
  );
  ok(
    "C missing evidence",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: candidate({ sourceUrl: undefined, notes: "no evidence" }),
      expectedUnit: UNIT,
      identityTrusted: true,
      nowMs: NOW,
    }).reasons.includes("MISSING_EVIDENCE"),
  );
}

// ─── D Conflict multi_source_average ────────────────────────────────────────
{
  const store = makeStore(makeWork());
  const contract = evaluateAutMatMaterialAcceptContract({
    worksById: worksById(store),
    candidate: candidate({
      notes: "live_selective_diy · multi_source_average · shops=leroy+castorama",
      sourceUrl: "https://example.test/a",
    }),
    expectedUnit: UNIT,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok("D EXCEPTION", contract.decision === "AUT_MAT_EXCEPTION");
  ok("D conflict", contract.reasons.includes("EVIDENCE_CONFLICT"));
}

// ─── E companyPrice / owner source ──────────────────────────────────────────
{
  const store = makeStore(makeWork());
  ok(
    "E companyPriceOnly",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: candidate(),
      expectedUnit: UNIT,
      identityTrusted: true,
      nowMs: NOW,
      companyPriceOnly: true,
    }).reasons.includes("COMPANY_PRICE_FORBIDDEN"),
  );
  ok(
    "E owner sourceType",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: candidate({ sourceType: "owner" }),
      expectedUnit: UNIT,
      identityTrusted: true,
      nowMs: NOW,
    }).reasons.includes("OWNER_SOURCE_FORBIDDEN"),
  );
}

// ─── F Overwrite Owner CURRENT ──────────────────────────────────────────────
{
  const store = makeStore(makeWork({ marketQuotes: quoteCell(12.5, T_FRESH) })); // UNKNOWN=Owner strength
  const contract = evaluateAutMatMaterialAcceptContract({
    worksById: worksById(store),
    candidate: candidate({ priceNet: 33 }),
    expectedUnit: UNIT,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok("F overwrite owner", contract.reasons.includes("OVERWRITE_BLOCKED_OWNER"));
  ok("F overwriteBlocked", contract.overwriteBlocked === true);
}

// ─── G Untrusted / unit / invalid price ─────────────────────────────────────
{
  const store = makeStore(makeWork());
  ok(
    "G untrusted",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: candidate(),
      expectedUnit: UNIT,
      identityTrusted: false,
      nowMs: NOW,
    }).reasons.includes("NOT_TRUSTED_IDENTITY"),
  );
  ok(
    "G unit",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: candidate(),
      expectedUnit: "m2",
      identityTrusted: true,
      nowMs: NOW,
    }).reasons.includes("UNIT_MISMATCH"),
  );
  ok(
    "G invalid price",
    evaluateAutMatMaterialAcceptContract({
      worksById: worksById(store),
      candidate: candidate({ priceNet: 0 }),
      expectedUnit: UNIT,
      identityTrusted: true,
      nowMs: NOW,
    }).reasons.includes("INVALID_CANDIDATE_PRICE"),
  );
}

// ─── H Owner CURRENT identical → noop ───────────────────────────────────────
{
  const store = makeStore(makeWork({ marketQuotes: quoteCell(PRICE, T_FRESH, "OWNER") }));
  const contract = evaluateAutMatMaterialAcceptContract({
    worksById: worksById(store),
    candidate: candidate(),
    expectedUnit: UNIT,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok("H owner same price noop", contract.idempotentNoop === true);
  ok("H no persist", contract.mayPersistPriceMemory === false);
}

console.log(`\nAUT-MAT contract: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
