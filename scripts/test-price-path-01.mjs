/**
 * PRICE-PATH-01 — Expert Real Cost + Market compare (economy 3 hosts).
 * ZERO invent PLN in production seed — tests inject Owner-approved prices explicitly.
 *
 * npx vite-node scripts/test-price-path-01.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { projectPurchaseByMaterialKey } from "../src/lib/chief-wire-adapters/purchase-by-material-key.ts";
import { assembleRealCost } from "../src/lib/cost-expert/assemble.ts";
import {
  applyEconomyOwnerApprovedPrices,
  applyEconomyProductHostsToWorkCatalog,
  assertEconomyProductHostsMapAligned,
  ECONOMY_PRODUCT_HOST_SPECS,
  resolveEconomyMaterialPricePath,
} from "../src/lib/price-intelligence/index.ts";
import { analyzeMaterialMarketLine, mapMaterialToMarketWork, resolveMaterialMarketCoverage } from "../src/lib/pricing-expert/index.ts";
import { normalizeCompanyKnowledgeStore } from "../src/lib/tender-offer-boq-company-knowledge.ts";
import { indexWorksById, listActiveWorksForRegion } from "../src/lib/work-catalog/index.ts";
import { defaultWorkCatalogStoreForPersist } from "../src/lib/work-catalog/work-catalog-store.ts";
import { workFreshnessStaleAfterMs } from "../src/lib/work-catalog/freshness.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${a} !== ${b}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

/** ZZK 08dee178 locked qty (PRICE-PATH must not change). */
const ZZK = {
  gruntL: 17.589,
  paintL: 26.592,
  screedKg: 417.6,
};

const NOW_ISO = "2026-08-11T12:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);
const STALE_ISO = "2025-01-01T12:00:00.000Z"; // >90d before NOW

/** Test-only Owner-approved injects — NOT production seed, NOT invent for prod. */
const TEST_APPROVED = {
  "mat.grunt": { purchase: 4.2, market: 5.1 },
  "mat.farba_lateksowa_wewnetrzna": { purchase: 18.5, market: 21.0 },
  "mat.jastrych_cementowy": { purchase: 0.65, market: 0.8 },
};

function emptyKnowledge() {
  return normalizeCompanyKnowledgeStore({
    schemaVersion: 1,
    updatedAt: NOW_ISO,
    entries: [],
  });
}

function catalogRo(store) {
  const works = listActiveWorksForRegion(store, store.activeRegion);
  return { worksById: indexWorksById(works) };
}

function seedHostsOnly() {
  return applyEconomyProductHostsToWorkCatalog(defaultWorkCatalogStoreForPersist()).store;
}

function approveAll(acceptedAtIso = NOW_ISO) {
  let catalog = seedHostsOnly();
  let knowledge = emptyKnowledge();
  for (const [materialKey, prices] of Object.entries(TEST_APPROVED)) {
    const r = applyEconomyOwnerApprovedPrices({
      catalogStore: catalog,
      knowledgeStore: knowledge,
      approval: {
        materialKey,
        purchaseUnitPricePln: prices.purchase,
        marketQuotePln: prices.market,
        acceptedAtIso,
        origin: "wgdom",
      },
    });
    assert.equal(r.ok, true, `approve ${materialKey}`);
    catalog = r.catalogStore;
    knowledge = r.knowledgeStore;
  }
  return { catalog, knowledge, purchase: projectPurchaseByMaterialKey(knowledge) };
}

function resolveOne(materialKey, qty, unit, catalog, purchase, nowMs = NOW_MS) {
  const host = ECONOMY_PRODUCT_HOST_SPECS.find((s) => s.materialKey === materialKey);
  return resolveEconomyMaterialPricePath({
    materialKey,
    namePl: host?.namePl ?? materialKey,
    quantity: qty,
    unit,
    catalog: catalogRo(catalog),
    purchaseByMaterialKey: purchase,
    nowMs,
  });
}

console.log("=== PRICE-PATH-01 ===");

// —— Map / host identity ——
assertEconomyProductHostsMapAligned();
ok("map aligned for 3 hosts", true);
for (const s of ECONOMY_PRODUCT_HOST_SPECS) {
  const map = mapMaterialToMarketWork(s.materialKey);
  eq(`identity ${s.materialKey} workId`, map?.workId, s.catalogWorkId);
  eq(`identity ${s.materialKey} unit`, s.unit, s.unit === "l" || s.unit === "kg" ? s.unit : null);
}

