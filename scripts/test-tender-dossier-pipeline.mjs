/**
 * P2-E.0 + P2-E.1 — tender dossier / universal engine tests.
 * npx vite-node scripts/test-tender-dossier-pipeline.mjs
 */
import {
  classifyDocumentRole,
  is7zFilename,
  roleParsePriority,
} from "../src/lib/tender-document-role.ts";
import {
  countDocumentsByType,
  buildKosztorysMissingMessage,
  buildEstimateMissingReason,
  buildKosztorysStatusLine,
  buildScanTypeSummary,
} from "../src/lib/tender-dossier-pipeline.ts";
import { TBS_00266295_DOCUMENTS } from "../src/lib/tender-analysis-coverage.ts";
import { mergeSwzAnalysis } from "../src/lib/tender-document-resolver.ts";
import { enrichSwzFromText } from "../src/lib/tenders-bzp-swz-enrich.ts";
import { parseSwzPlainText } from "../src/lib/tenders-bzp-swz.ts";
import { clearDossierTraceLog, getDossierTraceLog, traceDossierPipeline } from "../src/lib/tender-dossier-trace.ts";
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
} from "../src/lib/tender-cost-discovery.ts";
import {
  applyMetadataConfidence,
  filterReliableAwardCriteria,
  isFalsePositiveCriterion,
} from "../src/lib/tender-metadata-confidence.ts";
import { extractAwardCriteria } from "../src/lib/tenders-bzp-fit.ts";
import { roleContributesMetadata } from "../src/lib/tender-metadata-sources.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// document roles
assert("role swz mod", classifyDocumentRole("2026_modyfik_SWZ.pdf") === "swz_modification");
assert("role swz", classifyDocumentRole("SWZ.pdf") === "swz");
assert("role opz", classifyDocumentRole("OPZ_TBS.pdf") === "opz");
assert("role stwior", classifyDocumentRole("STWIOR_TBS.pdf") === "stwior");
assert("role przedmiar xlsx", classifyDocumentRole("Przedmiar.xlsx") === "przedmiar");
assert("role kosztorys ath", classifyDocumentRole("Kosztorys.ath") === "kosztorys");
assert("7z filename", is7zFilename("pakiet.7z"));
assert("stwior before unknown", roleParsePriority("stwior") < roleParsePriority("unknown"));
assert("opz metadata criteria", roleContributesMetadata("opz", "awardCriteria"));

// cost discovery — Logintrade ZIP → ATH
const zipAth = classifyCostDocumentType("dokumentacja.zip → Falzmanna 17-25.ATH");
assert("zip inner ath type", zipAth.type === "zip_ath");
assert("zip inner ath confidence", zipAth.confidence >= 0.9);

const discovered = discoverBestCostDocument([
  { filename: "SWZ.pdf", score: 20 },
  { filename: "pakiet.zip → Falzmanna 17-25.ATH", score: 35, zipInnerPath: "Falzmanna 17-25.ATH" },
  { filename: "pakiet.zip → formularz.docx", score: 10 },
]);
assert("discover zip ath found", discovered.found === true);
assert("discover zip ath type", discovered.type === "zip_ath");
assert("discover zip ath source", discovered.source.includes("Falzmanna"));

const discoveredXlsx = discoverBestCostDocument([
  { filename: "arch.zip → przedmiar.xlsx", score: 30 },
  { filename: "arch.zip → notatka.pdf", score: 5 },
]);
assert("discover zip xlsx", discoveredXlsx.type === "zip_xlsx");

