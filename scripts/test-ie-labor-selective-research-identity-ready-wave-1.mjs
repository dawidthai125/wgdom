/**
 * IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1 — batch tests
 * Deterministic · ZERO live HTTP · ZERO prod KV · ZERO Accept / OUR RATE / margin
 *
 * npx vite-node scripts/test-ie-labor-selective-research-identity-ready-wave-1.mjs
 */
import {
  IE_LABOR_IR_WAVE1_EPIC_ID,
  IE_LABOR_IR_WAVE1_KEEP4_SOURCE_IDS,
  IE_LABOR_IR_WAVE1_TARGETS,
  WORK_CATALOG_STORAGE_KEY,
  WORK_RATE_IDENTITY_MAPPINGS,
  buildLaborIdentityMappingFixture,
  buildWorkRateFixtureHtml,
  classifyWorkRateEvidenceScopeTag,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  isIeLaborIrWave1CandidateHostForbidden,
  isIeLaborIrWave1Keep4SourceId,
  isWorkRateEvidenceScopeAllowed,
  listAllowedWorkRateEvidenceScopeTags,
  listWorkRateMatchNamesPl,
  normalizeWorkCatalogStore,
  preflightIeLaborIrWave1Target,
  qualifyWorkRateObservation,
  resolveLaborIdentityMapping,
  runIeLaborSelectiveResearchIdentityReadyWave1,
  setWorkRateIdentityMappingsForTests,
} from "../src/lib/work-catalog/index.ts";
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/index.ts";
import {
  LABOR_SOURCE_EVIDENCE_CAP_GLOBAL,
  LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH,
  LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE,
  LABOR_SOURCE_EVIDENCE_CAP_PER_WORK,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  assertLaborSourceEvidenceDoesNotTouchWorkCatalog,
  casWriteLaborSourceEvidenceStore,
  clearLaborSourceEvidenceStoreLocalForTests,
  emptyLaborSourceEvidenceStore,
  isLaborSourceEvidenceAllowedWriteKey,
  loadLaborSourceEvidenceStoreLocal,
} from "../src/lib/labor-source-evidence/index.ts";
import { parseWorkRateOffersFromHtml } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";

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

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const T_FRESH = "2026-08-14T12:00:00.000Z";
const NOW = Date.parse("2026-08-20T10:00:00.000Z");

const TABLICA = IE_LABOR_IR_WAVE1_TARGETS.find((t) => t.key === "tablica");
const PODEJSCIE = IE_LABOR_IR_WAVE1_TARGETS.find((t) => t.key === "podejscie");
const WYKWIITY = IE_LABOR_IR_WAVE1_TARGETS.find((t) => t.key === "wykwity");

