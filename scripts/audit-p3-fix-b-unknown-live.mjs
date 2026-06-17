/**
 * P3-AUDIT-001-FIX-B — live UNKNOWN analysis (pipeline KV + user dict KV).
 * npx vite-node scripts/audit-p3-fix-b-unknown-live.mjs [--json out.json]
 */
import fs from "node:fs";
import { loadEnv } from "vite";
import {
  classifyAthLineCategory,
  classifyAthLineCategoryWithoutDictionary,
  foldPolishText,
} from "../src/lib/wgdom-ath-classifier.ts";
import {
  buildClassificationSummary,
  buildUnknownRows,
  buildUnknownPhraseHints,
} from "../src/lib/tender-classification-inspector.ts";
import {
  getUserClassificationDictionaryCache,
  mergeWgdomUserClassificationDictionaryStore,
  normalizeWgdomUserClassificationDictionaryStore,
  restoreDefaultUserClassificationDictionaryStore,
  setUserClassificationDictionaryCache,
} from "../src/lib/wgdom-user-classification-dictionary.ts";
import { findWgdomPhraseRule } from "../src/lib/wgdom-phrase-rules.ts";
import { getCatalogClassificationRules, defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { matchConstructionDictionary } from "../src/lib/wgdom-construction-dictionary.ts";
import { isLikelyCatalogQuantityRow } from "../src/lib/tender-catalog-quantity-filter.ts";

const env = loadEnv("", process.cwd(), "");
const OUT_JSON = process.argv.includes("--json")
  ? process.argv[process.argv.indexOf("--json") + 1]
  : null;

function isAthPrzedmiarSource(filename = "") {
  const f = filename.toLowerCase();
  if (/formularz.*ofert|zal\.\s*nr\s*1.*swz/i.test(f)) return false;
  return /\.ath$|przedmiar|kosztorys|sanitarny|zest\.ath/i.test(f);
}

function isLikelyQuantityRow(row) {
  return isLikelyCatalogQuantityRow(row.description ?? "");
}

async function fetchKvKey(key) {
  const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!anon) return null;
  const base = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: [key] }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.values?.[0] ?? j.values?.[key] ?? null;
}

async function loadPipeline() {
  const raw = await fetchKvKey("kw-tenders-pipeline");
  if (raw) {
    const items = Array.isArray(raw) ? raw : JSON.parse(String(raw));
    if (Array.isArray(items) && items.length > 0) {
      return { items, source: "live-kv" };
    }
  }
  const snapPath = "scripts/audit-cloud-archive-snapshot.json";
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
  return { items: snap["kw-tenders-pipeline"] || [], source: "snapshot" };
}

async function loadUserDict() {
  const raw = await fetchKvKey("kw-wgdom-classification-dictionary");
  if (raw) {
    return { store: normalizeWgdomUserClassificationDictionaryStore(raw), source: "live-kv" };
  }
  return { store: restoreDefaultUserClassificationDictionaryStore(), source: "empty" };
}

function collectCatalogRows(items) {
  const rows = [];
  for (const item of items) {
    const kosztorys = item.tenderDossier?.kosztorys;
    const catalogQuantities = kosztorys?.catalogQuantities;
    const sourceFile = kosztorys?.sourceFilename || kosztorys?.filename || "";
    const sourceType = /\.ath$/i.test(sourceFile) ? "ATH"
      : /pdf/i.test(sourceFile) ? "PDF"
        : /xlsx|xls/i.test(sourceFile) ? "XLSX"
          : isAthPrzedmiarSource(sourceFile) ? "ATH" : "OTHER";
    if (!Array.isArray(catalogQuantities)) continue;
    for (const line of catalogQuantities) {
      if (!isLikelyQuantityRow(line)) continue;
      rows.push({
        description: line.description,
        unit: line.unit,
        quantity: line.quantity,
        source: sourceType,
        tenderId: item.id,
        tenderTitle: item.title?.slice(0, 60),
      });
    }
  }
  return rows;
}

function whyUnknown(description, unit) {
  const hay = foldPolishText(description || "");
  if (!hay.trim()) return "empty-description";
  const rules = getCatalogClassificationRules(defaultWgdomCostCatalog());
  for (const rule of rules) {
    for (const kw of rule.keywords) {
      const k = foldPolishText(kw.trim());
      if (k && hay.includes(k.replace(/\.\*/g, ""))) return `seed:${rule.id}`;
    }
  }
  const cache = getUserClassificationDictionaryCache();
  for (const e of [...cache.entries].sort((a, b) => b.phrase.length - a.phrase.length)) {
    if (hay.includes(e.phrase)) return `user-dict:${e.category}`;
  }
  const phrase = findWgdomPhraseRule(hay);
  if (phrase) return `phrase:${phrase.category}`;
  const dict = matchConstructionDictionary(hay);
  if (dict) return `construction:${dict}`;
  const u = foldPolishText(unit || "");
  if (/drzwi|okno|osciezn/.test(hay) || (u === "szt" && /montaz/.test(hay))) return "stolarka-heuristic";
  return "unmatched";
}

