/**
 * OPTION B — Canonical OfferBoq lineId continuity (Bid ↔ composed/package).
 * Pure tests · ZERO package prod write · ZERO Accept · ZERO Finance.
 *
 * Run: npx vite-node scripts/test-offer-boq-line-id-continuity-option-b.mjs
 */
import { buildOfferBoqFromSnapshot, buildOfferBoqLineId } from "../src/lib/tender-offer-boq.ts";
import {
  composeDwellingOfferBoq,
  buildOfferBoqLineIdWithSource,
  buildSourceLineKey,
  evaluateCanonicalOfferBoqLineIdContinuity,
  evaluateOfferBoqDocumentsLineIdContinuity,
  buildCanonicalOfferBoqLineId,
} from "../src/lib/multi-boq/index.ts";
import {
  overlayTrustedPackageIdentityOntoOfferBoq,
  collectTrustedPackageIdentityByLineId,
} from "../src/lib/tender-offer-boq-g1-package-identity-connect.ts";

const FIXED_AT = "2026-09-08T12:00:00.000Z";
/** Synthetic TPI/729-shaped tender id (89-line flatten fixture). */
const TID = "tpi729-continuity-fixture";
const DW = "kosciuszki-46-4";
const N = 89;

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

function catalog89() {
  return Array.from({ length: N }, (_, i) => ({
    lp: String((i % 20) + 1),
    description: i === 0
      ? "Warszawa 1,000"
      : `TPI729 linia ${i + 1} opis pozycji roboty`,
    unit: i % 7 === 0 ? "m2" : i % 5 === 0 ? "mb" : "szt",
    quantity: String(1 + (i % 11)),
  }));
}

function snapshotLine(c, index, docId = "doc_c2_admitted") {
  return {
    sourceDocumentId: docId,
    sourceArtifactId: `art_${docId}`,
    sourceDocumentIds: [docId],
    sourceArtifactIds: [`art_${docId}`],
    sourceLineKey: buildSourceLineKey(c.lp, c.description, index),
    indexInSourceDoc: index,
    lp: c.lp,
    description: c.description,
    unit: c.unit,
    quantityRaw: c.quantity,
    quantity: Number(c.quantity) || 0,
    branchHint: "construction",
    contentHash: `ch_${index}`,
    athUnitPricePln: null,
    athTotalPln: null,
    catalogBasis: null,
  };
}

function dwellingSnap(lines, dwellingId = DW) {
  return {
    tenderId: TID,
    dwellingId,
    sourceDocumentIds: [...new Set(lines.map((l) => l.sourceDocumentId))],
    sourceArtifactIds: [...new Set(lines.map((l) => l.sourceArtifactId))],
    lines,
    completeness: "ready",
    warnings: [],
  };
}

function bidDocFromCatalog(catalog) {
  return buildOfferBoqFromSnapshot({
    tenderId: TID,
    snapshot: {
      parsedAt: FIXED_AT,
      sourceFilename: "C2_ADMITTED:compose",
      rows: [],
      catalogQuantities: catalog,
      quantityExpressionsByLp: {},
    },
    builtAt: FIXED_AT,
    version: 1,
  });
}

