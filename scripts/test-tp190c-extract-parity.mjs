/**
 * TP190C-2E-A — extractPdfText Browser/Node parity.
 * npx vite-node scripts/test-tp190c-extract-parity.mjs
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}

import { loadEnv } from "vite";
import {
  extractPdfText,
  extractPdfPageLayoutLines,
  parseDocumentToKosztorys,
} from "../src/lib/tenders-bzp-doc-parse.ts";
import { parsePdfPrzedmiarHeuristic } from "../src/lib/pdf-przedmiar-heuristic.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log("PASS", label); }
  else { fail++; console.log("FAIL", label); }
}

/** Join-only reference (stary smoke TP182) — parity baseline w Node. */
async function extractJoinReference(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  const parts = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(line);
  }
  const text = parts.join("\n");
  return {
    text,
    pageCount: pdf.numPages,
    charCount: text.replace(/\s/g, "").length,
  };
}

async function loadTp182PdfBytes() {
  const { fetchTenderDocuments, fetchTenderZipEntryBytes, base64ToBytes } = await import("../src/lib/tenders-bzp.ts");
  const OCDS = "ocds-148610-83a559be-df3f-4e5f-8935-44ef8bc31e15";
  const NOTICE = "2026/BZP 00296679/01";
  const INNER = "TP182 Zal. nr 3_Opis przedmiotu zamówienia/Zadanie 1/Nowowiejska 86a_27/Nowowiejska 86a_27 - przedmiar.pdf";
  const docs = await fetchTenderDocuments(OCDS, NOTICE);
  const zip = docs.find((d) => d.index === 6);
  if (!zip) throw new Error("TP182 ZIP doc index 6 not found");
  const ent = await fetchTenderZipEntryBytes({
    tenderId: OCDS,
    documentIndex: 6,
    innerPath: INNER,
    downloadUrl: zip.downloadUrl,
    sourcePageUrl: zip.sourcePageUrl,
  });
  return base64ToBytes(ent.base64);
}

async function load3MajaPdfBytes() {
  const ROOT = process.cwd();
  const env = loadEnv("", ROOT, "");
  const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
  const ANON = env.VITE_SUPABASE_ANON_KEY;
  const { fetchTenderDocumentBytes, base64ToBytes, resolveTenderDocumentDownload } = await import("../src/lib/tenders-bzp.ts");
  const { read7zEntry } = await import("../src/lib/tenders-bzp-doc-parse.ts");
  const { buildTenderDocCandidates } = await import("../src/lib/tender-document-resolver.ts");

  const res = await fetch(`${BASE}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-tenders-pipeline"] }),
  });
  const item = (await res.json()).values[0].find((i) => i.bzpNumber === "2026/BZP 00296845");
  if (!item) throw new Error("BZP 00296845 not in KV");
  const cand = (await buildTenderDocCandidates(item.tenderId, item.bzpDocuments))
    .find((c) => /3 Maja 5B_9\.pdf/.test(c.filename));
  const acc = resolveTenderDocumentDownload(item.bzpDocuments, cand.documentIndex);
  const { base64 } = await fetchTenderDocumentBytes(
    item.tenderId,
    cand.documentIndex,
    cand.downloadUrl ?? acc?.downloadUrl,
    acc?.sourcePageUrl,
  );
  return read7zEntry(base64ToBytes(base64), cand.zipInnerPath);
}

console.log("\n=== T1 — TP182 PDF: extractPdfText ~= join reference (Node) ===");
{
  const bytes = await loadTp182PdfBytes();
  const extracted = await extractPdfText(bytes);
  const reference = await extractJoinReference(bytes);
  const ratio = extracted.text.replace(/\s/g, "").length / Math.max(1, reference.charCount);
  assert(extracted.pageCount > 0, "T1 pageCount > 0");
  assert(!extracted.noTextLayer, "T1 noTextLayer false");
  assert(ratio >= 0.85, `T1 char parity >= 85% (${(ratio * 100).toFixed(1)}%)`);
}

console.log("\n=== T2 — 3 Maja: nie CASE 3 przy poprawnym extract ===");
{
  const bytes = await load3MajaPdfBytes();
  const extracted = await extractPdfText(bytes);
  const heuristic = parsePdfPrzedmiarHeuristic(extracted.text, {
    likelyScan: extracted.likelyScan,
    noTextLayer: extracted.noTextLayer,
  });
  assert(extracted.pageCount >= 10, "T2 pageCount >= 10");
  assert(!extracted.noTextLayer, "T2 noTextLayer false");
  assert(heuristic.uxCase !== 3, "T2 not CASE 3");
  assert(heuristic.uxCase === 1, "T2 CASE 1");
}

console.log("\n=== T3 — 3 Maja: rows > 0 via parseDocumentToKosztorys ===");
{
  const bytes = await load3MajaPdfBytes();
  const kosztorys = await parseDocumentToKosztorys(bytes, "Przedmiar - 3 Maja 5B_9.pdf");
  assert((kosztorys?.rows?.length ?? 0) >= 120, `T3 rows >= 120 (got ${kosztorys?.rows?.length ?? 0})`);
  assert(kosztorys?.pdfPrzedmiarCase === 1, "T3 pdfPrzedmiarCase 1");
}

console.log("\n=== T4 — join fallback gdy layout pusty, tokeny są ===");
{
  const bytes = await loadTp182PdfBytes();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const layoutLines = extractPdfPageLayoutLines(content.items);
  const joinLine = content.items.map((it) => ("str" in it ? it.str : "")).join(" ").trim();
  assert(layoutLines.length > 0 || joinLine.length > 8, "T4 fixture has extractable tokens");
  const extracted = await extractPdfText(bytes);
  assert(extracted.text.replace(/\s/g, "").length > 1000, "T4 extractPdfText returns substantial text");
}

console.log("\n=== T5 — nie-PDF stub: extractError (nie fałszywy noTextLayer) ===");
{
  const empty = await extractPdfText(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // "%PDF" stub
  assert(empty.extractError, "T5 invalid/stub PDF → extractError");
  assert(!empty.noTextLayer, "T5 stub → noTextLayer false");
  assert(empty.text.length === 0, "T5 empty text");
  const h = parsePdfPrzedmiarHeuristic(empty.text, {
    likelyScan: empty.likelyScan,
    noTextLayer: empty.noTextLayer,
    extractError: empty.extractError,
  });
  assert(h.uxCase === 3, "T5 heuristic CASE 3 for extract failure");
}

console.log(`\n=== SUMMARY: ${pass} PASS, ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
