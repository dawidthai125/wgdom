/**
 * P2-H.1 — Generic Marketplanet adapter (*.ezamawiajacy.pl)
 * Uruchom: npx vite-node scripts/smoke-test-ezamawiajacy-p2h1.mjs
 */
import {
  detectOffPlatformHosts,
  extractLogintradePageUrls,
  LOGINTRADE_ATTACHMENT_RE,
} from "../src/lib/tender-platform-adapters.ts";
import {
  extractEzamawiajacyPageUrls,
  openEzamawiajacyPageSession,
  collectEzamawiajacyTokenPaths,
  fetchEzamawiajacyDocuments,
  downloadEzamawiajacyToken,
  parseEzamawiajacyAttachmentsFromHtml,
} from "../src/lib/tender-ezamawiajacy.ts";
import { resolveTenderPlatformDocumentStatus } from "../src/lib/tender-platform-awareness.ts";
import { resolveTenderDocumentDownload } from "../src/lib/tenders-bzp.ts";

const WM_PAGE =
  "https://wroclawskiemieszkania.ezamawiajacy.pl/pn/WROCMIE/demand/291006/notice/public/details";
const SAMPLE_NOTICE = `<p>Postępowanie: <a href="${WM_PAGE}">ezamawiajacy</a></p>`;
const UNKNOWN_TENANT =
  "https://unknown-tenant-test.ezamawiajacy.pl/pn/NOPE/demand/999999999/notice/public/details";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.log(`  ✗ ${name}`);
  }
}

console.log("=== P2-H.1 EZAMAWIAJACY SMOKE ===\n");

// T1 — notice HTML → URL
console.log("T1 extractEzamawiajacyPageUrls");
const pages = extractEzamawiajacyPageUrls(SAMPLE_NOTICE);
assert("WM URL detected", pages.some((u) => u.includes("wroclawskiemieszkania") && u.includes("291006")));

// T2 — JSESSIONID
console.log("\nT2 openEzamawiajacyPageSession (JSESSIONID)");
const session = await openEzamawiajacyPageSession(WM_PAGE);
assert("session opened", Boolean(session?.html?.length > 500));
assert("cookie present", Boolean(session?.cookie?.includes("=")));

// T3 — repository/download tokens
console.log("\nT3 parse HTML → repository/download");
const htmlTokens = session ? parseEzamawiajacyAttachmentsFromHtml(session.html) : [];
const refs = session ? await collectEzamawiajacyTokenPaths(session) : [];
assert("tokens in HTML", htmlTokens.length > 0 || refs.length > 0);
assert("repository/download path", (refs[0]?.tokenPath || htmlTokens[0]?.tokenPath || "").includes("/repository/download/"));

// T4–T6 — file type downloads
console.log("\nT4–T6 download by content-type");
let gotPdf = false;
let gotDocx = false;
let gotZip = false;
if (session?.cookie && refs.length > 0) {
  const origin = new URL(session.finalUrl).origin;
  for (const ref of refs.slice(0, 12)) {
    const file = await downloadEzamawiajacyToken(origin, ref.tokenPath, session, ref.label);
    if (!file) continue;
    const ct = file.contentType.toLowerCase();
    const fn = file.filename.toLowerCase();
    if (ct.includes("pdf") || fn.endsWith(".pdf")) gotPdf = true;
    if (ct.includes("word") || fn.endsWith(".docx") || fn.endsWith(".doc")) gotDocx = true;
    if (ct.includes("zip") || fn.endsWith(".zip")) gotZip = true;
  }
}
assert("PDF download", gotPdf);
assert("DOCX/DOC download", gotDocx);
assert("ZIP download (optional if absent on page)", gotZip || refs.length <= 3);

// T7 — brak dokumentów → brak crash
console.log("\nT7 empty / no docs — no crash");
let t7ok = true;
try {
  const empty = await fetchEzamawiajacyDocuments("<p>brak linków</p>");
  assert("empty notice → []", Array.isArray(empty) && empty.length === 0);
} catch {
  t7ok = false;
  assert("empty notice → no throw", false);
}
if (t7ok) assert("empty notice → no throw", true);

// T8 — nieznany tenant
console.log("\nT8 unknown tenant — no crash");
let t8ok = true;
try {
  const unknownSession = await openEzamawiajacyPageSession(UNKNOWN_TENANT);
  const unknownDocs = await fetchEzamawiajacyDocuments(
    `<a href="${UNKNOWN_TENANT}">x</a>`,
  );
  assert("unknown session null or empty docs", !unknownSession || unknownDocs.length === 0);
} catch {
  t8ok = false;
  assert("unknown tenant no throw", false);
}
if (t8ok) assert("unknown tenant no throw", true);

// T9 — Logintrade regression
console.log("\nT9 Logintrade regression");
const ltHtml =
  '<a href="https://zzk-wroc.logintrade.net/zapytania_email,231899,abc.html">LT</a>';
assert("logintrade host detected", detectOffPlatformHosts(ltHtml).includes("logintrade"));
assert("ezamawiajacy priority before logintrade when both",
  detectOffPlatformHosts(`${SAMPLE_NOTICE} ${ltHtml}`)[0] === "ezamawiajacy");
const ltPages = extractLogintradePageUrls(ltHtml);
assert("logintrade page url", ltPages.length === 1);
assert("LOGINTRADE_ATTACHMENT_RE intact", LOGINTRADE_ATTACHMENT_RE.test("DocumentService,getAttachmentUnlogged,abc"));

// T10 — workspace / platform awareness regression
console.log("\nT10 Dokumenty workspace regression");
const mockItem = {
  id: "t1",
  bzpNumber: "x",
  noticeNumber: "x",
  title: "test",
  organizationName: "WM",
  organizationCity: "Wrocław",
  organizationProvince: "dolnośląskie",
  cpvCode: "",
  publicationDate: "",
  submittingOffersDate: null,
  orderType: "",
  tenderId: "tid",
  moIdentifier: "",
  status: "new",
  notes: "",
  relevanceScore: 0,
  matchedKeywords: [],
  isWroclaw: true,
  priorityBuyerId: "wm",
  priorityBuyerLabel: "WM",
  addedAt: "",
  updatedAt: "",
  ezamowieniaUrl: "",
  noticeHtml: SAMPLE_NOTICE,
  bzpDocuments: [{
    index: 1,
    documentId: "ezamawiajacy_1",
    filename: "swz.pdf",
    contentType: "application/pdf",
    downloadUrl: "https://wroclawskiemieszkania.ezamawiajacy.pl/repository/download/x",
    isSwzHint: true,
    platform: "ezamawiajacy",
    sourcePageUrl: WM_PAGE,
  }],
  documentsFetchedAt: new Date().toISOString(),
};
const status = resolveTenderPlatformDocumentStatus(mockItem);
assert("platform ezamawiajacy success", status.missingReason === "found_ezamawiajacy");
assert("sourcePageUrl in resolve", Boolean(
  resolveTenderDocumentDownload(mockItem.bzpDocuments, 1)?.sourcePageUrl,
));

// Integration probe
console.log("\nIntegration fetchEzamawiajacyDocuments");
const discovered = await fetchEzamawiajacyDocuments(SAMPLE_NOTICE);
assert("discovered >= 1 doc", discovered.length >= 1);
assert("platform field", discovered.every((d) => d.platform === "ezamawiajacy"));
assert("sourcePageUrl set", discovered.every((d) => d.sourcePageUrl?.includes("ezamawiajacy")));

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
