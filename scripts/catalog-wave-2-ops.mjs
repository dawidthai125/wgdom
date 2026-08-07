/**
 * CATALOG-WAVE-2 OPS — DATA FIRST seed (8 Product IDs) + Quotes REUSE.
 * DF: CATALOG-WAVE-2 · TOP100 only · 0 AI-COST/Bid/S4
 *
 * Dry-run: npx vite-node scripts/catalog-wave-2-ops.mjs
 * Execute:  npx vite-node scripts/catalog-wave-2-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const PRODUCT = new Set(["kb_pl", "interbud", "sekocenbud", "wgdom"]);

/** Wave1 SAFE/FULL — regression gate (must stay). */
const WAVE1_IDS = new Set([
  "cc-p0c-w1-zawor-odpowietrzajacy",
  "cc-p0c-w1-stop-ptakow",
  "cc-p0c-w1-zaprawianie-bruzd",
  "cc-p0c-w1-zabezpieczenie-folia",
  "cc-p0c-w1-multiswitch-antenowy",
]);

const W2_WORKS = [
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.przebijanie_otworow,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Przebijanie otworów w ścianach/stropach",
    unit: "szt",
    companyPricePln: 85,
    descriptionPl: "Mechaniczne przebijanie otworów w ścianach lub stropach",
    keywords: [], // Alias-only Product — Core keywords OFF (POST-OV FIX)
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow,
    tradeId: "ELEKTRYKA",
    namePl: "Mocowanie aparatów na gotowym podłożu",
    unit: "szt",
    companyPricePln: 45,
    descriptionPl: "Mocowanie aparatów / przykręcanie drobnych elementów na gotowym podłożu",
    keywords: [],
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.przygotowanie_pod_osprzet,
    tradeId: "ELEKTRYKA",
    namePl: "Przygotowanie podłoża pod osprzęt / aparaty",
    unit: "szt",
    companyPricePln: 38,
    descriptionPl: "Przygotowanie podłoża pod mocowanie osprzętu — ślepe otwory, kołki",
    keywords: [],
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.wykwity_zacieki,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Skasowanie wykwitów / zacieków",
    unit: "m2",
    companyPricePln: 28,
    descriptionPl: "Skasowanie wykwitów (zacieków) z powierzchni",
    keywords: [],
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Oczyszczenie / zmywanie podłoża",
    unit: "m2",
    companyPricePln: 18,
    descriptionPl: "Oczyszczenie i zmywanie podłoża / powierzchni muru",
    keywords: [],
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.plyta_gk_zabudowa,
    tradeId: "SCIANY_GK",
    namePl: "Obudowa belek/słupów płytami GK",
    unit: "m2",
    companyPricePln: 95,
    descriptionPl: "Obudowa belek i słupów płytami gipsowo-kartonowymi na rusztach",
    keywords: [],
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.zawor_odcinajacy_15,
    tradeId: "HYDRAULIKA",
    namePl: "Zawór odcinający (mywalka / zlew / bojler)",
    unit: "szt",
    companyPricePln: 55,
    descriptionPl: "Zawory odcinające pod mywalką, zlewem, bojlerem",
    keywords: [],
  },
  {
    id: CATALOG_WAVE2_PRODUCT_IDS.wykucie_wnek,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Wykucie wnęk w murze",
    unit: "szt",
    companyPricePln: 120,
    descriptionPl: "Wykucie wnęk o zadanej głębokości w ścianach z cegieł",
    keywords: [],
  },
];

const W2_IDS = new Set(W2_WORKS.map((w) => w.id));

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
  return {
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
}

console.log("=== CATALOG-WAVE-2 OPS ===");
console.log(`mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · works=${W2_WORKS.length}`);
console.log("Product IDs:", [...W2_IDS].join(", "));

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(kv.values?.["kw-wgdom-work-catalog"] ?? kv.values?.[0] ?? Object.values(kv.values ?? {})[0]);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-wave-2-catalog-backup.json"),
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
const wave1Before = before.filter((w) => WAVE1_IDS.has(w.id));
const w2Before = before.filter((w) => W2_IDS.has(w.id));
console.log(
  `Active before: ${before.length} · Wave1 ${wave1Before.length}/5 · W2 already ${w2Before.length}/8`,
);
if (wave1Before.length < 5 || !wave1Before.every(hasProductQuotes)) {
  console.error("STOP: Wave1 Library/Quotes incomplete — refuse Wave2 seed");
  process.exit(3);
}

