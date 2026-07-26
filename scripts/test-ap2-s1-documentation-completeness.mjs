/**
 * AP2-S1 — documentation completeness + roles + valuation readiness
 * npx vite-node scripts/test-ap2-s1-documentation-completeness.mjs
 */
import assert from "node:assert/strict";
import {
  classifyDocumentRole,
  classifyDocumentRoleWithHints,
  DOCUMENT_ROLE_LABEL_PL,
} from "../src/lib/tender-document-role.ts";
import {
  buildDocumentationCompleteness,
  presenceSymbol,
} from "../src/lib/tender-documentation-completeness.ts";
import { buildTenderDocumentsTabSummary } from "../src/lib/tender-documents-tab-summary.ts";
import { canComputeTenderPricingAuto } from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";

const FIXED = "2026-07-26T18:00:00.000Z";

function baseItem(overrides = {}) {
  return {
    id: "ap2-s1",
    tenderId: "tid-s1",
    title: "Remont budynku",
    noticeNumber: "2026/BZP 100",
    status: "watching",
    relevanceScore: 50,
    addedAt: FIXED,
    documentsFetchedAt: FIXED,
    bzpDocuments: [
      { filename: "SWZ.pdf", url: "https://x/swz", documentIndex: 0, isSwzHint: true },
      { filename: "OPZ.pdf", url: "https://x/opz", documentIndex: 1 },
      { filename: "STWiOR.pdf", url: "https://x/st", documentIndex: 2 },
      { filename: "Przedmiar_robót.pdf", url: "https://x/pr", documentIndex: 3 },
      { filename: "Projekt_wykonawczy.pdf", url: "https://x/pw", documentIndex: 4 },
      { filename: "Rysunek_rzut_parter.pdf", url: "https://x/r", documentIndex: 5 },
      { filename: "Wzor_umowy.pdf", url: "https://x/u", documentIndex: 6 },
      { filename: "Formularz_ofertowy.xlsx", url: "https://x/f", documentIndex: 7 },
      { filename: "Oswiadczenie_JEDZ.pdf", url: "https://x/o", documentIndex: 8 },
      { filename: "Zmiana_SWZ_nr1.pdf", url: "https://x/z", documentIndex: 9 },
      { filename: "Aneks_1.pdf", url: "https://x/a", documentIndex: 10 },
      { filename: "Odpowiedzi_na_pytania.pdf", url: "https://x/q", documentIndex: 11 },
    ],
    ...overrides,
  };
}

// --- Role expansion ---
assert.equal(classifyDocumentRole("Projekt_wykonawczy.pdf"), "projekt_wykonawczy");
assert.equal(classifyDocumentRole("Projekt_budowlany.pdf"), "projekt_budowlany");
assert.equal(classifyDocumentRole("Rysunek_rzut.pdf"), "rysunki");
assert.equal(classifyDocumentRole("plan.dwg"), "rysunki");
assert.equal(classifyDocumentRole("Wzor_umowy.pdf"), "umowa");
assert.equal(classifyDocumentRole("Oswiadczenie_JEDZ.pdf"), "oswiadczenia");
assert.equal(classifyDocumentRole("Aneks_2.pdf"), "aneks");
assert.equal(classifyDocumentRole("Odpowiedzi_na_pytania_wykonawcow.pdf"), "odpowiedzi_pytania");
assert.equal(classifyDocumentRole("Zmiana_SWZ.pdf"), "swz_modification");
assert.equal(classifyDocumentRole("Kosztorys_ofertowy.xlsx"), "kosztorys_ofertowy");
assert.equal(classifyDocumentRole("SWZ.pdf"), "swz");
assert.ok(DOCUMENT_ROLE_LABEL_PL.projekt_wykonawczy.includes("Projekt"));

// Content hints upgrade
assert.equal(
  classifyDocumentRoleWithHints("zalacznik3.pdf", {
    costDiscoverySource: "zalacznik3.pdf",
    przedmiarParsed: true,
    costDiscoveryType: "pdf_przedmiar",
  }),
  "przedmiar",
);

// --- Completeness view ---
{
  const item = baseItem({
    tenderDossier: {
      brief: { fields: [], scopeDescription: "x", builtAt: FIXED },
      kosztorys: {
        ok: true,
        sourceFilename: "Przedmiar_robót.pdf",
        rowCount: 40,
        rows: [],
        categories: [
          { name: "Instalacje sanitarne", total: "" },
          { name: "Roboty budowlane", total: "" },
        ],
        przedmiar: [],
        warnings: [],
        parsedAt: FIXED,
        currency: "PLN",
      },
      scanSummary: {
        totalDocuments: 12,
        scanned: 12,
        parsed: 8,
        byType: { pdf: 10, docx: 0, xlsx: 1, zip: 0, ath: 0, sevenZip: 0, other: 1 },
        sevenZipCount: 0,
        kosztorysFound: true,
        valueFound: false,
        criteriaFound: false,
        estimateFound: false,
        costDiscovery: {
          found: true,
          type: "pdf_przedmiar",
          source: "Przedmiar_robót.pdf",
          confidence: 0.8,
        },
        parsedAt: FIXED,
      },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: FIXED,
    },
    swzAnalysis: { source: "pdf", parsedAt: FIXED, awardCriteria: [] },
  });

  const view = buildDocumentationCompleteness({ item, swz: item.swzAnalysis });
  assert.equal(view.slots.length, 14);
  assert.equal(view.slots.find((s) => s.id === "swz")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "opz")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "stwior")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "przedmiar")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "projekt")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "rysunki")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "umowa")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "zmiany_swz")?.presence, "found");
  assert.equal(view.slots.find((s) => s.id === "aneksy")?.presence, "found");
  // brak cen → kosztorys N/A / nieudostępniony
  const k = view.slots.find((s) => s.id === "kosztorys_inwestorski");
  assert.ok(k?.presence === "not_applicable" || k?.presence === "not_found");
  assert.equal(presenceSymbol("not_applicable"), "ℹ️");
  assert.equal(view.valuationReadiness.level, "ready");
  assert.ok(view.stats.branchCount >= 2);
  assert.ok(view.stats.przedmiarRowCount === 40);
  assert.ok(view.highlights.found.includes("SWZ"));

  const summary = buildTenderDocumentsTabSummary({ item, swz: item.swzAnalysis });
  assert.ok(summary.completeness);
  assert.equal(summary.completeness.valuationReadiness.level, "ready");
}

// Insufficient without przedmiar
{
  const item = baseItem({
    bzpDocuments: [{ filename: "SWZ.pdf", url: "https://x", documentIndex: 0, isSwzHint: true }],
    tenderDossier: null,
  });
  const view = buildDocumentationCompleteness({ item });
  assert.equal(view.valuationReadiness.level, "insufficient");
}

// Pricing Gate unchanged
{
  const item = baseItem({ tenderDossier: null });
  assert.equal(
    canComputeTenderPricingAuto({ partialDossierReady: false, item }),
    false,
  );
}

console.log("AP2-S1 documentation completeness — ALL PASS");
