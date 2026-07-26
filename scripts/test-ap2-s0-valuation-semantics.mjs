/**
 * AP2-S0 — semantyka przedmiaru / brak kosztorysu ≠ błąd
 * npx vite-node scripts/test-ap2-s0-valuation-semantics.mjs
 */
import assert from "node:assert/strict";
import {
  canPrepareValuation,
  resolvedCostStatus,
  resolvedCostStatusDisplay,
  KOSZTORYS_NOT_PROVIDED_LABEL,
  PRZEDMIAR_VALUATION_READY_LABEL,
} from "../src/lib/tender-data-ssot.ts";
import { buildTenderTrustAssessment, findTrustDimension } from "../src/lib/tender-trust-layer.ts";
import { applyTenderIntelligenceOverlay } from "../src/lib/tender-intelligence-overlay.ts";
import { buildOwnerDecisionView } from "../src/lib/tender-owner-view-ux.ts";
import { DECISION_LABEL_PL } from "../src/lib/tenders-strategy-decision.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { canComputeTenderPricingAuto } from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";
import { sevenZKosztorysMissingLine, buildKosztorysStatusLine } from "../src/lib/tender-dossier-pipeline.ts";
import { deriveKosztorysProcessPhase } from "../src/lib/tender-kosztorys-process-phase.ts";

const FIXED_AT = "2026-07-26T12:00:00.000Z";

function baseItem(overrides = {}) {
  return {
    id: "ap2-s0",
    tenderId: "tid-ap2-s0",
    title: "Remont — przedmiar bez kosztorysu",
    noticeNumber: "2026/BZP 0001",
    status: "watching",
    relevanceScore: 50,
    addedAt: FIXED_AT,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [
      { filename: "przedmiar.pdf", url: "https://x/p.pdf", documentIndex: 0 },
      { filename: "SWZ.pdf", url: "https://x/swz.pdf", documentIndex: 1 },
      { filename: "OPZ.pdf", url: "https://x/opz.pdf", documentIndex: 2 },
    ],
    documentsFetchedAt: FIXED_AT,
    ...overrides,
  };
}

function dossierNoValue() {
  return {
    brief: { fields: [], scopeDescription: "test", builtAt: FIXED_AT },
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar.pdf",
      rowCount: 24,
      rows: [{ lp: "1", description: "KNR 1", unit: "m2", quantity: "10" }],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
      totalValue: undefined,
      currency: "PLN",
    },
    scanSummary: {
      totalDocuments: 3,
      scanned: 3,
      parsed: 3,
      byType: { pdf: 3, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      kosztorysFound: true,
      valueFound: false,
      criteriaFound: false,
      estimateFound: false,
      costDiscovery: { found: true, type: "pdf_przedmiar", source: "przedmiar.pdf", confidence: 0.85 },
      parsedAt: FIXED_AT,
    },
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: FIXED_AT,
  };
}

