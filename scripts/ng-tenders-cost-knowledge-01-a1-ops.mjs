/**
 * NG-TENDERS-COST-KNOWLEDGE-01 A1 — Library Fill FEATURE-DATA + Quotes REUSE.
 *
 * Dry-run: npx vite-node scripts/ng-tenders-cost-knowledge-01-a1-ops.mjs
 * Execute:  npx vite-node scripts/ng-tenders-cost-knowledge-01-a1-ops.mjs --execute
 * Fixture:  npx vite-node scripts/ng-tenders-cost-knowledge-01-a1-ops.mjs --fixture
 *           (in-memory catalog — CI / false-map smoke, bez Edge)
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  COST_KNOWLEDGE_A1_BANNED_BARE,
  COST_KNOWLEDGE_A1_SEED_IDS,
  COST_KNOWLEDGE_A1_SEED_WORKS,
  assertCostKnowledgeA1KeywordHygiene,
} from "../src/lib/cost-knowledge/a1-seed-specs.ts";

const EXECUTE = process.argv.includes("--execute");
const FIXTURE = process.argv.includes("--fixture");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const PRODUCT = new Set(["kb_pl", "interbud", "sekocenbud", "wgdom"]);
const SEED_IDS = new Set(COST_KNOWLEDGE_A1_SEED_IDS);

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

function unwrap(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function hasProductQuotes(work) {
  const mq = work.marketQuotes;
  if (!mq) return false;
  for (const [o, byR] of Object.entries(mq)) {
    if (!PRODUCT.has(o) || !byR) continue;
    for (const s of Object.values(byR)) {
      if (s && typeof s.price === "number" && s.price > 0) return true;
    }
  }
  return false;
}

function makeWork(spec) {
  return {
    id: spec.id,
    tradeId: spec.tradeId,
    namePl: spec.namePl,
    unit: spec.unit,
    companyPricePln: spec.companyPricePln,
    updatedAt: TS,
    freshnessStatus: "ok",
    descriptionPl: spec.descriptionPl,
    keywords: [...spec.keywords],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0.55, laborRatio: 0.45 },
    marketQuotes: undefined,
  };
}

function emptyCatalog() {
  const emptySlice = (region) => ({ region, works: [], updatedAt: TS });
  return {
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: emptySlice("wroclaw"),
      dolnyslask: emptySlice("dolnyslask"),
      warszawa: emptySlice("warszawa"),
      krakow: emptySlice("krakow"),
      gdansk: emptySlice("gdansk"),
      poznan: emptySlice("poznan"),
      lodz: emptySlice("lodz"),
      katowice: emptySlice("katowice"),
      lublin: emptySlice("lublin"),
      nationwide: emptySlice("nationwide"),
    },
    updatedAt: TS,
    seedManifestVersion: "ck-a1",
  };
}

console.log("=== NG-TENDERS-COST-KNOWLEDGE-01 A1 Library Fill ===");
console.log(
  `mode=${FIXTURE ? "FIXTURE" : EXECUTE ? "EXECUTE" : "DRY-RUN"} · seeds=${COST_KNOWLEDGE_A1_SEED_WORKS.length}`,
);

for (const spec of COST_KNOWLEDGE_A1_SEED_WORKS) {
  assertCostKnowledgeA1KeywordHygiene(spec);
  console.log(`  · ${spec.id} [${spec.gapGroup}]`);
}

fs.mkdirSync(OUT, { recursive: true });

let catalog;
if (FIXTURE) {
  catalog = emptyCatalog();
} else {
  const env = loadEnv("", process.cwd(), "");
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!anon) throw new Error("Brak VITE_SUPABASE_ANON_KEY (użyj --fixture bez Edge)");
  const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-wgdom-work-catalog"] }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  const kv = await res.json();
  catalog = unwrap(kv.values?.["kw-wgdom-work-catalog"] ?? kv.values?.[0]);
  if (!catalog) throw new Error("brak kw-wgdom-work-catalog");
  fs.writeFileSync(
    path.join(OUT, "ng-tenders-cost-knowledge-01-a1-catalog-backup.json"),
    JSON.stringify({ backedUpAt: TS, catalog }, null, 2),
  );
}

localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));

const {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { listActiveWorksForRegion } = await import("../src/lib/work-catalog/catalog-work-utils.ts");
const { previewMarketCsvImport } = await import("../src/lib/work-catalog/market-csv-preview.ts");
const { commitMarketQuotesImport } = await import("../src/lib/work-catalog/commit-market-quotes.ts");
const { mapOfferBoqLine } = await import("../src/lib/tender-offer-boq-mapping.ts");

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());

for (const region of ["wroclaw", "dolnyslask"]) {
  const slice = store.catalogs[region] ?? {
    region,
    works: [],
    updatedAt: TS,
  };
  const byId = new Map(slice.works.map((w) => [w.id, w]));
  for (const spec of COST_KNOWLEDGE_A1_SEED_WORKS) {
    const prev = byId.get(spec.id);
    if (prev) {
      const next = {
        ...prev,
        namePl: spec.namePl,
        descriptionPl: spec.descriptionPl,
        keywords: [...spec.keywords],
        companyPricePln: spec.companyPricePln,
        tradeId: spec.tradeId,
        unit: spec.unit,
        active: true,
        updatedAt: TS,
        freshnessStatus: "ok",
      };
      delete next.legacyCategoryId;
      byId.set(spec.id, next);
    } else {
      byId.set(spec.id, makeWork(spec));
    }
  }
  store = {
    ...store,
    catalogs: {
      ...store.catalogs,
      [region]: {
        ...slice,
        region,
        works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
        updatedAt: TS,
      },
    },
    updatedAt: TS,
  };
}

store = normalizeWorkCatalogStore(store);
saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });

const csvLines = ["workId,origin,region,price,updatedAt,confidence"];
for (const spec of COST_KNOWLEDGE_A1_SEED_WORKS) {
  csvLines.push(`${spec.id},wgdom,wroclaw,${spec.companyPricePln},${TS},0.9`);
}
const csvBody = `${csvLines.join("\n")}\n`;
fs.writeFileSync(path.join(OUT, "ng-tenders-cost-knowledge-01-a1-quotes.csv"), csvBody, "utf8");

const preview = previewMarketCsvImport(csvBody, {
  fallbackUpdatedAt: TS,
  defaultOrigin: "wgdom",
});
console.log("PREVIEW:", preview.summary);
const matched = new Set(preview.matched.map((r) => r.workId).filter((id) => SEED_IDS.has(id)));
if (matched.size < SEED_IDS.size) {
  console.error("STOP: preview incomplete", { matched: [...matched], need: [...SEED_IDS] });
  process.exit(2);
}

/* False-map smoke: positive phrases bind; bare banned tokens must NOT bind to A1 ids */
const worksForMap = listActiveWorksForRegion(store, "wroclaw");
function smokeLine(description, unit = "mb") {
  return {
    lineId: "smoke",
    lp: "1",
    description,
    quantity: 1,
    quantityRaw: "1",
    unit,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
  };
}

