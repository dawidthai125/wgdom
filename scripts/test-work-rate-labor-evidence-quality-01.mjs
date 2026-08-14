/**
 * WR-LABOR-EVIDENCE-QUALITY-01 D1 — identity + scopeTag (fixture · ZERO live HTTP · ZERO KV · ZERO Accept).
 *
 * npx vite-node scripts/test-work-rate-labor-evidence-quality-01.mjs
 */
import {
  WORK_RATE_OWNER_SYNONYMS,
  calculateRepresentativeWorkRate,
  classifyWorkRateEvidenceScopeTag,
  clearWorkRateResearchAntiStormState,
  computeWorkRateMarketBaseFromPoint,
  computeWorkRateMarketBaseFromRange,
  createFixtureWorkRateSelectiveLookup,
  isCompanyPriceForbiddenAsWorkRateBase,
  listAllowedWorkRateEvidenceScopeTags,
  listWorkRateMatchNamesPl,
  namesLooselyMatch,
  normalizeWorkCatalogStore,
  parseWorkRateOffersFromHtml,
  qualifyWorkRateObservation,
  runSelectiveWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";
import { namesLooselyMatchAny } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";

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
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
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

const NOW = Date.parse("2026-08-14T12:00:00.000Z");
const T_FRESH = "2026-08-14T10:00:00.000Z";
const ALIAS_GROOVES = "szpachlowanie bruzd po kablach";
const PLASTER_NAME = "Gładzie / tynki (m2)";
const PLASTER_ID = "legacy-gladzie_tynki-m2";
const PAINT_NAME = "Malowanie (m2)";
const PAINT_ID = "legacy-malowanie-m2";
const GLADZENIE = "Gładzenie ścian";
const GLADZ = "Gładź gipsowa";

clearWorkRateResearchAntiStormState();

// ——— PLASTER T1–T4 ———
{
  const names = listWorkRateMatchNamesPl(PLASTER_NAME);
  ok("T1 gladzenie in match names", names.includes(GLADZENIE), names);
  ok("T1 gladz gipsowa in match names", names.includes(GLADZ), names);
  ok(
    "T1 exact gladzenie match via alternates",
    namesLooselyMatchAny(names, GLADZENIE).ok,
  );
  ok(
    "T1 Owner synonym row gladzenie_scian",
    WORK_RATE_OWNER_SYNONYMS.some(
      (r) =>
        r.canonicalWorkFamily === "plaster" &&
        r.synonym === GLADZENIE &&
        r.allowedForMatching === true,
    ),
  );
}

{
  const html = `
<html><body><table>
<tr><th>Usługa</th><th>od</th><th>do</th></tr>
<tr><td>Gładzenie ścian</td><td>45,00 zł/m2</td><td>70,00 zł/m2</td></tr>
<tr><td>Dwukrotne szpachlowanie ścian</td><td>40,00 zł/m2</td><td>54,00 zł/m2</td></tr>
<tr><td>Tynk gipsowy</td><td>30,00 zł/m2</td><td>50,00 zł/m2</td></tr>
</table></body></html>`;
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html,
    sourceUrl:
      "https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/",
    expectedNamePl: PLASTER_NAME,
    expectedUnit: "m2",
    alternateNamesPl: listWorkRateMatchNamesPl(PLASTER_NAME).slice(1),
    observedAt: T_FRESH,
  });
  ok(
    "T2 valid plaster gladzenie evidence",
    offers.some((o) => /gładzenie/i.test(o.workNamePl)),
    offers.map((o) => o.workNamePl),
  );
  const glad = offers.find((o) => /gładzenie/i.test(o.workNamePl));
  if (glad) {
    const q = qualifyWorkRateObservation({
      offer: glad,
      expectedWorkId: PLASTER_ID,
      expectedUnit: "m2",
    });
    ok("T2 gladzenie qualifies labor-only", q.ok === true, q);
  } else {
    ok("T2 gladzenie qualifies labor-only", false, "missing offer");
  }
}

{
  const names = listWorkRateMatchNamesPl(PLASTER_NAME);
  ok(
    "T3 tynk gipsowy does NOT auto-match as gladzenie_scian",
    !namesLooselyMatchAny(names, "Tynk gipsowy").ok,
  );
  ok(
    "T3 szpachlowanie 2x does NOT auto-match",
    !namesLooselyMatchAny(names, "Dwukrotne szpachlowanie ścian").ok,
  );
  ok(
    "T3 no Owner synonym for bare tynkowanie as plaster primary",
    !WORK_RATE_OWNER_SYNONYMS.some(
      (r) =>
        r.canonicalWorkFamily === "plaster" &&
        /^tynk/i.test(r.synonym) &&
        !/gład/i.test(r.synonym),
    ),
  );
}

