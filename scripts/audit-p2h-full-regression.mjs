/**
 * READ ONLY — Post P2-H full regression audit (prod KV + live probes)
 * npx vite-node scripts/audit-p2h-full-regression.mjs
 */
import { writeFileSync } from "node:fs";
import { loadEnv } from "vite";
import { list7zFiles, read7zEntry } from "../src/lib/wgdom-7z-archive.ts";
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
  isPdfPrzedmiarCostFilename,
} from "../src/lib/tender-cost-discovery.ts";
import {
  parsePdfPrzedmiarHeuristic,
} from "../src/lib/pdf-przedmiar-heuristic.ts";
import { scoreTenderFilename, is7zFilename, isZipFilename } from "../src/lib/tenders-bzp-filename.ts";
import {
  STRATEGIC_CLIENT_FILTERS,
  matchesStrategicClientFilter,
} from "../src/lib/tenders-strategic-client-filters.ts";

async function loadDocParse() {
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {
      constructor() {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      }
    };
  }
  return import("../src/lib/tenders-bzp-doc-parse.ts");
}

const env = loadEnv("", process.cwd(), "");
const PROJECT = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SLUG = env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
const BASE = `https://${PROJECT}.supabase.co/functions/v1/${SLUG}`;

const EXTRA_CLIENT_PATTERNS = [
  { id: "KATY", re: /kąty\s+wrocławskie|umig\s+kąty/i },
];

const KEY_CLIENT_IDS = [
  ...STRATEGIC_CLIENT_FILTERS.map((f) => f.shortLabel),
  ...EXTRA_CLIENT_PATTERNS.map((x) => x.id),
];

const KATY_TENDER_ID = "ocds-148610-4ae89f77-4442-4aae-9e7e-6cd048af333e";
const KATY_NOTICE = "2026/BZP 00268570/01";

function bucketItem(item) {
  for (const f of STRATEGIC_CLIENT_FILTERS) {
    if (matchesStrategicClientFilter(item, f.id)) return f.shortLabel;
  }
  const hay = `${item.client ?? ""} ${item.organizationName ?? ""} ${item.title ?? ""}`;
  for (const c of EXTRA_CLIENT_PATTERNS) {
    if (c.re.test(hay)) return c.id;
  }
  return "OTHER";
}

function costFamily(type) {
  if (!type || type === "none") return "none";
  if (/^zip_/.test(type)) return type.replace("zip_", "");
  return type;
}

function pdfCaseLabel(c) {
  if (c === 1) return "CASE1_rows";
  if (c === 2) return "CASE2_no_rows";
  if (c === 3) return "CASE3_scan";
  return "n/a";
}

