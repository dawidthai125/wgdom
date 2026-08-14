/**
 * IE-LABOR IR Wave-1 — PASS2 / CR DISCOVERY AMENDMENT (Owner A1/A2)
 * Deterministic · ZERO live HTTP · ZERO prod KV · ZERO Accept / OUR RATE / margin
 *
 * npx vite-node scripts/test-ie-labor-pass2-cr-discovery-amendment.mjs
 */
import {
  IE_LABOR_IR_WAVE1_TARGETS,
  WORK_RATE_IDENTITY_MAPPINGS,
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE,
  WORK_RATE_CANONICAL_CENNIK_URL,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  isIeLaborIrWave1CandidateHostForbidden,
  isWorkRateSelectiveUrlAllowed,
  listExactIdentityAliasesForWork,
  listWorkRatePass2CategoryKeysForWork,
  normalizeWorkCatalogStore,
  resolveLaborIdentityMapping,
  resolveWorkRatePass1CanonicalUrl,
  resolveWorkRatePass2Url,
  resolveWorkRateSelectiveLookupRequest,
  resolveWorkRateWorkFamily,
  runSelectiveWorkRateResearch,
  setWorkRateIdentityMappingsForTests,
} from "../src/lib/work-catalog/index.ts";
import { buildWorkRateFixtureHtml } from "../src/lib/work-catalog/index.ts";

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

const TABLICA = IE_LABOR_IR_WAVE1_TARGETS.find((t) => t.key === "tablica");
const PODEJSCIE = IE_LABOR_IR_WAVE1_TARGETS.find((t) => t.key === "podejscie");
const WYKWIITY = IE_LABOR_IR_WAVE1_TARGETS.find((t) => t.key === "wykwity");
const ELEC_URL = "https://cennikremontow.pl/instalacje-elektryczne-cennik";
const PLUMB_URL =
  "https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik";
const T_FRESH = "2026-08-14T12:00:00.000Z";
const NOW = Date.parse("2026-08-20T10:00:00.000Z");

setWorkRateIdentityMappingsForTests(null);
clearWorkRateResearchAntiStormState();

// ——— 1 Tablica → CR electrical discovery HIT ———
{
  const family = resolveWorkRateWorkFamily({
    workId: TABLICA.workId,
    namePl: TABLICA.namePl,
  });
  const keys = listWorkRatePass2CategoryKeysForWork({
    workId: TABLICA.workId,
    namePl: TABLICA.namePl,
    sourceId: "cennikremontow_pl",
  });
  ok("1a tablica family electrical", family === "electrical", family);
  ok("1b tablica CR electrical key", keys.includes("electrical"), keys);
  ok(
    "1c resolve electrical URL",
    resolveWorkRatePass2Url("cennikremontow_pl", "electrical") === ELEC_URL,
  );
  const lookup = resolveWorkRateSelectiveLookupRequest({
    sourceId: "cennikremontow_pl",
    query: TABLICA.namePl,
    categoryKey: "electrical",
  });
  ok(
    "1d selective lookup electrical",
    lookup.ok === true &&
      lookup.discoveryMethod === "PASS2_CATEGORY" &&
      lookup.url === ELEC_URL,
    lookup,
  );
}

// ——— 2 Podejście → CR plumbing discovery HIT ———
{
  const family = resolveWorkRateWorkFamily({
    workId: PODEJSCIE.workId,
    namePl: PODEJSCIE.namePl,
  });
  const keys = listWorkRatePass2CategoryKeysForWork({
    workId: PODEJSCIE.workId,
    namePl: PODEJSCIE.namePl,
    sourceId: "cennikremontow_pl",
  });
  ok("2a podejscie family plumbing", family === "plumbing", family);
  ok("2b podejscie CR plumbing key", keys.includes("plumbing"), keys);
  ok(
    "2c resolve plumbing URL",
    resolveWorkRatePass2Url("cennikremontow_pl", "plumbing") === PLUMB_URL,
  );
}

