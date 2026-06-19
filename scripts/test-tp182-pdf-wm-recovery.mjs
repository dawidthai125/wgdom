/**
 * P0 WM PDF Recovery — TP182 live fixture.
 * npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}
const { fetchTenderDocuments, fetchTenderZipEntryBytes, base64ToBytes } = await import("../src/lib/tenders-bzp.ts");
const { extractPdfPrzedmiarRows, parsePdfPrzedmiarHeuristic } = await import("../src/lib/pdf-przedmiar-heuristic.ts");

/** Node smoke — legacy pdf.js (jak audit TP182). */
async function extractPdfTextLegacy(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  const parts = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(line);
  }
  const text = parts.join("\n");
  const charCount = text.replace(/\s/g, "").length;
  return {
    text,
    pageCount: pdf.numPages,
    likelyScan: pdf.numPages > 0 && charCount < pdf.numPages * 80,
    noTextLayer: pdf.numPages === 0 || charCount === 0,
  };
}

const OCDS = "ocds-148610-83a559be-df3f-4e5f-8935-44ef8bc31e15";
const NOTICE = "2026/BZP 00296679/01";
const INNER = "TP182 Zal. nr 3_Opis przedmiotu zamówienia/Zadanie 1/Nowowiejska 86a_27/Nowowiejska 86a_27 - przedmiar.pdf";
const MIN_ROWS = 80;
/** TP196 M4 baseline (v2.62.9); TP197 M5 baseline po M4. */
const TP196_BASELINE_ROWS = 86;
const TP197_M4_BASELINE_ROWS = 108;
const TP198A_BEFORE_ROWS = 112;
const TP198BC_BEFORE_ROWS = 115;

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

async function main() {
  console.log("=== TP182 WM PDF Recovery ===\n");

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
  const bytes = base64ToBytes(ent.base64);

  const extracted = await extractPdfTextLegacy(bytes);
  const heuristic = parsePdfPrzedmiarHeuristic(extracted.text, {
    likelyScan: extracted.likelyScan,
    noTextLayer: extracted.noTextLayer,
  });
  const rows = heuristic.rows;

  console.log("pages:", extracted.pageCount);
  console.log("rows BEFORE (TP198A):", TP198A_BEFORE_ROWS);
  console.log("rows BEFORE (TP198B+C):", TP198BC_BEFORE_ROWS);
  console.log("rows AFTER (TP198B+C):", rows.length);
  console.log("DELTA vs TP198A:", rows.length - TP198A_BEFORE_ROWS);
  console.log("DELTA vs TP198B+C baseline:", rows.length - TP198BC_BEFORE_ROWS);
  console.log("parsePdfPrzedmiarHeuristic uxCase:", heuristic.uxCase);

  assert(`rows >= ${MIN_ROWS}`, rows.length >= MIN_ROWS);
  assert("TP198BC rows >= 120", rows.length >= 120);
  assert("TP198BC delta >= 5", rows.length - TP198BC_BEFORE_ROWS >= 5);
  assert("has kalk. własna row", rows.some((r) => /kalk/i.test(r.code)));
  assert("heuristic rows >= MIN", rows.length >= MIN_ROWS);
  assert("pdfPrzedmiarCase 1", heuristic.uxCase === 1);
  assert("has KNR-W row", rows.some((r) => r.code.includes("KNR-W")));
  assert("has ZKNR row", rows.some((r) => r.code.includes("ZKNR")));

  console.log("\n--- Sample 20 rows ---");
  rows.slice(0, 20).forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${r.code} | ${r.unit} ${r.quantity} | ${r.description.slice(0, 70)}`);
  });

  console.log(`\nTP182 WM PDF Recovery: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
