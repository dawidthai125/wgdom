/**
 * P2-G.3C — audyt pokrycia klasyfikacji na kosztorysach prod (pipeline KV).
 * npx vite-node scripts/audit-p2g3c-classification-prod.mjs [--json out.json]
 */
import fs from "node:fs";
import { loadEnv } from "vite";
import { classifyAthLineCategory, classifyAthLineCategoryWithoutDictionary } from "../src/lib/wgdom-ath-classifier.ts";
import {
  buildClassificationSummary,
  buildUnknownRows,
  buildCatalogTuningHints,
} from "../src/lib/tender-classification-inspector.ts";
import { restoreDefaultUserClassificationDictionaryStore, setUserClassificationDictionaryCache } from "../src/lib/wgdom-user-classification-dictionary.ts";

const env = loadEnv("", process.cwd(), "");
const OUT_JSON = process.argv.includes("--json")
  ? process.argv[process.argv.indexOf("--json") + 1]
  : null;

setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());

const BUYER_BUCKETS = [
  { id: "wm", label: "Wrocławskie Mieszkania", test: (i) => /wrocławskie\s+mieszkania/i.test(i.organizationName || "") || i.priorityBuyerLabel === "Wrocławskie Mieszkania" },
  { id: "zzk", label: "ZZK", test: (i) => /zarząd\s+zasobu\s+komunalnego|^zzk\b/i.test(i.organizationName || "") || /\bzzk\b/i.test(i.title || "") },
  { id: "mops", label: "MOPS", test: (i) => /miejski\s+ośrodek\s+pomocy|mops/i.test(i.organizationName || "") },
  { id: "uwr", label: "Uniwersytet Wrocławski", test: (i) => /uniwersytet.*wrocław|uwr/i.test(i.organizationName || "") || /uniwersytet.*wrocław/i.test(i.title || "") },
  { id: "other", label: "Inne prod (losowe)", test: () => true },
];

const FORM_NOISE = /^(nr\s+krs|nr\s+regon|formularz oferty|adres e-mail|nr telefonu|https?:\/\/|rodzaj przedsiębiorstwa|oświadczam|tajemnice przedsiębiorstwa)/i;

function isAthPrzedmiarSource(filename = "") {
  const f = filename.toLowerCase();
  if (/formularz.*ofert|zal\.\s*nr\s*1.*swz/i.test(f)) return false;
  return /\.ath$|przedmiar|kosztorys|sanitarny|zest\.ath/i.test(f);
}

function isLikelyQuantityRow(row) {
  const d = (row.description || "").trim();
  if (!d || d.length < 4) return false;
  if (FORM_NOISE.test(d)) return false;
  if (/^https?:\/\//i.test(d)) return false;
  return true;
}

async function loadPipeline() {
  const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (anon) {
    const base = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;
    try {
      const res = await fetch(`${base}/batch-get`, {
        method: "POST",
        headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({ keys: ["kw-tenders-pipeline"] }),
      });
      if (res.ok) {
        const j = await res.json();
        const raw = j.values?.[0] ?? j.values?.["kw-tenders-pipeline"];
        const items = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : raw);
        if (Array.isArray(items) && items.length > 0) {
          console.log(`Źródło: live KV (${items.length} pozycji pipeline)\n`);
          return { items, source: "live-kv" };
        }
      }
    } catch (e) {
      console.warn("Live KV niedostępne:", e.message);
    }
  }
  const snapPath = "scripts/audit-cloud-archive-snapshot.json";
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
  const items = snap["kw-tenders-pipeline"] || [];
  console.log(`Źródło: snapshot ${snapPath} (${items.length} pozycji pipeline)\n`);
  return { items, source: "snapshot" };
}