async function apiGet(path, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${q ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${ANON}`, apikey: ANON } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function fetchDocBytes(tenderId, doc, noticeNumber) {
  const params = {
    tenderId,
    documentIndex: String(doc.index),
    ...(doc.downloadUrl ? { downloadUrl: doc.downloadUrl } : {}),
    ...(doc.sourcePageUrl ? { sourcePageUrl: doc.sourcePageUrl } : {}),
    ...(noticeNumber ? { noticeNumber } : {}),
  };
  const { status, json } = await apiGet("/tenders-bzp-document-bytes", params);
  if (!json.ok || !json.base64) return null;
  return Uint8Array.from(atob(json.base64), (c) => c.charCodeAt(0));
}

async function buildLiveCandidates(tenderId, docs, noticeNumber) {
  const { listZipFiles } = await loadDocParse();
  const candidates = [];
  const innerMeta = [];
  for (const doc of docs) {
    const baseScore = scoreTenderFilename(doc.filename) + (doc.isSwzHint ? 18 : 0);
    candidates.push({
      documentIndex: doc.index,
      filename: doc.filename,
      score: baseScore,
    });
    if (isZipFilename(doc.filename) || is7zFilename(doc.filename)) {
      const bytes = await fetchDocBytes(tenderId, doc, noticeNumber);
      if (!bytes || bytes.byteLength < 80) continue;
      try {
        const inner = is7zFilename(doc.filename)
          ? await list7zFiles(bytes)
          : await listZipFiles(bytes);
        for (const entry of inner.slice(0, 20)) {
          const innerName = `${doc.filename} → ${entry.filename}`;
          candidates.push({
            documentIndex: doc.index,
            filename: innerName,
            zipInnerPath: entry.path,
            score: entry.score + (doc.isSwzHint ? 10 : 0),
          });
          innerMeta.push({ outer: doc.filename, inner: entry.filename, path: entry.path, score: entry.score });
        }
      } catch (e) {
        innerMeta.push({ outer: doc.filename, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { candidates, innerMeta };
}

function analyzeKvItem(item) {
  const docs = item.bzpDocuments ?? [];
  const dossier = item.tenderDossier;
  const scan = dossier?.scanSummary;
  const k = dossier?.kosztorys;
  const docStats = {
    total: docs.length,
    zip: docs.filter((d) => /\.zip$/i.test(d.filename)).length,
    sevenZ: docs.filter((d) => /\.7z$/i.test(d.filename)).length,
    ath: docs.filter((d) => /\.(ath|nor|xml)$/i.test(d.filename)).length,
    xls: docs.filter((d) => /\.xlsx?$/i.test(d.filename)).length,
    pdf: docs.filter((d) => /\.pdf$/i.test(d.filename)).length,
  };
  const outerCandidates = docs.map((d) => ({
    filename: d.filename,
    score: scoreTenderFilename(d.filename) + (d.isSwzHint ? 18 : 0),
  }));
  const simDiscovery = discoverBestCostDocument(outerCandidates);
  const storedDiscovery = scan?.costDiscovery ?? null;
  return {
    id: item.id,
    title: (item.title ?? "").slice(0, 80),
    client: bucketItem(item),
    docStats,
    hasDossier: Boolean(dossier),
    dossierParsedAt: scan?.parsedAt ?? k?.parsedAt ?? null,
    storedDiscovery: storedDiscovery
      ? { found: storedDiscovery.found, type: storedDiscovery.type, source: storedDiscovery.source, confidence: storedDiscovery.confidence }
      : null,
    simDiscoveryOuterOnly: {
      found: simDiscovery.found,
      type: simDiscovery.type,
      source: simDiscovery.source,
      confidence: simDiscovery.confidence,
    },
    kosztorysFound: Boolean(scan?.kosztorysFound ?? k?.ok),
    rowCount: k?.rowCount ?? 0,
    sourceFilename: k?.sourceFilename ?? storedDiscovery?.source ?? null,
    pdfPrzedmiarCase: scan?.pdfPrzedmiarCase ?? k?.pdfPrzedmiarCase ?? null,
    sevenZUnpackOk: scan?.sevenZUnpackOk,
    sevenZInnerCount: scan?.sevenZInnerCount,
  };
}

function countKnrLinesInText(text) {
  const lines = text.split(/\n/);
  let n = 0;
  for (const line of lines) {
    if (/\b(?:KNR|KNNR|KSNR)\b/i.test(line) && /\b(m2|m²|m3|mb|kpl|szt|t|kg|rbh)\b/i.test(line)) n += 1;
  }
  return n;
}

async function liveProbeTender(item, opts = {}) {
  const tenderId = item.id;
  const notice = item.noticeNumber ?? item.bzpNoticeNumber;
  let docs = item.bzpDocuments ?? [];
  if (!docs.length && tenderId) {
    const dr = await apiGet("/tenders-bzp-documents", { tenderId, noticeNumber: notice ?? "" });
    docs = (dr.json.documents ?? []).map((d, i) => ({
      index: d.index ?? i + 1,
      filename: d.filename ?? d.name,
      downloadUrl: d.downloadUrl,
      sourcePageUrl: d.sourcePageUrl,
      isSwzHint: d.isSwzHint,
    }));
  }
  const { candidates, innerMeta } = await buildLiveCandidates(tenderId, docs, notice);
  const discovery = discoverBestCostDocument(candidates);
  const result = {
    id: tenderId,
    title: (item.title ?? "").slice(0, 80),
    client: bucketItem(item),
    docCount: docs.length,
    innerListed: innerMeta.length,
    discovery: {
      found: discovery.found,
      type: discovery.type,
      source: discovery.source,
      confidence: discovery.confidence,
    },
    parse: null,
    pdfCompare: null,
    innerMeta: innerMeta.slice(0, 12),
  };

  if (!discovery.found || !opts.parseBest) return result;

  const { extractPdfText, readZipEntry, parseXlsxToKosztorys } = await loadDocParse();
  const { parseKosztorysBytes } = await import("../src/lib/ath-parser.ts");

  const match = candidates.find((c) => c.filename === discovery.source);
  if (!match) return result;

  const outerDoc = docs.find((d) => d.index === match.documentIndex);
  if (!outerDoc) return result;

  const outerBytes = await fetchDocBytes(tenderId, outerDoc, notice);
  if (!outerBytes) return result;

  let bytes = outerBytes;
  let effectiveName = match.filename.split(" → ").pop() ?? match.filename;
  if (match.zipInnerPath) {
    if (is7zFilename(outerDoc.filename)) {
      bytes = (await read7zEntry(outerBytes, match.zipInnerPath)) ?? outerBytes;
    } else {
      bytes = (await readZipEntry(outerBytes, match.zipInnerPath)) ?? outerBytes;
    }
    effectiveName = match.filename.split(" → ").pop() ?? effectiveName;
  }

  if (isPdfPrzedmiarCostFilename(effectiveName) || /\.pdf$/i.test(effectiveName)) {
    const { text, likelyScan } = await extractPdfText(bytes);
    const parsed = parsePdfPrzedmiarHeuristic(text, { likelyScan });
    const sourceKnrLines = countKnrLinesInText(text);
    const wgdomRows = parsed.rows.length;
    const agreement = sourceKnrLines > 0
      ? Math.round((Math.min(wgdomRows, sourceKnrLines) / sourceKnrLines) * 100)
      : (wgdomRows > 0 ? 100 : 0);
    result.parse = {
      kind: "pdf",
      uxCase: parsed.uxCase,
      signals: parsed.signals,
      rowCount: wgdomRows,
      likelyScan,
    };
    result.pdfCompare = {
      sourceKnrLines,
      wgdomRows,
      agreementPct: agreement,
      sampleRows: parsed.rows.slice(0, 3).map((r) => ({ code: r.code, qty: r.quantity, unit: r.unit })),
    };
  } else if (/\.xlsx?$/i.test(effectiveName)) {
    const preview = parseXlsxToKosztorys(bytes, effectiveName);
    result.parse = { kind: "xls", rowCount: preview.rows.length, ok: preview.ok };
  } else if (/\.(ath|nor|xml)$/i.test(effectiveName)) {
    const preview = await parseKosztorysBytes(bytes, effectiveName);
    result.parse = { kind: "ath", rowCount: preview.rows.length, ok: preview.ok };
  }

  return result;
}

// --- MAIN ---
console.log("=== POST P2-H FULL REGRESSION AUDIT (READ ONLY) ===");
console.log("Baseline: prod v2.55.9 · commit 75a500e\n");

const kvRes = await fetch(`${BASE}/batch-get`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ keys: ["kw-tenders-pipeline"] }),
});
const kvJson = await kvRes.json();
const raw = kvJson.values?.[0];
const items = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
console.log("KV pipeline items:", items.length);

const kvRows = items.map(analyzeKvItem);
const withDossier = kvRows.filter((r) => r.hasDossier);
const withKosztorys = kvRows.filter((r) => r.kosztorysFound);

const rates = {
  ath: { total: 0, success: 0 },
  xls: { total: 0, success: 0 },
  pdf: { total: 0, success: 0, case1: 0, case2: 0, case3: 0 },
  zip: { total: 0, discovery: 0 },
  sevenZ: { total: 0, discovery: 0, unpackOk: 0 },
};

for (const r of kvRows) {
  const t = r.storedDiscovery?.type ?? r.simDiscoveryOuterOnly.type;
  const fam = costFamily(t);
  if (r.docStats.ath > 0 || fam === "ath" || fam === "nor" || fam === "xml") {
    rates.ath.total += 1;
    if (r.kosztorysFound && r.rowCount > 0) rates.ath.success += 1;
  }
  if (r.docStats.xls > 0 || fam === "xls" || fam === "xlsx") {
    rates.xls.total += 1;
    if (r.kosztorysFound && r.rowCount > 0) rates.xls.success += 1;
  }
  if (fam === "pdf_przedmiar" || fam === "zip_pdf_przedmiar" || r.pdfPrzedmiarCase) {
    rates.pdf.total += 1;
    if (r.kosztorysFound) rates.pdf.success += 1;
    if (r.pdfPrzedmiarCase === 1) rates.pdf.case1 += 1;
    if (r.pdfPrzedmiarCase === 2) rates.pdf.case2 += 1;
    if (r.pdfPrzedmiarCase === 3) rates.pdf.case3 += 1;
  }
  if (r.docStats.zip > 0) {
    rates.zip.total += 1;
    if (r.storedDiscovery?.found && /zip_/.test(r.storedDiscovery.type)) rates.zip.discovery += 1;
  }
  if (r.docStats.sevenZ > 0) {
    rates.sevenZ.total += 1;
    if (r.sevenZUnpackOk) rates.sevenZ.unpackOk += 1;
    if (r.storedDiscovery?.found && /zip_/.test(r.storedDiscovery.type)) rates.sevenZ.discovery += 1;
  }
}

// Key clients summary
console.log("\n--- KEY CLIENTS (KV dossier state) ---");
for (const cid of KEY_CLIENT_IDS) {
  const subset = kvRows.filter((r) => r.client === cid);
  const d = subset.filter((r) => r.hasDossier);
  const k = subset.filter((r) => r.kosztorysFound);
  console.log(`${cid}: tenders=${subset.length} dossier=${d.length} kosztorysOk=${k.length}`);
  for (const r of subset.filter((x) => x.hasDossier).slice(0, 5)) {
    console.log(`  · ${r.title}`);
    console.log(`    docs Z:${r.docStats.zip} 7Z:${r.docStats.sevenZ} ATH:${r.docStats.ath} XLS:${r.docStats.xls} PDF:${r.docStats.pdf}`);
    console.log(`    discovery: ${r.storedDiscovery?.type ?? "—"} found=${r.storedDiscovery?.found ?? false}`);
    console.log(`    rows=${r.rowCount} pdfCase=${pdfCaseLabel(r.pdfPrzedmiarCase)} parsedAt=${r.dossierParsedAt ?? "—"}`);
  }
}

// Random sample with dossier (15)
const samplePool = kvRows.filter((r) => r.hasDossier && r.docStats.total > 0);
const sample = [...samplePool]
  .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""))
  .filter((_, i) => i % Math.max(1, Math.floor(samplePool.length / 15)) === 0)
  .slice(0, 15);

console.log("\n--- SAMPLE TABLE (KV stored dossier, 15 tenders) ---");
console.log("Przetarg | Typ | Dokument | Pozycje WGDOM | pdfCase | Zgodność");
for (const r of sample) {
  const typ = costFamily(r.storedDiscovery?.type ?? "none");
  const doc = (r.sourceFilename ?? r.storedDiscovery?.source ?? "—").slice(0, 50);
  console.log(`${r.title.slice(0, 40)} | ${typ} | ${doc} | ${r.rowCount} | ${pdfCaseLabel(r.pdfPrzedmiarCase)} | KV-only`);
}

// Live probes: Kąty + up to 8 from key clients with 7Z/ZIP/PDF
console.log("\n--- LIVE PROBES (fresh discovery + parse) ---");
const katyItem = items.find((i) => i.id === KATY_TENDER_ID)
  ?? items.find((i) => bucketItem(i) === "KATY" && /toalet/i.test(i.title ?? ""));
const liveTargets = [];
if (katyItem) liveTargets.push({ item: katyItem, label: "KATY_MANDATORY" });
for (const cid of KEY_CLIENT_IDS.filter((x) => x !== "KATY")) {
  const picks = items
    .filter((i) => bucketItem(i) === cid && (i.bzpDocuments?.length ?? 0) > 0)
    .slice(0, 2);
  for (const p of picks) liveTargets.push({ item: p, label: cid });
}
// dedupe
const seen = new Set();
const uniqueLive = liveTargets.filter((t) => {
  if (seen.has(t.item.id)) return false;
  seen.add(t.item.id);
  return true;
});

const liveResults = [];
for (const { item, label } of uniqueLive.slice(0, 10)) {
  console.log(`\nProbe [${label}]: ${(item.title ?? "").slice(0, 70)}`);
  try {
    const lr = await liveProbeTender(item, { parseBest: true });
    liveResults.push({ label, ...lr });
    console.log(`  docs=${lr.docCount} innerListed=${lr.innerListed}`);
    console.log(`  discovery: found=${lr.discovery.found} type=${lr.discovery.type}`);
    console.log(`  source: ${lr.discovery.source?.slice(0, 70) ?? "—"}`);
    if (lr.parse) console.log(`  parse: ${JSON.stringify(lr.parse)}`);
    if (lr.pdfCompare) {
      console.log(`  PDF compare: sourceKnrLines=${lr.pdfCompare.sourceKnrLines} wgdomRows=${lr.pdfCompare.wgdomRows} agreement=${lr.pdfCompare.agreementPct}%`);
    }
    const kv = analyzeKvItem(item);
    if (kv.rowCount !== (lr.parse?.rowCount ?? -1) && lr.parse?.kind === "pdf") {
      console.log(`  ⚠ KV stale? KV rows=${kv.rowCount} vs live=${lr.parse.rowCount} pdfCase KV=${pdfCaseLabel(kv.pdfPrzedmiarCase)}`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e instanceof Error ? e.message : e}`);
    liveResults.push({ label, id: item.id, error: String(e) });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  baseline: { version: "2.55.9", commit: "75a500e" },
  kv: { total: items.length, withDossier: withDossier.length, withKosztorys: withKosztorys.length, rates },
  keyClients: KEY_CLIENT_IDS.map((cid) => ({
    id: cid,
    rows: kvRows.filter((r) => r.client === cid),
  })),
  sample,
  liveResults,
};

writeFileSync("scripts/audit-p2h-full-regression-output.json", JSON.stringify(report, null, 2));
console.log("\n=== RATES (KV tenders with matching doc types) ===");
for (const [k, v] of Object.entries(rates)) {
  console.log(k, JSON.stringify(v));
}
console.log("\nReport: scripts/audit-p2h-full-regression-output.json");