// ——— 3 existing identity mappings preserved ———
{
  const a = resolveLaborIdentityMapping({
    observedName: "Montaż skrzynki rozdzielczej",
    observedUnit: "szt",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
  });
  const b = resolveLaborIdentityMapping({
    observedName:
      "Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź",
    observedUnit: "mb",
    catalogUnit: "mb",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
  });
  ok(
    "3a tablica mapping HIT",
    a.status === "HIT" &&
      a.mappingId === "lim-w1-tablica-rozdzielcza-cr" &&
      a.workId === TABLICA.workId,
    a,
  );
  ok(
    "3b podejscie mapping HIT",
    b.status === "HIT" &&
      b.mappingId === "lim-w1-podejscie-wod-kan-cr" &&
      b.workId === PODEJSCIE.workId,
    b,
  );
  ok("3c registry count 2", WORK_RATE_IDENTITY_MAPPINGS.length === 2);
}

// ——— 4 unit guard ———
{
  const wrong = resolveLaborIdentityMapping({
    observedName: "Montaż skrzynki rozdzielczej",
    observedUnit: "mb",
    catalogUnit: "szt",
    sourceId: "cennikremontow_pl",
    laborOnly: true,
    includesMaterial: false,
  });
  ok("4 unit guard blocks wrong unit", wrong.status !== "HIT", wrong);
}

// ——— 5 candidate hosts BLOCKED ———
{
  for (const h of [
    "kul-bud",
    "budowalka",
    "murator",
    "ogarnijremont",
    "zleca",
    "cennikibudowlane",
  ]) {
    ok(`5 candidate blocked ${h}`, isIeLaborIrWave1CandidateHostForbidden(h));
  }
  ok(
    "5 evil URL not selective-allowed",
    !isWorkRateSelectiveUrlAllowed("https://kul-bud.pl/cennik"),
  );
}

// ——— 6 Wykwity SOURCE GAP path (no repairs PASS2) ———
{
  const family = resolveWorkRateWorkFamily({
    workId: WYKWIITY.workId,
    namePl: WYKWIITY.namePl,
  });
  const keysCr = listWorkRatePass2CategoryKeysForWork({
    workId: WYKWIITY.workId,
    namePl: WYKWIITY.namePl,
    sourceId: "cennikremontow_pl",
  });
  const keysKb = listWorkRatePass2CategoryKeysForWork({
    workId: WYKWIITY.workId,
    namePl: WYKWIITY.namePl,
    sourceId: "kb_pl",
  });
  ok("6a wykwity family repairs", family === "repairs");
  ok("6b wykwity CR PASS2 empty", keysCr.length === 0, keysCr);
  ok("6c wykwity KB PASS2 empty", keysKb.length === 0, keysKb);
  ok(
    "6d repairs not allowlisted",
    resolveWorkRatePass2Url("cennikremontow_pl", "repairs") == null &&
      resolveWorkRatePass2Url("kb_pl", "repairs") == null,
  );
}

// ——— 7–8 no invented alias / mapping ———
{
  const aliases = listExactIdentityAliasesForWork({
    workId: TABLICA.workId,
    catalogUnit: "szt",
  });
  ok(
    "7 tablica aliases only existing",
    aliases.length === 1 && aliases[0] === "Montaż skrzynki rozdzielczej",
    aliases,
  );
  const ids = WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.mappingId).sort();
  ok(
    "8 mapping ids frozen",
    ids[0] === "lim-w1-podejscie-wod-kan-cr" &&
      ids[1] === "lim-w1-tablica-rozdzielcza-cr",
    ids,
  );
}

