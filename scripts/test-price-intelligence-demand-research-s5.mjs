/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S5 — Demand UI visibility (tender-scoped).
 * npx vite-node scripts/test-price-intelligence-demand-research-s5.mjs
 *
 * Mirrors CostDetailsPanel S5 rule (presentation only · zero price writes).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  listActiveMarketLayerDemands,
  normalizePriceDemandStore,
  upsertPriceDemandCandidates,
} from "../src/lib/price-intelligence/index.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

const T0 = "2026-08-10T08:00:00.000Z";

/** Same visibility rule as CostDetailsPanel S5 (keep in sync). */
function listCostPanelMarketDemands(store, opts) {
  const tid = typeof opts.tenderId === "string" ? opts.tenderId.trim() : "";
  if (tid) {
    return listActiveMarketLayerDemands(store, { tenderId: tid });
  }
  const keys = (opts.bomMaterialKeys ?? []).filter(Boolean);
  return listActiveMarketLayerDemands(store, {
    materialKeys: keys.length > 0 ? keys : undefined,
  });
}

function seedStore() {
  let store = normalizePriceDemandStore(null);
  const up = upsertPriceDemandCandidates(store, [
    {
      materialKey: "mat.eps_graph",
      catalogWorkId: "cw.etics.boards",
      namePl: "Płyta EPS grafit",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "BOTH_MISSING",
      tenderId: "tender-A",
      requestedAt: T0,
      reason: "PRICE DATA MISSING",
    },
    {
      materialKey: "mat.umywalka",
      catalogWorkId: "cw.product.umywalka",
      namePl: "Umywalka ceramiczna",
      unit: "szt",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      tenderId: "tender-A",
      requestedAt: T0,
      reason: "PRICE DATA MISSING",
    },
    {
      materialKey: "mat.wc_compact",
      catalogWorkId: "cw.product.wc_compact",
      namePl: "WC kompakt",
      unit: "szt",
      region: "wroclaw",
      missingLayer: "BOTH_MISSING",
      tenderId: "tender-B",
      requestedAt: T0,
      reason: "PRICE DATA MISSING",
    },
  ]);
  return up.store;
}

console.log("\n=== DEMAND-RESEARCH-01 S5 DEMAND UI VISIBILITY ===\n");

const store = seedStore();

// 1 alias Demand without BOM key → visible for tender
{
  const rows = listCostPanelMarketDemands(store, {
    tenderId: "tender-A",
    bomMaterialKeys: [],
  });
  ok(
    "1 alias umywalka visible",
    rows.some((d) => d.materialKey === "mat.umywalka"),
  );
  ok(
    "1 eps also if same tender",
    rows.some((d) => d.materialKey === "mat.eps_graph"),
  );
}

// 2 BOM ETICS + Demand umywalka → both visible
{
  const rows = listCostPanelMarketDemands(store, {
    tenderId: "tender-A",
    bomMaterialKeys: ["mat.eps_graph", "mat.glue_etics"],
  });
  const keys = new Set(rows.map((d) => d.materialKey));
  ok("2 eps visible", keys.has("mat.eps_graph"));
  ok("2 umywalka visible (not BOM-cut)", keys.has("mat.umywalka"));
  ok("2 other tender WC hidden", !keys.has("mat.wc_compact"));
}

// 3 empty BOM + Demand → visible
{
  const rows = listCostPanelMarketDemands(store, {
    tenderId: "tender-A",
    bomMaterialKeys: [],
  });
  eq("3 count tender-A", rows.length, 2);
}

// 4 other tenderId → not visible
{
  const rows = listCostPanelMarketDemands(store, {
    tenderId: "tender-A",
    bomMaterialKeys: ["mat.wc_compact"],
  });
  ok(
    "4 WC other tender hidden",
    !rows.some((d) => d.materialKey === "mat.wc_compact"),
  );
  const b = listCostPanelMarketDemands(store, {
    tenderId: "tender-B",
    bomMaterialKeys: [],
  });
  eq("4 tender-B only WC", b.length, 1);
  eq("4 tender-B mk", b[0].materialKey, "mat.wc_compact");
}

// 5 legacy without tenderId — BOM filter still applies
{
  const rows = listCostPanelMarketDemands(store, {
    tenderId: null,
    bomMaterialKeys: ["mat.eps_graph"],
  });
  ok("5 legacy eps", rows.some((d) => d.materialKey === "mat.eps_graph"));
  ok(
    "5 legacy umywalka hidden without tender",
    !rows.some((d) => d.materialKey === "mat.umywalka"),
  );
}

// 5b empty BOM + no tender → no key filter (all market-layer active)
{
  const rows = listCostPanelMarketDemands(store, {
    tenderId: "",
    bomMaterialKeys: [],
  });
  ok("5b no-tender empty BOM shows all market layer", rows.length >= 3);
}

// Panel source wiring
{
  const ui = readFileSync(resolve("src/app/expert-workspace/CostDetailsPanel.tsx"), "utf8");
  ok("panel S5 tender-scoped", ui.includes("S5 — tender-scoped visibility"));
  ok("panel skips BOM filter when tender", /if\s*\(\s*tid\s*\)/.test(ui));
  ok("panel no Quotes write", !/commitMarketQuotesImport/.test(ui));
  ok("panel no Purchase invent", !/purchaseByMaterialKey\s*=/.test(ui));
}

// Safety
{
  const ui = readFileSync(resolve("src/app/expert-workspace/CostDetailsPanel.tsx"), "utf8");
  const test = readFileSync(
    resolve("scripts/test-price-intelligence-demand-research-s5.mjs"),
    "utf8",
  );
  ok("0 fetch in test", !/\bfetch\s*\(/.test(test));
  ok("0 SQL", !/\bCREATE TABLE\b|\bSELECT\s+\*/i.test(ui));
  ok("0 Price KV invent", !/kw-price-memory|kw-market-quote-history/i.test(ui));
  ok("0 fuzzy", !/fuzzyMatch|fuse\.js|levenshtein/i.test(ui));
}

console.log(`\n=== S5 DONE: ${passed} PASS ===\n`);
