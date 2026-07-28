/**
 * COST-PARSER-01 ZIP-UNPACK — AC-ZU-1…10 (pure).
 * Run: npx vite-node scripts/test-cost-parser-01-zip-unpack.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canStampHeavyParsedAtForZipUnpack,
  hasZipCostInnerFromCandidates,
  resolveCostParserZipState,
  resolveCostParserZipUiOverlay,
} from "../src/lib/cost-parser-zip-unpack.ts";
import {
  hasArchiveCandidate,
  hasPrzedmiarCandidate,
  isArchiveCandidateFilename,
  resolveCostRegressionF2Presentation,
  resolveCostRegressionF2UiCopy,
} from "../src/lib/cost-regression-f2.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";

function baseItem(over = {}) {
  return {
    id: "tender-zu-01",
    title: "ZIP unpack test",
    shortTitle: "ZU",
    bzpNumber: "BZP-ZU",
    tenderId: "BZP-ZU",
    status: "seen",
    updatedAt: "2026-07-28T00:00:00.000Z",
    ...over,
  };
}

function heavyDoneEmptyDossier(scanExtra = {}) {
  return {
    builtAt: "2026-07-28T12:00:00.000Z",
    parserVersion: 4,
    kosztorys: null,
    scanSummary: {
      totalDocuments: 1,
      scanned: 1,
      parsed: 0,
      byType: { pdf: 0, docx: 0, xlsx: 0, zip: 1, ath: 0, sevenZip: 0, other: 0 },
      kosztorysFound: false,
      valueFound: false,
      criteriaFound: false,
      estimateFound: false,
      costDiscovery: { found: false, type: "none", source: "", confidence: 0 },
      parsedAt: "2026-07-28T12:00:00.000Z",
      ...scanExtra,
    },
  };
}

// --- AC-ZU-1 stan A ---
{
  const state = resolveCostParserZipState({
    hasTopLevelZip: true,
    zipUnpackOk: false,
    zipCostInnerPresent: false,
    kosztorysOk: false,
  });
  assert.equal(state, "unpack_failed");
  const overlay = resolveCostParserZipUiOverlay(state);
  assert.equal(overlay.phaseLabelPl, "Nie udało się odczytać archiwum ZIP");
  assert.ok(!/Nie znaleziono kosztorysu w archiwum ZIP/.test(overlay.phaseLabelPl));

  const item = baseItem({
    bzpDocuments: [
      { filename: "Dokumentacja Techniczna.zip", downloadUrl: "https://x/d.zip", index: 4, documentId: "z1" },
    ],
    tenderDossier: heavyDoneEmptyDossier({
      zipUnpackOk: false,
      zipInnerCount: 0,
      zipUnpackRetryUsed: true,
      zipCostInnerPresent: false,
    }),
  });
  assert.equal(tenderDossierHeavyParseDone(item.tenderDossier), true);
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.ok(copy);
  assert.equal(copy.zipState, "unpack_failed");
  assert.equal(copy.phaseLabelPl, "Nie udało się odczytać archiwum ZIP");
  assert.ok(!/Nie znaleziono kosztorysu w archiwum ZIP/.test(copy.phaseLabelPl));
  console.log("PASS AC-ZU-1 stan A unpack_failed");
}

// --- AC-ZU-2 stan B ---
{
  const state = resolveCostParserZipState({
    hasTopLevelZip: true,
    zipUnpackOk: true,
    zipCostInnerPresent: false,
    kosztorysOk: false,
  });
  assert.equal(state, "no_cost_inner");
  assert.equal(
    resolveCostParserZipUiOverlay(state).phaseLabelPl,
    "Nie znaleziono kosztorysu w archiwum ZIP",
  );

  const item = baseItem({
    bzpDocuments: [
      { filename: "docs.zip", downloadUrl: "https://x/d.zip", index: 1, documentId: "z1" },
    ],
    tenderDossier: heavyDoneEmptyDossier({
      zipUnpackOk: true,
      zipInnerCount: 3,
      zipUnpackRetryUsed: false,
      zipCostInnerPresent: false,
    }),
  });
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.equal(copy?.zipState, "no_cost_inner");
  assert.equal(copy?.phaseLabelPl, "Nie znaleziono kosztorysu w archiwum ZIP");
  console.log("PASS AC-ZU-2 stan B no_cost_inner");
}

// --- AC-ZU-3 stan C ---
{
  const state = resolveCostParserZipState({
    hasTopLevelZip: true,
    zipUnpackOk: true,
    zipCostInnerPresent: true,
    kosztorysOk: false,
  });
  assert.equal(state, "parse_failed");
  assert.equal(
    resolveCostParserZipUiOverlay(state).phaseLabelPl,
    "Nie udało się odczytać kosztorysu z archiwum",
  );

  const item = baseItem({
    bzpDocuments: [
      { filename: "docs.zip", downloadUrl: "https://x/d.zip", index: 1, documentId: "z1" },
    ],
    tenderDossier: heavyDoneEmptyDossier({
      zipUnpackOk: true,
      zipInnerCount: 6,
      zipCostInnerPresent: true,
      costDiscovery: {
        found: true,
        type: "zip_ath",
        source: "docs.zip → x.ath",
        confidence: 0.98,
      },
    }),
  });
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.equal(copy?.zipState, "parse_failed");
  assert.equal(copy?.phaseLabelPl, "Nie udało się odczytać kosztorysu z archiwum");
  console.log("PASS AC-ZU-3 stan C parse_failed");
}

// --- AC-ZU-4 HeavyDone gate przed retry ---
{
  assert.equal(
    canStampHeavyParsedAtForZipUnpack({
      hasTopLevelZip: true,
      zipUnpackOk: false,
      zipUnpackRetryUsed: false,
    }),
    false,
  );
  assert.equal(
    canStampHeavyParsedAtForZipUnpack({
      hasTopLevelZip: true,
      zipUnpackOk: false,
      zipUnpackRetryUsed: true,
    }),
    true,
  );
  assert.equal(
    canStampHeavyParsedAtForZipUnpack({
      hasTopLevelZip: true,
      zipUnpackOk: true,
      zipUnpackRetryUsed: false,
    }),
    true,
  );
  console.log("PASS AC-ZU-4/5 HeavyDone stamp gate + retry terminal");
}

// --- AC-ZU-5 inner cost detection ---
{
  assert.equal(
    hasZipCostInnerFromCandidates([
      { filename: "a.zip → photo.jpg", zipInnerPath: "photo.jpg" },
    ]),
    false,
  );
  assert.equal(
    hasZipCostInnerFromCandidates([
      { filename: "a.zip → koszt.ath", zipInnerPath: "koszt.ath" },
    ]),
    true,
  );
  console.log("PASS AC-ZU-5 zip cost inner helper");
}

// --- AC-ZU-6 / AC-ZU-8 CR-02 archive_candidate bez zmian ---
{
  assert.equal(isArchiveCandidateFilename("Dokumentacja.zip"), true);
  const item = baseItem({
    bzpDocuments: [
      { filename: "Dokumentacja.zip", downloadUrl: "https://x/d.zip", index: 1, documentId: "z1" },
    ],
  });
  assert.equal(hasArchiveCandidate(item), true);
  assert.equal(hasPrzedmiarCandidate(item), true);
  const ready = resolveCostRegressionF2UiCopy("candidate_ready", {
    archiveCandidate: true,
    fileCandidate: false,
  });
  assert.equal(ready.phaseLabelPl, "W dokumentach jest archiwum ZIP");
  console.log("PASS AC-ZU-6/8 CR-02 archive_candidate intact");
}

// --- Legacy bez zipUnpackOk → CR-02 copy ---
{
  const item = baseItem({
    bzpDocuments: [
      { filename: "docs.zip", downloadUrl: "https://x/d.zip", index: 1, documentId: "z1" },
    ],
    tenderDossier: heavyDoneEmptyDossier({
      /* zipUnpackOk absent */
    }),
  });
  delete item.tenderDossier.scanSummary.zipUnpackOk;
  const copy = resolveCostRegressionF2Presentation({ item });
  assert.equal(copy?.zipState ?? null, null);
  assert.equal(copy?.phaseLabelPl, "Nie znaleziono kosztorysu w archiwum ZIP");
  console.log("PASS legacy CR-02 copy when zipUnpackOk missing");
}

// --- AC-ZU-7 / AC-ZU-9 surface checks ---
{
  const live = fs.readFileSync("src/lib/cost-parser-zip-unpack.ts", "utf8");
  assert.ok(!/tenders-bid-calculator|useTenderPricingAuto|cloud-sync|listZip|unpackZip/i.test(live));
  const f2 = fs.readFileSync("src/lib/cost-regression-f2.ts", "utf8");
  assert.ok(/resolveCostParserZipState/.test(f2));
  assert.ok(/isArchiveCandidateFilename/.test(f2));
  const resolver = fs.readFileSync("src/lib/tender-document-resolver.ts", "utf8");
  assert.ok(/zipUnpackRetryUsed/.test(resolver));
  assert.ok(/zip_unpack_retry/.test(resolver));
  console.log("PASS AC-ZU-7/9 allowlist surface");
}

console.log("\nCOST-PARSER-01 ZIP-UNPACK — ALL PASS (AC-ZU; AC-ZU-10 = build)");
