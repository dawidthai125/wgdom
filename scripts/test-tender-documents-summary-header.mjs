/**
 * Document Summary Header — zakładka Dokumenty (SSOT agregat).
 * npx vite-node scripts/test-tender-documents-summary-header.mjs
 */
import assert from "node:assert/strict";
import {
  buildTenderDocumentsTabSummary,
  formatDocumentsTabLastAnalysisLabel,
  mapAnalysisStepStateLabel,
} from "../src/lib/tender-documents-tab-summary.ts";

const NOW = new Date("2026-06-25T14:00:00.000Z");

function emptyItem(overrides = {}) {
  return {
    id: "t1",
    title: "Remont",
    organizationName: "WM",
    organizationCity: "Wrocław",
    bzpNumber: "BZP-1",
    submittingOffersDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    publicationDate: "2026-06-01",
    status: "new",
    relevanceScore: 10,
    isWroclaw: true,
    bzpDocuments: [],
    ...overrides,
  };
}

// --- Brak danych ---
const empty = buildTenderDocumentsTabSummary({ item: emptyItem(), now: NOW });
assert.equal(empty.swz.value, "Brak");
assert.equal(empty.przedmiarAth.value, "Brak");
assert.equal(empty.kosztorys.value, "Brak");
assert.equal(empty.umowa.value, "Brak");
assert.equal(empty.formularz.value, "Brak");
assert.equal(empty.lastAnalysisLabel, "Brak analizy");
assert.equal(empty.processReadiness.find((r) => r.id === "documents")?.state, "missing");

const awaitingFetch = buildTenderDocumentsTabSummary({
  item: emptyItem({ tenderId: "bz-1" }),
  now: NOW,
});
assert.equal(awaitingFetch.processReadiness.find((r) => r.id === "documents")?.state, "pending");

// --- SWZ ---
const swzDetected = buildTenderDocumentsTabSummary({
  item: emptyItem({
    bzpDocuments: [{ index: 0, filename: "SWZ_2026.pdf", isSwzHint: true, contentType: "application/pdf" }],
  }),
  now: NOW,
});
assert.equal(swzDetected.swz.value, "Wykryty");

const swzAnalyzed = buildTenderDocumentsTabSummary({
  item: emptyItem({
    bzpDocuments: [{ index: 0, filename: "SWZ_2026.pdf", isSwzHint: true, contentType: "application/pdf" }],
  }),
  swz: {
    parsedAt: "2026-06-25T13:58:00.000Z",
    source: "pdf",
    profitabilityHint: "neutral",
    awardCriteria: [],
    formalRequirements: [],
  },
  now: NOW,
});
assert.equal(swzAnalyzed.swz.value, "Przeanalizowany");
assert.equal(swzAnalyzed.lastAnalysisLabel, "2 min temu");
assert.equal(formatDocumentsTabLastAnalysisLabel(
  emptyItem({
    bzpDocuments: [{ index: 0, filename: "SWZ_2026.pdf", isSwzHint: true, contentType: "application/pdf" }],
  }),
  {
    parsedAt: "2026-06-25T13:58:00.000Z",
    source: "pdf",
    profitabilityHint: "neutral",
    awardCriteria: [],
    formalRequirements: [],
  },
  NOW,
), "2 min temu");

// --- ATH / Przedmiar ---
const przedmiarItem = emptyItem({
  bzpDocuments: [{ index: 0, filename: "przedmiar.ath", contentType: "application/octet-stream" }],
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar.ath",
      sourceDocumentIndex: 0,
      totalValue: "0",
      currency: "PLN",
      rowCount: 142,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-06-25T12:00:00.000Z",
    },
    scanSummary: { kosztorysFound: true },
  },
});
const przedmiar = buildTenderDocumentsTabSummary({ item: przedmiarItem, now: NOW });
assert.ok(przedmiar.przedmiarAth.value.includes("142 pozycji"));
assert.ok(przedmiar.przedmiarAth.value.includes("Bez cen"));
assert.equal(przedmiar.kosztorys.value, "Brak");

const athDetectedOnly = buildTenderDocumentsTabSummary({
  item: emptyItem({
    bzpDocuments: [{ index: 0, filename: "kosztorys.ath", contentType: "application/octet-stream" }],
  }),
  now: NOW,
});
assert.equal(athDetectedOnly.przedmiarAth.value, "Wykryty");

// --- Kosztorys gotowy ---
const kosztorysItem = emptyItem({
  bzpDocuments: [{ index: 0, filename: "Kosztorys.pdf", contentType: "application/pdf" }],
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "Kosztorys.pdf",
      sourceDocumentIndex: 0,
      totalValue: "500000",
      currency: "PLN",
      rowCount: 87,
      rows: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-06-25T11:00:00.000Z",
    },
    scanSummary: { kosztorysFound: true },
  },
});
const kosztorys = buildTenderDocumentsTabSummary({ item: kosztorysItem, now: NOW });
assert.equal(kosztorys.kosztorys.value, "Gotowy · 87 pozycji");
assert.ok(kosztorys.przedmiarAth.value.includes("Z cenami"));

// --- Umowa ---
const umowa = buildTenderDocumentsTabSummary({
  item: emptyItem({
    bzpDocuments: [{ index: 0, filename: "Wzor_umowy.pdf", contentType: "application/pdf" }],
  }),
  now: NOW,
});
assert.equal(umowa.umowa.value, "Wykryta");

// --- Formularz ---
const formularz = buildTenderDocumentsTabSummary({
  item: emptyItem({
    bzpDocuments: [{ index: 0, filename: "Formularz_ofertowy.docx", contentType: "application/vnd.openxmlformats" }],
  }),
  now: NOW,
});
assert.equal(formularz.formularz.value, "Wykryty");

// --- Gotowość procesu ---
const withDocs = buildTenderDocumentsTabSummary({
  item: emptyItem({
    bzpDocuments: [{ index: 0, filename: "zal.pdf", contentType: "application/pdf" }],
    documentsFetchedAt: "2026-06-25T10:00:00.000Z",
  }),
  now: NOW,
});
assert.equal(withDocs.processReadiness.find((r) => r.id === "documents")?.state, "ready");
assert.equal(mapAnalysisStepStateLabel("ready"), "Gotowe");
assert.equal(mapAnalysisStepStateLabel("pending"), "W toku");

console.log("test-tender-documents-summary-header.mjs — PASS");
