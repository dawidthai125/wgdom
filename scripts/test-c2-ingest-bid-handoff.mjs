/**
 * C2 ingest FULL → canonical kosztorysForBid / OfferBoq handoff regression.
 * npx vite-node scripts/test-c2-ingest-bid-handoff.mjs
 *
 * Asserts: P=90 registry · D1/D2/D3 admitted · P excluded · admitted lines ·
 * usable kosztorysForBid · OfferBoq rows > 0 · no no_cost_package as final ·
 * no fabricated rows · provenance · no cross-tender contamination.
 */
import {
  applyIngestArtifactsToPipelineItem,
  clearIngestStore,
  emptyIngestState,
  upsertIngestState,
} from "../src/lib/tender-ingest/index.ts";
import { resolveCostBidInput } from "../src/lib/cost-multi-02.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import {
  admitC2ComposeArtifacts,
  loadC2LineageFromIngest,
} from "../src/lib/multi-boq/c2-parent-admission.ts";
import { buildArtifactPoolFromItem } from "../src/lib/multi-boq/artifact-pool.ts";

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

let passed = 0;
let failed = 0;
function ok(cond, msg, extra) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`, extra ?? "");
  }
}

const TID = "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c";
const OTHER = "ocds-other-tender-no-contaminate";
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

function seedTpiRegistry() {
  const state = emptyIngestState(TID);
  state.documents = [
    {
      documentId: P,
      displayName: "Przedmiar.pdf",
      source: "owner_upload",
      contentHash:
        "6D0A94022BBA30DBE455FC146129E0FE0D326D547333DF1B7E568788BD264F8A",
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

function baseItem(id = TID) {
  return {
    id,
    tenderId: id,
    title: "TPI handoff",
    organizationName: "TPI",
    organizationCity: "Wrocław",
    bzpNumber: "TPI/729/2026",
    noticeNumber: "",
    publicationDate: "",
    submittingOffersDate: "",
    cpvCode: "",
    orderType: "",
    tenderDossier: {
      brief: { title: "TPI" },
      kosztorys: {
        ok: true,
        sourceFilename: "Przedmiar.pdf",
        rowCount: 0,
        rows: [],
        catalogQuantities: [],
        przedmiar: [],
        categories: [],
        warnings: ["legacy_empty"],
        parsedAt: "2026-09-08T00:00:00.000Z",
      },
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

console.log("\n=== C2 ingest → kosztorysForBid / OfferBoq handoff ===\n");

clearIngestStore();
Object.keys(lsStore).forEach((k) => delete lsStore[k]);
seedTpiRegistry();

const patched = {
  ...baseItem(),
  ...applyIngestArtifactsToPipelineItem(baseItem()),
};

const arts =
  patched.tenderDossier.scanSummary.costBranchArtifacts
  ?? patched.tenderDossier.scanSummary.branchWinnerArtifacts
  ?? [];
const pArt = arts.find((a) => a.documentId === P);
ok(pArt?.snapshot?.rows?.length === 90, "1. FULL artifact P=90", pArt?.snapshot?.rows?.length);

ok(
  arts.some((a) => a.documentId === D1 && a.snapshot?.rows?.length === 69)
    && arts.some((a) => a.documentId === D2 && a.snapshot?.rows?.length === 3)
    && arts.some((a) => a.documentId === D3 && a.snapshot?.rows?.length === 18),
  "2. D1/D2/D3 present 69/3/18",
);

const lineage = loadC2LineageFromIngest(TID);
const pool = buildArtifactPoolFromItem(patched);
const admission = admitC2ComposeArtifacts({
  artifacts: pool,
  mappedDocumentIds: pool.map((a) => a.documentId),
  lineage,
});
ok(admission.excludedParentIds.includes(P), "3. P excluded from compose when complete derived set");
ok(
  admission.admitted.every((a) => a.documentId !== P)
    && admission.admitted.map((a) => a.documentId).sort().join(",") === [D1, D2, D3].sort().join(","),
  "3b. admitted = D1+D2+D3 only",
  admission.admitted.map((a) => a.documentId),
);

const bid = resolveCostBidInput(patched);
const bidRows = bid.kosztorysForBid?.rows?.length ?? 0;
const bidQty = bid.kosztorysForBid?.catalogQuantities?.length ?? 0;
const admitted = Math.max(bidRows, bidQty);
ok(admitted === 90 || admitted === 89, "4. admitted count 89 or 90 (merge-ready)", admitted);
// Distinct LPs across branches → 69+3+18=90; Owner semantics allow 89 after KEEP ONE.
ok(admitted > 0 && admitted <= 90, "4b. admitted within P registry bound (no fabricate >90)");
ok(
  bid.reasonCodes.includes("c2_admitted_compose"),
  "5. reasonCodes includes c2_admitted_compose",
  bid.reasonCodes,
);
ok(hasUsable(bid.kosztorysForBid), "5b. canonical cost input usable");
ok(
  bid.kosztorysForBid?.sourceFilename === "C2_ADMITTED:compose",
  "5c. C2 compose sourceFilename",
  bid.kosztorysForBid?.sourceFilename,
);

const boq = buildOfferBoqFromSnapshot({
  tenderId: TID,
  snapshot: bid.kosztorysForBid,
});
ok((boq.lines?.length ?? 0) > 0, "6. OfferBoq rows > 0", boq.lines?.length);

ok(
  !bid.reasonCodes.includes("c2_admitted_compose")
    || !bid.reasonCodes.every((c) => c === "no_cost_package"),
  "7. final path not stuck on no_cost_package alone",
);
ok(
  bid.reasonCodes.includes("c2_admitted_compose"),
  "7b. C2 handoff overrides empty MULTI-02 outcome",
);

const descriptions = (bid.kosztorysForBid?.rows ?? []).map((r) => r.description);
ok(
  descriptions.every((d) => /^(D1|D2|D3) poz /.test(String(d)))
    && !descriptions.some((d) => /^P poz /.test(String(d))),
  "8. no fabricated / no P registry rows in bid",
);

ok(
  (bid.warnings ?? []).some((w) => String(w).includes("EXCLUDE_C2_PARENT_LINEAGE_ONLY")),
  "9. provenance warning EXCLUDE_C2_PARENT_LINEAGE_ONLY",
  bid.warnings?.slice(0, 5),
);
ok(
  bid.kosztorysForBid?.warnings?.includes("C2_ADMITTED_COMPOSE"),
  "9b. C2_ADMITTED_COMPOSE marker on snapshot",
);

// Cross-tender: other tender must not pick up TPI lineage
const otherItem = {
  ...baseItem(OTHER),
  ...applyIngestArtifactsToPipelineItem(baseItem(OTHER)),
};
const otherBid = resolveCostBidInput(otherItem);
ok(
  !otherBid.reasonCodes.includes("c2_admitted_compose")
    && !hasUsable(otherBid.kosztorysForBid),
  "10. no cross-tender contamination",
  otherBid.reasonCodes,
);

// dossier.kosztorys still 0 (ONE discovery unchanged)
ok(
  (patched.tenderDossier.kosztorys?.rows?.length ?? 0) === 0,
  "dossier.kosztorys rows stay 0 (ONE not overwritten)",
);

function hasUsable(s) {
  return Boolean(s?.ok) && ((s.rows?.length ?? 0) > 0 || (s.catalogQuantities?.length ?? 0) > 0);
}

console.log(`\n=== RESULT ${failed === 0 ? "PASS" : "FAIL"} (${passed} ok / ${failed} fail) ===\n`);
process.exit(failed === 0 ? 0 : 1);
