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
import { mergeSwzAnalysis, parseTenderDossierDocuments } from "../src/lib/tender-document-resolver.ts";
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
import {
  buildOurEstimateDisplay,
  buildValueOrderDisplay,
  enrichKosztorysSnapshotFromPreview,
  estimatePlnFromKosztorysSnapshot,
  extractTotalValueFromAthPreview,
  mergeKosztorysValueIntoSwz,
  plnFromKosztorysSnapshot,
  sumAthPreviewRows,
} from "../src/lib/tender-cost-snapshot.ts";
import {
  TENDER_VALUE_NOT_FOUND_LABEL,
  clearCostStatusTraceLog,
  clearSsotTraceLog,
  classifyCostDocument,
  getCostStatusTraceLog,
  getSsotTraceLog,
  kosztorysHasPricedValue,
  resolveTenderValue,
  resolvedAwardCriteria,
  resolvedCostStatus,
  resolvedCostStatusDisplay,
  resolvedCostStatusLabel,
  resolvedTenderValuePln,
  traceCostStatus,
  traceSsotSnapshot,
  buildOurEstimateDisplaySsot,
} from "../src/lib/tender-data-ssot.ts";
import { assessTenderFit } from "../src/lib/tenders-bzp-fit.ts";
import { defaultCompanyProfile } from "../src/lib/tenders-bzp-company.ts";
import { computeBidPrepChecks } from "../src/lib/tenders-bid-prep.ts";
import {
  extractFormalRequirements,
  formatFormalRequirementsBullets,
  isFormalRequirementGarbage,
  FORMAL_REQUIREMENTS_UNKNOWN_LABEL,
} from "../src/lib/tender-formal-requirements.ts";

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

// P2-E.1B — wadium SSOT: percent bez wiarygodnej wartości → brak wadiumPln=6
const wadiumOnly = applyMetadataConfidence({
  ...parseSwzPlainText("Wysokość wadium: 6% wartości zamówienia.", { source: "pdf" }),
  wadiumPercent: 6,
  wadiumPln: 6,
  wadiumRaw: "6% wartości zamówienia",
  estimatedValuePln: null,
  estimatedValueRaw: null,
});
assert("wadium pln cleared without value", wadiumOnly.wadiumPln == null);
assert("wadium percent kept", wadiumOnly.wadiumPercent === 6);

// P2-E.1B — Cena 0% filtered
assert("cena 0 filtered", isFalsePositiveCriterion({ name: "Cena oferty", weightPct: 0, maxPoints: null, description: "" }));

// P2-E.1B — VAT never in reliable criteria after fit-style filter
const vatOnly = filterReliableAwardCriteria(extractAwardCriteria("VAT 8% stawka obniżona. Cena 0% w ofercie."));
assert("vat and cena0 removed", vatOnly.length === 0);

// P2-E.2 — ATH summaryLines → totalValue
const athPreview = {
  ok: false,
  format: "text",
  rows: [],
  summaryLines: [
    { label: "WARTOŚĆ CAŁKOWITA (brutto)", value: "3 200 000,00 PLN", bold: true },
  ],
  warnings: [],
};
assert("extract total from summary", extractTotalValueFromAthPreview(athPreview) === "3 200 000,00");

// P2-E.4 — ATH netto summary + row fallback
const athNettoPreview = {
  ok: true,
  format: "text",
  rows: [],
  summaryLines: [
    { label: "Kosztorys netto (suma pozycji)", value: "892 450,50 PLN", bold: true },
  ],
  warnings: [],
};
assert("p2e4 netto summary totalValue", extractTotalValueFromAthPreview(athNettoPreview) === "892 450,50");

const athRowsPreview = {
  ok: true,
  format: "text",
  rows: [
    { lp: "1", code: "", description: "A", unit: "m2", quantity: "10", unitPrice: "100,00", total: "1 000,00" },
    { lp: "2", code: "", description: "B", unit: "m2", quantity: "5", unitPrice: "200,50", total: "1 002,50" },
  ],
  summaryLines: [],
  warnings: [],
};
assert("p2e4 row sum fallback", extractTotalValueFromAthPreview(athRowsPreview) === "2 002,50");
assert("p2e4 sumAthPreviewRows", sumAthPreviewRows(athRowsPreview) === "2 002,50");