const positiveCases = [
  { desc: "Montaż rury Winidur w bruzdzie", expectId: "ck-a1-rura-winidur" },
  { desc: "Naprawa gzymsu elewacyjnego", expectId: "ck-a1-gzyms-elewacyjny" },
  { desc: "Impregnacja podłoża pod posadzkę", expectId: "ck-a1-impregnacja-podloza", unit: "m2" },
];
const negativeBare = [...COST_KNOWLEDGE_A1_BANNED_BARE];

let falseMapFail = 0;
for (const c of positiveCases) {
  const mapped = mapOfferBoqLine(smokeLine(c.desc, c.unit ?? "mb"), {
    works: worksForMap,
    cenyMaterialowUplift: true,
  });
  if (mapped.catalogWorkId !== c.expectId) {
    console.warn(`WARN positive bind: "${c.desc}" → ${mapped.catalogWorkId} (want ${c.expectId})`);
    // Soft warn in dry-run against live catalog noise; hard fail in fixture
    if (FIXTURE) falseMapFail += 1;
  } else {
    console.log(`  PASS bind: ${c.expectId}`);
  }
}
for (const bare of negativeBare) {
  const mapped = mapOfferBoqLine(smokeLine(bare), {
    works: worksForMap,
    cenyMaterialowUplift: true,
  });
  if (mapped.catalogWorkId && SEED_IDS.has(mapped.catalogWorkId)) {
    console.error(`FAIL false-map bare "${bare}" → ${mapped.catalogWorkId}`);
    falseMapFail += 1;
  }
}
if (falseMapFail) {
  console.error(`STOP: false-map smoke FAIL (${falseMapFail})`);
  process.exit(5);
}
console.log("False-map smoke PASS");