// —— Structure ensure: no invent Quotes ——
{
  const hosts = applyEconomyProductHostsToWorkCatalog(defaultWorkCatalogStoreForPersist());
  ok("hosts upserted", hosts.worksUpserted >= 3);
  const cat = catalogRo(hosts.store);
  for (const s of ECONOMY_PRODUCT_HOST_SPECS) {
    const w = cat.worksById.get(s.catalogWorkId);
    ok(`host present ${s.catalogWorkId}`, !!w);
    eq(`host unit ${s.catalogWorkId}`, w?.unit, s.unit);
    ok(`host no invent Quotes ${s.catalogWorkId}`, !w?.marketQuotes || Object.keys(w.marketQuotes).length === 0);
    const cov = resolveMaterialMarketCoverage(s.materialKey, cat.worksById);
    ok(`host without Quotes → no coverage ${s.materialKey}`, cov == null);
  }
}

// —— P4 missing → PRICE_GAP (before approve) ——
{
  const catalog = seedHostsOnly();
  const purchase = projectPurchaseByMaterialKey(emptyKnowledge());
  const gap = resolveOne("mat.grunt", ZZK.gruntL, "l", catalog, purchase);
  eq("P4 status PRICE_GAP", gap.status, "PRICE_GAP");
  eq("P4 market null", gap.marketPricePln, null);
  eq("P4 purchase null", gap.purchaseUnitPln, null);
  ok("P4 reason mentions GAP", String(gap.gapReasonPl || "").includes("PRICE_GAP") || String(gap.gapReasonPl || "").includes("Brak"));
}

const approved = approveAll(NOW_ISO);

// —— P1 grunt ——
{
  const line = resolveOne("mat.grunt", ZZK.gruntL, "l", approved.catalog, approved.purchase);
  eq("P1 READY", line.status, "READY");
  eq("P1 purchase unit", line.purchaseUnitPln, TEST_APPROVED["mat.grunt"].purchase);
  ok("P1 market non-null", line.marketPricePln != null && line.marketPricePln > 0);
  eq("P1 freshness ok", line.marketFreshness, "ok");
  eq("P1 unit host l", line.hostUnit, "l");
  ok("P1 provenance acceptedAt", !!line.marketAcceptedAt);
  ok("P1 provenance origin", !!line.marketOrigin);
  const expectedTotal = Math.round(TEST_APPROVED["mat.grunt"].purchase * ZZK.gruntL * 100) / 100;
  eq("P1 purchaseTotal", line.purchaseTotalPln, expectedTotal);
}

// —— P2 paint ——
{
  const line = resolveOne(
    "mat.farba_lateksowa_wewnetrzna",
    ZZK.paintL,
    "L",
    approved.catalog,
    approved.purchase,
  );
  eq("P2 READY", line.status, "READY");
  eq("P2 purchase", line.purchaseUnitPln, TEST_APPROVED["mat.farba_lateksowa_wewnetrzna"].purchase);
  ok("P2 market", line.marketPricePln != null && line.marketPricePln > 0);
  eq("P2 freshness ok", line.marketFreshness, "ok");
}

// —— P3 screed ——
{
  const line = resolveOne(
    "mat.jastrych_cementowy",
    ZZK.screedKg,
    "kg",
    approved.catalog,
    approved.purchase,
  );
  eq("P3 READY", line.status, "READY");
  eq("P3 purchase", line.purchaseUnitPln, TEST_APPROVED["mat.jastrych_cementowy"].purchase);
  ok("P3 market", line.marketPricePln != null && line.marketPricePln > 0);
  eq("P3 host kg", line.hostUnit, "kg");
}

// —— P5 stale ≠ silent CURRENT ——
{
  const staleApproved = approveAll(STALE_ISO);
  const line = resolveOne("mat.grunt", ZZK.gruntL, "l", staleApproved.catalog, staleApproved.purchase, NOW_MS);
  const age = NOW_MS - Date.parse(STALE_ISO);
  ok("P5 age beyond stale window", age >= workFreshnessStaleAfterMs());
  eq("P5 freshness STALE", line.marketFreshness, "stale");
  ok("P5 NEVER treat as current", line.marketFreshness !== "ok");
  // PE may still return numeric marketPricePln — consumer must keep freshness
  if (line.marketPricePln != null) {
    ok("P5 price present but marked stale", line.marketFreshness === "stale");
  }
}