// SWZ + STWIOR merge value
const modText = "Wysokość wadium: 6% wartości zamówienia. Termin realizacji: 120 dni";
const stwiorText = `
Wartość zamówienia: 3 200 000,00 zł
Kryteria oceny ofert:
Cena oferty - 60 %
Termin realizacji - 20 %
Okres gwarancji - 20 %
`;
const opzText = `
Wartość zamówienia: 3 500 000,00 zł
Kryteria oceny ofert:
Cena - 70 %
Jakość - 30 %
`;
const modSwz = enrichSwzFromText(modText, parseSwzPlainText(modText, { source: "pdf" }));
const stwiorSwz = enrichSwzFromText(stwiorText, parseSwzPlainText(stwiorText, { source: "pdf" }));
const opzSwz = enrichSwzFromText(opzText, parseSwzPlainText(opzText, { source: "pdf" }));
const merged = mergeSwzAnalysis(mergeSwzAnalysis(modSwz, stwiorSwz), opzSwz);
assert("merged value from stwior", merged?.estimatedValuePln === 3_200_000);
assert("merged criteria 3+", (merged?.awardCriteria?.length ?? 0) >= 3);
assert("merged keeps wadium days", merged?.implementationDays === 120);

// confidence filter — false VAT criterion
const vatNoise = extractAwardCriteria(`
Oferta musi być wystawiona z dokładnością do dwóch miejsc po przecinku.
VAT 8% - stawka obniżona.
Kryteria oceny ofert:
Cena oferty - 60 %
Termin realizacji - 20 %
`);
const reliable = filterReliableAwardCriteria(vatNoise);
assert("vat filtered", !reliable.some((c) => /vat/i.test(c.name)));
assert("false positive vat flag", isFalsePositiveCriterion({ name: "VAT 8%", weightPct: 8, maxPoints: null, description: "" }));
assert("reliable criteria remain", reliable.some((c) => /cena/i.test(c.name)));

// false value + only-noise criteria confidence
const fakeValueSwz = parseSwzPlainText("VAT 8% stawka podatku. Wadium: brak.", { source: "pdf" });
const onlyVatCriteria = extractAwardCriteria(
  "VAT 8% - stawka obniżona. z dokładnością do dwóch miejsc po przecinku.",
);
const confident = applyMetadataConfidence({
  ...fakeValueSwz,
  estimatedValuePln: 8,
  estimatedValueRaw: "8 zł",
  awardCriteria: onlyVatCriteria,
});
assert("low confidence value cleared", confident.estimatedValuePln == null);
assert("noise criteria cleared", (confident.awardCriteria?.length ?? 0) === 0);

// scan summary UX
const counts = countDocumentsByType(TBS_00266295_DOCUMENTS);
assert("tbs pdf counted", counts.pdf >= 5);
assert("tbs has 7z", counts.sevenZip >= 1);

const summary = {
  totalDocuments: 15,
  scanned: 8,
  parsed: 6,
  byType: { ...counts, docx: 2 },
  sevenZipCount: 2,
  kosztorysFound: false,
  valueFound: false,
  criteriaFound: false,
  estimateFound: false,
  costDiscovery: null,
  parsedAt: new Date().toISOString(),
};
const scanLines = buildScanTypeSummary(summary);
assert("scan has PDF line", scanLines.includes("PDF:"));
assert("scan has DOC line", scanLines.includes("DOC/DOCX:"));

const missingStatus = buildKosztorysStatusLine(summary);
assert("missing status", missingStatus.includes("Nie znaleziono"));

const foundSummary = { ...summary, kosztorysFound: true, costDiscovery: discovered };
const foundStatus = buildKosztorysStatusLine(foundSummary);
assert("found status ath", foundStatus.includes("Znaleziony"));

const missingMsg = buildKosztorysMissingMessage(summary);
assert("missing msg scan block", missingMsg.includes("Przeskanowano:"));

const estReason = buildEstimateMissingReason({
  ...summary,
  byType: { pdf: 8, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 2, other: 5 },
});
assert("estimate reason 7z", estReason.includes("7Z"));

// trace
clearDossierTraceLog();
traceDossierPipeline("document_discovered", "SWZ.pdf", { role: "swz" });
traceDossierPipeline("document_parsed", "STWIOR.pdf", { swz: true });
assert("trace entries", getDossierTraceLog().length === 2);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
