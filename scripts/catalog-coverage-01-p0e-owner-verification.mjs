/**
 * CATALOG-COVERAGE-01 P0e — Owner Verification + TV-01 Coverage (RO).
 * npx vite-node scripts/catalog-coverage-01-p0e-owner-verification.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  classifyOfferBoqLineNoise,
  CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID,
  hasZaprawianieBruzdNegation,
  normalizeOfferBoqDescription,
} from "../src/lib/catalog-coverage/index.ts";
import { foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";

const OUT = path.join(process.cwd(), ".tmp");
const reportPath = path.join(OUT, "catalog-coverage-01-p0e-ov.json");
const tvPath = path.join(OUT, "tender-validation-01-results.json");

if (!fs.existsSync(tvPath)) {
  console.error("Brak .tmp/tender-validation-01-results.json");
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

const tv = JSON.parse(fs.readFileSync(tvPath, "utf8"));
const sampleIds = new Set(tv.sample?.tenderIds || []);
const BASELINE_P0D_A = { quotes: 1709, pct: 76.7, totalLines: 2228 };
const TARGET_PCT = 77.2;

console.log("=== CATALOG-COVERAGE-01 P0e Owner Verification ===\n");

const kv = await batchGet([
  "kw-tenders-pipeline",
  "kw-wgdom-work-catalog",
  "kw-tenders-company-profile",
]);
const values = kv.values ?? {};
const itemsRaw = unwrap(values["kw-tenders-pipeline"] ?? Object.values(values)[0]);
const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw?.items || [];
const catalog = unwrap(values["kw-wgdom-work-catalog"] ?? Object.values(values)[1]);
const profile = unwrap(values["kw-tenders-company-profile"] ?? Object.values(values)[2]);
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

const SAFE_IDS = ["cc-p0c-w1-zawor-odpowietrzajacy", "cc-p0c-w1-stop-ptakow"];
const FULL_IDS = [
  "cc-p0c-w1-zaprawianie-bruzd",
  "cc-p0c-w1-zabezpieczenie-folia",
  "cc-p0c-w1-multiswitch-antenowy",
];

const safePresent = SAFE_IDS.map((id) => {
  const w = works.find((x) => x.id === id);
  return {
    id,
    present: !!w,
    quotes: w ? hasQuotes(w) : false,
    active: w?.active !== false,
    legacyCategoryId: w?.legacyCategoryId ?? null,
  };
});
const fullPresent = FULL_IDS.map((id) => {
  const w = works.find((x) => x.id === id);
  return {
    id,
    present: !!w,
    quotes: w ? hasQuotes(w) : false,
    active: w?.active !== false,
    legacyCategoryId: w?.legacyCategoryId ?? null,
  };
});

forceCenyMaterialow01ForTests(true);
const NOW = new Date().toISOString();
let quotesHit = 0;
let lines = 0;
const binds = {
  zaprawianie: 0,
  folia: 0,
  multiswitch: 0,
  zawor: 0,
  stop: 0,
};
let falseZaprawianie = 0;
let falseMultiswitchRtv = 0;
let negLines = 0;

for (const id of sampleIds) {
  const item = byId.get(id);
  if (!item?.tenderDossier?.kosztorys) continue;
  const doc = buildOfferBoqDocumentForPipelineItem({ item, builtAt: NOW });
  if (!doc) continue;
  for (const line of doc.lines) {
    lines += 1;
    if (classifyOfferBoqLineNoise(line.description).isNoise) continue;
    const norm = normalizeOfferBoqDescription(line.description);
    const hay = norm.normalizedDescription || line.description;
    const fold = foldPolishText(hay);
    const mapped = mapOfferBoqLine(line, { works, cenyMaterialowUplift: true });
    const w = mapped.catalogWorkId
      ? works.find((x) => x.id === mapped.catalogWorkId)
      : null;
    if (w && hasQuotes(w)) quotesHit += 1;

    if (mapped.catalogWorkId === "cc-p0c-w1-zaprawianie-bruzd") binds.zaprawianie += 1;
    if (mapped.catalogWorkId === "cc-p0c-w1-zabezpieczenie-folia") binds.folia += 1;
    if (mapped.catalogWorkId === "cc-p0c-w1-multiswitch-antenowy") binds.multiswitch += 1;
    if (mapped.catalogWorkId === "cc-p0c-w1-zawor-odpowietrzajacy") binds.zawor += 1;
    if (mapped.catalogWorkId === "cc-p0c-w1-stop-ptakow") binds.stop += 1;

    if (hasZaprawianieBruzdNegation(fold)) {
      negLines += 1;
      if (mapped.catalogWorkId === CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID) {
        falseZaprawianie += 1;
      }
    }

    if (
      /rtv.?sat|instalacj\w*\s+antenow/.test(fold) &&
      !/multiswitch/.test(fold) &&
      mapped.catalogWorkId === "cc-p0c-w1-multiswitch-antenowy"
    ) {
      falseMultiswitchRtv += 1;
    }
  }
}
forceCenyMaterialow01ForTests(null);

const coveragePct = lines ? Math.round((quotesHit / lines) * 1000) / 10 : 0;
const deltaPp = Math.round((coveragePct - BASELINE_P0D_A.pct) * 10) / 10;

const gates = {
  fullPresent: fullPresent.every((s) => s.present && s.quotes && s.active),
  fullNoLegacy: fullPresent.every((s) => s.legacyCategoryId == null),
  safePreserved: safePresent.every((s) => s.present && s.quotes && s.active),
  noFalseZaprawianie: falseZaprawianie === 0,
  noFalseMultiswitchRtv: falseMultiswitchRtv === 0,
  coverageNoRegress: coveragePct >= BASELINE_P0D_A.pct - 0.05,
  coverageNearTarget: coveragePct >= TARGET_PCT,
  fullBindsMin: binds.zaprawianie + binds.folia + binds.multiswitch >= 10,
  safeBindsMin: binds.zawor + binds.stop >= 4,
};

const pass = Object.values(gates).every(Boolean);

const report = {
  at: new Date().toISOString(),
  baselineP0dA: BASELINE_P0D_A,
  live: { lines, quotesHit, coveragePct, deltaPp },
  targetPct: TARGET_PCT,
  forecastPct: 77.3,
  safePresent,
  fullPresent,
  binds,
  negLines,
  falseZaprawianie,
  falseMultiswitchRtv,
  gates,
  pass,
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(pass ? "\n=== OV P0e PASS ===" : "\n=== OV P0e FAIL ===");
if (!pass) process.exit(1);
