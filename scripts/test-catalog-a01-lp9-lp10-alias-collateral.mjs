/**
 * IK A01 — LP9/LP10 alias collateral verification (fixture + prod read-only).
 * npx vite-node scripts/test-catalog-a01-lp9-lp10-alias-collateral.mjs
 *
 * Contracts:
 * - IN-MEMORY FIXTURE (both quoted / pre-seed impregnacja): regression coverage
 * - CURRENT PRODUCTION POST-SEED: read-only batch-get against prod KV
 */
import { loadEnv } from "vite";
import {
  CATALOG_WAVE2_IMPREGNACJA_PRODUCT_ID,
  CATALOG_WAVE2_PRODUCT_IDS,
  resolveCatalogCoverageAlias,
} from "../src/lib/catalog-coverage/index.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { normalizeWorkCatalogStore, saveWorkCatalogStoreLocal, loadWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";
import { listActiveWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { isCenyMaterialow01Enabled } from "../src/lib/ceny-materialow-01-flag.ts";

const LP9 = "Przygotowanie i naprawa podłoża-oczyszczenie powierzchni muru";
const LP10 = "Impregnacja biobójcza ręczna m2 d.1.1 0103-01 Krotność = 2 poz.8";
const OCZ = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;
const IMP = CATALOG_WAVE2_IMPREGNACJA_PRODUCT_ID;

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

function baseLine(lp, description) {
  return {
    id: `obl_${lp}`,
    lp: String(lp),
    description,
    unit: "m2",
    quantity: 10,
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
  };
}

function mapAndIdentity(description, works) {
  const mapped = mapOfferBoqLine(baseLine("x", description), {
    works,
    mappedAt: new Date().toISOString(),
    cenyMaterialowUplift: isCenyMaterialow01Enabled(),
  });
  const identity = resolveWorkIdentityFromOfferBoqLine(mapped);
  return { mapped, identity };
}

// --- Fixture works (Wave2-style quotes on both targets) ---
function fixtureWorksBothQuoted() {
  const mk = (id, namePl, price) => ({
    id,
    namePl,
    unit: "m2",
    active: true,
    tradeId: "PRZYGOTOWANIE",
    keywords: [],
    companyPricePln: price,
    marketQuotes: {
      wgdom: { wroclaw: { price, confidence: 0.92, origin: "wgdom", updatedAt: "2026-08-24T00:00:00.000Z" } },
    },
    updatedAt: "2026-08-24T00:00:00.000Z",
    freshnessStatus: "ok",
    favorite: false,
    usageCount: 0,
    source: "custom",
  });
  return [mk(OCZ, "Oczyszczenie / zmywanie podłoża", 18), mk(IMP, "Impregnacja biobójcza ręczna", 22)];
}

/** PRE-SEED FIXTURE: LP9 quoted, impregnacja work present but without useful quotes. */
function fixtureWorksLp9QuotedImpUnquoted() {
  const mk = (id, namePl, price, withQuotes) => ({
    id,
    namePl,
    unit: "m2",
    active: true,
    tradeId: "PRZYGOTOWANIE",
    keywords: [],
    companyPricePln: price,
    ...(withQuotes
      ? {
          marketQuotes: {
            wgdom: {
              wroclaw: { price, confidence: 0.92, origin: "wgdom", updatedAt: "2026-08-24T00:00:00.000Z" },
            },
          },
        }
      : {}),
    updatedAt: "2026-08-24T00:00:00.000Z",
    freshnessStatus: "ok",
    favorite: false,
    usageCount: 0,
    source: "custom",
  });
  return [mk(OCZ, "Oczyszczenie / zmywanie podłoża", 18, true), mk(IMP, "Impregnacja biobójcza ręczna", 22, false)];
}

console.log("=== A01 LP9/LP10 ALIAS COLLATERAL ===\n");

console.log("--- IN-MEMORY FIXTURE: both targets quoted ---\n");

const quoted = fixtureWorksBothQuoted();
const a9 = resolveCatalogCoverageAlias({ description: LP9, works: quoted, requireQuotes: true });
const a10 = resolveCatalogCoverageAlias({ description: LP10, works: quoted, requireQuotes: true });
ok("LP9 alias rule", a9.aliasRuleId === "oczyszczenie_podloza", a9);
ok("LP9 resolved", a9.resolvedProductId === OCZ, a9);
ok("LP10 alias rule", a10.aliasRuleId === "impregnacja_biobojcza", a10);
ok("LP10 resolved (both quoted fixture)", a10.resolvedProductId === IMP, a10);
ok("LP10 not oczyszczenie rule", a10.aliasRuleId !== "oczyszczenie_podloza", a10);
ok("LP9 not impregnacja rule", a9.aliasRuleId !== "impregnacja_biobojcza", a9);

const m9q = mapAndIdentity(LP9, quoted);
ok("LP9 mapper catalogWorkId", m9q.mapped.catalogWorkId === OCZ, m9q.mapped);
ok("LP9 mapper alias", m9q.mapped.matchMethod === "alias", m9q.mapped);
ok("LP9 identity OK", m9q.identity.status === "OK" && m9q.identity.workId === OCZ, m9q.identity);

const m10q = mapAndIdentity(LP10, quoted);
ok("LP10 mapper catalogWorkId (quoted fixture)", m10q.mapped.catalogWorkId === IMP, m10q.mapped);
ok("LP10 mapper alias (quoted fixture)", m10q.mapped.matchMethod === "alias", m10q.mapped);
ok("LP10 identity OK (quoted fixture)", m10q.identity.status === "OK" && m10q.identity.workId === IMP, m10q.identity);

console.log("\n--- IN-MEMORY FIXTURE: PRE-SEED impregnacja without quotes ---\n");
const preSeed = fixtureWorksLp9QuotedImpUnquoted();
const a10Pre = resolveCatalogCoverageAlias({ description: LP10, works: preSeed, requireQuotes: true });
ok("PRE-SEED LP10 alias rule (textual)", a10Pre.aliasRuleId === "impregnacja_biobojcza", a10Pre);
ok("PRE-SEED LP10 not oczyszczenie rule", a10Pre.aliasRuleId !== "oczyszczenie_podloza", a10Pre);
ok(
  "PRE-SEED LP10 Quotes gate blocks bind",
  a10Pre.missingQuotes === true && !a10Pre.resolvedProductId,
  a10Pre,
);
const m10Pre = mapAndIdentity(LP10, preSeed);
ok(
  "PRE-SEED LP10 mapper Core fallback (no alias bind)",
  m10Pre.mapped.catalogWorkId === IMP && m10Pre.mapped.matchMethod !== "alias",
  m10Pre.mapped,
);

// CURRENT PRODUCTION POST-SEED: read-only batch-get
Object.assign(process.env, loadEnv("", process.cwd(), ""));
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (anon) {
  const kv = await (
    await fetch(
      `https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/batch-get`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anon}`,
          apikey: anon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keys: ["kw-wgdom-work-catalog"] }),
      },
    )
  ).json();
  const catalog =
    typeof kv.values?.["kw-wgdom-work-catalog"] === "string"
      ? JSON.parse(kv.values["kw-wgdom-work-catalog"])
      : kv.values?.["kw-wgdom-work-catalog"] ??
        (typeof kv.values?.[0] === "string" ? JSON.parse(kv.values[0]) : kv.values?.[0]);
  if (catalog) {
    console.log("\n--- CURRENT PRODUCTION POST-SEED (read-only) ---\n");
    saveWorkCatalogStoreLocal(normalizeWorkCatalogStore(catalog));
    const store = loadWorkCatalogStoreLocal();
    const prodWorks = listActiveWorksForRegion(store, store.activeRegion);
    const a9prod = resolveCatalogCoverageAlias({
      description: LP9,
      works: prodWorks,
      requireQuotes: true,
    });
    const a10prod = resolveCatalogCoverageAlias({
      description: LP10,
      works: prodWorks,
      requireQuotes: true,
    });
    const m9prod = mapAndIdentity(LP9, prodWorks);
    const m10prod = mapAndIdentity(LP10, prodWorks);
    ok("LP9 prod alias rule", a9prod.aliasRuleId === "oczyszczenie_podloza", a9prod);
    ok("LP9 prod resolved", a9prod.resolvedProductId === OCZ, a9prod);
    ok("LP9 prod identity OK", m9prod.identity.status === "OK" && m9prod.identity.workId === OCZ, m9prod.identity);
    ok("LP10 prod alias rule", a10prod.aliasRuleId === "impregnacja_biobojcza", a10prod);
    ok("LP10 prod not oczyszczenie rule", a10prod.aliasRuleId !== "oczyszczenie_podloza", a10prod);
    ok("LP10 prod resolved post-seed", a10prod.resolvedProductId === IMP, a10prod);
    ok("LP10 prod Quotes gate open", a10prod.missingQuotes === false, a10prod);
    ok(
      "LP10 prod mapper alias bind",
      m10prod.mapped.catalogWorkId === IMP && m10prod.mapped.matchMethod === "alias",
      m10prod.mapped,
    );
    ok(
      "LP10 prod identity OK",
      m10prod.identity.status === "OK" && m10prod.identity.workId === IMP,
      m10prod.identity,
    );
  } else {
    console.log("SKIP prod KV read (no catalog in response)");
  }
} else {
  console.log("SKIP prod KV read (no VITE_SUPABASE_ANON_KEY)");
}

console.log(`\n=== WYNIK: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
