/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 Phase A — unit tests.
 * npx vite-node scripts/test-ng-tenders-document-intelligence-01.mjs
 */
import {
  ACTIVE_SEARCH_TOKENS,
  DI_T_BOQ,
  analyzeDocumentIntelligence,
  classifyFilenamePriority,
  extractAttachmentRef,
  emptyDiKpi,
  accumulateDiKpi,
  resolveOcrContract,
  resolveSemanticContract,
  shouldForcePdfPrzedmiarParse,
  resetDiEvidenceSeqForTests,
} from "../src/lib/document-intelligence/index.ts";
import { isPdfPrzedmiarCostFilename } from "../src/lib/tender-cost-discovery.ts";

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

resetDiEvidenceSeqForTests();

console.log("=== DI AttachmentRef (COND-8g) ===\n");

const ref2e = extractAttachmentRef(
  "Załącznik nr 2E do SWZ WYKAZ zakresu rzeczowo-finansowego.pdf",
);
assert(ref2e.attachmentRef === "2E", `AttachmentRef 2E got=${ref2e.attachmentRef}`);
assert(ref2e.confidence === "high" || ref2e.confidence === "medium", "2E confidence medium/high");

console.log("\n=== DI Filename Priority (COND-8) ===\n");

const boost = classifyFilenamePriority(
  "Załącznik nr 2E do SWZ WYKAZ zakresu rzeczowo-finansowego.pdf",
);
assert(boost.priority === "boost", `2E WYKAZ → boost got=${boost.priority}`);
assert(
  !isPdfPrzedmiarCostFilename("Załącznik nr 2E do SWZ WYKAZ zakresu rzeczowo-finansowego.pdf"),
  "Doc.D1 still false for UX_A name (DI must recover)",
);

const penalty = classifyFilenamePriority("Umowa_o_roboty_budowlane.pdf");
assert(penalty.priority === "penalty", `Umowa → penalty got=${penalty.priority}`);

const neutral = classifyFilenamePriority("dokument_xyz.pdf");
assert(neutral.priority === "neutral", "generic → neutral");

console.log("\n=== DI Content + Table → BOQ (UX_A recovery) ===\n");

const boqText = `
WYKAZ ZAKRESU RZECZOWO-FINANSOWEGO
Lp.  Podstawa  Opis  J.m.  Ilość
1. KNR 2-1301 Roboty ziemne  m3  12,5
2. KNR 4-0201 Instalacje  mb  40
Nakład robocizny R M S
`;

const diBoq = analyzeDocumentIntelligence({
  filename: "Załącznik nr 2E do SWZ WYKAZ zakresu rzeczowo-finansowego.pdf",
  fullText: boqText,
  isPdf: true,
  hasTextLayer: true,
  byteLength: 12000,
});

assert(diBoq.filenamePriority === "boost", "DI filename boost");
assert(diBoq.attachmentRef.attachmentRef === "2E", "DI keeps AttachmentRef");
assert(diBoq.boq.overallConfidence >= DI_T_BOQ, `overall>=T_BOQ got=${diBoq.boq.overallConfidence.toFixed(3)}`);
assert(diBoq.rankLabel === "BOQ" || diBoq.rankLabel === "COST_ESTIMATE", `rank BOQ got=${diBoq.rankLabel}`);
assert(shouldForcePdfPrzedmiarParse(diBoq), "Pass-7 recommends pdf_przedmiar");
assert(diBoq.purpose === "PRIMARY_QUANTITY_SOURCE", `purpose quantity got=${diBoq.purpose}`);
assert(diBoq.explain.chosenBecause.length > 0, "explainability chosenBecause non-empty");
assert(diBoq.evidence.every((e) => e.evidenceStrength), "evidence has strength (8j-d)");
assert(!("weight" in (diBoq.evidence[0] || {})), "evidence has no numeric weight field");
assert(ACTIVE_SEARCH_TOKENS.includes("podstawa"), "COND-5 Active Search dict");

console.log("\n=== DI Negative / Formal (never hard-reject) ===\n");

const diUmowa = analyzeDocumentIntelligence({
  filename: "Umowa_o_roboty_budowlane.pdf",
  fullText: "Umowa o roboty budowlane. Pełnomocnictwo. Wadium. Formularz ofertowy.",
  isPdf: true,
  hasTextLayer: true,
});
assert(diUmowa.parser.recommendedParser === "none", `Umowa → none got=${diUmowa.parser.recommendedParser}`);
assert(diUmowa.boq.overallConfidence < DI_T_BOQ, "Umowa below T_BOQ");
assert(diUmowa.filenamePriority === "penalty", "Umowa penalty only (not reject)");

const mixed = analyzeDocumentIntelligence({
  filename: "SWZ_WYKAZ_zakresu_rzeczowo-finansowego.pdf",
  fullText: boqText,
  isPdf: true,
  hasTextLayer: true,
});
assert(
  mixed.parser.recommendedParser === "pdf_przedmiar" || mixed.boq.overallConfidence >= DI_T_BOQ,
  "mixed SWZ+WYKAZ content can still select BOQ",
);

console.log("\n=== DI Cross-ref boost (COND-8e) ===\n");

const withXref = analyzeDocumentIntelligence({
  filename: "Załącznik nr 2E wykaz zakresu.pdf",
  fullText: "Tabela pozycji Lp. J.m. Ilość KNR 1-0101",
  isPdf: true,
  crossRefSourceTexts: [
    { filename: "SWZ.pdf", text: "Szczegóły w załączniku nr 2E do SWZ." },
  ],
});
assert(withXref.attachmentRef.attachmentRef === "2E", "xref case has AttachmentRef 2E");
assert(
  withXref.evidence.some((e) => e.source === "CrossReference"),
  "xref evidence present",
);

console.log("\n=== DI OCR / Semantic stubs OUT ===\n");

const ocr = resolveOcrContract({ isPdf: true, hasTextLayer: false, textLen: 0 });
assert(ocr.status === "not_configured", `OCR stub not_configured got=${ocr.status}`);
assert(resolveSemanticContract() === "not_configured", "Semantic stub not_configured");

console.log("\n=== DI KPI RO Merged=0 ===\n");

let kpi = emptyDiKpi();
kpi = accumulateDiKpi(kpi, diBoq, { parsedOk: true, pass2: true });
kpi = accumulateDiKpi(kpi, diUmowa, { parsedOk: false, pass2: true });
assert(kpi.boqCandidatesDetected >= 1, "KPI detected>=1");
assert(kpi.boqCandidatesParsed === 1, "KPI parsed=1");
assert(kpi.boqCandidatesMerged === 0, "KPI Merged=0 Phase A");

console.log("\n=== DI Duplicate minimal ===\n");

const seen = new Map();
const a = analyzeDocumentIntelligence(
  { filename: "a.pdf", fullText: "same", byteLength: 100, isPdf: true },
  { seenFingerprints: seen },
);
const b = analyzeDocumentIntelligence(
  { filename: "a.pdf", fullText: "same", byteLength: 100, isPdf: true, candidateKey: "b" },
  { seenFingerprints: seen },
);
assert(b.duplicateOf === a.candidateKey || b.duplicateOf === "a.pdf", `dup detected got=${b.duplicateOf}`);

console.log(`\n=== RESULT ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