// —— P6 wrong unit ——
{
  const badApply = applyEconomyOwnerApprovedPrices({
    catalogStore: seedHostsOnly(),
    knowledgeStore: emptyKnowledge(),
    approval: {
      materialKey: "mat.grunt",
      purchaseUnitPricePln: 4.2,
      marketQuotePln: 5.1,
      acceptedAtIso: NOW_ISO,
    },
    forceQuoteUnit: "m2",
  });
  eq("P6 apply reject unit", badApply.ok, false);
  if (!badApply.ok) eq("P6 reason unit_mismatch", badApply.reason, "unit_mismatch");

  const gap = resolveOne("mat.grunt", ZZK.gruntL, "m2", approved.catalog, approved.purchase);
  eq("P6 resolve PRICE_GAP", gap.status, "PRICE_GAP");
  ok("P6 wrong unit reason", String(gap.gapReasonPl || "").toLowerCase().includes("unit"));
}

// —— P7 wrong identity ——
{
  const bad = applyEconomyOwnerApprovedPrices({
    catalogStore: seedHostsOnly(),
    knowledgeStore: emptyKnowledge(),
    approval: {
      materialKey: "mat.eps_graph",
      purchaseUnitPricePln: 10,
      marketQuotePln: 11,
      acceptedAtIso: NOW_ISO,
    },
  });
  eq("P7 apply reject identity", bad.ok, false);
  if (!bad.ok) eq("P7 unknown_material", bad.reason, "unknown_material");

  const gap = resolveEconomyMaterialPricePath({
    materialKey: "mat.eps_graph",
    namePl: "EPS",
    quantity: 1,
    unit: "m2",
    catalog: catalogRo(approved.catalog),
    purchaseByMaterialKey: approved.purchase,
    nowMs: NOW_MS,
  });
  eq("P7 resolve PRICE_GAP", gap.status, "PRICE_GAP");
}

// —— P8 Purchase ≠ Market; Market not in Real Cost sum ——
{
  const materials = [
    {
      materialKey: "mat.grunt",
      namePl: "Grunt",
      quantity: ZZK.gruntL,
      unit: "l",
    },
    {
      materialKey: "mat.farba_lateksowa_wewnetrzna",
      namePl: "Farba",
      quantity: ZZK.paintL,
      unit: "l",
    },
    {
      materialKey: "mat.jastrych_cementowy",
      namePl: "Jastrych",
      quantity: ZZK.screedKg,
      unit: "kg",
    },
  ];
  const peLines = materials.map((m) => {
    const host = ECONOMY_PRODUCT_HOST_SPECS.find((s) => s.materialKey === m.materialKey);
    const map = mapMaterialToMarketWork(m.materialKey);
    const cov = resolveMaterialMarketCoverage(m.materialKey, catalogRo(approved.catalog).worksById);
    return analyzeMaterialMarketLine({
      materialKey: m.materialKey,
      namePl: m.namePl,
      quantity: m.quantity,
      unit: m.unit,
      map,
      work: cov?.work?.id === host?.catalogWorkId ? cov.work : null,
      nowMs: NOW_MS,
      computedAtIso: NOW_ISO,
    });
  });
  const assembled = assembleRealCost({
    execution: {
      contract: {
        co: "t",
        dlaczego: "t",
        naPodstawieCzego: "t",
        pewnosc: "high",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "aligned",
        zgodnoscOpisPl: "t",
      },
      selection: null,
      technologyDecision: null,
      plan: null,
      bundle: null,
      bom: { materials, labour: [], equipment: [] },
      gapsAndRisks: [],
      pack: null,
    },
    pricing: {
      contract: {
        co: "t",
        dlaczego: "t",
        naPodstawieCzego: "t",
        pewnosc: "high",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "aligned",
        zgodnoscOpisPl: "t",
      },
      lines: peLines,
      requiresReanalysis: false,
      returnToMaterialExpert: false,
      returnReasonsPl: [],
      reanalysisMaterialKeys: [],
      completeness: "kompletny",
    },
    company: {
      purchaseByMaterialKey: approved.purchase,
      defaultLaborPlnPerHour: 0,
      equipmentRateByKey: {},
      auxiliaryPctOfDirect: 0,
      internalOverheadPct: 0,
    },
  });

  for (const ml of assembled.materialLines) {
    const inj = TEST_APPROVED[ml.materialKey];
    eq(`P8 purchaseUnit ${ml.materialKey}`, ml.purchaseUnitPln, inj.purchase);
    ok(`P8 marketUnit ${ml.materialKey}`, ml.marketUnitPln != null && ml.marketUnitPln > 0);
    ok(
      `P8 Purchase≠Market ${ml.materialKey}`,
      ml.purchaseUnitPln !== ml.marketUnitPln,
    );
  }
  const purchaseSum = assembled.materialLines.reduce((a, m) => a + (m.purchaseTotalPln ?? 0), 0);
  const marketSum = assembled.materialLines.reduce((a, m) => a + (m.marketTotalPln ?? 0), 0);
  ok("P8 market sum > 0 (compare)", marketSum > 0);
  ok("P8 materialsPurchase uses Purchase only", assembled.breakdown.materialsPurchasePln === Math.round(purchaseSum * 100) / 100 || assembled.breakdown.materialsPurchasePln === purchaseSum);
  // Real Cost material total must equal Purchase×qty, not Market×qty
  eq(
    "P8 materialsPurchasePln = purchaseSum",
    assembled.breakdown.materialsPurchasePln,
    Math.round(purchaseSum * 100) / 100,
  );
  ok("P8 Market NOT equal purchase sum", Math.abs(marketSum - purchaseSum) > 0.01);
}

