/**
 * CATALOG-COVERAGE-01 P0e OPS — FULL Seed (zaprawianie · folia · multiswitch) + Quotes REUSE.
 * DF: BIZ-P0e-1 Wariant A · 0 zmian Guard/Pack · SAFE untouched
 *
 * Dry-run: npx vite-node scripts/catalog-coverage-01-p0e-ops.mjs
 * Execute:  npx vite-node scripts/catalog-coverage-01-p0e-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const PRODUCT = new Set(["kb_pl", "interbud", "sekocenbud", "wgdom"]);

const SAFE_IDS = new Set([
  "cc-p0c-w1-zawor-odpowietrzajacy",
  "cc-p0c-w1-stop-ptakow",
]);

const FULL_WORKS = [
  {
    id: "cc-p0c-w1-zaprawianie-bruzd",
    tradeId: "PRZYGOTOWANIE",
    namePl: "Zaprawianie / zamurowanie bruzd",
    unit: "mb",
    companyPricePln: 35,
    legacyCategoryId: undefined,
    descriptionPl: "Zaprawianie lub zamurowanie bruzd instalacyjnych",
    keywords: ["zaprawianie bruzd", "zamurowanie bruzd"],
  },
  {
    id: "cc-p0c-w1-zabezpieczenie-folia",
    tradeId: "PRZYGOTOWANIE",
    namePl: "Zabezpieczenie powierzchni folią",
    unit: "m2",
    companyPricePln: 12,
    legacyCategoryId: undefined,
    descriptionPl: "Zabezpieczenie okien, drzwi, podłóg i stolarki folią ochronną",
    // frazy tylko — zakaz bare folia/foli
    keywords: [
      "zabezpieczenie okien folią",
      "zabezpieczenie podłóg folią",
      "zabezpieczenie stolarki folią",
    ],
  },
  {
    id: "cc-p0c-w1-multiswitch-antenowy",
    tradeId: "ELEKTRYKA",
    namePl: "Multiswitch antenowy",
    unit: "szt",
    companyPricePln: 420,
    legacyCategoryId: undefined,
    descriptionPl: "Montaż / instalowanie multiswitcha antenowego",
    keywords: ["multiswitch", "multiswitch antenowy"],
  },
];

const FULL_IDS = new Set(FULL_WORKS.map((w) => w.id));

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

function assertHygiene(spec) {
  const bannedBare = ["folia", "foli", "bruzd", "zaprawianie", "rtv", "sat"];
  for (const kw of spec.keywords) {
    const fold = kw
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    const tokens = fold.split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && bannedBare.includes(tokens[0])) {
      throw new Error(`H-2 FAIL bare keyword: ${kw}`);
    }
  }
  if (spec.legacyCategoryId) throw new Error(`H-1 FAIL legacyCategoryId on ${spec.id}`);
}

console.log("=== CATALOG-COVERAGE-01 P0e FULL OPS ===");
console.log(`mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · works=${FULL_WORKS.length}`);
for (const spec of FULL_WORKS) assertHygiene(spec);

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(kv.values?.["kw-wgdom-work-catalog"] ?? kv.values?.[0]);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-coverage-01-p0e-catalog-backup.json"),
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
const safeBefore = before.filter((w) => SAFE_IDS.has(w.id));
const fullBefore = before.filter((w) => FULL_IDS.has(w.id));
console.log(
  `Active before: ${before.length} · SAFE ${safeBefore.length}/2 · FULL already ${fullBefore.length}/3`,
);
if (safeBefore.length !== 2 || !safeBefore.every(hasProductQuotes)) {
  console.error("STOP: SAFE P0d-A missing — refuse P0e");
  process.exit(3);
}

for (const region of ["wroclaw", "dolnyslask"]) {
  const slice = store.catalogs[region];
  const byId = new Map(slice.works.map((w) => [w.id, w]));
  for (const spec of FULL_WORKS) {
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
  // SAFE must remain byte-stable except we do not touch their entries
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

const newIds = FULL_WORKS.map((w) => w.id);
const csvLines = ["workId,origin,region,price,updatedAt,confidence"];
for (const spec of FULL_WORKS) {
  csvLines.push(`${spec.id},wgdom,wroclaw,${spec.companyPricePln},${TS},0.92`);
}
const csvPath = path.join(OUT, "catalog-coverage-01-p0e-quotes.csv");
fs.writeFileSync(csvPath, `${csvLines.join("\n")}\n`, "utf8");

const preview = previewMarketCsvImport(`${csvLines.join("\n")}\n`, {
  fallbackUpdatedAt: TS,
  defaultOrigin: "wgdom",
});
console.log("PREVIEW:", preview.summary);
const matchedFull = new Set(preview.matched.map((r) => r.workId).filter((id) => newIds.includes(id)));
if (matchedFull.size < newIds.length) {
  console.error("STOP: preview incomplete", { matched: [...matchedFull], need: newIds });
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
const full = after.filter((w) => newIds.includes(w.id));
const quotes = full.filter(hasProductQuotes).length;
const safeAfter = after.filter((w) => SAFE_IDS.has(w.id));
const badLegacy = full.filter((w) => w.legacyCategoryId != null);
console.log(
  `FULL ${full.length}/3 · Quotes ${quotes}/3 · SAFE ${safeAfter.length}/2 · legacyCategory ${badLegacy.length}`,
);
if (full.length !== 3 || quotes !== 3) {
  console.error("STOP: FULL/Quotes gate");
  process.exit(4);
}
if (safeAfter.length !== 2 || !safeAfter.every(hasProductQuotes)) {
  console.error("STOP: SAFE regression");
  process.exit(4);
}
if (badLegacy.length) {
  console.error("STOP: H-1 legacyCategoryId present", badLegacy.map((w) => w.id));
  process.exit(4);
}

const payload = JSON.parse(JSON.stringify(working));
fs.writeFileSync(
  path.join(OUT, "catalog-coverage-01-p0e-catalog-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(kv2.values?.["kw-wgdom-work-catalog"] ?? kv2.values?.[0]);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = loadWorkCatalogStoreLocal();
const cloudFull = listActiveWorksForRegion(cloudStore, "wroclaw").filter((w) =>
  newIds.includes(w.id),
);
const cloudQ = cloudFull.filter(hasProductQuotes).length;
console.log(`CLOUD FULL ${cloudFull.length}/3 · Quotes ${cloudQ}/3`);
if (cloudQ !== 3) process.exit(5);

fs.writeFileSync(
  path.join(OUT, "catalog-coverage-01-p0e-ops-report.json"),
  JSON.stringify(
    {
      at: TS,
      mode: "EXECUTE",
      fullIds: newIds,
      quotes,
      cloudQuotes: cloudQ,
      safePreserved: safeAfter.length === 2,
      commitStatus: commitReport.status,
      bizP0e1: "A",
    },
    null,
    2,
  ),
);
console.log("\n=== P0e FULL OPS COMPLETE ===");
