/**
 * NG11-P0.1-A — bootstrap deferred retry after bootstrapKey drift (RC-1).
 * npx vite-node scripts/test-ng11-p0.1-bootstrap-race.mjs
 */

import {
  attemptTenderDocumentsBootstrap,
  registerTenderDocumentsBootstrapDeferredRetryForTests,
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";
import { documentDiscoveryBootstrapKey } from "../src/lib/tender-document-discovery.ts";

const ITEM_ID = "p01-race-test-id";
const TENDER_ID = "bzp-p01-race";
const LONG_HTML = "<html><body>" + "x".repeat(120) + "</body></html>";

const mockDoc = {
  index: 1,
  documentId: "doc-1",
  filename: "SWZ.pdf",
  contentType: "application/pdf",
};

function baseItem(overrides = {}) {
  return {
    id: ITEM_ID,
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00999001",
    title: "NG11-P0.1-A race",
    organizationName: "WM",
    bzpNumber: "2026/BZP 00999001",
    status: "seen",
    updatedAt: new Date().toISOString(),
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeDeps(fetchCallsRef) {
  return {
    fetchTenderNoticeDetails: async () => ({
      id: "n1",
      tenderId: TENDER_ID,
      moIdentifier: "mo",
      noticeNumber: "2026/BZP 00999001",
      tenderState: "Open",
      publicationDate: "2026-01-01",
      htmlBody: LONG_HTML,
    }),
    fetchTenderDocuments: async () => {
      fetchCallsRef.count += 1;
      await sleep(50);
      return [mockDoc];
    },
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
      pageLinks: [],
    }),
  };
}

console.log("=== NG11-P0.1-A Bootstrap Race / Deferred Retry ===\n");

resetTenderDocumentsBootstrapForTests();

// R1 — key drift during inflight → deferred retry signal + second fetch on retry
{
  const fetchCalls = { count: 0 };
  const deps = makeDeps(fetchCalls);
  let deferredFired = 0;
  const unregister = registerTenderDocumentsBootstrapDeferredRetryForTests(
    ITEM_ID,
    () => { deferredFired += 1; },
  );

  const itemBefore = baseItem();
  const itemAfter = baseItem({
    noticeHtml: LONG_HTML,
    noticeHtmlFetchedAt: new Date().toISOString(),
  });
  ok(
    "R1 key drift",
    documentDiscoveryBootstrapKey(itemBefore) !== documentDiscoveryBootstrapKey(itemAfter),
  );

  const attempt1 = attemptTenderDocumentsBootstrap({
    item: itemBefore,
    onUpdate: () => {},
    deps,
  });
  await sleep(10);
  const blocked = await attemptTenderDocumentsBootstrap({
    item: itemAfter,
    onUpdate: () => {},
    deps,
  });
  const result1 = await attempt1;
  unregister();

  ok("R1 attempt1 ok", result1.ok === true);
  ok("R1 attempt2 blockedByInflight", blocked.blockedByInflight === true);
  ok("R1 attempt2 not ok", blocked.ok === false);
  ok("R1 deferred retry scheduled", deferredFired === 1);
  ok("R1 first pass fetch once", fetchCalls.count === 1);

  const retryResult = await attemptTenderDocumentsBootstrap({
    item: itemAfter,
    onUpdate: () => {},
    deps,
  });
  ok("R1 deferred retry attempt ok", retryResult.ok === true);
  ok("R1 total fetch twice (no duplicate storm)", fetchCalls.count === 2);
}

resetTenderDocumentsBootstrapForTests();

// R2 — blocked without key drift → NO deferred retry
{
  const fetchCalls = { count: 0 };
  const deps = makeDeps(fetchCalls);
  let deferredFired = 0;
  const unregister = registerTenderDocumentsBootstrapDeferredRetryForTests(
    ITEM_ID,
    () => { deferredFired += 1; },
  );

  const item = baseItem();
  const attempt1 = attemptTenderDocumentsBootstrap({
    item,
    onUpdate: () => {},
    deps,
  });
  await sleep(10);
  const blocked = await attemptTenderDocumentsBootstrap({
    item,
    onUpdate: () => {},
    deps,
  });
  await attempt1;
  unregister();

  ok("R2 blocked inflight", blocked.blockedByInflight === true);
  ok("R2 no deferred without drift", deferredFired === 0);
  ok("R2 single fetch", fetchCalls.count === 1);
}

resetTenderDocumentsBootstrapForTests();

// R3 — successful single attempt, no parallel blocked → no deferred
{
  const fetchCalls = { count: 0 };
  const deps = makeDeps(fetchCalls);
  let deferredFired = 0;
  const unregister = registerTenderDocumentsBootstrapDeferredRetryForTests(
    ITEM_ID,
    () => { deferredFired += 1; },
  );

  const r = await attemptTenderDocumentsBootstrap({
    item: baseItem({ noticeHtml: LONG_HTML }),
    onUpdate: () => {},
    deps,
  });
  unregister();

  ok("R3 ok", r.ok === true);
  ok("R3 no deferred", deferredFired === 0);
  ok("R3 fetch once", fetchCalls.count === 1);
}

resetTenderDocumentsBootstrapForTests();

// R4 — idempotent deferred: second schedule after pending consumed does nothing
{
  let deferredFired = 0;
  const unregister = registerTenderDocumentsBootstrapDeferredRetryForTests(
    ITEM_ID,
    () => { deferredFired += 1; },
  );
  const fetchCalls = { count: 0 };
  const deps = makeDeps(fetchCalls);
  const itemBefore = baseItem();
  const itemAfter = baseItem({
    noticeHtml: LONG_HTML,
    noticeHtmlFetchedAt: new Date().toISOString(),
  });

  const p1 = attemptTenderDocumentsBootstrap({ item: itemBefore, onUpdate: () => {}, deps });
  await sleep(10);
  await attemptTenderDocumentsBootstrap({ item: itemAfter, onUpdate: () => {}, deps });
  await p1;
  ok("R4 deferred once after drift", deferredFired === 1);
  unregister();
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
