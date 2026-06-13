/**
 * P0 hotfix 2.55.2 — double ZIP unpack fix (Marketplanet dossier)
 * npx vite-node scripts/smoke-test-ezamawiajacy-p2h2-double-unpack.mjs
 */
import { readFileSync } from "node:fs";

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  };
}
import {
  fetchEzamawiajacyDocuments,
  fetchEzamawiajacyDocumentByIndex,
} from "../src/lib/tender-ezamawiajacy.ts";
import {
  loadTenderBzpDocumentBytesResolved,
  resolveTenderDocumentDownload,
} from "../src/lib/tenders-bzp.ts";
import {
  detectOffPlatformHosts,
  extractLogintradePageUrls,
  LOGINTRADE_ATTACHMENT_RE,
} from "../src/lib/tender-platform-adapters.ts";

const WM_PAGE =
  "https://wroclawskiemieszkania.ezamawiajacy.pl/pn/WROCMIE/demand/291006/notice/public/details";
const WM_TENDER_ID = "291006";
const NOTICE = `<a href="${WM_PAGE}">WM</a>`;
const ZZK_HTML =
  '<a href="https://zzk-wroc.logintrade.net/zapytania_email,231899,abc.html">ZZK pustostany</a>';

const JSZIP_ERR = "Can't find end of central directory";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

function isZip(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function zipDocs(docs) {
  return docs.filter((d) => /\.zip$/i.test(d.filename) || /zip/i.test(d.contentType ?? ""));
}

console.log("=== P0 HOTFIX 2.55.2 — DOUBLE ZIP UNPACK ===\n");

console.log("Setup — fetchEzamawiajacyDocuments (WM TP190)");
const discovered = await fetchEzamawiajacyDocuments(NOTICE);
assert("discovered >= 1", discovered.length >= 1);
const docs = discovered.map((d) => ({ ...d }));
const zips = zipDocs(docs);
const zip3 = zips.find((d) => /nr\s*3/i.test(d.filename)) ?? zips[0];
const zip4 = zips.find((d) => /nr\s*4/i.test(d.filename)) ?? zips[zips.length - 1];

console.log("\nStatic — single unpack in parseTenderDocumentCandidate");
const resolverSrc = readFileSync("src/lib/tender-document-resolver.ts", "utf8");
const fnMatch = resolverSrc.match(
  /export async function parseTenderDocumentCandidate[\s\S]*?^}/m,
);
const fnBody = fnMatch?.[0] ?? "";
assert("no resolveDocumentBytes in candidate parser", !fnBody.includes("resolveDocumentBytes"));
assert("uses readZipEntry for inner path", fnBody.includes("readZipEntry"));
assert("pickBestFromZipBytes uses outerBytes only", fnBody.includes("pickBestFromZipBytes(outerBytes"));
assert("no second unpack on inner bytes", !fnBody.includes("pickBestFromZipBytes(bytes,"));
assert("filterOuterZipWhenInnerExists present", resolverSrc.includes("filterOuterZipWhenInnerExists"));

async function testOuterZipCandidate(label, zipDoc) {
  if (!zipDoc) {
    assert(`${label} — zip doc found`, false);
    return;
  }
  const { buildTenderDocCandidates, parseTenderDocumentCandidate } = await import(
    "../src/lib/tender-document-resolver.ts"
  );
  const candidates = await buildTenderDocCandidates(WM_TENDER_ID, docs);
  const outer = candidates.find(
    (c) => c.documentIndex === zipDoc.index && !c.zipInnerPath && /\.zip$/i.test(c.filename),
  );
  assert(`${label} — outer candidate exists`, Boolean(outer));
  if (!outer) return;

  let errMsg = "";
  try {
    await parseTenderDocumentCandidate(WM_TENDER_ID, outer, docs);
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
  }
  assert(`${label} — no JSZip central directory error`, !errMsg.includes(JSZIP_ERR));
  if (errMsg) console.log(`    unexpected error: ${errMsg.slice(0, 120)}`);
}

console.log("\nT1 TP190 Zał. nr 4 do SWZ.zip");
await testOuterZipCandidate("T1 Zał. nr 4", zip4);

console.log("\nT2 TP190 Zał. nr 3 do SWZ.zip");
await testOuterZipCandidate("T2 Zał. nr 3", zip3);

