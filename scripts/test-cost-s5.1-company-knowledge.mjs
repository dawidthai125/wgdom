/**
 * COST-S5.1 — firmowa baza wiedzy kosztorysowej
 * npx vite-node scripts/test-cost-s5.1-company-knowledge.mjs
 */
import assert from "node:assert/strict";
import {
  applyOfferBoqPricing,
} from "../src/lib/tender-offer-boq-pricing-engine.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { mapOfferBoqDocument } from "../src/lib/tender-offer-boq-mapping.ts";
import { applyOfferBoqCostIntelligence } from "../src/lib/tender-offer-boq-cost-intelligence.ts";
import {
  approveOfferBoqComponentInDocument,
  patchOfferBoqComponentInDocument,
} from "../src/lib/tender-offer-boq-component-edit.ts";
import {
  OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
  computeCompanyKnowledgeStats,
  createCompanyKnowledgePriceProvider,
  findCompanyKnowledgeEntry,
  getCompanyKnowledgeStoreForBidPrep,
  loadCompanyKnowledgeStoreLocal,
  recordCompanyKnowledgeDecision,
  saveCompanyKnowledgeStoreLocal,
} from "../src/lib/tender-offer-boq-company-knowledge.ts";
import {
  buildOfferBoqExplainabilityView,
  presentOfferBoqExplainabilityView,
} from "../src/lib/tender-offer-boq-explainability.ts";

const FIXED_AT = "2026-07-27T10:00:00.000Z";

/** Minimalny localStorage dla Node. */
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    mem.set(k, String(v));
  },
  removeItem: (k) => {
    mem.delete(k);
  },
  clear: () => mem.clear(),
};

mem.clear();

const snapshot = {
  ok: true,
  sourceFilename: "przedmiar-s51.pdf",
  rowCount: 1,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie dwukrotne ścian farbą lateksową",
      unit: "m2",
      quantity: "10",
    },
  ],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: FIXED_AT,
};

let doc = buildOfferBoqFromSnapshot({
  tenderId: "tid-s51",
  snapshot,
  builtAt: FIXED_AT,
});
doc = mapOfferBoqDocument(doc, { mappedAt: FIXED_AT, documentContext: snapshot.sourceFilename });
doc = applyOfferBoqCostIntelligence(doc, {
  analyzedAt: FIXED_AT,
  documentContext: snapshot.sourceFilename,
});
doc = applyOfferBoqPricing(doc, {
  pricedAt: FIXED_AT,
  documentContext: snapshot.sourceFilename,
});

assert.ok(doc.lines[0]?.linePricing?.components?.length >= 1);
const first = doc.lines[0].linePricing.components[0];

// — Uczenie przyrostowe (patch) —
doc = patchOfferBoqComponentInDocument(
  doc,
  doc.lines[0].lineId,
  first.componentId,
  { unitPricePln: 42.5, quantity: first.quantity },
  FIXED_AT,
);
let store = loadCompanyKnowledgeStoreLocal();
assert.ok(store.entries.length >= 1);
const entryAfterChange = findCompanyKnowledgeEntry(store, {
  namePl: first.namePl,
  category: first.category,
  unit: first.unit,
});
assert.ok(entryAfterChange);
assert.equal(entryAfterChange.changedCount >= 1, true);
assert.equal(entryAfterChange.occurrenceCount >= 1, true);
assert.equal(entryAfterChange.observations.length >= 1, true);
const obsLen1 = entryAfterChange.observations.length;
assert.equal(entryAfterChange.lastUnitPricePln, 42.5);

// druga decyzja — nie nadpisuje historii
const secondComp =
  doc.lines[0].linePricing.components.find((c) => c.componentId !== first.componentId) ??
  doc.lines[0].linePricing.components[0];
doc = approveOfferBoqComponentInDocument(
  doc,
  doc.lines[0].lineId,
  secondComp.componentId,
  "2026-07-27T10:01:00.000Z",
);
store = loadCompanyKnowledgeStoreLocal();
const entryAgain = findCompanyKnowledgeEntry(store, {
  namePl: first.namePl,
  category: first.category,
  unit: first.unit,
});
assert.ok(entryAgain);
assert.ok(entryAgain.observations.length >= obsLen1);
assert.equal(store.schemaVersion, 1);

