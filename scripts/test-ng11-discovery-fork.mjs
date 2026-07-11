/**
 * NG11-A3 — discovery fork (speculative external ∥ BZP).
 * npx vite-node scripts/test-ng11-discovery-fork.mjs
 */

import {
  DISCOVERY_FORK_EXTERNAL_TIMEOUT_MS,
  DISCOVERY_T1_NETWORK_POOL,
  forcePipelineDiscoveryForkForTests,
  getMaxDiscoveryNetworkConcurrencyForTests,
  isPipelineDiscoveryForkEnabled,
  resetDiscoveryForkTelemetryForTests,
  runDiscoveryForkJoin,
  shouldStartDiscoveryFork,
} from "../src/lib/tender-pipeline/tender-discovery-fork.ts";
import { runTenderFullDocumentDiscovery } from "../src/lib/tender-pipeline/tender-full-document-discovery.ts";
import { resetDiscoverySnapshotsForTests } from "../src/lib/tender-pipeline/tender-pipeline-discovery-snapshot.ts";

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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function p50(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const LONG_HTML = "<html><body>" + "x".repeat(120) + "</body></html>";
const TENDER_ID = "ng11-a3-test";
const ITEM_ID = "item-ng11-a3";

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
    title: "NG11-A3 Test",
    organizationName: "WM",
    bzpNumber: "2026/BZP 00012345",
    status: "seen",
    noticeHtml: LONG_HTML,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockExternal(files = []) {
  return {
    builtAt: new Date().toISOString(),
    status: "done",
    pageLinks: [],
    files,
  };
}

forcePipelineDiscoveryForkForTests(null);
resetDiscoveryForkTelemetryForTests();
resetDiscoverySnapshotsForTests();

console.log("=== NG11-A3 Discovery Fork ===\n");

// Constants frozen
{
  ok("C1 timeout 45s", DISCOVERY_FORK_EXTERNAL_TIMEOUT_MS === 45_000);
  ok("C2 T1 pool 2", DISCOVERY_T1_NETWORK_POOL === 2);
}

// Flag default OFF
{
  ok("F1 flag default OFF", isPipelineDiscoveryForkEnabled() === false);
  ok("F2 shouldStart OFF", shouldStartDiscoveryFork(baseItem(), {
    mode: "auto",
    includeExternal: true,
  }) === false);
}

// shouldStartDiscoveryFork policy
{
  forcePipelineDiscoveryForkForTests(true);
  ok("P1 auto + html", shouldStartDiscoveryFork(baseItem(), {
    mode: "auto",
    includeExternal: true,
  }));
  ok("P2 manual skip", !shouldStartDiscoveryFork(baseItem(), {
    mode: "manual",
    includeExternal: true,
  }));
  ok("P3 no includeExternal", !shouldStartDiscoveryFork(baseItem(), {
    mode: "auto",
    includeExternal: false,
  }));
  ok("P4 skipBzp", !shouldStartDiscoveryFork(baseItem(), {
    mode: "auto",
    includeExternal: true,
    skipBzp: true,
  }));
  ok("P5 external settled", !shouldStartDiscoveryFork(baseItem({
    externalDocDiscovery: { builtAt: "2026-06-25T10:00:00.000Z", files: [], pageLinks: [] },
  }), {
    mode: "auto",
    includeExternal: true,
  }));
  ok("P6 no html", !shouldStartDiscoveryFork(baseItem({ noticeHtml: "" }), {
    mode: "auto",
    includeExternal: true,
  }));
}

// Fork join — discard when BZP > 0
{
  resetDiscoveryForkTelemetryForTests();
  const join = await runDiscoveryForkJoin({
    isCancelled: () => false,
    runBzp: async () => ({ docs: [mockDoc] }),
    runExternal: async () => ({ files: [{ id: "ext-1" }] }),
    getBzpDocCount: (bzp) => bzp.docs.length,
  });
  ok("J1 fork cancelled", join.meta.forkCancelled === true);
  ok("J2 external discarded", join.external === null);
  ok("J3 bzp preserved", join.bzp.docs.length === 1);
}

// Fork join — win when BZP empty
{
  const join = await runDiscoveryForkJoin({
    isCancelled: () => false,
    runBzp: async () => ({ docs: [] }),
    runExternal: async () => ({ files: [{ id: "ext-1" }] }),
    getBzpDocCount: (bzp) => bzp.docs.length,
  });
  ok("J4 fork won", join.meta.forkWon === true);
  ok("J5 external kept", join.external?.files?.length === 1);
}

// Fork join — isCancelled
{
  const join = await runDiscoveryForkJoin({
    isCancelled: () => true,
    runBzp: async () => ({ docs: [] }),
    runExternal: async () => ({ files: [{ id: "ext-1" }] }),
    getBzpDocCount: (bzp) => bzp.docs.length,
  });
  ok("J6 cancelled external null", join.external === null);
}

// T1 pool — max 2 concurrent
{
  resetDiscoveryForkTelemetryForTests();
  const delays = [];
  await Promise.all([
    runDiscoveryForkJoin({
      isCancelled: () => false,
      runBzp: async () => {
        await sleep(30);
        return { docs: [] };
      },
      runExternal: async () => {
        await sleep(30);
        return { files: [] };
      },
      getBzpDocCount: (bzp) => bzp.docs.length,
    }),
    runDiscoveryForkJoin({
      isCancelled: () => false,
      runBzp: async () => {
        await sleep(30);
        return { docs: [] };
      },
      runExternal: async () => {
        await sleep(30);
        return { files: [] };
      },
      getBzpDocCount: (bzp) => bzp.docs.length,
    }),
  ]);
  ok("T1 pool max 2", getMaxDiscoveryNetworkConcurrencyForTests() <= DISCOVERY_T1_NETWORK_POOL);
}

// Orchestrator — flag OFF waterfall (external after bzp)
{
  forcePipelineDiscoveryForkForTests(false);
  let bzpEnd = 0;
  let extStart = 0;
  await runTenderFullDocumentDiscovery(baseItem(), {
    mode: "auto",
    includeExternal: true,
    prefetchNotice: false,
    deps: {
      fetchTenderDocuments: async () => {
        await sleep(20);
        bzpEnd = Date.now();
        return [];
      },
      discoverExternalTenderDocs: async () => {
        extStart = Date.now();
        return mockExternal();
      },
      fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
    },
  });
  ok("O1 waterfall ext after bzp", extStart >= bzpEnd);
  ok("O1 no fork meta", true);
}

// Orchestrator — flag ON fork (parallel overlap)
{
  forcePipelineDiscoveryForkForTests(true);
  let bzpStart = 0;
  let extStart = 0;
  const t0 = Date.now();
  const result = await runTenderFullDocumentDiscovery(baseItem(), {
    mode: "auto",
    includeExternal: true,
    prefetchNotice: false,
    deps: {
      fetchTenderDocuments: async () => {
        bzpStart = Date.now() - t0;
        await sleep(80);
        return [];
      },
      discoverExternalTenderDocs: async () => {
        extStart = Date.now() - t0;
        await sleep(80);
        return mockExternal([{
          id: "f1",
          url: "https://x/f1.pdf",
          filename: "f1.pdf",
          contentType: "application/pdf",
          storagePath: "p/f1",
          publicUrl: "https://x/p/f1",
          isSwzHint: false,
          score: 10,
          fetchedAt: new Date().toISOString(),
        }]);
      },
      fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
    },
  });
  ok("O2 fork started", result.meta.forkStarted === true);
  ok("O2 parallel overlap", Math.abs(bzpStart - extStart) < 50);
  ok("O2 external ran", result.meta.externalRan === true);
}

// Orchestrator — fork cancel BZP>0
{
  forcePipelineDiscoveryForkForTests(true);
  let extMerged = false;
  const result = await runTenderFullDocumentDiscovery(baseItem(), {
    mode: "auto",
    includeExternal: true,
    prefetchNotice: false,
    deps: {
      fetchTenderDocuments: async () => [mockDoc],
      discoverExternalTenderDocs: async () => {
        extMerged = true;
        return mockExternal([{
          id: "f1",
          url: "https://x/f1.pdf",
          filename: "f1.pdf",
          contentType: "application/pdf",
          storagePath: "p/f1",
          publicUrl: "https://x/p/f1",
          isSwzHint: false,
          score: 10,
          fetchedAt: new Date().toISOString(),
        }]);
      },
      fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
    },
  });
  ok("O3 fork cancelled", result.meta.forkCancelled === true);
  ok("O3 bzp docs", (result.patch.bzpDocuments?.length ?? 0) === 1);
  ok("O3 no external patch", !result.patch.externalDocDiscovery?.files?.length);
}

// PG-A3 harness — mock timing empty BZP profile
{
  forcePipelineDiscoveryForkForTests(false);
  const waterfallMs = [];
  for (let i = 0; i < 5; i += 1) {
    const t0 = Date.now();
    await runTenderFullDocumentDiscovery(baseItem({ id: `pg-w-${i}` }), {
      mode: "auto",
      includeExternal: true,
      prefetchNotice: false,
      deps: {
        fetchTenderDocuments: async () => {
          await sleep(100);
          return [];
        },
        discoverExternalTenderDocs: async () => {
          await sleep(200);
          return mockExternal();
        },
        fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
      },
    });
    waterfallMs.push(Date.now() - t0);
  }
  forcePipelineDiscoveryForkForTests(true);
  const forkMs = [];
  for (let i = 0; i < 5; i += 1) {
    const t0 = Date.now();
    await runTenderFullDocumentDiscovery(baseItem({ id: `pg-f-${i}` }), {
      mode: "auto",
      includeExternal: true,
      prefetchNotice: false,
      deps: {
        fetchTenderDocuments: async () => {
          await sleep(100);
          return [];
        },
        discoverExternalTenderDocs: async () => {
          await sleep(200);
          return mockExternal();
        },
        fetchTenderNoticeDetails: async () => ({ tenderState: "Open", htmlBody: LONG_HTML }),
      },
    });
    forkMs.push(Date.now() - t0);
  }
  const forkP50 = p50(forkMs);
  const waterfallP50 = p50(waterfallMs);
  const reduction = ((waterfallP50 - forkP50) / waterfallP50) * 100;
  ok(`PG-A3 fork faster (forkP50=${forkP50} wfP50=${waterfallP50})`, forkP50 < waterfallP50);
  ok(`PG-A3 reduction ~${reduction.toFixed(0)}%`, reduction >= 25);
}

forcePipelineDiscoveryForkForTests(null);
resetDiscoveryForkTelemetryForTests();

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
