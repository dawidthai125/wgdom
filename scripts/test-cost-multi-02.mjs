/**
 * COST-MULTI-02 — resolveCostBidInput + Aggregate merge + fixture 08dee335.
 * Run: npx vite-node scripts/test-cost-multi-02.mjs
 */
import assert from "node:assert/strict";
import {
  buildAggregateKosztorysSnapshot,
  COST_MULTI_02_AGGREGATE_BID,
  COST_MULTI_02_HOLD_BLOCKS_BID,
  resolveCostBidInput,
  resolveCostMulti02UiOverlay,
  snapshotUsableForAggregate,
} from "../src/lib/cost-multi-02.ts";

const FIXTURE_ID = "08dee335-f338-1f30-ebd1-65000155122a";
const FIXTURE_FILES = [
  "SWZ.zip → KI_MOPS_b_budowlana_PRZEDMIAR.pdf",
  "SWZ.zip → KI_MOPS_b_elektryczna_PRZEDMIAR.pdf",
  "SWZ.zip → KI_MOPS_instalacja hydrantowa_PRZEDMIAR.pdf",
  "SWZ.zip → KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf",
];
const LEGACY = FIXTURE_FILES[3];

function makeSnap(opts) {
  return {
    ok: true,
    sourceFilename: opts.filename,
    title: opts.filename,
    totalValue: opts.totalValue,
    currency: opts.totalValue ? "PLN" : undefined,
    rowCount: opts.lines.length,
    rows: opts.lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: l.quantity,
      total: "",
    })),
    catalogQuantities: opts.lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: l.quantity,
    })),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-07-28T00:00:00.000Z",
  };
}