const enrichedSnap = enrichKosztorysSnapshotFromPreview(athNettoPreview, {
  ok: true,
  sourceFilename: "zip → k.ath",
  rowCount: 0,
  rows: [],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: new Date().toISOString(),
});
assert("p2e4 enriched snapshot totalValue", enrichedSnap.totalValue === "892 450,50");
const estFromSnap = estimatePlnFromKosztorysSnapshot(enrichedSnap, null, "k.ath");
assert("p2e4 estimatePln from snapshot", estFromSnap === 892451);

const athValueItem = {
  id: "p2e4v",
  tenderId: "x",
  title: "T",
  status: "new",
  submittingOffersDate: new Date().toISOString(),
  tenderDossier: {
    kosztorys: enrichedSnap,
    estimatePln: estFromSnap,
    scanSummary: {
      totalDocuments: 5,
      scanned: 5,
      parsed: 4,
      byType: { pdf: 3, docx: 0, xlsx: 0, zip: 1, ath: 1, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      kosztorysFound: true,
      valueFound: true,
      criteriaFound: false,
      estimateFound: true,
      costDiscovery: { found: true, type: "zip_ath", source: "z → k.ath", confidence: 0.95 },
      parsedAt: new Date().toISOString(),
    },
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "" },
    builtAt: new Date().toISOString(),
  },
};
assert("p2e4 resolvedTenderValuePln dossier", resolvedTenderValuePln(athValueItem, null) === 892451);

const fitFresh = assessTenderFit(athValueItem, defaultCompanyProfile());
const fitValueCheck = fitFresh.requirementChecks.find((c) => c.id === "value");
assert("p2e4 fit no stale odczytano", !fitFresh.requirementChecks.some((c) => String(c.required).includes("Nie odczytano z SWZ")));
assert("p2e4 fit value from dossier", fitValueCheck?.required.includes("892"));

const checksSsot = computeBidPrepChecks(athValueItem, parseSwzPlainText("Wadium 6%.", { source: "pdf" }), fitFresh, null);
const checklistValue = checksSsot.find((c) => c.id === "value");
assert("p2e4 ui ssot checklist value", checklistValue?.display.includes("892"));
assert("p2e4 ui ssot fit vs checklist", fitValueCheck?.required === checklistValue?.display);

const snapPln = plnFromKosztorysSnapshot({
  ok: true,
  sourceFilename: "k.ath",
  totalValue: "3 200 000,00",
  currency: "PLN",
  rowCount: 0,
  rows: [],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: new Date().toISOString(),
});
assert("snapshot pln", snapPln === 3200000);

const mergedVal = mergeKosztorysValueIntoSwz(
  parseSwzPlainText("Wadium 6% wartości zamówienia.", { source: "pdf" }),
  {
    ok: true,
    sourceFilename: "zip → k.ath",
    totalValue: "1 500 000,00",
    currency: "PLN",
    rowCount: 12,
    rows: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
  },
);
assert("merge kosztorys into swz", mergedVal.estimatedValuePln === 1500000);

// P2-E.2 — no contradictory UI messages
const estWhenKosztorys = buildOurEstimateDisplay({
  ourEstimatePln: null,
  kosztorysOk: true,
  scanSummary: { kosztorysFound: true, estimateFound: false },
});
assert("our estimate no file msg when kosztorys", !estWhenKosztorys.display.includes("Brak pliku"));

const valNoTotal = buildValueOrderDisplay({ valuePln: null, kosztorysOk: true, kosztorysHasTotal: false });
assert("value no total unified label", valNoTotal.display === TENDER_VALUE_NOT_FOUND_LABEL);

const checks = computeBidPrepChecks(
  {
    id: "t1",
    tenderId: "x",
    title: "T",
    status: "new",
    submittingOffersDate: new Date().toISOString(),
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: "z → k.ath",
        rowCount: 5,
        rows: [],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: new Date().toISOString(),
      },
      scanSummary: {
        totalDocuments: 15,
        scanned: 8,
        parsed: 6,
        byType: { pdf: 8, docx: 0, xlsx: 0, zip: 1, ath: 1, sevenZip: 0, other: 0 },
        sevenZipCount: 0,
        kosztorysFound: true,
        valueFound: false,
        criteriaFound: false,
        estimateFound: false,
        costDiscovery: { found: true, type: "zip_ath", source: "z → k.ath", confidence: 0.95 },
        parsedAt: new Date().toISOString(),
      },
      brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "" },
      builtAt: new Date().toISOString(),
    },
  },
  parseSwzPlainText("Wadium 6% wartości zamówienia.", { source: "pdf" }),
  null,
  null,
);
const kosztCheck = checks.find((c) => c.id === "kosztorys");
const bidCheck = checks.find((c) => c.id === "our-bid");
assert("checklist kosztorys ok", kosztCheck?.status === "ok");
assert("checklist bid not missing file", !bidCheck?.display.includes("Brak pliku kosztorysowego"));
assert("checklist bid no value manual", bidCheck?.display.includes("automatycznie"));

