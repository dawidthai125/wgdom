/**
 * P2-A.2 — smoke: gap-tolerant readmodels probe + discoverMpClientDocuments metrics.
 * Uruchom: npx vite-node scripts/smoke-test-mp-client-document-discovery-p2a2.mjs
 */
import fs from "node:fs";

const EZAMOWIENIA_FETCH = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "WGDOM/2.37.0 tenders-pipeline",
};

const BASE = "https://ezamowienia.gov.pl/mp-readmodels/api/Tender/DownloadDocument";

async function probeLegacyBreakOnGap(tenderId) {
  let count = 0;
  for (let i = 1; i <= 25; i++) {
    const docId = `${tenderId}_${i}`;
    const url = `${BASE}/${encodeURIComponent(tenderId)}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, { headers: EZAMOWIENIA_FETCH });
    if (!res.ok) break;
    try { await res.body?.cancel(); } catch { /* ignore */ }
    count++;
  }
  return count;
}

async function probeGapTolerant(tenderId) {
  let count = 0;
  for (let i = 1; i <= 50; i++) {
    const docId = `${tenderId}_${i}`;
    const url = `${BASE}/${encodeURIComponent(tenderId)}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, { headers: EZAMOWIENIA_FETCH });
    if (!res.ok) continue;
    try { await res.body?.cancel(); } catch { /* ignore */ }
    count++;
  }
  return count;
}

async function resolveTenderId(noticeNumber) {
  const enc = encodeURIComponent(noticeNumber);
  const res = await fetch(
    `https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeDetails?noticeNumber=${enc}`,
    { headers: EZAMOWIENIA_FETCH },
  );
  if (!res.ok) throw new Error(`GetNoticeDetails ${noticeNumber} → ${res.status}`);
  const det = await res.json();
  return det.tenderId;
}

function loadNotices() {
  const must = [
    "2026/BZP 00266295/01",
    "2026/BZP 00268936/01",
    "2026/BZP 00268302/01",
    "2026/BZP 00268846/01",
  ];
  const snapPath = "scripts/audit-cloud-archive-snapshot.json";
  if (fs.existsSync(snapPath)) {
    const items = JSON.parse(fs.readFileSync(snapPath, "utf8"))["kw-tenders-pipeline"] || [];
    const fromSnap = items
      .map((i) => i.noticeNumber || (i.bzpNumber ? `${i.bzpNumber}/01` : null))
      .filter(Boolean);
    return [...new Set([...must, ...fromSnap])].slice(0, 10);
  }
  return must;
}

const gapTender = "ocds-148610-914f168b-bbbc-40ee-b520-9024ed293991";
const gapBefore = await probeLegacyBreakOnGap(gapTender);
const gapAfter = await probeGapTolerant(gapTender);
console.log(`Gap regression tender: before=${gapBefore} after=${gapAfter} (expect after>before)`);

const notices = loadNotices();
let totalBefore = 0;
let totalAfter = 0;
let withDocsBefore = 0;
let withDocsAfter = 0;

for (const noticeNumber of notices) {
  const tenderId = await resolveTenderId(noticeNumber);
  const bzpNumber = noticeNumber.replace(/\/\d+$/, "");
  const before = await probeLegacyBreakOnGap(tenderId);
  const after = await probeGapTolerant(tenderId);
  totalBefore += before;
  totalAfter += after;
  if (before > 0) withDocsBefore++;
  if (after > 0) withDocsAfter++;
  console.log(`${bzpNumber}  legacy=${before}  gapTolerant=${after}`);
  await new Promise((r) => setTimeout(r, 150));
}

console.log("\n--- P2-A.2 summary ---");
console.log(`Postępowań: ${notices.length}`);
console.log(`Dokumenty legacy (break on gap): ${totalBefore}`);
console.log(`Dokumenty gap-tolerant (1-50):   ${totalAfter}`);
console.log(`Przetargi z dokumentami — przed: ${withDocsBefore}/${notices.length}`);
console.log(`Przetargi z dokumentami — po:    ${withDocsAfter}/${notices.length}`);

if (gapAfter <= gapBefore) {
  console.error("\nFAIL — gap-tolerant probe should beat legacy on gap tender");
  process.exit(1);
}
if (totalAfter < totalBefore) {
  console.error("\nFAIL — regression vs legacy totals");
  process.exit(1);
}
console.log("\nPASS — P2-A.2 mp-client/readmodels discovery smoke");