function fixtureItem(opts) {
  const legacySnap = makeSnap({
    filename: LEGACY,
    lines: [
      { lp: "1", description: "Pensjonat poz 1", quantity: "10" },
      { lp: "2", description: "Pensjonat poz 2", quantity: "20" },
    ],
    totalValue: "280000",
  });

  if (opts.singleBranch) {
    return {
      id: "t-single",
      tenderDossier: {
        kosztorys: legacySnap,
        scanSummary: {
          costCandidateSources: [LEGACY],
          branchWinnerArtifacts: opts.withArtifacts
            ? [{ filename: LEGACY, snapshot: legacySnap }]
            : undefined,
          kosztorysFound: true,
          totalDocuments: 1,
          scanned: 1,
          parsed: 1,
          byType: { pdf: 1, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
          valueFound: true,
          criteriaFound: false,
          estimateFound: true,
          costDiscovery: null,
        },
      },
    };
  }

  const branchSnaps = [
    makeSnap({
      filename: FIXTURE_FILES[0],
      lines: [
        { lp: "1", description: "Budowa ściana", quantity: "100" },
        { lp: "2", description: "Budowa strop", quantity: "50" },
      ],
      totalValue: "500000",
    }),
    makeSnap({
      filename: FIXTURE_FILES[1],
      lines: [{ lp: "1", description: "Instalacja elektryczna", quantity: "80" }],
      totalValue: "400000",
    }),
    makeSnap({
      filename: FIXTURE_FILES[2],
      lines: [{ lp: "1", description: "Hydrant", quantity: "5", unit: "kpl" }],
      totalValue: "150000",
    }),
    legacySnap,
  ];

  const artifacts = opts.withArtifacts
    ? FIXTURE_FILES.map((filename, i) => ({
        filename,
        snapshot: branchSnaps[i],
      }))
    : undefined;

  return {
    id: FIXTURE_ID,
    tenderDossier: {
      kosztorys: legacySnap,
      scanSummary: {
        costCandidateSources: FIXTURE_FILES,
        branchWinnerArtifacts: artifacts,
        kosztorysFound: true,
        totalDocuments: 4,
        scanned: 4,
        parsed: 4,
        byType: { pdf: 4, docx: 0, xlsx: 0, zip: 1, ath: 0, sevenZip: 0, other: 0 },
        valueFound: true,
        criteriaFound: false,
        estimateFound: true,
        costDiscovery: {
          found: true,
          type: "pdf_przedmiar",
          source: LEGACY,
          reason: "test",
        },
      },
    },
  };
}

assert.equal(COST_MULTI_02_AGGREGATE_BID, true);
assert.equal(COST_MULTI_02_HOLD_BLOCKS_BID, false);

// --- AC: merge unit ---
{
  const winners = [
    {
      documentId: "a",
      filename: FIXTURE_FILES[0],
      branch: "construction",
      snapshot: makeSnap({
        filename: FIXTURE_FILES[0],
        lines: [{ lp: "1", description: "A", quantity: "10" }],
        totalValue: "100000",
      }),
    },
    {
      documentId: "b",
      filename: FIXTURE_FILES[1],
      branch: "electrical",
      snapshot: makeSnap({
        filename: FIXTURE_FILES[1],
        lines: [{ lp: "1", description: "B", quantity: "5" }],
        totalValue: "50000",
      }),
    },
  ];
  const merged = buildAggregateKosztorysSnapshot(winners);
  assert.ok(merged?.ok);
  assert.equal(merged.sourceFilename, "AGGREGATE:2-branches");
  assert.equal(merged.catalogQuantities.length, 2);
  assert.ok(merged.catalogQuantities[0].lp.startsWith("C."));
  assert.ok(merged.catalogQuantities[1].lp.startsWith("E."));
  assert.equal(merged.totalValue, "150000");
  assert.ok(snapshotUsableForAggregate(merged));
  console.log("PASS B0 merge Aggregate 2 branches");
}

// --- AC: fixture AGGREGATE when artifacts present ---
{
  const item = fixtureItem({ withArtifacts: true });
  const d = resolveCostBidInput(item);
  assert.equal(d.mode, "AGGREGATE");
  assert.equal(d.aggregatePolicy, "SUM_BRANCH_WINNERS");
  assert.equal(d.sourceDocumentCount, 4);
  assert.ok(d.kosztorysForBid?.ok);
  assert.match(d.kosztorysForBid.sourceFilename, /^AGGREGATE:4-branches$/);
  assert.ok((d.kosztorysForBid.catalogQuantities?.length ?? 0) >= 4);
  assert.equal(d.legacyKosztorys?.sourceFilename, LEGACY);
  assert.equal(item.tenderDossier.kosztorys.sourceFilename, LEGACY);
  const legacyQty = Number(d.legacyKosztorys.catalogQuantities[0].quantity)
    + Number(d.legacyKosztorys.catalogQuantities[1].quantity);
  const aggQty = (d.kosztorysForBid.catalogQuantities ?? []).reduce(
    (s, l) => s + Number(String(l.quantity).replace(",", ".")),
    0,
  );
  assert.ok(aggQty > legacyQty, `aggQty=${aggQty} legacyQty=${legacyQty}`);
  const overlay = resolveCostMulti02UiOverlay(d);
  assert.equal(overlay?.mode, "AGGREGATE");
  console.log("PASS fixture 08dee335 AGGREGATE + Bid input > ONE");
}

// --- AC: missing artifacts → MANUAL_HOLD + ONE fallback ---
{
  const item = fixtureItem({ withArtifacts: false });
  const d = resolveCostBidInput(item);
  assert.equal(d.mode, "MANUAL_HOLD");
  assert.ok(d.reasonCodes.includes("missing_branch_snapshots"));
  assert.equal(d.kosztorysForBid?.sourceFilename, LEGACY);
  assert.equal(d.legacyKosztorys?.sourceFilename, LEGACY);
  const overlay = resolveCostMulti02UiOverlay(d);
  assert.equal(overlay?.mode, "MANUAL_HOLD");
  console.log("PASS missing artifacts → MANUAL_HOLD fallback ONE");
}

// --- AC: single-branch no regression ---
{
  const item = fixtureItem({ singleBranch: true, withArtifacts: true });
  const d = resolveCostBidInput(item);
  assert.equal(d.mode, "ONE");
  assert.equal(d.kosztorysForBid?.sourceFilename, LEGACY);
  assert.equal(d.legacyKosztorys?.sourceFilename, LEGACY);
  console.log("PASS single-branch ONE regression");
}

// --- AC: dossier.kosztorys never overwritten by Aggregate ---
{
  const item = fixtureItem({ withArtifacts: true });
  const before = item.tenderDossier.kosztorys.sourceFilename;
  resolveCostBidInput(item);
  assert.equal(item.tenderDossier.kosztorys.sourceFilename, before);
  assert.equal(before, LEGACY);
  console.log("PASS dossier.kosztorys immutable under resolve");
}

console.log("ALL COST-MULTI-02 tests PASS");