// P2-E.3 — value / cost / criteria SSOT
const baseItem = {
  id: "ssot1",
  tenderId: "x",
  title: "T",
  status: "new",
  submittingOffersDate: new Date().toISOString(),
};

const swzWithValue = applyMetadataConfidence(parseSwzPlainText(
  "Wartość zamówienia 1 500 000,00 zł. Wadium 6% wartości zamówienia. Cena — 60%. Termin realizacji — 30%.",
  { source: "pdf" },
));
assert("value_ssot swz", resolvedTenderValuePln({ ...baseItem, swzAnalysis: swzWithValue }, swzWithValue) === 1500000);
assert("value_ssot swz source", resolveTenderValue({ ...baseItem, swzAnalysis: swzWithValue }, swzWithValue).source === "swz");

const athItem = {
  ...baseItem,
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "k.ath",
      totalValue: "850 000,00",
      currency: "PLN",
      rowCount: 10,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: new Date().toISOString(),
    },
    scanSummary: { kosztorysFound: true, estimateFound: true, valueFound: true, totalDocuments: 5, scanned: 5, parsed: 4, byType: { pdf: 3, docx: 0, xlsx: 0, zip: 1, ath: 1, sevenZip: 0, other: 0 }, sevenZipCount: 0, criteriaFound: false, costDiscovery: null, parsedAt: new Date().toISOString() },
    estimatePln: 850000,
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "" },
    builtAt: new Date().toISOString(),
  },
};
assert("value_ssot ath dossier", resolvedTenderValuePln(athItem, null) === 850000);
assert("value_ssot ath display fmt", resolveTenderValue(athItem, null).display.includes("850"));

const athNoValue = {
  ...baseItem,
  tenderDossier: {
    ...athItem.tenderDossier,
    kosztorys: { ...athItem.tenderDossier.kosztorys, totalValue: undefined },
    estimatePln: null,
  },
};
assert("value_ssot ath no value label", resolveTenderValue(athNoValue, null).display === TENDER_VALUE_NOT_FOUND_LABEL);
assert("cost_ssot found_no_value", resolvedCostStatus(athNoValue) === "FOUND_NO_VALUE");
assert("cost_ssot not_found", resolvedCostStatus(baseItem) === "NOT_FOUND");

const criteriaSwz = applyMetadataConfidence({
  ...parseSwzPlainText("Kryteria oceny ofert.", { source: "pdf" }),
  awardCriteria: [{ name: "Cena", weightPct: 60 }, { name: "Termin realizacji", weightPct: 40 }],
});
assert("criteria_ssot from swz", resolvedAwardCriteria(criteriaSwz).length === 2);
assert("criteria_ssot no html fallback", resolvedAwardCriteria(null).length === 0);

const checksUi = computeBidPrepChecks(athNoValue, null, null, null);
const valueCheck = checksUi.find((c) => c.id === "value");
const kosztCheck2 = checksUi.find((c) => c.id === "kosztorys");
assert("ui_consistency value label", valueCheck?.display === TENDER_VALUE_NOT_FOUND_LABEL);
assert("ui_consistency no nie odczytano", !valueCheck?.display.includes("Nie odczytano"));
assert("ui_consistency kosztorys przedmiar", kosztCheck2?.display.includes("Przedmiar"));
assert("ui_consistency no brak pliku when found", !checksUi.find((c) => c.id === "our-bid")?.display.includes("Brak pliku kosztorysowego"));
assert("ui_consistency bid no auto estimate", checksUi.find((c) => c.id === "our-bid")?.display.includes("automatycznie"));

clearSsotTraceLog();
traceSsotSnapshot(athItem, swzWithValue);
assert("ssot trace", getSsotTraceLog().length === 1);

// P2-E.5 — cost status UX + ATH classification
const pricedAthItem = {
  ...baseItem,
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "k.ath",
      totalValue: "850 000,00",
      currency: "PLN",
      rowCount: 10,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: new Date().toISOString(),
    },
    scanSummary: {
      kosztorysFound: true,
      estimateFound: true,
      valueFound: true,
      totalDocuments: 5,
      scanned: 5,
      parsed: 4,
      byType: { pdf: 3, docx: 0, xlsx: 0, zip: 1, ath: 1, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      criteriaFound: false,
      costDiscovery: { found: true, type: "ath", source: "k.ath", confidence: 0.98 },
      parsedAt: new Date().toISOString(),
    },
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "" },
    builtAt: new Date().toISOString(),
  },
};
assert("p2e5 priced status", resolvedCostStatus(pricedAthItem) === "FOUND_WITH_VALUE");
assert("p2e5 priced label", resolvedCostStatusLabel(pricedAthItem).includes("wyceniony"));
assert("p2e5 priced classify", classifyCostDocument(pricedAthItem)?.priced === true);
assert("p2e5 has priced value", kosztorysHasPricedValue(pricedAthItem.tenderDossier.kosztorys) === true);

