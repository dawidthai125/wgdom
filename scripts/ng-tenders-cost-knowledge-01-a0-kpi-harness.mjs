/**
 * NG-TENDERS-COST-KNOWLEDGE-01 A0 — KPI Harness (RO).
 *
 * Buckets: knowledge_qualified | heuristic_priced | unmapped
 * Overall Confidence derived (DF D-CK-5 · COND-3).
 *
 * Modes:
 *   fixture (default) — reprodukowalny bez KV / TV-01
 *   --live            — TV-01 + Edge batch-get (wymaga .tmp/tender-validation-01-results.json)
 *
 * npx vite-node scripts/ng-tenders-cost-knowledge-01-a0-kpi-harness.mjs
 * npx vite-node scripts/ng-tenders-cost-knowledge-01-a0-kpi-harness.mjs --live
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  COST_KNOWLEDGE_TV01_BASELINE,
  classifyCostKnowledgeLineKpi,
  summarizeCostKnowledgeKpi,
} from "../src/lib/cost-knowledge/index.ts";

const LIVE = process.argv.includes("--live");
const OUT = path.join(process.cwd(), ".tmp");
const reportPath = path.join(OUT, "ng-tenders-cost-knowledge-01-a0-report.json");
const tvPath = path.join(OUT, "tender-validation-01-results.json");

function fixtureLines() {
  return [
    {
      lineId: "fx-qualified-wc",
      catalogWorkId: "ck-demo-work",
      matchMethod: "alias",
      matchConfidence: "high",
      priceOriginKind: "work_catalog",
      hasPositiveUnitPrice: true,
      freshness: "ok",
    },
    {
      lineId: "fx-qualified-quotes",
      catalogWorkId: "ck-demo-work-2",
      matchMethod: "core",
      matchConfidence: "medium",
      priceOriginKind: "controlled_market",
      hasPositiveUnitPrice: true,
      snapshotConfidence01: 0.9,
      coverage: "full",
      freshness: "fresh",
    },
    {
      lineId: "fx-heuristic",
      catalogWorkId: null,
      matchMethod: "unmatched",
      priceOriginKind: "heuristic",
      hasPositiveUnitPrice: true,
    },
    {
      lineId: "fx-company-model",
      catalogWorkId: "ck-weak",
      matchMethod: "fuzzy",
      matchConfidence: "low",
      priceOriginKind: "company_model",
      hasPositiveUnitPrice: true,
    },
    {
      lineId: "fx-unmapped",
      catalogWorkId: null,
      matchMethod: "unmatched",
      priceOriginKind: "unknown",
      hasPositiveUnitPrice: false,
    },
  ];
}

async function runFixture() {
  const rows = fixtureLines().map((l) => classifyCostKnowledgeLineKpi(l));
  return { mode: "fixture", rows, summary: summarizeCostKnowledgeKpi(rows) };
}

async function runLive() {
  if (!fs.existsSync(tvPath)) {
    throw new Error(`Brak ${tvPath} — uruchom fixture albo dostarcz TV-01 artifact`);
  }

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
  if (!anon) throw new Error("Brak VITE_SUPABASE_ANON_KEY");
  const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;

  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({
      keys: ["kw-tenders-pipeline", "kw-wgdom-work-catalog", "kw-tenders-company-profile"],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  const kv = await res.json();
  const values = kv.values ?? {};

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

  const itemsRaw = unwrap(values["kw-tenders-pipeline"]);
  const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw?.items || [];
  const catalog = unwrap(values["kw-wgdom-work-catalog"]);
  const profile = unwrap(values["kw-tenders-company-profile"]);
  localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));
  if (profile) localStorage.setItem("kw-tenders-company-profile", JSON.stringify(profile));

  const tv = JSON.parse(fs.readFileSync(tvPath, "utf8"));
  const sampleIds = new Set(tv.sample?.tenderIds || []);

  const { forceCenyMaterialow01ForTests } = await import("../src/lib/ceny-materialow-01-flag.ts");
  const { buildOfferBoqDocumentForPipelineItem } = await import(
    "../src/lib/tender-offer-boq-explainability.ts"
  );
  const { loadWorkCatalogStoreLocal } = await import("../src/lib/work-catalog/work-catalog-store.ts");
  const { listActiveWorksForRegion } = await import("../src/lib/work-catalog/catalog-work-utils.ts");

  forceCenyMaterialow01ForTests(true);
  const store = loadWorkCatalogStoreLocal();
  const works = listActiveWorksForRegion(store, store.activeRegion);
  const byId = new Map(items.map((it) => [it.id, it]));
  const workById = new Map(works.map((w) => [w.id, w]));

  function hasQuotes(w) {
    const mq = w?.marketQuotes;
    if (!mq) return false;
    for (const byR of Object.values(mq)) {
      if (!byR || typeof byR !== "object") continue;
      for (const s of Object.values(byR)) {
        if (s && typeof s.price === "number" && s.price > 0) return true;
      }
    }
    return false;
  }

  const rows = [];
  let quotesHitLegacy = 0;
  let lines = 0;
  const NOW = new Date().toISOString();

  for (const tid of sampleIds) {
    const item = byId.get(tid);
    if (!item) continue;
    const doc = buildOfferBoqDocumentForPipelineItem(item, {
      works,
      nowIso: NOW,
      includeExplainability: false,
    });
    for (const line of doc.lines ?? []) {
      lines += 1;
      const w = line.catalogWorkId ? workById.get(line.catalogWorkId) : null;
      if (w && hasQuotes(w)) quotesHitLegacy += 1;

      const comps = line.components ?? [];
      const priced = comps.find((c) => c.unitPricePln != null && c.unitPricePln > 0);
      const originKind = priced?.priceOrigin?.kind ?? "unknown";
      const hasPrice =
        (priced?.unitPricePln != null && priced.unitPricePln > 0) ||
        (line.directCostPln != null && line.directCostPln > 0);

      rows.push(
        classifyCostKnowledgeLineKpi({
          lineId: line.lineId,
          catalogWorkId: line.catalogWorkId,
          matchMethod: line.matchMethod ?? line.matchedBy,
          matchConfidence: line.matchConfidence,
          priceOriginKind: originKind,
          hasPositiveUnitPrice: Boolean(hasPrice),
          freshness: "ok",
        }),
      );
    }
  }

  const coveragePctLegacy = lines > 0 ? Math.round((quotesHitLegacy / lines) * 1000) / 10 : 0;
  const regressionOk = coveragePctLegacy + 0.05 >= COST_KNOWLEDGE_TV01_BASELINE.quotesPct - 0.5;

  return {
    mode: "live",
    rows,
    summary: summarizeCostKnowledgeKpi(rows),
    quotesHitLegacy,
    lines,
    coveragePctLegacy,
    regressionOk,
  };
}

fs.mkdirSync(OUT, { recursive: true });
console.log("=== NG-TENDERS-COST-KNOWLEDGE-01 A0 KPI Harness ===\n");

let report;
if (LIVE) {
  report = await runLive();
  console.log(`mode=live · lines=${report.lines}`);
  console.log(
    `legacy Quotes hit=${report.quotesHitLegacy}/${report.lines} = ${report.coveragePctLegacy}% (baseline ${COST_KNOWLEDGE_TV01_BASELINE.quotesPct}%)`,
  );
  console.log(`regressionOk=${report.regressionOk}`);
} else {
  report = await runFixture();
  console.log("mode=fixture (reproducible)");
}

const { summary } = report;
console.log("\n--- Buckets ---");
console.log(`total                 ${summary.totalLines}`);
console.log(`knowledge_qualified   ${summary.knowledgeQualified} (${summary.knowledgeQualifiedPct}%)`);
console.log(`heuristic_priced      ${summary.heuristicPriced}`);
console.log(`unmapped              ${summary.unmapped}`);

const out = {
  epic: "NG-TENDERS-COST-KNOWLEDGE-01",
  slice: "A0",
  generatedAt: new Date().toISOString(),
  baseline: COST_KNOWLEDGE_TV01_BASELINE,
  ...report,
  rows: report.rows,
};
fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
console.log(`\nReport: ${reportPath}`);

if (LIVE && report.regressionOk === false) {
  console.error("FAIL: TV-01 Quotes coverage spadł poniżej baseline−0.5pp");
  process.exit(2);
}

console.log("\nA0 PASS");