// ——— 9–12 / 13 research fixture: PASS2 electrical used · no Accept/OUR RATE/margin/catalog ———
{
  const works = [TABLICA, PODEJSCIE, WYKWIITY].map((t) => ({
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
  }));
  const store = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });

  const requested = [];
  const port = createFixtureWorkRateSelectiveLookup({
    cennikremontow_pl: {
      html: buildWorkRateFixtureHtml({
        name: "Unrelated PASS1 row",
        rate: 10,
        unit: "szt",
        region: "POLSKA",
        laborOnly: true,
        includesMaterial: false,
        identity: false,
      }),
    },
    "cennikremontow_pl::electrical": {
      html: buildWorkRateFixtureHtml({
        name: TABLICA.primaryObservedName,
        rate: 150,
        unit: "szt",
        region: "POLSKA",
        laborOnly: true,
        includesMaterial: false,
        identity: true,
      }),
      requestUrl: ELEC_URL,
      finalUrl: ELEC_URL,
    },
    kb_pl: {
      html: buildWorkRateFixtureHtml({
        name: "Other KB row",
        rate: 1,
        unit: "szt",
        region: "WROCLAW",
        laborOnly: true,
        includesMaterial: false,
        identity: false,
      }),
    },
    sccot: {
      html: buildWorkRateFixtureHtml({
        name: "SCCOT unrelated",
        rate: 2,
        unit: "szt",
        identity: false,
      }),
    },
    extradom: {
      html: buildWorkRateFixtureHtml({
        name: "Extradom unrelated",
        rate: 3,
        unit: "szt",
        identity: false,
      }),
    },
  });
  const wrapped = {
    async lookup(req) {
      requested.push({
        sourceId: req.sourceId,
        categoryKey: req.categoryKey ?? null,
        workId: req.workId,
      });
      return port.lookup(req);
    },
  };

  clearWorkRateResearchAntiStormState();
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: TABLICA.workId,
    unit: "szt",
    namePl: TABLICA.namePl,
    lookupPort: wrapped,
    bypassCooldown: true,
    forceRefresh: true,
    nowMs: NOW,
  });

  ok(
    "9 no catalog mutate in research status path",
    store.catalogs.wroclaw.works.find((w) => w.id === TABLICA.workId)
      ?.companyPricePln === 35,
  );
  ok(
    "10 research is CANDIDATE or GAP (not Accept)",
    res.status === "CANDIDATE" || res.status === "GAP",
    res.status,
  );
  ok(
    "11 OUR RATE still null on work",
    store.catalogs.wroclaw.works.find((w) => w.id === TABLICA.workId)
      ?.ourWorkRate == null,
  );
  ok(
    "12 margin still 0",
    store.catalogs.wroclaw.works.find((w) => w.id === TABLICA.workId)
      ?.commercialPricing?.marginPct === 0,
  );
  ok(
    "13a CR electrical category requested",
    requested.some(
      (r) =>
        r.sourceId === "cennikremontow_pl" && r.categoryKey === "electrical",
    ),
    requested,
  );
  ok(
    "13b PASS1 CR still requested (null category)",
    requested.some(
      (r) =>
        r.sourceId === "cennikremontow_pl" &&
        (r.categoryKey == null || r.categoryKey === "default"),
    ),
    requested,
  );
  if (res.status === "CANDIDATE") {
    const obs = res.candidate.observations || [];
    ok(
      "13c candidate from CR labor-only (electrical page fixture)",
      obs.length > 0 &&
        obs.every((o) => o.sourceId === "cennikremontow_pl" && o.laborOnly === true) &&
        Number(res.candidate.marketBaseRatePln) === 150,
      {
        sampleSize: res.candidate.sampleSize,
        marketBaseRatePln: res.candidate.marketBaseRatePln,
        sources: obs.map((o) => o.sourceId),
        urls: obs.map((o) => o.sourceUrl),
      },
    );
  } else {
    ok(
      "13c GAP with electrical discovery still requested (qualify/source soft-fail)",
      requested.some(
        (r) =>
          r.sourceId === "cennikremontow_pl" && r.categoryKey === "electrical",
      ),
    );
  }
}

// ——— 14 PASS1 still works ———
{
  for (const sid of ["kb_pl", "cennikremontow_pl", "sccot", "extradom"]) {
    const u = resolveWorkRatePass1CanonicalUrl(sid);
    ok(`14 PASS1 ${sid}`, Boolean(u) && u === WORK_RATE_CANONICAL_CENNIK_URL[sid]);
  }
}

// ——— 15 PASS2 stays KEEP-4 · MAX unchanged · no foreign hosts ———
{
  eqMax();
  function eqMax() {
    ok("15a MAX still 2", WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE === 2);
  }
  for (const e of WORK_RATE_PASS2_CATEGORY_ALLOWLIST) {
    const host = new URL(e.url).hostname.replace(/^www\./, "");
    ok(
      `15b allowlist host KEEP-4 ${e.categoryKey}`,
      ["kb.pl", "cennikremontow.pl", "sccot.pl", "extradom.pl"].includes(host),
    );
  }
  ok(
    "15c no repairs entry",
    !WORK_RATE_PASS2_CATEGORY_ALLOWLIST.some((e) => e.categoryKey === "repairs"),
  );
  const tablicaWorkKeys = listWorkRatePass2CategoryKeysForWork({
    workId: TABLICA.workId,
    namePl: TABLICA.namePl,
    sourceId: "cennikremontow_pl",
  });
  ok(
    "15d tablica work keys <= MAX",
    tablicaWorkKeys.length <= WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE,
  );
}

ok("zero live fetch", fetchCalls === 0, fetchCalls);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