for (const region of ["wroclaw", "dolnyslask"]) {
  const slice = store.catalogs[region];
  const byId = new Map(slice.works.map((w) => [w.id, w]));
  for (const spec of W2_WORKS) {
    const prev = byId.get(spec.id);
    if (prev) {
      const next = {
        ...prev,
        namePl: spec.namePl,
        descriptionPl: spec.descriptionPl,
        keywords: spec.keywords,
        companyPricePln: spec.companyPricePln,
        tradeId: spec.tradeId,
        unit: spec.unit,
        active: true,
        updatedAt: TS,
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
        works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
        updatedAt: TS,
      },
    },
    updatedAt: TS,
  };
}

store = normalizeWorkCatalogStore(store);
saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });

const newIds = W2_WORKS.map((w) => w.id);
const csvLines = ["workId,origin,region,price,updatedAt,confidence"];
for (const spec of W2_WORKS) {
  csvLines.push(`${spec.id},wgdom,wroclaw,${spec.companyPricePln},${TS},0.92`);
}
const csvPath = path.join(OUT, "catalog-wave-2-quotes.csv");
fs.writeFileSync(csvPath, `${csvLines.join("\n")}\n`, "utf8");

const preview = previewMarketCsvImport(`${csvLines.join("\n")}\n`, {
  fallbackUpdatedAt: TS,
  defaultOrigin: "wgdom",
});
console.log("PREVIEW:", preview.summary);
const matchedW2 = new Set(preview.matched.map((r) => r.workId).filter((id) => newIds.includes(id)));
if (matchedW2.size < newIds.length) {
  console.error("STOP: preview incomplete", { matched: [...matchedW2], need: newIds });
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
const w2 = after.filter((w) => newIds.includes(w.id));
const quotes = w2.filter(hasProductQuotes).length;
const wave1After = after.filter((w) => WAVE1_IDS.has(w.id));
const badLegacy = w2.filter((w) => w.legacyCategoryId != null);
console.log(
  `W2 ${w2.length}/8 · Quotes ${quotes}/8 · Wave1 ${wave1After.length}/5 · legacyCategory ${badLegacy.length}`,
);
if (w2.length !== 8 || quotes !== 8) {
  console.error("STOP: W2/Quotes gate");
  process.exit(4);
}
if (wave1After.length < 5 || !wave1After.every(hasProductQuotes)) {
  console.error("STOP: Wave1 regression");
  process.exit(4);
}
if (badLegacy.length) {
  console.error("STOP: legacyCategoryId present", badLegacy.map((w) => w.id));
  process.exit(4);
}

const payload = JSON.parse(JSON.stringify(working));
fs.writeFileSync(
  path.join(OUT, "catalog-wave-2-catalog-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(kv2.values?.["kw-wgdom-work-catalog"] ?? Object.values(kv2.values ?? {})[0]);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = loadWorkCatalogStoreLocal();
const cloudW2 = listActiveWorksForRegion(cloudStore, "wroclaw").filter((w) => newIds.includes(w.id));
const cloudQ = cloudW2.filter(hasProductQuotes).length;
console.log(`CLOUD W2 ${cloudW2.length}/8 · Quotes ${cloudQ}/8`);
if (cloudQ !== 8) process.exit(5);

fs.writeFileSync(
  path.join(OUT, "catalog-wave-2-ops-report.json"),
  JSON.stringify(
    {
      at: TS,
      mode: "EXECUTE",
      w2Ids: newIds,
      quotes,
      cloudQuotes: cloudQ,
      wave1Preserved: wave1After.length >= 5,
      commitStatus: commitReport.status,
    },
    null,
    2,
  ),
);
console.log("\n=== CATALOG-WAVE-2 OPS COMPLETE ===");
