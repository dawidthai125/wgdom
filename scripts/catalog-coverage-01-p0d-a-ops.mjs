/**
 * CATALOG-COVERAGE-01 P0d-A OPS — SAFE Seed (zawór + stop ptaków) + Quotes REUSE.
 * DF: tylko 2 ID · P0e OUT · commitMarketQuotesImport
 *
 * Dry-run: npx vite-node scripts/catalog-coverage-01-p0d-a-ops.mjs
 * Execute:  npx vite-node scripts/catalog-coverage-01-p0d-a-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const PRODUCT = new Set(["kb_pl", "interbud", "sekocenbud", "wgdom"]);
const P0E_IDS = new Set([
  "cc-p0c-w1-zaprawianie-bruzd",
  "cc-p0c-w1-zabezpieczenie-folia",
  "cc-p0c-w1-multiswitch-antenowy",
]);

const SAFE_WORKS = [
  {
    id: "cc-p0c-w1-zawor-odpowietrzajacy",
    tradeId: "HYDRAULIKA",
    // Bez „zawor”/„instalacji” w name (Core token + category false)
    namePl: "Odpowietrznik automatyczny CO",
    unit: "szt",
    companyPricePln: 28,
    // Bez legacyCategoryId — categoryHit+unitHit wiązało dowolne szt z INSTALACJE_CO
    legacyCategoryId: undefined,
    descriptionPl: "Odpowietrznik automatyczny typu zaworu odpowietrzającego",
    keywords: ["zawór odpowietrzający", "odpowietrznik automatyczny"],
  },
  {
    id: "cc-p0c-w1-stop-ptakow",
    tradeId: "MONTAZ",
    namePl: "Kolce przeciwptasie (elewacja)",
    unit: "mb",
    companyPricePln: 45,
    legacyCategoryId: undefined,
    descriptionPl: "Kolce przeciwptasie na elewacji — ochrona przed ptakami",
    keywords: ["stop ptaków", "montaż stop ptaków", "kolce przeciw ptakom", "kolce przeciwptasie"],
  },
];

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

const env = loadEnv("", process.cwd(), "");
const anon = env.VITE_SUPABASE_ANON_KEY;
const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;

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

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  return res.json();
}

async function batchSet(keys, values) {
  const res = await fetch(`${edge}/batch-set`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys, values }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-set ${res.status}: ${await res.text()}`);
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
  const base = {
    id: spec.id,
    tradeId: spec.tradeId,
    namePl: spec.namePl,
    unit: spec.unit,
    companyPricePln: spec.companyPricePln,
    updatedAt: TS,
    freshnessStatus: "ok",
    descriptionPl: spec.descriptionPl,
    keywords: spec.keywords,
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0.6, laborRatio: 0.4 },
    marketQuotes: undefined,
  };
  if (spec.legacyCategoryId) base.legacyCategoryId = spec.legacyCategoryId;
  return base;
}

console.log("=== CATALOG-COVERAGE-01 P0d-A SAFE OPS ===");
console.log(`mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · works=${SAFE_WORKS.length}`);

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(kv.values?.["kw-wgdom-work-catalog"] ?? kv.values?.[0]);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");
fs.writeFileSync(
  path.join(OUT, "catalog-coverage-01-p0d-a-catalog-backup.json"),
  JSON.stringify({ backedUpAt: TS, catalog }, null, 2),
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));

const {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { listActiveWorksForRegion } = await import("../src/lib/work-catalog/catalog-work-utils.ts");
const { previewMarketCsvImport, commitMarketQuotesImport } = await import(
  "../src/lib/work-catalog/index.ts"
);

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const before = listActiveWorksForRegion(store, "wroclaw");
const p0eBefore = before.filter((w) => P0E_IDS.has(w.id));
console.log(`Active before: ${before.length} · P0e IDs present: ${p0eBefore.length} (must stay untouched)`);

for (const region of ["wroclaw", "dolnyslask"]) {
  const slice = store.catalogs[region];
  const byId = new Map(slice.works.map((w) => [w.id, w]));
  for (const spec of SAFE_WORKS) {
    const prev = byId.get(spec.id);
    if (prev) {
      byId.set(spec.id, {
        ...prev,
        namePl: spec.namePl,
        descriptionPl: spec.descriptionPl,
        keywords: spec.keywords,
        companyPricePln: spec.companyPricePln,
        tradeId: spec.tradeId,
        unit: spec.unit,
        legacyCategoryId: spec.legacyCategoryId,
        active: true,
        updatedAt: TS,
      });
      if (!spec.legacyCategoryId) {
        const next = byId.get(spec.id);
        delete next.legacyCategoryId;
        byId.set(spec.id, next);
      }
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
        works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
        updatedAt: TS,
      },
    },
    updatedAt: TS,
  };
}

store = normalizeWorkCatalogStore(store);
saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });

const newIds = SAFE_WORKS.map((w) => w.id);
const csvLines = ["workId,origin,region,price,updatedAt,confidence"];
for (const spec of SAFE_WORKS) {
  csvLines.push(`${spec.id},wgdom,wroclaw,${spec.companyPricePln},${TS},0.92`);
}
const csvPath = path.join(OUT, "catalog-coverage-01-p0d-a-quotes.csv");
fs.writeFileSync(csvPath, `${csvLines.join("\n")}\n`, "utf8");

const preview = previewMarketCsvImport(`${csvLines.join("\n")}\n`, {
  fallbackUpdatedAt: TS,
  defaultOrigin: "wgdom",
});
console.log("PREVIEW:", preview.summary);
const matchedSafe = new Set(preview.matched.map((r) => r.workId).filter((id) => newIds.includes(id)));
if (matchedSafe.size < newIds.length) {
  console.error("STOP: preview incomplete", { matched: [...matchedSafe], need: newIds });
  process.exit(2);
}

if (!EXECUTE) {
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
      const ds = working.catalogs.dolnyslask.works.map((w) => {
        const src = wr.find((x) => x.id === w.id);
        if (!src?.marketQuotes) return w;
        return { ...w, marketQuotes: src.marketQuotes, updatedAt };
      });
      working = normalizeWorkCatalogStore({
        ...working,
        catalogs: {
          ...working.catalogs,
          dolnyslask: { ...working.catalogs.dolnyslask, works: ds, updatedAt },
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
const safe = after.filter((w) => newIds.includes(w.id));
const quotes = safe.filter(hasProductQuotes).length;
const p0eAfter = after.filter((w) => P0E_IDS.has(w.id));
console.log(`SAFE ${safe.length}/2 · Quotes ${quotes}/2 · P0e IDs ${p0eAfter.length}`);
if (safe.length !== 2 || quotes !== 2) {
  console.error("STOP: SAFE/Quotes gate");
  process.exit(4);
}
if (p0eAfter.length !== p0eBefore.length) {
  console.error("STOP: P0e IDs changed unexpectedly");
  process.exit(4);
}

const payload = JSON.parse(JSON.stringify(working));
fs.writeFileSync(
  path.join(OUT, "catalog-coverage-01-p0d-a-catalog-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(kv2.values?.["kw-wgdom-work-catalog"] ?? kv2.values?.[0]);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = loadWorkCatalogStoreLocal();
const cloudSafe = listActiveWorksForRegion(cloudStore, "wroclaw").filter((w) => newIds.includes(w.id));
const cloudQ = cloudSafe.filter(hasProductQuotes).length;
console.log(`CLOUD SAFE ${cloudSafe.length}/2 · Quotes ${cloudQ}/2`);
if (cloudQ !== 2) process.exit(5);

fs.writeFileSync(
  path.join(OUT, "catalog-coverage-01-p0d-a-ops-report.json"),
  JSON.stringify(
    {
      at: TS,
      mode: "EXECUTE",
      safeIds: newIds,
      quotes,
      cloudQuotes: cloudQ,
      p0eUntouched: p0eAfter.length === p0eBefore.length,
      commitStatus: commitReport.status,
    },
    null,
    2,
  ),
);
console.log("\n=== P0d-A SAFE OPS COMPLETE ===");
