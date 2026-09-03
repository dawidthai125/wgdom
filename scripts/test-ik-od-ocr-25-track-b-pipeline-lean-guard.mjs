/**
 * OD-OCR-25 — Track B lean pipeline + guard regression matrix.
 * npx vite-node scripts/test-ik-od-ocr-25-track-b-pipeline-lean-guard.mjs
 */
import assert from "node:assert/strict";
import {
  mergeKosztorysPreserveHeavy,
  mergeScanSummaryPreserveArtifacts,
  mergeTenderDossierByQuality,
  kosztorysRowsFieldAbsent,
} from "../src/lib/tender-dossier-merge.ts";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";
import {
  stripTenderPipelineForCloud,
  isCloudLeanFieldOmitted,
  estimatePipelineJsonBytes,
} from "../src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts";
import {
  buildTenderPipelineGuard,
  verifyPipelineBodyGuardIkFinalBidParity,
  verifyTenderPipelineGuardWrite,
  ikFinalBidDeepEqual,
} from "../src/lib/tender-pipeline/tender-pipeline-guard.ts";
import {
  measurePipelineCloudPayloadSizes,
} from "../src/lib/tender-pipeline/tender-pipeline-cloud-push.ts";
import {
  isPipelineCloudWriteUnconfirmed,
  markPipelineCloudUnconfirmed,
  clearPipelineCloudUnconfirmed,
} from "../src/lib/tender-pipeline/tender-pipeline-cloud-unconfirmed.ts";
import {
  evaluatePipelineSnapshotWriteSafety,
  PIPELINE_GUARD_BODY_MISMATCH_BLOCKED,
} from "../src/lib/tender-pipeline-write-safety.ts";

let pass = 0;
let fail = 0;

