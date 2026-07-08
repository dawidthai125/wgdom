/**
 * NG-08-04 — Documents Workspace (WF-04 · REC-1).
 * npx vite-node scripts/test-tender-workspace-documents-ng08-04.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TENDER_DOCUMENT_GROUPS_EXPANDED_KEY_PREFIX,
  loadTenderDocumentGroupExpandedOverrides,
  saveTenderDocumentGroupExpandedOverrides,
  tenderDocumentGroupsExpandedKey,
} from "../src/lib/tender-documents-ui-persist.ts";

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

console.log("\n=== NG-08-04 — Documents Workspace (WF-04) ===\n");

const persist = readSrc("src/lib/tender-documents-ui-persist.ts");
const attachments = readSrc("src/app/TenderAttachmentsPanel.tsx");
const workspace = readSrc("src/app/TenderDocumentsWorkspace.tsx");
const summaryHeader = readSrc("src/app/TenderDocumentsSummaryHeader.tsx");
const groupedDocs = readSrc("src/lib/tender-grouped-documents.ts");
const stripLib = readSrc("src/lib/tender-workflow-process-strip.ts");
const detailPage = readSrc("src/app/TenderDetailPage.tsx");
const summaryLib = readSrc("src/lib/tender-documents-tab-summary.ts");

console.log("T1 — tender-documents-ui-persist exports");
assert(persist.includes("TENDER_DOCUMENT_GROUPS_EXPANDED_KEY_PREFIX"), "key prefix exported");
assert(persist.includes("loadTenderDocumentGroupExpandedOverrides"), "load exported");
assert(persist.includes("saveTenderDocumentGroupExpandedOverrides"), "save exported");
assert(TENDER_DOCUMENT_GROUPS_EXPANDED_KEY_PREFIX === "wg-tender-doc-groups-", "prefix value frozen");
assert(tenderDocumentGroupsExpandedKey("abc") === "wg-tender-doc-groups-abc", "key builder");
assert(Object.keys(loadTenderDocumentGroupExpandedOverrides(undefined)).length === 0, "no-op load without tenderId");

console.log("\nT2 — TenderUxSectionTitle in summary + attachments + workspace");
assert(summaryHeader.includes("TenderUxSectionTitle"), "summary header uses section title");
assert(attachments.includes("TenderUxSectionTitle"), "attachments uses section title");
assert(workspace.includes("TenderUxSectionTitle"), "workspace uses section title");

console.log("\nT3 — LS wiring in attachments panel");
assert(attachments.includes("loadTenderDocumentGroupExpandedOverrides"), "load in panel");
assert(attachments.includes("saveTenderDocumentGroupExpandedOverrides"), "save in panel");
assert(attachments.includes("[item.tenderId]"), "reload on tenderId change");

console.log("\nT4 — data-tender-documents-swz-meta in workspace");
assert(workspace.includes('data-tender-documents-swz-meta'), "SWZ meta collapse marker");

console.log("\nT5 — touch-safe group toggle");
assert(
  attachments.includes("TEUX_TOUCH_TARGET") && attachments.includes("touch-manipulation"),
  "touch-safe group headers",
);

console.log("\nT6 — per-group empty data attr");
assert(attachments.includes("data-tender-doc-group-empty"), "group empty marker");

console.log("\nT7 — forbidden: classifyTenderDocumentBusinessGroup body unchanged");
const classifyStart = groupedDocs.indexOf("export function classifyTenderDocumentBusinessGroup");
const classifyEnd = groupedDocs.indexOf("export function groupTenderAttachmentRows");
const classifyBody = groupedDocs.slice(classifyStart, classifyEnd);
assert(!classifyBody.includes("NG-08-04"), "no NG-08-04 markers in classifier");

console.log("\nT8 — forbidden: tender-workflow-process-strip.ts");
assert(!stripLib.includes("NG-08-04"), "no NG-08-04 markers in process strip");

console.log("\nT9 — forbidden: TenderDetailPage.tsx");
assert(!detailPage.includes("tender-documents-ui-persist"), "detail page not wired to doc persist");

console.log("\nT10 — forbidden: tender-documents-tab-summary.ts");
assert(!summaryLib.includes("NG-08-04"), "no NG-08-04 markers in summary lib");

console.log("\nT11 — brak standalone Źródło dokumentów row");
assert(!workspace.includes("Źródło dokumentów:"), "platform source inline row removed");

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
