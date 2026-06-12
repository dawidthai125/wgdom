/**
 * P2-A.3 — smoke: off-platform document discovery (Logintrade getAttachmentUnlogged).
 * Uruchom: npx vite-node scripts/smoke-test-off-platform-document-discovery-p2a3.mjs
 */
import fs from "node:fs";
import {
  detectOffPlatformHosts,
  extractLogintradePageUrls,
  LOGINTRADE_ATTACHMENT_RE,
} from "../src/lib/tender-platform-adapters.ts";

const H = {
  Accept: "text/html,application/json,*/*",
  "User-Agent": "Mozilla/5.0 (compatible; WGDOM/2.51; +https://www.wgdom.fun)",
};

const EZ = { Accept: "application/json", "User-Agent": "WGDOM/2.37.0 tenders-pipeline" };

async function probeReadmodels(tenderId) {
  let count = 0;
  const base = "https://ezamowienia.gov.pl/mp-readmodels/api/Tender/DownloadDocument";
  for (let i = 1; i <= 50; i++) {
    const docId = `${tenderId}_${i}`;
    const url = `${base}/${encodeURIComponent(tenderId)}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, { headers: H });
    if (!res.ok) continue;
    try { await res.body?.cancel(); } catch { /* ignore */ }
    count++;
  }
  return count;
}

async function probeLogintradePage(pageUrl) {
  const html = await fetch(pageUrl, { headers: H }).then((r) => r.text());
  const paths = [...html.matchAll(LOGINTRADE_ATTACHMENT_RE)].map((m) => m[0]);
  const files = [];
  for (const p of paths.slice(0, 20)) {
    const url = new URL(p, pageUrl).href;
    const res = await fetch(url, { headers: H });
    if (!res.ok) continue;
    try { await res.body?.cancel(); } catch { /* ignore */ }
    files.push({
      url,
      filename: res.headers.get("content-disposition") || "",
    });
  }
  return { pageUrl, attachPaths: paths.length, probed: files.length };
}

async function discoverOffPlatform(noticeHtml) {
  const hosts = detectOffPlatformHosts(noticeHtml);
  if (!hosts.includes("logintrade")) return { host: null, count: 0, pages: [] };
  const pages = extractLogintradePageUrls(noticeHtml);
  let total = 0;
  for (const page of pages.slice(0, 2)) {
    const r = await probeLogintradePage(page);
    total += r.probed;
  }
  return { host: "logintrade", count: total, pages };
}

async function fetchNoticeHtml(noticeNumber) {
  const enc = encodeURIComponent(noticeNumber);
  const res = await fetch(
    `https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeHtmlBody?noticeNumber=${enc}`,
    { headers: EZ },
  );
  if (!res.ok) return "";
  const raw = await res.text();
  return raw.startsWith('"') ? JSON.parse(raw) : raw;
}

async function resolveTenderId(noticeNumber) {
  const enc = encodeURIComponent(noticeNumber);
  const res = await fetch(
    `https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeDetails?noticeNumber=${enc}`,
    { headers: EZ },
  );
  if (!res.ok) return null;
  const det = await res.json();
  return det.tenderId;
}

function loadTestCases() {
  const mustNotices = [
    "2026/BZP 00266295/01",
    "2026/BZP 00268936/01",
    "2026/BZP 00268302/01",
    "2026/BZP 00268846/01",
  ];
  const snapPath = "scripts/audit-cloud-archive-snapshot.json";
  let fromSnap = [];
  if (fs.existsSync(snapPath)) {
    const items = JSON.parse(fs.readFileSync(snapPath, "utf8"))["kw-tenders-pipeline"] || [];
    fromSnap = items
      .map((i) => i.noticeNumber || (i.bzpNumber ? `${i.bzpNumber}/01` : null))
      .filter(Boolean);
  }

  const ltPages = [
    "https://tbs-wroclaw.logintrade.net/zapytania_email,232112,18939521710a32cef72a48e825c790a7.html",
    "https://zim-wroc.logintrade.net/zapytania_email,230034,64ddc1f364d1652e97b70c5721c66aad.html",
    "https://zim-wroc.logintrade.net/zapytania_email,229754,7407367272b33c1f53860e85bbbd65f2.html",
    "https://zim-wroc.logintrade.net/zapytania_email,228238,977f6a958c559679b9dca86180611d47.html",
    "https://zim-wroc.logintrade.net/zapytania_email,228132,0a20f0f37c54c351086e8e50eb103080.html",
    "https://zzk-wroc.logintrade.net/zapytania_email,231899,5e7791aba1e6f48b1792538925c7e8f5.html",
    "https://zzk-wroc.logintrade.net/zapytania_email,229220,4eb66d287c22286f7db3423471922c23.html",
    "https://zzk-wroc.logintrade.net/zapytania_email,229415,d30944180391e381c8b00b5e9a82928d.html",
    "https://zzk-wroc.logintrade.net/zapytania_email,227044,04cf3023dd92039d6a5e205dc0c2dd91.html",
    "https://zzk-wroc.logintrade.net/zapytania_email,225783,31859dcd55398e04d100a2d3d4684071.html",
  ];

  return {
    notices: [...new Set([...mustNotices, ...fromSnap])].slice(0, 12),
    ltPages,
  };
}

const { notices, ltPages } = loadTestCases();

let metricsBefore = { docs: 0, withDocs: 0, withoutDocs: 0 };
let metricsAfter = { docs: 0, withDocs: 0, withoutDocs: 0, logintrade: 0, platformazakupowa: 0 };

console.log("=== P2-A.3 OFF-PLATFORM DISCOVERY SMOKE ===\n");

for (const noticeNumber of notices) {
  const tenderId = await resolveTenderId(noticeNumber);
  if (!tenderId) {
    console.log("SKIP (no tenderId):", noticeNumber);
    continue;
  }
  const before = await probeReadmodels(tenderId);
  metricsBefore.docs += before;
  if (before > 0) metricsBefore.withDocs++;
  else metricsBefore.withoutDocs++;

  const html = await fetchNoticeHtml(noticeNumber);
  const off = html ? await discoverOffPlatform(html) : { host: null, count: 0 };
  const after = before + off.count;
  metricsAfter.docs += after;
  if (after > 0) metricsAfter.withDocs++;
  else metricsAfter.withoutDocs++;
  if (off.host === "logintrade" && off.count > 0) metricsAfter.logintrade++;

  const hosts = html ? detectOffPlatformHosts(html) : [];
  if (hosts.includes("platformazakupowa") && after === before) metricsAfter.platformazakupowa++;

  console.log(
    noticeNumber,
    `readmodels=${before}`,
    off.host ? `${off.host}+${off.count}` : "off=0",
    `total=${after}`,
  );
}

console.log("\n=== LOGINTRADE DIRECT PAGES (min 5) ===");
let ltOk = 0;
for (const page of ltPages.slice(0, 10)) {
  const r = await probeLogintradePage(page);
  if (r.probed > 0) ltOk++;
  console.log(r.pageUrl.slice(0, 65), "→", r.attachPaths, "paths,", r.probed, "ok");
}

console.log("\n=== METRICS ===");
console.log("Before:", metricsBefore);
console.log("After:", metricsAfter);
console.log("Logintrade pages with files:", ltOk, "/ 10");

const pass =
  ltOk >= 5
  && metricsAfter.withDocs >= metricsBefore.withDocs
  && metricsAfter.docs > metricsBefore.docs;

console.log("\nVERDICT:", pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
