/**
 * IK-OWNER-A01-LP5-QUOTES OPS — local idempotency + alias gate tests (no KV).
 *
 * npx vite-node scripts/test-catalog-ik-owner-a01-lp5-quotes-ops.mjs
 */
import { resolveCatalogCoverageAlias } from "../src/lib/catalog-coverage/alias-resolver.ts";
import { IK_OWNER_CREATE_A01_LP4_WORK_ID } from "../src/lib/work-catalog/ik-owner-create-a01-lp4-catalog.ts";
import { applyA01Lp4CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp4-ops.ts";
import {
  IK_OWNER_CREATE_A01_LP5_ALIAS_LP10,
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
} from "../src/lib/work-catalog/ik-owner-create-a01-lp5-catalog.ts";
import { applyA01Lp5CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts";
import {
  IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN,
  applyA01Lp5QuotesSeed,
  assertA01Lp5WorkPresentForQuotesOrStop,
  buildIkOwnerA01Lp5QuotesCsv,
  previewIkOwnerA01Lp5QuotesImport,
  probeA01Lp5QuotesPerRegion,
  probeA01Lp5QuotesRegion,
  syncA01Lp5QuotesWroclawToDolnySlask,
  workHasA01Lp5UsefulQuotes,
  workHasExpectedA01Lp5Quotes,
} from "../src/lib/work-catalog/ik-owner-create-a01-lp5-quotes-ops.ts";
import {
  getWorkByIdFromStore,
  listActiveWorksForRegion,
} from "../src/lib/work-catalog/catalog-work-utils.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";

const NOW = "2026-08-24T18:00:00.000Z";
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

function emptyStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    updatedAt: NOW,
    catalogs: {
      wroclaw: { works: [], updatedAt: NOW },
      dolnyslask: { works: [], updatedAt: NOW },
    },
  });
}

function freshStoreWithLp5Work() {
  return applyA01Lp5CatalogSeed(emptyStore(), NOW).store;
}

function freshStoreWithLp5AndLp9Work() {
  let store = applyA01Lp5CatalogSeed(emptyStore(), NOW).store;
  store = applyA01Lp4CatalogSeed(store, NOW).store;
  return store;
}

// T1 — target exists
{
  const store = freshStoreWithLp5Work();
  let threw = false;
  try {
    assertA01Lp5WorkPresentForQuotesOrStop(store);
    threw = false;
  } catch {
    threw = true;
  }
  ok("T1 target exists both regions", !threw);
  ok(
    "T1 work id exact",
    getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "wroclaw")?.id ===
      IK_OWNER_CREATE_A01_LP5_WORK_ID,
  );
}

// T2 — wrong workId rejected (CSV hardcoded — preview only matches LP5)
{
  const store = freshStoreWithLp5Work();
  const csv = buildIkOwnerA01Lp5QuotesCsv(NOW, store);
  ok("T2 csv only LP5 workId", csv.includes(IK_OWNER_CREATE_A01_LP5_WORK_ID));
  ok("T2 csv not LP4", !csv.includes(IK_OWNER_CREATE_A01_LP4_WORK_ID));
}

// T3 — companyPricePln != 22 rejected
{
  const store = freshStoreWithLp5Work();
  const w = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "wroclaw");
  const bad = {
    ...store,
    catalogs: {
      ...store.catalogs,
      wroclaw: {
        ...store.catalogs.wroclaw,
        works: store.catalogs.wroclaw.works.map((x) =>
          x.id === IK_OWNER_CREATE_A01_LP5_WORK_ID ? { ...x, companyPricePln: 21 } : x,
        ),
      },
    },
  };
  let threw = false;
  try {
    assertA01Lp5WorkPresentForQuotesOrStop(bad);
  } catch (e) {
    threw = e.message.includes("WRONG_COMPANY_PRICE");
  }
  ok("T3 wrong price rejected", threw);
  ok("T3 baseline price 22", w?.companyPricePln === IK_OWNER_A01_LP5_QUOTES_EXPECTED_PRICE_PLN);
}

// T4 — CSV preview 1/1
{
  const store = freshStoreWithLp5Work();
  const preview = previewIkOwnerA01Lp5QuotesImport(NOW, store);
  ok("T4 preview matched 1", preview.summary.matched === 1);
  ok(
    "T4 preview target",
    preview.matched.length === 1 && preview.matched[0].workId === IK_OWNER_CREATE_A01_LP5_WORK_ID,
  );
  ok("T4 preview price 22", preview.matched[0].price === 22);
}

// T5 — dry-run apply changes store locally (no KV)
{
  const store = freshStoreWithLp5Work();
  ok("T5 before missing", probeA01Lp5QuotesRegion(store, "wroclaw") === "MISSING_QUOTES");
  const r = applyA01Lp5QuotesSeed(store, NOW);
  ok("T5 changed", r.changed === true);
  ok("T5 worksTouched 1", r.applyReport?.worksTouched === 1);
}

// T6 — quote wroclaw
{
  const r = applyA01Lp5QuotesSeed(freshStoreWithLp5Work(), NOW);
  const w = getWorkByIdFromStore(r.store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "wroclaw");
  ok("T6 useful quotes", workHasA01Lp5UsefulQuotes(w));
  ok("T6 expected cell", workHasExpectedA01Lp5Quotes(w));
  const cell = w?.marketQuotes?.wgdom?.wroclaw;
  ok("T6 price 22", cell?.price === 22);
  ok("T6 confidence 0.92", cell?.confidence === 0.92);
}

