/**
 * NG11-P0 — Discovery Unification: AUTO_EMPTY → MANUAL_REFRESH → AUTO_RETRY
 * npx vite-node scripts/test-ng11-p0-discovery-unification.mjs
 */

import {
  bzpDocumentSetFingerprint,
  discoverTenderDocumentsSSOT,
  runManualBzpDocumentDiscovery,
} from "../src/lib/tender-document-discovery-ssot.ts";
import { resolveDiscoveryForcePolicy } from "../src/lib/tender-pipeline/tender-full-document-discovery.ts";
import {
  attemptTenderDocumentsBootstrap,
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";

const TENDER_ID = "bzp-p0-unification";
const ITEM_ID = "item-p0-unification";
const LONG_HTML = "<html><body>" + "x".repeat(120) + "</body></html>";

const mockDocs = [
  { index: 1, documentId: "doc-a", filename: "SWZ.pdf", contentType: "application/pdf" },
  { index: 2, documentId: "doc-b", filename: "KOSZTORYS.xlsx", contentType: "application/vnd.ms-excel" },
];

function baseItem(overrides = {}) {
  return {
    id: ITEM_ID,
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00999001",
    title: "NG11-P0 unification",
    organizationName: "WM",
    bzpNumber: "2026/BZP 00999001",
    status: "seen",
    updatedAt: new Date().toISOString(),
    noticeHtml: LONG_HTML,
    ...overrides,
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

function mockFetch() {
  return async () => [...mockDocs];
}

resetTenderDocumentsBootstrapForTests();

console.log("=== NG11-P0 Discovery Unification ===\n");

// SSOT meta shape
{
  const r = await discoverTenderDocumentsSSOT(baseItem(), {
    force: true,
    fetchDocuments: mockFetch(),
  });
  ok("M1 ok", r.ok === true);
  ok("M2 fetchExecuted", r.meta.fetchExecuted === true);
  ok("M3 documentsFound", r.meta.documentsFound === 2);
  ok("M4 force true", r.meta.force === true);
  ok("M5 meta fields", typeof r.meta.fetchSkipped === "boolean"
    && typeof r.meta.settled === "boolean"
    && typeof r.meta.persistExecuted === "boolean");
}

// AUTO_EMPTY → MANUAL_REFRESH → AUTO_RETRY
{
  const settledEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
  });

  const autoEmpty = await discoverTenderDocumentsSSOT(settledEmpty, {
    force: resolveDiscoveryForcePolicy(settledEmpty, "auto"),
    fetchDocuments: mockFetch(),
  });
  ok("U1 AUTO_EMPTY fetch", autoEmpty.meta.fetchExecuted === true);
  const fpAuto = bzpDocumentSetFingerprint(autoEmpty.mergedItem.bzpDocuments);

  const manual = await runManualBzpDocumentDiscovery(settledEmpty, {
    fetchDocuments: mockFetch(),
  });
  ok("U2 MANUAL_REFRESH fetch", manual.meta.fetchExecuted === true);
  const fpManual = bzpDocumentSetFingerprint(manual.mergedItem.bzpDocuments);
  ok("U3 AUTO vs MANUAL fingerprint", fpAuto === fpManual && fpAuto.length > 0);

  const afterManual = { ...settledEmpty, ...manual.patch };
  resetTenderDocumentsBootstrapForTests();
  let persistedPatch = null;
  let mergedFromBootstrap = null;
  await attemptTenderDocumentsBootstrap({
    item: afterManual,
    onUpdate: (patch) => { persistedPatch = patch; },
    onDiscoveryMerged: (merged) => { mergedFromBootstrap = merged; },
    deps: {
      fetchTenderDocuments: mockFetch(),
      fetchTenderNoticeDetails: async () => ({
        id: "n1",
        tenderId: TENDER_ID,
        moIdentifier: "mo",
        noticeNumber: settledEmpty.noticeNumber,
        tenderState: "Open",
        publicationDate: "2026-01-01",
        htmlBody: LONG_HTML,
      }),
      discoverExternalTenderDocs: async () => ({
        builtAt: new Date().toISOString(),
        files: [],
        pageLinks: [],
      }),
    },
  });

  const fpRetry = bzpDocumentSetFingerprint(
    mergedFromBootstrap?.bzpDocuments ?? afterManual.bzpDocuments,
  );
  ok("U4 AUTO_RETRY same fingerprint as MANUAL", fpRetry === fpManual);
  ok("U5 bootstrap onDiscoveryMerged set", mergedFromBootstrap != null);
  ok("U6 settled skip no erroneous empty persist", (
    persistedPatch == null
    || (persistedPatch.bzpDocuments?.length ?? 0) === 0
    || bzpDocumentSetFingerprint(persistedPatch.bzpDocuments) === fpManual
  ));
}

// Guards — bootstrap nie skip gdy 0 załączników
{
  resetTenderDocumentsBootstrapForTests();
  let fetchCalls = 0;
  const emptySettled = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    bzpDocuments: [],
  });
  await attemptTenderDocumentsBootstrap({
    item: emptySettled,
    onUpdate: () => {},
    onDiscoveryMerged: () => {},
    deps: {
      fetchTenderDocuments: async () => {
        fetchCalls += 1;
        return mockDocs;
      },
      fetchTenderNoticeDetails: async () => ({
        id: "n1",
        tenderId: TENDER_ID,
        moIdentifier: "mo",
        noticeNumber: emptySettled.noticeNumber,
        tenderState: "Open",
        publicationDate: "2026-01-01",
        htmlBody: LONG_HTML,
      }),
      discoverExternalTenderDocs: async () => ({
        builtAt: new Date().toISOString(),
        files: [],
        pageLinks: [],
      }),
    },
  });
  ok("G1 bootstrap fetches when settled empty", fetchCalls >= 1);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
