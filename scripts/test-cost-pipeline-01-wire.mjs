/**
 * COST-PIPELINE-01 — wire OfferBoq → Bid + CTA semantics + warstwy L0/L1/L2
 * Run: npx vite-node scripts/test-cost-pipeline-01-wire.mjs
 */
import assert from "node:assert/strict";
import {
  buildOfferBoqDocumentForPipelineItem,
  buildOfferBoqExplainabilityView,
  computeRuntimeBidFromOfferBoq,
} from "../src/lib/tender-offer-boq-explainability.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import {
  COST_PIPELINE_01_DEFAULT,
  COST_PIPELINE_01_LS_KEY,
  isCostPipeline01Enabled,
} from "../src/lib/tenders-v4-config.ts";

const FIXED_AT = "2026-07-28T10:00:00.000Z";
const OFFER_BOQ_PRIMARY_ANCHOR_ID = "offer-boq-primary";

const item = {
  id: "tid-cp01",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-cp01.pdf",
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

// CP1 — flaga default ON
assert.equal(COST_PIPELINE_01_DEFAULT, true);
assert.equal(COST_PIPELINE_01_LS_KEY, "kw-cost-pipeline-01");
assert.equal(isCostPipeline01Enabled(), true);

// CP2 — wspólny builder L1
const doc = buildOfferBoqDocumentForPipelineItem({ item, builtAt: FIXED_AT });
assert.ok(doc);
assert.ok((doc.totals.directPln ?? 0) > 0);

// CP3 — runtime Bid z OfferBoq (L2), pricingMode offer_boq_ai
const runtime = computeRuntimeBidFromOfferBoq({ item, builtAt: FIXED_AT, positionCostCutover: false });
assert.ok(runtime);
assert.equal(runtime.usedOfferBoqDirect, true);
assert.equal(runtime.proposal.pricingMode, "offer_boq_ai");
assert.ok(runtime.proposal.recommendedBidPln != null && runtime.proposal.recommendedBidPln > 0);

// CP4 — Outcome PLN ≡ explainability Bid (ta sama ścieżka L1→L2)
const view = buildOfferBoqExplainabilityView({ item, builtAt: FIXED_AT, positionCostCutover: false });
assert.equal(view.available, true);
assert.equal(view.bidProposal?.pricingMode, "offer_boq_ai");
assert.equal(view.bidProposal?.recommendedBidPln, runtime.proposal.recommendedBidPln);

// CP5 — Bid NIE re-aggregate katalogu gdy używa OfferBoq
// (catalog-only proposal różni się trybem; runtime musi być offer_boq_ai)
const profile = loadCompanyProfileLocal();
const { catalog } = resolveActiveCatalogForTender({
  referenceHourlyPln: profile.costModel.avgGrossHourlyPln,
});
const catalogProposal = computeTenderBidProposal({
  kosztorys: item.tenderDossier.kosztorys,
  swz: item.tenderDossier.swz,
  fit: item.tenderDossier.fit,
  costModel: profile.costModel,
  catalog,
});
assert.equal(catalogProposal.pricingMode, "catalog");
assert.notEqual(runtime.proposal.pricingMode, "catalog");

// CP6 — empty item → null runtime (hook BUGFIX-01: catalog fallback poza tym testem)
const emptyRuntime = computeRuntimeBidFromOfferBoq({
  item: { id: "empty", tenderDossier: { kosztorys: null } },
  builtAt: FIXED_AT,
  positionCostCutover: false,
});
assert.equal(emptyRuntime, null);

// CP7 — CTA kotwica OfferBoq (nie ATH)
assert.equal(OFFER_BOQ_PRIMARY_ANCHOR_ID, "offer-boq-primary");

console.log("COST-PIPELINE-01 wire: PASS", {
  pricingMode: runtime.proposal.pricingMode,
  recommendedBidPln: runtime.proposal.recommendedBidPln,
  directPln: doc.totals.directPln,
  catalogMode: catalogProposal.pricingMode,
});