function baseTrustedLine(overrides = {}) {
  return {
    lineId: "obl_x",
    lp: "1",
    description: "Gładzie",
    quantity: 10,
    quantityRaw: "10",
    quantityExpressionRaw: null,
    quantityIntelligence: null,
    unit: "m2",
    catalogWorkId: "wc_gladz",
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    catalogBasis: null,
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
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

// ─── T1 — TPI/729-shaped 89/89 canonical continuity ─────────────────
{
  const catalog = catalog89();
  const bid = bidDocFromCatalog(catalog);
  const snap = dwellingSnap(catalog.map((c, i) => snapshotLine(c, i)));
  const composed = composeDwellingOfferBoq({ snapshot: snap, builtAt: FIXED_AT });
  ok("T1 compose ok", composed.ok === true);
  const cont = evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document);
  ok("T1 continuity ok", cont.ok === true, cont);
  ok("T1 length 89/89", cont.lengthA === N && cont.lengthB === N, cont);
  ok("T1 overlap 89", cont.overlapCount === N, cont);
  const ids = composed.document.lines.map((l) => l.lineId);
  ok("T1 duplicates 0", new Set(ids).size === N, { size: new Set(ids).size });
  ok(
    "T1 formula matches builder",
    ids.every((id, i) =>
      id === buildCanonicalOfferBoqLineId({
        tenderId: TID,
        lp: catalog[i].lp,
        description: catalog[i].description,
        flattenIndex: i,
      })
    ),
  );
  ok(
    "T1 bid equals composed lineIds",
    bid.lines.every((l, i) => l.lineId === composed.document.lines[i].lineId),
  );
}

// ─── T2 — one changed description → FAIL CLOSED ─────────────────────
{
  const catalog = catalog89();
  const bid = bidDocFromCatalog(catalog);
  const mutated = catalog.map((c, i) =>
    i === 10 ? { ...c, description: "ZMIENIONY OPIS" } : c,
  );
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(mutated.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  const cont = evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document);
  ok("T2 fail closed", cont.ok === false, cont);
  ok(
    "T2 reason DESCRIPTION or LINE_ID",
    cont.reasonCodes.includes("DESCRIPTION_MISMATCH")
      || cont.reasonCodes.includes("LINE_ID_MISMATCH"),
    cont,
  );
  ok("T2 mismatchIndex 10", cont.mismatchIndex === 10, cont);
}

// ─── T3 — one changed LP → FAIL CLOSED ──────────────────────────────
{
  const catalog = catalog89();
  const bid = bidDocFromCatalog(catalog);
  const mutated = catalog.map((c, i) => (i === 5 ? { ...c, lp: "999" } : c));
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(mutated.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  const cont = evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document);
  ok("T3 fail closed", cont.ok === false, cont);
  ok("T3 LP_MISMATCH", cont.reasonCodes.includes("LP_MISMATCH"), cont);
  ok("T3 mismatchIndex 5", cont.mismatchIndex === 5, cont);
}

// ─── T4 — length mismatch → FAIL CLOSED ─────────────────────────────
{
  const catalog = catalog89();
  const bid = bidDocFromCatalog(catalog);
  const short = catalog.slice(0, 80);
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(short.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  const cont = evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document);
  ok("T4 fail closed", cont.ok === false, cont);
  ok("T4 LENGTH_MISMATCH", cont.reasonCodes.includes("LENGTH_MISMATCH"), cont);
}

// ─── T5 — reordered lines → FAIL CLOSED ─────────────────────────────
{
  const catalog = catalog89();
  const bid = bidDocFromCatalog(catalog);
  const reordered = [...catalog];
  const tmp = reordered[0];
  reordered[0] = reordered[1];
  reordered[1] = tmp;
  // Keep flatten indices as array positions (canonical order broken by content swap).
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(reordered.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  const cont = evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document);
  ok("T5 fail closed", cont.ok === false, cont);
  ok(
    "T5 mismatch at 0",
    cont.mismatchIndex === 0
      && (cont.reasonCodes.includes("DESCRIPTION_MISMATCH")
        || cont.reasonCodes.includes("LP_MISMATCH")
        || cont.reasonCodes.includes("LINE_ID_MISMATCH")),
    cont,
  );
}

// ─── T6 — duplicate canonical IDs → FAIL CLOSED ─────────────────────
{
  const catalog = catalog89().slice(0, 5);
  const bid = bidDocFromCatalog(catalog);
  const dupLines = bid.lines.map((l, i) =>
    i === 1 ? { ...l, lineId: bid.lines[0].lineId } : l,
  );
  const cont = evaluateCanonicalOfferBoqLineIdContinuity(bid, { lines: dupLines });
  ok("T6 fail closed", cont.ok === false, cont);
  ok("T6 DUPLICATE_LINE_ID_B", cont.reasonCodes.includes("DUPLICATE_LINE_ID_B"), cont);
}

// ─── T7 — package canonical ID consumed by existing CONNECT ─────────
{
  const catalog = catalog89().slice(0, 3);
  const bid = bidDocFromCatalog(catalog);
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(catalog.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  ok("T7 continuity pre", evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document).ok);

  const pkgLine = baseTrustedLine({
    lineId: composed.document.lines[0].lineId,
    lp: composed.document.lines[0].lp,
    description: composed.document.lines[0].description,
    catalogWorkId: "wc_trusted_t7",
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
  });
  const pkg = {
    tenderId: TID,
    dwellings: [
      {
        dwellingId: DW,
        offerBoq: {
          ...composed.document,
          lines: [
            pkgLine,
            ...composed.document.lines.slice(1).map((l) =>
              baseTrustedLine({
                lineId: l.lineId,
                lp: l.lp,
                description: l.description,
                catalogWorkId: null,
                matchMethod: "unmatched",
                matchedBy: "unmatched",
                matchConfidence: "low",
              }),
            ),
          ],
        },
      },
    ],
  };

  const trusted = collectTrustedPackageIdentityByLineId(pkg);
  ok("T7 trusted map has line0", trusted.byLineId.has(pkgLine.lineId), {
    size: trusted.byLineId.size,
  });

  const bidFresh = bidDocFromCatalog(catalog);
  // Bid rebuild has no identity — overlay must stamp from package by exact lineId.
  bidFresh.lines = bidFresh.lines.map((l) => ({
    ...l,
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
  }));
  const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(bidFresh, pkg);
  ok("T7 overlay applied", overlaid.stats.overlayApplied >= 1, overlaid.stats);
  ok(
    "T7 exact lineId → catalogWorkId",
    overlaid.document.lines[0].catalogWorkId === "wc_trusted_t7",
    overlaid.document.lines[0],
  );
}

// ─── T8 — untrusted identity → NO OVERLAY ───────────────────────────
{
  const catalog = catalog89().slice(0, 2);
  const bid = bidDocFromCatalog(catalog);
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(catalog.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  const pkg = {
    tenderId: TID,
    dwellings: [
      {
        dwellingId: DW,
        offerBoq: {
          ...composed.document,
          lines: composed.document.lines.map((l) =>
            baseTrustedLine({
              lineId: l.lineId,
              lp: l.lp,
              description: l.description,
              catalogWorkId: "wc_should_not_overlay",
              matchMethod: "heuristic",
              matchedBy: "heuristic",
              matchConfidence: "medium",
            }),
          ),
        },
      },
    ],
  };
  const bidFresh = bidDocFromCatalog(catalog);
  bidFresh.lines = bidFresh.lines.map((l) => ({
    ...l,
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
  }));
  const overlaid = overlayTrustedPackageIdentityOntoOfferBoq(bidFresh, pkg);
  ok("T8 no overlay", overlaid.stats.overlayApplied === 0, overlaid.stats);
  ok(
    "T8 catalogWorkId stays null",
    overlaid.document.lines.every((l) => l.catalogWorkId == null),
  );
}

// ─── T9 — legacy WithSource package → FAIL CLOSED / no silent migration ─
{
  const catalog = catalog89().slice(0, 5);
  const bid = bidDocFromCatalog(catalog);
  const legacyLines = catalog.map((c, i) => {
    const sourceLineKey = buildSourceLineKey(c.lp, c.description, i);
    const lineId = buildOfferBoqLineIdWithSource({
      tenderId: TID,
      dwellingId: DW,
      sourceDocumentId: "doc_legacy",
      sourceLineKey,
      lp: c.lp,
      description: c.description,
      indexInSourceDoc: i,
    });
    return {
      lineId,
      lp: c.lp || String(i + 1),
      description: c.description.trim(),
    };
  });
  const cont = evaluateCanonicalOfferBoqLineIdContinuity(bid, { lines: legacyLines });
  ok("T9 fail closed vs Bid", cont.ok === false, cont);
  ok("T9 LINE_ID_MISMATCH", cont.reasonCodes.includes("LINE_ID_MISMATCH"), cont);
  ok(
    "T9 WithSource ≠ plain",
    legacyLines[0].lineId !== bid.lines[0].lineId,
    { legacy: legacyLines[0].lineId, bid: bid.lines[0].lineId },
  );
  // New compose path is canonical — not silent rewrite of legacy ids.
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap(catalog.map((c, i) => snapshotLine(c, i))),
    builtAt: FIXED_AT,
  });
  ok(
    "T9 new compose equals Bid (no WithSource)",
    evaluateOfferBoqDocumentsLineIdContinuity(bid, composed.document).ok,
  );
}

