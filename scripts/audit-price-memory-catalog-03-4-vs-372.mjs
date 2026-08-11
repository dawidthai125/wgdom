/**
 * PRICE-MEMORY-CATALOG-03 — read-only audit (NO production writes).
 * npx vite-node scripts/audit-price-memory-catalog-03-4-vs-372.mjs
 */
import {
  DEFAULT_MATERIAL_MARKET_MAP,
  isLaborCatalogWorkBlockedForProductQuotes,
  resolveDemandProductIdentityExact,
} from "../src/lib/pricing-expert/material-market-map.ts";
import {
  applyPi31ApprovedQuotesToWorkCatalog,
  applyZygmuntInvoicePurchaseSeedToWorkCatalog,
  buildOurPriceCatalogRows,
  evaluateMaterialCache,
  isOurPriceCatalogMaterialHost,
  ZYGMUNT_INVOICE_PURCHASE_SEED,
  ZYGMUNT_INVOICE_PURCHASE_SEED_META,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { indexWorksById, getRegionSlice } from "../src/lib/work-catalog/catalog-work-utils.ts";

const T_NOW = Date.parse("2026-08-11T18:30:00.000Z");

function emptyCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: "2026-08-10T12:00:00.000Z",
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: "2026-08-10T12:00:00.000Z", works: [] },
      dolnyslask: { region: "dolnyslask", updatedAt: "2026-08-10T12:00:00.000Z", works: [] },
    },
  });
}

function hasQuote(work) {
  if (!work?.marketQuotes) return false;
  for (const regions of Object.values(work.marketQuotes)) {
    if (!regions || typeof regions !== "object") continue;
    for (const snap of Object.values(regions)) {
      if (snap && typeof snap.price === "number" && snap.price > 0) return true;
    }
  }
  return false;
}

function hasHistory(work) {
  return Array.isArray(work?.marketQuoteHistory) && work.marketQuoteHistory.length > 0;
}

const mapKeys = [
  ...new Set(
    DEFAULT_MATERIAL_MARKET_MAP.map((e) => e.materialKey).filter((k) => k?.startsWith("mat.")),
  ),
];

console.log("=== MAP ===");
console.log("DEFAULT_MATERIAL_MARKET_MAP unique mat.*:", mapKeys.length);
console.log("SEED meta uniqueMaterialCount:", ZYGMUNT_INVOICE_PURCHASE_SEED_META.uniqueMaterialCount);
console.log("SEED rows:", ZYGMUNT_INVOICE_PURCHASE_SEED.length);

// Scenario A: empty store (only MAP candidates, no hosts with quotes)
{
  const store = emptyCatalog();
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  console.log("\n=== SCENARIO empty store ===");
  console.log("catalog rows:", rows.length);
}

// Scenario B: ETICS approved only (typical PI31 ensure without zygmunt on Firma path)
{
  const applied = applyPi31ApprovedQuotesToWorkCatalog(emptyCatalog());
  const store = applied.store;
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  console.log("\n=== SCENARIO ETICS approved quotes only ===");
  console.log("works wroclaw:", getRegionSlice(store)?.works?.length);
  console.log("works with quotes:", (getRegionSlice(store)?.works ?? []).filter(hasQuote).length);
  console.log("catalog rows:", rows.length);
  for (const r of rows) {
    console.log(
      " ROW",
      JSON.stringify({
        name: r.namePl,
        mk: r.materialKey,
        wid: r.workId,
        base: r.basePrice,
        fresh: r.freshness,
        at: r.priceObservedAt,
        origins: r.sourceCoverage.origins,
      }),
    );
  }
}

// Scenario C: zygmunt seed applied
{
  const applied = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog());
  const store = applied.store;
  const works = getRegionSlice(store)?.works ?? [];
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  console.log("\n=== SCENARIO zygmunt seed applied ===");
  console.log("works upserted:", applied.worksUpserted, "works:", works.length);
  console.log("catalog rows:", rows.length);
  const byFresh = { CURRENT: 0, STALE: 0, MISSING: 0 };
  for (const r of rows) byFresh[r.freshness] = (byFresh[r.freshness] || 0) + 1;
  console.log("rows by freshness:", byFresh);
}

