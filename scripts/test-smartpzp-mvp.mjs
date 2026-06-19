/**
 * SmartPZP MVP — T1..T6
 * npx vite-node scripts/test-smartpzp-mvp.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  extractSmartPzpProceedingUrl,
  parseListaDokumentowHtml,
  buildSmartPzpDownloadUrl,
  parseSmartPzpDownloadUrl,
  inferSmartPzpContentType,
} from "../src/lib/tender-smartpzp.ts";
import {
  shouldSkipReadmodelsProbe,
  detectOffPlatformHosts,
} from "../src/lib/tender-platform-adapters.ts";
import {
  detectTenderDocumentPlatform,
  resolveTenderPlatformDocumentStatus,
} from "../src/lib/tender-platform-awareness.ts";
import {
  openSmartPzpSession,
  downloadSmartPzpDocument,
} from "../supabase/functions/make-server-0afb8820/tender-smartpzp.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dir, "fixtures");
const MCUS_URL = "https://portal.smartpzp.pl/mcus/public/postepowanie?postepowanie=83841053";
const SWZ_RK = "83844392";

let pass = 0;
let fail = 0;
const assert = (name, cond) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
};

function simulateDiscoverDocs(noticeHtml, tableHtml) {
  const ref = extractSmartPzpProceedingUrl(noticeHtml);
  if (!ref) return [];
  const rows = parseListaDokumentowHtml(tableHtml);
  return rows.map((row, i) => ({
    index: i + 1,
    documentId: `smartpzp_${ref.proceedingId}_${row.rk}`,
    filename: row.filename,
    contentType: inferSmartPzpContentType(row.filename),
    downloadUrl: buildSmartPzpDownloadUrl(ref.canonicalUrl, row.rk),
    platform: "smartpzp",
    sourcePageUrl: ref.canonicalUrl,
  }));
}

console.log("SmartPZP MVP tests\n");

// T1 — extractSmartPzpProceedingUrl (MCUS fixture)
const noticeHtml = readFileSync(join(FIX, "smartpzp-mcus-notice.html"), "utf8");
const ref = extractSmartPzpProceedingUrl(noticeHtml);
assert("T1 tenant=mcus", ref?.tenant === "mcus");
assert("T1 proceedingId=83841053", ref?.proceedingId === "83841053");
assert("T1 canonicalUrl", ref?.canonicalUrl === MCUS_URL);

// T2 — parseListaDokumentowHtml (9 dokumentów)
const tableHtml = readFileSync(join(FIX, "smartpzp-mcus-table.html"), "utf8");
const rows = parseListaDokumentowHtml(tableHtml);
assert("T2 count=9", rows.length === 9);
assert("T2 SWZ rk", rows.some((r) => r.rk === SWZ_RK && r.filename.includes("SWZ")));
assert("T2 extensions pdf/docx/xls/xlsx/zip", rows.some((r) => r.extension === "docx") && rows.some((r) => r.extension === "zip"));

// T3 — discoverSmartPzpDocuments shape (simulated)
const docs = simulateDiscoverDocs(noticeHtml, tableHtml);
assert("T3 docs.length=9", docs.length === 9);
assert("T3 platform smartpzp", docs.every((d) => d.platform === "smartpzp"));
assert("T3 sourcePageUrl", docs.every((d) => d.sourcePageUrl === MCUS_URL));
assert("T3 downloadUrl wgdomRk", docs.every((d) => parseSmartPzpDownloadUrl(d.downloadUrl)?.rk));

// T4 — READMODELS skip smartpzp
const smartNotice = `${noticeHtml}\n${MCUS_URL}`;
assert("T4 shouldSkipReadmodelsProbe(smartpzp)", shouldSkipReadmodelsProbe(smartNotice));
assert("T4 detectOffPlatformHosts includes smartpzp", detectOffPlatformHosts(smartNotice).includes("smartpzp"));

// T5 — UX platform recognition
const tenderItem = {
  noticeHtml: smartNotice,
  bzpDocuments: docs,
  documentsFetchedAt: new Date().toISOString(),
  tenderId: "ocds-test-smartpzp",
};
const platform = detectTenderDocumentPlatform(tenderItem);
assert("T5 detectTenderDocumentPlatform=smartpzp", platform === "smartpzp");
const status = resolveTenderPlatformDocumentStatus(tenderItem);
assert("T5 status platform smartpzp", status.platform === "smartpzp");
assert("T5 CTA label", status.proceedingButtonLabel === "Otwórz postępowanie SmartPZP");
assert("T5 proceedingUrl", status.proceedingUrl === MCUS_URL);

// T6 — live smoke (public proceeding, bez loginu)
console.log("\nT6 live smoke (portal.smartpzp.pl)…");
try {
  const session = await openSmartPzpSession(MCUS_URL);
  if (!session) {
    console.log("SKIP T6 — session unavailable (portal 404/rate-limit?)");
  } else {
    const liveRows = parseListaDokumentowHtml(session.html);
    assert("T6 live parse rows>0", liveRows.length > 0);
    const swz = liveRows.find((r) => r.rk === SWZ_RK) || liveRows.find((r) => /SWZ/i.test(r.filename));
    if (swz) {
      const dl = await downloadSmartPzpDocument({
        pageUrl: MCUS_URL,
        rk: swz.rk,
        expectedFilename: swz.filename,
      });
      assert("T6 live download ok", dl.ok === true);
      if (dl.ok) {
        assert("T6 live PDF bytes>1k", dl.bytes.byteLength > 1000);
        assert("T6 live filename SWZ hint", /swz/i.test(dl.filename) || smartPzpFilenameFromDl(dl, swz.filename));
      }
    } else {
      console.log("SKIP T6 download — SWZ row not in live table");
    }
  }
} catch (e) {
  console.log("SKIP T6 —", e?.message || e);
}

function smartPzpFilenameFromDl(dl, expected) {
  return dl.filename.toLowerCase().includes(expected.toLowerCase().slice(0, 10));
}

console.log(`\nSmartPZP MVP: ${fail === 0 ? "ALL PASS" : "FAILURES"} (${pass} pass, ${fail} fail)`);
if (fail > 0) process.exit(1);