function dossierNotFound() {
  return {
    brief: { fields: [], scopeDescription: "test", builtAt: FIXED_AT },
    kosztorys: null,
    scanSummary: {
      totalDocuments: 3,
      scanned: 3,
      parsed: 3,
      byType: { pdf: 3, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      kosztorysFound: false,
      valueFound: false,
      criteriaFound: false,
      estimateFound: false,
      costDiscovery: null,
      parsedAt: FIXED_AT,
    },
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: FIXED_AT,
  };
}

// --- canPrepareValuation ---
{
  const item = baseItem({ tenderDossier: dossierNoValue() });
  assert.equal(resolvedCostStatus(item), "FOUND_NO_VALUE");
  assert.equal(canPrepareValuation(item), true);
  const ui = resolvedCostStatusDisplay(item);
  assert.equal(ui.display, PRZEDMIAR_VALUATION_READY_LABEL);
  assert.ok(ui.hint?.includes("nie udostępnił") || ui.hint?.includes(KOSZTORYS_NOT_PROVIDED_LABEL.slice(0, 20)));
}

{
  const item = baseItem({ tenderDossier: dossierNotFound() });
  assert.equal(resolvedCostStatus(item), "NOT_FOUND");
  assert.equal(canPrepareValuation(item), false);
  assert.equal(resolvedCostStatusDisplay(item).display, KOSZTORYS_NOT_PROVIDED_LABEL);
}

// --- Trust: NOT_FOUND ≠ error/blocked ---
{
  const item = baseItem({ tenderDossier: dossierNotFound() });
  const a = buildTenderTrustAssessment({ item, computedAt: FIXED_AT });
  const k = findTrustDimension(a, "kosztorys");
  assert.equal(k?.level, "partial");
  assert.ok(k?.reasons.every((r) => r.severity !== "error"));
  assert.ok(k?.reasons.some((r) => r.code === "kosztorys_not_provided"));
  const p = findTrustDimension(a, "pricing");
  assert.notEqual(p?.level, "blocked");
}

// --- Trust: FOUND_NO_VALUE → przedmiar ready ---
{
  const item = baseItem({ tenderDossier: dossierNoValue() });
  const a = buildTenderTrustAssessment({ item, computedAt: FIXED_AT });
  const k = findTrustDimension(a, "kosztorys");
  assert.equal(k?.level, "partial");
  assert.ok(k?.reasons.some((r) => r.code === "przedmiar_valuation_ready"));
  assert.ok(k?.reasons.every((r) => r.severity !== "error"));
}

// --- Confidence: nie force-low wyłącznie z braku kosztorysu przy bogatych docs+przedmiar ---
{
  const item = baseItem({
    tenderDossier: dossierNoValue(),
    swzAnalysis: { source: "pdf", parsedAt: FIXED_AT, awardCriteria: [] },
    noticeHtml: "<p>" + "x".repeat(100) + "</p>",
  });
  const bundle = {
    item,
    opportunity: { score: 70, label: "WYSOKA", reasons: ["+ test"] },
    strategic: { score: 65, label: "SILNA", reasons: ["+ test"] },
    decision: "HOLD",
    decisionLabel: DECISION_LABEL_PL.HOLD,
    compositeRank: 1,
  };
  const overlay = applyTenderIntelligenceOverlay({
    bundle,
    decisionView: buildOwnerDecisionView(bundle),
    ownerFinanceProposal: null,
    item,
  });
  assert.notEqual(overlay.confidence, "low", "przedmiar + docs → confidence ≠ low");
}

// --- Pricing Gate UNCHANGED (S6 OUT) ---
{
  const notFound = baseItem({ tenderDossier: dossierNotFound() });
  assert.equal(
    canComputeTenderPricingAuto({ partialDossierReady: false, item: notFound }),
    false,
    "Pricing Gate nadal blokuje NOT_FOUND",
  );
  const noValue = baseItem({ tenderDossier: dossierNoValue() });
  assert.equal(
    canComputeTenderPricingAuto({ partialDossierReady: true, item: noValue }),
    true,
    "FOUND_NO_VALUE nadal pozwala Pricing Gate",
  );
}

// --- Copy 7Z / status / E10 ---
{
  const line = sevenZKosztorysMissingLine({
    sevenZipCount: 1,
    kosztorysFound: false,
    byType: { ath: 0, xlsx: 0, pdf: 1, docx: 0, zip: 0, sevenZip: 1, other: 0 },
    sevenZUnpackOk: true,
    sevenZInnerCount: 3,
  });
  assert.ok(line?.includes("nie udostępnił") || line?.includes("Zamawiający"));
  assert.ok(!line?.toLowerCase().includes("nie znaleziono kosztorysu ath"));
  assert.ok(buildKosztorysStatusLine({
    kosztorysFound: false,
    sevenZipCount: 0,
    byType: { ath: 0, xlsx: 0, pdf: 1, docx: 0, zip: 0, sevenZip: 0, other: 0 },
  }).includes("nie udostępnił") || buildKosztorysStatusLine({
    kosztorysFound: false,
    sevenZipCount: 0,
    byType: { ath: 0, xlsx: 0, pdf: 1, docx: 0, zip: 0, sevenZip: 0, other: 0 },
  }).includes("Zamawiający"));
}

{
  const item = baseItem({ tenderDossier: dossierNotFound() });
  const phase = deriveKosztorysProcessPhase(item, { lazyEnabled: true });
  assert.equal(phase.id, "not_found");
  assert.ok(phase.label.toLowerCase().includes("nie udostępnił") || phase.label.toLowerCase().includes("inwestorskiego"));
  assert.notEqual(phase.tone, "error");
}

console.log("AP2-S0 valuation semantics — ALL PASS");