// T7 — mirror dolnyslask
{
  const r = applyA01Lp5QuotesSeed(freshStoreWithLp5Work(), NOW);
  const ds = getWorkByIdFromStore(r.store, IK_OWNER_CREATE_A01_LP5_WORK_ID, "dolnyslask");
  ok("T7 ds PRESENT_OK", probeA01Lp5QuotesRegion(r.store, "dolnyslask") === "PRESENT_OK");
  ok("T7 ds expected quotes", workHasExpectedA01Lp5Quotes(ds));
}

// T8 — idempotency
{
  const r1 = applyA01Lp5QuotesSeed(freshStoreWithLp5Work(), NOW);
  const r2 = applyA01Lp5QuotesSeed(r1.store, NOW);
  ok("T8 idempotent no second change", r2.changed === false);
  ok("T8 both PRESENT_OK", r2.perRegion.wroclaw === "PRESENT_OK");
}

// T9 — only target touched
{
  const otherId = "cc-other-work-unchanged";
  const base = freshStoreWithLp5Work();
  for (const region of ["wroclaw", "dolnyslask"]) {
    base.catalogs[region].works.push({
      id: otherId,
      tradeId: "INNE",
      namePl: "Other",
      unit: "szt",
      companyPricePln: 99,
      updatedAt: NOW,
      freshnessStatus: "ok",
      active: true,
      favorite: false,
      usageCount: 0,
      source: "custom",
      keywords: [],
    });
  }
  const r = applyA01Lp5QuotesSeed(base, NOW);
  ok("T9 worksTouched 1", r.applyReport?.worksTouched === 1);
  for (const region of ["wroclaw", "dolnyslask"]) {
    const other = getWorkByIdFromStore(r.store, otherId, region);
    ok(`T9 ${region} other untouched`, !other?.marketQuotes);
  }
}

// T10 — LP9 untouched
{
  const store = freshStoreWithLp5AndLp9Work();
  const lp9Before = getWorkByIdFromStore(store, IK_OWNER_CREATE_A01_LP4_WORK_ID, "wroclaw");
  const lp9QuotesBefore = JSON.stringify(lp9Before?.marketQuotes ?? null);
  const r = applyA01Lp5QuotesSeed(store, NOW);
  const lp9After = getWorkByIdFromStore(r.store, IK_OWNER_CREATE_A01_LP4_WORK_ID, "wroclaw");
  ok(
    "T10 LP9 quotes unchanged",
    JSON.stringify(lp9After?.marketQuotes ?? null) === lp9QuotesBefore,
  );
  ok("T10 LP5 quoted", probeA01Lp5QuotesRegion(r.store, "wroclaw") === "PRESENT_OK");
}

// Q-sync partial dolnyslask
{
  const seeded = applyA01Lp5QuotesSeed(freshStoreWithLp5Work(), NOW).store;
  const dsSlice = seeded.catalogs.dolnyslask;
  const dsWorks = dsSlice.works.map((w) =>
    w.id === IK_OWNER_CREATE_A01_LP5_WORK_ID ? { ...w, marketQuotes: undefined } : w,
  );
  const partial = {
    ...seeded,
    catalogs: {
      ...seeded.catalogs,
      dolnyslask: { ...dsSlice, works: dsWorks },
    },
  };
  const synced = syncA01Lp5QuotesWroclawToDolnySlask(partial, NOW);
  ok("Q-sync ds restored", probeA01Lp5QuotesRegion(synced.store, "dolnyslask") === "PRESENT_OK");
}

// LP10 alias bind after quotes
{
  const quoted = applyA01Lp5QuotesSeed(freshStoreWithLp5Work(), NOW).store;
  const works = listActiveWorksForRegion(quoted, "wroclaw");
  const alias = resolveCatalogCoverageAlias({
    description: IK_OWNER_CREATE_A01_LP5_ALIAS_LP10,
    works,
    requireQuotes: true,
  });
  ok("LP10 alias matched", alias.matched && alias.aliasRuleId === "impregnacja_biobojcza");
  ok("LP10 resolvedProductId", alias.resolvedProductId === IK_OWNER_CREATE_A01_LP5_WORK_ID);
  ok("LP10 no missingQuotes", alias.missingQuotes === false);
  const mapped = mapOfferBoqLine(
    {
      id: "l10",
      lp: "10",
      description: IK_OWNER_CREATE_A01_LP5_ALIAS_LP10,
      unit: "m2",
      quantity: 1,
      catalogWorkId: null,
      matchMethod: null,
      matchedBy: null,
      matchConfidence: null,
      candidateMatches: [],
      aiConfidence: null,
      aiRationale: null,
      costIntelligence: null,
      linePricing: null,
      isNoise: false,
      noiseKind: null,
      normalizedDescription: null,
      aliasRuleId: null,
      workCategory: null,
      categoryId: null,
    },
    { works },
  );
  ok("LP10 mapOfferBoqLine bind", mapped.catalogWorkId === IK_OWNER_CREATE_A01_LP5_WORK_ID);
  ok("LP10 matchMethod alias", mapped.matchMethod === "alias");
  const identity = resolveWorkIdentityFromOfferBoqLine(mapped);
  ok("LP10 identity OK", identity.status === "OK" && identity.workId === IK_OWNER_CREATE_A01_LP5_WORK_ID);
}

// absent work stops
{
  let threw = false;
  try {
    assertA01Lp5WorkPresentForQuotesOrStop(emptyStore());
  } catch (e) {
    threw = e.message.includes("ABSENT_WORK");
  }
  ok("absent work throws", threw);
}

// probe helper
{
  const store = applyA01Lp5QuotesSeed(freshStoreWithLp5Work(), NOW).store;
  const probe = probeA01Lp5QuotesPerRegion(store);
  ok("probe both ok", probe.wroclaw === "PRESENT_OK" && probe.dolnyslask === "PRESENT_OK");
}

console.log(`\nA01-LP5-QUOTES OPS TEST: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