// — Provider wiedzy jako leading —
const seeded = recordCompanyKnowledgeDecision(
  { schemaVersion: 1, updatedAt: FIXED_AT, entries: [] },
  {
    component: {
      ...first,
      namePl: "Farba lateksowa biała",
      category: "material",
      unit: "l",
      unitPricePln: 55,
      totalPln: 55,
      editStatus: "user_approved",
    },
    decision: "approved",
    fromAi: true,
    fieldsChanged: ["editStatus"],
    observedAt: FIXED_AT,
  },
);
const seeded2 = recordCompanyKnowledgeDecision(seeded, {
  component: {
    ...first,
    namePl: "Farba lateksowa biała",
    category: "material",
    unit: "l",
    unitPricePln: 58,
    totalPln: 58,
    editStatus: "user_changed",
  },
  decision: "changed",
  fromAi: false,
  fieldsChanged: ["unitPricePln"],
  observedAt: "2026-07-27T10:02:00.000Z",
});
assert.equal(seeded2.entries[0].observations.length, 2);
assert.equal(seeded2.entries[0].occurrenceCount, 2);

const provider = createCompanyKnowledgePriceProvider(seeded2);
const hit = provider.lookup({
  category: "material",
  namePl: "Farba lateksowa biała",
  unit: "l",
  quantity: 1,
  line: doc.lines[0],
  pricingComponentKind: "material",
});
assert.ok(hit);
assert.equal(hit.origin.kind, "company_knowledge");
assert.ok(hit.unitPricePln === 58 || hit.unitPricePln === 55);
assert.ok(hit.companyKnowledge);
assert.equal(hit.companyKnowledge.occurrenceCount, 2);
assert.equal(hit.confidence === "medium" || hit.confidence === "high", true);
assert.match(hit.rationale, /wiedzę firmy/i);

// wycena z leadingProviders
let priced = buildOfferBoqFromSnapshot({
  tenderId: "tid-s51b",
  snapshot,
  builtAt: FIXED_AT,
});
priced = mapOfferBoqDocument(priced, { mappedAt: FIXED_AT });
priced = applyOfferBoqCostIntelligence(priced, { analyzedAt: FIXED_AT });
// doklej sztuczny komponent matching do seeda przez zapis w store + provider
saveCompanyKnowledgeStoreLocal(seeded2);
priced = applyOfferBoqPricing(priced, {
  pricedAt: FIXED_AT,
  leadingProviders: [createCompanyKnowledgePriceProvider(loadCompanyKnowledgeStoreLocal())],
});

const presented = presentOfferBoqExplainabilityView(priced, FIXED_AT);
assert.ok(typeof presented.summary.companyKnowledgeHitCount === "number");
assert.ok(
  presented.lines.every((l) =>
    l.components.every((c) => typeof c.companyKnowledgeUsed === "boolean"),
  ),
);

// Explainability build ładuje store (może 0 hitów bez match nazwy)
const item = {
  id: "tid-s51-view",
  tenderDossier: { kosztorys: snapshot },
};
const view = buildOfferBoqExplainabilityView({ item, builtAt: FIXED_AT });
assert.equal(view.available, true);
assert.ok(view.summary);
assert.ok(typeof view.summary.companyKnowledgeHitCount === "number");

const stats = computeCompanyKnowledgeStats(seeded2);
assert.equal(stats.entryCount, 1);
assert.equal(stats.userConfirmedEntryCount, 1);
assert.equal(stats.observationCount, 2);
assert.ok(stats.aiUserAgreementPct != null);
assert.equal(stats.topMaterials.length, 1);
assert.equal(stats.topMaterials[0].namePl, "Farba lateksowa biała");

const prep = getCompanyKnowledgeStoreForBidPrep();
assert.ok(prep);
assert.equal(prep.schemaVersion, 1);
assert.ok(mem.has(OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY));

// brak Kp / marży / oferty
assert.equal(doc.totals.kpPln, null);
assert.equal(doc.totals.marginPln, null);
assert.equal(doc.totals.recommendedBidPln, null);

console.log("COST-S5.1 company knowledge: PASS");
