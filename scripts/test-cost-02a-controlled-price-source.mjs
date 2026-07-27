/**
 * AI-COST-02 / COST-02-A — kontrolowane źródło cen (marketQuotes, odczyt)
 * npx vite-node scripts/test-cost-02a-controlled-price-source.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { mapOfferBoqDocument } from "../src/lib/tender-offer-boq-mapping.ts";
import { applyOfferBoqCostIntelligence } from "../src/lib/tender-offer-boq-cost-intelligence.ts";
import {
  applyOfferBoqPricing,
  createWorkCatalogPriceProvider,
} from "../src/lib/tender-offer-boq-pricing-engine.ts";
import { createControlledMarketPriceProvider } from "../src/lib/tender-offer-boq-controlled-price-source.ts";
import { integrateOfferBoqWithBidProposal } from "../src/lib/tender-offer-boq-bid-adapter.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { buildOfferBoqBidAdapterPayload } from "../src/lib/tender-offer-boq-bid-adapter.ts";

const FIXED_AT = "2026-07-27T10:00:00.000Z";

const works = [
  {
    id: "wc-mal-market",
    tradeId: "MALOWANIE",
    namePl: "Malowanie dwukrotne ścian",
    unit: "m2",
    companyPricePln: 28,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["malowanie", "dwukrotne", "scian", "farba"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "MALOWANIE",
    costSplit: { materialRatio: 0.4, laborRatio: 0.6 },
    marketQuotes: {
      sekocenbud: {
        wroclaw: {
          price: 40,
          regionCode: "wroclaw",
          coverage: "full",
          updatedAt: FIXED_AT,
          confidence: 0.9,
          origin: "sekocenbud",
        },
      },
      interbud: {
        wroclaw: {
          price: 42,
          regionCode: "wroclaw",
          coverage: "full",
          updatedAt: FIXED_AT,
          confidence: 0.8,
          origin: "interbud",
        },
      },
    },
  },
];

const snap = {
  ok: true,
  sourceFilename: "przedmiar-02a.pdf",
  rowCount: 1,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie dwukrotne ścian farbą lateksową",
      unit: "m2",
      quantity: "100",
    },
  ],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: FIXED_AT,
};

// T1 — provider zwraca controlled_market z regionem / aktualnością
{
  const provider = createControlledMarketPriceProvider(works, {
    hourlyPln: 80,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  const line = {
    lineId: "L1",
    lp: "1",
    description: "Malowanie",
    unit: "m2",
    quantity: 100,
    catalogWorkId: "wc-mal-market",
    matchConfidence: "high",
  };
  const hit = provider.lookup({
    category: "material",
    namePl: "Materiał",
    unit: "m2",
    quantity: 100,
    line,
    pricingComponentKind: "material",
  });
  assert.ok(hit, "T1: oczekiwano trafienia marketQuotes");
  assert.equal(hit.origin.kind, "controlled_market");
  assert.ok(hit.unitPricePln != null && hit.unitPricePln > 0);
  assert.equal(hit.origin.regionCode, "wroclaw");
  assert.ok(hit.origin.asOf);
  assert.equal(hit.origin.externalProviderId, "work_catalog_market_quotes");
  assert.equal("kpPct" in hit, false);
  assert.equal("recommendedBidPln" in hit, false);
  assert.equal("marginPct" in hit, false);
  assert.ok(hit.controlledMarket?.originCount >= 1);
}

// T2 — brak marketQuotes → null (łańcuch idzie dalej)
{
  const bare = [{ ...works[0], id: "wc-bare", marketQuotes: undefined, companyPricePln: 28 }];
  const provider = createControlledMarketPriceProvider(bare, {
    hourlyPln: 80,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  const miss = provider.lookup({
    category: "material",
    namePl: "Materiał",
    unit: "m2",
    quantity: 10,
    line: {
      lineId: "L2",
      lp: "2",
      description: "X",
      unit: "m2",
      quantity: 10,
      catalogWorkId: "wc-bare",
      matchConfidence: "high",
    },
    pricingComponentKind: "material",
  });
  assert.equal(miss, null, "T2: bez marketQuotes provider milczy");
}

// T3 — leadingProviders: controlled_market wygrywa przed work_catalog companyPrice
{
  const base = buildOfferBoqFromSnapshot({
    tenderId: "tid-02a",
    snapshot: snap,
    builtAt: FIXED_AT,
  });
  const mapped = mapOfferBoqDocument(base, { works, mappedAt: FIXED_AT });
  const analyzed = applyOfferBoqCostIntelligence(mapped, { analyzedAt: FIXED_AT });
  const priced = applyOfferBoqPricing(analyzed, {
    works,
    pricedAt: FIXED_AT,
    leadingProviders: [
      createControlledMarketPriceProvider(works, {
        hourlyPln: 80,
        startRegionCode: "wroclaw",
        computedAtIso: FIXED_AT,
      }),
    ],
  });
  const comps = priced.lines[0]?.linePricing?.components ?? [];
  const marketHits = comps.filter((c) => c.priceOrigin.kind === "controlled_market");
  assert.ok(marketHits.length >= 1, "T3: oczekiwano controlled_market w wycenie");
  assert.ok(marketHits.every((c) => c.controlledMarketHint?.used === true));
  assert.ok(marketHits.every((c) => c.priceOrigin.kind !== "work_catalog"));
  // Zero oferty w S4
  for (const c of comps) {
    assert.equal("recommendedBidPln" in c, false);
  }
}

// T4 — Bid path call-only: S6 → computeTenderBidProposal (bez lokalnej marży w S4)
{
  const base = buildOfferBoqFromSnapshot({
    tenderId: "tid-02a-bid",
    snapshot: snap,
    builtAt: FIXED_AT,
  });
  const mapped = mapOfferBoqDocument(base, { works, mappedAt: FIXED_AT });
  const analyzed = applyOfferBoqCostIntelligence(mapped, { analyzedAt: FIXED_AT });
  const priced = applyOfferBoqPricing(analyzed, {
    works,
    pricedAt: FIXED_AT,
    leadingProviders: [
      createControlledMarketPriceProvider(works, {
        hourlyPln: 80,
        startRegionCode: "wroclaw",
        computedAtIso: FIXED_AT,
      }),
    ],
  });
  const costModel = defaultCostModelFromPayroll();
  const integrated = integrateOfferBoqWithBidProposal({
    doc: priced,
    kosztorys: snap,
    swz: null,
    fit: null,
    costModel,
    builtAt: FIXED_AT,
  });
  assert.ok(integrated, "T4: integracja S6");
  assert.equal(integrated.proposal.pricingMode, "offer_boq_ai");
  assert.ok(integrated.proposal.recommendedBidPln != null);

  const payload = buildOfferBoqBidAdapterPayload(priced, FIXED_AT);
  assert.ok(payload);
  const direct = computeTenderBidProposal({
    kosztorys: snap,
    swz: null,
    fit: null,
    costModel,
    minProjectDays: 14,
    maxConcurrentProjects: 2,
    offerBoqDirect: payload.directInput,
  });
  assert.equal(direct.recommendedBidPln, integrated.proposal.recommendedBidPln);
}

// T5 — work_catalog provider nadal działa (REUSE), controlled nie psuje łańcucha
{
  const wc = createWorkCatalogPriceProvider(works, 80);
  const hit = wc.lookup({
    category: "material",
    namePl: "Materiał",
    unit: "m2",
    quantity: 10,
    line: {
      lineId: "Lx",
      lp: "1",
      description: "M",
      unit: "m2",
      quantity: 10,
      catalogWorkId: "wc-mal-market",
      matchConfidence: "high",
    },
    pricingComponentKind: "material",
  });
  assert.ok(hit);
  assert.equal(hit.origin.kind, "work_catalog");
}

console.log("COST-02-A controlled price source: ALL PASS");
