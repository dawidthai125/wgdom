/**
 * NG11-A1 — progressive heavy build readiness + cost/metadata split.
 * npx vite-node scripts/test-ng11-a1-progressive-heavy.mjs
 */

import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { derivePipelineState } from "../src/lib/tender-pipeline/derive-pipeline-state.ts";
import {
  deriveDossierEnriching,
  derivePartialDossierReady,
  derivePricingReadyFinal,
  derivePricingReadyPartial,
} from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import {
  buildTenderDossierCostPhase,
  enrichTenderDossierMetadataPhase,
  buildTenderDossierHeavy,
} from "../src/lib/tender-dossier-pipeline.ts";
import {
  prepareTenderDossierParseSession,
  executeTenderDossierCostPhase,
  executeTenderDossierMetadataPhase,
} from "../src/lib/tender-document-resolver.ts";

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  };
}

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
  id: "ng11-a1-item",
  tenderId: "t-1",
  title: "Test",
  ourEstimatePln: null,
  uploadedFile: null,
};

console.log("=== NG11-A1 Progressive Heavy ===\n");

ok("A1-R1 partialDossierReady when kosztorys ok + persist flushed", derivePartialDossierReady({
  item: {
    ...baseItem,
    tenderDossier: {
      brief: { title: "x" },
      kosztorys: { ok: true, rows: [], sourceFilename: "t.ath" },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
  partialPersistPending: false,
}));

ok("A1-R2 partialDossierReady false while persist pending", !derivePartialDossierReady({
  item: {
    ...baseItem,
    tenderDossier: {
      brief: { title: "x" },
      kosztorys: { ok: true, rows: [], sourceFilename: "t.ath" },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
  partialPersistPending: true,
}));

ok("A1-R3 dossierEnriching signal", deriveDossierEnriching({ metadataPhaseRunning: true }));

ok("A1-R4 pricingReadyPartial", derivePricingReadyPartial({
  partialDossierReady: true,
  ownerFinanceProposal: { ok: true, recommendedBidPln: 1000 },
}));

ok("A1-R5 pricingReadyFinal needs full heavy", derivePricingReadyFinal({
  item: {
    ...baseItem,
    tenderDossier: {
      brief: { title: "x" },
      kosztorys: { ok: true, rows: [], sourceFilename: "t.ath" },
      scanSummary: { parsedAt: new Date().toISOString(), totalDocuments: 1, scanned: 1, parsed: 1, byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 }, sevenZipCount: 0, kosztorysFound: true, valueFound: true, criteriaFound: false, estimateFound: false, costDiscovery: null },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
  ownerFinanceProposal: { ok: true, recommendedBidPln: 1000 },
}));

const partialItem = {
  id: "ng11-a1-partial",
  tenderId: "08dec13d-5547-aa6d-5fad-9500015c4ea0",
  title: "TP113",
  ourEstimatePln: null,
  uploadedFile: null,
};

console.log("\n-- A1 live cost/metadata split (TP113) --");
try {
  const { fetchTenderDocuments } = await import("../src/lib/tenders-bzp.ts");
  const docs = await fetchTenderDocuments(partialItem.tenderId, "2026/BZP 00273812/01");
  const cost = await buildTenderDossierCostPhase({
    item: partialItem,
    docs,
    pipelineTimingItemId: partialItem.id,
  });
  ok("A1-L1 cost phase kosztorys", Boolean(cost.tenderDossier.kosztorys?.ok));
  ok("A1-L2 partial scanSummary bez parsedAt", cost.tenderDossier.scanSummary?.parsedAt == null);
  ok("A1-L3 parseSession present", cost.parseSession != null);
  if (cost.parseSession) {
    const final = await enrichTenderDossierMetadataPhase({
      item: partialItem,
      docs,
      parseSession: cost.parseSession,
      partialDossier: cost.tenderDossier,
      partialSwz: cost.swzAnalysis,
      partialEstimatePln: cost.ourEstimatePln,
      pipelineTimingItemId: partialItem.id,
    });
    ok("A1-L4 final scanSummary parsedAt", Boolean(final.tenderDossier.scanSummary?.parsedAt));
    const monolith = await buildTenderDossierHeavy({
      item: partialItem,
      docs,
      pipelineTimingItemId: `${partialItem.id}-mono`,
    });
    ok("A1-L5 monolith wrapper kosztorys", Boolean(monolith.tenderDossier.kosztorys?.ok));
  }
} catch (e) {
  fail += 1;
  console.log(`  FAIL A1 live split — ${e instanceof Error ? e.message : e}`);
}

const statePricing = derivePipelineState({
  item: {
    ...baseItem,
    tenderDossier: {
      brief: { title: "x" },
      kosztorys: { ok: true, rows: [], sourceFilename: "t.ath" },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
  autoRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: false,
  partialDossierReady: true,
  dossierEnriching: true,
  pricingReadyPartial: false,
  pricingReadyFinal: false,
  canStartHeavyParse: false,
});
ok("A1-S1 partial ready + enriching → Pricing", statePricing === PipelineState.Pricing);

const stateReady = derivePipelineState({
  item: {
    ...baseItem,
    tenderDossier: {
      brief: { title: "x" },
      kosztorys: { ok: true, rows: [], sourceFilename: "t.ath" },
      scanSummary: { parsedAt: new Date().toISOString(), totalDocuments: 1, scanned: 1, parsed: 1, byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 }, sevenZipCount: 0, kosztorysFound: true, valueFound: true, criteriaFound: false, estimateFound: false, costDiscovery: null },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
  autoRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: true,
  partialDossierReady: true,
  pricingReadyFinal: true,
  canStartHeavyParse: false,
});
ok("A1-S2 full + pricingReadyFinal → Ready", stateReady === PipelineState.Ready);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
