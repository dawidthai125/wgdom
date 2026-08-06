/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 Phase A — health/KPI harness (fixture).
 * npx vite-node scripts/ng-tenders-document-intelligence-01-harness.mjs
 */
import {
  accumulateDiKpi,
  analyzeDocumentIntelligenceBatch,
  diHealthSummary,
  emptyDiKpi,
  DI_T_BOQ,
} from "../src/lib/document-intelligence/index.ts";

const FIXTURE = [
  {
    filename: "Załącznik nr 2E do SWZ WYKAZ zakresu rzeczowo-finansowego.pdf",
    fullText: `WYKAZ ZAKRESU RZECZOWO-FINANSOWEGO
Lp. Podstawa Opis J.m. Ilość
1 KNR 2-1301 Roboty m3 10
Nakład robocizny`,
    isPdf: true,
    hasTextLayer: true,
    byteLength: 8000,
  },
  {
    filename: "Umowa.pdf",
    fullText: "Umowa o roboty. Wadium. Pełnomocnictwo. Formularz ofertowy.",
    isPdf: true,
    hasTextLayer: true,
    byteLength: 4000,
  },
  {
    filename: "OPZ_opis_przedmiotu.pdf",
    fullText: "Opis przedmiotu zamówienia. Specyfikacja techniczna STWiORB.",
    isPdf: true,
    hasTextLayer: true,
    byteLength: 5000,
  },
  {
    filename: "przedmiar_robót.pdf",
    fullText: `Przedmiar robót
Lp. J.m. Ilość KNR 4-0101 Instalacja mb 25`,
    isPdf: true,
    hasTextLayer: true,
    byteLength: 9000,
  },
];

const results = analyzeDocumentIntelligenceBatch(FIXTURE);
let kpi = emptyDiKpi();
for (const r of results) {
  const parsedOk = r.parser.recommendedParser === "pdf_przedmiar";
  kpi = accumulateDiKpi(kpi, r, { parsedOk, pass2: true });
}

const health = diHealthSummary(kpi);

console.log("=== DI Phase A Harness ===");
console.log(`T_BOQ=${DI_T_BOQ}`);
for (const r of results) {
  console.log(
    `- ${r.filename}\n  rank=${r.rankLabel} overall=${r.boq.overallConfidence.toFixed(3)} parser=${r.parser.recommendedParser} purpose=${r.purpose}`,
  );
}
console.log("\nKPI:", JSON.stringify(kpi, null, 2));
console.log("Health:", health);

const ok =
  health.status === "ok" &&
  kpi.boqCandidatesDetected >= 1 &&
  kpi.boqCandidatesMerged === 0 &&
  results.some((r) => r.filename.includes("2E") && r.parser.recommendedParser === "pdf_przedmiar");

if (!ok) {
  console.error("HARNESS FAIL");
  process.exit(1);
}
console.log("\nHARNESS PASS");
