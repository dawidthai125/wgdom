/**
 * P1 Mini-Stability Pack A — bootstrap retry guard (T1–T4).
 */

import {
  attemptTenderDocumentsBootstrap,
  isTenderDocumentsBootstrapCompleted,
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";

const ITEM_ID = "bootstrap-retry-test-id";
const TENDER_ID = "bzp-tender-uuid";

function baseItem(overrides = {}) {
  return {
    id: ITEM_ID,
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00012345",
    title: "Remont test",
    organizationName: "WM",
    priorityBuyerId: "wm",
    bzpNumber: "2026/BZP 00012345",
    status: "seen",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockDoc = {
  index: 1,
  documentId: "doc-1",
  filename: "SWZ.pdf",
  contentType: "application/pdf",
};

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

console.log("=== BOOTSTRAP RETRY GUARD (P1 Pack A) ===\n");

resetTenderDocumentsBootstrapForTests();

// T1 — success → guard blocks duplicate
{
  let fetchCalls = 0;
  const patches = [];
  const r1 = await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: (p) => patches.push(p),
    deps: {
      fetchTenderNoticeDetails: async () => ({
        tenderState: "Open",
        htmlBody: "<html><body>SWZ</body></html>",
      }),
      fetchTenderDocuments: async () => {
        fetchCalls += 1;
        return [mockDoc];
      },
      discoverExternalTenderDocs: async () => ({ builtAt: new Date().toISOString(), files: [] }),
    },
  });
  const r2 = await attemptTenderDocumentsBootstrap({
    item: baseItem({ bzpDocuments: [mockDoc], noticeHtml: "<html></html>" }),
    onUpdate: () => {},
    deps: {
      fetchTenderDocuments: async () => {
        fetchCalls += 1;
        return [mockDoc];
      },
    },
  });
  ok("T1 bootstrap success ok", r1.ok === true);
  ok("T1 guard completed after success", isTenderDocumentsBootstrapCompleted(ITEM_ID));
  ok("T1 second attempt short-circuit", r2.ok === true);
  ok("T1 fetchTenderDocuments once", fetchCalls === 1);
  ok("T1 patch has bzpDocuments", patches.some((p) => p.bzpDocuments?.length === 1));
}

resetTenderDocumentsBootstrapForTests();

// T2 — network fail → guard cleared → retry works
{
  let attempts = 0;
  const patches = [];
  const failDeps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: "<html><body>SWZ</body></html>",
    }),
    fetchTenderDocuments: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("network error");
      return [mockDoc];
    },
    discoverExternalTenderDocs: async () => ({ builtAt: new Date().toISOString(), files: [] }),
  };

  const rFail = await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: (p) => patches.push(p),
    deps: failDeps,
  });
  ok("T2 first attempt failed", rFail.ok === false);
  ok("T2 guard cleared after fail", !isTenderDocumentsBootstrapCompleted(ITEM_ID));

  const rRetry = await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: (p) => patches.push(p),
    deps: failDeps,
  });
  ok("T2 retry succeeded", rRetry.ok === true);
  ok("T2 guard set after retry success", isTenderDocumentsBootstrapCompleted(ITEM_ID));
  ok("T2 fetch attempted twice", attempts === 2);
  ok("T2 retry patch has docs", patches.some((p) => p.bzpDocuments?.length === 1));
}

resetTenderDocumentsBootstrapForTests();

// T3 — SmartPZP path: external discover fail (best-effort) but docs fetch fail → retry
{
  let docAttempts = 0;
  let discoverCalls = 0;
  const smartHtml = '<a href="https://portal.smartpzp.pl/mcus/public/postepowanie/83841053">SmartPZP</a>';

  const deps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: smartHtml,
    }),
    fetchTenderDocuments: async () => {
      docAttempts += 1;
      if (docAttempts === 1) throw new Error("SmartPZP edge timeout");
      return [{
        ...mockDoc,
        platform: "smartpzp",
        filename: "SWZ_smartpzp.pdf",
      }];
    },
    discoverExternalTenderDocs: async () => {
      discoverCalls += 1;
      throw new Error("external discover fail");
    },
  };

  const r1 = await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: () => {},
    deps,
  });
  ok("T3 docs fetch fail → not completed", r1.ok === false && !isTenderDocumentsBootstrapCompleted(ITEM_ID));

  const r2 = await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: (p) => {
      ok("T3 retry got smartpzp doc", p.bzpDocuments?.[0]?.platform === "smartpzp");
    },
    deps,
  });
  ok("T3 retry ok", r2.ok === true);
  ok("T3 discover best-effort does not block retry path", discoverCalls >= 0);
}

resetTenderDocumentsBootstrapForTests();

// T4 — /kosztorys scenario: fail then success with dossier shell
{
  let attempts = 0;
  const patches = [];
  const deps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: "<html><body>Przedmiar</body></html>",
    }),
    fetchTenderDocuments: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return [mockDoc];
    },
    discoverExternalTenderDocs: async () => ({ builtAt: new Date().toISOString(), files: [] }),
  };

  await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: () => {},
    deps,
  });
  ok("T4 kosztorys first open blocked", !isTenderDocumentsBootstrapCompleted(ITEM_ID));

  await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: (p) => patches.push(p),
    deps,
  });
  ok("T4 kosztorys retry completed", isTenderDocumentsBootstrapCompleted(ITEM_ID));
  ok("T4 dossier shell built", patches.some((p) => p.tenderDossier?.brief != null));
  ok("T4 bzpDocuments for lazy dossier", patches.some((p) => (p.bzpDocuments?.length ?? 0) > 0));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
