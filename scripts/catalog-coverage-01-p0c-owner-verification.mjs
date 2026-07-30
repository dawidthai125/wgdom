/**
 * CATALOG-COVERAGE-01 P0c — Owner Verification + TV-01 remapa (RO).
 * Uruchom: npx vite-node scripts/catalog-coverage-01-p0c-owner-verification.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  classifyOfferBoqLineNoise,
  countCatalogCoverageAliasHits,
  resolveCatalogCoverageAlias,
  resolveCatalogCoverageAliasStable,
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  normalizeOfferBoqDescription,
} from "../src/lib/catalog-coverage/index.ts";

const OUT = path.join(process.cwd(), ".tmp");
const reportPath = path.join(OUT, "catalog-coverage-01-p0c-ov.json");
const tvPath = path.join(OUT, "tender-validation-01-results.json");
const classifyPath = path.join(OUT, "catalog-coverage-01-classify.json");

if (!fs.existsSync(tvPath) || !fs.existsSync(classifyPath)) {
  console.error("Brak artefaktów TV-01 / classify w .tmp/");
  process.exit(1);
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
const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;

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

function hasKosztorys(it) {
  const snap = it?.tenderDossier?.kosztorys;
  return !!snap && ((snap.rows?.length ?? 0) > 0 || (snap.catalogQuantities?.length ?? 0) > 0);
}

const tv = JSON.parse(fs.readFileSync(tvPath, "utf8"));
const classify = JSON.parse(fs.readFileSync(classifyPath, "utf8"));
const sampleIds = new Set(tv.sample?.tenderIds || []);

const totalLines = tv.aggregate?.totalLines ?? 2228;
const quotesHitBaseline = tv.aggregate?.pricedFromProductQuotes ?? 1702;
const coverageBeforePct =
  totalLines === 0 ? 0 : Math.round((quotesHitBaseline / totalLines) * 1000) / 10;

console.log("=== CATALOG-COVERAGE-01 P0c Owner Verification ===\n");

const kv = await batchGet([
  "kw-tenders-pipeline",
  "kw-wgdom-work-catalog",
  "kw-tenders-company-profile",
]);
const values = kv.values ?? {};
const itemsRaw = unwrap(values["kw-tenders-pipeline"] ?? values[0]);
const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw?.items || [];
const catalog = unwrap(values["kw-wgdom-work-catalog"] ?? values[1]);
const profile = unwrap(values["kw-tenders-company-profile"] ?? values[2]);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));
if (profile) localStorage.setItem("kw-tenders-company-profile", JSON.stringify(profile));

const { forceCenyMaterialow01ForTests } = await import("../src/lib/ceny-materialow-01-flag.ts");
const { buildOfferBoqDocumentForPipelineItem } = await import(
  "../src/lib/tender-offer-boq-explainability.ts"
);
const { mapOfferBoqLine } = await import("../src/lib/tender-offer-boq-mapping.ts");
const { loadWorkCatalogStoreLocal } = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { listActiveWorksForRegion } = await import("../src/lib/work-catalog/catalog-work-utils.ts");

forceCenyMaterialow01ForTests(true);
const store = loadWorkCatalogStoreLocal();
const works = listActiveWorksForRegion(store, store.activeRegion);
const byId = new Map(items.map((it) => [it.id, it]));

/** Pack productIds vs Library */
const packBindStatus = CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) => {
  const w = works.find((x) => x.id === r.productId);
  return {
    aliasRuleId: r.aliasRuleId,
    productId: r.productId,
    workExists: !!w,
    workNamePl: w?.namePl ?? null,
  };
});

const NOW = new Date().toISOString();
let mappedWithAlias = 0;
let mappedTotal = 0;
let quotesHit = 0;
let lineCount = 0;
let multiHit = 0;
let deterministicFail = 0;
const newlyMapped = [];
const aliasHitsByRule = Object.fromEntries(
  CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) => [r.aliasRuleId, { textHits: 0, binds: 0, missingWork: 0 }]),
);

