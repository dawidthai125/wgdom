/**
 * P0 hotfix 2.55.1 — Marketplanet ZIP analysis wiring
 * npx vite-node scripts/smoke-test-ezamawiajacy-p2h1-hotfix.mjs
 */
import { readFileSync } from "node:fs";
import {
  fetchEzamawiajacyDocuments,
  fetchEzamawiajacyDocumentByIndex,
} from "../src/lib/tender-ezamawiajacy.ts";
import { resolveTenderDocumentDownload } from "../src/lib/tenders-bzp.ts";
import { LOGINTRADE_ATTACHMENT_RE } from "../src/lib/tender-platform-adapters.ts";

const WM_PAGE =
  "https://wroclawskiemieszkania.ezamawiajacy.pl/pn/WROCMIE/demand/291006/notice/public/details";
const NOTICE = `<a href="${WM_PAGE}">WM</a>`;

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

function isZip(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}
function isPdf(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50;
}

console.log("=== P0 HOTFIX 2.55.1 SMOKE ===\n");

console.log("Setup — fetchEzamawiajacyDocuments");
const discovered = await fetchEzamawiajacyDocuments(NOTICE);
assert("discovered >= 1", discovered.length >= 1);
const docs = discovered.map((d) => ({ ...d }));
const zipDoc = docs.find((d) => /\.zip$/i.test(d.filename) || d.contentType.includes("zip"));
const pdfDoc = docs.find((d) => /\.pdf$/i.test(d.filename) || d.contentType.includes("pdf"));

console.log("\nT-wiring resolveTenderDocumentDownload");
const resolved = zipDoc ? resolveTenderDocumentDownload(docs, zipDoc.index) : null;
assert("sourcePageUrl present", Boolean(resolved?.sourcePageUrl?.includes("ezamawiajacy")));
assert("downloadUrl present", Boolean(resolved?.downloadUrl?.includes("repository/download")));

console.log("\nT4 dossier loadDocBytes wiring (static)");
const resolverSrc = readFileSync("src/lib/tender-document-resolver.ts", "utf8");
const analyzeSrc = readFileSync("src/lib/tenders-bzp-analyze-local.ts", "utf8");
const previewSrc = readFileSync("src/app/JobFilePreviewModal.tsx", "utf8");
assert("loadDocBytes passes sourcePageUrl", /fetchTenderDocumentBytes\([\s\S]*access\?\.sourcePageUrl/.test(resolverSrc));
assert("analyze-local passes sourcePageUrl", /loadTenderBzpDocumentBytes\([\s\S]*access\?\.sourcePageUrl/.test(analyzeSrc));
assert("JobFilePreviewModal uses Resolved or sourcePageUrl", /loadTenderBzpDocumentBytesResolved|item\.sourcePageUrl/.test(previewSrc));

console.log("\nT1 WM ZIP bytes (TP190)");
if (zipDoc?.sourcePageUrl) {
  const z = await fetchEzamawiajacyDocumentByIndex(zipDoc.sourcePageUrl, zipDoc.index);
  assert("ZIP valid PK magic", Boolean(z && isZip(z.bytes)));
  assert("ZIP size > 1KB (not HTML 267B)", Boolean(z && z.bytes.length > 1024));
  console.log(`    file: ${z?.filename} | ${z?.bytes.length} B | ${z?.contentType}`);
} else {
  assert("ZIP doc found", false);
}

console.log("\nT2 WM PDF bytes");
if (pdfDoc?.sourcePageUrl) {
  const p = await fetchEzamawiajacyDocumentByIndex(pdfDoc.sourcePageUrl, pdfDoc.index);
  assert("PDF valid %PDF", Boolean(p && isPdf(p.bytes)));
  console.log(`    file: ${p?.filename} | ${p?.bytes.length} B`);
} else {
  assert("PDF doc found (skip if none)", true);
}

console.log("\nT3 SWZ local wiring");
assert("analyze-local sourcePageUrl wired", analyzeSrc.includes("access?.sourcePageUrl"));

console.log("\nT5 Job preview wiring");
assert("bzpDocuments prop on JobFilePreviewModal", previewSrc.includes("bzpDocuments"));

console.log("\nT6 Logintrade regression");
assert("LOGINTRADE_ATTACH_RE intact", LOGINTRADE_ATTACHMENT_RE.test("DocumentService,getAttachmentUnlogged,x"));

console.log("\nT7 standard BZP resolve");
const bzpDoc = {
  index: 1,
  documentId: "t_1",
  filename: "a.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ezamowienia.gov.pl/mp-readmodels/x",
  isSwzHint: false,
};
assert("BZP resolve works", Boolean(resolveTenderDocumentDownload([bzpDoc], 1)?.downloadUrl));

console.log("\nT-Edge guard (static)");
const edgeSrc = readFileSync("supabase/functions/make-server-0afb8820/index.tsx", "utf8");
assert("Edge 502 guard", edgeSrc.includes("Marketplanet session replay required"));
assert("Edge magic bytes validation", edgeSrc.includes("assertDownloadMagicBytes"));

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
