/**
 * COST-PIPELINE-01-BUGFIX-01 — OfferBoq first · C-MODE-1a OfferBoq null → GAP
 * Run: npx vite-node scripts/test-cost-pipeline-01-bugfix-01.mjs
 *
 * Historycznie BF2 = catalog fallback. Po C-MODE-1a: OfferBoq null → null (GAP).
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
    positionCostCutover: false,
  });
  assert.ok(runtime, "BF1 setup: OfferBoq runtime musi istnieć");
  const proposal = resolveTenderPricingAutoProposal({
    item: richItem,
    swz: richItem.tenderDossier.swz,
    priceOverrides: [],
    costPipeline01Enabled: true,
    positionCostCutover: false,
  });
  assert.ok(proposal);
  assert.equal(proposal.pricingMode, "offer_boq_ai");
  assert.equal(proposal.recommendedBidPln, runtime.proposal.recommendedBidPln);
  console.log("PASS BF1 OfferBoq → Bid", {
    recommendedBidPln: proposal.recommendedBidPln,
  });
}

// BF2 — OfferBoq NULL → GAP (C-MODE-1a: ZERO catalog / ath_priced fallback)
{
  const runtimeNull = computeRuntimeBidFromOfferBoq({
    item: emptyItem,
    builtAt: FIXED_AT,
    positionCostCutover: false,
  });
  assert.equal(runtimeNull, null, "BF2 setup: OfferBoq null");

  const proposal = resolveTenderPricingAutoProposal({
    item: emptyItem,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  assert.equal(proposal, null, "BF2: OfferBoq null → GAP null (nie catalog)");
  console.log("PASS BF2 OfferBoq null → GAP");
}

// BF3 — OfferBoq null → brak recommendedBidPln (GAP)
{
  const proposal = resolveTenderPricingAutoProposal({
    item: emptyItem,
    priceOverrides: [],
    costPipeline01Enabled: true,
  });
  assert.equal(proposal, null, "BF3: GAP null");
  console.log("PASS BF3 OfferBoq null → no recommended price");
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