function parseQty(q) {
  const n = parseFloat(String(q ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function bucketForItem(item) {
  for (const b of BUYER_BUCKETS) {
    if (b.id !== "other" && b.test(item)) return b.id;
  }
  return "other";
}

function classifyRows(rows, mode = "full") {
  let classified = 0;
  let unknown = 0;
  const unknownDesc = new Map();
  for (const row of rows) {
    const cat = mode === "seed"
      ? classifyAthLineCategoryWithoutDictionary(row.description, row.unit)
      : classifyAthLineCategory(row.description, row.unit);
    if (cat === "UNKNOWN") {
      unknown += 1;
      const key = row.description.trim();
      unknownDesc.set(key, (unknownDesc.get(key) || 0) + 1);
    } else {
      classified += 1;
    }
  }
  return { total: rows.length, classified, unknown, unknownDesc };
}

function analyzeTender(item) {
  const kosztorys = item.tenderDossier?.kosztorys;
  const rows = kosztorys?.catalogQuantities;
  if (!rows?.length || !kosztorys?.ok) return null;
  const sourceFilename = kosztorys.sourceFilename || "";
  const athOnly = isAthPrzedmiarSource(sourceFilename);
  const active = rows.filter((r) => parseQty(r.quantity) > 0 && isLikelyQuantityRow(r));
  if (!active.length) return null;
  const summary = buildClassificationSummary(active);
  const seed = classifyRows(active, "seed");
  return {
    id: item.id,
    title: (item.title || "").slice(0, 80),
    organizationName: item.organizationName || "",
    sourceFilename,
    athOnly,
    totalRows: summary.totalRows,
    classifiedRows: summary.classifiedRows,
    unknownRows: summary.unknownRows,
    classifiedPercent: summary.classifiedPercent,
    unknownPercent: summary.unknownPercent,
    seedUnknownRows: seed.unknown,
    seedClassifiedPercent: seed.total > 0 ? (seed.classified / seed.total) * 100 : 0,
    rows: active,
    unknownDesc: seed.unknownDesc,
  };
}

function aggregateUnknown(tenders, useSeed = false) {
  const map = new Map();
  for (const t of tenders) {
    if (useSeed) {
      for (const [desc, count] of t.unknownDesc.entries()) {
        const prev = map.get(desc) || { description: desc, count: 0, tenderCount: 0 };
        prev.count += count;
        prev.tenderCount += 1;
        map.set(desc, prev);
      }
      continue;
    }
    const unknown = buildUnknownRows(t.rows);
    for (const row of unknown) {
      const key = row.description.trim();
      const prev = map.get(key) || { description: key, count: 0, quantity: 0, tenderCount: 0 };
      prev.count += 1;
      prev.quantity += row.quantity;
      prev.tenderCount += 1;
      map.set(key, prev);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || (b.quantity ?? 0) - (a.quantity ?? 0));
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

function bucketStats(list) {
  const totalRows = list.reduce((s, t) => s + t.totalRows, 0);
  const classified = list.reduce((s, t) => s + t.classifiedRows, 0);
  const unknown = list.reduce((s, t) => s + t.unknownRows, 0);
  const seedUnknown = list.reduce((s, t) => s + t.seedUnknownRows, 0);
  return {
    tendersWithKosztorys: list.length,
    totalRows,
    classifiedRows: classified,
    unknownRows: unknown,
    classifiedPercent: pct(classified, totalRows),
    unknownPercent: pct(unknown, totalRows),
    seedUnknownRows: seedUnknown,
    seedUnknownPercent: pct(seedUnknown, totalRows),
  };
}

const { items, source } = await loadPipeline();
const analyzed = [];
for (const item of items) {
  const a = analyzeTender(item);
  if (a) analyzed.push({ ...a, buyerBucket: bucketForItem(item) });
}

const athAnalyzed = analyzed.filter((a) => a.athOnly);
const byBucket = {};
for (const b of BUYER_BUCKETS) {
  const list = athAnalyzed.filter((a) => a.buyerBucket === b.id);
  byBucket[b.id] = { label: b.label, ...bucketStats(list), tenders: list.map((t) => ({
    title: t.title,
    rows: t.totalRows,
    unknown: t.unknownRows,
    seedUnknown: t.seedUnknownRows,
    coverage: t.classifiedPercent,
    file: t.sourceFilename,
  })) };
}

const globalAth = bucketStats(athAnalyzed);
const topUnknownFull = aggregateUnknown(athAnalyzed, false).slice(0, 100);
const topUnknownSeed = aggregateUnknown(athAnalyzed, true).slice(0, 100);
const hints = buildCatalogTuningHints(
  athAnalyzed.flatMap((t) => buildUnknownRows(t.rows)),
).slice(0, 30);

const report = {
  generatedAt: new Date().toISOString(),
  source,
  pipelineItems: items.length,
  tendersWithCatalog: analyzed.length,
  athPrzedmiarTenders: athAnalyzed.length,
  excludedFormXlsx: analyzed.filter((a) => !a.athOnly).map((a) => ({
    file: a.sourceFilename,
    rows: a.totalRows,
    unknown: a.unknownRows,
    note: "formularz oferty — poza benchmarkiem przedmiaru",
  })),
  globalAth,
  byBucket,
  topUnknownFull,
  topUnknownSeed,
  phraseHints: hints,
};

console.log("=== P2-G.3C — AUDIT KLASYFIKACJI PROD (ATH/przedmiar) ===\n");
console.log(`Pipeline: ${items.length} | Kosztorysy catalog: ${analyzed.length} | ATH/przedmiar: ${athAnalyzed.length}`);
if (report.excludedFormXlsx.length) {
  console.log(`Wykluczone formularze XLSX: ${report.excludedFormXlsx.length} (szum administracyjny, nie przedmiar)`);
}
console.log(`\nPozycje ATH łącznie: ${globalAth.totalRows}`);
console.log(`Pełny klasyfikator — sklasyfikowane: ${globalAth.classifiedRows} (${globalAth.classifiedPercent}%) | UNKNOWN: ${globalAth.unknownRows} (${globalAth.unknownPercent}%)`);
console.log(`Warstwa seed (bez słownika branżowego) — UNKNOWN: ${globalAth.seedUnknownRows} (${globalAth.seedUnknownPercent}%)\n`);

for (const b of BUYER_BUCKETS) {
  const s = byBucket[b.id];
  if (!s.tendersWithKosztorys) continue;
  console.log(`--- ${s.label} (${s.tendersWithKosztorys} kosztorysów ATH) ---`);
  console.log(`  ${s.classifiedPercent}% pokrycia | UNKNOWN pełny: ${s.unknownRows} | UNKNOWN seed: ${s.seedUnknownRows}`);
  for (const t of s.tenders) {
    console.log(`  · ${t.coverage.toFixed(1)}% — UNK ${t.unknown}/${t.rows} (seed ${t.seedUnknown}) — ${t.file}`);
  }
  console.log("");
}

console.log("--- TOP 15 UNKNOWN (pełny klasyfikator, ATH) ---");
for (const row of topUnknownFull.slice(0, 15)) {
  console.log(`  ${String(row.count).padStart(3)}×  ${row.description.slice(0, 72)}`);
}
if (topUnknownSeed.length) {
  console.log("\n--- TOP 15 UNKNOWN (warstwa seed, ATH) ---");
  for (const row of topUnknownSeed.slice(0, 15)) {
    console.log(`  ${String(row.count).padStart(3)}×  ${row.description.slice(0, 72)}`);
  }
}

if (OUT_JSON) {
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nZapisano: ${OUT_JSON}`);
}

export { report };
