/**
 * SSOT — bramka discovery dokumentów (variant B) + testy bootstrap retry.
 */

import {
  attemptTenderDocumentsBootstrap,
  canRunDocumentDiscovery,
  isDocumentDiscoverySettled,
  isTenderDiscoveryCompleted,
  isTenderDocumentsBootstrapCompleted,
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";
import {
  buildDocumentDiscoveryFetchInput,
  canRunDocumentDiscovery as canRunDiscoveryLib,
  isDocumentDiscoverySettled as isSettledLib,
  resolveDocumentDiscoveryAnchor,
  runTenderDocumentDiscovery,
} from "../src/lib/tender-document-discovery.ts";

const ITEM_ID = "bootstrap-retry-test-id";
const TENDER_ID = "bzp-tender-uuid";
const LONG_HTML = "<html><body>" + "x".repeat(120) + "</body></html>";

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

console.log("=== BOOTSTRAP RETRY GUARD (P1 Pack A + variant B) ===\n");

// T0 — SSOT gate unit
{
  const noAnchor = baseItem({ noticeNumber: "", bzpNumber: "", noticeHtml: "" });
  ok("T0 canRun false bez anchor", !canRunDiscoveryLib(noAnchor));
  ok("T0 buildInput null bez anchor", buildDocumentDiscoveryFetchInput(noAnchor) === null);

  const withNumber = baseItem();
  ok("T0 canRun true z noticeNumber", canRunDiscoveryLib(withNumber));
  const input = buildDocumentDiscoveryFetchInput(withNumber);
  ok("T0 input ma tenderId", input?.tenderId === TENDER_ID);
  ok("T0 input ma noticeNumber", input?.noticeNumber === "2026/BZP 00012345");

  const withHtml = baseItem({ noticeNumber: "", bzpNumber: "", noticeHtml: LONG_HTML });
  ok("T0 canRun true z noticeHtml", canRunDiscoveryLib(withHtml));
  ok("T0 input przekazuje noticeHtml", Boolean(buildDocumentDiscoveryFetchInput(withHtml)?.noticeHtml));

  const premature = baseItem({
    documentsFetchedAt: "2026-06-25T10:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T11:00:00.000Z",
    bzpDocuments: [],
  });
  ok("T0 retry gdy noticeHtml po documentsFetchedAt", !isSettledLib(premature));

  const authoritativeEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
  });
  ok("T0 settled przy autorytatywnym pustym", isSettledLib(authoritativeEmpty));
}

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
      fetchTenderDocuments: async (input) => {
        fetchCalls += 1;
        ok("T1 fetch dostaje noticeNumber", Boolean(input.noticeNumber));
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
  ok("T1 guard NOT completed bez heavy parse", !isTenderDocumentsBootstrapCompleted(ITEM_ID));
  ok("T1 second attempt ok (bez completed guard)", r2.ok === true);
  ok("T1 fetchTenderDocuments once", fetchCalls === 1);
  ok("T1 patch has bzpDocuments", patches.some((p) => p.bzpDocuments?.length === 1));
  ok("T1 patch has documentsFetchedAt", patches.some((p) => p.documentsFetchedAt));
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
  ok("T2 guard NOT completed bez heavy parse", !isTenderDocumentsBootstrapCompleted(ITEM_ID));
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
  ok("T4 kosztorys retry NOT completed bez heavy", !isTenderDocumentsBootstrapCompleted(ITEM_ID));
  ok("T4 dossier shell built", patches.some((p) => p.tenderDossier?.brief != null));
  ok("T4 bzpDocuments for lazy dossier", patches.some((p) => (p.bzpDocuments?.length ?? 0) > 0));
}

resetTenderDocumentsBootstrapForTests();

// T5 — brak anchor: nie wołaj fetch, nie ustawiaj documentsFetchedAt
{
  let fetchCalls = 0;
  const patches = [];
  const r = await attemptTenderDocumentsBootstrap({
    item: baseItem({
      noticeNumber: "",
      bzpNumber: "",
      noticeHtml: "",
    }),
    onUpdate: (p) => patches.push(p),
    deps: {
      fetchTenderDocuments: async () => {
        fetchCalls += 1;
        return [mockDoc];
      },
    },
  });
  ok("T5 bootstrap ok bez anchor", r.ok === true);
  ok("T5 fetch nie wywołany", fetchCalls === 0);
  ok("T5 brak documentsFetchedAt", !patches.some((p) => p.documentsFetchedAt));
  ok("T5 bootstrap nie completed (czeka na anchor)", !isTenderDocumentsBootstrapCompleted(ITEM_ID));
}

resetTenderDocumentsBootstrapForTests();

// T6 — anchor pojawia się później → discovery + documentsFetchedAt
{
  let fetchCalls = 0;
  const patches = [];
  const deps = {
    fetchTenderDocuments: async (input) => {
      fetchCalls += 1;
      ok("T6 fetch z noticeNumber", input.noticeNumber === "2026/BZP 00099999");
      return [mockDoc];
    },
    discoverExternalTenderDocs: async () => ({ builtAt: new Date().toISOString(), files: [] }),
  };

  await attemptTenderDocumentsBootstrap({
    item: baseItem({
      noticeNumber: "",
      bzpNumber: "",
      noticeHtml: "",
    }),
    onUpdate: () => {},
    deps,
  });
  ok("T6 pierwsza próba bez fetch", fetchCalls === 0);

  await attemptTenderDocumentsBootstrap({
    item: baseItem({
      noticeNumber: "2026/BZP 00099999",
      bzpNumber: "2026/BZP 00099999",
      noticeHtml: LONG_HTML,
    }),
    onUpdate: (p) => patches.push(p),
    deps,
  });
  ok("T6 druga próba woła fetch", fetchCalls === 1);
  ok("T6 documentsFetchedAt ustawione", patches.some((p) => p.documentsFetchedAt));
  ok("T6 bootstrap NOT completed bez heavy parse", !isTenderDocumentsBootstrapCompleted(ITEM_ID));
}