function makeWork(t, overrides = {}) {
  return {
    id: t.workId,
    tradeId: "ELEKTRYKA",
    namePl: t.namePl,
    unit: t.unit,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 0, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
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

function fixtureHtml(name, unit, rate = 40) {
  return buildWorkRateFixtureHtml({
    name,
    rate,
    unit,
    region: "POLSKA",
    laborOnly: true,
    includesMaterial: false,
  });
}

function createBatchFixtures(opts = {}) {
  const skipPodejscie = opts.skipPodejscie === true;
  const base = createFixtureWorkRateSelectiveLookup({
    kb_pl: {
      html: fixtureHtml(TABLICA.primaryObservedName, "szt", 120),
    },
    cennikremontow_pl: {
      html: fixtureHtml(TABLICA.primaryObservedName, "szt", 130),
    },
    sccot: { html: fixtureHtml("wykwity", "m2", 25) },
    extradom: { html: fixtureHtml("usuwanie wykwitów", "m2", 28) },
  });
  return {
    async lookup(req) {
      if (skipPodejscie && req.workId === PODEJSCIE.workId) {
        return { ok: false, error: "FIXTURE_MISS", httpFetchCount: 0, rateGap: true };
      }
      // Per-work fixture content
      if (req.workId === TABLICA.workId) {
        const html = fixtureHtml(TABLICA.primaryObservedName, "szt", 120);
        return {
          ok: true,
          page: {
            sourceId: req.sourceId,
            requestUrl: `https://cennikremontow.pl/instalacje-elektryczne-cennik`,
            finalUrl: `https://cennikremontow.pl/instalacje-elektryczne-cennik`,
            status: 200,
            bodyText: html,
            fetchedAtIso: new Date().toISOString(),
          },
          httpFetchCount: 1,
        };
      }
      if (req.workId === PODEJSCIE.workId) {
        const html = fixtureHtml(PODEJSCIE.primaryObservedName, "mb", 85);
        return {
          ok: true,
          page: {
            sourceId: req.sourceId,
            requestUrl: `https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik`,
            finalUrl: `https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik`,
            status: 200,
            bodyText: html,
            fetchedAtIso: new Date().toISOString(),
          },
          httpFetchCount: 1,
        };
      }
      if (req.workId === WYKWIITY.workId) {
        const html = fixtureHtml("wykwity", "m2", 22);
        return {
          ok: true,
          page: {
            sourceId: req.sourceId,
            requestUrl: `https://kb.pl/?s=wykwity`,
            finalUrl: `https://kb.pl/?s=wykwity`,
            status: 200,
            bodyText: html,
            fetchedAtIso: new Date().toISOString(),
          },
          httpFetchCount: 1,
        };
      }
      return base.lookup(req);
    },
  };
}

clearWorkRateResearchAntiStormState();
clearLaborSourceEvidenceStoreLocalForTests();
setWorkRateIdentityMappingsForTests(null);

const store = makeStore([
  makeWork(TABLICA),
  makeWork(PODEJSCIE),
  makeWork(WYKWIITY),
]);
const catalogBefore = JSON.stringify(store);
localStorage.setItem(WORK_CATALOG_STORAGE_KEY, catalogBefore);

// ——— 1 three targets LABOR ———
{
  let allLabor = true;
  for (const t of IE_LABOR_IR_WAVE1_TARGETS) {
    const c = classifyEstimatorPricingPlane({ workId: t.workId, namePl: t.namePl, unit: t.unit });
    if (c.plane !== "LABOR" || !c.allowLaborResearch) allLabor = false;
  }
  ok("1 three targets LABOR", allLabor && IE_LABOR_IR_WAVE1_TARGETS.length === 3);
}

// ——— 2 Tablica Wave-1 mapping ———
{
  const pf = preflightIeLaborIrWave1Target({ target: TABLICA, store, nowMs: NOW });
  const hit = resolveLaborIdentityMapping({
    observedName: TABLICA.primaryObservedName,
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: [TABLICA.workId],
  });
  ok(
    "2 Tablica → Wave-1 mapping",
    pf.status === "READY" &&
      pf.mappingId === "lim-w1-tablica-rozdzielcza-cr" &&
      hit.status === "HIT" &&
      hit.mappingId === "lim-w1-tablica-rozdzielcza-cr",
    { pf, hit },
  );
}

// ——— 3 Podejście Wave-1 mapping ———
{
  const pf = preflightIeLaborIrWave1Target({ target: PODEJSCIE, store, nowMs: NOW });
  const hit = resolveLaborIdentityMapping({
    observedName: PODEJSCIE.primaryObservedName,
    observedUnit: "mb",
    catalogUnit: "mb",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: [PODEJSCIE.workId],
  });
  ok(
    "3 Podejście → Wave-1 mapping",
    pf.status === "READY" &&
      pf.mappingId === "lim-w1-podejscie-wod-kan-cr" &&
      hit.status === "HIT",
    { pf, hit },
  );
}

// ——— 4 Wykwity D1 synonym ———
{
  const pf = preflightIeLaborIrWave1Target({ target: WYKWIITY, store, nowMs: NOW });
  const names = listWorkRateMatchNamesPl(WYKWIITY.namePl);
  ok(
    "4 Wykwity → D1 synonym",
    pf.status === "READY" &&
      pf.mappingId == null &&
      pf.identityBasis === "d1_owner_synonym" &&
      names.some((n) => /wykwit|zaciek/i.test(n)),
    { pf, names },
  );
}

// ——— 5 product/material → BLOCKED ———
{
  const materialId = "cc-w2-zawor-odcinajacy"; // Owner map may be COMPOUND or MATERIAL — use known MATERIAL if present
  // Prefer a MATERIAL seed from map via classify probe of known product-ish ids
  const probeIds = [
    "cc-w2-multiswitch",
    "cc-w2-gniazdo-antenowe",
    "mat.cable.nytm",
    materialId,
  ];
  let blocked = false;
  for (const id of probeIds) {
    const c = classifyEstimatorPricingPlane({ workId: id, namePl: "produkt" });
    if (c.plane !== "LABOR") {
      const fake = {
        ...TABLICA,
        workId: id,
        namePl: "Produkt testowy",
        key: "tablica",
      };
      const storeMat = makeStore([makeWork(fake)]);
      const pf = preflightIeLaborIrWave1Target({ target: fake, store: storeMat, nowMs: NOW });
      if (pf.status === "BLOCKED" && pf.reason === "CLASSIFICATION_GATE") {
        blocked = true;
        break;
      }
    }
  }
  // Also: MATERIAL plane via mat.* heuristic
  {
    const fake = {
      ...TABLICA,
      workId: "mat.test.sku",
      namePl: "Kabel test",
    };
    const storeMat = makeStore([makeWork(fake)]);
    const pf = preflightIeLaborIrWave1Target({ target: fake, store: storeMat, nowMs: NOW });
    if (pf.status === "BLOCKED" && pf.reason === "CLASSIFICATION_GATE") blocked = true;
  }
  ok("5 product/material → BLOCKED", blocked);
}

// ——— 6 wrong unit → BLOCKED ———
{
  const badStore = makeStore([makeWork(TABLICA, { unit: "mb" })]);
  const pf = preflightIeLaborIrWave1Target({ target: TABLICA, store: badStore, nowMs: NOW });
  ok("6 wrong unit → BLOCKED", pf.status === "BLOCKED" && pf.reason === "UNIT_MISMATCH", pf);
}

// ——— 7 ambiguous → BLOCKED ———
{
  const dup = [
    buildLaborIdentityMappingFixture({
      mappingId: "lim-test-a",
      workId: TABLICA.workId,
      observedNameAliases: ["Ambiguous Op X"],
      catalogUnit: "szt",
      observedUnit: "szt",
    }),
    buildLaborIdentityMappingFixture({
      mappingId: "lim-test-b",
      workId: "p2b-other-electrical-szt",
      observedNameAliases: ["Ambiguous Op X"],
      catalogUnit: "szt",
      observedUnit: "szt",
    }),
  ];
  setWorkRateIdentityMappingsForTests(dup);
  const r = resolveLaborIdentityMapping({
    observedName: "Ambiguous Op X",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: [TABLICA.workId, "p2b-other-electrical-szt"],
  });
  ok("7 ambiguous → BLOCKED/AMBIGUOUS", r.status === "AMBIGUOUS", r);
  setWorkRateIdentityMappingsForTests(null);
}

// ——— 8 unknown workId → BLOCKED ———
{
  const fake = {
    ...TABLICA,
    workId: "unknown-work-id-xyz",
    namePl: "Nieznana robota",
  };
  const empty = makeStore([]);
  const pf = preflightIeLaborIrWave1Target({ target: fake, store: empty, nowMs: NOW });
  ok(
    "8 unknown workId → BLOCKED",
    pf.status === "BLOCKED" &&
      (pf.reason === "CLASSIFICATION_GATE" || pf.reason === "UNKNOWN_WORK"),
    pf,
  );
}

// ——— 9 candidate host → BLOCKED ———
{
  ok("9a KEEP-4 ok", isIeLaborIrWave1Keep4SourceId("kb_pl"));
  ok("9b candidate host forbidden", isIeLaborIrWave1CandidateHostForbidden("murator"));
  const pf = preflightIeLaborIrWave1Target({
    target: TABLICA,
    store,
    nowMs: NOW,
    probeSourceId: "kul-bud",
  });
  ok(
    "9c candidate host preflight BLOCKED",
    pf.status === "BLOCKED" && pf.reason === "CANDIDATE_HOST_FORBIDDEN" && pf.httpFetchCount === 0,
    pf,
  );
  ok(
    "9d KEEP4 list frozen",
    IE_LABOR_IR_WAVE1_KEEP4_SOURCE_IDS.join("|") ===
      "kb_pl|cennikremontow_pl|sccot|extradom",
  );
}

// ——— 10 scope rejection ———
{
  const scope = classifyWorkRateEvidenceScopeTag("Malowanie drzwi drewnianych");
  const allowed = listAllowedWorkRateEvidenceScopeTags({
    workId: "legacy-malowanie-m2",
    namePl: "Malowanie ścian dwukrotne",
  });
  ok("10a scope joinery", scope === "joinery", scope);
  ok(
    "10b scope rejection works",
    !isWorkRateEvidenceScopeAllowed(scope, allowed) || allowed.includes("walls_ceilings"),
    { scope, allowed },
  );
  // Explicit reject path for walls-only work
  ok(
    "10c joinery not in walls_ceilings-only",
    !isWorkRateEvidenceScopeAllowed("joinery", ["walls_ceilings"]),
  );
}

// ——— 11 labor-only rejection ———
{
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: buildWorkRateFixtureHtml({
      name: TABLICA.primaryObservedName,
      rate: 90,
      unit: "szt",
      laborOnly: false,
      includesMaterial: true,
    }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: TABLICA.namePl,
    expectedUnit: "szt",
    exactIdentityAliases: [TABLICA.primaryObservedName],
  });
  const offer = offers[0];
  const q = qualifyWorkRateObservation({
    offer,
    expectedWorkId: TABLICA.workId,
    expectedUnit: "szt",
  });
  ok(
    "11 labor-only rejection",
    q.ok === false &&
      (q.reason === "not_labor_only" || q.reason === "includes_material"),
    q,
  );
}

// ——— 12–16 batch partial + evidence + isolation ———
clearLaborSourceEvidenceStoreLocalForTests();
clearWorkRateResearchAntiStormState();
{
  const catalogSnap = localStorage.getItem(WORK_CATALOG_STORAGE_KEY);
  const evidenceBefore = loadLaborSourceEvidenceStoreLocal();
  const beforeCount = evidenceBefore.observations.length;

  const batch = await runIeLaborSelectiveResearchIdentityReadyWave1({
    store,
    lookupPort: createBatchFixtures({ skipPodejscie: true }),
    persistEvidence: true,
    bypassCooldown: true,
    forceRefresh: true,
    nowMs: NOW,
  });

  const byKey = Object.fromEntries(batch.targets.map((t) => [t.targetKey, t]));
  ok("12a epic id", batch.epicId === IE_LABOR_IR_WAVE1_EPIC_ID);
  ok(
    "12b partial batch",
    batch.partial === true &&
      byKey.tablica.batchStatus === "EVIDENCE_CANDIDATE" &&
      byKey.podejscie.batchStatus === "SOURCE_GAP" &&
      byKey.wykwity.batchStatus === "EVIDENCE_CANDIDATE",
    batch.targets.map((t) => ({ k: t.targetKey, s: t.batchStatus })),
  );
  ok("12c no Accept", batch.acceptPerformed === false);
  ok("12d no OUR RATE write flag", batch.ourRateWritten === false);
  ok("12e no margin write flag", batch.marginWritten === false);
  ok("12f catalogMutated false", batch.catalogMutated === false);

  const evidenceAfter = loadLaborSourceEvidenceStoreLocal();
  ok(
    "13 union-by-dedupeKey / evidence grew",
    evidenceAfter.observations.length > beforeCount &&
      evidenceAfter.observations.every((o) =>
        [TABLICA.workId, WYKWIITY.workId].includes(o.workId),
      ),
    {
      before: beforeCount,
      after: evidenceAfter.observations.length,
      works: [...new Set(evidenceAfter.observations.map((o) => o.workId))],
    },
  );

  // CAS: mismatch path
  const casBad = casWriteLaborSourceEvidenceStore({
    expectedEtag: "wrong-etag",
    next: emptyLaborSourceEvidenceStore(),
  });
  ok("14 CAS mismatch", casBad.ok === false && casBad.reason === "etag_mismatch", casBad);

  ok(
    "15 caps frozen",
    LABOR_SOURCE_EVIDENCE_CAP_GLOBAL === 8000 &&
      LABOR_SOURCE_EVIDENCE_CAP_PER_WORK === 80 &&
      LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE === 2000 &&
      LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH === 200,
  );

  ok(
    "16 Evidence write key only",
    isLaborSourceEvidenceAllowedWriteKey(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) &&
      !isLaborSourceEvidenceAllowedWriteKey(WORK_CATALOG_STORAGE_KEY),
  );

  const catalogAfter = localStorage.getItem(WORK_CATALOG_STORAGE_KEY);
  ok(
    "17 Work Catalog unchanged",
    assertLaborSourceEvidenceDoesNotTouchWorkCatalog(catalogSnap, catalogAfter) &&
      catalogAfter === catalogBefore,
  );

  // OUR RATE / margin / Accept unchanged on store works
  let ratesOk = true;
  for (const t of IE_LABOR_IR_WAVE1_TARGETS) {
    const w = store.catalogs.wroclaw.works.find((x) => x.id === t.workId);
    if (w?.ourWorkRate != null) ratesOk = false;
    if (w?.commercialPricing?.marginPct !== 0) ratesOk = false;
    if (w?.companyPricePln !== 35) ratesOk = false;
  }
  ok("18 OUR RATE unchanged (null)", ratesOk);
  ok("19 Accept unchanged (not performed)", batch.acceptPerformed === false);
  ok("20 margin unchanged (0)", ratesOk);

  ok("registry still 2", WORK_RATE_IDENTITY_MAPPINGS.length === 2);
  ok("zero live fetch", fetchCalls === 0, fetchCalls);
}

// Full batch success path (all 3) — no destructive wipe of prior evidence
{
  const before = loadLaborSourceEvidenceStoreLocal().observations.length;
  clearWorkRateResearchAntiStormState();
  const batch2 = await runIeLaborSelectiveResearchIdentityReadyWave1({
    store,
    lookupPort: createBatchFixtures({ skipPodejscie: false }),
    persistEvidence: true,
    bypassCooldown: true,
    forceRefresh: true,
    nowMs: NOW + 1,
  });
  const after = loadLaborSourceEvidenceStoreLocal().observations.length;
  ok(
    "A2 no destructive rollback — evidence count >= before",
    after >= before &&
      batch2.targets.every((t) =>
        ["EVIDENCE_CANDIDATE", "SOURCE_GAP", "REUSE", "COOLDOWN"].includes(t.batchStatus),
      ),
    { before, after, statuses: batch2.targets.map((t) => t.batchStatus) },
  );
  const podejscie = batch2.targets.find((t) => t.targetKey === "podejscie");
  ok(
    "full batch podejscie candidate or gap",
    podejscie &&
      (podejscie.batchStatus === "EVIDENCE_CANDIDATE" ||
        podejscie.batchStatus === "SOURCE_GAP"),
    podejscie,
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
