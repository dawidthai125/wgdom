/**
 * CONNECT — G1 package identity → Bid OfferBoq → F5 (pure, no Accept, no KV write).
 * Run: npx vite-node scripts/test-g1-package-identity-bid-connect.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import {
  overlayTrustedPackageIdentityOntoOfferBoq,
  collectTrustedPackageIdentityByLineId,
} from "../src/lib/tender-offer-boq-g1-package-identity-connect.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { buildOfferBoqDocumentForPipelineItem } from "../src/lib/tender-offer-boq-explainability.ts";

const FIXED_AT = "2026-09-08T12:00:00.000Z";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function baseLine(overrides = {}) {
  return {
    lineId: "obl_connect_l1",
    lp: "1",
    description: "Gładzie ścian",
    quantity: 10,
    quantityRaw: "10",
    quantityExpressionRaw: null,
    quantityIntelligence: null,
    unit: "m2",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    catalogBasis: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "?" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "?" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "?" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    warnings: [],
    editMeta: null,
    ...overrides,
  };
}

function emptyDoc(lines) {
  return {
    schemaVersion: 5,
    tenderId: "t-connect",
    version: 1,
    builtAt: FIXED_AT,
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: {
      materialsPln: null,
      laborPln: null,
      equipmentPln: null,
      directPln: null,
      kpPln: null,
      overheadPln: null,
      costPricePln: null,
      marginPln: null,
      recommendedBidPln: null,
      profitPln: null,
      profitabilityPct: null,
      estimatedDurationDays: null,
      workingCapitalPln: null,
      lineCount: lines.length,
      pricedLineCount: 0,
    },
    recomputeToken: "t",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

function pkgWithLines(lines, dwellingId = "dw1") {
  return {
    tenderId: "t-connect",
    expectedDwellingCount: 1,
    mode: "legacy_single",
    documentToDwelling: {},
    dwellings: [
      {
        dwellingId,
        labelPl: "Lokal 1",
        sourceDocumentIds: [],
        offerBoq: emptyDoc(lines),
        f5Gate: null,
        subtotals: null,
      },
    ],
  };
}

// --- Test 1: no package ---
{
  const bid = emptyDoc([
    baseLine({
      catalogWorkId: null,
      matchMethod: "category_heuristic",
      matchConfidence: "low",
    }),
  ]);
  const { document, stats } = overlayTrustedPackageIdentityOntoOfferBoq(bid, null);
  ok("T1 package missing → no overlay", stats.overlayApplied === 0);
  ok("T1 reason PACKAGE_MISSING", stats.reasonCodes.includes("PACKAGE_MISSING"));
  ok(
    "T1 identity unchanged",
    document.lines[0].matchMethod === "category_heuristic"
      && document.lines[0].catalogWorkId == null,
  );
}

// --- Test 2: trusted manual identity overlays ---
{
  const lineId = "obl_connect_manual";
  const bid = emptyDoc([
    baseLine({
      lineId,
      catalogWorkId: null,
      matchMethod: "category_heuristic",
      matchConfidence: "low",
      candidateMatches: [
        { catalogWorkId: "wc-a", matchedBy: "heuristic", matchConfidence: "low", role: "primary" },
        { catalogWorkId: "wc-b", matchedBy: "heuristic", matchConfidence: "low", role: "alt" },
      ],
      quantity: 12,
      unit: "m2",
      description: "Gładzie ścian KEEP",
    }),
  ]);
  const pkg = pkgWithLines([
    baseLine({
      lineId,
      catalogWorkId: "legacy-gladzie_tynki-m2",
      matchMethod: "manual",
      matchedBy: "manual",
      matchConfidence: "high",
      candidateMatches: [],
      quantity: 999,
      unit: "kg",
      description: "SHOULD NOT OVERWRITE STRUCTURAL",
    }),
  ]);
  const { document, stats } = overlayTrustedPackageIdentityOntoOfferBoq(bid, pkg);
  const line = document.lines[0];
  ok("T2 overlay applied", stats.overlayApplied === 1);
  ok("T2 catalogWorkId from G1", line.catalogWorkId === "legacy-gladzie_tynki-m2");
  ok("T2 matchMethod manual", line.matchMethod === "manual");
  ok("T2 confidence high", line.matchConfidence === "high");
  ok("T2 candidates cleared", (line.candidateMatches ?? []).length === 0);
  ok("T2 quantity preserved", line.quantity === 12);
  ok("T2 unit preserved", line.unit === "m2");
  ok("T2 description preserved", line.description === "Gładzie ścian KEEP");
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  ok("T2 F5 identity OK", id.status === "OK" && id.workId === "legacy-gladzie_tynki-m2");
}

// --- Test 3: untrusted category_heuristic NOT promoted ---
{
  const lineId = "obl_connect_heur";
  const bid = emptyDoc([
    baseLine({
      lineId,
      catalogWorkId: null,
      matchMethod: "unmatched",
      matchConfidence: "low",
    }),
  ]);
  const pkg = pkgWithLines([
    baseLine({
      lineId,
      catalogWorkId: "wc-heuristic-only",
      matchMethod: "category_heuristic",
      matchedBy: "category_heuristic",
      matchConfidence: "low",
      candidateMatches: [],
    }),
  ]);
  const { document, stats } = overlayTrustedPackageIdentityOntoOfferBoq(bid, pkg);
  ok("T3 no overlay for heuristic", stats.overlayApplied === 0);
  ok("T3 bid stays unmatched", document.lines[0].matchMethod === "unmatched");
  ok("T3 skippedUntrusted > 0", stats.skippedUntrusted >= 1);
}

// --- Test 4: lineId mismatch — no silent overlay ---
{
  const bid = emptyDoc([
    baseLine({
      lineId: "obl_bid_only",
      matchMethod: "unmatched",
      catalogWorkId: null,
    }),
  ]);
  const pkg = pkgWithLines([
    baseLine({
      lineId: "obl_pkg_only",
      catalogWorkId: "legacy-gladzie_tynki-m2",
      matchMethod: "manual",
      matchedBy: "manual",
      matchConfidence: "high",
      candidateMatches: [],
    }),
  ]);
  const { document, stats } = overlayTrustedPackageIdentityOntoOfferBoq(bid, pkg);
  ok("T4 no overlay on mismatch", stats.overlayApplied === 0);
  ok("T4 reason NO_LINE_ID_OVERLAP", stats.reasonCodes.includes("NO_LINE_ID_OVERLAP"));
  ok("T4 bid catalogWorkId still null", document.lines[0].catalogWorkId == null);
}

// --- Test 5: competing catalog_map in package NOT trusted (AMBIGUOUS) ---
{
  const lineId = "obl_connect_amb";
  const bid = emptyDoc([
    baseLine({ lineId, matchMethod: "unmatched", catalogWorkId: null }),
  ]);
  const pkg = pkgWithLines([
    baseLine({
      lineId,
      catalogWorkId: "legacy-gladzie_tynki-m2",
      matchMethod: "catalog_map",
      matchedBy: "catalog_map",
      matchConfidence: "high",
      candidateMatches: [
        {
          catalogWorkId: "legacy-gladzie_tynki-m2",
          matchedBy: "catalog_map",
          matchConfidence: "high",
          role: "primary",
        },
        {
          catalogWorkId: "other-work",
          matchedBy: "catalog_map",
          matchConfidence: "medium",
          role: "alt",
        },
      ],
    }),
  ]);
  const { stats } = overlayTrustedPackageIdentityOntoOfferBoq(bid, pkg);
  ok("T5 competing catalog_map not overlaid", stats.overlayApplied === 0);
}

// --- Test 6: buildOfferBoqDocumentForPipelineItem consumes package (inject) ---
{
  const snap = {
    ok: true,
    parsedAt: FIXED_AT,
    sourceFilename: "test.pdf",
    rowCount: 1,
    pdfPrzedmiarCase: null,
    warnings: [],
    catalogQuantities: [
      {
        categoryId: "TYNKI",
        labelPl: "Gładzie ścian",
        unit: "m2",
        quantity: "10",
        lp: "1",
        description: "Gładzie ścian",
      },
    ],
    rows: [],
  };
  const structural = buildOfferBoqFromSnapshot({
    tenderId: "t-connect-pipe",
    snapshot: snap,
    builtAt: FIXED_AT,
  });
  assert.ok(structural.lines[0]?.lineId);
  const lineId = structural.lines[0].lineId;

  const item = {
    id: "t-connect-pipe",
    tenderId: "t-connect-pipe",
    tenderDossier: {
      kosztorys: { ...snap, ok: true },
    },
  };

  const pkg = {
    tenderId: "t-connect-pipe",
    expectedDwellingCount: 1,
    mode: "legacy_single",
    documentToDwelling: {},
    dwellings: [
      {
        dwellingId: "dw1",
        labelPl: "1",
        sourceDocumentIds: [],
        offerBoq: emptyDoc([
          baseLine({
            lineId,
            catalogWorkId: "legacy-gladzie_tynki-m2",
            matchMethod: "manual",
            matchedBy: "manual",
            matchConfidence: "high",
            candidateMatches: [],
          }),
        ]),
        f5Gate: null,
        subtotals: null,
      },
    ],
  };

  const doc = buildOfferBoqDocumentForPipelineItem({
    item,
    builtAt: FIXED_AT,
    package: pkg,
  });
  ok("T6 pipeline doc built", doc != null && (doc.lines?.length ?? 0) === 1);
  const pl = doc?.lines?.[0];
  ok("T6 pipeline has G1 manual", pl?.matchMethod === "manual");
  ok("T6 pipeline catalogWorkId", pl?.catalogWorkId === "legacy-gladzie_tynki-m2");

  const docNoPkg = buildOfferBoqDocumentForPipelineItem({
    item,
    builtAt: FIXED_AT,
    package: null,
  });
  ok(
    "T6 null package → no forced manual",
    docNoPkg?.lines?.[0]?.matchMethod !== "manual"
      || docNoPkg?.lines?.[0]?.catalogWorkId !== "legacy-gladzie_tynki-m2",
  );
}

// --- Test 7: F5 identity resolve sees G1 fields (no full finance path) ---
{
  const lineId = "obl_f5_g1";
  const bid = emptyDoc([
    baseLine({
      lineId,
      matchMethod: "unmatched",
      catalogWorkId: null,
      quantity: 5,
      unit: "m2",
    }),
  ]);
  const pkg = pkgWithLines([
    baseLine({
      lineId,
      catalogWorkId: "legacy-gladzie_tynki-m2",
      matchMethod: "manual",
      matchedBy: "manual",
      matchConfidence: "high",
      candidateMatches: [],
    }),
  ]);
  const { document } = overlayTrustedPackageIdentityOntoOfferBoq(bid, pkg);
  const line = document.lines[0];
  ok("T7 F5 matchMethod manual", line.matchMethod === "manual");
  ok("T7 F5 matchConfidence high", line.matchConfidence === "high");
  ok("T7 F5 catalogWorkId", line.catalogWorkId === "legacy-gladzie_tynki-m2");
  const id = resolveWorkIdentityFromOfferBoqLine(line);
  ok("T7 identity status OK", id.status === "OK" && id.workId === "legacy-gladzie_tynki-m2");
  ok("T7 identity method manual", id.matchMethod === "manual");
}

// --- Test 8: multi-dwelling conflict on same lineId → skip ---
{
  const lineId = "obl_conflict";
  const bid = emptyDoc([baseLine({ lineId, matchMethod: "unmatched" })]);
  const pkg = {
    tenderId: "t-connect",
    expectedDwellingCount: 2,
    mode: "multi",
    documentToDwelling: {},
    dwellings: [
      {
        dwellingId: "a",
        labelPl: "A",
        sourceDocumentIds: [],
        offerBoq: emptyDoc([
          baseLine({
            lineId,
            catalogWorkId: "work-a",
            matchMethod: "manual",
            matchedBy: "manual",
            matchConfidence: "high",
            candidateMatches: [],
          }),
        ]),
        f5Gate: null,
        subtotals: null,
      },
      {
        dwellingId: "b",
        labelPl: "B",
        sourceDocumentIds: [],
        offerBoq: emptyDoc([
          baseLine({
            lineId,
            catalogWorkId: "work-b",
            matchMethod: "manual",
            matchedBy: "manual",
            matchConfidence: "high",
            candidateMatches: [],
          }),
        ]),
        f5Gate: null,
        subtotals: null,
      },
    ],
  };
  const collected = collectTrustedPackageIdentityByLineId(pkg);
  ok("T8 conflict excludes line", !collected.byLineId.has(lineId));
  ok("T8 conflict reason", collected.stats.reasonCodes.includes("LINE_IDENTITY_CONFLICT"));
  const { stats } = overlayTrustedPackageIdentityOntoOfferBoq(bid, pkg);
  ok("T8 no overlay on conflict", stats.overlayApplied === 0);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
