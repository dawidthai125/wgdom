/**
 * P2-A.1 — smoke: HEAD (legacy) vs GET+cancel (fix) na DownloadDocument e-Zamówienia.
 * Uruchom: npx vite-node scripts/smoke-test-ezamowienia-document-probe-p2a1.mjs
 */
import fs from "node:fs";

const EZAMOWIENIA_FETCH = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "WGDOM/2.37.0 tenders-pipeline",
};

const BASE = "https://ezamowienia.gov.pl/mp-readmodels/api/Tender/DownloadDocument";

function downloadUrl(tenderId, index) {
  const documentId = `${tenderId}_${index}`;
  return `${BASE}/${encodeURIComponent(tenderId)}/${encodeURIComponent(documentId)}`;
}

async function probeHeadLegacy(tenderId) {
  let count = 0;
  for (let i = 1; i <= 25; i++) {
    const res = await fetch(downloadUrl(tenderId, i), { method: "HEAD", headers: EZAMOWIENIA_FETCH });
    if (!res.ok) break;
    count++;
  }
  return count;
}

async function probeGetFixed(tenderId) {
  let count = 0;
  for (let i = 1; i <= 25; i++) {
    const res = await fetch(downloadUrl(tenderId, i), { method: "GET", headers: EZAMOWIENIA_FETCH });
    if (!res.ok) {
      break;
    }
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
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
  const snapPath = "scripts/audit-cloud-archive-snapshot.json";
  if (fs.existsSync(snapPath)) {
    const items = JSON.parse(fs.readFileSync(snapPath, "utf8"))["kw-tenders-pipeline"] || [];
    const fromSnap = items
      .map((i) => i.noticeNumber || (i.bzpNumber ? `${i.bzpNumber}/01` : null))
      .filter(Boolean);
    if (fromSnap.length >= 10) return fromSnap.slice(0, 10);
  }
  return [
    "2026/BZP 00268936/01",
    "2026/BZP 00250354/01",
    "2026/BZP 00256626/01",
    "2026/BZP 00253306/01",
    "2026/BZP 00241590/01",
    "2026/BZP 00254324/01",
    "2026/BZP 00266419/01",
    "2026/BZP 00263730/01",
    "2026/BZP 00268536/01",
    "2026/BZP 00268846/01",
  ];
}

const notices = loadNotices();
const rows = [];
let totalBefore = 0;
let totalAfter = 0;
let fail = 0;

for (const noticeNumber of notices) {
  try {
    const tenderId = await resolveTenderId(noticeNumber);
    const bzpNumber = noticeNumber.replace(/\/\d+$/, "");
    const before = await probeHeadLegacy(tenderId);
    const after = await probeGetFixed(tenderId);
    totalBefore += before;
    totalAfter += after;
    rows.push({ bzpNumber, before, after });
    const mark = after >= before ? "OK" : "REG";
    console.log(`${mark} ${bzpNumber}  HEAD=${before}  GET=${after}`);
    if (after < before) fail++;
    await new Promise((r) => setTimeout(r, 200));
  } catch (e) {
    fail++;
    console.log(`FAIL ${noticeNumber} — ${e.message}`);
  }
}

console.log("\n--- P2-A.1 probe summary ---");
console.log(`Postępowań: ${rows.length}`);
console.log(`Dokumenty HEAD (przed): ${totalBefore}`);
console.log(`Dokumenty GET (po):     ${totalAfter}`);
console.log(`Delta:                  +${totalAfter - totalBefore}`);

const mustPass = rows.find((r) => r.bzpNumber === "2026/BZP 00268936");
if (!mustPass || mustPass.after === 0) {
  console.error("\nFAIL — 2026/BZP 00268936 powinien mieć dokumenty przez GET");
  process.exit(1);
}
if (totalAfter <= totalBefore && totalAfter === 0) {
  console.error("\nFAIL — GET nie wykrył żadnych dokumentów");
  process.exit(1);
}
if (fail > 0) {
  console.error(`\nFAIL — ${fail} błędów/regresji`);
  process.exit(1);
}
console.log("\nPASS — P2-A.1 document probe smoke");