function ok(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`);
  }
}

function kosztorys(sourceFilename, rowCount, parsedAt = "2026-06-01T00:00:00.000Z", withRows = true) {
  return {
    ok: true,
    sourceFilename,
    rowCount,
    rows: withRows ? Array.from({ length: rowCount }, (_, i) => ({ description: `r${i}`, quantity: "1" })) : [],
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt,
  };
}

function leanKosztorys(sourceFilename, rowCount, parsedAt) {
  const k = kosztorys(sourceFilename, rowCount, parsedAt, false);
  k._rowsOmitted = true;
  return k;
}

function item(id, extra = {}) {
  return {
    id,
    tenderId: id,
    title: "t",
    status: "seen",
    updatedAt: "2026-06-01T12:00:00.000Z",
    bzpNumber: "1",
    noticeNumber: "1",
    organizationName: "o",
    organizationCity: "w",
    organizationProvince: "d",
    cpvCode: "x",
    publicationDate: "2026-01-01",
    submittingOffersDate: null,
    orderType: "x",
    moIdentifier: "m",
    notes: "",
    relevanceScore: 0,
    matchedKeywords: [],
    isWroclaw: false,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: "2026-01-01",
    ezamowieniaUrl: "",
    ...extra,
  };
}

const G3_BID = {
  schemaVersion: 1,
  kind: "ik_g3_final_bid",
  tenderPipelineId: "t-bid",
  ocdsId: null,
  netPln: 100000,
  vatRate: 0.23,
  vatPln: 23000,
  grossPln: 123000,
  currency: "PLN",
  source: "owner_g3",
  p7RecommendedNetPln: null,
  ownerOverride: true,
  approvedAt: "2026-06-01T00:00:00.000Z",
  approvedBy: "owner",
};

console.log("=== OD-OCR-25 TRACK B TESTS ===\n");

// K1 — FULL rows beats LEAN absent rows
console.log("K1 FULL rows beats LEAN absent");
{
  const full = kosztorys("doc.ATH", 100, "2026-06-01T00:00:00.000Z");
  const lean = leanKosztorys("doc.ATH", 100, "2026-06-02T00:00:00.000Z");
  const merged = mergeKosztorysPreserveHeavy(full, lean, { leanRowsOmittedB: true });
  ok(merged?.rows?.length === 100, "rows preserved from FULL");
  ok(merged?.rowCount === 100, "rowCount 100");
}

// K3 — lean newer parsedAt must not drop FULL rows
console.log("\nK3 lean newer parsedAt");
{
  const full = kosztorys("x.ATH", 50, "2026-06-01T00:00:00.000Z");
  const lean = leanKosztorys("x.ATH", 50, "2026-06-03T00:00:00.000Z");
  const merged = mergeKosztorysPreserveHeavy(full, lean, { leanRowsOmittedB: true });
  ok(merged?.rows?.length === 50, "FULL rows kept despite newer lean parsedAt");
}

// K6 — lean/lean no invented rows
console.log("\nK6 lean/lean no invented rows");
{
  const a = leanKosztorys("a.xlsx", 10, "2026-06-01T00:00:00.000Z");
  const b = leanKosztorys("a.xlsx", 10, "2026-06-02T00:00:00.000Z");
  const merged = mergeKosztorysPreserveHeavy(a, b, { leanRowsOmittedA: true, leanRowsOmittedB: true });
  ok((merged?.rows?.length ?? 0) === 0, "no invented rows");
  ok(merged?.rowCount === 10, "metadata rowCount kept");
}

// S3 — different artifacts A+B
console.log("\nS3 different artifacts union");
{
  const a = {
    totalDocuments: 1,
    scanned: 1,
    parsed: 1,
    byType: {},
    sevenZipCount: 0,
    kosztorysFound: true,
    valueFound: false,
    criteriaFound: false,
    estimateFound: false,
    costDiscovery: null,
    branchWinnerArtifacts: [
      { filename: "a.pdf", documentId: "doc-a", snapshot: kosztorys("a.pdf", 5) },
    ],
  };
  const b = {
    ...a,
    branchWinnerArtifacts: [
      { filename: "b.pdf", documentId: "doc-b", snapshot: kosztorys("b.pdf", 8) },
    ],
  };
  const merged = mergeScanSummaryPreserveArtifacts(a, b);
  ok(merged?.branchWinnerArtifacts?.length === 2, "two artifacts kept");
}

// S5 — one snapshot absent
console.log("\nS5 snapshot absent on one side");
{
  const fullArt = { filename: "z.pdf", documentId: "doc-z", snapshot: kosztorys("z.pdf", 3) };
  const leanArt = { filename: "z.pdf", documentId: "doc-z" };
  const a = {
    totalDocuments: 1,
    scanned: 1,
    parsed: 1,
    byType: {},
    sevenZipCount: 0,
    kosztorysFound: true,
    valueFound: false,
    criteriaFound: false,
    estimateFound: false,
    costDiscovery: null,
    branchWinnerArtifacts: [fullArt],
  };
  const b = { ...a, branchWinnerArtifacts: [leanArt] };
  const merged = mergeScanSummaryPreserveArtifacts(a, b, { leanArtifactSnapshotOmittedB: true });
  ok(merged?.branchWinnerArtifacts?.[0]?.snapshot?.rows?.length === 3, "snapshot preserved");
}

// M2 FULL/LEAN pipeline merge
console.log("\nM2 FULL/LEAN pipeline merge");
{
  const fullD = {
    brief: { fields: [], builtAt: "2026-06-01T00:00:00.000Z" },
    kosztorys: kosztorys("m.ATH", 20),
    builtAt: "2026-06-01T00:00:00.000Z",
  };
  const leanD = {
    brief: { fields: [], builtAt: "2026-06-02T00:00:00.000Z" },
    kosztorys: leanKosztorys("m.ATH", 20, "2026-06-02T00:00:00.000Z"),
    builtAt: "2026-06-02T00:00:00.000Z",
  };
  const local = item("m2", { tenderDossier: fullD });
  const cloud = item("m2", {
    tenderDossier: leanD,
    _cloudLean: { v: 1, omitted: ["kosztorys.rows", "noticeHtml"] },
  });
  const merged = mergeTenderPipelineForCloud([local], [cloud])[0];
  ok(merged.tenderDossier?.kosztorys?.rows?.length === 20, "pipeline merge keeps FULL rows");
}

// B2/B5 guard bid parity
console.log("\nB2/B5 guard bid parity");
{
  const items = [item("t-bid", { ikFinalBid: G3_BID })];
  const guard = buildTenderPipelineGuard(items, {
    bundleRevision: 1,
    bundleAt: new Date().toISOString(),
    deletedIds: [],
  });
  const parity = verifyPipelineBodyGuardIkFinalBidParity(items, guard);
  ok(parity.ok, "parity ok with bid");
  const mismatchBody = [item("t-bid", { ikFinalBid: { ...G3_BID, grossPln: 999 } })];
  const parityBad = verifyPipelineBodyGuardIkFinalBidParity(mismatchBody, guard);
  ok(!parityBad.ok, "parity fails on mismatch");
}

// G2 revision verify
console.log("\nG2 guard revision verify");
{
  const g = buildTenderPipelineGuard([item("g1")], {
    bundleRevision: 7,
    bundleAt: "2026-06-01T00:00:00.000Z",
    deletedIds: [],
  });
  ok(verifyTenderPipelineGuardWrite(g, { bundleRevision: 7, itemCount: 1 }).ok, "verify ok");
  ok(!verifyTenderPipelineGuardWrite(g, { bundleRevision: 6, itemCount: 1 }).ok, "verify rejects stale rev");
}

// Lean strip marker
console.log("\n_cloudLean strip");
{
  const full = [
    item("s1", {
      noticeHtml: "<p>x</p>",
      tenderDossier: {
        brief: { fields: [], builtAt: "2026-06-01T00:00:00.000Z" },
        kosztorys: kosztorys("s.ATH", 5),
        builtAt: "2026-06-01T00:00:00.000Z",
      },
      ikFinalBid: G3_BID,
    }),
  ];
  const lean = stripTenderPipelineForCloud(full);
  ok(lean[0]._cloudLean?.v === 1, "marker v1");
  ok(lean[0]._cloudLean?.omitted?.includes("noticeHtml"), "noticeHtml omitted");
  ok(lean[0].noticeHtml == null, "noticeHtml stripped");
  ok((lean[0].tenderDossier?.kosztorys?.rows?.length ?? 0) === 0, "rows stripped");
  ok(lean[0].ikFinalBid?.grossPln === G3_BID.grossPln, "ikFinalBid kept FULL");
  ok(isCloudLeanFieldOmitted(lean[0], "kosztorys.rows"), "rows field marked omitted");
}

// Unconfirmed session block marker
console.log("\nG10 unconfirmed session");
{
  clearPipelineCloudUnconfirmed();
  ok(!isPipelineCloudWriteUnconfirmed(), "initially clear");
  markPipelineCloudUnconfirmed("test");
  ok(isPipelineCloudWriteUnconfirmed(), "marked unconfirmed");
  clearPipelineCloudUnconfirmed();
  ok(!isPipelineCloudWriteUnconfirmed(), "cleared");
}

// Payload size harness (synthetic)
console.log("\nTransport size harness (synthetic 50 items)");
{
  const synth = Array.from({ length: 50 }, (_, i) =>
    item(`sz-${i}`, {
      noticeHtml: "<div>" + "x".repeat(2000) + "</div>",
      tenderDossier: {
        brief: { fields: [], builtAt: "2026-06-01T00:00:00.000Z" },
        kosztorys: kosztorys(`f${i}.ATH`, 80),
        builtAt: "2026-06-01T00:00:00.000Z",
        scanSummary: {
          totalDocuments: 1,
          scanned: 1,
          parsed: 1,
          byType: {},
          sevenZipCount: 0,
          kosztorysFound: true,
          valueFound: false,
          criteriaFound: false,
          estimateFound: false,
          costDiscovery: null,
          branchWinnerArtifacts: [
            { filename: "a.pdf", documentId: `d${i}`, snapshot: kosztorys("a.pdf", 40) },
          ],
        },
      },
    }),
  );
  const report = measurePipelineCloudPayloadSizes(synth);
  ok(report.fullBytes > report.leanBytes, "lean smaller than full");
  ok(report.guardBytes < report.leanBytes, "guard smaller than lean body");
  ok(report.reductionPct > 0, "positive reduction");
  console.log(`    FULL=${report.fullBytes} LEAN=${report.leanBytes} GUARD=${report.guardBytes} reduction=${report.reductionPct}%`);
}

// ikFinalBid deep equal
console.log("\nB1 no bid parity");
{
  ok(ikFinalBidDeepEqual(null, null), "both null");
  ok(ikFinalBidDeepEqual(G3_BID, { ...G3_BID }), "equal bids");
}

console.log(`\n=== SUMMARY pass=${pass} fail=${fail} ===`);
if (fail > 0) process.exit(1);
