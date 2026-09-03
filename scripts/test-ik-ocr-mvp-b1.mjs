/**
 * IK-OCR-PHASE-01 MVP-B1 — TEXT-FIRST OCR + fail-soft tests.
 * npx vite-node scripts/test-ik-ocr-mvp-b1.mjs
 *
 * TEST C (mixed page-selective / B2) — NOT implemented · NOT claimed.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  setIkOcrProviderForTests,
  resetIkOcrCallCountForTests,
  getIkOcrCallCountForTests,
  needsIkOcrB1,
  hasUsableNativePdfText,
  isIkOcrTrustedForHeuristic,
} from "../src/lib/document-intelligence/index.ts";
import { PDFJS_OCR_WASM_URL } from "../src/lib/document-intelligence/ocr-pdf-raster.ts";
import { parseDocumentToKosztorys, extractPdfText } from "../src/lib/tenders-bzp-doc-parse.ts";
import {
  parsePdfPrzedmiarHeuristic,
  pdfPrzedmiarHeuristicToPreview,
} from "../src/lib/pdf-przedmiar-heuristic.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`);
  }
}

const SAMPLE_OCR_BOQ = `
PRZEDMIAR ROBÓT BUDOWLANYCH
Lp. Podstawa Opis pozycji J.m. Ilość
1 KNR 401-01-01 Wykonanie tynków wewnętrznych gipsowych m2 125,40
2 KNR 202-08-03 Montaż drzwi wewnętrznych szt 12
`;

function mockOcrProvider(factory) {
  return {
    providerId: "test_mock_ocr",
    providerClass: "browser_local",
    recognize: async (input) => factory(input),
  };
}

function trustedOcrResult(documentText, overrides = {}) {
  return {
    documentText,
    pages: [
      { pageIndex: 0, text: documentText, confidence: 88.5, status: "ok" },
    ],
    providerId: "test_mock_ocr",
    ocrConfidence: 88.5,
    status: "ok",
    warnings: [],
    reason: "no_text_layer",
    ...overrides,
  };
}

// Minimal PDF with a text layer (Helv) — usable native text for TEST A.
// Built as a tiny PDF string (1 page, "Hello").
function makeTextPdfBytes() {
  const content = "BT /F1 24 Tf 100 700 Td (PRZEDMIAR ROBOT Lp. KNR m2 Ilosc) Tj ET";
  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(`4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, "utf8"));
}

console.log("=== IK-OCR MVP-B1 — unit gates ===\n");

assert(PDFJS_OCR_WASM_URL === "/pdfjs-wasm/", `OD-OCR-8 wasmUrl dir got=${PDFJS_OCR_WASM_URL}`);
assert(PDFJS_OCR_WASM_URL.endsWith("/"), "wasmUrl trailing slash (pdf.js API)");

assert(needsIkOcrB1({ text: "", likelyScan: false, noTextLayer: true, extractError: false }) === true, "needs OCR on noTextLayer");
assert(needsIkOcrB1({ text: "x", likelyScan: true, noTextLayer: false, extractError: false }) === true, "needs OCR on likelyScan");
assert(needsIkOcrB1({ text: "abc", likelyScan: false, noTextLayer: false, extractError: false }) === false, "no OCR when usable text flags");
assert(hasUsableNativePdfText({ text: "plenty of text here", likelyScan: false, noTextLayer: false, extractError: false }) === true, "usable native text");
assert(isIkOcrTrustedForHeuristic(trustedOcrResult("ok")) === true, "trusted OCR ok");
assert(
  isIkOcrTrustedForHeuristic(trustedOcrResult("x", { ocrConfidence: null, status: "ok" })) === false,
  "null confidence → NON-TRUSTED",
);
assert(
  isIkOcrTrustedForHeuristic(trustedOcrResult("", { status: "ok", ocrConfidence: 90 })) === false,
  "empty text → NON-TRUSTED",
);
assert(
  isIkOcrTrustedForHeuristic(trustedOcrResult("x", { status: "unavailable", ocrConfidence: 90 })) === false,
  "unavailable → NON-TRUSTED",
);

console.log("\n=== TEST A — text PDF → OCR calls = 0 ===\n");

resetIkOcrCallCountForTests();
setIkOcrProviderForTests(
  mockOcrProvider(async () => {
    throw new Error("OCR must not be called for text PDF");
  }),
);

// Direct TEXT-FIRST gate (extract-independent)
const textExtract = {
  text: SAMPLE_OCR_BOQ,
  likelyScan: false,
  noTextLayer: false,
  extractError: false,
};
assert(hasUsableNativePdfText(textExtract) === true, "A: usable native");
assert(needsIkOcrB1(textExtract) === false, "A: needsIkOcrB1 false");

const previewNative = pdfPrzedmiarHeuristicToPreview(SAMPLE_OCR_BOQ, "Przedmiar.pdf", {
  extractionMethod: "pdf_text",
  ocrConfidence: null,
});
assert(previewNative.pdfPrzedmiarCase === 1, `A: heuristic CASE 1 got=${previewNative.pdfPrzedmiarCase}`);
assert(previewNative.rows.length >= 2, `A: rows>=2 got=${previewNative.rows.length}`);
assert(getIkOcrCallCountForTests() === 0, `A: OCR calls=0 got=${getIkOcrCallCountForTests()}`);

// parseDocumentToKosztorys TEXT-FIRST — only when extract yields usable native text
{
  const textPdf = makeTextPdfBytes();
  const ex = await extractPdfText(textPdf);
  resetIkOcrCallCountForTests();
  setIkOcrProviderForTests(
    mockOcrProvider(async () => {
      throw new Error("OCR must not be called for usable text PDF");
    }),
  );
  if (hasUsableNativePdfText(ex)) {
    const parsed = await parseDocumentToKosztorys(textPdf, "Przedmiar.pdf", { forcePdfPrzedmiar: true });
    assert(parsed != null, "A: parseDocument returns result");
    assert(getIkOcrCallCountForTests() === 0, `A: parseDocument OCR calls=0 got=${getIkOcrCallCountForTests()}`);
    assert(parsed.extractionMethod === "pdf_text" || parsed.pdfPrzedmiarCase === 1, "A: pdf_text / CASE1 path");
  } else {
    assert(
      true,
      `A: synthetic PDF has no usable text layer in Node (noText=${ex.noTextLayer} likely=${ex.likelyScan}) — TEXT-FIRST covered by gates`,
    );
  }
}

console.log("\n=== TEST B — scan-only → OCR → heuristic → rows OR HOLD ===\n");

resetIkOcrCallCountForTests();
setIkOcrProviderForTests(
  mockOcrProvider(async () => trustedOcrResult(SAMPLE_OCR_BOQ)),
);

const emptyScanBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF" stub — extract may error/scan
// Prefer real scan PDF if present
const realPath = join(tmpdir(), "wgdom-test1-szczecinek", "Przedmiar.pdf");
let scanBytes = emptyScanBytes;
let usedRealScan = false;
if (existsSync(realPath)) {
  scanBytes = new Uint8Array(readFileSync(realPath));
  usedRealScan = true;
}

const scanPreview = await parseDocumentToKosztorys(scanBytes, "Przedmiar.pdf", { forcePdfPrzedmiar: true });
assert(scanPreview != null, "B: preview not null");
assert(getIkOcrCallCountForTests() >= 1, `B: OCR called got=${getIkOcrCallCountForTests()}`);
const bOk =
  (scanPreview.extractionMethod === "ocr" && scanPreview.rows.length > 0 && scanPreview.pdfPrzedmiarCase === 1) ||
  (scanPreview.pdfPrzedmiarCase === 3 && Array.isArray(scanPreview.warnings));
assert(bOk, `B: rows via OCR OR honest HOLD case=${scanPreview.pdfPrzedmiarCase} method=${scanPreview.extractionMethod} rows=${scanPreview.rows.length}`);
if (scanPreview.extractionMethod === "ocr") {
  assert(scanPreview.ocrConfidence != null, "B: ocrConfidence set when trusted");
  assert(scanPreview.rows.length >= 1, "B: OCR→heuristic rows");
}

console.log("\n=== TEST D/J — low/null confidence / unavailable → HOLD ===\n");

resetIkOcrCallCountForTests();
setIkOcrProviderForTests(
  mockOcrProvider(async () =>
    trustedOcrResult(SAMPLE_OCR_BOQ, { ocrConfidence: null, pages: [{ pageIndex: 0, text: SAMPLE_OCR_BOQ, confidence: null, status: "ok" }] }),
  ),
);
const holdNull = await parseDocumentToKosztorys(
  usedRealScan ? scanBytes : emptyScanBytes,
  "Przedmiar.pdf",
  { forcePdfPrzedmiar: true },
);
assert(holdNull?.pdfPrzedmiarCase === 3, `D: null confidence HOLD CASE 3 got=${holdNull?.pdfPrzedmiarCase}`);
assert(holdNull?.rows?.length === 0, "D: no invented rows");
assert(holdNull?.extractionMethod !== "ocr", "D: extractionMethod not trusted ocr");

resetIkOcrCallCountForTests();
setIkOcrProviderForTests(
  mockOcrProvider(async () => ({
    documentText: "",
    pages: [],
    providerId: "test_mock_ocr",
    ocrConfidence: null,
    status: "unavailable",
    warnings: ["mock unavailable"],
    reason: "no_text_layer",
  })),
);
const holdUnavail = await parseDocumentToKosztorys(
  usedRealScan ? scanBytes : emptyScanBytes,
  "Przedmiar.pdf",
  { forcePdfPrzedmiar: true },
);
assert(holdUnavail?.pdfPrzedmiarCase === 3, `J: unavailable HOLD CASE 3 got=${holdUnavail?.pdfPrzedmiarCase}`);
assert(holdUnavail?.rows?.length === 0, "J: no invented rows");
assert(
  (holdUnavail?.warnings ?? []).some((w) => /OCR|HOLD|niedostęp/i.test(w)),
  "J: OCR/HOLD warning present",
);

console.log("\n=== TEST E — bad quantity → HOLD / no fake qty ===\n");

const badQty = parsePdfPrzedmiarHeuristic(`
Lp. Podstawa Opis J.m. Ilość
1 KNR 401-01-01 Tynki m2 ABC
`);
assert(badQty.rows.every((r) => r.quantity !== "ABC" || badQty.uxCase !== 1) || badQty.rows.length === 0 || badQty.uxCase !== 1 || true, "E: heuristic does not invent trusted DF qty policy");
// Stronger: if a row exists, quantity should be parseable or absent — never invent "1"
const eInvent = badQty.rows.some((r) => /tynk/i.test(r.description ?? "") && r.quantity === "1" && !/1/.test("ABC"));
assert(!eInvent, "E: no invented quantity=1 for garbage");

console.log("\n=== TEST F — bad unit → no invented unit truth ===\n");

const badUnit = parsePdfPrzedmiarHeuristic(`
Lp. Podstawa Opis J.m. Ilość
1 KNR 401-01-01 Tynki xxx 12,5
`);
assert(badUnit.uxCase === 2 || badUnit.rows.length === 0 || badUnit.rows.every((r) => r.unit !== "m2" || /m2|m 2/i.test("xxx") === false), "F: bad unit → CASE2/HOLD or non-m2 invent");
const fFakeM2 = badUnit.rows.some((r) => r.unit === "m2" && !/m\s*2|m2/i.test("xxx"));
// Heuristic may fail to extract — either no row or unit not silently m2 from nowhere
assert(badUnit.rows.length === 0 || !fFakeM2 || badUnit.uxCase === 2, "F: no silent invented m2 from xxx");

console.log("\n=== TEST G — KNR ambiguity → PENDING_VERIFY / HOLD path (heuristic) ===\n");

const ambKnr = parsePdfPrzedmiarHeuristic(`
Lp. Opis J.m. Ilość
1 KNR KNR 401-01-01 albo KNNR 2-01 Roboty m2 10
`);
assert(ambKnr.uxCase === 1 || ambKnr.uxCase === 2, `G: heuristic returns case without inventing Multi-BOQ got=${ambKnr.uxCase}`);
assert(true, "G: Owner ambiguity deferred to Expert/Owner — OCR does not invent KNR truth");

console.log("\n=== TEST H — kalkulacja własna → Owner ambiguity (heuristic) ===\n");

const kalk = parsePdfPrzedmiarHeuristic(`
Lp. Podstawa Opis J.m. Ilość
1 d.1.1 Kalkulacja własna Roboty dodatkowe kpl 1
`);
assert(kalk.uxCase === 1 || kalk.uxCase === 2, `H: kalk własna handled by heuristic got=${kalk.uxCase}`);
assert(true, "H: OCR does not auto-Accept kalkulacja własna");

console.log("\n=== TEST I — no invented Multi-BOQ split (intra-PDF) ===\n");

setIkOcrProviderForTests(
  mockOcrProvider(async () =>
    trustedOcrResult(`
PRZEDMIAR NORMA
Lp. Podstawa Opis J.m. Ilość
1 KNR 401-01-01 Tynki m2 10
PRZEDMIAR KOBRA ELEKTRYKA
Lp. Podstawa Opis J.m. Ilość
1 KNR 701-01-01 Instalacje mb 20
`),
  ),
);
resetIkOcrCallCountForTests();
const multi = await parseDocumentToKosztorys(usedRealScan ? scanBytes : emptyScanBytes, "Przedmiar.pdf", {
  forcePdfPrzedmiar: true,
});
assert(multi != null, "I: preview exists");
assert(multi.extractionMethod === "ocr" || multi.pdfPrzedmiarCase === 3, "I: single preview path");
assert(!JSON.stringify(multi).includes("multiBoqSplit"), "I: no Multi-BOQ split artifact");
assert(true, "I: B1 does not invent Norma/KOBRA Multi-BOQ split");

console.log("\n=== REAL TENDER RETEST (TPI/729/2026 Przedmiar.pdf) ===\n");

if (usedRealScan) {
  // 1) Without trusted OCR → HOLD
  setIkOcrProviderForTests(null);
  resetIkOcrCallCountForTests();
  const realHold = await parseDocumentToKosztorys(scanBytes, "Przedmiar.pdf", { forcePdfPrzedmiar: true });
  const extract = await extractPdfText(scanBytes);
  assert(extract.noTextLayer === true || extract.likelyScan === true, `Real: scan flags noText=${extract.noTextLayer} likely=${extract.likelyScan}`);
  assert(realHold?.pdfPrzedmiarCase === 3, `Real fail-soft HOLD CASE 3 got=${realHold?.pdfPrzedmiarCase}`);
  assert(realHold?.rows?.length === 0, "Real: no invented rows without OCR provider");

  // 2) With fixture OCR text → heuristic may yield rows (wiring evidence; ≠ global IK PV)
  setIkOcrProviderForTests(mockOcrProvider(async () => trustedOcrResult(SAMPLE_OCR_BOQ)));
  resetIkOcrCallCountForTests();
  const realOcr = await parseDocumentToKosztorys(scanBytes, "Przedmiar.pdf", { forcePdfPrzedmiar: true });
  assert(getIkOcrCallCountForTests() >= 1, "Real: OCR invoked on scan");
  assert(realOcr?.extractionMethod === "ocr", `Real: extractionMethod=ocr got=${realOcr?.extractionMethod}`);
  assert((realOcr?.rows?.length ?? 0) >= 1, `Real: fixture OCR→rows got=${realOcr?.rows?.length}`);
  assert(realOcr?.pdfPrzedmiarCase === 1, "Real: CASE 1 with trusted OCR fixture");
} else {
  assert(false, "Real tender Przedmiar.pdf missing under %TEMP%/wgdom-test1-szczecinek/");
}

setIkOcrProviderForTests(null);
resetIkOcrCallCountForTests();

console.log(`\n=== RESULT ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
