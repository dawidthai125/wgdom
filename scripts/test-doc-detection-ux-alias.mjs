/**
 * AI-DOC-DETECTION — aliasy Doc.D1 + copy UX_A–D
 * npx vite-node scripts/test-doc-detection-ux-alias.mjs
 */
import assert from "node:assert/strict";
import {
  DOC_DETECTION_ALIAS_VERSION,
  DOC_DETECTION_COPY_VERSION,
  DOC_DETECTION_UX_A_LABEL,
  DOC_DETECTION_UX_B_LABEL,
  DOC_DETECTION_UX_C_CANDIDATE_LABEL,
  DOC_DETECTION_UX_D_LABEL,
  DOC_LAYER_LABEL_PL,
  foldDocDetectionFilename,
  hasDocD1CostFilenameHint,
  isDocD1PdfFilename,
  mapDossierKosztorysPresentation,
  matchesDocD1NewAlias,
} from "../src/lib/doc-detection/index.ts";
import { classifyDocumentRole } from "../src/lib/tender-document-role.ts";
import {
  classifyCostDocumentType,
  isFormalOfferCostFilename,
  isPdfPrzedmiarCostFilename,
} from "../src/lib/tender-cost-discovery.ts";
import {
  resolveCostRegressionF2Presentation,
  resolveCostRegressionF2UiCopy,
} from "../src/lib/cost-regression-f2.ts";

assert.equal(DOC_DETECTION_ALIAS_VERSION, "doc-detection-alias-1");
assert.equal(DOC_DETECTION_COPY_VERSION, "doc-detection-ux-1");
assert.equal(DOC_LAYER_LABEL_PL.D1, "Przedmiar");
assert.equal(DOC_LAYER_LABEL_PL.D2, "Dokumenty wspierające");
assert.equal(DOC_LAYER_LABEL_PL.D3, "Kosztorys ofertowy");

// --- T1 aliases PDF / XLSX ---
assert.equal(isDocD1PdfFilename("BOQ.pdf"), true);
assert.equal(isPdfPrzedmiarCostFilename("BOQ.pdf"), true);
assert.equal(classifyCostDocumentType("BOQ.pdf").type, "pdf_przedmiar");
assert.equal(isDocD1PdfFilename("Bill_of_Quantities.pdf"), true);
assert.equal(hasDocD1CostFilenameHint("Bill_of_Quantities.xlsx"), true);
assert.equal(classifyCostDocumentType("Bill_of_Quantities.xlsx").type, "xlsx");

// --- T2 kosztorys ślepy ---
assert.equal(isDocD1PdfFilename("Kosztorys_slepy.pdf"), true);
assert.equal(matchesDocD1NewAlias(foldDocDetectionFilename("Kosztorys_ślepy.pdf")), true);
assert.equal(classifyDocumentRole("Kosztorys_slepy.pdf"), "przedmiar");

// --- Tip przedmiar/obmiar/ATH ---
assert.equal(isPdfPrzedmiarCostFilename("przedmiar_robot.pdf"), true);
assert.equal(isPdfPrzedmiarCostFilename("obmiar.pdf"), true);
assert.equal(classifyCostDocumentType("plik.ath").type, "ath");

// --- T3 UX_A ---
{
  const c = resolveCostRegressionF2UiCopy("no_candidate");
  assert.equal(c.phaseLabelPl, DOC_DETECTION_UX_A_LABEL);
  assert.ok(!/Brak odczytanego kosztorysu/.test(c.phaseLabelPl));
}

// --- T5 UX_C candidate ---
{
  const c = resolveCostRegressionF2UiCopy("candidate_ready", { fileCandidate: true });
  assert.equal(c.phaseLabelPl, DOC_DETECTION_UX_C_CANDIDATE_LABEL);
  assert.ok(!/\bkosztorysu\b/i.test(c.phaseLabelPl));
}

// --- T4 UX_B via presentation CASE 3 ---
{
  const item = {
    id: "t1",
    title: "t",
    tenderDossier: {
      kosztorys: {
        ok: false,
        pdfPrzedmiarCase: 3,
        rowCount: 0,
        rows: [],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: "",
        sourceFilename: "scan.pdf",
      },
      scanSummary: { pdfPrzedmiarCase: 3 },
    },
    uploadedFile: { filename: "przedmiar_scan.pdf" },
    bzpDocuments: [],
  };
  const p = resolveCostRegressionF2Presentation({ item, dossierParseFailed: true });
  assert.ok(p);
  assert.equal(p.phaseLabelPl, DOC_DETECTION_UX_B_LABEL);
}

// --- T6 UX_D constant ---
assert.equal(DOC_DETECTION_UX_D_LABEL, "Brak kosztorysu ofertowego");

// --- T7 formularz OUT ---
assert.equal(isFormalOfferCostFilename("Formularz oferty.xlsx"), true);
assert.equal(classifyCostDocumentType("Formularz oferty.xlsx").type, "none");
assert.equal(classifyDocumentRole("Formularz ofertowy.docx"), "formularz");

// --- dossier presentation ---
{
  const withVal = mapDossierKosztorysPresentation("FOUND_WITH_VALUE");
  assert.equal(withVal.primaryLayer, "D1");
  assert.ok(withVal.supportingLabelPl?.includes("inwestorski"));
  const noVal = mapDossierKosztorysPresentation("FOUND_NO_VALUE");
  assert.equal(noVal.primaryLabelPl, "Przedmiar");
  assert.equal(noVal.supportingLabelPl, null);
}

console.log("test-doc-detection-ux-alias: ALL PASS");