const tbsAthNoPrice = {
  ...baseItem,
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "Falzmanna 17-25.zip → Falzmanna 17-25.ATH",
      totalValue: "0",
      currency: "PLN",
      rowCount: 221,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: new Date().toISOString(),
    },
    scanSummary: {
      kosztorysFound: true,
      estimateFound: false,
      valueFound: false,
      totalDocuments: 15,
      scanned: 8,
      parsed: 6,
      byType: { pdf: 8, docx: 0, xlsx: 0, zip: 1, ath: 1, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      criteriaFound: false,
      costDiscovery: { found: true, type: "zip_ath", source: "Falzmanna 17-25.zip → Falzmanna 17-25.ATH", confidence: 0.98 },
      parsedAt: new Date().toISOString(),
    },
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "" },
    builtAt: new Date().toISOString(),
  },
};
assert("p2e5 tbs wk0 status", resolvedCostStatus(tbsAthNoPrice) === "FOUND_NO_VALUE");
assert("p2e5 tbs wk0 not with value", resolvedCostStatus(tbsAthNoPrice) !== "FOUND_WITH_VALUE");
const tbsUi = resolvedCostStatusDisplay(tbsAthNoPrice);
assert("p2e5 tbs przedmiar label", tbsUi.display.includes("Przedmiar ATH") && tbsUi.display.includes("221"));
assert("p2e5 tbs hint brak cen", tbsUi.hint?.includes("Brak cen"));
const tbsClass = classifyCostDocument(tbsAthNoPrice);
assert("p2e5 tbs classify", tbsClass?.type === "ATH" && tbsClass.priced === false && tbsClass.rowCount === 221);
const tbsEstimate = buildOurEstimateDisplaySsot({ item: tbsAthNoPrice });
assert("p2e5 tbs estimate msg", tbsEstimate.display.includes("automatycznie"));
assert("p2e5 tbs estimate hint", tbsEstimate.hint?.includes("cen jednostkowych"));
assert("p2e5 zero total not priced", kosztorysHasPricedValue(tbsAthNoPrice.tenderDossier.kosztorys) === false);

clearCostStatusTraceLog();
traceCostStatus("FOUND_NO_VALUE", tbsClass, "0");
assert("p2e5 cost status trace", getCostStatusTraceLog()[0]?.detail?.status === "FOUND_NO_VALUE");

const tbsChecks = computeBidPrepChecks(tbsAthNoPrice, null, null, null);
const tbsKoszt = tbsChecks.find((c) => c.id === "kosztorys");
const tbsBid = tbsChecks.find((c) => c.id === "our-bid");
assert("p2e5 ui kosztorys przedmiar", tbsKoszt?.display.includes("Przedmiar ATH"));
assert("p2e5 ui no kosztorys znaleziony generic", !tbsKoszt?.display.includes("Kosztorys znaleziony"));
assert("p2e5 ui bid no auto", tbsBid?.display.includes("automatycznie"));
assert("p2e5 ui not found", resolvedCostStatus(baseItem) === "NOT_FOUND");
assert("p2e5 not found label", resolvedCostStatusLabel(baseItem).includes("Nie znaleziono"));

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
  kosztorysFound: true,
  estimateFound: false,
});
assert("estimate reason kosztorys no file", !estReason.includes("Brak pliku kosztorysowego"));
assert("estimate reason no auto", estReason.includes("automatycznie"));

const estReason7z = buildEstimateMissingReason({
  ...summary,
  byType: { pdf: 8, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 2, other: 5 },
});
assert("estimate reason 7z", estReason7z.includes("7Z"));

// P2-F.0 — formal requirements extraction
const swzLicense = extractFormalRequirements(
  "Warunki udziału w postępowaniu. Wykonawca musi dysponować minimum jedną osobą z uprawnieniami budowlanymi.",
);
assert("p2f0 license budowlane", swzLicense.some((r) => r.type === "license" && r.label === "Uprawnienia budowlane"));

