/**
 * P2-E.0 — tender dossier analysis pipeline.
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
} from "../src/lib/tender-dossier-pipeline.ts";
import { TBS_00266295_DOCUMENTS } from "../src/lib/tender-analysis-coverage.ts";
import { mergeSwzAnalysis } from "../src/lib/tender-document-resolver.ts";
import { enrichSwzFromText } from "../src/lib/tenders-bzp-swz-enrich.ts";
import { parseSwzPlainText } from "../src/lib/tenders-bzp-swz.ts";
import { clearDossierTraceLog, getDossierTraceLog, traceDossierPipeline } from "../src/lib/tender-dossier-trace.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// document roles
assert("role swz mod", classifyDocumentRole("2026_modyfik_SWZ.pdf") === "swz_modification");
assert("role swz", classifyDocumentRole("SWZ.pdf") === "swz");
assert("role stwior", classifyDocumentRole("STWIOR_TBS.pdf") === "stwior");
assert("role przedmiar xlsx", classifyDocumentRole("Przedmiar.xlsx") === "przedmiar");
assert("role kosztorys ath", classifyDocumentRole("Kosztorys.ath") === "kosztorys");
assert("7z filename", is7zFilename("pakiet.7z"));

// priority
assert("stwior before unknown", roleParsePriority("stwior") < roleParsePriority("unknown"));

// SWZ + STWIOR merge value
const modText = "Wysokość wadium: 6% wartości zamówienia. Termin realizacji: 120 dni";
const stwiorText = `
Wartość zamówienia: 3 200 000,00 zł
Kryteria oceny ofert:
Cena oferty - 60 %
Termin realizacji - 20 %
Okres gwarancji - 20 %
`;
const modSwz = enrichSwzFromText(modText, parseSwzPlainText(modText, { source: "pdf" }));
const stwiorSwz = enrichSwzFromText(stwiorText, parseSwzPlainText(stwiorText, { source: "pdf" }));
const merged = mergeSwzAnalysis(modSwz, stwiorSwz);
assert("merged value from stwior", merged?.estimatedValuePln === 3_200_000);
assert("merged criteria 3", (merged?.awardCriteria?.length ?? 0) >= 3);
assert("merged keeps wadium days", merged?.implementationDays === 120);

// award criteria merge on re-analysis
const htmlSwz = parseSwzPlainText("Wadium: Tak", { source: "html" });
const pdfSwz = enrichSwzFromText(stwiorText, parseSwzPlainText(stwiorText, { source: "pdf" }));
const reMerged = mergeSwzAnalysis(htmlSwz, pdfSwz);
assert("re-merge criteria preserved", (reMerged?.awardCriteria?.length ?? 0) >= 3);

// scan summary counts
const counts = countDocumentsByType(TBS_00266295_DOCUMENTS);
assert("tbs 15 docs counted", counts.pdf >= 5);
assert("tbs has 7z", counts.sevenZip >= 1);

const missingMsg = buildKosztorysMissingMessage({
  totalDocuments: 15,
  scanned: 8,
  parsed: 6,
  byType: counts,
  sevenZipCount: 2,
  kosztorysFound: false,
  valueFound: false,
  criteriaFound: false,
  estimateFound: false,
  parsedAt: new Date().toISOString(),
});
assert("missing msg header", missingMsg.includes("Kosztorys nie został odnaleziony"));
assert("missing msg 7z", missingMsg.includes("7Z: 2"));

const estReason = buildEstimateMissingReason({
  totalDocuments: 15,
  scanned: 5,
  parsed: 3,
  byType: { pdf: 8, xlsx: 0, zip: 0, ath: 0, sevenZip: 2, other: 5 },
  sevenZipCount: 2,
  kosztorysFound: false,
  valueFound: false,
  criteriaFound: false,
  estimateFound: false,
  parsedAt: new Date().toISOString(),
});
assert("estimate reason 7z", estReason.includes("7Z"));

// trace
clearDossierTraceLog();
traceDossierPipeline("document_discovered", "SWZ.pdf", { role: "swz" });
traceDossierPipeline("document_parsed", "STWIOR.pdf", { swz: true });
assert("trace entries", getDossierTraceLog().length === 2);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