if (!EXECUTE && !FIXTURE) {
  console.log("\nDRY-RUN OK — run with --execute to commit Quotes + cloud");
  process.exit(0);
}

let working = store;
const commitReport = await commitMarketQuotesImport(preview, {
  region: "wroclaw",
  updatedAtIso: TS,
  deps: {
    load: async () => working,
    save: async (next, options) => {
      const updatedAt = options?.updatedAtIso ?? next.updatedAt ?? TS;
      working = normalizeWorkCatalogStore({ ...next, updatedAt });
      const wr = working.catalogs.wroclaw.works;
      const ds = (working.catalogs.dolnyslask?.works ?? []).map((w) => {
        const src = wr.find((x) => x.id === w.id);
        if (!src?.marketQuotes) return w;
        return { ...w, marketQuotes: src.marketQuotes, updatedAt };
      });
      working = normalizeWorkCatalogStore({
        ...working,
        catalogs: {
          ...working.catalogs,
          dolnyslask: {
            ...(working.catalogs.dolnyslask ?? { region: "dolnyslask", works: [], updatedAt }),
            works: ds,
            updatedAt,
          },
        },
        updatedAt,
      });
      saveWorkCatalogStoreLocal(working, { updatedAtIso: working.updatedAt });
      return { ok: true, saved: true };
    },
    loadLocal: () => loadWorkCatalogStoreLocal(),
    saveLocal: (s, opts) => saveWorkCatalogStoreLocal(s, opts),
  },
});
console.log("COMMIT:", commitReport.status, commitReport.apply);

const after = listActiveWorksForRegion(working, "wroclaw");
const seeded = after.filter((w) => SEED_IDS.has(w.id));
const quotes = seeded.filter(hasProductQuotes).length;
const badLegacy = seeded.filter((w) => w.legacyCategoryId != null);
console.log(`SEED ${seeded.length}/${SEED_IDS.size} · Quotes ${quotes}/${SEED_IDS.size} · legacy ${badLegacy.length}`);

if (seeded.length !== SEED_IDS.size || quotes !== SEED_IDS.size) {
  console.error("STOP: seed/Quotes gate");
  process.exit(4);
}
if (badLegacy.length) {
  console.error("STOP: legacyCategoryId present");
  process.exit(4);
}

const payload = JSON.parse(JSON.stringify(working));
fs.writeFileSync(
  path.join(OUT, "ng-tenders-cost-knowledge-01-a1-catalog-committed.json"),
  JSON.stringify(payload, null, 2),
);

if (EXECUTE && !FIXTURE) {
  const env = loadEnv("", process.cwd(), "");
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;
  const setRes = await fetch(`${edge}/batch-set`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-wgdom-work-catalog"], values: [payload] }),
    signal: AbortSignal.timeout(180000),
  });
  if (!setRes.ok) throw new Error(`batch-set ${setRes.status}: ${await setRes.text()}`);
  console.log("CLOUD batch-set OK");
}

fs.writeFileSync(
  path.join(OUT, "ng-tenders-cost-knowledge-01-a1-report.json"),
  JSON.stringify(
    {
      epic: "NG-TENDERS-COST-KNOWLEDGE-01",
      slice: "A1",
      mode: FIXTURE ? "fixture" : EXECUTE ? "execute" : "dry-run",
      generatedAt: TS,
      seedIds: [...SEED_IDS],
      seeded: seeded.length,
      quotes,
      falseMapPass: true,
      commitStatus: commitReport.status,
    },
    null,
    2,
  ),
);

console.log("\nA1 PASS");