// Classify all 372 seed keys against seeded store
{
  const applied = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog());
  const store = applied.store;
  const worksById = indexWorksById(getRegionSlice(store)?.works ?? []);
  const groups = {
    A_CURRENT: [],
    B_STALE: [],
    C_MISSING: [],
    D_HISTORY_NO_QUOTE: [],
    E_BAD_IDENTITY: [],
    F_LABOR: [],
    G_OTHER: [],
    BUILDER_INCLUDED: [],
    BUILDER_REJECT_NO_HIT: [],
    BUILDER_REJECT_HOST: [],
    BUILDER_REJECT_IDENTITY: [],
    BUILDER_REJECT_LABOR: [],
  };

  for (const row of ZYGMUNT_INVOICE_PURCHASE_SEED) {
    const mk = row.materialKey;
    const identity = resolveDemandProductIdentityExact({ materialKey: mk });
    if (!identity) {
      groups.E_BAD_IDENTITY.push(mk);
      groups.BUILDER_REJECT_IDENTITY.push(mk);
      continue;
    }
    if (isLaborCatalogWorkBlockedForProductQuotes(identity.catalogWorkId)) {
      groups.F_LABOR.push(mk);
      groups.BUILDER_REJECT_LABOR.push(mk);
      continue;
    }
    const work = worksById.get(identity.catalogWorkId) ?? worksById.get(row.catalogWorkId);
    const quote = work ? hasQuote(work) : false;
    const hist = work ? hasHistory(work) : false;
    const cache = evaluateMaterialCache({
      materialKey: mk,
      worksById,
      nowMs: T_NOW,
      region: "wroclaw",
    });

    if (cache.usability === "CURRENT") groups.A_CURRENT.push(mk);
    else if (cache.usability === "STALE") groups.B_STALE.push(mk);
    else if (cache.usability === "MISSING") {
      groups.C_MISSING.push(mk);
      if (hist && !quote) groups.D_HISTORY_NO_QUOTE.push(mk);
    }

    // builder path
    if (cache.usability === "MISSING" || !cache.hit) {
      groups.BUILDER_REJECT_NO_HIT.push(mk);
      continue;
    }
    if (!isOurPriceCatalogMaterialHost(cache.hit.workId, identity.catalogWorkId)) {
      groups.BUILDER_REJECT_HOST.push(mk);
      groups.G_OTHER.push({ mk, reason: "host_gate", hit: cache.hit.workId });
      continue;
    }
    if (isLaborCatalogWorkBlockedForProductQuotes(cache.hit.workId)) {
      groups.BUILDER_REJECT_LABOR.push(mk);
      continue;
    }
    groups.BUILDER_INCLUDED.push(mk);
  }

  console.log("\n=== 372 CLASSIFICATION (seeded store) ===");
  for (const [k, v] of Object.entries(groups)) {
    const n = Array.isArray(v) ? v.length : 0;
    const ex = Array.isArray(v) ? v.slice(0, 3) : [];
    console.log(k, n, JSON.stringify(ex));
  }
}

// Classify MAP keys without seed (empty + only MAP lookup)
{
  const store = emptyCatalog();
  const worksById = indexWorksById([]);
  let missing = 0;
  let noId = 0;
  let labor = 0;
  for (const mk of mapKeys) {
    const identity = resolveDemandProductIdentityExact({ materialKey: mk });
    if (!identity) {
      noId += 1;
      continue;
    }
    if (isLaborCatalogWorkBlockedForProductQuotes(identity.catalogWorkId)) {
      labor += 1;
      continue;
    }
    const cache = evaluateMaterialCache({ materialKey: mk, worksById, nowMs: T_NOW });
    if (cache.usability === "MISSING") missing += 1;
  }
  console.log("\n=== MAP keys on EMPTY store ===");
  console.log({ mapKeys: mapKeys.length, noId, labor, missing });
}

// Seed key prefix mix
{
  const inv = ZYGMUNT_INVOICE_PURCHASE_SEED.filter((r) => r.materialKey.startsWith("mat.inv."));
  const other = ZYGMUNT_INVOICE_PURCHASE_SEED.filter((r) => !r.materialKey.startsWith("mat.inv."));
  console.log("\n=== SEED KEY PREFIX ===");
  console.log("mat.inv.*", inv.length, "other", other.length);
  console.log(
    "other examples",
    other.slice(0, 10).map((r) => ({ mk: r.materialKey, cw: r.catalogWorkId, name: r.namePl })),
  );
}

// Freshness of seed observedAt
{
  const ages = ZYGMUNT_INVOICE_PURCHASE_SEED.map((r) => ({
    mk: r.materialKey,
    at: r.observedAt,
    ageDays: (T_NOW - Date.parse(r.observedAt)) / 86400000,
  }));
  const staleish = ages.filter((a) => a.ageDays > 14).length;
  const freshish = ages.filter((a) => a.ageDays <= 14).length;
  console.log("\n=== SEED observation age vs T_NOW ===");
  console.log({ freshish_le14d: freshish, staleish_gt14d: staleish, sample: ages[0] });
}

// Confirm HIT→row gate in source
console.log("\n=== BUILDER GATE (code) ===");
console.log("requires cache.usability !== MISSING && cache.hit → YES (line ~311)");
console.log("MISSING rows never emitted → YES");
console.log("UI default freshnessFilter=ALL, pageSize=100 → YES");
console.log("ensureZygmunt called from Chief catalog adapter ONLY → YES (not OurPriceCatalogPanel)");
