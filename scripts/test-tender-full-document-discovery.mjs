/**
 * NG-02.1B — SSOT orchestrator discovery policy + modes.
 * npx vite-node scripts/test-tender-full-document-discovery.mjs
 */

import {
  applyDiscoveryMonitors,
  isExternalDiscoverySettled,
  resolveDiscoveryForcePolicy,
  runTenderFullDocumentDiscovery,
  shouldRetryEmptyDiscovery,
  shouldRunExternalDiscovery,
} from "../src/lib/tender-pipeline/tender-full-document-discovery.ts";
import { resetDiscoverySnapshotsForTests } from "../src/lib/tender-pipeline/tender-pipeline-discovery-snapshot.ts";
import { retryTenderPipelinePhase } from "../src/lib/tender-pipeline/tender-pipeline-retry.ts";
import {
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";
import {
  clearDossierInflightForItem,
  isDossierInflightForItem,
  markDossierInflightForTest,
  resetDossierHeavyLazyForTests,
} from "../src/app/hooks/useTenderDossierHeavyLazy.ts";

const TENDER_ID = "bzp-full-discovery-test";
const ITEM_ID = "item-full-discovery";
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
    noticeNumber: "2026/BZP 00012345",
    title: "Test NG-02.1B",
    organizationName: "WM",
    bzpNumber: "2026/BZP 00012345",
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

resetDiscoverySnapshotsForTests();
resetTenderDocumentsBootstrapForTests();
resetDossierHeavyLazyForTests();

console.log("=== NG-02.1B runTenderFullDocumentDiscovery ===\n");

// Policy — force
{
  const settledEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
  });
  ok("P1 manual force", resolveDiscoveryForcePolicy(settledEmpty, "manual") === true);
  ok("P2 rescan force", resolveDiscoveryForcePolicy(settledEmpty, "rescan") === true);
  ok("P3 auto settled-empty retry", resolveDiscoveryForcePolicy(settledEmpty, "auto") === true);
  ok("P4 shouldRetryEmptyDiscovery", shouldRetryEmptyDiscovery(settledEmpty) === true);
  ok("P5 auto settled with docs no force", resolveDiscoveryForcePolicy(
    baseItem({ bzpDocuments: [mockDoc], documentsFetchedAt: "2026-06-25T10:00:00.000Z" }),
    "auto",
  ) === false);
}

// External policy
{
  const item = baseItem({ noticeHtml: LONG_HTML });
  ok("E1 manual external", shouldRunExternalDiscovery(item, "manual", {
    includeExternal: true,
    bzpDocCount: 0,
    noticeHtml: LONG_HTML,
  }));
  ok("E2 auto external skip when settled", !shouldRunExternalDiscovery(
    baseItem({ externalDocDiscovery: { builtAt: "2026-06-25T10:00:00.000Z", files: [], pageLinks: [] } }),
    "auto",
    { includeExternal: true, bzpDocCount: 0, noticeHtml: LONG_HTML },
  ));
  ok("E3 isExternalDiscoverySettled", isExternalDiscoverySettled({
    externalDocDiscovery: { builtAt: "2026-06-25T10:00:00.000Z", files: [], pageLinks: [] },
  }));
}

// Orchestrator manual BZP
{
  let fetchCalls = 0;
  const result = await runTenderFullDocumentDiscovery(baseItem(), {
    mode: "manual",
    includeExternal: false,
    prefetchNotice: false,
    deps: {
      fetchTenderDocuments: async () => {
        fetchCalls += 1;
        return [mockDoc];
      },
      discoverExternalTenderDocs: async () => ({ builtAt: new Date().toISOString(), files: [], pageLinks: [] }),
      fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
    },
  });
  ok("O1 manual bzpRan", result.meta.bzpRan === true);
  ok("O1 manual force flag", result.meta.bzpForce === true);
  ok("O1 patch docs", (result.patch.bzpDocuments?.length ?? 0) === 1);
  ok("O1 monitors in patch", Boolean(result.patch.changeMonitor));
  ok("O1 fetch once", fetchCalls === 1);
}

// Orchestrator auto settled-empty
{
  let fetchCalls = 0;
  const settledEmpty = baseItem({
    documentsFetchedAt: "2026-06-25T11:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-25T10:00:00.000Z",
    bzpDocuments: [],
    noticeHtml: LONG_HTML,
  });
  const result = await runTenderFullDocumentDiscovery(settledEmpty, {
    mode: "auto",
    includeExternal: false,
    prefetchNotice: false,
    deps: {
      fetchTenderDocuments: async () => {
        fetchCalls += 1;
        return [mockDoc];
      },
      discoverExternalTenderDocs: async () => ({ builtAt: new Date().toISOString(), files: [], pageLinks: [] }),
      fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
    },
  });
  ok("O2 auto settled-empty bzpRan", result.meta.bzpRan === true);
  ok("O2 auto settled-empty fetch", fetchCalls === 1);
}

// applyDiscoveryMonitors pure
{
  const merged = baseItem({ bzpDocuments: [mockDoc] });
  const monitors = applyDiscoveryMonitors(merged, [mockDoc]);
  ok("M1 changeMonitor", Boolean(monitors.patch.changeMonitor));
  ok("M2 qaMonitor", Boolean(monitors.patch.qaMonitor));
}

// Retry scopes
{
  markDossierInflightForTest("retry-test-id");
  ok("R1 inflight marked", isDossierInflightForItem("retry-test-id"));
  retryTenderPipelinePhase("retry-test-id", "heavy");
  ok("R2 heavy clears inflight", !isDossierInflightForItem("retry-test-id"));
  clearDossierInflightForItem(ITEM_ID);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