// ─── T10 — multi-dwelling subset ≠ canonical C2 flatten ─────────────
{
  const catalog = catalog89();
  const bid = bidDocFromCatalog(catalog);
  // Subset of 10 lines — local indices 0..9 ≠ Bid flatten positions of those rows
  // if taken from middle of C2 set.
  const subset = catalog.slice(40, 50);
  const composedSubset = composeDwellingOfferBoq({
    snapshot: dwellingSnap(
      subset.map((c, localIdx) => snapshotLine(c, localIdx, "doc_subset")),
      "dwelling-subset-A",
    ),
    builtAt: FIXED_AT,
  });
  const vsFull = evaluateOfferBoqDocumentsLineIdContinuity(bid, composedSubset.document);
  ok("T10 subset vs full Bid FAIL", vsFull.ok === false, vsFull);
  ok("T10 LENGTH_MISMATCH", vsFull.reasonCodes.includes("LENGTH_MISMATCH"), vsFull);

  // Same length but wrong flatten indices vs Bid slice at 40..49:
  const bidSlice = { lines: bid.lines.slice(40, 50) };
  const vsSliceWrongIndex = evaluateCanonicalOfferBoqLineIdContinuity(
    bidSlice,
    composedSubset.document,
  );
  // Content matches slice but lineIds use local 0..9 not global 40..49 → LINE_ID_MISMATCH
  ok("T10 wrong flatten index FAIL", vsSliceWrongIndex.ok === false, vsSliceWrongIndex);
  ok(
    "T10 LINE_ID_MISMATCH (local≠global flatten)",
    vsSliceWrongIndex.reasonCodes.includes("LINE_ID_MISMATCH"),
    vsSliceWrongIndex,
  );
  ok(
    "T10 OPTION C not invented — no auto remap",
    composedSubset.document.lines[0].lineId
      === buildOfferBoqLineId(TID, subset[0].lp, subset[0].description, 0),
  );
  ok(
    "T10 not equal Bid global index 40",
    composedSubset.document.lines[0].lineId !== bid.lines[40].lineId,
  );
}

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