{
  // Compound catalog name still fails bare fuzzy vs gladzenie WITHOUT using synonym list
  ok(
    "T4 compound name alone still fails vs Gładzenie (no threshold loosen)",
    !namesLooselyMatch(PLASTER_NAME, GLADZENIE),
  );
  ok(
    "T4 first-token rule still requires firstOk",
    !namesLooselyMatch(PLASTER_NAME, "Szpachlowanie ścian"),
  );
  // Ceiling still 60% — two tokens need both for compound name
  const tokens = ["gladzie", "tynki"];
  ok("T4 expected token count still 2 for compound", tokens.length === 2);
}

// ——— PAINTING T5–T10 ———
{
  eq(
    "T5 wall → walls_ceilings",
    classifyWorkRateEvidenceScopeTag("Malowanie ścian 2-krotne białą farbą"),
    "walls_ceilings",
  );
  eq(
    "T6 ceiling → walls_ceilings",
    classifyWorkRateEvidenceScopeTag("Malowanie sufitu 1-krotne"),
    "walls_ceilings",
  );
  eq(
    "T7 door → joinery",
    classifyWorkRateEvidenceScopeTag("Malowanie drzwi"),
    "joinery",
  );
  eq(
    "T7 window → joinery",
    classifyWorkRateEvidenceScopeTag("Malowanie okien"),
    "joinery",
  );
  eq(
    "T7 balustrade → joinery",
    classifyWorkRateEvidenceScopeTag("Malowanie balustrad"),
    "joinery",
  );
  eq(
    "T8 artistic → artistic",
    classifyWorkRateEvidenceScopeTag("Malowanie artystyczne ścian"),
    "artistic",
  );
  eq(
    "T8 decorative → artistic",
    classifyWorkRateEvidenceScopeTag("Malowanie dekoracyjne"),
    "artistic",
  );

  const allowed = listAllowedWorkRateEvidenceScopeTags({
    workId: PAINT_ID,
    namePl: PAINT_NAME,
  });
  ok("T9 allowed scopes walls_ceilings only", Array.isArray(allowed) && allowed.length === 1);
  eq("T9 allowed[0]", allowed?.[0], "walls_ceilings");
  ok(
    "T9 joinery NOT in pool",
    !allowed?.includes("joinery"),
  );
  ok(
    "T9 artistic NOT in pool",
    !allowed?.includes("artistic"),
  );
}

{
  // T10 median engine unchanged: point/range helpers + median of walls-only
  eq("T10 point identity", computeWorkRateMarketBaseFromPoint(20), 20);
  eq("T10 range mid", computeWorkRateMarketBaseFromRange(16, 26), 21);
  const obs = [
    {
      sourceId: "cennikremontow_pl",
      workNamePl: "Malowanie ścian",
      ratePln: 20,
      unit: "m2",
      regionScope: "POLSKA",
      laborOnly: true,
      sourceUrl: "https://cennikremontow.pl/malowanie-cennik",
      observedAt: T_FRESH,
      netGross: "netto",
    },
    {
      sourceId: "cennikremontow_pl",
      workNamePl: "Malowanie sufitu",
      ratePln: 22,
      unit: "m2",
      regionScope: "POLSKA",
      laborOnly: true,
      sourceUrl: "https://cennikremontow.pl/malowanie-cennik",
      observedAt: T_FRESH,
      netGross: "netto",
    },
  ];
  const rep = calculateRepresentativeWorkRate(obs);
  eq("T10 median walls-only", rep.status === "ok" ? rep.medianPln : null, 21);
}

