/**
 * COST-S6 — integracja AI Cost → Bid Proposal
 * npx vite-node scripts/test-cost-s6-bid-proposal-integration.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqExplainabilityView } from "../src/lib/tender-offer-boq-explainability.ts";
import {
  buildOfferBoqBidAdapterPayload,
  integrateOfferBoqWithBidProposal,
} from "../src/lib/tender-offer-boq-bid-adapter.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";

const FIXED_AT = "2026-07-27T11:00:00.000Z";

const item = {
  id: "tid-s6",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-s6.pdf",
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

const view = buildOfferBoqExplainabilityView({ item, builtAt: FIXED_AT, positionCostCutover: false });
assert.equal(view.available, true);
assert.ok(view.document);
assert.ok(view.bidImpact?.available);
assert.ok(view.offerSummary?.available);
assert.equal(view.bidProposal?.ok, true);
assert.equal(view.bidProposal?.pricingMode, "offer_boq_ai");
assert.ok(view.bidProposal.recommendedBidPln != null);
assert.ok(view.bidProposal.recommendedBidPln > (view.document.totals.directPln ?? 0));
assert.ok(view.document.totals.kpPln != null && view.document.totals.kpPln > 0);
assert.ok(view.document.totals.recommendedBidPln != null);
assert.equal(view.document.totals.recommendedBidPln, view.bidProposal.recommendedBidPln);
assert.ok(view.bidImpact.auditTrail.length === 4);
assert.ok(view.offerSummary.costStack.length >= 3);

const payload = buildOfferBoqBidAdapterPayload(view.document, FIXED_AT);
assert.ok(payload);
assert.ok(payload.directInput.directPln > 0);

const profile = loadCompanyProfileLocal();
const integration = integrateOfferBoqWithBidProposal({
  doc: view.document,
  kosztorys: item.tenderDossier.kosztorys,
  swz: item.tenderDossier.swz,
  fit: item.tenderDossier.fit,
  costModel: profile.costModel,
  builtAt: FIXED_AT,
});
assert.ok(integration);
assert.equal(integration.proposal.pricingMode, "offer_boq_ai");

// REUSE: ten sam wynik co bezpośrednie wywołanie z offerBoqDirect
const directProposal = computeTenderBidProposal({
  kosztorys: item.tenderDossier.kosztorys,
  swz: item.tenderDossier.swz,
  fit: item.tenderDossier.fit,
  costModel: profile.costModel,
  minProjectDays: 14,
  maxConcurrentProjects: 2,
  offerBoqDirect: payload.directInput,
});
assert.equal(directProposal.recommendedBidPln, integration.proposal.recommendedBidPln);
assert.equal(directProposal.costPricePln, integration.proposal.costPricePln);

// brak duplikacji Kp w adapterze — Kp tylko w costStack Bid Proposal
const kpInStack = integration.proposal.costStack.find((l) => /\bkp\b|pośredn/i.test(l.label));
assert.ok(kpInStack && kpInStack.pln > 0);

console.log("COST-S6 bid proposal integration: PASS", {
  direct: view.document.totals.directPln,
  kp: view.document.totals.kpPln,
  recommended: view.document.totals.recommendedBidPln,
});
