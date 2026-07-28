/**
 * COST-PIPELINE-01-BUGFIX-01 — OfferBoq first · catalog fallback · both null
 * Run: npx vite-node scripts/test-cost-pipeline-01-bugfix-01.mjs
 */
import assert from "node:assert/strict";
import { resolveTenderPricingAutoProposal } from "../src/app/hooks/useTenderPricingAuto.ts";
import { computeRuntimeBidFromOfferBoq } from "../src/lib/tender-offer-boq-explainability.ts";

const FIXED_AT = "2026-07-28T12:00:00.000Z";

const richItem = {
  id: "tid-bf01-rich",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-bf01.pdf",
      rowCount: 1,
      rows: [],
      catalogQuantities: [
        {
          lp: "1",
          description: "Malowanie dwukrotne ścian farbą lateksową",
          unit: "m2",
          quantity: "50",
        },
      ],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
    swz: {
      implementationDays: 30,
      estimatedValuePln: 50000,
    },
    fit: {
      priceWeightPct: 60,
    },
  },
};

/** Brak linii → OfferBoq null; catalog też bez ilości → bez ceny. */
const emptyItem = {
  id: "tid-bf01-empty",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "empty.pdf",
      rowCount: 0,
      rows: [],
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
    swz: null,
    fit: null,
  },
};

// BF1 — OfferBoq istnieje → Outcome używa offer_boq_ai
{
  const runtime = computeRuntimeBidFromOfferBoq({
    item: richItem,
    builtAt: FIXED_AT,
  });
  assert.ok(runtime, "BF1 setup: OfferBoq runtime musi istnieć");
  const proposal = resolveTenderPricingAutoProposal({
    item: richItem,
    swz: richItem.tenderDossier.swz,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  assert.ok(proposal);
  assert.equal(proposal.pricingMode, "offer_boq_ai");
  assert.equal(proposal.recommendedBidPln, runtime.proposal.recommendedBidPln);
  console.log("PASS BF1 OfferBoq → Bid", {
    recommendedBidPln: proposal.recommendedBidPln,
  });
}

// BF2 — OfferBoq NULL → catalog path (obiekt proposal, nie early null)
{
  const runtimeNull = computeRuntimeBidFromOfferBoq({
    item: emptyItem,
    builtAt: FIXED_AT,
  });
  assert.equal(runtimeNull, null, "BF2 setup: OfferBoq null");

  const proposal = resolveTenderPricingAutoProposal({
    item: emptyItem,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  // Przed BUGFIX: early `return null` bez catalog.
  // Po BUGFIX: zawsze wynik computeCatalog… (obiekt).
  assert.ok(proposal !== null, "BF2: catalog fallback musi zwrócić proposal (nie early null)");
  assert.equal(typeof proposal, "object");
  assert.ok(
    proposal.pricingMode === "catalog" ||
      proposal.pricingMode === null ||
      proposal.ok === false,
  );
  console.log("PASS BF2 OfferBoq null → catalog path", {
    pricingMode: proposal.pricingMode,
    ok: proposal.ok,
    recommendedBidPln: proposal.recommendedBidPln,
  });
}

// BF3 — oba bez ceny → brak recommendedBidPln > 0
{
  const proposal = resolveTenderPricingAutoProposal({
    item: emptyItem,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  assert.ok(proposal);
  const pln = proposal.recommendedBidPln;
  assert.ok(pln == null || !(pln > 0), "BF3: brak rekomendowanej ceny");
  console.log("PASS BF3 both paths no price", {
    ok: proposal.ok,
    pricingMode: proposal.pricingMode,
  });
}

// BF4 — flaga OFF → wyłącznie catalog
{
  const proposal = resolveTenderPricingAutoProposal({
    item: richItem,
    swz: richItem.tenderDossier.swz,
    priceOverrides: [],
    costPipeline01Enabled: false,
  });
  assert.ok(proposal);
  assert.equal(proposal.pricingMode, "catalog");
  console.log("PASS BF4 flag OFF → catalog only", {
    recommendedBidPln: proposal.recommendedBidPln,
  });
}

console.log("COST-PIPELINE-01-BUGFIX-01: PASS");