for (const id of sampleIds) {
  const item = byId.get(id);
  if (!item || !hasKosztorys(item)) continue;
  const doc = buildOfferBoqDocumentForPipelineItem({ item, builtAt: NOW });
  if (!doc) continue;
  for (const line of doc.lines) {
    lineCount += 1;
    const noise = classifyOfferBoqLineNoise(line.description);
    const norm = normalizeOfferBoqDescription(line.description);
    const hay = norm.normalizedDescription || line.description;

    if (!noise.isNoise) {
      const hits = countCatalogCoverageAliasHits(hay);
      if (hits > 1) multiHit += 1;
      const a = resolveCatalogCoverageAlias({ description: hay, isNoise: false, works });
      const b = resolveCatalogCoverageAliasStable({ description: hay, isNoise: false, works });
      if (a.aliasRuleId !== b.aliasRuleId || a.resolvedProductId !== b.resolvedProductId) {
        deterministicFail += 1;
      }
      if (a.matched && a.aliasRuleId) {
        aliasHitsByRule[a.aliasRuleId].textHits += 1;
        if (a.missingWork) aliasHitsByRule[a.aliasRuleId].missingWork += 1;
        if (a.resolvedProductId) aliasHitsByRule[a.aliasRuleId].binds += 1;
      }
    }

    const mapped = mapOfferBoqLine(line, { works, cenyMaterialowUplift: true });
    if (mapped.catalogWorkId) {
      mappedTotal += 1;
      if (mapped.matchMethod === "alias") {
        mappedWithAlias += 1;
        if (newlyMapped.length < 15) {
          newlyMapped.push({
            tenderId: id.slice(0, 8),
            lp: line.lp,
            desc: String(line.description || "").slice(0, 120),
            aliasRuleId: mapped.aliasRuleId,
            catalogWorkId: mapped.catalogWorkId,
          });
        }
      }
    }

    // Quotes proxy: controlled_market when work has market quote (same as TV-01 intent)
    if (mapped.catalogWorkId) {
      const w = works.find((x) => x.id === mapped.catalogWorkId);
      const mq = w?.marketQuotes;
      const hasQ =
        mq &&
        (typeof mq === "object"
          ? Object.keys(mq).length > 0
          : Array.isArray(mq)
            ? mq.length > 0
            : false);
      if (hasQ) quotesHit += 1;
    }
  }
}
forceCenyMaterialow01ForTests(null);

const coverageAfterPct = lineCount === 0 ? 0 : Math.round((quotesHit / lineCount) * 1000) / 10;
const coverageDeltaPp = Math.round((coverageAfterPct - coverageBeforePct) * 10) / 10;

const unmappedClassify = (classify.unmappedRows || []).filter((r) => !r.noise);
const textHitEligible = unmappedClassify.filter((r) => {
  const n = normalizeOfferBoqDescription(r.desc || "");
  return resolveCatalogCoverageAlias({
    description: n.normalizedDescription || r.desc,
    works,
  }).matched;
}).length;

const report = {
  id: "CATALOG-COVERAGE-01-P0c-OV",
  generatedAt: NOW,
  baseline: {
    totalLines: lineCount,
    quotesHitBaseline,
    coverageBeforePct,
  },
  after: {
    quotesHit,
    coverageAfterPct,
    coverageDeltaPp,
    mappedTotal,
    mappedWithAlias,
  },
  packBindStatus,
  aliasHitsByRule,
  multiHitLines: multiHit,
  deterministicFail,
  textHitEligibleUnmapped: textHitEligible,
  newlyMappedExamples: newlyMapped,
  gates: {
    packSize6: CATALOG_COVERAGE_P0C_WAVE1_PACK.length === 6,
    multiHitZero: multiHit === 0,
    deterministicOk: deterministicFail === 0,
    noLibraryWrite: true,
    coverageNoRegress: coverageAfterPct >= coverageBeforePct - 0.05,
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.log("\nWrote", reportPath);