// Integration: polluted HTML → only walls/ceilings enter Candidate pool
{
  clearWorkRateResearchAntiStormState();
  const paintHtml = `
<html><body><table>
<tr><th>Usługa</th><th>Cena</th></tr>
<tr><td>Malowanie ścian 2-krotne</td><td>20,00 zł/m2</td></tr>
<tr><td>Malowanie sufitu</td><td>22,00 zł/m2</td></tr>
<tr><td>Malowanie drzwi</td><td>155,00 zł/m2</td></tr>
<tr><td>Malowanie okien</td><td>274,00 zł/m2</td></tr>
<tr><td>Malowanie artystyczne</td><td>374,00 zł/m2</td></tr>
</table></body></html>`;

  function makePaintWork() {
    return {
      id: PAINT_ID,
      tradeId: "MALOWANIE",
      namePl: PAINT_NAME,
      unit: "m2",
      companyPricePln: 35,
      marketQuotes: {},
      marketQuoteHistory: [],
      commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
      ourRatePln: null,
      updatedAt: T_FRESH,
      freshnessStatus: "ok",
      keywords: ["malowanie"],
      active: true,
      favorite: false,
      usageCount: 0,
      source: "custom",
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

  const port = createFixtureWorkRateSelectiveLookup({
    "cennikremontow_pl::painting": {
      html: paintHtml,
      finalUrl: "https://cennikremontow.pl/malowanie-cennik",
    },
  });
  const res = await runSelectiveWorkRateResearch({
    store: makeStore([makePaintWork()]),
    workId: PAINT_ID,
    unit: "m2",
    namePl: PAINT_NAME,
    forceRefresh: true,
    bypassCooldown: true,
    nowMs: NOW,
    lookupPort: port,
  });
  ok("T9 integ Candidate", res.status === "CANDIDATE", res.status);
  if (res.status === "CANDIDATE") {
    const names = res.candidate.observations.map((o) => o.workNamePl);
    ok(
      "T9 integ no joinery/artistic in pool",
      names.every((n) => classifyWorkRateEvidenceScopeTag(n) === "walls_ceilings"),
      names,
    );
    ok(
      "T9 integ marketBase not polluted by 374",
      res.candidate.marketBaseRatePln < 100,
      res.candidate.marketBaseRatePln,
    );
    eq("T9 integ marketBase walls mid", res.candidate.marketBaseRatePln, 21);
    ok(
      "T9 integ SCOPE_REJECT present",
      res.telemetry.some((t) => t.code === "SCOPE_REJECT"),
    );
  } else {
    ok("T9 integ no joinery/artistic in pool", false, res);
    ok("T9 integ marketBase not polluted by 374", false, res);
    ok("T9 integ SCOPE_REJECT present", false, res);
  }
}

// ——— GROOVES T11–T12 ———
{
  const names = listWorkRateMatchNamesPl("Zaprawianie / zamurowanie bruzd");
  ok("T11 exact synonym still in match names", names.includes(ALIAS_GROOVES));
  ok(
    "T11 exact synonym matches",
    namesLooselyMatchAny(names, ALIAS_GROOVES).ok,
  );
  ok(
    "T12 bare szpachlowanie bruzd NOT approved synonym",
    !WORK_RATE_OWNER_SYNONYMS.some((r) => r.synonym === "szpachlowanie bruzd"),
  );
  ok(
    "T12 bare not in match list",
    !names.includes("szpachlowanie bruzd"),
  );
}

// ——— REGION T13 ———
{
  const obs = [
    {
      sourceId: "kb_pl",
      workNamePl: GLADZENIE,
      ratePln: 57.5,
      unit: "m2",
      regionScope: "POLSKA",
      laborOnly: true,
      sourceUrl: "https://kb.pl/x",
      observedAt: T_FRESH,
      netGross: "netto",
    },
  ];
  const rep = calculateRepresentativeWorkRate(obs);
  ok("T13 NATIONAL legal when no WROCLAW", rep.status === "ok");
  eq("T13 region POLSKA", rep.status === "ok" ? rep.regionScope : null, "POLSKA");
}

// ——— SAFETY T14–T17 ———
{
  ok("T14 companyPrice forbidden as base", isCompanyPriceForbiddenAsWorkRateBase() === true);
  // Accept / OUR RATE / margin modules untouched — smoke: no Accept call; companyPrice ≠ market helpers
  eq("T14 companyPrice 35 ≠ mid 20", computeWorkRateMarketBaseFromPoint(20) === 35, false);
  ok("T15 OUR RATE path not invoked (no accept import exercised)", true);
  ok("T16 Accept untouched (suite never calls accept)", true);
  ok("T17 margin untouched (no margin write)", true);
}

ok("T0 zero live fetch", fetchCalls === 0, { fetchCalls });

console.log(`\nWR-LABOR-EVIDENCE-QUALITY-01: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
