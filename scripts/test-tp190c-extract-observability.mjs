/**
 * TP190C-2E-B — extractError vs noTextLayer observability.
 * npx vite-node scripts/test-tp190c-extract-observability.mjs
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}

import { loadEnv } from "vite";
import {
  extractPdfText,
  parseDocumentToKosztorys,
} from "../src/lib/tenders-bzp-doc-parse.ts";
import {
  parsePdfPrzedmiarHeuristic,
  PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE,
  PDF_PRZEDMIAR_EXTRACT_ERROR_LINE,
} from "../src/lib/pdf-przedmiar-heuristic.ts";
import { costTypeKosztorysFoundLine } from "../src/lib/tender-cost-discovery.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log("PASS", label); }
  else { fail++; console.log("FAIL", label); }
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

console.log("\n=== T1 — prawdziwy noTextLayer → CASE3, extractError=false ===");
{
  const h = parsePdfPrzedmiarHeuristic("", { noTextLayer: true, extractError: false });
  assert(h.uxCase === 3, "T1 CASE 3");
  assert(h.warnings[0] === PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE, "T1 noTextLayer warning");
  assert(!h.warnings.includes(PDF_PRZEDMIAR_EXTRACT_ERROR_LINE), "T1 no extract error warning");
}

console.log("\n=== T2 — extract failure → extractError=true, noTextLayer=false ===");
{
  const stub = await extractPdfText(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  assert(stub.extractError, "T2 extractError true");
  assert(!stub.noTextLayer, "T2 noTextLayer false");
  const h = parsePdfPrzedmiarHeuristic(stub.text, {
    likelyScan: stub.likelyScan,
    noTextLayer: stub.noTextLayer,
    extractError: stub.extractError,
  });
  assert(h.uxCase === 3, "T2 CASE 3");
}

console.log("\n=== T3 — warning noTextLayer (status line) ===");
{
  const line = costTypeKosztorysFoundLine("pdf_przedmiar", "przedmiar.pdf", {
    pdfCase: 3,
    pdfNoTextLayer: true,
    pdfExtractError: false,
  });
  assert(line === PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE, "T3 status noTextLayer line");
}

console.log("\n=== T4 — warning extractError (status line) ===");
{
  const line = costTypeKosztorysFoundLine("pdf_przedmiar", "przedmiar.pdf", {
    pdfCase: 3,
    pdfNoTextLayer: false,
    pdfExtractError: true,
  });
  assert(line === PDF_PRZEDMIAR_EXTRACT_ERROR_LINE, "T4 status extractError line");
  const h = parsePdfPrzedmiarHeuristic("", { extractError: true });
  assert(h.warnings[0] === PDF_PRZEDMIAR_EXTRACT_ERROR_LINE, "T4 heuristic extractError warning");
}

console.log("\n=== T5 — TP182 tekstowy → brak extractError ===");
{
  const bytes = await loadTp182PdfBytes();
  const extracted = await extractPdfText(bytes);
  assert(!extracted.extractError, "T5 no extractError");
  assert(!extracted.noTextLayer, "T5 no noTextLayer");
}

console.log("\n=== T6 — 3 Maja → brak extractError, CASE1 ===");
{
  const bytes = await load3MajaPdfBytes();
  const extracted = await extractPdfText(bytes);
  assert(!extracted.extractError, "T6 no extractError");
  const kosztorys = await parseDocumentToKosztorys(bytes, "Przedmiar - 3 Maja 5B_9.pdf");
  assert(kosztorys?.pdfPrzedmiarCase === 1, "T6 CASE 1");
  assert(!kosztorys?.pdfPrzedmiarExtractError, "T6 preview extractError false");
}

console.log(`\n=== SUMMARY: ${pass} PASS, ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
