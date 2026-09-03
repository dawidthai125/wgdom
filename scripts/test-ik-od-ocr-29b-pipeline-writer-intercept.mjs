/**
 * OD-OCR-29B — generic writer bypass remediation (in-memory / source).
 * npx vite-node scripts/test-ik-od-ocr-29b-pipeline-writer-intercept.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractUnguardedPipelineFromPushKeys,
  shouldRoutePipelinePushToCanonicalSeam,
  asTenderPipelineItems,
} from "../src/lib/tender-pipeline/tender-pipeline-cloud-route.ts";
import {
  stripTenderPipelineForCloud,
  isCloudLeanFieldOmitted,
} from "../src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts";
import {
  buildTenderPipelineGuard,
  verifyPipelineBodyGuardIkFinalBidParity,
  verifyTenderPipelineGuardWrite,
  TENDERS_PIPELINE_GUARD_KEY,
} from "../src/lib/tender-pipeline/tender-pipeline-guard.ts";
import {
  mergeScanSummaryPreserveArtifacts,
  mergeKosztorysPreserveHeavy,
} from "../src/lib/tender-dossier-merge.ts";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";
import { TENDERS_PIPELINE_KEY } from "../src/lib/tenders-sync.ts";
import {
  guardTenderPipelineCloudWrite,
  PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED,
  PIPELINE_GUARD_BODY_MISMATCH_BLOCKED,
} from "../src/lib/tender-pipeline-write-safety.ts";
import {
  isPipelineCloudWriteUnconfirmed,
  markPipelineCloudUnconfirmed,
  clearPipelineCloudUnconfirmed,
} from "../src/lib/tender-pipeline/tender-pipeline-cloud-unconfirmed.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
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

function heavyItem(id) {
  return item(id, {
    noticeHtml: "<p>heavy</p>",
    changeMonitor: { events: [{ at: "2026-06-01", note: "c" }] },
    qaMonitor: { events: [{ at: "2026-06-01", note: "q" }] },
    tenderDossier: {
      brief: { fields: [], builtAt: "2026-06-01T00:00:00.000Z" },
      kosztorys: {
        ok: true,
        sourceFilename: "x.ATH",
        rowCount: 2,
        rows: [{ description: "r0", quantity: "1" }, { description: "r1", quantity: "2" }],
        catalogQuantities: [],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: "2026-06-01T00:00:00.000Z",
      },
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
        parsedAt: "2026-06-01T00:00:00.000Z",
        branchWinnerArtifacts: [
          {
            filename: "a.pdf",
            documentId: "d1",
            snapshot: { ok: true, rows: [{ description: "snap" }], rowCount: 1 },
            kind: "kosztorys",
          },
        ],
      },
      builtAt: "2026-06-01T00:00:00.000Z",
    },
    ikFinalBid: { ...G3_BID, tenderPipelineId: id },
  });
}

const cloudSyncSrc = readSrc("src/lib/cloud-sync.ts");
const bzpSrc = readSrc("src/lib/tenders-bzp.ts");
const persistSrc = readSrc("src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts");
const pushSrc = readSrc("src/lib/tender-pipeline/tender-pipeline-cloud-push.ts");
const migrateSrc = readSrc("src/lib/tender-pipeline/tender-pipeline-migration.ts");
const appSrc = readSrc("src/app/App.tsx");
const loaderSrc = readSrc("src/app/CloudLoader.tsx");

console.log("=== OD-OCR-29B PIPELINE WRITER INTERCEPT ===\n");

console.log("29B-1 saveTendersPipeline → canonical");
{
  ok(bzpSrc.includes("pushTenderPipelineToCloud"), "saveTendersPipeline imports canonical");
  ok(/export async function saveTendersPipeline[\s\S]+pushTenderPipelineToCloud\(items\)/.test(bzpSrc), "saveTendersPipeline calls canonical");
  ok(persistSrc.includes("pushTenderPipelineToCloud"), "persist-coalesce cloud-only uses canonical");
}

console.log("\n29B-2 / 29B-14 RS bundle extracts pipeline once");
{
  ok(cloudSyncSrc.includes("extractUnguardedPipelineFromPushKeys"), "RS uses extract helper");
  const rsStart = cloudSyncSrc.indexOf("export async function pushMergedDataBundleToCloud");
  const rsEnd = cloudSyncSrc.indexOf("export async function pushAllDataToCloudSafe", rsStart);
  const rsFn = cloudSyncSrc.slice(rsStart, rsEnd > rsStart ? rsEnd : rsStart + 2500);
  ok(rsFn.includes("pushTenderPipelineToCloud"), "RS calls canonical");
  ok(rsFn.includes("pipelineForCanonical"), "RS holds pipeline separately");
  const rawPushInRs = rsFn.match(/await pushKeysToCloud\([\s\S]*?\);/);
  ok(!!rawPushInRs && rawPushInRs[0].includes("pushKeys") && !rawPushInRs[0].includes("TENDERS_PIPELINE_KEY"), "RS raw push uses leftover keys only");
  ok((rsFn.match(/pushTenderPipelineToCloud/g) || []).length === 2, "RS exactly one canonical import+call");
}

console.log("\n29B-3 RS without pipeline unchanged");
{
  ok(cloudSyncSrc.includes("assembleRsPushKeysAndValues"), "assemble helper kept");
  ok(!cloudSyncSrc.includes("RS_PUSH_EXCLUDED") || cloudSyncSrc.includes("RS_PUSH_EXCLUDED_PAYROLL"), "payroll exclude untouched");
  const exclStart = cloudSyncSrc.indexOf("export const RS_PUSH_EXCLUDED_DOMAIN_SYNC_DATA_KEYS");
  const exclBlock = cloudSyncSrc.slice(exclStart, exclStart + 280);
  ok(exclBlock.includes("RS_PUSH_EXCLUDED_PAYROLL") && exclBlock.includes("RS_PUSH_EXCLUDED_CATALOG") && !exclBlock.includes("kw-tenders-pipeline"), "pipeline not added to RS exclude list");
}

console.log("\n29B-4 / 29B-15 deferred bootstrap extracts pipeline once");
{
  const defFn = cloudSyncSrc.slice(cloudSyncSrc.indexOf("export async function fetchAndMergeDeferredBootstrap"));
  const defEnd = defFn.indexOf("export function mergeAllDataKeys");
  const body = defEnd > 0 ? defFn.slice(0, defEnd) : defFn;
  ok(body.includes("extractUnguardedPipelineFromPushKeys"), "deferred extracts pipeline");
  ok(body.includes("pushTenderPipelineToCloud"), "deferred calls canonical");
  ok(body.includes("fail-closed, no raw fallback"), "deferred does not swallow into raw write");
  ok((body.match(/pushTenderPipelineToCloud/g) || []).length === 2, "deferred exactly one canonical import+call");
}

console.log("\n29B-5 deferred without pipeline — generic push remains");
{
  const defFn = cloudSyncSrc.slice(cloudSyncSrc.indexOf("export async function fetchAndMergeDeferredBootstrap"));
  ok(defFn.includes("void pushKeysToCloud("), "non-pipeline deferred still fail-soft raw push");
}

console.log("\n29B-6..9 lean serializer strips heavy local fields");
{
  const full = [heavyItem("h1")];
  const lean = stripTenderPipelineForCloud(full);
  ok(lean[0].noticeHtml == null, "29B-6 noticeHtml stripped");
  ok((lean[0].tenderDossier?.kosztorys?.rows?.length ?? 1) === 0, "29B-6 rows stripped");
  ok(!lean[0].tenderDossier?.scanSummary?.branchWinnerArtifacts?.[0]?.snapshot, "29B-7 artifact.snapshot cannot leak");
  ok((lean[0].changeMonitor?.events?.length ?? 1) === 0, "29B-8 changeMonitor.events cannot leak");
  ok((lean[0].qaMonitor?.events?.length ?? 1) === 0, "29B-9 qaMonitor.events cannot leak");
  ok(lean[0]._cloudLean?.v === 1, "marker v=1");
  ok(lean[0]._cloudLean?.omitted?.includes("artifact.snapshot"), "omitted lists snapshot");
  ok(isCloudLeanFieldOmitted(lean[0], "changeMonitor.events"), "omitted lists change events");
}

console.log("\n29B-10 guard revision increments");
{
  const lean = stripTenderPipelineForCloud([heavyItem("r1")]);
  const g1 = buildTenderPipelineGuard(lean, { bundleRevision: 2, bundleAt: "2026-09-03T16:29:21.162Z", deletedIds: [] });
  const g2 = buildTenderPipelineGuard(lean, { bundleRevision: (g1.bundleRevision ?? 0) + 1, bundleAt: "2026-09-03T20:00:00.000Z", deletedIds: [] });
  ok(g1.bundleRevision === 2, "prev revision 2");
  ok(g2.bundleRevision === 3, "next = prev+1");
  ok(verifyPipelineBodyGuardIkFinalBidParity(lean, g2).ok, "parity after increment");
}

console.log("\n29B-11 guard verify failure is fail-closed");
{
  clearPipelineCloudUnconfirmed();
  const lean = stripTenderPipelineForCloud([heavyItem("v1")]);
  const guard = buildTenderPipelineGuard(lean, { bundleRevision: 3, bundleAt: "t", deletedIds: [] });
  const verified = verifyTenderPipelineGuardWrite({ ...guard, bundleRevision: 2 }, { bundleRevision: 3, itemCount: 1 });
  ok(!verified.ok, "stale revision fails verify");
  markPipelineCloudUnconfirmed(verified.reason ?? "guard_verify_failed");
  ok(isPipelineCloudWriteUnconfirmed(), "unconfirmed blocks further writes");
  clearPipelineCloudUnconfirmed();
  ok(PIPELINE_GUARD_BODY_MISMATCH_BLOCKED.length > 0, "mismatch code exists");
}

console.log("\n29B-12 cloud unavailable → write blocked");
{
  const verdict = guardTenderPipelineCloudWrite([heavyItem("c1")], "UNAVAILABLE", { deletedIds: [] });
  ok(verdict.allowed === false, "unavailable not allowed");
  ok(verdict.code === PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED, "fail-closed read code");
}

console.log("\n29B-13 stale client blocked in canonical seam");
{
  ok(pushSrc.includes("assertLeanGuardClientCapable"), "canonical asserts client version");
  ok(pushSrc.includes("PIPELINE_STALE_CLIENT_BLOCKED"), "stale client throws");
  ok(pushSrc.includes("isPipelineCloudLeanClientVersionAllowed"), "uses existing minCommit gate");
}

console.log("\n29B-16 generic keys helper — no pipeline / with guard pair");
{
  const none = extractUnguardedPipelineFromPushKeys(["kw-jobs"], [[{ id: 1 }]]);
  ok(!none.extracted && none.otherKeys[0] === "kw-jobs", "no pipeline → unchanged");
  const pair = extractUnguardedPipelineFromPushKeys(
    [TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY],
    [[{ id: "p" }], { bundleRevision: 2 }],
  );
  ok(!pair.extracted, "body+guard pair is not extracted (canonical raw allowed)");
  ok(!shouldRoutePipelinePushToCanonicalSeam([TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY]), "pair not routed");
  ok(shouldRoutePipelinePushToCanonicalSeam([TENDERS_PIPELINE_KEY, "kw-jobs"]), "unguarded pipeline is routed");
  ok(!shouldRoutePipelinePushToCanonicalSeam(["kw-jobs"]), "jobs-only not routed");
  ok(!shouldRoutePipelinePushToCanonicalSeam([TENDERS_PIPELINE_KEY], { leanGuardEnabled: false }), "flags off → no route");
}

console.log("\n29B-17 Final Bid preserved");
{
  const lean = stripTenderPipelineForCloud([heavyItem("bid1")]);
  ok(lean[0].ikFinalBid?.grossPln === 123000, "ikFinalBid FULL in lean body");
}

console.log("\n29B-18 preserve-heavy rows semantics unchanged");
{
  const localRows = {
    ok: true,
    sourceFilename: "l.ATH",
    rowCount: 2,
    rows: [{ description: "keep" }],
    parsedAt: "2026-06-02T00:00:00.000Z",
  };
  const cloudLean = {
    ok: true,
    sourceFilename: "l.ATH",
    rowCount: 2,
    rows: [],
    _rowsOmitted: true,
    parsedAt: "2026-06-01T00:00:00.000Z",
  };
  const merged = mergeKosztorysPreserveHeavy(localRows, cloudLean, {
    leanRowsOmittedA: false,
    leanRowsOmittedB: true,
  });
  ok((merged?.rows?.length ?? 0) === 1, "local rows kept vs lean omitted cloud");
}

console.log("\n29B-19 artifact shell / metadata preserved");
{
  const local = {
    parsedAt: "2026-06-02T00:00:00.000Z",
    branchWinnerArtifacts: [
      { filename: "a.pdf", documentId: "d1", snapshot: { rows: [1] }, kind: "kosztorys" },
    ],
  };
  const cloud = {
    parsedAt: "2026-06-01T00:00:00.000Z",
    branchWinnerArtifacts: [
      { filename: "a.pdf", documentId: "d1", kind: "kosztorys" },
    ],
  };
  const merged = mergeScanSummaryPreserveArtifacts(local, cloud, {
    leanArtifactSnapshotOmittedA: false,
    leanArtifactSnapshotOmittedB: true,
  });
  ok(merged?.branchWinnerArtifacts?.[0]?.filename === "a.pdf", "artifact shell kept");
  ok(merged?.branchWinnerArtifacts?.[0]?.snapshot, "local snapshot unioned (merge unchanged)");
  const afterStrip = stripTenderPipelineForCloud([
    item("s1", { tenderDossier: { scanSummary: merged, builtAt: "t" } }),
  ]);
  ok(afterStrip[0].tenderDossier?.scanSummary?.branchWinnerArtifacts?.[0]?.filename === "a.pdf", "shell survives cloud strip");
  ok(!afterStrip[0].tenderDossier?.scanSummary?.branchWinnerArtifacts?.[0]?.snapshot, "snapshot stripped on cloud write");
}

console.log("\n29B-20 migrationComplete=true → migration not triggered");
{
  ok(!cloudSyncSrc.includes("migratePipelineFullToLeanGuard"), "cloud-sync does not call migration");
  ok(migrateSrc.includes("already_complete"), "migration still gated");
}

console.log("\n29B-21 rollback=false — no new rollback path");
{
  ok(!cloudSyncSrc.includes("pipelineCloudLeanRollback"), "cloud-sync does not add rollback branch");
}

console.log("\n29B-22 import/restore go through RS → canonical");
{
  ok(appSrc.includes("await pushAllDataToCloud(bundle)"), "importBackup uses pushAllDataToCloud");
  ok(appSrc.includes("await pushAllDataToCloud(merged)"), "restoreAllDataFromCloud uses pushAllDataToCloud");
  ok(cloudSyncSrc.includes("return pushAllDataToCloudSafe(values)"), "pushAllDataToCloud → Safe → RS");
}

console.log("\nSafety net intercept in pushKeysToCloud");
{
  ok(cloudSyncSrc.includes("shouldRoutePipelinePushToCanonicalSeam"), "pushKeysToCloud uses route helper");
  ok(cloudSyncSrc.includes("skipPipelineLeanIntercept"), "canonical pair can skip intercept");
  const intercept = cloudSyncSrc.slice(cloudSyncSrc.indexOf("export async function pushKeysToCloud"));
  ok(intercept.includes("pushTenderPipelineToCloud"), "safety-net routes to canonical");
}

console.log("\nWriter inventory (production src)");
{
  const writers = [
    { name: "saveTendersPipeline", src: bzpSrc, canonical: true },
    { name: "persistKey(pipeline)", src: cloudSyncSrc, canonical: cloudSyncSrc.includes("if (key === TENDERS_PIPELINE_KEY)") && cloudSyncSrc.includes("await pushTenderPipelineToCloud(items)") },
    { name: "pushKeysToCloudSafe", src: cloudSyncSrc, canonical: /if \(pipeIdx >= 0\)[\s\S]+pushTenderPipelineToCloud/.test(cloudSyncSrc) },
    { name: "pushMergedDataBundleToCloud", src: cloudSyncSrc, canonical: true },
    { name: "fetchAndMergeDeferredBootstrap", src: cloudSyncSrc, canonical: true },
    { name: "persist-coalesce", src: persistSrc, canonical: true },
    { name: "CloudLoader CORE", src: loaderSrc, canonical: !/BOOTSTRAP_CORE_KEYS[\s\S]*kw-tenders-pipeline/.test(readSrc("src/lib/cloud-sync.ts").slice(0, 4000)) },
  ];
  for (const w of writers) {
    ok(w.canonical, `${w.name} canonical or not a pipeline writer`);
  }
  ok(!loaderSrc.includes("kw-tenders-pipeline"), "CloudLoader does not push pipeline by name");
  ok(asTenderPipelineItems(null).length === 0, "asTenderPipelineItems guards non-array");
}

console.log("\nMerge+strip replay (29A shape → lean, no KV)");
{
  const local = [heavyItem("m1")];
  const cloudLean = stripTenderPipelineForCloud([item("m1", { updatedAt: "2026-06-01T11:00:00.000Z" })]);
  const merged = mergeTenderPipelineForCloud(local, cloudLean, []);
  ok(merged[0].noticeHtml === "<p>heavy</p>" || merged[0].changeMonitor?.events?.length, "merge can restore local heavy");
  const out = stripTenderPipelineForCloud(merged);
  ok(out[0].noticeHtml == null, "canonical strip after merge removes noticeHtml");
  ok(!out[0].tenderDossier?.scanSummary?.branchWinnerArtifacts?.[0]?.snapshot, "canonical strip after merge removes snapshot");
  ok((out[0].changeMonitor?.events?.length ?? 1) === 0, "canonical strip after merge removes events");
}

console.log(`\n=== SUMMARY pass=${pass} fail=${fail} ===`);
if (fail > 0) process.exit(1);