function proposeCategory(description) {
  const hay = foldPolishText(description);
  if (/roboty towarzysz|roboty pomocnicz|roboty ogolne|roboty budowlane ogolne|roboty remontowe ogolne/.test(hay)) {
    return "ROBOTY_OGOLNOBUDOWLANE";
  }
  if (/roboty przygotowawc|przygotowanie stanowiska|zabezpieczenie pomieszczen|zabezpieczenie powierzchni/.test(hay)) {
    return "ROBOTY_OGOLNOBUDOWLANE";
  }
  if (/lamperi|listwa przypodlogowa|listwa podlogowa/.test(hay)) return "PODLOGI";
  if (/silikonowanie|wypelnienie dylatacji|dylatacja/.test(hay)) return "ROBOTY_OGOLNOBUDOWLANE";
  if (/montaz rolet|rolety/.test(hay)) return "STOLARKA";
  if (/wymiana klamek|klamka/.test(hay)) return "STOLARKA";
  if (/odkurzanie|sprzatanie po robotach|utrzymanie czystosci/.test(hay)) return "ROBOTY_OGOLNOBUDOWLANE";
  return null;
}

async function run() {
  const { items, source: pipelineSource } = await loadPipeline();
  const { store: userDictLive, source: dictSource } = await loadUserDict();

  const emptyCache = restoreDefaultUserClassificationDictionaryStore();

  function runPass(cacheLabel, userDictStore) {
    setUserClassificationDictionaryCache(userDictStore);
    const rows = collectCatalogRows(items);
    let unknown = 0;
    const unknownByDesc = new Map();

    for (const row of rows) {
      const cat = classifyAthLineCategory(row.description, row.unit);
      if (cat !== "UNKNOWN") continue;
      unknown += 1;
      const key = foldPolishText(row.description).slice(0, 120);
      const prev = unknownByDesc.get(key) || {
        count: 0,
        qty: 0,
        sources: new Set(),
        example: row.description,
        unit: row.unit,
      };
      prev.count += 1;
      prev.qty += parseFloat(String(row.quantity || "0").replace(",", ".")) || 0;
      prev.sources.add(row.source);
      unknownByDesc.set(key, prev);
    }

    const total = rows.length;
    return {
      cacheLabel,
      userDictEntries: userDictStore.entries.length,
      totalRows: total,
      unknownRows: unknown,
      classifiedRows: total - unknown,
      unknownPercent: total > 0 ? (unknown / total) * 100 : 0,
      unknownByDesc,
    };
  }

  const withoutDict = runPass("empty-cache", emptyCache);
  const withLiveDict = runPass("live-user-dict", userDictLive);

  setUserClassificationDictionaryCache(userDictLive);
  const rows = collectCatalogRows(items);
  const unknownRowsList = rows.filter((r) => classifyAthLineCategory(r.description, r.unit) === "UNKNOWN");

  const topUnknown = [...withoutDict.unknownByDesc.entries()]
    .map(([phrase, v]) => ({
      phrase: v.example,
      folded: phrase,
      count: v.count,
      qty: v.qty,
      sources: [...v.sources].join(", "),
      why: whyUnknown(v.example, v.unit),
      proposed: proposeCategory(v.example),
    }))
    .sort((a, b) => b.count - a.count || b.qty - a.qty)
    .slice(0, 30);

  const report = {
    generatedAt: new Date().toISOString(),
    pipelineSource,
    userDictSource: dictSource,
    userDictEntryCount: userDictLive.entries.length,
    withoutUserDictCache: {
      totalRows: withoutDict.totalRows,
      unknownRows: withoutDict.unknownRows,
      unknownPercent: Number(withoutDict.unknownPercent.toFixed(2)),
    },
    withLiveUserDictCache: {
      totalRows: withLiveDict.totalRows,
      unknownRows: withLiveDict.unknownRows,
      unknownPercent: Number(withLiveDict.unknownPercent.toFixed(2)),
    },
    deltaFromUserDict: withoutDict.unknownRows - withLiveDict.unknownRows,
    topUnknown,
  };

  console.log("=== P3-AUDIT-001-FIX-B LIVE UNKNOWN ===\n");
  console.log(`Pipeline: ${pipelineSource} (${items.length} tenders)`);
  console.log(`User dict: ${dictSource} (${userDictLive.entries.length} entries)\n`);
  console.log(`EMPTY cache — UNKNOWN: ${withoutDict.unknownRows}/${withoutDict.totalRows} (${withoutDict.unknownPercent.toFixed(1)}%)`);
  console.log(`LIVE dict cache — UNKNOWN: ${withLiveDict.unknownRows}/${withLiveDict.totalRows} (${withLiveDict.unknownPercent.toFixed(1)}%)`);
  console.log(`Delta from user dict: ${report.deltaFromUserDict} rows\n`);
  console.log("--- TOP 20 UNKNOWN (empty cache) ---");
  for (const row of topUnknown.slice(0, 20)) {
    const text = (row.phrase || row.folded || "").slice(0, 70);
    console.log(
      `${String(row.count).padStart(3)}× | ${row.sources.padEnd(8)} | ${row.proposed || "—"} | ${text}`,
    );
  }

  if (OUT_JSON) {
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    console.log(`\nJSON: ${OUT_JSON}`);
  }

  return report;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