console.log("\nT3 ZipInnerList path (listZipFiles via Resolved)");
if (zip4) {
  const { listZipFiles } = await import("../src/lib/tenders-bzp-doc-parse.ts");
  const { bytes } = await loadTenderBzpDocumentBytesResolved(WM_TENDER_ID, zip4.index, docs);
  let listErr = "";
  try {
    const list = await listZipFiles(bytes);
    assert("T3 ZipInnerList — valid PK magic", isZip(bytes));
    assert("T3 ZipInnerList — entries > 0", list.length > 0);
  } catch (e) {
    listErr = e instanceof Error ? e.message : String(e);
    assert("T3 ZipInnerList — no JSZip error", !listErr.includes(JSZIP_ERR));
  }
} else {
  assert("T3 ZipInnerList — zip doc", false);
}

console.log("\nT4 Analiza dossier WM");
let dossierWarnings = [];
try {
  const { parseTenderDossierDocuments } = await import("../src/lib/tender-document-resolver.ts");
  const dossier = await parseTenderDossierDocuments(WM_TENDER_ID, docs);
  dossierWarnings = dossier.warnings ?? [];
  const jszipWarn = dossierWarnings.some((w) => w.includes(JSZIP_ERR));
  assert("T4 dossier completes", true);
  assert("T4 dossier — no JSZip warnings", !jszipWarn);
  if (jszipWarn) console.log(`    warnings: ${dossierWarnings.filter((w) => w.includes("ZIP") || w.includes("central")).join("; ")}`);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  assert("T4 dossier — no throw", !msg.includes(JSZIP_ERR));
}

console.log("\nT5 Analiza SWZ WM");
try {
  const { analyzeTenderSwzEnhanced } = await import("../src/lib/tenders-bzp-analyze-local.ts");
  const { warnings } = await analyzeTenderSwzEnhanced({
    tenderId: WM_TENDER_ID,
    bzpDocuments: docs,
    noticeHtml: NOTICE,
  });
  const jszipWarn = (warnings ?? []).some((w) => w.includes(JSZIP_ERR));
  assert("T5 SWZ analysis — completes", true);
  assert("T5 SWZ — no JSZip warnings", !jszipWarn);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  assert("T5 SWZ — no JSZip throw", !msg.includes(JSZIP_ERR));
}

console.log("\nT6 Podgląd ZIP (outer bytes + listZipFiles)");
if (zip4?.sourcePageUrl) {
  const { listZipFiles } = await import("../src/lib/tenders-bzp-doc-parse.ts");
  const z = await fetchEzamawiajacyDocumentByIndex(zip4.sourcePageUrl, zip4.index);
  let previewErr = "";
  try {
    const entries = await listZipFiles(z.bytes);
    assert("T6 preview ZIP — PK magic", isZip(z.bytes));
    assert("T6 preview ZIP — entries", entries.length > 0);
  } catch (e) {
    previewErr = e instanceof Error ? e.message : String(e);
    assert("T6 preview — no JSZip error", !previewErr.includes(JSZIP_ERR));
  }
} else {
  assert("T6 preview — zip4 found", false);
}

console.log("\nT7 Logintrade regression");
assert("LOGINTRADE_ATTACH_RE intact", LOGINTRADE_ATTACHMENT_RE.test("DocumentService,getAttachmentUnlogged,x"));
assert("logintrade host detect", detectOffPlatformHosts(
  '<a href="https://zzk-wroc.logintrade.net/x">LT</a>',
).includes("logintrade"));
const ltPages = extractLogintradePageUrls(
  '<a href="https://zzk-wroc.logintrade.net/zapytania_email,231899,abc.html">LT</a>',
);
assert("logintrade page extract", ltPages.length === 1);

console.log("\nT8 ZZK przetarg pustostanowy");
assert("ZZK logintrade host", detectOffPlatformHosts(ZZK_HTML).includes("logintrade"));
assert("ZZK page url", extractLogintradePageUrls(ZZK_HTML).length === 1);
assert("WM resolve still has sourcePageUrl", Boolean(
  zip4 && resolveTenderDocumentDownload(docs, zip4.index)?.sourcePageUrl?.includes("ezamawiajacy"),
));

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
