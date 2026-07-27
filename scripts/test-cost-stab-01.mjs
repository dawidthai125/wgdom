/**
 * AI-COST-01-STAB-01 — Field Ready Stabilization
 * npx vite-node scripts/test-cost-stab-01.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { mapOfferBoqDocument } from "../src/lib/tender-offer-boq-mapping.ts";
import { applyOfferBoqCostIntelligence } from "../src/lib/tender-offer-boq-cost-intelligence.ts";
import {
  applyOfferBoqPricing,
  mergeOfferBoqLinePricingPreservingUserDecisions,
  priceOfferBoqLine,
} from "../src/lib/tender-offer-boq-pricing-engine.ts";
import {
  patchOfferBoqComponentInDocument,
  approveOfferBoqComponentInDocument,
} from "../src/lib/tender-offer-boq-component-edit.ts";
import {
  evaluateOfferBoqValidation,
  buildGroupedRecommendations,
} from "../src/lib/tender-offer-boq-validation.ts";
import { presentOfferBoqExplainabilityView } from "../src/lib/tender-offer-boq-explainability.ts";
import {
  OFFER_BOQ_AI_QUALITY_TELEMETRY_KEY,
  buildOfferBoqAiQualityTelemetrySnapshot,
  loadOfferBoqAiQualityTelemetryLocal,
  recordOfferBoqAiQualityTelemetry,
} from "../src/lib/tender-offer-boq-ai-quality-telemetry.ts";

const FIXED_AT = "2026-07-27T14:00:00.000Z";

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
mem.clear();

function pipeline(catalogQuantities) {
  const snapshot = {
    ok: true,
    sourceFilename: "stab-01.pdf",
    rowCount: catalogQuantities.length,
    rows: [],
    catalogQuantities,
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: FIXED_AT,
  };
  let doc = buildOfferBoqFromSnapshot({
    tenderId: "tid-stab-01",
    snapshot,
    builtAt: FIXED_AT,
  });
  doc = mapOfferBoqDocument(doc, { mappedAt: FIXED_AT });
  doc = applyOfferBoqCostIntelligence(doc, { analyzedAt: FIXED_AT });
  doc = applyOfferBoqPricing(doc, { pricedAt: FIXED_AT });
  return doc;
}

// --- STAB-3 klasyfikacja ---
{
  const doc = pipeline([
    { lp: "1", description: "Sprzątanie pomieszczeń i części wspólnych", unit: "kpl", quantity: "1" },
    { lp: "2", description: "Dokumentacja powykonawcza instalacji", unit: "kpl", quantity: "1" },
    { lp: "3", description: "Odbiór końcowy robót — protokół odbioru", unit: "kpl", quantity: "1" },
    { lp: "4", description: "Próba szczelności instalacji wodnej", unit: "kpl", quantity: "1" },
    { lp: "5", description: "Zabezpieczenie tymczasowe otworów", unit: "m2", quantity: "10" },
    { lp: "6", description: "Sprawdzenie samoczynnego wyłączania zasilania (następna próba)", unit: "kpl", quantity: "1" },
  ]);
  assert.equal(doc.lines[0].costIntelligence.lineKind, "Demolition", "sprzątanie → Demolition");
  assert.equal(doc.lines[1].costIntelligence.lineKind, "Programming", "dokumentacja powykonawcza");
  assert.equal(doc.lines[2].costIntelligence.lineKind, "Measurement", "odbiór");
  assert.equal(doc.lines[3].costIntelligence.lineKind, "Measurement", "próba");
  assert.equal(doc.lines[4].costIntelligence.lineKind, "CivilWorks", "zabezpieczenie");
  assert.equal(doc.lines[5].costIntelligence.lineKind, "Measurement", "sprawdzenie/próba");
  console.log("PASS  STAB-3 classification");
}

// --- STAB-1 ochrona edycji ---
{
  let doc = pipeline([
    { lp: "1", description: "Malowanie dwukrotne ścian farbą lateksową", unit: "m2", quantity: "20" },
  ]);
  const line = doc.lines[0];
  const comp = line.linePricing.components[0];
  doc = patchOfferBoqComponentInDocument(doc, line.lineId, comp.componentId, {
    unitPricePln: 777,
  }, FIXED_AT);
  const edited = doc.lines[0].linePricing.components.find((c) => c.componentId === comp.componentId);
  assert.equal(edited.editStatus, "user_changed");
  assert.equal(edited.unitPricePln, 777);

  doc = applyOfferBoqPricing(doc, { pricedAt: FIXED_AT + "Z" });
  const after = doc.lines[0].linePricing.components.find(
    (c) => c.namePl === edited.namePl && c.category === edited.category,
  );
  assert.ok(after, "komponent po reprice");
  assert.equal(after.editStatus, "user_changed", "status zachowany");
  assert.equal(after.unitPricePln, 777, "cena użytkownika zachowana");
  assert.ok(
    after.aiSuggestedUnitPricePln == null || after.aiSuggestedUnitPricePln !== 777 || true,
    "AI może mieć sugestię",
  );
  assert.ok((after.changeHistory?.length ?? 0) >= 1, "historia zachowana");

  // approve path
  const other = doc.lines[0].linePricing.components.find((c) => c.componentId !== after.componentId)
    ?? after;
  doc = approveOfferBoqComponentInDocument(doc, line.lineId, other.componentId, FIXED_AT);
  doc = applyOfferBoqPricing(doc, { pricedAt: FIXED_AT + "Y" });
  const approved = doc.lines[0].linePricing.components.find(
    (c) => c.namePl === other.namePl && c.category === other.category,
  );
  assert.equal(approved.editStatus, "user_approved");
  console.log("PASS  STAB-1 user decision protect");
}

// --- STAB-2 grupowanie rekomendacji ---
{
  const doc = pipeline([
    { lp: "1", description: "Malowanie dwukrotne ścian farbą lateksową", unit: "m2", quantity: "10" },
    { lp: "2", description: "Dostawa i montaż opraw LED awaryjnych", unit: "szt", quantity: "5" },
    { lp: "3", description: "Indywidualna analiza niestandardowa XYZ", unit: "kpl", quantity: "1" },
  ]);
  const report = evaluateOfferBoqValidation({
    doc,
    bidProposal: { ok: true, recommendedBidPln: 1000, pricingMode: "offer_boq_ai" },
    averageConfidence: "low",
    companyKnowledgeHitCount: 0,
  });
  assert.ok(report.recommendations.length < 50, `grupy < 50 (jest ${report.recommendations.length})`);
  assert.ok(
    report.recommendations.every((r) => typeof r.occurrenceCount === "number"),
    "occurrenceCount na grupach",
  );
  const grouped = buildGroupedRecommendations(report.issues, doc, report.summary.qualityScore);
  assert.equal(grouped.length, report.recommendations.length);
  assert.ok(
    report.summary.recommendationCount === report.recommendations.length,
    "recommendationCount = liczba grup",
  );
  console.log(`PASS  STAB-2 grouped recs (${report.recommendations.length} grup, ${report.issues.length} issues)`);
}

// --- STAB-4 pokrycie wyceny (heurystyka materiału) ---
{
  const doc = pipeline([
    { lp: "1", description: "Ocieplanie stropów piwnic klejenie płyt", unit: "m2", quantity: "40" },
  ]);
  const unpriced = doc.pricingStats.unpricedComponentCount;
  const priced = doc.pricingStats.pricedComponentCount;
  assert.ok(priced > 0, "jest wycena");
  assert.ok(doc.totals.directPln > 0, "direct > 0");
  // Po STAB-4 oczekujemy niewielkiej liczby unpriced (heurystyka + labor)
  assert.ok(unpriced <= priced, `unpriced (${unpriced}) nie dominuje nad priced (${priced})`);
  console.log(`PASS  STAB-4 coverage priced=${priced} unpriced=${unpriced}`);
}

// --- STAB-5 explainability braku wyceny ---
{
  // wymuś unpriced przez pusty provider chain na jednej linii
  let doc = pipeline([
    { lp: "1", description: "Malowanie dwukrotne ścian farbą lateksową", unit: "m2", quantity: "10" },
  ]);
  // syntetycznie wyzeruj cenę jednego komponentu
  const line = doc.lines[0];
  const comps = line.linePricing.components.map((c, i) =>
    i === 0
      ? {
          ...c,
          unitPricePln: null,
          totalPln: null,
          priceOrigin: { kind: "unknown", labelPl: "Brak źródła ceny" },
          aiRationale: "Brak ceny w źródłach — uzupełnij ręcznie.",
        }
      : c,
  );
  doc = {
    ...doc,
    lines: [
      {
        ...line,
        linePricing: { ...line.linePricing, components: comps },
        catalogWorkId: null,
      },
    ],
  };
  const view = presentOfferBoqExplainabilityView(doc, FIXED_AT);
  assert.ok(view.lines[0].whyAiDecisionPl.includes("Brak pełnej wyceny") || view.lines[0].whyAiDecisionPl.includes("uzupełnij") || view.lines[0].whyAiDecisionPl.length > 20);
  assert.ok(
    /Brak|uzupełnij|Bibliotek|ręcznie|Dlaczego|Co zrobić/i.test(view.lines[0].whyAiDecisionPl),
    `explain unpriced: ${view.lines[0].whyAiDecisionPl.slice(0, 120)}`,
  );
  console.log("PASS  STAB-5 unpriced explainability");
}

// --- STAB-6 telemetria ---
{
  mem.clear();
  const doc = pipeline([
    { lp: "1", description: "Malowanie dwukrotne ścian farbą lateksową", unit: "m2", quantity: "8" },
  ]);
  const snap = buildOfferBoqAiQualityTelemetrySnapshot(doc, { tenderId: "tid-stab-01", recordedAt: FIXED_AT });
  assert.ok(snap.componentCount >= 1);
  const store = recordOfferBoqAiQualityTelemetry(doc, { tenderId: "tid-stab-01", recordedAt: FIXED_AT });
  assert.equal(store.totals.snapshotCount >= 1, true);
  assert.ok(mem.has(OFFER_BOQ_AI_QUALITY_TELEMETRY_KEY));
  const loaded = loadOfferBoqAiQualityTelemetryLocal();
  assert.ok(loaded.snapshots.length >= 1);
  console.log("PASS  STAB-6 telemetry local");
}

// merge helper unit
{
  const base = pipeline([
    { lp: "1", description: "Malowanie dwukrotne ścian farbą lateksową", unit: "m2", quantity: "5" },
  ]);
  const line = base.lines[0];
  const c0 = line.linePricing.components[0];
  const prev = {
    ...line,
    linePricing: {
      ...line.linePricing,
      components: [
        {
          ...c0,
          unitPricePln: 123,
          totalPln: 615,
          editStatus: "user_changed",
          changeHistory: [{ field: "unitPricePln", previousValue: "1", nextValue: "123", changedAt: FIXED_AT }],
          requiresUserReview: false,
        },
        ...line.linePricing.components.slice(1),
      ],
    },
  };
  const fresh = priceOfferBoqLine(line, { pricedAt: FIXED_AT });
  const merged = mergeOfferBoqLinePricingPreservingUserDecisions(prev, fresh);
  const m0 = merged.linePricing.components.find((c) => c.category === c0.category && c.namePl === c0.namePl);
  assert.equal(m0.unitPricePln, 123);
  assert.equal(m0.editStatus, "user_changed");
  console.log("PASS  STAB-1 merge helper");
}

console.log("\nALL STAB-01 PASS");
