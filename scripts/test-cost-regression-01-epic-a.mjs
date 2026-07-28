/**
 * COST-REGRESSION-01 EPIC A — classifier F2/F1 + discovery + copy matrix + re-parse guard.
 * Run: npx vite-node scripts/test-cost-regression-01-epic-a.mjs
 */
import assert from "node:assert/strict";
import {
  canRetryCostRegressionF2Parse,
  hasPrzedmiarCandidate,
  isCostRegressionF1,
  isCostRegressionF2,
  isPrzedmiarCandidateFilename,
  resolveCostRegressionF1UiCopy,
  resolveCostRegressionF2DiscoveryStatus,
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
    id: "tender-f2-trace",
    title: "WM test F2",
    shortTitle: "WM",
    bzpNumber: "BZP-F2",
    tenderId: "BZP-F2",
    status: "seen",
    updatedAt: "2026-07-28T00:00:00.000Z",
    ...over,
  };
}

// --- AC-A1 classifier ---
{
  const f2 = baseItem({ tenderDossier: null });
  assert.equal(isCostRegressionF2(f2), true);
  assert.equal(isCostRegressionF1(f2), false);

  const f2nok = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
      kosztorys: { ok: false, rows: [], rowCount: 0, sourceFilename: "x.ath", przedmiar: [], categories: [], warnings: [], parsedAt: "" },
    },
  });
  assert.equal(isCostRegressionF2(f2nok), true);

  const f1 = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
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

  const ok = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
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
      },
    },
  });
  assert.equal(isCostRegressionF2(ok), false);
  assert.equal(isCostRegressionF1(ok), false);
  console.log("PASS AC-A1 classifier F2/F1");
}

// --- filenames / discovery ---
{
  assert.equal(isPrzedmiarCandidateFilename("kosztorys.ath"), true);
  assert.equal(isPrzedmiarCandidateFilename("przedmiar.xlsx"), true);
  assert.equal(isPrzedmiarCandidateFilename("przedmiar-roboty.pdf"), true);
  assert.equal(isPrzedmiarCandidateFilename("SWZ.pdf"), false);
  assert.equal(isPrzedmiarCandidateFilename("umowa.docx"), false);

  const noCand = baseItem();
  assert.equal(hasPrzedmiarCandidate(noCand), false);
  assert.equal(resolveCostRegressionF2DiscoveryStatus({ item: noCand }), "no_candidate");

  const withAth = baseItem({
    bzpDocuments: [{ filename: "kosztorys.ath", downloadUrl: "https://x/a.ath", index: 0, documentId: "d1" }],
  });
  assert.equal(hasPrzedmiarCandidate(withAth), true);
  assert.equal(resolveCostRegressionF2DiscoveryStatus({ item: withAth }), "candidate_ready");

  assert.equal(
    resolveCostRegressionF2DiscoveryStatus({ item: withAth, dossierBuilding: true }),
    "parse_running",
  );
  assert.equal(
    resolveCostRegressionF2DiscoveryStatus({ item: withAth, dossierParseFailed: true }),
    "parse_failed",
  );
  console.log("PASS discovery enum");
}

// --- AC-A2…A5 copy matrix ---
{
  const no = resolveCostRegressionF2UiCopy("no_candidate");
  assert.equal(no.phaseLabelPl, "Brak przedmiaru w dokumentach");
  assert.equal(no.primaryCta, "attach");
  assert.ok(!/silnik|kalkulator oferty zepsut/i.test(no.hintPl));

  const ready = resolveCostRegressionF2UiCopy("candidate_ready");
  assert.equal(ready.primaryCta, "reparse");
  assert.ok(!/Brak przedmiaru w dokumentach/.test(ready.phaseLabelPl));

  const run = resolveCostRegressionF2UiCopy("parse_running");
  assert.equal(run.phaseLabelPl, "Trwa analiza kosztorysu…");
  assert.equal(run.primaryCta, "none");

  const fail = resolveCostRegressionF2UiCopy("parse_failed");
  assert.equal(fail.phaseLabelPl, "Nie udało się odczytać kosztorysu");
  assert.ok(/nie awaria kalkulatora/i.test(fail.hintPl));
  assert.equal(fail.primaryCta, "reparse");
  console.log("PASS AC-A2…A5 copy matrix");
}

// --- AC-A8 F1 copy ≠ F2 brak przedmiaru ---
{
  const f1Copy = resolveCostRegressionF1UiCopy();
  assert.ok(!/Brak przedmiaru w dokumentach/.test(f1Copy.phaseLabelPl));
  assert.equal(f1Copy.phaseLabelPl, "Przedmiar bez pozycji");

  const f1Item = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
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
    discoveryMergedItem: f1Item,
  });
  assert.equal(snap.costRegressionF2, null);
  assert.ok(!/Brak przedmiaru w dokumentach/.test(snap.phaseLabelPl));
  assert.equal(snap.phaseLabelPl, "Brak rekomendowanej ceny");
  console.log("PASS AC-A8 F1 not F2 copy");
}

// --- Offer Run F2 replaces legacy label ---
{
  const f2Item = baseItem();
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
    discoveryMergedItem: f2Item,
  });
  assert.ok(snap.costRegressionF2);
  assert.equal(snap.phaseLabelPl, "Brak przedmiaru w dokumentach");
  assert.notEqual(snap.phaseLabelPl, "Brak rekomendowanej ceny");
  console.log("PASS Offer Run F2 presentation");
}

// --- AC-A7 no auto re-parse on OK tender ---
{
  const ok = baseItem({
    tenderDossier: {
      builtAt: "2026-07-28",
      kosztorys: {
        ok: true,
        rows: [{ lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "12", unitPrice: "", total: "" }],
        rowCount: 1,
        sourceFilename: "ok.ath",
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: "2026-07-28",
        totalValue: "50000",
        currency: "PLN",
        catalogQuantities: [
          { lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "12" },
        ],
      },
    },
  });
  assert.equal(isCostRegressionF2(ok), false);
  assert.equal(canRetryCostRegressionF2Parse(ok), false);
  let called = 0;
  const started = triggerCostRegressionF2Reparse({
    item: ok,
    retry: () => {
      called += 1;
    },
  });
  assert.equal(started, false);
  assert.equal(called, 0);
  console.log("PASS AC-A7 / AC-A11 guard no re-parse when !F2");
}

// --- AC-A3 / A11 F2 re-parse allowed ---
{
  const f2 = baseItem({
    bzpDocuments: [{ filename: "kosztorys.ath", downloadUrl: "https://x/a.ath", index: 0, documentId: "d1" }],
  });
  assert.equal(canRetryCostRegressionF2Parse(f2), true);
  assert.equal(canRetryCostRegressionF2Parse(f2, { parseRunning: true }), false);
  let called = 0;
  const started = triggerCostRegressionF2Reparse({
    item: f2,
    retry: () => {
      called += 1;
    },
  });
  assert.equal(started, true);
  assert.equal(called, 1);
  console.log("PASS AC-A3 / AC-A11 F2 re-parse");
}

console.log("\nCOST-REGRESSION-01 EPIC A — ALL PASS");
