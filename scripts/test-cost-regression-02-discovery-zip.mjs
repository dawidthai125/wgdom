/**
 * COST-REGRESSION-02 DISCOVERY-ZIP — AC-02-1…AC-02-10 (pure).
 * Run: npx vite-node scripts/test-cost-regression-02-discovery-zip.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canRetryCostRegressionF2Parse,
  hasArchiveCandidate,
  hasFilePrzedmiarCandidate,
  hasPrzedmiarCandidate,
  isArchiveCandidateFilename,
  isCostRegressionF1,
  isCostRegressionF2,
  isPrzedmiarCandidateFilename,
  resolveCostRegressionF2DiscoveryStatus,
  resolveCostRegressionF2Presentation,
  resolveCostRegressionF2UiCopy,
  triggerCostRegressionF2Reparse,
} from "../src/lib/cost-regression-f2.ts";
import { deriveOfferRunSnapshot } from "../src/lib/tender-offer-run.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";

function trust() {
  return {
    trustVersion: 2,
    computedAt: "2026-07-28T00:00:00.000Z",
    overall: "trusted",
    overallLabelPl: "Zaufane",
    dimensions: [],
  };
}

function baseItem(over = {}) {
  return {
    id: "tender-cr02-zip",
    title: "WM Discovery ZIP",
    shortTitle: "WM",
    bzpNumber: "BZP-CR02",
    tenderId: "BZP-CR02",
    status: "seen",
    updatedAt: "2026-07-28T00:00:00.000Z",
    ...over,
  };
}

/** Heavy Done bez kosztorysu.ok (CR-02 RCA-like). */
function heavyDoneEmptyDossier() {
  return {
    builtAt: "2026-07-28T12:00:00.000Z",
    parserVersion: 4,
    scanSummary: { parsedAt: "2026-07-28T12:00:00.000Z" },
    kosztorys: null,
  };
}

// --- helpers ZIP ---
{
  assert.equal(isArchiveCandidateFilename("Dokumentacja Techniczna.zip"), true);
  assert.equal(isArchiveCandidateFilename("paczka.7z"), true);
  assert.equal(isArchiveCandidateFilename("kosztorys.ath"), false);
  assert.equal(isPrzedmiarCandidateFilename("Dokumentacja.zip"), false);
  console.log("PASS helpers ZIP / Epic A filename boundary");
}

// --- AC-02-1 ---
{
  const item = baseItem({
    bzpDocuments: [
      {
        filename: "Dokumentacja Techniczna.zip",
        downloadUrl: "https://x/d.zip",
        index: 0,
        documentId: "z1",
      },
    ],
  });
  assert.equal(isCostRegressionF2(item), true);
  assert.equal(hasArchiveCandidate(item), true);
  assert.equal(hasPrzedmiarCandidate(item), true);
  assert.equal(hasFilePrzedmiarCandidate(item), false);
  const d = resolveCostRegressionF2DiscoveryStatus({ item });
  assert.notEqual(d, "no_candidate");
  assert.equal(d, "candidate_ready");
  console.log("PASS AC-02-1 F2+ZIP → archive · ≠ no_candidate");
}

// --- AC-02-2 ---
{
  const item = baseItem({
    bzpDocuments: [
      {
        filename: "Dokumentacja Techniczna.zip",
        downloadUrl: "https://x/d.zip",
        index: 0,
        documentId: "z1",
      },
    ],
    tenderDossier: heavyDoneEmptyDossier(),
  });
  const discovery = resolveCostRegressionF2DiscoveryStatus({ item });
  assert.equal(discovery, "parse_failed");
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.ok(copy);
  assert.equal(copy.discovery, "parse_failed");
  assert.equal(copy.archiveCandidate, true);
  assert.ok(/nie znaleziono.*archiwum ZIP/i.test(copy.phaseLabelPl));
  assert.ok(!/Brak przedmiaru w dokumentach/.test(copy.phaseLabelPl));
  assert.ok(!/Brak przedmiaru w dokumentach/.test(copy.hintPl));
  assert.equal(copy.primaryCta, "reparse");

  const snap = deriveOfferRunSnapshot({
    pipelineState: PipelineState.Ready,
    autoRunning: false,
    dossierBuilding: false,
    dossierSaving: false,
    dossierParseFailed: false,
    parseErrorMessage: null,
    pricingReadyPartial: false,
    pricingReadyFinal: true,
    bidProposal: { ok: false, recommendedBidPln: null },
    trustAssessment: trust(),
    discoveryMergedItem: item,
  });
  assert.ok(snap.costRegressionF2);
  assert.equal(snap.costRegressionF2.discovery, "parse_failed");
  assert.ok(/archiwum ZIP/i.test(snap.phaseLabelPl));
  assert.ok(!/Brak przedmiaru w dokumentach/.test(snap.phaseLabelPl));
  console.log("PASS AC-02-2 RCA-like ZIP+heavyDone → parse_failed ZIP-aware");
}

// --- AC-02-3 ---
{
  const item = baseItem({
    bzpDocuments: [
      {
        filename: "Dokumentacja.zip",
        downloadUrl: "https://x/d.zip",
        index: 0,
        documentId: "z1",
      },
    ],
  });
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.ok(copy);
  assert.equal(copy.discovery, "candidate_ready");
  assert.equal(copy.primaryCta, "reparse");
  assert.equal(copy.phaseLabelPl, "W dokumentach jest archiwum ZIP");
  assert.ok(/przeszuka ZIP/i.test(copy.hintPl));
  console.log("PASS AC-02-3 ZIP · heavy not Done → candidate_ready ZIP-aware");
}

