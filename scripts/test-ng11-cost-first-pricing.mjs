/**
 * NG11-Q5 — early pricing po partialDossierReady + recompute po metadata merge.
 * npx vite-node scripts/test-ng11-cost-first-pricing.mjs
 */

import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { derivePipelineState } from "../src/lib/tender-pipeline/derive-pipeline-state.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";
import {
  canComputeTenderPricingAuto,
  derivePartialDossierReady,
  derivePricingReadyFinal,
  derivePricingReadyPartial,
} from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

const baseItem = {
  id: "ng11-q5-item",
  tenderId: "t-q5",
  title: "Q5 Test",
  ourEstimatePln: null,
  uploadedFile: null,
};

const kosztorysFixture = {
  ok: true,
  source: "ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie ścian emulsyjne dwukrotnie",
      unit: "m2",
      quantity: "100",
    },
  ],
  totalValue: null,
  currency: "PLN",
};

const partialDossier = {
  brief: { title: "x" },
  kosztorys: kosztorysFixture,
  parserVersion: CURRENT_PARSER_VERSION,
  builtAt: new Date().toISOString(),
};

const fullDossier = {
  ...partialDossier,
  scanSummary: {
    parsedAt: new Date().toISOString(),
    totalDocuments: 1,
    scanned: 1,
    parsed: 1,
    byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 },
    sevenZipCount: 0,
    kosztorysFound: true,
    valueFound: true,
    criteriaFound: false,
    estimateFound: false,
    costDiscovery: null,
  },
};

const costModel = defaultCostModelFromPayroll();
const { catalog } = resolveActiveCatalogForTender({
  referenceHourlyPln: costModel.avgGrossHourlyPln,
});

function computeForItem(item, swz = null) {
  return computeTenderBidProposal({
    kosztorys: item.tenderDossier?.kosztorys,
    swz,
    fit: item.tenderFit ?? null,
    costModel,
    minProjectDays: 30,
    maxConcurrentProjects: 3,
    catalog,
  });
}

console.log("=== NG11-Q5 Cost-first pricing ===\n");

ok("Q5-G1 gate blocked without partial or heavy", !canComputeTenderPricingAuto({
  partialDossierReady: false,
  item: { ...baseItem, tenderDossier: null },
}));

ok("Q5-G2 gate open on partialDossierReady", canComputeTenderPricingAuto({
  partialDossierReady: true,
  item: { ...baseItem, tenderDossier: partialDossier },
}));

ok("Q5-G3 gate blocked on NOT_FOUND cost", !canComputeTenderPricingAuto({
  partialDossierReady: true,
  item: {
    ...baseItem,
    tenderDossier: {
      brief: { title: "x" },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
}));

ok("Q5-G4 partialDossierReady false while persist pending", !derivePartialDossierReady({
  item: { ...baseItem, tenderDossier: partialDossier },
  partialPersistPending: true,
}));

const partialItem = { ...baseItem, tenderDossier: partialDossier };
const partialReady = derivePartialDossierReady({ item: partialItem, partialPersistPending: false });
ok("Q5-G5 partialDossierReady after persist flush", partialReady);

const partialProposal = computeForItem(partialItem, null);
ok("Q5-P1 early compute on partial dossier (no scanSummary)", partialProposal?.ok === true);

ok("Q5-P2 pricingReadyPartial after early compute", derivePricingReadyPartial({
  partialDossierReady: partialReady,
  ownerFinanceProposal: partialProposal,
}));

const enrichedSwz = {
  source: "pdf",
  parsedAt: new Date().toISOString(),
  estimatedValuePln: 5_000_000,
  implementationDays: 180,
  wadiumPln: 50_000,
  awardCriteria: [{ name: "Cena", weightPct: 90 }],
};

const enrichedItem = {
  ...partialItem,
  swzAnalysis: enrichedSwz,
  tenderFit: { priceWeightPct: 90, experienceWeightPct: 10 },
};

const enrichedProposal = computeForItem(enrichedItem, enrichedSwz);
ok("Q5-P3 recompute after metadata merge changes bid", enrichedProposal?.ok === true
  && enrichedProposal.recommendedBidPln !== partialProposal.recommendedBidPln);

ok("Q5-P4 metadata stamp absent before metadata phase", !partialDossier.scanSummary?.parsedAt);

const fullItem = { ...enrichedItem, tenderDossier: fullDossier };
ok("Q5-F1 heavy parse done after metadata phase", tenderDossierHeavyParseDone(fullDossier));

ok("Q5-F2 pricingReadyFinal on full dossier", derivePricingReadyFinal({
  item: fullItem,
  ownerFinanceProposal: enrichedProposal,
  dossierEnriching: false,
}));

ok("Q5-F3 pricingReadyFinal false on partial while enriching", !derivePricingReadyFinal({
  item: partialItem,
  ownerFinanceProposal: partialProposal,
  dossierEnriching: true,
}));

const pipelinePartial = derivePipelineState({
  item: partialItem,
  autoRunning: false,
  externalRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: derivePricingReadyPartial({ partialDossierReady: partialReady, ownerFinanceProposal: partialProposal }),
  partialDossierReady: partialReady,
  dossierEnriching: true,
  pricingReadyPartial: true,
  pricingReadyFinal: false,
  canStartHeavyParse: true,
});
ok("Q5-S1 pipeline Pricing on partial (OD-3)", pipelinePartial === PipelineState.Pricing);

const pipelineFinal = derivePipelineState({
  item: fullItem,
  autoRunning: false,
  externalRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: true,
  partialDossierReady: true,
  dossierEnriching: false,
  pricingReadyPartial: true,
  pricingReadyFinal: true,
  canStartHeavyParse: true,
});
ok("Q5-S2 pipeline Ready only on pricingReadyFinal", pipelineFinal === PipelineState.Ready);

console.log(`\n=== NG11-Q5: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