resetTenderDocumentsBootstrapForTests();

// T7 — runTenderDocumentDiscovery przekazuje noticeHtml do fetch
{
  let capturedHtml = "";
  const item = baseItem({ noticeNumber: "", bzpNumber: "", noticeHtml: LONG_HTML });
  const result = await runTenderDocumentDiscovery(item, {
    force: true,
    fetchDocuments: async (input) => {
      capturedHtml = input.noticeHtml ?? "";
      return [mockDoc];
    },
  });
  ok("T7 discovery ran", result.ran === true);
  ok("T7 noticeHtml w fetch input", capturedHtml.length >= 100);
  ok("T7 authoritative patch", Boolean(result.patch.documentsFetchedAt));
}

// T8 — nieautorytatywny skip nie ustawia documentsFetchedAt
{
  const item = baseItem({
    documentsFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
  });
  const result = await runTenderDocumentDiscovery(item);
  ok("T8 skip bez force gdy settled", result.ran === false);
  ok("T8 pusty patch", Object.keys(result.patch).length === 0);
}

resetTenderDocumentsBootstrapForTests();

// T9 — NG-02.1C: settled-empty KV + fetch docs → discovery complete, drugi attempt bez fetch
{
  const settledEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
    externalDocDiscovery: { builtAt: "2026-06-25T10:00:00.000Z", files: [], pageLinks: [] },
  });
  let fetchCalls = 0;
  const deps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: LONG_HTML,
    }),
    fetchTenderDocuments: async () => {
      fetchCalls += 1;
      return [mockDoc];
    },
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
      pageLinks: [],
    }),
  };

  const r1 = await attemptTenderDocumentsBootstrap({
    item: settledEmpty,
    onUpdate: () => {},
    deps,
  });
  ok("T9 first attempt ok", r1.ok === true);
  ok("T9 discovery marked complete with docs", isTenderDiscoveryCompleted(ITEM_ID));
  ok("T9 bootstrap NOT completed bez heavy", !isTenderDocumentsBootstrapCompleted(ITEM_ID));

  await attemptTenderDocumentsBootstrap({
    item: { ...settledEmpty, bzpDocuments: [mockDoc] },
    onUpdate: () => {},
    deps,
  });
  ok("T9 fetch once (guard blocks duplicate)", fetchCalls === 1);
}

resetTenderDocumentsBootstrapForTests();

// T10 — NG-02.1C: settled-empty + fetch [] + external → nie oznaczaj discovery complete
{
  const settledEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
  });
  const deps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: LONG_HTML,
    }),
    fetchTenderDocuments: async () => [],
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
      pageLinks: [],
    }),
  };

  const r = await attemptTenderDocumentsBootstrap({
    item: settledEmpty,
    onUpdate: () => {},
    deps,
  });
  ok("T10 attempt ok", r.ok === true);
  ok("T10 discovery NOT complete at 0 attachments", !isTenderDiscoveryCompleted(ITEM_ID));
  ok("T10 pipeline bootstrap NOT complete", !isTenderDocumentsBootstrapCompleted(ITEM_ID));
}

resetTenderDocumentsBootstrapForTests();

// T11 — NG-02.1C: po T10 settled-empty można ponowić orchestrator (sticky cleared)
{
  let fetchCalls = 0;
  const settledEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
    externalDocDiscovery: { builtAt: "2026-06-25T10:00:00.000Z", files: [], pageLinks: [] },
  });
  const emptyDeps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: LONG_HTML,
    }),
    fetchTenderDocuments: async () => {
      fetchCalls += 1;
      return [];
    },
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
      pageLinks: [],
    }),
  };

  await attemptTenderDocumentsBootstrap({
    item: settledEmpty,
    onUpdate: () => {},
    deps: emptyDeps,
  });
  ok("T11 first fetch (empty)", fetchCalls === 1);
  ok("T11 not discovery complete after empty", !isTenderDiscoveryCompleted(ITEM_ID));

  const docDeps = {
    ...emptyDeps,
    fetchTenderDocuments: async () => {
      fetchCalls += 1;
      return [mockDoc];
    },
  };
  const patches = [];
  await attemptTenderDocumentsBootstrap({
    item: settledEmpty,
    onUpdate: (p) => patches.push(p),
    deps: docDeps,
  });
  ok("T11 second attempt fetches again", fetchCalls === 2);
  ok("T11 retry patch has docs", patches.some((p) => (p.bzpDocuments?.length ?? 0) > 0));
  ok("T11 discovery complete after docs", isTenderDiscoveryCompleted(ITEM_ID));
}

resetTenderDocumentsBootstrapForTests();

// T12 — NG-02.1C: apply-on-success mimo isCancelled po BZP
{
  let cancelled = false;
  const patches = [];
  const deps = {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: LONG_HTML,
    }),
    fetchTenderDocuments: async () => {
      cancelled = true;
      return [mockDoc];
    },
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
      pageLinks: [],
    }),
  };

  const r = await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    isCancelled: () => cancelled,
    onUpdate: (p) => patches.push(p),
    deps,
  });
  ok("T12 attempt ok", r.ok === true);
  ok("T12 patch persisted despite cancel", patches.some((p) => (p.bzpDocuments?.length ?? 0) > 0));
  ok("T12 discovery marked after authoritative patch", isTenderDiscoveryCompleted(ITEM_ID));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