// --- AC-02-4 ---
{
  const item = baseItem();
  assert.equal(hasArchiveCandidate(item), false);
  assert.equal(resolveCostRegressionF2DiscoveryStatus({ item }), "no_candidate");
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.equal(copy?.phaseLabelPl, "Brak przedmiaru w dokumentach");
  assert.equal(copy?.primaryCta, "attach");
  assert.ok(/przedmiar|BOQ|ATH|XLSX/i.test(copy?.hintPl ?? ""));
  assert.ok(!/Brak odczytanego kosztorysu/i.test(copy?.hintPl ?? ""));
  console.log("PASS AC-02-4 zero załączników → no_candidate");
}

// --- AC-02-5 ---
{
  const item = baseItem({
    bzpDocuments: [
      { filename: "SWZ.pdf", downloadUrl: "https://x/swz.pdf", index: 0, documentId: "s1" },
    ],
  });
  assert.equal(hasArchiveCandidate(item), false);
  assert.equal(hasPrzedmiarCandidate(item), false);
  assert.equal(resolveCostRegressionF2DiscoveryStatus({ item }), "no_candidate");
  console.log("PASS AC-02-5 tylko SWZ.pdf → no_candidate");
}

// --- AC-02-6 Epic A ATH ---
{
  const item = baseItem({
    bzpDocuments: [
      { filename: "kosztorys.ath", downloadUrl: "https://x/a.ath", index: 0, documentId: "a1" },
    ],
  });
  assert.equal(hasFilePrzedmiarCandidate(item), true);
  assert.equal(hasArchiveCandidate(item), false);
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.equal(copy?.discovery, "candidate_ready");
  assert.equal(copy?.phaseLabelPl, "Przedmiar wykryty — brak odczytu pozycji");
  assert.equal(copy?.primaryCta, "reparse");
  assert.equal(copy?.archiveCandidate, false);
  console.log("PASS AC-02-6 Epic A ATH bez regresji");
}

// --- AC-02-7 F1 ---
{
  const f1 = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
      parserVersion: 4,
      kosztorys: {
        ok: true,
        rows: [],
        rowCount: 0,
        sourceFilename: "paczka-viii.pdf",
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: "2026-07-28",
      },
    },
  });
  assert.equal(isCostRegressionF1(f1), true);
  assert.equal(isCostRegressionF2(f1), false);
  assert.equal(resolveCostRegressionF2DiscoveryStatus({ item: f1 }), null);
  assert.equal(resolveCostRegressionF2Presentation({ item: f1 }), null);
  console.log("PASS AC-02-7 F1 → discovery null");
}

// --- AC-02-8 guard ---
{
  const ok = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
      parserVersion: 4,
      kosztorys: {
        ok: true,
        rows: [{ lp: "1", description: "Malowanie", unit: "m2", quantity: "10", unitPrice: "", total: "" }],
        rowCount: 1,
        sourceFilename: "ok.ath",
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: "2026-07-28",
        totalValue: "10000",
        currency: "PLN",
        catalogQuantities: [
          { lp: "1", description: "Malowanie", unit: "m2", quantity: "10" },
        ],
      },
    },
  });
  assert.equal(isCostRegressionF2(ok), false);
  assert.equal(canRetryCostRegressionF2Parse(ok), false);
  let called = 0;
  assert.equal(
    triggerCostRegressionF2Reparse({
      item: ok,
      retry: () => {
        called += 1;
      },
    }),
    false,
  );
  assert.equal(called, 0);

  const f2zip = baseItem({
    bzpDocuments: [
      { filename: "docs.zip", downloadUrl: "https://x/d.zip", index: 0, documentId: "z1" },
    ],
  });
  assert.equal(canRetryCostRegressionF2Parse(f2zip), true);
  console.log("PASS AC-02-8 re-parse guard");
}

// --- AC-02-9 Discovery allowlist (no Variant C / no Bid wire in helper) ---
{
  const live = fs.readFileSync("src/lib/cost-regression-f2.ts", "utf8");
  assert.ok(!/listZip|unpackZip|extractZip|7z-wasm/i.test(live));
  assert.ok(!/tender-document-resolver|tenders-bid-calculator|cloud-sync|useTenderPricingAuto/i.test(live));
  const offerRun = fs.readFileSync("src/lib/tender-offer-run.ts", "utf8");
  assert.ok(!/listZip|unpackZip|extractZip/i.test(offerRun));
  console.log("PASS AC-02-9 no Variant C / no Bid·resolver·sync in Discovery surface");
}

// --- copy matrix spot-check ---
{
  const zipReady = resolveCostRegressionF2UiCopy("candidate_ready", {
    archiveCandidate: true,
    fileCandidate: false,
  });
  assert.equal(zipReady.phaseLabelPl, "W dokumentach jest archiwum ZIP");

  const zipFail = resolveCostRegressionF2UiCopy("parse_failed", {
    archiveCandidate: true,
    heavyDoneEmpty: true,
  });
  assert.ok(/Nie znaleziono przedmiaru w archiwum ZIP/.test(zipFail.phaseLabelPl));
  console.log("PASS copy matrix ZIP spot-check");
}

console.log("\nCOST-REGRESSION-02 DISCOVERY-ZIP — ALL PASS (AC-02-1…9; AC-02-10 = build)");
