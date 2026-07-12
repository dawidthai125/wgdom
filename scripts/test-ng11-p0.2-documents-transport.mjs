/**
 * NG11-P0.2 — BZP documents transport (no noticeHtml in GET when noticeNumber present).
 * npx vite-node scripts/test-ng11-p0.2-documents-transport.mjs
 */

import {
  buildDocumentDiscoveryFetchInput,
  DOCUMENT_DISCOVERY_HTML_MIN_LEN,
} from "../src/lib/tender-document-discovery.ts";

const LONG_HTML = "<html><body>" + "x".repeat(DOCUMENT_DISCOVERY_HTML_MIN_LEN + 50) + "</body></html>";
const TENDER_ID = "ocds-test-tender";
const NOTICE = "2026/BZP 00999001";

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

function buildDocumentsGetUrl(input) {
  const params = new URLSearchParams({ tenderId: input.tenderId });
  const noticeNumber = input.noticeNumber?.trim();
  if (noticeNumber) {
    params.set("noticeNumber", noticeNumber);
  } else if (input.noticeHtml?.trim()) {
    params.set("noticeHtml", input.noticeHtml.trim());
  }
  return `https://example.supabase.co/functions/v1/make-server-0afb8820/tenders-bzp-documents?${params}`;
}

console.log("=== NG11-P0.2 DOCUMENTS TRANSPORT ===\n");

// T1 — noticeNumber + long html → input bez noticeHtml
{
  const input = buildDocumentDiscoveryFetchInput({
    id: "x",
    tenderId: TENDER_ID,
    noticeNumber: NOTICE,
    noticeHtml: LONG_HTML,
  });
  ok("T1 input has noticeNumber", input?.noticeNumber === NOTICE);
  ok("T1 input omits noticeHtml when number present", input?.noticeHtml === undefined);
  const url = buildDocumentsGetUrl(input);
  ok("T1 URL short (<2KB)", url.length < 2048);
  ok("T1 URL has no noticeHtml param", !url.includes("noticeHtml="));
}

// T2 — bzpNumber only → maps to noticeNumber, no noticeHtml
{
  const input = buildDocumentDiscoveryFetchInput({
    id: "x",
    tenderId: TENDER_ID,
    bzpNumber: NOTICE,
    noticeHtml: LONG_HTML,
  });
  ok("T2 bzpNumber → noticeNumber", input?.noticeNumber === NOTICE);
  ok("T2 no noticeHtml with bzpNumber", input?.noticeHtml === undefined);
}

// T3 — html-only anchor (backlog P0.2.1) — noticeHtml retained
{
  const input = buildDocumentDiscoveryFetchInput({
    id: "x",
    tenderId: TENDER_ID,
    noticeNumber: "",
    bzpNumber: "",
    noticeHtml: LONG_HTML,
  });
  ok("T3 html-only keeps noticeHtml in input", input?.noticeHtml === LONG_HTML);
  ok("T3 html-only no noticeNumber", input?.noticeNumber === undefined);
}

// T4 — mirror fetchTenderDocuments param policy (integration shape)
{
  const input = buildDocumentDiscoveryFetchInput({
    id: "x",
    tenderId: TENDER_ID,
    noticeNumber: NOTICE,
    noticeHtml: LONG_HTML,
  });
  const params = new URLSearchParams();
  params.set("tenderId", input.tenderId);
  const noticeNumber = input.noticeNumber?.trim();
  if (noticeNumber) {
    params.set("noticeNumber", noticeNumber);
  } else if (input.noticeHtml?.trim()) {
    params.set("noticeHtml", input.noticeHtml.trim());
  }
  const qs = params.toString();
  ok("T4 query has noticeNumber", qs.includes("noticeNumber="));
  ok("T4 query lacks noticeHtml", !qs.includes("noticeHtml="));
  ok("T4 query length safe", qs.length < 512);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
