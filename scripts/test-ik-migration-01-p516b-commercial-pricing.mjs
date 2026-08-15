/**
 * IK-MIGRATION-01 P5.16-B — Commercial pricing contract fix
 * Run: npx vite-node scripts/test-ik-migration-01-p516b-commercial-pricing.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const { acceptWorkRateResearchCandidate } = await import(
  "../src/lib/work-catalog/work-rate-accept.ts"
);
const { computeProposedWorkRatePln } = await import(
  "../src/lib/work-catalog/work-rate-market-base.ts"
);
const { computeSellPricePln } = await import(
  "../src/lib/price-intelligence/our-price-catalog.ts"
);
const {
  resolveLaborInputFromOurWorkRate,
  computePositionCostWithOurRate,
  isExplicitLaborOnlyWork,
  OWNER_APPROVED_LABOR_ONLY_WORK_IDS,
  isExplicitMaterialSupplyWork,
  OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS,
  resolveMaterialSellFromCatalogWorkQuotes,
  computeShadowPositionCostForOfferBoqLine,
} = await import("../src/lib/tender-position-cost/index.ts");
const { defaultAppSettings } = await import("../src/lib/app-settings.ts");
const {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
} = await import("../src/lib/intelligent-estimator/ik-entry-flag.ts");

let pass = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  pass += 1;
  console.log("PASS", name);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  pass += 1;
  console.log("PASS", name);
}

const NOW = Date.parse("2026-08-15T10:00:00.000Z");
const ZAWOR = "cc-p0c-w1-zawor-odpowietrzajacy";
const BRUZDY = "cc-p0c-w1-zaprawianie-bruzd";

function emptySlice(works) {
  return {
    region: "wroclaw",
    works,
    updatedAt: "2026-08-15T10:00:00.000Z",
  };
}

function baseWork(partial) {
  return {
    id: partial.id,
    tradeId: "HYDRAULIKA",
    namePl: partial.namePl ?? partial.id,
    unit: partial.unit ?? "szt",
    companyPricePln: 0,
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    freshnessStatus: "fresh",
    updatedAt: "2026-08-15T10:00:00.000Z",
    ...partial,
  };
}

function storeWithWorks(works) {
  const slice = emptySlice(works);
  return {
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: slice,
      dolnyslask: {
        ...slice,
        region: "dolnyslask",
        works: works.map((w) => ({ ...w })),
      },
    },
    updatedAt: "2026-08-15T10:00:00.000Z",
  };
}

forceIkEntryEnabledForTests(null);
eq("Gate A ikEntryEnabled OFF", isIkEntryEnabled(), false);
eq("Gate A default settings OFF", defaultAppSettings().ikEntryEnabled, false);
eq("Gate A NG-10", resolveIkDetailFirstScreen(false), "ng10_gate");

eq("M BASE100 m0 → SELL100", computeSellPricePln(100, 0), 100);
eq("M BASE100 m20 → SELL120", computeSellPricePln(100, 20), 120);
eq("M BASE100 m25 → SELL125", computeSellPricePln(100, 25), 125);

const laborWork = baseWork({
  id: "cw.test.labor-c1",
  namePl: "Test labor C1",
  unit: "mb",
  commercialPricing: {
    marginPct: 20,
    updatedAt: "2026-08-15T10:00:00.000Z",
    source: "owner",
  },
});
let store = storeWithWorks([laborWork]);
const candidate = {
  workId: "cw.test.labor-c1",
  unit: "mb",
  namePl: "Test labor C1",
  suggestedRatePln: 120,
  marketBaseRatePln: 100,
  wgdomMarginPct: 20,
  proposedOurRatePln: 120,
  sourceMinPln: 100,
  sourceMaxPln: 100,
  regionScope: "POLSKA",
  countryScope: "POLSKA",
  widthClaim: "NOT_SPECIFIED",
  sampleSize: 1,
  lowSample: true,
  observations: [
    {
      ratePln: 100,
      regionScope: "POLSKA",
      observedAt: "2026-08-15T09:00:00.000Z",
      sourceMinPln: 100,
      sourceMaxPln: 100,
    },
  ],
  previousOurRatePln: null,
  previousFreshness: "MISSING",
};
eq("proposed display SELL", computeProposedWorkRatePln(100, 20), 120);
const accepted = acceptWorkRateResearchCandidate({ store, candidate });
ok("Accept ok", accepted.ok === true);
const stored = accepted.ok
  ? accepted.store.catalogs.wroclaw.works.find((w) => w.id === "cw.test.labor-c1")
      ?.ourWorkRate?.ourRatePln
  : null;
eq("Accept stores BASE 100 not 120", stored, 100);

store = accepted.store;
const resolved = resolveLaborInputFromOurWorkRate(store, "cw.test.labor-c1", "mb", NOW);
eq("resolve BASE field", resolved.ourRatePln, 100);
eq("resolve margin", resolved.marginPct, 20);
eq("resolve SELL", resolved.sellPricePln, 120);
eq("labor input SELL for engine", resolved.labor.ourRatePln, 120);
ok("Gate D no double 144", resolved.sellPricePln === 120);

const pos = computePositionCostWithOurRate({
  store,
  workId: "cw.test.labor-c1",
  unit: "mb",
  quantity: 2,
  nowMs: NOW,
});
eq("Position labor 2×120", pos.position.laborCostPln, 240);
eq("Position complete", pos.position.positionComplete, true);

const patchedWork = {
  ...accepted.store.catalogs.wroclaw.works[0],
  commercialPricing: {
    marginPct: 25,
    updatedAt: "2026-08-15T11:00:00.000Z",
    source: "owner",
  },
};
const r25 = resolveLaborInputFromOurWorkRate(
  storeWithWorks([patchedWork]),
  "cw.test.labor-c1",
  "mb",
  NOW,
);
eq("BASE unchanged after margin bump", r25.ourRatePln, 100);
eq("SELL follows margin 25%", r25.sellPricePln, 125);

ok("Zaprawianie on LABOR_ONLY allowlist", OWNER_APPROVED_LABOR_ONLY_WORK_IDS.has(BRUZDY));
ok("isExplicitLaborOnlyWork(bruzdy)", isExplicitLaborOnlyWork(BRUZDY));
ok("Zaprawianie NOT material supply", !isExplicitMaterialSupplyWork(BRUZDY));

const bruzdyWork = baseWork({
  id: BRUZDY,
  namePl: "Zaprawianie / zamurowanie bruzd",
  unit: "mb",
  commercialPricing: {
    marginPct: 0,
    updatedAt: "2026-08-15T10:00:00.000Z",
    source: "owner",
  },
  ourWorkRate: {
    workId: BRUZDY,
    unit: "mb",
    ourRatePln: 20,
    sourceType: "ACCEPT",
    regionScope: "POLSKA",
    observedAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
    history: [],
  },
});
const bruzdyShadow = computeShadowPositionCostForOfferBoqLine({
  line: {
    lineId: "obl_test_bruzdy",
    lp: "7",
    description: "Zaprawianie bruzd",
    quantity: 14.5,
    unit: "mb",
    catalogWorkId: BRUZDY,
    matchMethod: "alias",
    matchConfidence: "high",
  },
  store: storeWithWorks([bruzdyWork]),
  nowMs: NOW,
});
eq("Bruzdy shadow complete", bruzdyShadow.positionComplete, true);
eq("Bruzdy labor cost", bruzdyShadow.position?.laborCostPln, 290);
eq("Bruzdy material cost 0", bruzdyShadow.position?.materialCostPln, 0);
eq("Bruzdy materials resolved empty", bruzdyShadow.materialsResolved.length, 0);
ok("Bruzdy no BOM gap", !bruzdyShadow.gaps.includes("BRAK_TECHNOLOGII_BOM"));

ok("Zawór on MATERIAL_SUPPLY", OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS.has(ZAWOR));
ok("isExplicitMaterialSupplyWork(zawor)", isExplicitMaterialSupplyWork(ZAWOR));
ok("Zawór NOT labor only", !isExplicitLaborOnlyWork(ZAWOR));

const zaworWork = baseWork({
  id: ZAWOR,
  namePl: "Odpowietrznik automatyczny CO",
  unit: "szt",
  commercialPricing: {
    marginPct: 0,
    updatedAt: "2026-08-15T10:00:00.000Z",
    source: "owner",
  },
  marketQuotes: {
    wgdom: {
      wroclaw: {
        price: 28,
        regionCode: "wroclaw",
        coverage: "full",
        updatedAt: "2026-08-14T10:00:00.000Z",
        confidence: 0.9,
        origin: "wgdom",
      },
    },
  },
});
const zaworStore = storeWithWorks([zaworWork]);
const sell = resolveMaterialSellFromCatalogWorkQuotes(
  zaworStore,
  ZAWOR,
  2,
  "szt",
  NOW,
);
eq("Zawór BASE", sell.basePricePln, 28);
eq("Zawór margin 0", sell.marginPct, 0);
eq("Zawór SELL", sell.sellPricePln, 28);
eq("Zawór materialKey null (no invent)", sell.materialKey, null);

const zaworShadow = computeShadowPositionCostForOfferBoqLine({
  line: {
    lineId: "obl_test_zawor",
    lp: "33",
    description: "Montaż odpowietrzników",
    quantity: 2,
    unit: "szt",
    catalogWorkId: ZAWOR,
    matchMethod: "alias",
    matchConfidence: "high",
  },
  store: zaworStore,
  nowMs: NOW,
});
eq("Zawór F5 complete", zaworShadow.positionComplete, true);
eq("Zawór material cost 56", zaworShadow.position?.materialCostPln, 56);
eq("Zawór labor cost 0", zaworShadow.position?.laborCostPln, 0);
eq("Zawór ourRate null", zaworShadow.ourRate, null);
ok("Zawór no invent mat", zaworShadow.materialsResolved[0]?.materialKey == null);

const zawor3 = computeShadowPositionCostForOfferBoqLine({
  line: {
    lineId: "obl_test_zawor3",
    lp: "33",
    description: "Montaż odpowietrzników",
    quantity: 3,
    unit: "szt",
    catalogWorkId: ZAWOR,
    matchMethod: "alias",
    matchConfidence: "high",
  },
  store: zaworStore,
  nowMs: NOW,
});
eq("Zawór qty3 = 84", zawor3.position?.materialCostPln, 84);

const sell20 = resolveMaterialSellFromCatalogWorkQuotes(
  storeWithWorks([
    {
      ...zaworWork,
      commercialPricing: {
        marginPct: 20,
        updatedAt: "2026-08-15T12:00:00.000Z",
        source: "owner",
      },
    },
  ]),
  ZAWOR,
  1,
  "szt",
  NOW,
);
eq("Zawór BASE stays 28 @m20", sell20.basePricePln, 28);
eq("Zawór SELL 33.6 @m20", sell20.sellPricePln, 33.6);

ok(
  "Accept uses marketBaseRatePln",
  /marketBaseRatePln/.test(src("src/lib/work-catalog/work-rate-accept.ts")),
);
ok(
  "Accept does not round suggested into OUR RATE",
  !/ourRatePln = roundRatePln\(suggested\)/.test(
    src("src/lib/work-catalog/work-rate-accept.ts"),
  ),
);
ok(
  "resolveLabor uses computeSellPricePln",
  /computeSellPricePln/.test(
    src("src/lib/tender-position-cost/our-rate-labor-adapter.ts"),
  ),
);
ok(
  "no calculateLaborMarginV2",
  !/calculateLaborMarginV2|IkMarginEngine|calculateIkMargin/.test(
    src("src/lib/tender-position-cost/our-rate-labor-adapter.ts") +
      src("src/lib/tender-position-cost/catalog-work-quotes-sell-adapter.ts"),
  ),
);

console.log(`\nP5.16-B PASS ${pass}`);
