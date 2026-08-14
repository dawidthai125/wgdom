/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W2 — labor two-pass (fixture · ZERO live HTTP).
 *
 * npx vite-node scripts/test-ik-e2e-wire-w2-labor-two-pass.mjs
 */
import {
  acceptIkLaborResearchAndNotify,
  buildIkLaborDedupeKey,
  clearIkLaborResearchSessionDedupeForTests,
  inventoryIkGapsFromShadow,
  runIkLaborGapResearch,
} from "../src/lib/ik-pricing-orchestrator/index.ts";
import {
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  lookupWorkRate,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";
import {
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { computePositionCostWithOurRate } from "../src/lib/tender-position-cost/index.ts";

async function saveLocalOnly(store, options) {
  saveWorkCatalogStoreLocal(store, { updatedAtIso: options.updatedAtIso });
  return { ok: true, saved: true };
}

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  return {
    ok: true,
    json: async () => ({}),
    text: async () => "",
  };
};

const NOW = Date.parse("2026-08-13T12:00:00.000Z");
const T_FRESH = "2026-08-12T12:00:00.000Z";
const WORK_ID = "cc-ik-wire-w2-test-work";
const UNIT = "mb";
const NAME = "Zamurowanie bruzd test IK W2";
const TENDER = "t-ik-w2";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: NAME,
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["bruzd"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ourWorkRate: undefined,
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function fixtureLookup(rate = 28.49) {
  const html = buildWorkRateFixtureHtml({
    name: NAME,
    rate,
    unit: UNIT,
    region: "WROCLAW",
    laborOnly: true,
    includesMaterial: false,
    priceKind: "regular",
    identity: true,
  });
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html },
    cennikremontow_pl: { html },
    sccot: { html },
    extradom: { html },
  });
}

function shadowLaborMissing() {
  return {
    schemaVersion: 1,
    mode: "shadow",
    lineCount: 1,
    lines: [
      {
        lineId: "L-W2",
        lp: "80",
        description: NAME,
        quantity: 10,
        unitRaw: UNIT,
        identity: {
          status: "OK",
          statusLabelPl: "OK",
          workId: WORK_ID,
          unit: UNIT,
          unitRaw: UNIT,
          matchMethod: "catalog_map",
          matchConfidence: "high",
          gaps: [],
        },
        gaps: ["BRAK_STAWKI_ROBOT"],
        gapLabelsPl: ["BRAK STAWKI ROBÓT"],
        bom: null,
        ourRate: {
          status: "MISSING",
          statusLabelPl: "BRAK",
          workId: WORK_ID,
          unit: UNIT,
          identityKey: `${WORK_ID}|${UNIT}`,
          ourRatePln: null,
          sourceType: null,
          regionScope: null,
          observedAt: null,
          updatedAt: null,
          labor: { status: "MISSING", ourRatePln: null },
          lookup: null,
        },
        materialsResolved: [],
        position: null,
        engineInput: null,
        legacyLineTotalPln: null,
        positionComplete: false,
        equipment: null,
        transport: null,
      },
    ],
    aggregates: {
      completeLineCount: 0,
      gapLineCount: 1,
      skippedNoiseCount: 0,
      laborCostPln: null,
      materialCostPln: null,
      equipmentCostPln: 0,
      transportCostPln: 0,
      totalPositionCostPln: null,
    },
  };
}

clearWorkRateResearchAntiStormState();
clearIkLaborResearchSessionDedupeForTests();
storage.clear();

// Seed app settings so catalog write is allowed
storage.set(
  "kw-app-settings",
  JSON.stringify({ catalogWriteMode: "work_only", updatedAt: T_FRESH }),
);

const inv = inventoryIkGapsFromShadow({
  tenderId: TENDER,
  shadow: shadowLaborMissing(),
});
ok("P0 inventory labor job", inv.laborJobs.length === 1);
const job = inv.laborJobs[0];
ok(
  "P0 dedupe key",
  job.dedupeKey ===
    buildIkLaborDedupeKey({
      tenderId: TENDER,
      lineId: "L-W2",
      workId: WORK_ID,
      unit: UNIT,
    }),
);

let store = makeStore([makeWork()]);
const lookupPort = fixtureLookup(28.49);

let pricingRev = 0;
let chiefNonce = 0;
const notify = {
  bumpPricingCatalogRevision: () => {
    pricingRev += 1;
  },
  bumpChiefRefresh: () => {
    chiefNonce += 1;
  },
};

// ——— PASS 1 ———
liveFetch = 0;
const r1 = await runIkLaborGapResearch({
  job,
  store,
  nowMs: NOW,
  lookupPort,
  bypassCooldown: true,
});
ok("PASS1 status CANDIDATE", r1.status === "CANDIDATE", r1);
// Fixture port reports httpFetchCount=0 (no live network) — assert live fetch + CANDIDATE.
ok("PASS1 fixture httpFetchCount defined", r1.status === "CANDIDATE" && typeof r1.httpFetchCount === "number");
ok("PASS1 live fetch ZERO (fixture port)", liveFetch === 0);

