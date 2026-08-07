/**
 * CATALOG-WAVE-2 — Owner Verification + TV-01 Coverage + Alias Collision (RO).
 * Wymaga seed OPS (--execute) na cloud catalog.
 *
 *   npx vite-node scripts/catalog-wave-2-owner-verification.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  classifyOfferBoqLineNoise,
  normalizeOfferBoqDescription,
  CATALOG_WAVE2_PRODUCT_IDS,
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  resolveCatalogCoverageAlias,
  countCatalogCoverageAliasHits,
} from "../src/lib/catalog-coverage/index.ts";
import { foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";

const OUT = path.join(process.cwd(), ".tmp");
const reportPath = path.join(OUT, "catalog-wave-2-ov.json");
fs.mkdirSync(OUT, { recursive: true });

/** TV-01 sample (18) — SSOT TENDER-VALIDATION-01 */
const TV01_IDS = [
  "08dec13d",
  "08debcad",
  "08decd21",
  "08dee8b8",
  "08decd1d",
  "08ded02d",
  "08dee7b9",
  "08dee3f6",
  "08ded8e7",
  "08dee178",
  "08dee335",
  "08dec6bc",
  "08debd4b",
  "08debbce",
  "08debfde",
  "08debd77",
  "08deb669",
  "08decd0e",
];

const BASELINE = { quotes: 1741, pct: 78.14, totalLines: 2228 };
const TARGET_PCT = 82;
const STRETCH_PCT = 85;

const W2_IDS = Object.values(CATALOG_WAVE2_PRODUCT_IDS);
const WAVE1_IDS = CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) => r.productId);

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

function hasQuotes(w) {
  const mq = w?.marketQuotes;
  if (!mq || typeof mq !== "object") return false;
  for (const byR of Object.values(mq)) {
    if (!byR || typeof byR !== "object") continue;
    for (const s of Object.values(byR)) {
      if (s && typeof s.price === "number" && s.price > 0) return true;
    }
  }
  return false;
}

console.log("=== CATALOG-WAVE-2 Owner Verification ===\n");

const kv = await batchGet([
  "kw-tenders-pipeline",
  "kw-wgdom-work-catalog",
  "kw-tenders-company-profile",
]);
const values = kv.values ?? {};
const vals = Object.values(values);
const itemsRaw = unwrap(values["kw-tenders-pipeline"] ?? vals[0]);
const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw?.items || [];
const catalog = unwrap(values["kw-wgdom-work-catalog"] ?? vals[1]);
const profile = unwrap(values["kw-tenders-company-profile"] ?? vals[2]);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));
if (profile) localStorage.setItem("kw-tenders-company-profile", JSON.stringify(profile));

const { forceCenyMaterialow01ForTests } = await import("../src/lib/ceny-materialow-01-flag.ts");
const { buildOfferBoqDocumentForPipelineItem } = await import(
  "../src/lib/tender-offer-boq-explainability.ts"
);
const { mapOfferBoqLine } = await import("../src/lib/tender-offer-boq-mapping.ts");
const { loadWorkCatalogStoreLocal } = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { listActiveWorksForRegion } = await import("../src/lib/work-catalog/catalog-work-utils.ts");

const store = loadWorkCatalogStoreLocal();
const works = listActiveWorksForRegion(store, store.activeRegion);
const byId = new Map(items.map((it) => [it.id, it]));

const w2Present = W2_IDS.map((id) => {
  const w = works.find((x) => x.id === id);
  return { id, present: !!w, quotes: w ? hasQuotes(w) : false, active: w?.active !== false };
});
const w1Present = WAVE1_IDS.map((id) => {
  const w = works.find((x) => x.id === id);
  return { id, present: !!w, quotes: w ? hasQuotes(w) : false };
});

forceCenyMaterialow01ForTests(true);

let quotesHit = 0;
let lines = 0;
let noise = 0;
const bindsByRule = {};
const bindsByProduct = {};
for (const id of W2_IDS) bindsByProduct[id] = 0;
for (const id of WAVE1_IDS) bindsByProduct[id] = 0;

/** FP probes — Alias + catalogWorkId (strict): 0 bind do cc-w2-* */
const fpProbes = [
  { desc: "Wykucie z muru podokienników drewnianych, stalowych", forbidRule: "wykucie_wnek" },
  {
    desc: "Przygotowanie starego podłoża pod docieplenie metodą lekką-mokrą - oczyszczenie mechaniczne i zmycie",
    forbidRule: "oczyszczenie_podloza",
  },
  { desc: "Sprawdzenie samoczynnego wyłączania zasilania (pierwsza próba)", forbidRule: null },
  { desc: "Warstwa odcinająca (piasek) zagęszczana mechanicznie", forbidRule: "zawor_odcinajacy_15" },
];
const fpResults = [];
const W2_ID_SET = new Set(W2_IDS);

for (const p of fpProbes) {
  const a = resolveCatalogCoverageAlias({ description: p.desc, works });
  const mapped = mapOfferBoqLine(
    {
      id: "fp",
      lp: "1",
      description: p.desc,
      unit: "szt",
      quantity: 1,
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
    },
    { works, cenyMaterialowUplift: true },
  );
  const aliasForbidden =
    !!p.forbidRule && (a.aliasRuleId === p.forbidRule || mapped.aliasRuleId === p.forbidRule);
  const w2CatalogBind = W2_ID_SET.has(mapped.catalogWorkId || "");
  const ok = !aliasForbidden && !w2CatalogBind;
  fpResults.push({
    ...p,
    aliasRuleId: a.aliasRuleId,
    mappedAliasRuleId: mapped.aliasRuleId,
    catalogWorkId: mapped.catalogWorkId,
    matchMethod: mapped.matchMethod,
    ok,
    okAlias: !aliasForbidden,
    okCatalogWorkId: !w2CatalogBind,
  });
}

