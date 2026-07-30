/**
 * CATALOG-COVERAGE-01 P0a — Noise Filter unit + integration.
 * Uruchom: npx vite-node scripts/test-catalog-coverage-01-p0a.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyOfferBoqLineNoise,
  applyOfferBoqNoiseSkip,
  prepareOfferBoqLineForMapping,
  summarizeNoiseFilter,
  collectNoiseFilterSamples,
} from "../src/lib/catalog-coverage/index.ts";
import {
  mapOfferBoqLine,
  mapOfferBoqLineCore,
} from "../src/lib/tender-offer-boq-mapping.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function fingerprint(r) {
  return JSON.stringify({
    isNoise: r.isNoise,
    noiseKind: r.noiseKind,
    reasonPl: r.reasonPl,
  });
}

console.log("=== CATALOG-COVERAGE-01 P0a Noise Filter ===\n");

console.log("1. Kinds DF — pozytywne noise");
assert(
  classifyOfferBoqLineNoise("Kalkulacja własna").noiseKind === "kalkulacja_wlasna",
  "kalkulacja_wlasna",
);
assert(
  classifyOfferBoqLineNoise("KALKULACJA WLASNA").noiseKind === "kalkulacja_wlasna",
  "kalkulacja fold PL",
);
assert(classifyOfferBoqLineNoise("Transport materiałów").noiseKind === "transport", "transport");
assert(classifyOfferBoqLineNoise("Przewóz gruzu").noiseKind === "transport", "przewóz");
assert(classifyOfferBoqLineNoise("Dostawa").noiseKind === "transport", "dostawa standalone");
assert(classifyOfferBoqLineNoise("12").noiseKind === "lp_artifact", "lp_artifact liczba");
assert(classifyOfferBoqLineNoise(".4 2").noiseKind === "lp_artifact", "lp_artifact .4 2");
assert(classifyOfferBoqLineNoise("ab").noiseKind === "smieci_krotkie", "smieci ≤3");
assert(classifyOfferBoqLineNoise("").noiseKind === "smieci_krotkie", "pusty");

console.log("\n2. Nie usuwa pozycji materiałowych (false-noise guard)");
const materialCases = [
  "Dostawa i montaż Centrala Sterująco-Zasilająca TSZ-200",
  "Dostawa i montaż stelaży do uchwytów dla osób niepełnosprawnych",
  "Montaż zaworu kulowego DN25",
  "Układanie rur PP ø32",
  "Wymiana baterii umywalkowej",
  "Malowanie ścian wewnętrznych dwukrotne",
];
for (const d of materialCases) {
  const n = classifyOfferBoqLineNoise(d);
  assert(!n.isNoise, `eligible: ${d.slice(0, 48)}`);
}

console.log("\n3. KNR guard — realna robota z KNR nie jest transport-noise");
assert(
  !classifyOfferBoqLineNoise("Transport i montaż rusztowania 0102-07", "0102-07").isNoise,
  "KNR+montaż → eligible",
);
assert(
  classifyOfferBoqLineNoise("Kalkulacja własna 0102-07", "0102-07").noiseKind ===
    "kalkulacja_wlasna",
  "kalkulacja mimo KNR → noise",
);

console.log("\n4. Idempotencja (AR-B4)");
const desc = "Kalkulacja własna";
const a = classifyOfferBoqLineNoise(desc);
const b = classifyOfferBoqLineNoise(desc);
assert(fingerprint(a) === fingerprint(b), "double classify equal");
const line = {
  lineId: "t1",
  lp: "1",
  description: desc,
  quantity: 1,
  quantityRaw: "1",
  unit: "kpl",
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
const s1 = applyOfferBoqNoiseSkip(line);
const s2 = applyOfferBoqNoiseSkip(s1);
assert(s1.isNoise === true && s1.noiseKind === "kalkulacja_wlasna", "skip tags noise");
assert(
  s2.isNoise === s1.isNoise &&
    s2.noiseKind === s1.noiseKind &&
    s2.catalogWorkId === null &&
    s2.description === s1.description,
  "double applyOfferBoqNoiseSkip stable",
);
const p1 = prepareOfferBoqLineForMapping(line);
const p2 = prepareOfferBoqLineForMapping(p1.line);
assert(p1.skipMapper && p2.skipMapper && p1.line.noiseKind === p2.line.noiseKind, "prepare idempotent");

console.log("\n5. Zero mutacji semantyki opisu / zero write");
const before = line.description;
applyOfferBoqNoiseSkip(line);
assert(line.description === before && line.catalogWorkId === null, "input niezmieniony");
assert(s1.description === before, "output description = input");

console.log("\n6. Integracja mapOfferBoqLine — noise skip Mapper; materiał → Core");
const works = [
  {
    id: "w-malowanie",
    tradeId: "malowanie",
    namePl: "Malowanie ścian",
    unit: "m2",
    companyPricePln: 10,
    marketQuotes: [],
    updatedAt: "2026-07-30T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: ["malowanie", "scian"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  },
];
const noiseMapped = mapOfferBoqLine({ ...line, description: "Kalkulacja własna" }, { works });
assert(
  noiseMapped.isNoise === true &&
    noiseMapped.catalogWorkId === null &&
    noiseMapped.candidateMatches.length === 0,
  "mapOfferBoqLine: noise → skip (brak candidates)",
);
const matLine = {
  ...line,
  description: "Malowanie ścian wewnętrznych",
  unit: "m2",
};
const matMapped = mapOfferBoqLine(matLine, { works });
assert(matMapped.isNoise !== true, "materiał nie oznaczony noise");
const coreOnly = mapOfferBoqLineCore(matLine, { works });
assert(
  (matMapped.catalogWorkId || null) === (coreOnly.catalogWorkId || null),
  "eligible: mapOfferBoqLine ≡ Core (catalogWorkId)",
);

console.log("\n7. summarizeNoiseFilter + samples");
const batch = [
  "Kalkulacja własna",
  "Transport",
  "ab",
  "Montaż zaworu",
  "12",
].map((d) => classifyOfferBoqLineNoise(d));
const stats = summarizeNoiseFilter(batch);
assert(stats.noiseCount === 4 && stats.eligibleCount === 1, "stats 4 noise / 1 eligible");
assert(stats.byKind.kalkulacja_wlasna === 1 && stats.byKind.transport === 1, "byKind");
const samples = collectNoiseFilterSamples(
  [
    { description: "Kalkulacja własna", lp: "1" },
    { description: "Montaż", lp: "2" },
  ],
  5,
);
assert(samples.length === 1 && samples[0].noiseKind === "kalkulacja_wlasna", "samples");

console.log("\n8. Static — jeden tor Mapper (plik mapping)");
const mappingSrc = readFileSync(join(root, "src/lib/tender-offer-boq-mapping.ts"), "utf8");
assert(
  mappingSrc.includes("prepareOfferBoqLineForMapping") &&
    mappingSrc.includes("mapOfferBoqLineCore"),
  "thin pre-map + Core w mapping.ts",
);
const noiseSrc = readFileSync(join(root, "src/lib/catalog-coverage/noise-filter.ts"), "utf8");
assert(!noiseSrc.includes("pushKeysToCloud") && !noiseSrc.includes("marketQuotes"), "noise bez write Quotes/cloud");

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
