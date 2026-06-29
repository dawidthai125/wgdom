/**
 * NG-02 P0 — pipeline automation runtime + bootstrap semantics.
 * npx vite-node scripts/test-tender-pipeline-automation-p0.mjs
 */

import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { derivePipelineState } from "../src/lib/tender-pipeline/derive-pipeline-state.ts";
import {
  isKosztorysProcessHealthMonitored,
} from "../src/lib/tender-kosztorys-process-health.ts";
import { buildKosztorysProcessSession } from "../src/lib/tender-kosztorys-process-phase.ts";
import {
  attemptTenderDocumentsBootstrap,
  isTenderDocumentsBootstrapCompleted,
  resetTenderDocumentsBootstrapForItem,
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";

const ITEM_ID = "ng02-pipeline-test";
const TENDER_ID = "bzp-tender-ng02";

function baseItem(overrides = {}) {
  return {
    id: ITEM_ID,
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00099999",
    title: "Test NG-02",
    organizationName: "WM",
    bzpNumber: "2026/BZP 00099999",
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
    console.log(`  ✓ ${label}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("NG-02 P0 pipeline automation\n");

// derivePipelineState
ok("Idle — brak sygnałów", derivePipelineState({
  item: baseItem(),
  autoRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: false,
}) === PipelineState.Idle);

ok("Notice — fetch HTML", derivePipelineState({
  item: baseItem({ noticeHtml: undefined }),
  autoRunning: true,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: false,
}) === PipelineState.Notice);

ok("Discovery — autoRunning z HTML", derivePipelineState({
  item: baseItem({ noticeHtml: "x".repeat(120) }),
  autoRunning: true,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: false,
}) === PipelineState.Discovery);

ok("External — externalRunning", derivePipelineState({
  item: baseItem(),
  autoRunning: false,
  externalRunning: true,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: false,
}) === PipelineState.External);

ok("Heavy — dossierBuilding", derivePipelineState({
  item: baseItem({ bzpDocuments: [{ index: 1, filename: "a.pdf" }] }),
  autoRunning: false,
  dossierBuilding: true,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: false,
}) === PipelineState.Heavy);

ok("Failed — parse error", derivePipelineState({
  item: baseItem(),
  autoRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: true,
  pricingReady: false,
}) === PipelineState.Failed);

const heavyDoneItem = baseItem({
  bzpDocuments: [{ index: 1, filename: "kosztorys.ath" }],
  tenderDossier: {
    brief: { title: "T" },
    kosztorys: { ok: true, rowCount: 3, parsedAt: new Date().toISOString() },
    parserVersion: CURRENT_PARSER_VERSION,
    scanSummary: { parsedAt: new Date().toISOString(), kosztorysFound: true },
    builtAt: new Date().toISOString(),
  },
});

ok("Ready — heavy + pricing", derivePipelineState({
  item: heavyDoneItem,
  autoRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: true,
}) === PipelineState.Ready);

// Health e5 / pipelineQueued
const e5Item = baseItem({
  bzpDocuments: [{ index: 1, filename: "swz.pdf" }],
});
const queuedSession = buildKosztorysProcessSession({
  pipelineQueued: true,
  lazyEnabled: true,
});
ok("Health monitored — pipelineQueued", isKosztorysProcessHealthMonitored(queuedSession, e5Item));

const idleSession = buildKosztorysProcessSession({ lazyEnabled: true });
ok("Health NOT monitored — idle bez docs", !isKosztorysProcessHealthMonitored(idleSession, baseItem()));

ok("Health monitored — e5 docs bez heavy", isKosztorysProcessHealthMonitored(idleSession, e5Item));

// Bootstrap completed semantics — docs bez heavy nie kończy od razu
resetTenderDocumentsBootstrapForTests();
const patches = [];
const mockDoc = { index: 1, documentId: "d1", filename: "SWZ.pdf", contentType: "application/pdf" };

await attemptTenderDocumentsBootstrap({
  item: baseItem(),
  onUpdate: (p) => patches.push(p),
  deps: {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "open",
      htmlBody: "<html><body>" + "y".repeat(120) + "</body></html>",
    }),
    fetchTenderDocuments: async () => [mockDoc],
    discoverExternalTenderDocs: async () => ({ files: [], pageLinks: [], builtAt: new Date().toISOString() }),
  },
});

ok("Bootstrap patch ma bzpDocuments", Boolean(patches.some((p) => p.bzpDocuments?.length === 1)));
ok("Bootstrap NIE completed gdy docs a brak heavy parse", !isTenderDocumentsBootstrapCompleted(ITEM_ID));

resetTenderDocumentsBootstrapForItem(ITEM_ID);
ok("resetTenderDocumentsBootstrapForItem czyści completed", !isTenderDocumentsBootstrapCompleted(ITEM_ID));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
