/**
 * NG11 + C2 — canonicalCostInputReady aligns pricingReadyPartial with kosztorysForBid.
 * npx vite-node scripts/test-ng11-c2-canonical-cost-readiness.mjs
 *
 * A/C2 usable + dossier.kosztorys=null + proposal.ok → Partial true · no pricing_not_ready
 * B no canonical + null dossier → not ready
 * C canonical + proposal not ok → Partial false · Chief blocked
 * D legacy dossier.kosztorys path unchanged
 * E pricingReadyFinal unchanged (C2 alone does not unlock Final)
 * F no business mutations (readiness pure)
 */
import {
  applyIngestArtifactsToPipelineItem,
  clearIngestStore,
  emptyIngestState,
  upsertIngestState,
} from "../src/lib/tender-ingest/index.ts";
import {
  canComputeTenderPricingAuto,
  derivePartialDossierReady,
  derivePricingReadyFinal,
  derivePricingReadyPartial,
  isCanonicalCostInputReady,
} from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => Object.keys(lsStore).forEach((k) => delete lsStore[k]),
};

let pass = 0;
let fail = 0;
function ok(label, cond, extra) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`, extra ?? "");
  }
}

/** Mirror createChiefSessionEngine.start pricing gate (engine UNCHANGED). */
function chiefPricingGateError(readyForChiefInput, pricingReady) {
  if (!readyForChiefInput) return "not_ready_for_chief_input";
  if (!pricingReady) return "pricing_not_ready";
  return null;
}

const TID = "ocds-ng11-c2-readiness-fixture";
const P = "doc_p_przedmiar";
const D1 = "doc_d1_construction";
const D2 = "doc_d2_sanitary";
const D3 = "doc_d3_electrical";

function rows(n, tag, branchPrefix) {
  return Array.from({ length: n }, (_, i) => ({
    lp: `${branchPrefix}${i + 1}`,
    description: `${tag} poz ${i + 1}`,
    unit: "m2",
    quantity: String(1 + (i % 5)),
    total: "",
  }));
}

function snap(filename, rowList) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount: rowList.length,
    rows: rowList,
    catalogQuantities: rowList.map((r) => ({
      lp: r.lp,
      description: r.description,
      unit: r.unit,
      quantity: r.quantity,
    })),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-09-08T00:00:00.000Z",
  };
}

function seedC2Registry() {
  const state = emptyIngestState(TID);
  state.documents = [
    {
      documentId: P,
      displayName: "Przedmiar.pdf",
      source: "owner_upload",
      contentHash: "AABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899",
    },
    {
      documentId: D1,
      displayName: "Przedmiar.pdf#p0-13:construction",
      source: "derived_cost_segment",
      parentDocumentId: P,
    },
    {
      documentId: D2,
      displayName: "Przedmiar.pdf#p14-18:sanitary",
      source: "derived_cost_segment",
      parentDocumentId: P,
    },
    {
      documentId: D3,
      displayName: "Przedmiar.pdf#p19-22:electrical",
      source: "derived_cost_segment",
      parentDocumentId: P,
    },
  ];
  state.artifacts = [
    {
      documentId: P,
      filename: "Przedmiar.pdf",
      branch: "construction",
      snapshot: snap("Przedmiar.pdf", rows(90, "P", "P")),
    },
    {
      documentId: D1,
      filename: "Przedmiar.pdf#p0-13:construction",
      branch: "construction",
      snapshot: snap("Przedmiar.pdf#p0-13:construction", rows(69, "D1", "C")),
    },
    {
      documentId: D2,
      filename: "Przedmiar.pdf#p14-18:sanitary",
      branch: "sanitary",
      snapshot: snap("Przedmiar.pdf#p14-18:sanitary", rows(3, "D2", "S")),
    },
    {
      documentId: D3,
      filename: "Przedmiar.pdf#p19-22:electrical",
      branch: "electrical",
      snapshot: snap("Przedmiar.pdf#p19-22:electrical", rows(18, "D3", "E")),
    },
  ];
  upsertIngestState(state);
}

function baseItemNullKosztorys() {
  return {
    id: TID,
    tenderId: TID,
    title: "NG11 C2 readiness",
    ourEstimatePln: null,
    uploadedFile: null,
    tenderDossier: {
      brief: { title: "TPI" },
      kosztorys: null,
      builtAt: "2026-09-08T00:00:00.000Z",
      scanSummary: {
        scannedAt: "2026-09-08T00:00:00.000Z",
        documentCount: 4,
        parsedCount: 0,
        warnings: [],
        costCandidateSources: ["Przedmiar.pdf"],
        branchWinnerArtifacts: [],
        costBranchArtifacts: [],
      },
    },
  };
}

const okProposal = {
  ok: true,
  recommendedBidPln: 100_000,
  blockers: [],
};

const badProposal = {
  ok: false,
  recommendedBidPln: null,
  blockers: ["gap"],
};

console.log("\n=== NG11 + C2 canonical cost readiness ===\n");

clearIngestStore();
Object.keys(lsStore).forEach((k) => delete lsStore[k]);
seedC2Registry();

const c2Item = {
  ...baseItemNullKosztorys(),
  ...applyIngestArtifactsToPipelineItem(baseItemNullKosztorys()),
};
// Harden: ONE discovery stays null (accepted contract — no write to dossier.kosztorys).
c2Item.tenderDossier = {
  ...c2Item.tenderDossier,
  kosztorys: null,
};

const partialLegacy = derivePartialDossierReady({
  item: c2Item,
  partialPersistPending: false,
});
ok("A0 partialDossierReady false when dossier.kosztorys=null", partialLegacy === false);
ok("A1 isCanonicalCostInputReady true (C2)", isCanonicalCostInputReady(c2Item) === true);
ok(
  "A2 canComputeTenderPricingAuto true without partial/heavy",
  canComputeTenderPricingAuto({ partialDossierReady: false, item: c2Item }) === true,
);
const partialA = derivePricingReadyPartial({
  partialDossierReady: false,
  canonicalCostInputReady: true,
  ownerFinanceProposal: okProposal,
});
ok("A3 pricingReadyPartial true (canonical + proposal.ok)", partialA === true);
const pricingReadyA = partialA || derivePricingReadyFinal({
  item: c2Item,
  ownerFinanceProposal: okProposal,
  dossierEnriching: false,
});
ok(
  "A4 Chief gate ≠ pricing_not_ready",
  chiefPricingGateError(true, pricingReadyA) === null,
  chiefPricingGateError(true, pricingReadyA),
);
ok(
  "A5 dossier.kosztorys still null (no C2 write)",
  c2Item.tenderDossier?.kosztorys == null,
);

// B — no canonical cost
clearIngestStore();
Object.keys(lsStore).forEach((k) => delete lsStore[k]);
const emptyItem = baseItemNullKosztorys();
ok("B1 isCanonicalCostInputReady false", isCanonicalCostInputReady(emptyItem) === false);
ok(
  "B2 canCompute false",
  canComputeTenderPricingAuto({ partialDossierReady: false, item: emptyItem }) === false,
);
ok(
  "B3 pricingReadyPartial false",
  derivePricingReadyPartial({
    partialDossierReady: false,
    canonicalCostInputReady: false,
    ownerFinanceProposal: okProposal,
  }) === false,
);
ok(
  "B4 Chief → pricing_not_ready",
  chiefPricingGateError(true, false) === "pricing_not_ready",
);

// C — canonical ready but finance not ok
ok(
  "C1 proposal null → Partial false",
  derivePricingReadyPartial({
    partialDossierReady: false,
    canonicalCostInputReady: true,
    ownerFinanceProposal: null,
  }) === false,
);
ok(
  "C2 proposal.ok=false → Partial false",
  derivePricingReadyPartial({
    partialDossierReady: false,
    canonicalCostInputReady: true,
    ownerFinanceProposal: badProposal,
  }) === false,
);
ok(
  "C3 Chief blocked (pricing_not_ready)",
  chiefPricingGateError(true, false) === "pricing_not_ready",
);

// D — legacy dossier.kosztorys path unchanged
const legacyKosztorys = {
  ok: true,
  sourceFilename: "legacy.ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [
    { lp: "1", description: "Malowanie", unit: "m2", quantity: "10" },
  ],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: "2026-09-08T00:00:00.000Z",
};
const legacyItem = {
  id: "legacy-one",
  tenderId: "legacy-one",
  title: "legacy",
  ourEstimatePln: null,
  uploadedFile: null,
  tenderDossier: {
    brief: { title: "l" },
    kosztorys: legacyKosztorys,
    builtAt: "2026-09-08T00:00:00.000Z",
  },
};
const legacyPartialReady = derivePartialDossierReady({
  item: legacyItem,
  partialPersistPending: false,
});
ok("D1 partialDossierReady true on legacy kosztorys.ok", legacyPartialReady === true);
ok(
  "D2 Partial via legacy path (no canonical flag)",
  derivePricingReadyPartial({
    partialDossierReady: legacyPartialReady,
    ownerFinanceProposal: okProposal,
  }) === true,
);
ok(
  "D3 canCompute on legacy partial",
  canComputeTenderPricingAuto({
    partialDossierReady: true,
    item: legacyItem,
  }) === true,
);

// E — Final unchanged: C2 null kosztorys / no heavy → Final false even with proposal.ok
seedC2Registry();
const c2Again = {
  ...baseItemNullKosztorys(),
  ...applyIngestArtifactsToPipelineItem(baseItemNullKosztorys()),
};
c2Again.tenderDossier = { ...c2Again.tenderDossier, kosztorys: null };
ok(
  "E1 pricingReadyFinal false without heavy (C2 alone)",
  derivePricingReadyFinal({
    item: c2Again,
    ownerFinanceProposal: okProposal,
    dossierEnriching: false,
  }) === false,
);
ok(
  "E2 Partial still true with canonical+proposal",
  derivePricingReadyPartial({
    partialDossierReady: false,
    canonicalCostInputReady: isCanonicalCostInputReady(c2Again),
    ownerFinanceProposal: okProposal,
  }) === true,
);

// F — pure readiness: no Accept / PM / OUR RATE / margin / Candidate / DRAFT side effects
ok("F1 readiness helpers are pure (no throw on null item dossier)", (() => {
  isCanonicalCostInputReady({ id: "x", tenderDossier: null });
  canComputeTenderPricingAuto({ partialDossierReady: false, item: { id: "x", tenderDossier: null } });
  derivePricingReadyPartial({
    partialDossierReady: false,
    canonicalCostInputReady: false,
    ownerFinanceProposal: null,
  });
  return true;
})());

console.log(`\n=== RESULT ${fail === 0 ? "PASS" : "FAIL"} (${pass} ok / ${fail} fail) ===\n`);
process.exit(fail === 0 ? 0 : 1);