// —— P9 ZZK qty replay (locked constants; price path multiplies without mutating qty) ——
{
  eq("P9 grunt qty", ZZK.gruntL, 17.589);
  eq("P9 paint qty", ZZK.paintL, 26.592);
  eq("P9 screed qty", ZZK.screedKg, 417.6);
  const g = resolveOne("mat.grunt", ZZK.gruntL, "l", approved.catalog, approved.purchase);
  const p = resolveOne("mat.farba_lateksowa_wewnetrzna", ZZK.paintL, "l", approved.catalog, approved.purchase);
  const s = resolveOne("mat.jastrych_cementowy", ZZK.screedKg, "kg", approved.catalog, approved.purchase);
  eq("P9 grunt qty preserved", g.quantity, 17.589);
  eq("P9 paint qty preserved", p.quantity, 26.592);
  eq("P9 screed qty preserved", s.quantity, 417.6);
  ok("P9 grunt total = purchase×qty", g.purchaseTotalPln === Math.round(4.2 * 17.589 * 100) / 100);
  ok("P9 paint total = purchase×qty", p.purchaseTotalPln === Math.round(18.5 * 26.592 * 100) / 100);
  ok("P9 screed total = purchase×qty", s.purchaseTotalPln === Math.round(0.65 * 417.6 * 100) / 100);
}

// —— P10 regression ONLY RUN ——
function runChild(label, script, expectPass) {
  const r = spawnSync("npx", ["vite-node", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    timeout: 180_000,
    shell: true,
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const allPass = out.match(/ALL PASS\s*\((\d+)\)/i);
  const passLines = (out.match(/^ {0,2}PASS /gm) || []).length;
  const count = allPass ? Number(allPass[1]) : passLines;
  if (r.status !== 0) {
    console.error(out.slice(-2000));
  }
  assert.equal(r.status, 0, `P10 ${label} exit`);
  eq(`P10 ${label} PASS count`, count, expectPass);
  return count;
}

console.log("--- P10 regressions ---");
runChild("SCREED", "scripts/test-economy-wet-cement-screed-v1.mjs", 18);
runChild("PAINTING", "scripts/test-painting-scope-harden-01.mjs", 50);
runChild("DECOMP", "scripts/test-technology-decomposition-01.mjs", 69);
runChild("PRIMING", "scripts/test-technology-recipe-consumption-priming-01.mjs", 61);
runChild("ELECTRICAL", "scripts/test-economy-electrical-cable-v1.mjs", 11);

console.log(`\nPRICE-PATH-01 ALL PASS (${passed})`);