/** Collision: Wave1 canonical samples */
const collision = [];
const w1Samples = [
  ["Zaprawianie bruzd o szer. do 100 mm", "zaprawianie_bruzd"],
  ["Zawór odpowietrzający o śr. 6 mm", "zawor_odpowietrzajacy"],
  ["Zabezpieczenie okien folią", "zabezpieczenie_folia"],
  ["Montaż stop ptaków", "stop_ptakow"],
  ["Instalowanie multiswitcha 9/20", "multiswitch_antenowy"],
  ["Rozebranie pieców i trzonów kuchennych", "piece_demontaz"],
];
for (const [desc, expect] of w1Samples) {
  const a = resolveCatalogCoverageAlias({ description: desc, works });
  collision.push({
    desc,
    expect,
    got: a.aliasRuleId,
    hits: countCatalogCoverageAliasHits(desc),
    ok: a.aliasRuleId === expect,
  });
}

for (const tid of TV01_IDS) {
  const item = byId.get(tid) || [...byId.values()].find((it) => String(it.id).startsWith(tid));
  if (!item) continue;
  const doc = buildOfferBoqDocumentForPipelineItem({ item, builtAt: new Date().toISOString() });
  if (!doc?.lines?.length) continue;
  for (const line of doc.lines) {
    lines += 1;
    const desc = typeof line.description === "string" ? line.description : "";
    if (classifyOfferBoqLineNoise(desc).isNoise) {
      noise += 1;
      continue;
    }
    const mapped = mapOfferBoqLine(line, { works, cenyMaterialowUplift: true });
    if (mapped.catalogWorkId) {
      const w = works.find((x) => x.id === mapped.catalogWorkId);
      if (w && hasQuotes(w)) quotesHit += 1;
      if (bindsByProduct[mapped.catalogWorkId] != null) {
        bindsByProduct[mapped.catalogWorkId] += 1;
      }
      if (mapped.aliasRuleId) {
        bindsByRule[mapped.aliasRuleId] = (bindsByRule[mapped.aliasRuleId] || 0) + 1;
      }
    }
  }
}

const pct = lines ? Math.round((quotesHit / lines) * 10000) / 100 : 0;
const deltaPp = Math.round((pct - BASELINE.pct) * 100) / 100;
const w2SeedOk = w2Present.every((x) => x.present && x.quotes);
const w1Ok = w1Present.every((x) => x.present && x.quotes);
const collisionOk = collision.every((c) => c.ok);
const fpOk = fpResults.every((f) => f.ok);
const targetOk = pct >= TARGET_PCT;
const stretchOk = pct >= STRETCH_PCT;

const unmapped = lines - quotesHit;
const unmappedDodMax = 368;
const unmappedOk = unmapped <= unmappedDodMax;

const report = {
  at: new Date().toISOString(),
  epic: "CATALOG-WAVE-2",
  baseline: BASELINE,
  coverage: {
    totalLines: lines,
    noise,
    quotesHit,
    pct,
    deltaPp,
    targetPct: TARGET_PCT,
    stretchPct: STRETCH_PCT,
    targetOk,
    stretchOk,
    unmapped,
    unmappedBaseline: 454,
    unmappedDodMax,
    unmappedOk,
  },
  seed: { w2Present, w1Present, w2SeedOk, w1Ok },
  bindsByRule,
  bindsByProduct,
  aliasCollisionAudit: { ok: collisionOk, samples: collision },
  falsePositiveAudit: {
    ok: fpOk,
    mode: "strict_aliasRuleId_and_catalogWorkId",
    probes: fpResults,
  },
  verdict: {
    seed: w2SeedOk && w1Ok ? "PASS" : "FAIL",
    coverage: targetOk ? "PASS" : "FAIL",
    collision: collisionOk ? "PASS" : "FAIL",
    falsePositive: fpOk ? "PASS" : "FAIL",
    unmapped: unmappedOk ? "PASS" : "FAIL_SOFT",
    overall:
      w2SeedOk && w1Ok && targetOk && collisionOk && fpOk
        ? unmappedOk
          ? "PASS — READY OWNER VERIFY"
          : "PASS_WITH_UNMAPPED_GAP — READY OWNER VERIFY (unmapped soft)"
        : "FAIL",
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(
  `Coverage: ${quotesHit}/${lines} = ${pct}% (baseline ${BASELINE.pct}% · Δ ${deltaPp >= 0 ? "+" : ""}${deltaPp} pp)`,
);
console.log(`Unmapped: ${unmapped} (baseline 454 · DoD ≤${unmappedDodMax}): ${unmappedOk ? "PASS" : "FAIL_SOFT"}`);
console.log(`Target ≥${TARGET_PCT}%: ${targetOk ? "PASS" : "FAIL"} · Stretch ≥${STRETCH_PCT}%: ${stretchOk ? "PASS" : "FAIL"}`);
console.log(`Seed W2: ${w2SeedOk ? "PASS" : "FAIL"} · Wave1: ${w1Ok ? "PASS" : "FAIL"}`);
console.log(`Collision: ${collisionOk ? "PASS" : "FAIL"} · FP strict: ${fpOk ? "PASS" : "FAIL"}`);
console.log(`Binds by rule:`, bindsByRule);
console.log(`\nReport: ${reportPath}`);
console.log(`\n=== WERDYKT: ${report.verdict.overall} ===`);
if (report.verdict.overall === "FAIL") process.exit(1);