const swzPiib = extractFormalRequirements(
  "Zdolność zawodowa. Wykonawca wskaże osobę będącą członkiem Izby Inżynierów Budownictwa.",
);
assert("p2f0 membership piib", swzPiib.some((r) => r.type === "membership" && /PIIB|izby inżynierów/i.test(r.label)));

const swzPersonnel = extractFormalRequirements(
  "Osoby skierowane do realizacji: kierownik robót elektrycznych z uprawnieniami SEP.",
);
assert("p2f0 personnel elektr", swzPersonnel.some((r) => r.type === "personnel" && r.label.includes("elektrycznych")));

assert("p2f0 garbage truncated", isFormalRequirementGarbage("uprawnienia budowlane 12"));
assert("p2f0 garbage zamawiajacy", isFormalRequirementGarbage("uprawnieniem Zamawiającego do wglądu"));
assert("p2f0 garbage czlonkostwo", isFormalRequirementGarbage("i będąca członkiem 1"));
assert("p2f0 garbage numeracja", isFormalRequirementGarbage("12."));

const tbsGarbageSwz = `
Warunki udziału w postępowaniu
uprawnienia budowlane 12
uprawnieniem Zamawiającego do wglądu w dokumenty
wobec którego wykonawca nie może rościć
i będąca członkiem 1
Kryteria oceny ofert
`;
const tbsFormal = extractFormalRequirements(tbsGarbageSwz);
assert("p2f0 tbs no garbage reqs", tbsFormal.length === 0);
const tbsParsed = parseSwzPlainText(tbsGarbageSwz, { source: "pdf" });
assert("p2f0 tbs parse no hints garbage", !(tbsParsed.qualificationHints ?? []).some((h) => /budowlane 12|Zamawiającego/i.test(h)));

const swzRich = parseSwzPlainText(
  "Warunki udziału. Minimum jedna osoba z uprawnieniami budowlanymi oraz członek Izby Inżynierów Budownictwa. Kierownik robót sanitarnych.",
  { source: "pdf" },
);
assert("p2f0 parse formalRequirements", (swzRich.formalRequirements?.length ?? 0) >= 2);
const bullets = formatFormalRequirementsBullets(swzRich.formalRequirements ?? []);
assert("p2f0 bullets format", bullets.startsWith("• ") && !bullets.includes("Wymaga:"));

const fitItem = {
  id: "p2f0-fit",
  title: "Test formal",
  organizationName: "TBS",
  cpvCode: "45211341-1",
  submittingOffersDate: "2026-12-01T00:00:00Z",
  publicationDate: "2026-06-01T00:00:00Z",
  status: "new",
  swzAnalysis: swzRich,
};
const fit = assessTenderFit(fitItem, defaultCompanyProfile());
const qualCheck = fit.requirementChecks.find((c) => c.id === "qualifications");
assert("p2f0 fit qualifications check", qualCheck != null);
assert("p2f0 fit required bullets", qualCheck?.required.includes("•"));
assert("p2f0 fit no raw garbage", !qualCheck?.required.includes("budowlane 12"));

const fitUnknown = assessTenderFit(
  { ...fitItem, swzAnalysis: tbsParsed },
  defaultCompanyProfile(),
);
const qualUnknown = fitUnknown.requirementChecks.find((c) => c.id === "qualifications");
assert("p2f0 fit unknown fallback", qualUnknown?.required === FORMAL_REQUIREMENTS_UNKNOWN_LABEL || qualUnknown == null);

// HOTFIX — parseTenderDossierDocuments musi mieć import roleContributesMetadata (P2-E.1 path)
let dossierPipelineErr = null;
try {
  await parseTenderDossierDocuments("hotfix-role-metadata", [{
    index: 0,
    documentId: "swz-0",
    filename: "SWZ.pdf",
    contentType: "application/pdf",
    downloadUrl: "",
    isSwzHint: true,
  }]);
} catch (e) {
  dossierPipelineErr = e;
}
assert("hotfix roleContributesMetadata no ReferenceError", !(dossierPipelineErr instanceof ReferenceError));
assert(
  "hotfix analizuj swz dossier pipeline",
  dossierPipelineErr == null
    || !String(dossierPipelineErr.message ?? "").includes("roleContributesMetadata is not defined"),
);

// trace
clearDossierTraceLog();
traceDossierPipeline("document_discovered", "SWZ.pdf", { role: "swz" });
traceDossierPipeline("document_parsed", "STWIOR.pdf", { swz: true });
assert("trace entries", getDossierTraceLog().length === 2);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