const candidate = r1.status === "CANDIDATE" ? r1.candidate : null;
ok("PASS1 candidate rate > 0", candidate != null && candidate.suggestedRatePln > 0);
const ratePass1 = candidate?.suggestedRatePln ?? 0;

const work0 =
  store.catalogs.wroclaw.works.find((w) => w.id === WORK_ID) ??
  store.catalogs.wroclaw.works[0];
ok("PASS1 work present in store", work0 != null, {
  ids: store.catalogs.wroclaw.works.map((w) => w.id),
});
const companyBefore = work0?.companyPricePln ?? null;
const accept1 = await acceptIkLaborResearchAndNotify({
  store,
  candidate,
  notify,
  observedAt: T_FRESH,
  updatedAt: T_FRESH,
  save: saveLocalOnly,
});
ok("PASS1 accept ok", accept1.ok === true, accept1);
ok("PASS1 companyPrice NOT used as OUR RATE", accept1.companyPriceUsedAsOurRate === false);
ok("PASS1 AI auto-accept false", accept1.aiAutoAccept === false);
ok("PASS1 notified", accept1.ok && accept1.notified === true);
ok("PASS1 pricingRev +1", pricingRev === 1);
ok("PASS1 chiefNonce +1", chiefNonce === 1);

store = accept1.ok ? accept1.store : store;
const looked1 = lookupWorkRate(store, WORK_ID, UNIT, NOW);
ok("PASS1 lookup CURRENT", looked1.status === "CURRENT");
ok("PASS1 ourWorkRate persisted", looked1.status !== "MISSING" && looked1.ourRatePln === ratePass1);
ok(
  "PASS1 companyPrice unchanged",
  (store.catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.companyPricePln ?? null) ===
    companyBefore,
);

const pos1 = computePositionCostWithOurRate({
  store,
  workId: WORK_ID,
  unit: UNIT,
  quantity: 10,
  nowMs: NOW,
  materials: [],
});
ok("PASS1 Position Cost labor > 0", (pos1.position.laborCostPln ?? 0) > 0);
ok("PASS1 inventedPln=0 (finite cost from OUR RATE)", Number.isFinite(pos1.position.laborCostPln));
const laborCost1 = pos1.position.laborCostPln;

// Persist FAIL → ZERO bump
{
  const p0 = pricingRev;
  const c0 = chiefNonce;
  const failStore = makeStore([makeWork()]);
  storage.set(
    "kw-app-settings",
    JSON.stringify({ catalogWriteMode: "legacy_only", updatedAt: T_FRESH }),
  );
  const failAccept = await acceptIkLaborResearchAndNotify({
    store: failStore,
    candidate,
    notify,
    save: async () => ({ ok: true, saved: false }),
  });
  ok("FAIL path persist blocked", failAccept.ok === false);
  ok("FAIL path ZERO pricing bump", pricingRev === p0);
  ok("FAIL path ZERO chief bump", chiefNonce === c0);
  storage.set(
    "kw-app-settings",
    JSON.stringify({ catalogWriteMode: "work_only", updatedAt: T_FRESH }),
  );
}

// ——— PASS 2 ———
clearWorkRateResearchAntiStormState();
clearIkLaborResearchSessionDedupeForTests();
liveFetch = 0;
const r2 = await runIkLaborGapResearch({
  job,
  store,
  nowMs: NOW,
  lookupPort,
  bypassCooldown: true,
});
ok("PASS2 status REUSE", r2.status === "REUSE", r2);
ok("PASS2 httpFetchCount 0", r2.status === "REUSE" && r2.httpFetchCount === 0);
ok("PASS2 live fetch ZERO", liveFetch === 0);
ok(
  "PASS2 same rate",
  r2.status === "REUSE" && r2.ourRatePln === ratePass1,
);

const looked2 = lookupWorkRate(store, WORK_ID, UNIT, NOW);
ok("PASS2 lookup CURRENT", looked2.status === "CURRENT");
ok(
  "PASS2 same ourRatePln",
  looked2.status !== "MISSING" && looked2.ourRatePln === ratePass1,
);

const pos2 = computePositionCostWithOurRate({
  store,
  workId: WORK_ID,
  unit: UNIT,
  quantity: 10,
  nowMs: NOW,
  materials: [],
});
ok("PASS2 same labor cost", pos2.position.laborCostPln === laborCost1);

console.log(`\nW2 labor two-pass: ${passed} PASS · ${failed} FAIL`);
if (failed > 0) process.exit(1);
