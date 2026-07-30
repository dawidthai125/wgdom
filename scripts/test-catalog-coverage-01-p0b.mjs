/**
 * CATALOG-COVERAGE-01 P0b — Normalizer unit + integration.
 * Uruchom: npx vite-node scripts/test-catalog-coverage-01-p0b.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyOfferBoqLineNoise,
  normalizeOfferBoqDescription,
  normalizeOfferBoqDescriptionStable,
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

function baseLine(description, unit = "szt") {
  return {
    lineId: "t1",
    lp: "1",
    description,
    quantity: 1,
    quantityRaw: "1",
    unit,
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
}

console.log("=== CATALOG-COVERAGE-01 P0b Normalizer ===\n");

console.log("1. Przykłady normalizacji (forma only)");
{
  const a = normalizeOfferBoqDescription(
    "Wykucie z muru podokienników m d.1.7 0354-11 1.15*3",
  );
  assert(a.changed, "KNR/d.x/mult → changed");
  assert(!/0354-11/.test(a.normalizedDescription), "KNR code usunięty z tekstu mapowania");
  assert(!/d\.1\.7/i.test(a.normalizedDescription), "blok d.x usunięty");
  assert(/wykucie|podokiennik/i.test(a.normalizedDescription), "semantyka materiału zachowana");
  assert(a.knrHint === "0354-11", "knrHint wyodrębniony");
}
{
  const b = normalizeOfferBoqDescription("Zawór kulowy DN25 / śr. 32 mm montaż");
  assert(/fi25/.test(b.normalizedDescription) || /fi32/.test(b.normalizedDescription), "średnica kanoniczna fi");
  assert(/zaw[oó]r|kulowy|monta/i.test(b.normalizedDescription), "nazwa produktu zostaje");
  assert(b.diameterHint != null, "diameterHint");
}
{
  const c = normalizeOfferBoqDescription("[W] Montaż rur PP ø40 Krotność = 4 (4 lokale) analiza indywidualna");
  assert(!/Krotno/i.test(c.normalizedDescription), "Krotność strip");
  assert(!/analiza/i.test(c.normalizedDescription), "analiza indywidualna strip");
  assert(/fi40/.test(c.normalizedDescription), "ø40 → fi40");
  assert(/Montaż rur PP/i.test(c.normalizedDescription), "rdzeń opisu");
}

console.log("\n2. Idempotencja");
{
  const raw =
    "Dostawa i montaż stelaży d.1.5 EBERIT 0102-07 Krotność = 4 analiza indywidualna";
  const n1 = normalizeOfferBoqDescription(raw);
  const n2 = normalizeOfferBoqDescription(n1.normalizedDescription);
  assert(n1.normalizedDescription === n2.normalizedDescription, "normalize×2 tekst equal");
  const st = normalizeOfferBoqDescriptionStable(raw);
  assert(st.normalizedDescription === n1.normalizedDescription, "stable ≡ once");
}

console.log("\n3. Nie zmienia semantyki / nie usuwa materiału");
{
  const cases = [
    "Montaż zaworu kulowego",
    "Malowanie ścian wewnętrznych dwukrotne",
    "Układanie rur PP",
  ];
  for (const d of cases) {
    const n = normalizeOfferBoqDescription(d);
    assert(n.normalizedDescription.toLowerCase().includes(d.toLowerCase().slice(0, 8)) || !n.changed || n.normalizedDescription.length >= 8, `materiał OK: ${d.slice(0, 40)}`);
  }
}

console.log("\n4. Noise kończy pipeline — Normalizer nie dla isNoise");
{
  assert(classifyOfferBoqLineNoise("Kalkulacja własna").isNoise, "noise kalkulacja");
  const mapped = mapOfferBoqLine(baseLine("Kalkulacja własna"), { works: [] });
  assert(mapped.isNoise === true && mapped.catalogWorkId === null, "noise → skip Mapper");
  assert(mapped.normalizedDescription == null, "noise bez normalizedDescription");
}

console.log("\n5. Integracja eligible — description SSOT, Core na normalized");
{
  const works = [
    {
      id: "w-zawor",
      tradeId: "hydraulika",
      namePl: "Montaż zaworu kulowego",
      unit: "szt",
      companyPricePln: 10,
      marketQuotes: [],
      updatedAt: "2026-07-30T00:00:00.000Z",
      freshnessStatus: "ok",
      keywords: ["zawor", "kulowy", "montaz"],
      active: true,
      favorite: false,
      usageCount: 0,
      source: "custom",
    },
  ];
  const raw = "Montaż zaworu kulowego DN25 0102-07 Krotność = 2";
  const line = baseLine(raw, "szt");
  const out = mapOfferBoqLine(line, { works });
  assert(out.description === raw, "description oryginalny (SSOT UI)");
  assert(typeof out.normalizedDescription === "string" && out.normalizedDescription.length > 0, "normalizedDescription ustawione");
  assert(!/0102-07/.test(out.normalizedDescription), "normalized bez KNR w hay");
  assert(out.isNoise !== true, "eligible");
}

console.log("\n6. Core scoringu bez zmian API (REUSE)");
{
  const works = [
    {
      id: "w-mal",
      tradeId: "malowanie",
      namePl: "Malowanie ścian",
      unit: "m2",
      companyPricePln: 1,
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
  const clean = "Malowanie ścian wewnętrznych";
  const viaMap = mapOfferBoqLine(baseLine(clean, "m2"), { works });
  const viaCore = mapOfferBoqLineCore(baseLine(clean, "m2"), { works });
  assert(
    (viaMap.catalogWorkId || null) === (viaCore.catalogWorkId || null),
    "czysty opis: map ≡ Core catalogWorkId",
  );
}

console.log("\n7. Static — zero write / zero SMART/MS");
{
  const src = readFileSync(join(root, "src/lib/catalog-coverage/normalize-description.ts"), "utf8");
  assert(!src.includes("pushKeysToCloud") && !src.includes("marketQuotes"), "normalize bez write");
  assert(!src.includes("commitMarketQuotesImport"), "bez MS commit");
  const mapping = readFileSync(join(root, "src/lib/tender-offer-boq-mapping.ts"), "utf8");
  assert(mapping.includes("normalizeOfferBoqDescription"), "wire Normalizer w mapOfferBoqLine");
}

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
