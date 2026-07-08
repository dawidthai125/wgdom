/**
 * EPIC B / NG-08-02 — Workflow Process Strip (prezentacja + nawigacja V4).
 * npx vite-node scripts/test-tender-workflow-process-strip.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORKFLOW_PROCESS_STRIP_ORDER,
  WORKFLOW_PROCESS_STRIP_LABELS,
  buildWorkflowProcessStripStages,
  resolveActiveProcessStripStageId,
  workflowProcessStripStageToV4Navigate,
} from "../src/lib/tender-workflow-process-strip.ts";
import { buildOwnerPrepStatusView } from "../src/lib/tender-owner-view-ux.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

const baseItem = {
  id: "t-strip",
  title: "Test przetargu",
  status: "new",
  bzpDocuments: [{ index: 1, filename: "swz.pdf" }],
  noticeHtml: "<p>ogłoszenie</p>",
  submittingOffersDate: "2030-12-31T12:00:00.000Z",
};

console.log("\n=== EPIC B / NG-08-02 — Workflow Process Strip ===\n");

console.log("1. SSOT — kolejność i etykiety");
assert(WORKFLOW_PROCESS_STRIP_ORDER.length === 5, "exactly 5 stages");
assert(WORKFLOW_PROCESS_STRIP_ORDER[0] === "documents", "first: documents");
assert(WORKFLOW_PROCESS_STRIP_ORDER[4] === "offer", "last: offer");
assert(WORKFLOW_PROCESS_STRIP_LABELS.documents === "Dokumenty", "label Dokumenty");
assert(WORKFLOW_PROCESS_STRIP_LABELS.analysis === "Analiza", "label Analiza");
assert(WORKFLOW_PROCESS_STRIP_LABELS.kosztorys === "Kosztorys", "label Kosztorys");
assert(WORKFLOW_PROCESS_STRIP_LABELS.wycena === "Wycena", "label Wycena");
assert(WORKFLOW_PROCESS_STRIP_LABELS.offer === "Oferta", "label Oferta");

console.log("\n2. Nawigacja V4 (outbound)");
assert(workflowProcessStripStageToV4Navigate("documents").tab === "dokumenty", "documents → dokumenty");
assert(workflowProcessStripStageToV4Navigate("analysis").tab === "dokumenty", "analysis → dokumenty");
assert(workflowProcessStripStageToV4Navigate("kosztorys").tab === "kosztorys", "kosztorys → kosztorys");
assert(workflowProcessStripStageToV4Navigate("wycena").tab === "ceny", "wycena → ceny");
const offerNav = workflowProcessStripStageToV4Navigate("offer");
assert(offerNav.tab === "decyzja", "offer → decyzja");
assert(offerNav.decyzjaWorkspace === "offer", "offer → ws=offer");

console.log("\n3. resolveActiveProcessStripStageId (inbound NG-08-02)");
assert(resolveActiveProcessStripStageId("przetarg") === null, "przetarg → null");
assert(resolveActiveProcessStripStageId("dokumenty") === "documents", "dokumenty → documents");
assert(resolveActiveProcessStripStageId("kosztorys") === "kosztorys", "kosztorys → kosztorys");
assert(resolveActiveProcessStripStageId("ceny") === "wycena", "ceny → wycena");
assert(resolveActiveProcessStripStageId("decyzja", "qualification") === "offer", "decyzja qualification → offer");
assert(resolveActiveProcessStripStageId("decyzja", "offer") === "offer", "decyzja offer → offer");

console.log("\n4. Statusy z istniejących SSOT");
const withDocs = buildWorkflowProcessStripStages({ item: baseItem, swz: null });
assert(withDocs.length === 5, "build returns 5 stages");
assert(withDocs[0].id === "documents", "stage 0 id");
assert(withDocs[0].status === "done", "documents done when attachments present");

const prep = buildOwnerPrepStatusView(baseItem, null);
const withPrep = buildWorkflowProcessStripStages({
  item: baseItem,
  swz: null,
  prepStatus: prep,
});
assert(withPrep[3].id === "wycena", "wycena stage index");
assert(["done", "partial", "missing"].includes(withPrep[3].status), "wycena status valid");

const kosztorysItem = {
  ...baseItem,
  tenderDossier: {
    kosztorys: { ok: true, rowCount: 10 },
    brief: null,
    parserVersion: "1",
  },
};
const withKosztorys = buildWorkflowProcessStripStages({ item: kosztorysItem, swz: { source: "test" } });
assert(withKosztorys[2].status === "done", "kosztorys done when dossier ok");

console.log("\n5. UI wiring (WF-02 workspace chrome)");
const hubPanel = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const page = readSrc("src/app/TenderDetailPage.tsx");
const strip = readSrc("src/app/TenderWorkflowProcessStrip.tsx");
const ribbon = readSrc("src/app/TenderStatusRibbon.tsx");
assert(hubPanel.includes("TenderWorkflowProcessStrip"), "hub panel legacy embeds process strip");
assert(page.includes("TenderWorkflowProcessStrip"), "detail page mounts process strip");
assert(page.includes('variant="ribbon"'), "detail page ribbon variant");
assert(page.includes("resolveActiveProcessStripStageId"), "detail page active stage map");
assert(page.includes("data-tender-blockers-chip"), "blockers chip in chrome");
assert(!ribbon.includes("TenderWorkflowProcessStrip"), "trust ribbon without strip (WF-02)");
assert(strip.includes("data-tender-workflow-process-strip"), "strip marker");
assert(strip.includes("buildWorkflowProcessStripStages"), "strip uses SSOT builder");
assert(strip.includes("workflowProcessStripStageToV4Navigate"), "strip navigates via SSOT");
assert(strip.includes('aria-current={isActive ? "step" : undefined}'), "active stage a11y");
assert(strip.includes("ring-2 ring-primary/50"), "active stage highlight");
assert(strip.includes("buildProcessStripStagePresentation"), "strip single-icon presentation (HF-001)");
assert(strip.includes("data-tender-trust-strip-icon"), "strip icon kind attr");
assert(strip.includes('presentation.iconKind === "trust"'), "strip: trust icon branch");
assert(strip.includes("data-workflow-process-stage"), "per-stage data attr");
assert(hubPanel.includes('id="tender-progress-accordion"'), "accordion anchor id");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
