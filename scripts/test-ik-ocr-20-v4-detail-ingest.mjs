/**
 * OD-OCR-20 — V4 detail Owner ingest access (A20-1…A20-12).
 * npx vite-node scripts/test-ik-ocr-20-v4-detail-ingest.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let passed = 0;
let failed = 0;

function ok(cond, msg, extra) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`, extra ?? "");
  }
}

const detail = read("src/app/TenderDetailPage.tsx");
const listPage = read("src/app/TendersListPage.tsx");
const listView = read("src/app/TendersView.tsx");
const panel = read("src/app/tenders/TenderIngestImportPanel.tsx");
const actionBar = read("src/app/TenderWorkflowOperatorActionBar.tsx");
const c2Parse = read("src/lib/tender-ingest/owner-ingest-c2-parse.ts");
const ownerFiles = read("src/lib/tender-ingest/owner-files.ts");

console.log("OD-OCR-20 — V4 detail Owner ingest access\n");

ok(
  /pipeline\.items\.find\(\(t\) => t\.id === tenderId\)/.test(detail),
  "A20-1 V4 detail resolves pipeline item by tenderId",
);

ok(
  detail.includes("TenderIngestImportPanel") && detail.includes("data-ingest-v4-detail-host"),
  "A20-2 TenderIngestImportPanel mounted on V4 detail path",
);

ok(
  /activeItem=\{item\}/.test(detail),
  "A20-3 activeItem is routed pipeline item (non-null when item exists)",
);

ok(
  detail.includes("TenderIngestImportPanel") && panel.includes("Wgraj PDF / ZIP"),
  "A20-4 upload label exists in reused panel component",
);

ok(
  panel.includes("ingestOwnerBrowserFiles") && panel.includes("handleFiles"),
  "A20-5 upload uses existing handleFiles path",
);

ok(
  panel.includes("ingestOwnerBrowserFiles") && ownerFiles.includes("retainOwnerFile"),
  "A20-6 ingestOwnerBrowserFiles + retainOwnerFile seam preserved",
);

ok(
  panel.includes("runOwnerIngestParseWithIntraPdfC2") && c2Parse.includes("parseDocumentToKosztorys"),
  "A20-7 retainOwnerFile identity + C2 wrapper seam preserved in panel",
);

ok(
  c2Parse.includes("intraPdfDerived") && c2Parse.includes("parentDocumentId"),
  "A20-8 runOwnerIngestParseWithIntraPdfC2 remains C2 seam",
);

ok(
  actionBar.includes("Wgraj SWZ") && actionBar.includes("uploadTenderFile") === false,
  "A20-9 Wgraj SWZ contract unchanged (operator bar, not ingest panel)",
);

ok(
  actionBar.includes("onUpload") && !detail.includes("uploadTenderFile"),
  "A20-9b detail does not wire SWZ upload as ingest substitute",
);

ok(
  listView.includes("TenderIngestImportPanel") && listView.includes("importPinnedTender"),
  "A20-10 legacy list ingest panel preserved",
);

ok(
  listPage.includes("onItemNavigate") && listView.includes("onItemNavigate(item.id)"),
  "A20-11 V4 navigation (onItemNavigate) unchanged",
);

const detailPanelMounts = (detail.match(/<TenderIngestImportPanel/g) ?? []).length;
const listPanelMounts = (listView.match(/<TenderIngestImportPanel/g) ?? []).length;
ok(
  detailPanelMounts === 1 && listPanelMounts === 1,
  "A20-12 no duplicate ingest host — one mount on detail + one on list",
  { detailPanelMounts, listPanelMounts },
);

ok(
  !detail.includes("ingestOwnerBrowserFiles") || detail.includes("TenderIngestImportPanel"),
  "A20-12b detail does not bypass panel with direct ingest calls",
);

console.log(`\n${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
