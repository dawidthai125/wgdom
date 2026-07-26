/**
 * P3-UX-001 / P3-UX-003 — smoke komunikatów stanu analizy (bez sieci).
 */
import assert from "node:assert/strict";
import {
  isKosztorysAwaitingHeavyParse,
  isPricingAwaitingLazyEvaluation,
  buildTenderAnalysisStatusRows,
} from "../src/lib/tender-analysis-status-ux.ts";
import { resolvedCostStatusDisplay } from "../src/lib/tender-data-ssot.ts";

const baseItem = {
  id: "t1",
  tenderId: "tid-1",
  title: "Test",
  bzpNumber: "BZP/1",
  noticeNumber: "2026-001",
  status: "watching",
  relevanceScore: 50,
  addedAt: new Date().toISOString(),
  ezamowieniaUrl: "https://example.com",
};

const withDocsNotParsed = {
  ...baseItem,
  bzpDocuments: [{ filename: "kosztorys.7z", url: "https://x", documentIndex: 0 }],
  tenderDossier: {
    brief: { scopeDescription: "test" },
    kosztorys: null,
    builtAt: new Date().toISOString(),
  },
};

assert.equal(isKosztorysAwaitingHeavyParse(withDocsNotParsed), true);
const awaitingUi = resolvedCostStatusDisplay(withDocsNotParsed);
assert.equal(awaitingUi.display, "Gotowe do analizy");
assert.ok(awaitingUi.hint?.includes("analiz"));

const parsedNoKosztorys = {
  ...withDocsNotParsed,
  tenderDossier: {
    ...withDocsNotParsed.tenderDossier,
    parserVersion: 4,
    scanSummary: { parsedAt: new Date().toISOString(), kosztorysFound: false, estimateFound: false },
  },
};
assert.equal(isKosztorysAwaitingHeavyParse(parsedNoKosztorys), false);
assert.equal(resolvedCostStatusDisplay(parsedNoKosztorys).display, "Zamawiający nie udostępnił kosztorysu inwestorskiego.");

const noDocs = { ...baseItem, bzpDocuments: [] };
assert.equal(isKosztorysAwaitingHeavyParse(noDocs), false);

const rowsNew = buildTenderAnalysisStatusRows({
  item: withDocsNotParsed,
  bidProposal: null,
});
assert.equal(rowsNew.find((r) => r.id === "kosztorys")?.state, "pending");
assert.equal(rowsNew.find((r) => r.id === "pricing")?.state, "pending");

const withKosztorys = {
  ...baseItem,
  bzpDocuments: [{ filename: "a.ath", url: "https://x", documentIndex: 0 }],
  tenderDossier: {
    brief: {},
    parserVersion: 4,
    kosztorys: { ok: true, filename: "a.ath", rowCount: 10, totalValue: null, currency: "PLN" },
    builtAt: new Date().toISOString(),
    scanSummary: { parsedAt: new Date().toISOString(), kosztorysFound: true, estimateFound: false },
  },
};
assert.equal(isPricingAwaitingLazyEvaluation(withKosztorys, null, undefined, true), true);
assert.equal(isPricingAwaitingLazyEvaluation(withKosztorys, null, undefined, false), false);
const rowsLazyPrice = buildTenderAnalysisStatusRows({ item: withKosztorys, bidProposal: null });
assert.equal(rowsLazyPrice.find((r) => r.id === "kosztorys")?.state, "ready");
assert.equal(rowsLazyPrice.find((r) => r.id === "pricing")?.state, "warn");

console.log("P3-UX analysis status: ALL PASS");
