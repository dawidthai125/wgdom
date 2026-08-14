/**
 * WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01 — labor commercial margin UI wiring.
 *
 * T1–T9: view-model + patch + proposed formula · no OUR RATE / Accept / invent.
 * T10: static regression markers + material margin API unchanged.
 *
 * npx vite-node scripts/test-work-rate-labor-margin-ui-01.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildOurWorkRateCatalogRows,
  computeProposedWorkRatePln,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";
import {
  buildOurPriceCatalogRows,
  isOurPriceCatalogMaterialHost,
  patchWorkCommercialPricing,
  resolveMarginPct,
} from "../src/lib/price-intelligence/our-price-catalog.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

const NOW = Date.parse("2026-08-14T12:00:00.000Z");
const T0 = "2026-08-14T10:00:00.000Z";
const WORK_ID = "cc-p0c-w1-zaprawianie-bruzd";
const NAME = "Zaprawianie / zamurowanie bruzd";

function makeLaborWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "PRZYGOTOWANIE",
    namePl: NAME,
    unit: "mb",
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    updatedAt: T0,
    freshnessStatus: "ok",
    keywords: ["zaprawianie bruzd"],
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
      wroclaw: { region: "wroclaw", works, updatedAt: T0 },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T0 },
    },
    updatedAt: T0,
  });
}

// ——— T1 display field present on labor row ———
{
  const store = makeStore([makeLaborWork()]);
  const row = buildOurWorkRateCatalogRows({ store, nowMs: NOW }).find(
    (r) => r.workId === WORK_ID,
  );
  ok("T1 labor row exists", !!row);
  ok("T1 marginPct field present", row && "marginPct" in row);
  ok("T1 marginUnset field present", row && "marginUnset" in row);
}

// ——— T2 UNKNOWN / empty before Owner save ———
{
  const store = makeStore([makeLaborWork()]);
  const row = buildOurWorkRateCatalogRows({ store, nowMs: NOW })[0];
  eq("T2 marginPct null", row.marginPct, null);
  eq("T2 marginUnset true", row.marginUnset, true);
  eq("T2 resolveMarginPct null", resolveMarginPct(store.catalogs.wroclaw.works[0]), null);
  eq("T2 companyPrice still 35 (untouched)", row.companyPricePlnLegacy, 35);
}

// ——— T3 explicit Owner margin via patchWorkCommercialPricing ———
{
  let store = makeStore([makeLaborWork()]);
  const next = patchWorkCommercialPricing(store, WORK_ID, 20, "2026-08-14T11:00:00.000Z", "owner");
  ok("T3 patch returns store", !!next);
  store = next;
  const work = store.catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  eq("T3 commercialPricing.marginPct", work?.commercialPricing?.marginPct, 20);
  eq("T3 source owner", work?.commercialPricing?.source, "owner");
  eq("T3 companyPrice untouched", work?.companyPricePln, 35);
  eq("T3 ourWorkRate still absent", work?.ourWorkRate, undefined);
}

// ——— T4 resolveMarginPct after save ———
{
  let store = makeStore([makeLaborWork()]);
  store = patchWorkCommercialPricing(store, WORK_ID, 20, "2026-08-14T11:00:00.000Z", "owner");
  const work = store.catalogs.wroclaw.works[0];
  eq("T4 resolveMarginPct", resolveMarginPct(work), 20);
  const row = buildOurWorkRateCatalogRows({ store, nowMs: NOW })[0];
  eq("T4 row.marginPct", row.marginPct, 20);
  eq("T4 row.marginUnset false", row.marginUnset, false);
}

// ——— T5 proposed = marketBase * (1 + margin/100) ———
{
  eq("T5 proposed 20 @ 20%", computeProposedWorkRatePln(20, 20), 24);
  eq("T5 proposed null when margin unset", computeProposedWorkRatePln(20, null), null);
  eq("T5 proposed null when margin undefined", computeProposedWorkRatePln(20, undefined), null);
}

// ——— T6 companyPricePln does not participate ———
{
  const store = makeStore([makeLaborWork({ companyPricePln: 999 })]);
  const row = buildOurWorkRateCatalogRows({ store, nowMs: NOW })[0];
  eq("T6 margin still unset despite companyPrice", row.marginUnset, true);
  eq("T6 resolve ignores companyPrice", resolveMarginPct(store.catalogs.wroclaw.works[0]), null);
  eq("T6 proposed ignores companyPrice", computeProposedWorkRatePln(20, null), null);
  ok(
    "T6 companyPrice ≠ margin",
    row.companyPricePlnLegacy === 999 && row.marginPct == null,
  );
}

// ——— T7 / T8 no OUR RATE write / no Accept from margin patch ———
{
  let store = makeStore([
    makeLaborWork({
      ourWorkRate: undefined,
    }),
  ]);
  store = patchWorkCommercialPricing(store, WORK_ID, 15, "2026-08-14T11:30:00.000Z", "owner");
  const work = store.catalogs.wroclaw.works[0];
  ok("T7 ourWorkRate still undefined after margin", work.ourWorkRate == null);
  const panelSrc = readFileSync(
    join(ROOT, "src/app/work-rate-catalog/OurWorkRateCatalogPanel.tsx"),
    "utf8",
  );
  ok(
    "T8 margin save uses updateCommercialMargin only",
    /updateCommercialMargin\(row\.workId/.test(panelSrc) &&
      /async function onSaveMargin/.test(panelSrc),
  );
  const saveMarginBlock = panelSrc.slice(
    panelSrc.indexOf("async function onSaveMargin"),
    panelSrc.indexOf("function MarginControl"),
  );
  ok(
    "T8 onSaveMargin does not call accept/updateOurWorkRate",
    saveMarginBlock.length > 0 &&
      !/acceptOurWorkRateResearch/.test(saveMarginBlock) &&
      !/updateOurWorkRate/.test(saveMarginBlock) &&
      /updateCommercialMargin/.test(saveMarginBlock),
  );
}

// ——— T9 material margin behavior / host gate unchanged ———
{
  ok(
    "T9 labor id is NOT material host",
    !isOurPriceCatalogMaterialHost(WORK_ID),
  );
  const materialWork = {
    id: "cw.product.demo-mat",
    tradeId: "ELEKTRYKA",
    namePl: "Demo materiał",
    unit: "szt",
    companyPricePln: 10,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 12, updatedAt: T0, source: "owner" },
    updatedAt: T0,
    freshnessStatus: "ok",
    keywords: ["mat.demo"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
  const store = makeStore([makeLaborWork(), materialWork]);
  // Material host gate still rejects bare labor id
  ok("T9 material host gate rejects labor", !isOurPriceCatalogMaterialHost(WORK_ID));
  ok(
    "T9 material host still accepts cw.product",
    isOurPriceCatalogMaterialHost("cw.product.demo-mat"),
  );
  // patch still works for material ids (API unchanged)
  const patched = patchWorkCommercialPricing(
    store,
    "cw.product.demo-mat",
    18,
    "2026-08-14T12:00:00.000Z",
    "owner",
  );
  eq(
    "T9 material patch margin",
    patched?.catalogs.wroclaw.works.find((w) => w.id === "cw.product.demo-mat")
      ?.commercialPricing?.marginPct,
    18,
  );
  // labor row still listed in work-rate catalog; material path does not invent labor margin
  const laborRow = buildOurWorkRateCatalogRows({ store, nowMs: NOW }).find(
    (r) => r.workId === WORK_ID,
  );
  eq("T9 labor still unset in work-rate rows", laborRow?.marginUnset, true);
  void buildOurPriceCatalogRows; // imported for API surface stability
}

// ——— T10 UI wiring + locks + no global labor floor ———
{
  const panelSrc = readFileSync(
    join(ROOT, "src/app/work-rate-catalog/OurWorkRateCatalogPanel.tsx"),
    "utf8",
  );
  const pricePanel = readFileSync(
    join(ROOT, "src/app/price-catalog/OurPriceCatalogPanel.tsx"),
    "utf8",
  );
  ok("T10 Marża WGDOM label", /Marża WGDOM/.test(panelSrc));
  ok("T10 margin editor marker", /data-work-rate-margin-editor/.test(panelSrc));
  ok("T10 Zapisz button", /data-work-rate-margin-save/.test(panelSrc));
  ok("T10 updateCommercialMargin wired", /updateCommercialMargin/.test(panelSrc));
  ok(
    "T10 no applyGlobalCommercialMarginFloor in labor panel",
    !/applyGlobalCommercialMarginFloor/.test(panelSrc),
  );
  ok(
    "T10 material panel still has global floor",
    /applyGlobalCommercialMarginFloor/.test(pricePanel),
  );
  ok(
    "T10 Accept path still present separately",
    /acceptOurWorkRateResearch/.test(panelSrc) &&
      /Zapisz OUR RATE \(Accept\)/.test(panelSrc),
  );
}

console.log(`\n${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
